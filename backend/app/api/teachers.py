"""Teachers endpoints."""
from __future__ import annotations

from flask import jsonify, request

from . import api_bp
from ..core.errors import NotFoundError, ValidationError
from ..core.security import jwt_required, require_role
from ..extensions import db
from ..models import Teacher, TeacherSubject


@api_bp.route("/teachers", methods=["GET"])
@jwt_required
def list_teachers():
    rows = Teacher.query.order_by(Teacher.name).all()
    return jsonify([r.to_dict() for r in rows])


@api_bp.route("/teachers", methods=["POST"])
@jwt_required
@require_role("admin")
def create_teacher():
    data = request.get_json(force=True) or {}
    name = (data.get("name") or "").strip()
    if not name:
        raise ValidationError("Field 'name' is required.")

    teacher = Teacher(name=name, email=data.get("email"))
    db.session.add(teacher)
    db.session.flush()

    # Provision user account for teacher
    from ..models import User, Role
    from werkzeug.security import generate_password_hash
    teacher_role = Role.query.filter_by(name="teacher").first()
    if data.get("email"):
        user = User(
            name=name,
            email=data.get("email"),
            password_hash=generate_password_hash("TeacherSpace123!"),
            teacher_id=teacher.id,
            role_id=teacher_role.id if teacher_role else None
        )
        db.session.add(user)

    for sid in data.get("subjectIds", []):
        ts = TeacherSubject(teacher_id=teacher.id, subject_id=sid)
        db.session.add(ts)

    db.session.commit()
    return jsonify(teacher.to_dict()), 201


@api_bp.route("/teachers/<string:id>", methods=["PUT"])
@jwt_required
@require_role("admin")
def update_teacher(id: str):
    obj = db.session.get(Teacher, id)
    if not obj:
        raise NotFoundError("Teacher", id)
    
    data = request.get_json(force=True) or {}
    if "name" in data:
        obj.name = data["name"]
    if "email" in data:
        obj.email = data["email"]

    if "subjectIds" in data:
        # Clear old assignments
        TeacherSubject.query.filter_by(teacher_id=id).delete()
        # Add new ones
        for sid in data["subjectIds"]:
            ts = TeacherSubject(teacher_id=id, subject_id=sid)
            db.session.add(ts)

    db.session.commit()
    return jsonify(obj.to_dict()), 200


@api_bp.route("/teachers/<string:id>", methods=["DELETE"])
@jwt_required
@require_role("admin")
def delete_teacher(id: str):
    obj = db.session.get(Teacher, id)
    if not obj:
        raise NotFoundError("Teacher", id)
    db.session.delete(obj)
    db.session.commit()
    return "", 204
