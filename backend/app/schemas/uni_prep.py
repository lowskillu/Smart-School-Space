"""UniPrep request/response schemas."""
from __future__ import annotations

from datetime import datetime
from typing import Literal

from pydantic import BaseModel, Field
from .common import OrmModel


# ─── Extracurriculars ──────────────────────────────────────────────────────

class ExtracurricularCreate(BaseModel):
    title: str = Field(min_length=1, max_length=200)
    role: str | None = None
    organization: str | None = None
    hours_per_week: int = Field(ge=0, le=168)
    weeks_per_year: int = Field(ge=0, le=52)
    category: str = "STEM"
    description: str | None = Field(default=None, max_length=500)


class ExtracurricularOut(OrmModel):
    id: str
    student_id: str
    title: str
    role: str | None = None
    organization: str | None = None
    hours_per_week: int
    weeks_per_year: int
    category: str
    description: str | None = None
    created_at: str | None = None


# ─── Honors ───────────────────────────────────────────────────────────────

class HonorCreate(BaseModel):
    title: str = Field(min_length=1, max_length=200)
    level: Literal["School", "Regional", "National", "International"] = "Regional"
    year_received: int = Field(ge=2000, le=2100)


class HonorOut(OrmModel):
    id: str
    student_id: str
    title: str
    level: str
    year_received: int
    created_at: str | None = None


# ─── Exam Registrations ────────────────────────────────────────────────────

class ExamRegistrationCreate(BaseModel):
    exam_type: str = Field(min_length=1)
    subject: str | None = None
    exam_date: str  # ISO datetime string
    location: str | None = None


class ExamRegistrationOut(OrmModel):
    id: str
    student_id: str
    exam_type: str
    subject: str | None = None
    exam_date: str | None = None
    location: str | None = None
    created_at: str | None = None


# ─── Test Results ──────────────────────────────────────────────────────────

class TestResultCreate(BaseModel):
    exam_type: str = Field(min_length=1)
    subject: str | None = None
    score: float = Field(ge=0)
    is_mock: bool = False
    date_taken: str | None = None


class TestResultOut(OrmModel):
    id: str
    student_id: str
    exam_type: str
    subject: str | None = None
    score: float
    is_mock: bool
    date_taken: str | None = None
    document_url: str | None = None
    created_at: str | None = None
