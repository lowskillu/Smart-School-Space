"""Auth endpoints — login, refresh, logout, me.

All business logic is delegated to AuthService.
Routes are thin controllers: validate → delegate → respond.
"""
from __future__ import annotations

from flask import g, jsonify, request
from flask_jwt_extended import get_jwt, get_jwt_identity, jwt_required

from . import api_bp
from ..core.security import make_tokens, revoke_token
from ..schemas.auth import LoginRequest
from ..services.auth_service import auth_service


@api_bp.route("/auth/login", methods=["POST"])
def auth_login():
    """POST /api/auth/login — validate credentials, return JWT pair."""
    body = LoginRequest.model_validate(request.get_json(force=True) or {})
    result = auth_service.login(body.email, body.password)
    return jsonify(result), 200


@api_bp.route("/auth/refresh", methods=["POST"])
@jwt_required(refresh=True)
def auth_refresh():
    """POST /api/auth/refresh — exchange refresh token for new access token."""
    user_id = get_jwt_identity()
    user = auth_service.get_user_dict(user_id)
    tokens = make_tokens(user["id"], user["role"], user["permissions"])
    return jsonify({**tokens, "user": user}), 200


@api_bp.route("/auth/logout", methods=["POST"])
@jwt_required()
def auth_logout():
    """POST /api/auth/logout — revoke current access token."""
    jti = get_jwt().get("jti")
    if jti:
        revoke_token(jti)
    return jsonify({"message": "Logged out successfully."}), 200


@api_bp.route("/auth/me", methods=["GET"])
@jwt_required()
def auth_me():
    """GET /api/auth/me — return current user from JWT identity."""
    user_id = get_jwt_identity()
    user = auth_service.get_user_dict(user_id)
    return jsonify(user), 200
