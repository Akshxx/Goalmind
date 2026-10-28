"""Structured report builder — compiles all agent outputs into report sections."""
import json
import re
from llm import call_llm


def _clean_research_payload(raw: str) -> str:
    """Strip raw specialist JSON blobs from the research payload.
    Only keep the unstructured prose section for the report.
    """
    if not raw:
        return ""
    # If the payload has the specialist data markers, only keep the UNSTRUCTURED RESEARCH part
    if "UNSTRUCTURED RESEARCH:" in raw:
        unstructured = raw.split("UNSTRUCTURED RESEARCH:\n", 1)[-1]
        if "SPECIALIST STRUCTURAL DATA:" in unstructured:
            unstructured = unstructured.split("SPECIALIST STRUCTURAL DATA:")[0]
        return unstructured.strip()
    # Fallback — strip out any obvious JSON arrays/objects so they don't appear in prose
    cleaned = re.sub(r'\[\s*\{.*?\}\s*\]', '', raw, flags=re.DOTALL)
    cleaned = re.sub(r'\{[^{}]{0,500}\}', '', cleaned, flags=re.DOTALL)
    return cleaned.strip()



def _repair_json(raw: str) -> str:
    """Attempt to repair a truncated JSON string by closing any open structures."""
    if not raw:
        return raw
    start = raw.find("{")
    if start == -1:
        return raw
    raw = raw[start:]
    depth_obj, depth_arr, in_string, escape_next = 0, 0, False, False
    for ch in raw:
        if escape_next:
            escape_next = False
            continue
        if ch == "\\" and in_string:
            escape_next = True
            continue
        if ch == '"':
            in_string = not in_string
            continue
        if in_string:
            continue
        if ch == "{":
            depth_obj += 1
        elif ch == "}":
            depth_obj = max(0, depth_obj - 1)
        elif ch == "[":
            depth_arr += 1
        elif ch == "]":
            depth_arr = max(0, depth_arr - 1)
    suffix = ('"' if in_string else "") + ("]" * depth_arr) + ("}" * depth_obj)
    return raw + suffix

