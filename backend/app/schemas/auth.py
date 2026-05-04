"""Auth request/response schemas."""
from __future__ import annotations

from pydantic import BaseModel, EmailStr, Field
from .common import OrmModel


class LoginRequest(BaseModel):
    email: EmailStr
    password: str = Field(min_length=1)


class RefreshRequest(BaseModel):
    refresh_token: str


class UserOut(OrmModel):
    id: str
    name: str
    email: str
    role: str
    role_id: str
    permissions: list[str]
    teacher_id: str | None = None
    student_id: str | None = None


class TokenResponse(BaseModel):
    access_token: str
    refresh_token: str
    user: UserOut


class CreateStudentRequest(BaseModel):
    name: str = Field(min_length=1, max_length=200)
    login: EmailStr
    password: str = Field(min_length=6)
    graduation_year: str = "2026"
    class_id: str | None = None


class UpdateStudentRequest(BaseModel):
    name: str | None = None
    login: EmailStr | None = None
    password: str | None = Field(default=None, min_length=6)
    class_id: str | None = None
