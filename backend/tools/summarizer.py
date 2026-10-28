"""LLM-based summarizer — condenses search results into structured context."""
from llm import call_llm


def summarize_results(query: str, search_results: list[dict]) -> str:
    """Take raw search results and summarize them into structured research context."""
    if not search_results:
        return "No search results found for this query."

    # Format search results for the LLM
    formatted = []
    for i, r in enumerate(search_results, 1):
        formatted.append(f"[{i}] {r.get('title', 'Untitled')}\n    URL: {r.get('url', '')}\n    {r.get('snippet', '')}")

    results_text = "\n\n".join(formatted)

    system = (
        "You are a research summarizer. Given search results for a query, "
        "synthesize the key findings into a coherent, factual summary. "
        "Include specific data points, statistics, and trends when available. "
        "Organize by theme. Keep it under 500 words. "
        "Cite which result number [X] each fact comes from."
    )
    user = f"Query: {query}\n\nSearch Results:\n{results_text}"

    return call_llm(system, user)
