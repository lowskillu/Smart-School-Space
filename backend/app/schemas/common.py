"""Common/shared schema types."""
from __future__ import annotations

from pydantic import BaseModel, ConfigDict


class OrmModel(BaseModel):
    """Base model that allows ORM objects to be passed directly."""
    model_config = ConfigDict(from_attributes=True)


class MessageResponse(BaseModel):
    message: str


class ErrorDetail(BaseModel):
    code: str
    message: str
    details: object | None = None


class ErrorResponse(BaseModel):
    error: ErrorDetail
