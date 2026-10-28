"""Orchestrator — decomposes goal into subtasks and runs the full agent pipeline.

OPTIMIZED: Specialist agents now run in parallel via ThreadPoolExecutor,
reducing pipeline wait time by 3-4x for the 4 specialist agent phase.
"""
import json
import re
import uuid
import time
from datetime import datetime, timezone
from concurrent.futures import ThreadPoolExecutor, as_completed, TimeoutError as FuturesTimeout
from llm import call_llm
from agents.research import run_research
from agents.analysis import run_analysis
from agents.writer import run_writer
from agents.devil import run_devil
from feedback.confidence import get_overall_confidence
from tools.report_gen import build_report


def decompose_goal(goal: str) -> dict:
    """Break goal into 3 subtasks and assign specialist agents.
    Returns: { "subtasks": [...], "specialist_agents": [...], "domain_context": "..." }
    """
    system = (
        "You are a master task decomposer and domain router. Analyze the user's goal.\n\n"
        "1. Break the goal into exactly 3 sequential subtasks assigned to 'research', 'analysis', and 'writer'.\n"
        "2. Identify the core 'domain_context' (e.g. 'edtech AI tutoring', 'tier-2 food delivery', 'fintech micro-loans').\n"
        "3. Decide which of the 5 specialist agents should be spawned in parallel based on these EXACT rules:\n"
        "   - 'competitor': if goal involves startup, product, or market\n"
        "   - 'news_trend': if goal involves startup, product, market, fintech, or edtech\n"
        "   - 'financial_sizing': if goal involves startup, market, fintech, or food\n"
        "   - 'regulatory': if goal involves fintech, health, food, or edtech\n"
        "   - 'fact_check': if ANY of the above specialists are activated.\n\n"
        "Return ONLY a valid JSON object matching this schema exactly:\n"
        "{\n"
        "  \"domain_context\": \"string\",\n"
        "  \"specialist_agents\": [\"string\"],\n"
        "  \"subtasks\": [\n"
        "    {\"id\": 1, \"title\": \"...\", \"agent\": \"research\", \"description\": \"...\"},\n"
        "    {\"id\": 2, \"title\": \"...\", \"agent\": \"analysis\", \"description\": \"...\"},\n"
        "    {\"id\": 3, \"title\": \"...\", \"agent\": \"writer\", \"description\": \"...\"}\n"
        "  ]\n"
        "}\n\n"
        "Do NOT include any text outside the JSON."
    )

    try:
        raw = call_llm(system, goal)
        raw = raw.strip()
        if raw.startswith("```"):
            raw = re.sub(r"^```(?:json)?\s*", "", raw)
            raw = re.sub(r"\s*```$", "", raw)
        parsed = json.loads(raw)
        if "subtasks" in parsed and "specialist_agents" in parsed:
            parsed["subtasks"] = parsed["subtasks"][:3]
            return parsed
    except Exception as e:
        print(f"[Orchestrator] Decomposition failed: {e}, using default")

    # Fallback
    return {
        "domain_context": goal[:60],
        "specialist_agents": ["competitor", "news_trend", "fact_check"],
        "subtasks": [
            {"id": 1, "title": "Research & Data Gathering", "agent": "research", "description": f"Research: {goal}"},
            {"id": 2, "title": "Strategic Analysis", "agent": "analysis", "description": f"Analyze: {goal}"},
            {"id": 3, "title": "Report Writing", "agent": "writer", "description": f"Write: {goal}"},
        ]
    }


from agents.competitor import run_competitor
from agents.news_trend import run_news_trend
from agents.financial import run_financial
from agents.regulatory import run_regulatory
from agents.fact_check import run_fact_check

# Map names → callables
SPECIALIST_MAP = {
    "competitor": run_competitor,
    "news_trend": run_news_trend,
    "financial_sizing": run_financial,
    "regulatory": run_regulatory,
}

SPECIALIST_TIMEOUT = 120  # seconds — kill a specialist if it hangs


