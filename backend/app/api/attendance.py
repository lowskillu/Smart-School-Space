"""Attendance endpoints."""
from __future__ import annotations

from flask import jsonify, request

from . import api_bp
from ..core.security import jwt_required, require_permission
from ..repositories.attendance_repo import attendance_repo
from ..schemas.attendance import AttendanceUpsert


@api_bp.route("/attendance", methods=["GET"])
@jwt_required
@require_permission("view_attendance")
def list_attendance():
    rows = attendance_repo.list_filtered(
        class_id=request.args.get("class_id"),
        student_id=request.args.get("student_id"),
        day=request.args.get("day", type=int),
        date=request.args.get("date"),
    )
    return jsonify([r.to_dict() for r in rows])


@api_bp.route("/attendance", methods=["POST"])
@jwt_required
@require_permission("edit_attendance")
def upsert_attendance():
    body = AttendanceUpsert.model_validate(request.get_json(force=True) or {})
    record = attendance_repo.upsert(body)
    return jsonify(record.to_dict()), 200


@api_bp.route("/attendance/batch", methods=["POST"])
@jwt_required
@require_permission("edit_attendance")
def batch_upsert_attendance():
    data = request.get_json(force=True) or []
    if not isinstance(data, list):
        return jsonify({"error": "Expected a list of attendance records"}), 400
    
    try:
        items = [AttendanceUpsert.model_validate(item) for item in data]
        records = attendance_repo.upsert_batch(items)
        return jsonify([r.to_dict() for r in records]), 200
    except Exception as e:
        return jsonify({"error": str(e)}), 500
