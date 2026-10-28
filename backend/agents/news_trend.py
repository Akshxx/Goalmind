"""News & Trend Agent — Fetches latest signals on a domain."""
import json
import re
from ddgs import DDGS
from llm import call_llm


def run_news_trend(domain_context: str, goal: str) -> dict:
    """Fetch latest news and extract trend signals.
    Returns: {"output": json_string, "tool_used": "...", "sources": list}
    """
    try:
        query = f"{domain_context} latest news trends 2024 2025"
        ddgs = DDGS()
        raw_results = []
        sources = []

        try:
            results = ddgs.news(query, timelimit='m', max_results=8)
            if not results:
                # Fallback to text search if news returns nothing
                results = ddgs.text(query, max_results=8)
            if results:
                for r in results:
                    url = r.get("url") or r.get("href", "")
                    title = r.get("title", "N/A")
                    snippet = r.get("body", "")
                    raw_results.append(
                        f"Title: {title}\nSource: {r.get('source', '')}\n"
                        f"Date: {r.get('date', '')}\nURL: {url}\nSnippet: {snippet}\n"
                    )
                    if url:
                        sources.append({"title": title, "url": url})
        except Exception as e:
            print(f"[NewsAgent] DDGS error: {e}")

        combined = "\n".join(raw_results)
        if not combined.strip():
            return {"output": json.dumps([]), "tool_used": "DuckDuckGo News (No Results)", "sources": []}

        system = (
            "You are a market signal analyst. Read the recent news snippets below. "
            "Extract distinct news items and trends relevant to the goal.\n\n"
            "Return a JSON array of objects with these exact keys:\n"
            "- headline: string\n"
            "- source: string\n"
            "- date: string\n"
            "- url: string\n"
            "- relevance_tag: string (e.g. 'Regulatory Alert', 'Funding', 'Product Launch', 'Market Trend')\n"
            "- recency_flag: string ('fresh' or 'recent')\n\n"
            "Return ONLY the JSON array without markdown blocks."
        )

        user = f"Goal Context: {goal}\n\nRecent News:\n{combined[:4000]}"

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
            "tool_used": "DuckDuckGo News + NVIDIA NIM",
            "sources": sources[:5],
        }

    except Exception as e:
        print(f"[NewsAgent] Error: {e}")
        return {"output": json.dumps([]), "tool_used": "DuckDuckGo News (Failed)", "sources": []}
