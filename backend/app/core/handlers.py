"""Global error handlers — every unhandled exception becomes clean JSON.

Registered in ``app/__init__.py`` via ``register_error_handlers(app)``.
"""
from __future__ import annotations

import traceback

from flask import Flask, jsonify, request
from pydantic import ValidationError as PydanticValidationError
from werkzeug.exceptions import HTTPException

from .errors import AppError
from .logging_cfg import get_logger

logger = get_logger(__name__)


def register_error_handlers(app: Flask) -> None:
    """Attach all error handlers to the Flask application."""

    # ── Our own AppError hierarchy ─────────────────────────────────────────

    @app.errorhandler(AppError)
    def handle_app_error(exc: AppError):
        logger.warning(
            "AppError [%s %d]: %s | details=%s",
            exc.code, exc.status, exc.message, exc.details,
        )
        return jsonify(exc.to_dict()), exc.status

    # ── Pydantic validation errors ──────────────────────────────────────────

    @app.errorhandler(PydanticValidationError)
    def handle_pydantic_error(exc: PydanticValidationError):
        errors = exc.errors(include_url=False)
        logger.warning("Pydantic validation failed: %s", errors)
        return jsonify({
            "error": {
                "code": "VALIDATION_ERROR",
                "message": "Request body validation failed.",
                "details": [
                    {
                        "field": " → ".join(str(loc) for loc in e["loc"]),
                        "msg": e["msg"],
                        "type": e["type"],
                    }
                    for e in errors
                ],
            }
        }), 422

    # ── Werkzeug HTTP exceptions (404, 405, …) ─────────────────────────────

    @app.errorhandler(HTTPException)
    def handle_http_exception(exc: HTTPException):
        logger.info("HTTP %d: %s | method=%s | url=%s", exc.code, exc.description, request.method, request.url)
        return jsonify({
            "error": {
                "code": f"HTTP_{exc.code}",
                "message": exc.description or exc.name,
                "details": None,
            }
        }), exc.code

    # ── Catch-all: unhandled Python exceptions → 500 ───────────────────────

    @app.errorhandler(Exception)
    def handle_unexpected_error(exc: Exception):
        logger.error(
            "Unhandled exception: %s\n%s",
            exc,
            traceback.format_exc(),
        )
        return jsonify({
            "error": {
                "code": "INTERNAL_ERROR",
                "message": "An unexpected server error occurred. Please try again later.",
                "details": None,
            }
        }), 500
