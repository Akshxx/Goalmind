"""Competitor Intelligence Agent — Extracts structured competitor data."""
import json
import re
from ddgs import DDGS
from llm import call_llm


def run_competitor(domain_context: str, goal: str) -> dict:
    """Run targeted searches to build a structured competitor map.
    Returns: {"output": json_string, "tool_used": "...", "sources": list}
    """
    try:
        queries = [
            f"site:g2.com {domain_context} alternative",
            f"site:producthunt.com {domain_context} launch",
            f"{domain_context} top companies competitors market share",
        ]

        ddgs = DDGS()
        raw_results = []
        sources = []

        for q in queries:
            try:
                results = ddgs.text(q, max_results=4)
                if results:
                    for r in results:
                        url = r.get("href", "")
                        snippet = r.get("body", "N/A")
                        raw_results.append(f"Source: {url}\nSnippet: {snippet}\n")
                        if url:
                            sources.append({"title": r.get("title", url), "url": url})
            except Exception as e:
                print(f"[CompetitorAgent] DDGS error for '{q}': {e}")

        combined_text = "\n".join(raw_results)
        if not combined_text.strip():
            return {"output": json.dumps([]), "tool_used": "DuckDuckGo (No Results)", "sources": []}

        system = (
            "You are a competitive intelligence analyst. "
            "Examine the following search snippets from G2, ProductHunt, and web sources. "
            "Extract a list of companies that compete in this space.\n\n"
            "Return a JSON array of objects with EXACTLY these keys:\n"
            "- name: string (Company name)\n"
            "- website: string (URL if available, else 'N/A')\n"
            "- funding: string (e.g. 'Series A', 'Bootstrapped', or 'Unknown')\n"
            "- pricing_tier: string (e.g. 'Freemium', 'Enterprise', 'Premium', 'Unknown')\n"
            "- positioning: string (How they market themselves, 1 sentence)\n"
            "- differentiator: string (Their unique selling point, 1 sentence)\n\n"
            "Return ONLY the JSON array. No markdown. If no competitors found, return []."
        )

        user = f"Goal Context: {goal}\n\nSearch Findings:\n{combined_text[:4000]}"

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
        print(f"[CompetitorAgent] Error: {e}")
        return {"output": json.dumps([]), "tool_used": "DuckDuckGo (Failed)", "sources": []}
