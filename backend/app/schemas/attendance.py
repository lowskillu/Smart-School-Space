"""Attendance request/response schemas."""
from __future__ import annotations

from datetime import date
from typing import Literal

from pydantic import BaseModel, Field
from .common import OrmModel


class AttendanceUpsert(BaseModel):
    student_id: str
    class_id: str
    day: int = Field(ge=0, le=6)
    period: int = Field(ge=0, le=8)
    date: str  # ISO date string "YYYY-MM-DD"
    status: Literal["present", "absent", "late"] = "present"
    face_id: bool = False


class AttendanceOut(OrmModel):
    id: str
    student_id: str
    class_id: str
    day: int
    period: int
    date: str
    status: str
    face_id: bool | None = None
