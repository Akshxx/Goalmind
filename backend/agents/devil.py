"""Devil's Advocate Agent — adversarial stress-test of generated report."""
import json
import re
from llm import call_llm


def run_devil(report_text: str) -> dict:
    """Run adversarial analysis on the first 2000 chars of the report.
    Returns: { "challenges": [str], "weak_points": [str], "refined_suggestion": str }
    """
    # Only use first 2000 characters
    truncated = report_text[:2000]

    system = (
        "You are a Devil's Advocate — a critical, adversarial reviewer. "
        "Your job is to find weaknesses, unrealistic claims, missing risks, "
        "and logical gaps in this report. Be tough but constructive.\n\n"
        "Return ONLY valid JSON with these keys:\n"
        "- challenges: array of 3-5 specific challenges to the report's claims\n"
        "- weak_points: array of 2-4 weak assumptions or missing considerations\n"
        "- refined_suggestion: one paragraph suggesting how to strengthen the analysis\n\n"
        "Do NOT include any text outside the JSON."
    )

    print("[Devil] Running adversarial analysis...")
    try:
        raw = call_llm(system, truncated)
        raw = raw.strip()
        if raw.startswith("```"):
            raw = re.sub(r"^```(?:json)?\s*", "", raw)
            raw = re.sub(r"\s*```$", "", raw)
        return json.loads(raw)
    except Exception as e:
        print(f"[Devil] Failed to parse adversarial output: {e}")
        return {
            "challenges": ["Unable to parse adversarial analysis — LLM output was malformed."],
            "weak_points": ["The devil's advocate agent encountered an error during analysis."],
            "refined_suggestion": "Consider re-running the analysis or manually reviewing the report for gaps.",
        }
