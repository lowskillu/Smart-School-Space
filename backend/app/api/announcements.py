from flask import jsonify, request, g
from flask_jwt_extended import get_jwt_identity

from . import api_bp
from ..extensions import db
from ..models import Announcement, User
from ..core.security import jwt_required, admin_required, require_role

@api_bp.route("/announcements", methods=["GET"])
@jwt_required
def get_announcements():
    class_id = request.args.get("class_id")
    user = db.session.get(User, g.current_user_id)
    role = user.role if user else "student"
    
    query = Announcement.query
    
    if class_id:
        query = query.filter((Announcement.class_id == class_id) | (Announcement.is_global == True))
    else:
        query = query.filter(Announcement.is_global == True)
    
    # Filter by audience based on user role
    if role == "student":
        query = query.filter(Announcement.audience.in_(["all", "students"]))
    elif role == "teacher":
        query = query.filter(Announcement.audience.in_(["all", "staff", "teachers"]))
    elif role in ("admin", "curator", "counselor"):
        pass  # Admins see everything
        
    announcements = query.order_by(Announcement.created_at.desc()).all()
    return jsonify([a.to_dict() for a in announcements]), 200

@api_bp.route("/announcements", methods=["POST"])
@jwt_required
@require_role("teacher", "admin", "curator")
def create_announcement():
    data = request.get_json() or {}
    user_id = get_jwt_identity()
    
    title = data.get("title")
    content = data.get("content")
    class_id = data.get("class_id")
    is_global = data.get("is_global", True)
    color = data.get("color")
    audience = data.get("audience", "all")
    
    if not title or not content:
        return jsonify({"message": "Title and content are required"}), 400
    
    if audience not in ("all", "staff", "teachers", "admins", "students"):
        audience = "all"
        
    announcement = Announcement(
        title=title,
        content=content,
        author_id=user_id,
        class_id=class_id,
        is_global=is_global,
        color=color,
        audience=audience
    )
    
    db.session.add(announcement)
    db.session.commit()
    
    return jsonify(announcement.to_dict()), 201
