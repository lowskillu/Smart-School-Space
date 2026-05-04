"""Grade request/response schemas."""
from __future__ import annotations

from pydantic import BaseModel, Field
from .common import OrmModel


class GradeCreate(BaseModel):
    student_id: str
    subject_id: str
    score: float = Field(ge=0.0, le=100.0)
    semester: str = Field(min_length=1)
    comments: str | None = None


class GradeOut(OrmModel):
    id: str
    student_id: str
    subject_id: str
    score: float | None
    semester: str | None
    comments: str | None = None
    created_at: str | None = None


class GradeSummaryOut(BaseModel):
    chart: list[dict]
    summary: dict[str, float]
