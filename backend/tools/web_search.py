"""DuckDuckGo web search wrapper — no API key needed."""
from ddgs import DDGS


def search_web(query: str, max_results: int = 8) -> list[dict]:
    """Search the web using DuckDuckGo and return results.
    Forces English/Indian results (region=in-en) to avoid foreign language results.
    Returns: [{ "title": str, "url": str, "snippet": str }]
    """
    try:
        ddgs = DDGS()
        # region='in-en' forces India-English results, avoiding Baidu/Chinese results
        raw_results = ddgs.text(
            query,
            max_results=max_results,
            region='in-en',
        )
        results = []
        for r in raw_results:
            url = r.get("href", "")
            # Skip non-English / Baidu results as a safety net
            if any(skip in url for skip in ["baidu.com", "zhidao", "baike.com", "weibo", "qq.com"]):
                continue
            results.append({
                "title": r.get("title", ""),
                "url": url,
                "snippet": r.get("body", ""),
            })
        return results
    except Exception as e:
        print(f"[WebSearch] DuckDuckGo search failed: {e}")
        return []
