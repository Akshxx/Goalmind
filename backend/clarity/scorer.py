"""Goal clarity scoring — fast heuristic-based scoring for real-time feedback."""
import re


def _heuristic_score(goal: str) -> dict:
    """Fast word-count + keyword heuristic for real-time clarity scoring."""
    goal_lower = goal.lower().strip()
    words = goal_lower.split()
    word_count = len(words)

    # Base score: 3.5 points per word, capped at 75
    score = min(word_count * 3.5, 75)

    # Boost for actionable verbs (+8)
    action_words = [
        "analyze", "plan", "evaluate", "build", "create", "design",
        "research", "compare", "assess", "develop", "launch", "strategy",
        "roadmap", "startup", "market", "product", "grow", "scale",
        "improve", "optimize", "generate", "automate", "deploy",
    ]
    if any(w in goal_lower for w in action_words):
        score = min(score + 8, 83)

    # Boost for audience/context signals (+8)
    context_signals = [
        "targeting", "for ", "in india", "in the us", "tier-2", "tier 2",
        "startup", "b2b", "b2c", "enterprise", "sme", "students", "users",
        "founders", "managers", "customers", "clients",
    ]
    if any(sig in goal_lower for sig in context_signals):
        score = min(score + 8, 91)

    # Boost for timeline/scope signals (+6)
    timeline_signals = [
        "month", "year", "quarter", "q1", "q2", "q3", "q4", "week",
        "6-month", "12-month", "roadmap", "milestones", "phase",
    ]
    if any(sig in goal_lower for sig in timeline_signals):
        score = min(score + 6, 95)

    # Slight penalty for very short/vague goals
    if word_count < 5:
        score = min(score, 30)
    elif word_count < 8:
        score = min(score, 55)

    score = int(max(0, min(100, score)))

    if score >= 85:
        label = "Excellent"
        tip = "Your goal is very well-defined — GoalMind can deliver a high-quality analysis!"
    elif score >= 70:
        label = "Good"
        tip = "Clear enough to run. Consider adding timeline or target audience for a richer report."
    elif score >= 40:
        label = "Needs Improvement"
        tip = "Add more detail — specify the domain, audience, timeline, or expected outcome."
    else:
        label = "Too Vague"
        tip = "Your goal is too short. Describe what you want to achieve, for whom, and why."

    return {"score": score, "label": label, "tip": tip, "ready": score >= 70}


def score_goal(goal: str) -> dict:
    """Score goal clarity 0–100 using fast heuristics (no LLM — instant response)."""
    if not goal or len(goal.strip()) < 3:
        return {"score": 0, "label": "Too Vague", "tip": "Please enter a goal.", "ready": False}
    return _heuristic_score(goal)