def run_pipeline(goal: str, event_callback=None) -> dict:
    """Execute the full GoalMind pipeline with parallel specialist agents.
    event_callback(event_type, data) is called at each stage for SSE streaming.
    """
    def emit(event_type: str, data: dict):
        if event_callback:
            try:
                # Inject server-side timestamp
                data_with_ts = {**data, "server_timestamp": datetime.now(timezone.utc).isoformat()}
                event_callback(event_type, data_with_ts)
            except Exception as e:
                print(f"[Pipeline] emit error: {e}")
        print(f"[Pipeline] {event_type}: {json.dumps(data, default=str)[:200]}")

    result = {
        "goal": goal,
        "subtasks": [],
        "specialist_agents": [],
        "agent_results": [],
        "report": None,
        "confidence": None,
        "devil": None,
        "fact_check": None,
        "citations": [],
        "status": "running",
        "error": None,
    }

    try:
        # ── Step 1: Decompose goal ─────────────────────────────────
        emit("task_decomposed", {"status": "running"})
        decomp = decompose_goal(goal)
        subtasks = decomp.get("subtasks", [])
        specialist_names = decomp.get("specialist_agents", [])
        domain_context = decomp.get("domain_context", goal)

        result["subtasks"] = subtasks
        result["specialist_agents"] = specialist_names
        emit("task_decomposed", {
            "status": "done",
            "subtasks": subtasks,
            "specialist_agents": specialist_names,
        })

        # ── Step 2: Research Agent ────────────────────────────────
        research_task = subtasks[0] if subtasks else {"title": "Research", "description": goal}
        emit("agent_started", {"agent": "research", "task": research_task.get("title", "Research")})
        emit("tool_called", {"agent": "research", "tool": "DuckDuckGo + Summarizer"})
        research_result = run_research(research_task["description"], goal)
        result["agent_results"].append({
            "agent": "research",
            "output": research_result["output"],
            "tool_used": research_result["tool_used"],
        })
        research_sources = research_result.get("sources", [])
        emit("agent_done", {"agent": "research"})

        # ── Step 2.5: Specialist Agents IN PARALLEL ───────────────
        active_specialists = {
            name: fn for name, fn in SPECIALIST_MAP.items()
            if name in specialist_names
        }

        specialist_outputs = {}

        if active_specialists:
            # Emit started events before launching threads
            for name in active_specialists:
                labels = {
                    "competitor": ("Competitor Intelligence", "DuckDuckGo + Llama 3"),
                    "news_trend": ("News & Trend Analysis", "DuckDuckGo News"),
                    "financial_sizing": ("Financial Sizing & TAM", "DuckDuckGo + NIM"),
                    "regulatory": ("Regulatory Compliance", "DuckDuckGo + NIM"),
                }
                title, tool = labels.get(name, (name, "DuckDuckGo"))
                emit("agent_started", {"agent": name, "task": title})
                emit("tool_called", {"agent": name, "tool": tool})

            with ThreadPoolExecutor(max_workers=4) as executor:
                future_map = {
                    executor.submit(fn, domain_context, goal): name
                    for name, fn in active_specialists.items()
                }

                for future in as_completed(future_map, timeout=SPECIALIST_TIMEOUT + 10):
                    name = future_map[future]
                    try:
                        comp_res = future.result(timeout=SPECIALIST_TIMEOUT)
                        result["agent_results"].append({
                            "agent": name,
                            "output": comp_res["output"],
                            "tool_used": comp_res["tool_used"],
                        })
                        specialist_outputs[name] = comp_res["output"]
                        research_sources.extend(comp_res.get("sources", []))
                        emit("agent_done", {"agent": name})
                    except FuturesTimeout:
                        print(f"[Orchestrator] Specialist '{name}' timed out after {SPECIALIST_TIMEOUT}s")
                        emit("agent_done", {"agent": name, "status": "timeout"})
                    except Exception as e:
                        print(f"[Orchestrator] Specialist '{name}' failed: {e}")
                        emit("agent_done", {"agent": name, "status": "error"})

        # Combine base research with specialist outputs into one rich payload
        rich_research_payload = f"UNSTRUCTURED RESEARCH:\n{research_result['output']}\n\nSPECIALIST STRUCTURAL DATA:\n"
        for k, v in specialist_outputs.items():
            rich_research_payload += f"--- {k.upper()} ---\n{v}\n"

        # ── Step 3: Analysis Agent ────────────────────────────────
        analysis_task = subtasks[1] if len(subtasks) > 1 else {"title": "Analysis", "description": goal}
        emit("agent_started", {"agent": "analysis", "task": analysis_task.get("title", "Analysis")})
        emit("tool_called", {"agent": "analysis", "tool": "NVIDIA NIM Analysis"})
        analysis_result = run_analysis(analysis_task["description"], goal, rich_research_payload)
        result["agent_results"].append({
            "agent": "analysis",
            "output": analysis_result["output"],
            "tool_used": analysis_result["tool_used"],
        })
        emit("agent_done", {"agent": "analysis"})

        # ── Step 4: Writer Agent ──────────────────────────────────
        writer_task = subtasks[2] if len(subtasks) > 2 else {"title": "Report Writing", "description": goal}
        emit("agent_started", {"agent": "writer", "task": writer_task.get("title", "Report Writing")})
        emit("tool_called", {"agent": "writer", "tool": "Gemini Google Search"})
        writer_result = run_writer(
            writer_task["description"], goal,
            rich_research_payload, analysis_result["output"]
        )
        result["agent_results"].append({
            "agent": "writer",
            "output": writer_result["output"],
            "tool_used": writer_result["tool_used"],
        })

        # Merge citations
        gemini_citations = writer_result.get("citations", [])
        if gemini_citations:
            merged_citations = gemini_citations + research_sources[:5]
        else:
            merged_citations = research_sources

        # Deduplicate by URL
        seen_urls = set()
        unique_citations = []
        for cit in merged_citations:
            url = cit.get("url", "")
            if url and url not in seen_urls:
                seen_urls.add(url)
                unique_citations.append(cit)

        result["citations"] = unique_citations[:12]
        emit("agent_done", {"agent": "writer"})

        # ── Step 4.5: Fact-Check (optional, now fast single call) ─
        if "fact_check" in specialist_names:
            emit("agent_started", {"agent": "fact_check", "task": "Claim Verification"})
            emit("tool_called", {"agent": "fact_check", "tool": "NVIDIA NIM Fact-Checker"})
            fc_res = run_fact_check(writer_result["output"])
            result["agent_results"].append({
                "agent": "fact_check",
                "output": fc_res["output"],
                "tool_used": fc_res["tool_used"],
            })
            result["fact_check"] = fc_res["output"]
            emit("agent_done", {"agent": "fact_check"})

        # ── Step 5: Build structured report ───────────────────────
        report = build_report(
            goal,
            rich_research_payload,
            analysis_result["output"],
            writer_result["output"],
        )
        result["report"] = report

        # ── Step 6: Confidence scoring (now instant heuristic) ────
        emit("feedback", {"status": "scoring"})
        confidence = get_overall_confidence(
            research_result["output"],
            analysis_result["output"],
            writer_result["output"],
            goal,
        )
        result["confidence"] = confidence
        emit("feedback", {"status": "done", "confidence": confidence})

        # ── Step 7: Devil's Advocate ──────────────────────────────
        emit("devil", {"status": "running"})
        full_report_text = writer_result["output"] or f"{research_result['output']}\n{analysis_result['output']}"
        devil_output = run_devil(full_report_text)
        result["devil"] = devil_output
        emit("devil", {"status": "done", "devil": devil_output})

        result["status"] = "complete"
        emit("complete", {"status": "complete"})

    except Exception as e:
        result["status"] = "failed"
        result["error"] = str(e)
        emit("error", {"error": str(e)})
        print(f"[Pipeline] Fatal error: {e}")
        import traceback
        traceback.print_exc()

    return result
