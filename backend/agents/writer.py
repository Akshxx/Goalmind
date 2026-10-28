"""Writer Agent — Gemini 2.5 Flash with Google Search for live web grounding + citations."""
from llm import call_llm_grounded


def run_writer(task_description: str, goal: str, research_output: str, analysis_output: str) -> dict:
    """Execute writer agent: generate a comprehensive long-form intelligence report.
    Returns: { "output": str, "tool_used": "Gemini Google Search", "citations": list }
    """
    system = (
        "You are a senior intelligence analyst writing a comprehensive, authoritative report for C-suite executives and investors. "
        "This report must be deeply researched, highly specific, and professionally written. "
        "MINIMUM LENGTH: 1500 words. Every section must have real data, specific numbers, named companies, and actionable insights.\n\n"
        "Write a full STRATEGIC INTELLIGENCE REPORT covering ALL 10 sections below. "
        "Use the provided research and analysis as your primary data sources, supplemented by current web data:\n\n"
        "## 1. EXECUTIVE OVERVIEW\n"
        "  - 2-3 paragraphs: Goal context, why it matters right now, key conclusion and bottom-line recommendation.\n\n"
        "## 2. MARKET INTELLIGENCE & SIZE\n"
        "  - Current TAM/SAM/SOM with specific $ figures and CAGR percentages\n"
        "  - Key market segments and their relative sizes\n"
        "  - Geographic opportunities with market-specific data\n\n"
        "## 3. RESEARCH FINDINGS & DATA SYNTHESIS\n"
        "  - 4-6 key data points with specific metrics from live research\n"
        "  - Named companies, recent funding rounds, acquisitions, or pivots\n"
        "  - Consumer behavior trends with statistical backing\n\n"
        "## 4. COMPETITIVE LANDSCAPE\n"
        "  - Profile of 5-7 key competitors with funding, market share, positioning\n"
        "  - Competitive differentiation matrix\n"
        "  - Where the competitive white spaces exist\n\n"
        "## 5. STRATEGIC ANALYSIS & KEY INSIGHTS\n"
        "  - The 3-5 most important strategic insights from combining research + analysis\n"
        "  - Convergence of trends creating a specific opportunity\n"
        "  - Timing assessment: why now is the right moment (or isn't)\n\n"
        "## 6. OPPORTUNITIES & RECOMMENDATIONS\n"
        "  - Rank the top 3-5 opportunities by impact vs effort\n"
        "  - For each: specific addressable segment, entry approach, expected ROI\n"
        "  - Recommended primary opportunity with detailed rationale\n\n"
        "## 7. RISK ASSESSMENT & MITIGATION\n"
        "  - 5-6 specific risks across: market, regulatory, technical, competitive, financial\n"
        "  - For each: probability, severity, mitigation plan\n\n"
        "## 8. SWOT ANALYSIS\n"
        "  - 4-5 items per quadrant, each explained in 1-2 sentences with data support\n\n"
        "## 9. IMPLEMENTATION ROADMAP\n"
        "  - Phase 1 (0-3 months): Foundation-building actions with milestones\n"
        "  - Phase 2 (3-9 months): Market entry and early traction actions\n"
        "  - Phase 3 (9-24 months): Scale and expansion strategy\n"
        "  - Key resources, team, and budget estimates per phase\n\n"
        "## 10. ACTION PLAN — 7 CONCRETE NEXT STEPS\n"
        "  - Must be specific, measurable, and time-bound (not generic advice)\n"
        "  - Order by urgency and dependency\n\n"
        "Use markdown formatting: headers (##), bold for key terms, bullet points, and numbered lists. "
        "Make every claim specific and evidence-based. This is an autonomous AI intelligence report — it must be exhaustive."
    )

    # Trim inputs to prevent context window overflow which silently truncates output
    research_trimmed = research_output[:6000] if research_output else ""
    analysis_trimmed = analysis_output[:4000] if analysis_output else ""

    user = (
        f"GOAL: {goal}\n"
        f"TASK: {task_description}\n\n"
        f"RESEARCH DATA:\n{research_trimmed}\n\n"
        f"STRATEGIC ANALYSIS:\n{analysis_trimmed}"
    )

    print(f"[Writer] Generating comprehensive intelligence report for: {goal[:60]}...")
    result = call_llm_grounded(system, user)

    return {
        "output": result.get("text", ""),
        "tool_used": "Gemini Google Search",
        "citations": result.get("citations", []),
    }

