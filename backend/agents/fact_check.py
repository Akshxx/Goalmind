"""Fact-Check Agent — Post-synthesis verifier to validate generated claims.

OPTIMIZED: Uses a single batched LLM call instead of 5 sequential grounded calls,
which previously caused pipeline hangs of 5+ minutes when Gemini quota was hit.
"""
import json
import re
from llm import call_llm


def run_fact_check(report_text: str) -> dict:
    """Extract claims from the report and verify them in ONE batched LLM call.
    Returns: {"output": json_string, "tool_used": "..."}
    """
    if not report_text or not report_text.strip():
        return {"output": json.dumps([]), "tool_used": "Fact-Checker (No Input)"}

    # Single batched call: extract AND verify in one pass using NVIDIA NIM
    # This avoids 5x sequential Gemini calls that were causing timeouts
    system = (
        "You are a rigorous fact-checker. Given a strategic business report, do the following in ONE response:\n\n"
        "1. Extract the 5 most specific quantitative or factual claims from the report.\n"
        "2. For each claim, assess whether it is likely accurate based on your training knowledge.\n\n"
        "Return ONLY a JSON array of exactly 5 objects with these keys:\n"
        "- claim: string (the exact claim from the report)\n"
        "- status: string (one of: 'verified', 'unverified', 'flagged')\n"
        "- note: string (1-sentence explanation of why you rated it this way)\n"
        "- source_url: string (leave empty string '' — no live search in this mode)\n\n"
        "Return ONLY the JSON array. No markdown, no preamble, no explanation outside the JSON."
    )

    # Use first 4000 chars — exec summary and market data are usually at the top
    truncated = report_text[:4000]

    try:
        raw = call_llm(system, truncated)
        raw = raw.strip()
        if raw.startswith("```"):
            raw = re.sub(r"^```(?:json)?\s*", "", raw)
            raw = re.sub(r"\s*```$", "", raw)

        parsed = json.loads(raw)
        if not isinstance(parsed, list):
            raise ValueError("Expected a JSON array")

        # Normalize each item
        results = []
        for item in parsed[:5]:
            results.append({
                "claim": str(item.get("claim", "")),
                "status": str(item.get("status", "unverified")),
                "note": str(item.get("note", "")),
                "source_url": str(item.get("source_url", "")),
            })

        return {
            "output": json.dumps(results, indent=2),
            "tool_used": "NVIDIA NIM Fact-Checker"
        }

    except Exception as e:
        print(f"[FactCheck] Error: {e}")
        return {
            "output": json.dumps([]),
            "tool_used": "Fact-Checker (Failed)"
        }
