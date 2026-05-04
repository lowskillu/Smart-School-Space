"""Classes endpoints — cached read, admin-only write."""
from __future__ import annotations

import time

from flask import jsonify, request

from . import api_bp
from ..core.cache import _store, invalidate_cache
from ..core.errors import NotFoundError, ValidationError
from ..core.security import jwt_required, require_role
from ..extensions import db
from ..models import ClassGroup, Student, User

_CACHE_KEY = "all_classes"
_CACHE_TTL = 300


def _get_all_classes() -> list[dict]:
    entry = _store.get(_CACHE_KEY)
    if entry:
        val, exp = entry
        if time.monotonic() < exp:
            return val
    rows = ClassGroup.query.order_by(ClassGroup.name).all()
    result = [r.to_dict() for r in rows]
    _store[_CACHE_KEY] = (result, time.monotonic() + _CACHE_TTL)
    return result


@api_bp.route("/classes", methods=["GET"])
@jwt_required
def list_classes():
    return jsonify(_get_all_classes())


@api_bp.route("/classes/<string:class_id>/students", methods=["GET"])
@jwt_required
def get_class_students(class_id: str):
    users = User.query.join(Student, User.student_id == Student.id).filter(Student.class_id == class_id).all()
    return jsonify([u.to_dict() for u in users]), 200


@api_bp.route("/classes", methods=["POST"])
@jwt_required
@require_role("admin")
def create_class():
    data = request.get_json(force=True) or {}
    name = (data.get("name") or "").strip()
    if not name:
        raise ValidationError("Field 'name' is required.")
    grade_level = data.get("grade_level", 9)
    capacity = data.get("capacity", 30)
    homeroom_id = data.get("homeroom_id")
    class_teacher_id = data.get("class_teacher_id")

    obj = ClassGroup(
        name=name, 
        grade_level=grade_level, 
        capacity=capacity,
        homeroom_id=homeroom_id,
        class_teacher_id=class_teacher_id
    )
    db.session.add(obj)
    db.session.commit()
    invalidate_cache(_CACHE_KEY)
    return jsonify(obj.to_dict()), 201


@api_bp.route("/classes/<string:id>", methods=["PUT"])
@jwt_required
@require_role("admin")
def update_class(id: str):
    obj = db.session.get(ClassGroup, id)
    if not obj:
        raise NotFoundError("Class", id)
    
    data = request.get_json(force=True) or {}
    if "name" in data:
        obj.name = data["name"]
    if "grade_level" in data:
        obj.grade_level = data["grade_level"]
    if "capacity" in data:
        obj.capacity = data["capacity"]
    if "homeroom_id" in data:
        obj.homeroom_id = data["homeroom_id"]
    if "class_teacher_id" in data:
        obj.class_teacher_id = data["class_teacher_id"]
        
    db.session.commit()
    invalidate_cache(_CACHE_KEY)
    return jsonify(obj.to_dict()), 200


@api_bp.route("/classes/<string:id>", methods=["DELETE"])
@jwt_required
@require_role("admin")
def delete_class(id: str):
    obj = db.session.get(ClassGroup, id)
    if not obj:
        raise NotFoundError("Class", id)
    db.session.delete(obj)
    db.session.commit()
    invalidate_cache(_CACHE_KEY)
    return "", 204
