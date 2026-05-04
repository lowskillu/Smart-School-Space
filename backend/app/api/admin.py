"""Admin endpoints — student management (CRUD).

All routes require the 'admin' role via @require_role.
Business logic kept minimal here; heavy lifting would move to AdminService.
"""
from __future__ import annotations

import uuid

from flask import jsonify, request
from werkzeug.security import generate_password_hash

from . import api_bp
from ..core.errors import NotFoundError, ValidationError
from ..core.security import jwt_required, require_role
from ..extensions import db
from ..models import Role, Student, User, Permission, RolePermission
from ..schemas.auth import CreateStudentRequest, UpdateStudentRequest


def _gen_student_id(grad_year: str) -> str:
    return f"{str(uuid.uuid4())[:31]}-{grad_year}"


@api_bp.route("/admin/students", methods=["GET"])
@jwt_required
@require_role("admin")
def admin_get_students():
    """Return all students by checking both Student model and Users with student role."""
    student_role = Role.query.filter(Role.name.ilike("student")).first()
    if not student_role:
        return jsonify([]), 200
        
    # Get all users with student role
    student_users = User.query.filter_by(role_id=student_role.id).all()
    
    # Map student_id to user
    user_map = {u.student_id: u for u in student_users if u.student_id}
    users_without_sid = [u for u in student_users if not u.student_id]
    
    # Get all records from Student table
    all_student_records = Student.query.all()
    student_record_map = {s.id: s for s in all_student_records}
    
    result = []
    
    # Process all student records
    for s_id, s in student_record_map.items():
        user = user_map.get(s_id)
        result.append({
            "user_id": user.id if user else None,
            "student_id": s.id,
            "name": user.name if user else s.name,
            "email": user.email if user else s.email,
            "class_id": s.class_id,
        })
        
    # Process users with student role but no student_id link yet
    # This shouldn't happen normally, but let's handle it for robustness
    for u in users_without_sid:
        result.append({
            "user_id": u.id,
            "student_id": None,
            "name": u.name,
            "email": u.email,
            "class_id": None,
        })
        
    return jsonify(result), 200


@api_bp.route("/admin/students", methods=["POST"])
@jwt_required
@require_role("admin")
def admin_create_student():
    body = CreateStudentRequest.model_validate(request.get_json(force=True) or {})

    student_id = _gen_student_id(body.graduation_year)
    student = Student(
        id=student_id,
        name=body.name,
        email=body.login,
        class_id=body.class_id,
    )
    db.session.add(student)

    student_role = Role.query.filter_by(name="student").first()
    user = User(
        name=body.name,
        email=body.login,
        password_hash=generate_password_hash(body.password),
        student_id=student_id,
        role_id=student_role.id if student_role else None,
    )
    db.session.add(user)
    db.session.commit()

    return jsonify({
        "message": "Student created successfully.",
        "user_id": user.id,
        "student_id": student.id,
    }), 201


@api_bp.route("/admin/students/<string:user_id>", methods=["PUT", "PATCH"])
@jwt_required
@require_role("admin")
def admin_update_student(user_id: str):
    """Update student profile or create if missing for student-role users."""
    user = db.session.get(User, user_id)
    if not user:
        raise NotFoundError("User", user_id)

    # Check if this user is actually a student (by role)
    student_role = Role.query.filter(Role.name.ilike("student")).first()
    is_student_by_role = user.role_id == (student_role.id if student_role else None)
    
    if not is_student_by_role and not user.student_id:
        raise ValidationError("This user is not configured as a student.")

    student = None
    if user.student_id:
        student = db.session.get(Student, user.student_id)
    
    if not student:
        # Create student profile on the fly if user has student role
        student = Student(
            name=user.name,
            email=user.email
        )
        db.session.add(student)
        db.session.flush()
        user.student_id = student.id
        db.session.add(user)

    data = request.get_json(force=True) or {}
    
    if "name" in data:
        user.name = data["name"]
        student.name = data["name"]
    if "login" in data:
        user.email = data["login"]
        student.email = data["login"]
    if "password" in data and data["password"]:
        user.password_hash = generate_password_hash(data["password"])
    if "class_id" in data:
        student.class_id = data["class_id"]
    db.session.commit()
    return jsonify(student.to_dict()), 200


