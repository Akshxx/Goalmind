"""Research Agent — DuckDuckGo search + LLM summarization."""
from tools.web_search import search_web
from tools.summarizer import summarize_results


def _trim_query(q: str, max_len: int = 100) -> str:
    """Trim a query to max_len characters, respecting word boundaries."""
    if len(q) <= max_len:
        return q
    trimmed = q[:max_len].rsplit(" ", 1)[0]
    return trimmed


def run_research(task_description: str, goal: str) -> dict:
    """Execute research agent: search the web and summarize findings.
    Returns: { "output": str, "tool_used": "DuckDuckGo + Summarizer", "sources": list }
    """
    # Build a compact search query — DuckDuckGo returns 0 results for very long queries
    # Use the goal trimmed to 100 chars as the primary query for best hit rate
    primary_query = _trim_query(goal, max_len=100)
    
    print(f"[Research] Searching: {primary_query[:80]}...")
    results = search_web(primary_query, max_results=8)

    if not results:
        # Fallback 1: try task description words
        fallback1 = _trim_query(task_description, max_len=80)
        print(f"[Research] Retry with: {fallback1[:80]}...")
        results = search_web(fallback1, max_results=8)
    
    if not results:
        # Fallback 2: first 5 words of goal
        short_goal = " ".join(goal.split()[:6])
        print(f"[Research] Retry (short): {short_goal}...")
        results = search_web(short_goal, max_results=8)

    sources = [{"title": r["title"], "url": r["url"]} for r in results if r.get("url")]

    # Step 2: Summarize results
    print(f"[Research] Summarizing {len(results)} results...")
    summary = summarize_results(primary_query, results)

    return {
        "output": summary,
        "tool_used": "DuckDuckGo + Summarizer",
        "sources": sources,
    }