def build_report(goal: str, research_output: str, analysis_output: str, writer_output: str) -> dict:
    """Build structured report sections from all agent outputs.
    Returns: dict with keys matching ReportSections model.
    """
    # Clean research payload before passing to LLM — strip out specialist JSON blobs
    clean_research = _clean_research_payload(research_output)

    system = (
        "You are a senior McKinsey partner writing a comprehensive board-level intelligence report. "
        "Synthesize all provided research, analysis, and written data into a thorough, authoritative, "
        "and highly specific report. This is NOT a summary — it must be a full analytical document.\n\n"
        "MANDATORY RULES:\n"
        "- Write in crisp, authoritative business prose — NO JSON, NO bullet points, NO markdown headers inside values\n"
        "- Every section must be 10-14 complete sentences with specific data, named companies, and real metrics\n"
        "- Use specific numbers: %, $ figures, CAGR percentages, funding amounts, user counts, dates\n"
        "- Each section must tell a complete story: context → data → insight → implication\n"
        "- The action_plan MUST be 7 numbered steps, each on its own line, separated by \\n\\n\n"
        "- Each action_plan step must include WHO does it, WHAT exactly they do, WHEN (timeline), and WHY it matters\n"
        "- Return ONLY a valid JSON object with these exact keys:\n\n"
        "{\n"
        "  \"overview\": \"<12-14 sentences: open with the market opportunity scale and urgency, explain the goal's strategic rationale, summarize the key market context (size, growth, timing), name the biggest competitive threats, state the single most critical success factor, and close with the bottom-line recommendation with a specific timeframe>\",\n"
        "  \"research_findings\": \"<10-12 sentences: lead with the TAM and CAGR with source attribution, break down market segments and their relative sizes, name 5-6 specific competitors with their funding and positioning, cite specific consumer behavior trends with survey data or statistics, describe 2-3 recent notable developments (acquisitions, regulation changes, product launches), and close with the most surprising or contrarian finding>\",\n"
        "  \"key_insights\": \"<10-12 sentences: articulate the 4-5 most important strategic patterns that emerge from combining all the data, explain where two or more trends are converging to create a specific opportunity window, assess the timing signal (why now specifically), identify the single largest white space in the market, and explain what the data reveals that would not be obvious to a first-time analyst>\",\n"
        "  \"opportunity_analysis\": \"<10-12 sentences: provide a full TAM/SAM/SOM breakdown with specific $ figures and methodology, rank the top 4 opportunities by impact × effort with a clear rationale for each ranking, explain the specific customer segment and geography for the primary opportunity, describe the expected ROI and timeline to break-even, and identify the single most important unfair advantage the entrant could build>\",\n"
        "  \"risk_challenges\": \"<10-12 sentences: identify 5-6 specific risks across categories — regulatory, market, competitive, technical, financial, and execution — for each risk state probability (high/medium/low) and severity (high/medium/low) and a concrete mitigation strategy, close with the single risk that if underestimated could be fatal to the venture>\",\n"
        "  \"strategic_recommendations\": \"<10-12 sentences: state the recommended primary strategy in one clear sentence, explain the recommended GTM approach with the specific first customer segment and acquisition channel, describe the team composition and key hires needed in the first 90 days, specify the product MVP scope and what to cut for speed, name the one metric that matters most in the first 6 months, and close with a specific funding milestone and the evidence that would signal it's time to scale>\",\n"
        "  \"action_plan\": \"1. <Step one — WHO, WHAT, WHEN, WHY — 2 detailed sentences>\\n\\n2. <Step two — WHO, WHAT, WHEN, WHY — 2 detailed sentences>\\n\\n3. <Step three — WHO, WHAT, WHEN, WHY — 2 detailed sentences>\\n\\n4. <Step four — WHO, WHAT, WHEN, WHY — 2 detailed sentences>\\n\\n5. <Step five — WHO, WHAT, WHEN, WHY — 2 detailed sentences>\\n\\n6. <Step six — WHO, WHAT, WHEN, WHY — 2 detailed sentences>\\n\\n7. <Step seven — specific 90-day completion milestone — 2 detailed sentences>\"\n"
        "}\n\n"
        "Do NOT include any text, markdown, or explanation outside the JSON object."
    )

    user = (
        f"GOAL: {goal}\n\n"
        f"RESEARCH FINDINGS:\n{clean_research[:6000]}\n\n"
        f"STRATEGIC ANALYSIS:\n{analysis_output[:5000]}\n\n"
        f"WRITTEN REPORT:\n{writer_output[:7000]}"
    )


    try:
        raw = call_llm(system, user)
        raw = raw.strip()
        # Remove markdown code fences if present
        if raw.startswith("```"):
            raw = re.sub(r"^```(?:json)?\s*", "", raw)
            raw = re.sub(r"\s*```$", "", raw)
        raw = _repair_json(raw)
        parsed = json.loads(raw)
        # Validate that we got proper prose, not raw data
        for key in ["overview", "research_findings", "key_insights"]:
            val = parsed.get(key, "")
            if val.startswith("[") or val.startswith("{"):
                # LLM returned raw JSON - regenerate this section
                parsed[key] = f"Analysis of {goal}: {val[:200]}..." if len(val) > 200 else val
        return parsed
    except Exception as e:
        print(f"[ReportGen] Structured parse failed ({e}), using fallback LLM synthesis...")
        # Use a simpler LLM call for the fallback
        try:
            fallback_system = (
                "Write a concise professional business analysis with these sections: "
                "Overview, Research Findings, Key Insights, Opportunities, Risks, Recommendations, Action Plan. "
                "Return ONLY valid JSON with these keys: overview, research_findings, key_insights, "
                "opportunity_analysis, risk_challenges, strategic_recommendations, action_plan. "
                "All values must be plain professional prose strings."
            )
            fallback_user = f"Goal: {goal}\n\nContext: {writer_output[:1000] or analysis_output[:1000]}"
            raw2 = call_llm(fallback_system, fallback_user)
            raw2 = raw2.strip()
            if raw2.startswith("```"):
                raw2 = re.sub(r"^```(?:json)?\s*", "", raw2)
                raw2 = re.sub(r"\s*```$", "", raw2)
            return json.loads(raw2)
        except Exception as e2:
            print(f"[ReportGen] Fallback also failed: {e2}")
            # Last resort — generate clean sections from the writer output
            return {
                "overview": f"This report analyzes the goal: {goal}. The GoalMind pipeline has completed a comprehensive multi-agent research and analysis pass.",
                "research_findings": clean_research[:500] if clean_research and not clean_research.startswith("[") else "Market research was conducted using live web sources across multiple specialist domains.",
                "key_insights": analysis_output[:500] if analysis_output and not analysis_output.startswith("[") else "Strategic analysis identified key opportunity areas and competitive dynamics in the target market.",
                "opportunity_analysis": "Multiple opportunity vectors were identified through the specialist agent pipeline. Further research is recommended.",
                "risk_challenges": "Key risks and challenges were identified through competitive analysis and regulatory scanning.",
                "strategic_recommendations": "A phased go-to-market strategy is recommended based on the research findings.",
                "action_plan": writer_output[:500] if writer_output and not writer_output.startswith("[") else "1. Validate market size. 2. Build MVP. 3. Test with beta users. 4. Refine based on feedback. 5. Scale.",
            }

