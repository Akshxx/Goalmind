"""GoalMind FastAPI Backend — All routes and SSE streaming."""
import os
import json
import uuid
import asyncio
import threading
from collections import defaultdict
from contextlib import asynccontextmanager

from fastapi import FastAPI, HTTPException, Query
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import StreamingResponse
from dotenv import load_dotenv

load_dotenv()

from models import GoalRequest, PipelineResult
from orchestrator import run_pipeline
from clarity.scorer import score_goal

# ── In-memory job store ────────────────────────────────────────────
jobs: dict[str, dict] = {}             # job_id → result
job_events: dict[str, list] = defaultdict(list)  # job_id → [events]
job_locks: dict[str, threading.Lock] = defaultdict(threading.Lock)


@asynccontextmanager
async def lifespan(app: FastAPI):
    print("[GoalMind] Backend starting...")
    yield
    print("[GoalMind] Backend shutting down...")


app = FastAPI(
    title="GoalMind API",
    description="Multi-agent autonomous reasoning system",
    version="1.0.0",
    lifespan=lifespan,
)

# CORS — allow all origins for dev
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# ── GET / ──────────────────────────────────────────────────────────
@app.get("/")
async def root():
    return {
        "status": "GoalMind Backend is Running",
        "message": "Open the GoalMind frontend UI at http://localhost:5173"
    }


# ── POST /run-agent ────────────────────────────────────────────────
@app.post("/run-agent")
async def run_agent(req: GoalRequest):
    """Start the GoalMind pipeline. Returns job_id immediately."""
    job_id = str(uuid.uuid4())
    jobs[job_id] = {"status": "pending"}
    job_events[job_id] = []

    def event_callback(event_type: str, data: dict):
        # Ensure data is JSON-serializable before storing
        try:
            json.dumps(data, default=str)
        except Exception:
            data = {"raw": str(data)}
        event = {"type": event_type, "data": data}
        with job_locks[job_id]:
            job_events[job_id].append(event)

    def pipeline_worker():
        try:
            result = run_pipeline(req.goal, event_callback=event_callback)
            jobs[job_id] = result
        except Exception as e:
            jobs[job_id] = {"status": "failed", "error": str(e)}
            event_callback("error", {"error": str(e)})

    thread = threading.Thread(target=pipeline_worker, daemon=True)
    thread.start()

    return {"job_id": job_id}


# ── GET /stream/{job_id} — SSE ─────────────────────────────────────
@app.get("/stream/{job_id}")
async def stream_events(job_id: str):
    """Stream pipeline events via Server-Sent Events.
    No hard timeout — the SSE stream stays open until the job completes or fails.
    """
    if job_id not in jobs and job_id not in job_events:
        raise HTTPException(status_code=404, detail="Job not found")

    async def event_generator():
        sent_count = 0
        # Use a large max_wait (20 min) so slow pipelines aren't cut off
        MAX_WAIT_SECS = 1200
        elapsed = 0.0
        POLL_INTERVAL = 0.25  # seconds

        while elapsed < MAX_WAIT_SECS:
            # Grab any new events since last poll
            with job_locks[job_id]:
                new_events = job_events[job_id][sent_count:]

            for event in new_events:
                try:
                    data = json.dumps(event, default=str)
                    yield f"event: {event['type']}\ndata: {data}\n\n"
                    sent_count += 1
                except Exception as e:
                    print(f"[SSE] Failed to serialize event: {e}")

            # Check completion
            job_status = jobs.get(job_id, {}).get("status", "pending")
            if job_status in ("complete", "failed"):
                # Drain any remaining events
                with job_locks[job_id]:
                    remaining = job_events[job_id][sent_count:]
                for event in remaining:
                    try:
                        data = json.dumps(event, default=str)
                        yield f"event: {event['type']}\ndata: {data}\n\n"
                    except Exception:
                        pass
                # Send explicit done signal
                yield f"event: complete\ndata: {json.dumps({'type': 'complete', 'data': {'status': job_status}})}\n\n"
                break

            # Heartbeat every 30s to keep the connection alive through proxies/browsers
            if sent_count == 0 and elapsed > 0 and int(elapsed) % 30 == 0:
                yield ": heartbeat\n\n"

            await asyncio.sleep(POLL_INTERVAL)
            elapsed += POLL_INTERVAL

    return StreamingResponse(
        event_generator(),
        media_type="text/event-stream",
        headers={
            "Cache-Control": "no-cache",
            "Connection": "keep-alive",
            "X-Accel-Buffering": "no",
        },
    )


# ── GET /result/{job_id} ───────────────────────────────────────────
@app.get("/result/{job_id}")
async def get_result(job_id: str):
    """Get the full pipeline result for a completed job."""
    if job_id not in jobs:
        raise HTTPException(status_code=404, detail="Job not found")

    job = jobs[job_id]
    status = job.get("status", "pending")

    if status == "pending":
        return {"status": "pending", "message": "Pipeline has not started yet"}
    if status == "running":
        return {"status": "running", "message": "Pipeline is still running"}

    return job


# ── GET /clarity ───────────────────────────────────────────────────
@app.get("/clarity")
async def clarity_check(goal: str = Query(..., min_length=1)):
    """Score goal clarity 0–100. Used for live scoring as user types."""
    result = score_goal(goal)
    return result


# ── POST /enhance-prompt ───────────────────────────────────────────
@app.post("/enhance-prompt")
async def enhance_prompt_endpoint(req: GoalRequest):
    """Dynamically suggest 3 enhanced prompts based on the current goal."""
    goal = req.goal
    if not goal or len(goal.strip()) < 10:
        return {"suggestions": []}

    system = (
        "You are an expert prompt engineer and business analyst. "
        "The user wants to run a multi-agent pipeline to analyze a venture or idea. "
        "Read their drafted goal and suggest exactly 3 highly specific ways to improve it for maximum clarity. "
        "Focus on adding missing context: target audience, timeline, revenue model, specific geographies, etc.\n\n"
        "Return ONLY a JSON array of exactly 3 objects with keys 'question' and 'enhanced_prompt'.\n"
        "Format:\n"
        "[\n"
        "  { \"question\": \"What is the target market?\", \"enhanced_prompt\": \"<their idea> targeting tier-2 cities...\" },\n"
        "  { \"question\": \"What is the timeline?\", \"enhanced_prompt\": \"<their idea> with a 12-month GTM strategy...\" }\n"
        "]\n"
        "Do NOT include any text outside the JSON array."
    )

    try:
        from llm import call_llm
        import re
        raw = call_llm(system, goal)
        raw = raw.strip()
        if raw.startswith("```"):
            raw = re.sub(r"^```(?:json)?\s*", "", raw)
            raw = re.sub(r"\s*```$", "", raw)
        suggestions = json.loads(raw)
        if isinstance(suggestions, list):
            return {"suggestions": suggestions[:3]}
    except Exception as e:
        print(f"[Enhancer] Failed: {e}")

    return {"suggestions": []}


# ── Health check ───────────────────────────────────────────────────
@app.get("/health")
async def health():
    return {"status": "ok", "service": "GoalMind"}


if __name__ == "__main__":
    import uvicorn
    port = int(os.getenv("PORT", 8000))
    uvicorn.run(app, host="0.0.0.0", port=port)
