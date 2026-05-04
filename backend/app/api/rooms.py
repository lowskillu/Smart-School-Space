"""Rooms endpoints — cached read, admin-only write."""
from __future__ import annotations

import time

from flask import jsonify, request

from . import api_bp
from ..core.cache import _store, invalidate_cache
from ..core.errors import NotFoundError, ValidationError
from ..core.security import jwt_required, require_role
from ..extensions import db
from ..models import Room

_CACHE_KEY = "all_rooms"
_CACHE_TTL = 300


def _get_all_rooms() -> list[dict]:
    entry = _store.get(_CACHE_KEY)
    if entry:
        val, exp = entry
        if time.monotonic() < exp:
            return val
    rows = Room.query.order_by(Room.name).all()
    result = [r.to_dict() for r in rows]
    _store[_CACHE_KEY] = (result, time.monotonic() + _CACHE_TTL)
    return result


@api_bp.route("/rooms", methods=["GET"])
@jwt_required
def list_rooms():
    return jsonify(_get_all_rooms())


@api_bp.route("/rooms", methods=["POST"])
@jwt_required
@require_role("admin")
def create_room():
    data = request.get_json(force=True) or {}
    name = (data.get("name") or "").strip()
    if not name:
        raise ValidationError("Field 'name' is required.")
    obj = Room(name=name, capacity=data.get("capacity", 30))
    db.session.add(obj)
    db.session.commit()
    invalidate_cache(_CACHE_KEY)
    return jsonify(obj.to_dict()), 201


@api_bp.route("/rooms/<string:id>", methods=["PUT"])
@jwt_required
@require_role("admin")
def update_room(id: str):
    obj = db.session.get(Room, id)
    if not obj:
        raise NotFoundError("Room", id)
    
    data = request.get_json(force=True) or {}
    if "name" in data:
        obj.name = data["name"]
    if "capacity" in data:
        obj.capacity = int(data["capacity"])

    db.session.commit()
    invalidate_cache(_CACHE_KEY)
    return jsonify(obj.to_dict()), 200


@api_bp.route("/rooms/<string:id>", methods=["DELETE"])
@jwt_required
@require_role("admin")
def delete_room(id: str):
    obj = db.session.get(Room, id)
    if not obj:
        raise NotFoundError("Room", id)
    db.session.delete(obj)
    db.session.commit()
    invalidate_cache(_CACHE_KEY)
    return "", 204
