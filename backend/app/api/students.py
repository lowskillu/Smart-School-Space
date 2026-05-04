"""Students endpoints."""
from __future__ import annotations

from flask import jsonify, request

from . import api_bp
from ..core.security import jwt_required, require_role
from ..core.errors import ValidationError as AppValidationError
from ..extensions import db
from ..models import Student


@api_bp.route("/students", methods=["GET"])
@jwt_required
def list_students():
    class_id = request.args.get("class_id")
    q = Student.query.order_by(Student.name)
    if class_id:
        q = q.filter_by(class_id=class_id)
    rows = q.all()
    return jsonify([r.to_dict() for r in rows])


@api_bp.route("/students", methods=["POST"])
@jwt_required
@require_role("admin")
def create_student():
    data = request.get_json(force=True) or {}
    name = data.get("name", "").strip()
    if not name:
        raise AppValidationError("Field 'name' is required.")
    obj = Student(
        name=name,
        email=data.get("email"),
        class_id=data.get("class_id"),
    )
    db.session.add(obj)
    db.session.commit()
    return jsonify(obj.to_dict()), 201


@api_bp.route("/students/<string:id>", methods=["DELETE"])
@jwt_required
@require_role("admin")
def delete_student(id: str):
    obj = db.session.get(Student, id)
    if not obj:
        from ..core.errors import NotFoundError
        raise NotFoundError("Student", id)
    db.session.delete(obj)
    db.session.commit()
    return "", 204
