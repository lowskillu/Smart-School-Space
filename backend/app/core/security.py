"""JWT security helpers using Flask-JWT-Extended.

We use Flask-JWT-Extended (already installed) which integrates cleanly
with Flask and provides access + refresh token patterns.

Access token  — short-lived (15 min), sent in Authorization header
Refresh token — long-lived (7 days), used to mint new access tokens
"""
from __future__ import annotations

from datetime import timedelta
from functools import wraps
from typing import Callable

from flask import g, jsonify, request
from flask_jwt_extended import (
    JWTManager,
    create_access_token,
    create_refresh_token,
    decode_token,
    get_jwt,
    get_jwt_identity,
    jwt_required as _flask_jwt_required,
    verify_jwt_in_request,
)

from .errors import AuthError, ForbiddenError
from .logging_cfg import get_logger

logger = get_logger(__name__)

# Singleton — initialised in extensions.py
jwt = JWTManager()

# In-memory token blacklist (jti → True).
# Production: replace with Redis.
_revoked_tokens: set[str] = set()


# ─── Token factory helpers ─────────────────────────────────────────────────

def make_tokens(user_id: str, role: str, permissions: list[str]) -> dict[str, str]:
    """Create a paired access + refresh token for the given user."""
    additional = {"role": role, "permissions": permissions}
    access = create_access_token(
        identity=user_id,
        additional_claims=additional,
        expires_delta=timedelta(minutes=15),
    )
    refresh = create_refresh_token(
        identity=user_id,
        expires_delta=timedelta(days=7),
    )
    return {"access_token": access, "refresh_token": refresh}


def revoke_token(jti: str) -> None:
    _revoked_tokens.add(jti)


# ─── JWT callbacks (registered via jwt.init_app) ──────────────────────────


def setup_jwt_callbacks(jwt_instance: JWTManager) -> None:
    @jwt_instance.token_in_blocklist_loader
    def check_if_revoked(jwt_header, jwt_payload):
        return jwt_payload.get("jti") in _revoked_tokens

    @jwt_instance.revoked_token_loader
    def revoked_token_response(jwt_header, jwt_payload):
        return jsonify({
            "error": {"code": "TOKEN_REVOKED", "message": "Token has been revoked.", "details": None}
        }), 401

    @jwt_instance.expired_token_loader
    def expired_token_response(jwt_header, jwt_payload):
        return jsonify({
            "error": {"code": "TOKEN_EXPIRED", "message": "Token has expired.", "details": None}
        }), 401

    @jwt_instance.invalid_token_loader
    def invalid_token_response(error):
        return jsonify({
            "error": {"code": "TOKEN_INVALID", "message": str(error), "details": None}
        }), 401

    @jwt_instance.unauthorized_loader
    def missing_token_response(error):
        return jsonify({
            "error": {"code": "UNAUTHORIZED", "message": "Authentication required.", "details": None}
        }), 401


# ─── Decorators ────────────────────────────────────────────────────────────

def jwt_required(f: Callable) -> Callable:
    """Require a valid JWT. Sets g.current_user_id, g.current_role, g.current_permissions."""
    @wraps(f)
    def decorated(*args, **kwargs):
        try:
            verify_jwt_in_request()
        except Exception as exc:
            raise AuthError(str(exc)) from exc

        claims = get_jwt()
        g.current_user_id = get_jwt_identity()
        g.current_role = claims.get("role", "student")
        g.current_permissions = claims.get("permissions", [])
        return f(*args, **kwargs)
    return decorated


def get_current_user_id() -> str | None:
    """Helper to get user ID from flask.g (set by @jwt_required) or directly from JWT."""
    user_id = getattr(g, "current_user_id", None)
    if not user_id:
        try:
            verify_jwt_in_request(optional=True)
            user_id = get_jwt_identity()
        except:
            pass
    return user_id


def require_permission(permission: str) -> Callable:
    """Decorator: require a specific permission in the JWT claims.
    Admin role bypasses all permission checks.
    Must be used AFTER @jwt_required.
    """
    def decorator(f: Callable) -> Callable:
        @wraps(f)
        def decorated(*args, **kwargs):
            role = getattr(g, "current_role", None)
            if role == "admin":
                return f(*args, **kwargs)
            perms: list[str] = getattr(g, "current_permissions", [])
            if permission not in perms:
                logger.warning(
                    "Permission denied: user=%s role=%s required=%s",
                    getattr(g, "current_user_id", "?"), role, permission,
                )
                raise ForbiddenError(
                    f"Permission '{permission}' required."
                )
            return f(*args, **kwargs)
        return decorated
    return decorator


def require_role(*roles: str) -> Callable:
    """Decorator: restrict to specific roles.
    Must be used AFTER @jwt_required.
    """
    def decorator(f: Callable) -> Callable:
        @wraps(f)
        def decorated(*args, **kwargs):
            role = getattr(g, "current_role", None)
            if role not in roles:
                logger.warning(
                    "Role denied: user=%s has role=%s, required=%s",
                    getattr(g, "current_user_id", "?"), role, roles,
                )
                raise ForbiddenError(
                    f"One of roles {list(roles)} required. You have: '{role}'."
                )
            return f(*args, **kwargs)
        return decorated
    return decorator


def admin_required(f: Callable) -> Callable:
    """Shortcut for require_role('admin')"""
    return require_role("admin")(f)
