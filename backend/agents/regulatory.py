"""Regulatory Agent — Identifies compliance requirements and regulatory risk."""
import json
import re
from ddgs import DDGS
from llm import call_llm


def run_regulatory(domain_context: str, goal: str) -> dict:
    """Search and extract regulatory compliance requirements.
    Returns: {"output": json_string, "tool_used": "...", "sources": list}
    """
    try:
        # Build a targeted regulatory query based on domain
        query = f"{domain_context} regulations compliance guidelines rules India"
        fallback_query = f"{domain_context} regulatory framework legal requirements"

        ddgs = DDGS()
        raw_results = []
        sources = []

        for q in [query, fallback_query]:
            try:
                results = ddgs.text(q, max_results=5)
                if results:
                    for r in results:
                        url = r.get("href", "")
                        snippet = r.get("body", "N/A")
                        raw_results.append(f"Snippet: {snippet}\nSource: {url}\n")
                        if url:
                            sources.append({"title": r.get("title", url), "url": url})
                    break  # First query succeeded, no need for fallback
            except Exception as e:
                print(f"[RegulatoryAgent] DDGS error for '{q}': {e}")

        combined = "\n".join(raw_results)
        if not combined.strip():
            return {"output": json.dumps([]), "tool_used": "DuckDuckGo (No Results)", "sources": []}

        system = (
            "You are a strict compliance officer. Analyze the search snippets regarding regulatory frameworks.\n"
            "Extract the top compliance requirements and regulatory risks for this domain.\n"
            "Return a JSON array of objects with EXACTLY these keys:\n"
            "- regulation_name: string (e.g. 'GDPR', 'RBI Payment Aggregator Guidelines')\n"
            "- regulatory_body: string\n"
            "- requirement_summary: string\n"
            "- risk_level: string ('low', 'medium', 'high')\n"
            "- url: string (Source URL from snippets if available, else '')\n\n"
            "Return ONLY the JSON array without markdown blocks. If nothing relevant, return []."
        )

        user = f"Goal Context: {goal}\n\nSearch Findings:\n{combined[:4000]}"

        raw = call_llm(system, user)
        raw = raw.strip()
        if raw.startswith("```"):
            raw = re.sub(r"^```(?:json)?\s*", "", raw)
            raw = re.sub(r"\s*```$", "", raw)

        parsed = json.loads(raw)
        if not isinstance(parsed, list):
            parsed = []

        return {
            "output": json.dumps(parsed, indent=2),
            "tool_used": "DuckDuckGo + NVIDIA NIM",
            "sources": sources[:5],
        }

    except Exception as e:
        print(f"[RegulatoryAgent] Error: {e}")
        return {"output": json.dumps([]), "tool_used": "DuckDuckGo (Failed)", "sources": []}
