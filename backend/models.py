"""Pydantic v2 schemas for GoalMind."""
from pydantic import BaseModel, Field
from typing import Optional


class GoalRequest(BaseModel):
    goal: str = Field(..., min_length=5, max_length=1000)


class ClarityScore(BaseModel):
    score: int = Field(..., ge=0, le=100)
    label: str  # "Too Vague" | "Good" | "Excellent"
    tip: str
    ready: bool


class SubTask(BaseModel):
    id: int
    title: str
    agent: str  # "research" | "analysis" | "writer"
    description: str


class AgentResult(BaseModel):
    agent: str
    output: str
    tool_used: str = ""
    confidence: float = 0.0


class Citation(BaseModel):
    title: str
    url: str


class DevilOutput(BaseModel):
    challenges: list[str] = []
    weak_points: list[str] = []
    refined_suggestion: str = ""


class SWOTData(BaseModel):
    strengths: list[str] = []
    weaknesses: list[str] = []
    opportunities: list[str] = []
    threats: list[str] = []


class ReportSections(BaseModel):
    overview: str = ""
    research_findings: str = ""
    key_insights: str = ""
    opportunity_analysis: str = ""
    risk_challenges: str = ""
    swot: Optional[SWOTData] = None
    strategic_recommendations: str = ""
    action_plan: str = ""


class ConfidenceReport(BaseModel):
    research_score: float = 0.0
    analysis_score: float = 0.0
    writer_score: float = 0.0
    overall: float = 0.0


class PipelineResult(BaseModel):
    goal: str
    subtasks: list[SubTask] = []
    agent_results: list[AgentResult] = []
    report: Optional[ReportSections] = None
    confidence: Optional[ConfidenceReport] = None
    devil: Optional[DevilOutput] = None
    citations: list[Citation] = []
    status: str = "pending"  # pending | running | complete | failed
    error: Optional[str] = None
