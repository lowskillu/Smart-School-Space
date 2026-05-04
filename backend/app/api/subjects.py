"""Subjects endpoints — cached read, admin-only write."""
from __future__ import annotations

import time

from flask import jsonify, request

from . import api_bp
from ..core.cache import _store, invalidate_cache
from ..core.errors import NotFoundError, ValidationError
from ..core.security import jwt_required, require_role
from ..extensions import db
from ..models import Subject, GradeSubject, TeacherSubject

_CACHE_KEY = "all_subjects"
_CACHE_TTL = 300


def _get_all_subjects() -> list[dict]:
    """Return cached subject list, refreshing after TTL."""
    entry = _store.get(_CACHE_KEY)
    if entry:
        val, exp = entry
        if time.monotonic() < exp:
            return val
    rows = Subject.query.order_by(Subject.name).all()
    result = [r.to_dict() for r in rows]
    _store[_CACHE_KEY] = (result, time.monotonic() + _CACHE_TTL)
    return result


@api_bp.route("/subjects", methods=["GET"])
@jwt_required
def list_subjects():
    return jsonify(_get_all_subjects())


@api_bp.route("/subjects", methods=["POST"])
@jwt_required
@require_role("admin")
def create_subject():
    data = request.get_json(force=True) or {}
    name = (data.get("name") or "").strip()
    if not name:
        raise ValidationError("Field 'name' is required.")
    
    obj = Subject(
        name=name,
        code=data.get("code"),
        category=data.get("category"),
        credits=data.get("credits", 1),
        standard_hours=data.get("standard_hours", 4)
    )
    db.session.add(obj)
    db.session.flush()

    teacher_ids = data.get("teacherIds")
    if isinstance(teacher_ids, list):
        for tid in teacher_ids:
            ts = TeacherSubject(teacher_id=tid, subject_id=obj.id)
            db.session.add(ts)

    db.session.commit()
    invalidate_cache(_CACHE_KEY)
    return jsonify(obj.to_dict()), 201


@api_bp.route("/subjects/<string:id>", methods=["PUT"])
@jwt_required
@require_role("admin")
def update_subject(id: str):
    obj = db.session.get(Subject, id)
    if not obj:
        raise NotFoundError("Subject", id)
    
    data = request.get_json(force=True) or {}
    name = (data.get("name") or "").strip()
    if name:
        obj.name = name
    
    if "code" in data:
        obj.code = data["code"]
    if "category" in data:
        obj.category = data["category"]
    if "credits" in data:
        obj.credits = data["credits"]
    if "standard_hours" in data:
        obj.standard_hours = data["standard_hours"]

    teacher_ids = data.get("teacherIds")
    if isinstance(teacher_ids, list):
        # Clear old
        TeacherSubject.query.filter_by(subject_id=id).delete()
        # Add new
        for tid in teacher_ids:
            ts = TeacherSubject(teacher_id=tid, subject_id=id)
            db.session.add(ts)

    db.session.commit()
    invalidate_cache(_CACHE_KEY)
    return jsonify(obj.to_dict()), 200


@api_bp.route("/subjects/<string:id>", methods=["DELETE"])
@jwt_required
@require_role("admin")
def delete_subject(id: str):
    obj = db.session.get(Subject, id)
    if not obj:
        raise NotFoundError("Subject", id)
    db.session.delete(obj)
    db.session.commit()
    invalidate_cache(_CACHE_KEY)
    return "", 204


# ────────────── GRADE SUBJECTS (Curriculum per Parallel) ──────────────

@api_bp.route("/grade_subjects", methods=["GET"])
@jwt_required
def list_grade_subjects():
    grade_level = request.args.get("grade_level")
    query = GradeSubject.query
    if grade_level:
        query = query.filter_by(grade_level=int(grade_level))
    
    rows = query.all()
    return jsonify([r.to_dict() for r in rows])


@api_bp.route("/grade_subjects", methods=["POST"])
@jwt_required
@require_role("admin")
def create_grade_subject():
    data = request.get_json(force=True) or {}
    grade_level = data.get("grade_level")
    subject_id = data.get("subject_id")
    
    if grade_level is None or not subject_id:
        raise ValidationError("Fields 'grade_level' and 'subject_id' are required.")
    
    # Check if already exists
    existing = GradeSubject.query.filter_by(grade_level=grade_level, subject_id=subject_id).first()
    if existing:
        raise ValidationError(f"Subject already assigned to grade {grade_level}.")

    obj = GradeSubject(
        grade_level=grade_level,
        subject_id=subject_id,
        hours_per_week=data.get("hours_per_week", 4)
    )
    db.session.add(obj)
    db.session.commit()
    return jsonify(obj.to_dict()), 201


@api_bp.route("/grade_subjects/<string:id>", methods=["PUT"])
@jwt_required
@require_role("admin")
def update_grade_subject(id: str):
    obj = db.session.get(GradeSubject, id)
    if not obj:
        raise NotFoundError("GradeSubject", id)
    
    data = request.get_json(force=True) or {}
    if "hours_per_week" in data:
        obj.hours_per_week = data["hours_per_week"]
    
    db.session.commit()
    return jsonify(obj.to_dict()), 200


@api_bp.route("/grade_subjects/<string:id>", methods=["DELETE"])
@jwt_required
@require_role("admin")
def delete_grade_subject(id: str):
    obj = db.session.get(GradeSubject, id)
    if not obj:
        raise NotFoundError("GradeSubject", id)
    db.session.delete(obj)
    db.session.commit()
    return "", 204
