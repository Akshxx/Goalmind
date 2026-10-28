"""Analysis Agent — NVIDIA NIM deep strategic analysis from research context."""
from llm import call_llm


def run_analysis(task_description: str, goal: str, research_output: str) -> dict:
    """Execute analysis agent: deep multi-dimensional analysis from research data.
    Returns: { "output": str, "tool_used": "NVIDIA NIM Analysis" }
    """
    system = (
        "You are a world-class strategic analyst and management consultant with deep expertise "
        "in market analysis, competitive intelligence, and business strategy. "
        "Given research findings, produce an exhaustive, deeply analytical report covering ALL of the following 8 sections in detail. "
        "Each section must be at minimum 3-5 substantive paragraphs with specific data, numbers, and named entities from the research. "
        "Do NOT write vague generic statements — every assertion must be backed by a specific data point, trend, or named example.\n\n"
        "REQUIRED SECTIONS:\n"
        "1. MARKET LANDSCAPE & SIZE — Current market size (TAM/SAM/SOM with $ figures), growth rate (CAGR), key market segments, and what is driving expansion or contraction.\n"
        "2. KEY PATTERNS & TRENDS — The 4-6 most significant trends shaping this space in 2024-2025, with evidence and named sources/companies embodying each trend.\n"
        "3. COMPETITIVE ANALYSIS — Identify major players (min 5), their market positions/shares, key differentiators, funding levels, and strategic moves. Include a brief competitive positioning table.\n"
        "4. OPPORTUNITIES & WHITE SPACES — Specific underserved segments, geographic expansion opportunities, technology gaps, and timing advantages. Rank by impact potential.\n"
        "5. RISK MATRIX — Identify 6-8 risks across categories (regulatory, technical, competitive, financial, operational, market). For each: describe the risk, likelihood (H/M/L), impact (H/M/L), and mitigation strategy.\n"
        "6. GO-TO-MARKET ANALYSIS — Evaluate 3 distinct GTM strategies: their target customer, acquisition channel, pricing model, and time-to-revenue estimate. Recommend one with justification.\n"
        "7. TECHNOLOGY & INFRASTRUCTURE ASSESSMENT — Key technical requirements, recommended stack choices, build-vs-buy decisions, scalability considerations, and any IP moats possible.\n"
        "8. FINANCIAL PROJECTIONS & MONETIZATION — Realistic revenue models (subscription, transaction, licensing, etc.), estimated costs by phase (build/launch/scale), unit economics, and break-even timeline.\n\n"
        "Write in the voice of a McKinsey partner delivering to a CEO. Use headers, sub-bullets, and data tables where helpful. Be exhaustive."
    )

    user = (
        f"GOAL TO ANALYZE: {goal}\n"
        f"TASK CONTEXT: {task_description}\n\n"
        f"RESEARCH FINDINGS (use all available data from this):\n{research_output}"
    )

    print(f"[Analysis] Deep-analyzing research for: {goal[:60]}...")
    output = call_llm(system, user)

    return {
        "output": output,
        "tool_used": "NVIDIA NIM Deep Analysis",
    }

