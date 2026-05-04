"""Staffing endpoints — workloads and teacher constraints."""
from __future__ import annotations

import json

from flask import jsonify, request

from . import api_bp
from ..core.errors import BadRequestError, NotFoundError
from ..core.security import jwt_required, require_permission, require_role
from ..extensions import db
from ..models import TeacherConstraint, TeacherWorkload


@api_bp.route("/staffing/workloads", methods=["GET"])
@jwt_required
@require_permission("view_attendance")
def get_workloads():
    teacher_id = request.args.get("teacher_id")
    q = TeacherWorkload.query
    if teacher_id:
        q = q.filter_by(teacher_id=teacher_id)
    return jsonify([w.to_dict() for w in q.all()])


@api_bp.route("/staffing/workloads", methods=["POST"])
@jwt_required
@require_role("admin")
def create_workload():
    data = request.get_json(force=True) or {}
    required = ("teacher_id", "subject_id", "class_id", "hours_per_week")
    missing = [k for k in required if k not in data]
    if missing:
        raise BadRequestError(f"Missing required fields: {missing}")

    workload = TeacherWorkload(
        teacher_id=data["teacher_id"],
        subject_id=data["subject_id"],
        class_id=data["class_id"],
        hours_per_week=int(data["hours_per_week"]),
    )
    db.session.add(workload)
    db.session.commit()
    return jsonify(workload.to_dict()), 201


@api_bp.route("/staffing/workloads/<string:id>", methods=["DELETE"])
@jwt_required
@require_role("admin")
def delete_workload(id: str):
    workload = db.session.get(TeacherWorkload, id)
    if not workload:
        raise NotFoundError("Workload", id)
    db.session.delete(workload)
    db.session.commit()
    return jsonify({"message": "Deleted"}), 200


@api_bp.route("/staffing/workloads/<string:id>", methods=["PUT", "PATCH"])
@jwt_required
@require_role("admin")
def update_workload(id: str):
    workload = db.session.get(TeacherWorkload, id)
    if not workload:
        raise NotFoundError("Workload", id)
    
    data = request.get_json(force=True) or {}
    if "hours_per_week" in data:
        workload.hours_per_week = int(data["hours_per_week"])
    if "teacher_id" in data:
        workload.teacher_id = data["teacher_id"]
    
    db.session.commit()
    return jsonify(workload.to_dict()), 200


@api_bp.route("/staffing/constraints", methods=["GET"])
@jwt_required
@require_permission("view_attendance")
def get_constraints():
    teacher_id = request.args.get("teacher_id")
    q = TeacherConstraint.query
    if teacher_id:
        q = q.filter_by(teacher_id=teacher_id)
    return jsonify([c.to_dict() for c in q.all()])


@api_bp.route("/staffing/constraints", methods=["POST", "PUT"])
@api_bp.route("/staffing/constraints/<teacher_id>", methods=["POST", "PUT"])
@jwt_required
@require_role("admin")
def save_constraint(teacher_id=None):
    data = request.get_json(force=True) or {}
    # Use teacher_id from URL if provided, otherwise from body
    teacher_id = teacher_id or data.get("teacher_id")
    if not teacher_id:
        raise BadRequestError("Field 'teacher_id' is required.")

    constraint = TeacherConstraint.query.filter_by(teacher_id=teacher_id).first()
    if not constraint:
        constraint = TeacherConstraint(teacher_id=teacher_id)
        db.session.add(constraint)

    if "max_hours_per_day" in data:
        constraint.max_hours_per_day = int(data["max_hours_per_day"])
    if "max_hours_per_week" in data:
        constraint.max_hours_per_week = int(data["max_hours_per_week"])
        print(f"DEBUG: Saving max_hours_per_week={constraint.max_hours_per_week}")
    if "consecutive_limits" in data:
        constraint.consecutive_limits = int(data["consecutive_limits"])
    if "blocked_slots" in data:
        constraint.blocked_slots = json.dumps(data["blocked_slots"])

    db.session.commit()
    return jsonify(constraint.to_dict()), 200