@api_bp.route("/admin/students/<string:user_id>", methods=["DELETE"])
@jwt_required
@require_role("admin")
def admin_delete_student(user_id: str):
    user = db.session.get(User, user_id)
    if not user:
        raise NotFoundError("User", user_id)
    db.session.delete(user)
    db.session.commit()
    return "", 204


@api_bp.route("/admin/users", methods=["GET"])
@jwt_required
@require_role("admin")
def admin_get_users():
    users = User.query.all()
    return jsonify([u.to_dict() for u in users]), 200


@api_bp.route("/admin/users", methods=["POST"])
@jwt_required
@require_role("admin")
def admin_create_user():
    data = request.get_json(force=True) or {}
    name = data.get("name")
    email = data.get("email")
    password = data.get("password") or "SmartSchool123!"
    role_id = data.get("role_id")
    
    if not name or not email or not role_id:
        raise ValidationError("Name, email and role_id are required.")
        
    if User.query.filter_by(email=email).first():
        raise ValidationError(f"User with email {email} already exists.")
        
    user = User(
        name=name,
        email=email,
        password_hash=generate_password_hash(password),
        role_id=role_id
    )
    db.session.add(user)
    db.session.commit()
    return jsonify(user.to_dict()), 201


@api_bp.route("/admin/users/<string:user_id>", methods=["PUT"])
@jwt_required
@require_role("admin")
def admin_update_user(user_id: str):
    user = db.session.get(User, user_id)
    if not user:
        raise NotFoundError("User", user_id)
    
    data = request.get_json(force=True) or {}
    if "name" in data:
        user.name = data["name"]
    if "role_id" in data:
        user.role_id = data["role_id"]
    if "password" in data and data["password"]:
        user.password_hash = generate_password_hash(data["password"])
        
    db.session.commit()
    return jsonify(user.to_dict()), 200


@api_bp.route("/admin/users/<string:user_id>", methods=["DELETE"])
@jwt_required
@require_role("admin")
def admin_delete_user(user_id: str):
    user = db.session.get(User, user_id)
    if not user:
        raise NotFoundError("User", user_id)
    
    # If user is a student, we might want to handle student record
    # For now, just delete the user (orphans student record if SET NULL is configured)
    db.session.delete(user)
    db.session.commit()
    return "", 204


@api_bp.route("/admin/roles", methods=["GET"])
@jwt_required
@require_role("admin")
def admin_get_roles():
    roles = Role.query.all()
    return jsonify([r.to_dict() for r in roles]), 200


@api_bp.route("/admin/permissions", methods=["GET"])
@jwt_required
@require_role("admin")
def admin_get_permissions():
    perms = Permission.query.all()
    return jsonify([p.to_dict() for p in perms]), 200


@api_bp.route("/admin/roles/<string:role_id>/permissions", methods=["POST"])
@jwt_required
@require_role("admin")
def admin_update_role_permissions(role_id: str):
    role = db.session.get(Role, role_id)
    if not role:
        raise NotFoundError("Role", role_id)
        
    data = request.get_json(force=True) or {}
    permission_codes = data.get("permissions", []) # List of codes
    
    # Remove existing
    RolePermission.query.filter_by(role_id=role.id).delete()
    
    # Add new
    for code in permission_codes:
        perm = Permission.query.filter_by(code=code).first()
        if perm:
            rp = RolePermission(role_id=role.id, permission_id=perm.id)
            db.session.add(rp)
            
    db.session.commit()
    return jsonify({"message": "Role permissions updated successfully.", "permissions": [p.permission.code for p in role.permissions]}), 200


# ──────────────────────────── School Settings ─────────────────────

@api_bp.route("/admin/settings", methods=["GET"])
@jwt_required
@require_role("admin")
def admin_get_settings():
    from ..models import SchoolSetting
    settings = SchoolSetting.query.all()
    return jsonify({s.key: s.value for s in settings}), 200


@api_bp.route("/admin/settings", methods=["POST"])
@jwt_required
@require_role("admin")
def admin_update_settings():
    from ..models import SchoolSetting
    data = request.get_json(force=True) or {}
    
    for key, value in data.items():
        setting = SchoolSetting.query.filter_by(key=key).first()
        if setting:
            setting.value = str(value)
        else:
            setting = SchoolSetting(key=key, value=str(value))
            db.session.add(setting)
            
    db.session.commit()
    return jsonify({"message": "Settings updated successfully."}), 200
