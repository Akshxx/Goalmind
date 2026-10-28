"""Financial Sizing Agent — Extracts TAM, SAM, SOM and recent funding data."""
import json
import re
from ddgs import DDGS
from llm import call_llm


def run_financial(domain_context: str, goal: str) -> dict:
    """Search for market size and funding data.
    Returns: {"output": json_string, "tool_used": "...", "sources": list}
    """
    try:
        queries = [
            f"{domain_context} total addressable market TAM size billion CAGR",
            f"{domain_context} startup funding rounds 2024 investment",
        ]

        ddgs = DDGS()
        raw_results = []
        sources = []

        for q in queries:
            try:
                results = ddgs.text(q, max_results=5)
                if results:
                    for r in results:
                        url = r.get("href", "")
                        snippet = r.get("body", "N/A")
                        raw_results.append(f"Snippet: {snippet}\nSource: {url}\n")
                        if url:
                            sources.append({"title": r.get("title", url), "url": url})
            except Exception as e:
                print(f"[FinancialAgent] DDGS error: {e}")

        combined = "\n".join(raw_results)
        if not combined.strip():
            return {"output": json.dumps({}), "tool_used": "DuckDuckGo (No Results)", "sources": []}

        system = (
            "You are a quantitative financial analyst. Read the search snippets and extract hard numerical data.\n"
            "Return a JSON object with these EXACT keys:\n"
            "- tam_usd: string (e.g., '$10.5B')\n"
            "- sam_usd: string\n"
            "- som_usd: string\n"
            "- cagr_pct: string (e.g., '22%' or 'Unknown')\n"
            "- tam_source: string (where the TAM figure came from, e.g. 'Statista')\n"
            "- recent_funding_rounds: [ { company, amount, round, year } ]\n"
            "- revenue_comps: [ { company, arr, source } ]\n\n"
            "If a figure is unknown, use the string 'Unknown'. Return ONLY a JSON object."
        )

        user = f"Goal Context: {goal}\n\nSearch Findings:\n{combined[:4000]}"

        raw = call_llm(system, user)
        raw = raw.strip()
        if raw.startswith("```"):
            raw = re.sub(r"^```(?:json)?\s*", "", raw)
            raw = re.sub(r"\s*```$", "", raw)

        parsed = json.loads(raw)
        if not isinstance(parsed, dict):
            parsed = {}

        return {
            "output": json.dumps(parsed, indent=2),
            "tool_used": "DuckDuckGo + NVIDIA NIM",
            "sources": sources[:5],
        }

    except Exception as e:
        print(f"[FinancialAgent] Error: {e}")
        return {"output": json.dumps({}), "tool_used": "DuckDuckGo (Failed)", "sources": []}
