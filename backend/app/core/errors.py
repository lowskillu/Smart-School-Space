"""Custom exception hierarchy for SmartSchool API.

Every AppError subclass carries an HTTP status code and a machine-readable
``code`` string so the frontend can react programmatically.
"""
from __future__ import annotations

from typing import Any


class AppError(Exception):
    """Base class for all application-level errors."""

    status: int = 500
    code: str = "INTERNAL_ERROR"

    def __init__(self, message: str = "An unexpected error occurred.", details: Any = None) -> None:
        super().__init__(message)
        self.message = message
        self.details = details

    def to_dict(self) -> dict:
        return {
            "error": {
                "code": self.code,
                "message": self.message,
                "details": self.details,
            }
        }


# ─── 4xx ──────────────────────────────────────────────────────────────────────

class ValidationError(AppError):
    status = 422
    code = "VALIDATION_ERROR"

    def __init__(self, message: str = "Validation failed.", details: Any = None) -> None:
        super().__init__(message, details)


class NotFoundError(AppError):
    status = 404
    code = "NOT_FOUND"

    def __init__(self, resource: str = "Resource", id: str | None = None) -> None:
        msg = f"{resource} not found" + (f": {id}" if id else ".")
        super().__init__(msg)


class AuthError(AppError):
    status = 401
    code = "UNAUTHORIZED"

    def __init__(self, message: str = "Authentication required.") -> None:
        super().__init__(message)


class ForbiddenError(AppError):
    status = 403
    code = "FORBIDDEN"

    def __init__(self, message: str = "You do not have permission to perform this action.") -> None:
        super().__init__(message)


class ConflictError(AppError):
    status = 409
    code = "CONFLICT"

    def __init__(self, message: str = "Resource already exists.") -> None:
        super().__init__(message)


class BadRequestError(AppError):
    status = 400
    code = "BAD_REQUEST"

    def __init__(self, message: str = "Invalid request.") -> None:
        super().__init__(message)
