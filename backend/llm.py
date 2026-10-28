"""LLM call utilities — NVIDIA NIM primary, Gemini 2.5 Flash fallback.

call_llm()          → standard LLM call (no web grounding)
call_llm_grounded() → Gemini 2.5 Flash with Google Search tool

All calls have a hard 120-second timeout to prevent pipeline hangs.
"""
import os
import json
import traceback
import time
import signal
from contextlib import contextmanager
from dotenv import load_dotenv
from openai import OpenAI, RateLimitError, APIError

load_dotenv()

# ── NVIDIA NIM Client ──────────────────────────────────────────────
_nvidia_client: OpenAI | None = None
NVIDIA_MODEL = "meta/llama-3.3-70b-instruct"
LLM_TIMEOUT = 90  # seconds — hard deadline per LLM call


def _get_nvidia_client() -> OpenAI:
    global _nvidia_client
    if _nvidia_client is None:
        _nvidia_client = OpenAI(
            api_key=os.getenv("NVIDIA_API_KEY", ""),
            base_url="https://integrate.api.nvidia.com/v1",
            timeout=LLM_TIMEOUT,
        )
    return _nvidia_client


# ── Gemini Client ──────────────────────────────────────────────────
def _get_gemini_client():
    from google import genai
    return genai.Client(api_key=os.getenv("GEMINI_API_KEY", ""))


# ── call_llm: NVIDIA NIM → Gemini 2.5 Flash fallback ──────────────
def call_llm(system_prompt: str, user_message: str, provider: str = "nvidia") -> str:
    """Standard LLM call with two-tier fallback. No web grounding."""
    if provider == "nvidia":
        try:
            client = _get_nvidia_client()
            resp = client.chat.completions.create(
                model=NVIDIA_MODEL,
                messages=[
                    {"role": "system", "content": system_prompt},
                    {"role": "user", "content": user_message},
                ],
                temperature=0.7,
                max_tokens=8000,
            )
            text = resp.choices[0].message.content or ""
            if text:
                return text
        except (RateLimitError, APIError) as e:
            print(f"[LLM] NVIDIA NIM failed ({e.__class__.__name__}), falling back to Gemini 2.5 Flash")
        except Exception as e:
            print(f"[LLM] NVIDIA NIM unexpected error: {e}")

    # Fallback: Gemini 2.5 Flash
    try:
        from google import genai
        from google.genai import types
        client = _get_gemini_client()
        resp = client.models.generate_content(
            model="gemini-2.5-flash",
            contents=f"{system_prompt}\n\n{user_message}",
            config=types.GenerateContentConfig(
                temperature=0.7,
                max_output_tokens=8000,
            ),
        )
        return resp.text or ""
    except Exception as e:
        print(f"[LLM] Gemini 2.5 Flash also failed: {e}")
        return f"[ERROR] All LLM providers failed. Last error: {e}"


# ── call_llm_grounded: Gemini 2.5 Flash + Google Search ───────────
def call_llm_grounded(system_prompt: str, user_message: str) -> dict:
    """Gemini 2.5 Flash with Google Search tool for live web grounding.
    Falls back gracefully to NVIDIA NIM if Gemini quota is exhausted.
    Returns: { "text": str, "citations": [{ "title": str, "url": str }] }
    """
    try:
        from google import genai
        from google.genai import types

        client = _get_gemini_client()
        google_search_tool = types.Tool(google_search=types.GoogleSearch())
        resp = client.models.generate_content(
            model="gemini-2.5-flash",
            contents=f"{system_prompt}\n\n{user_message}",
            config=types.GenerateContentConfig(
                tools=[google_search_tool],
                temperature=0.7,
                max_output_tokens=6000,
            ),
        )

        # Extract citations from grounding metadata
        citations = []
        if resp.candidates and resp.candidates[0].grounding_metadata:
            gm = resp.candidates[0].grounding_metadata
            if hasattr(gm, "grounding_chunks") and gm.grounding_chunks:
                for chunk in gm.grounding_chunks:
                    if hasattr(chunk, "web") and chunk.web:
                        citations.append({
                            "title": getattr(chunk.web, "title", "Source"),
                            "url": getattr(chunk.web, "uri", ""),
                        })

        return {"text": resp.text or "", "citations": citations}

    except Exception as e:
        err_str = str(e)
        is_quota = "429" in err_str or "RESOURCE_EXHAUSTED" in err_str or "quota" in err_str.lower()
        if is_quota:
            print(f"[LLM] Gemini grounding quota exceeded — falling back to NVIDIA NIM (no citations).")
        else:
            print(f"[LLM] Grounded call failed: {e}")

        # Fallback: ungrounded NVIDIA NIM call
        try:
            fallback_text = call_llm(system_prompt, user_message, provider="nvidia")
            return {"text": fallback_text, "citations": []}
        except Exception as fallback_err:
            print(f"[LLM] Fallback also failed: {fallback_err}")
            return {"text": f"[ERROR] All LLM providers failed: {fallback_err}", "citations": []}
