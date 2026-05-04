"""Assignments and Workload endpoints."""

import os
import uuid as _uuid_mod
from flask import jsonify, request, g, current_app
from datetime import datetime
from werkzeug.utils import secure_filename

from . import api_bp
from ..models import Assignment, ClassGroup, User, ScheduleEntry, TeacherWorkload, Subject
from ..extensions import db
from ..core.security import jwt_required, require_role
from ..core.errors import NotFoundError, ValidationError

ALLOWED_EXTENSIONS = {"pdf", "png", "jpg", "jpeg", "gif", "doc", "docx", "pptx", "xlsx", "zip", "txt"}

def _allowed(filename: str) -> bool:
    return "." in filename and filename.rsplit(".", 1)[1].lower() in ALLOWED_EXTENSIONS


@api_bp.route("/upload", methods=["POST"])
@jwt_required
def upload_file():
    """Upload a file and return its URL."""
    if "file" not in request.files:
        return jsonify({"error": "No file provided"}), 400
    f = request.files["file"]
    if not f.filename or not _allowed(f.filename):
        return jsonify({"error": "File type not allowed"}), 400
    ext = f.filename.rsplit(".", 1)[1].lower()
    unique_name = f"{_uuid_mod.uuid4().hex}.{ext}"
    dest = os.path.join(current_app.config["UPLOAD_FOLDER"], unique_name)
    f.save(dest)
    url = f"/uploads/{unique_name}"
    return jsonify({"url": url, "filename": secure_filename(f.filename)}), 201

WEIGHTS = {
    "Homework": 1,
    "FA": 2,
    "Quiz": 2,
    "SAU": 3,
    "SOCh": 4,
    "Group Project": 4,
    "Midterm / Final": 5
}

@api_bp.route("/assignments/classes", methods=["GET"])
@jwt_required
@require_role("teacher", "admin")
def get_teacher_classes():
    """Get classes and subjects taught by the current teacher."""
    user = db.session.get(User, g.current_user_id)
    if not user:
        raise NotFoundError("User", g.current_user_id)
    
    class_map = {}
    
    if user.role == "admin":
        classes = ClassGroup.query.all()
        subjects = Subject.query.all()
        for cg in classes:
            class_map[cg.id] = {
                "id": cg.id,
                "name": cg.name,
                "subjects": {
                    s.id: {
                        "id": s.id,
                        "name": s.name,
                        "days": [0,1,2,3,4,5,6]
                    } for s in subjects
                }
            }
    else:
        tid = user.teacher_id or user.id
        
        # Source 1: Schedule entries (primary — has day information)
        entries = ScheduleEntry.query.filter_by(teacher_id=tid).all()
        
        for e in entries:
            if e.class_id not in class_map:
                cg = ClassGroup.query.get(e.class_id)
                if not cg: continue
                class_map[e.class_id] = {
                    "id": cg.id,
                    "name": cg.name,
                    "subjects": {}
                }
            
            subj = e.subject
            if not subj: continue
            
            if e.subject_id not in class_map[e.class_id]["subjects"]:
                class_map[e.class_id]["subjects"][e.subject_id] = {
                    "id": subj.id,
                    "name": subj.name,
                    "days": []
                }
            
            if e.day not in class_map[e.class_id]["subjects"][e.subject_id]["days"]:
                class_map[e.class_id]["subjects"][e.subject_id]["days"].append(e.day)
        
        # Source 2: TeacherWorkload (fallback for classes not yet in schedule)
        workloads = TeacherWorkload.query.filter_by(teacher_id=tid).all()
        for w in workloads:
            if w.class_id not in class_map:
                cg = ClassGroup.query.get(w.class_id)
                if not cg: continue
                class_map[w.class_id] = {
                    "id": cg.id,
                    "name": cg.name,
                    "subjects": {}
                }
            
            subj = Subject.query.get(w.subject_id) if w.subject_id else None
            if not subj: continue
            
            if w.subject_id not in class_map[w.class_id]["subjects"]:
                class_map[w.class_id]["subjects"][w.subject_id] = {
                    "id": subj.id,
                    "name": subj.name,
                    "days": [0,1,2,3,4,5,6]
                }
        
    # Return as list
    result = []
    for cls in class_map.values():
        cls["subjects"] = list(cls["subjects"].values())
        result.append(cls)
        
    return jsonify(sorted(result, key=lambda x: x["name"]))


@api_bp.route("/assignments/workload/<string:class_id>", methods=["GET"])
@jwt_required
def get_class_workload(class_id):
    """Get total assignment weight per day for a specific class."""
    start_date = request.args.get("start_date")
    end_date = request.args.get("end_date")
    
    query = Assignment.query.filter_by(class_id=class_id)
    if start_date:
        query = query.filter(Assignment.due_date >= start_date)
    if end_date:
        query = query.filter(Assignment.due_date <= end_date)
        
    assignments = query.all()
    workload = {}
    for a in assignments:
        workload[a.due_date] = workload.get(a.due_date, 0) + a.weight
        
    return jsonify(workload)


@api_bp.route("/assignments", methods=["GET"])
@jwt_required
def list_assignments():
    """List all assignments with optional filtering."""
    teacher_id = request.args.get("teacher_id")
    class_id = request.args.get("class_id")
    
    query = Assignment.query
    if teacher_id:
        query = query.filter_by(teacher_id=teacher_id)
    if class_id:
        query = query.filter_by(class_id=class_id)
        
    assignments = query.order_by(Assignment.due_date.desc()).all()
    return jsonify([a.to_dict() for a in assignments])


@api_bp.route("/assignments", methods=["POST"])
@jwt_required
@require_role("teacher", "admin")
def create_assignment():
    """Create a new assignment."""
    data = request.get_json(force=True) or {}
    
    title = (data.get("title") or "").strip()
    type_of_work = data.get("type_of_work")
    class_id = data.get("class_id")
    subject_id = data.get("subject_id")
    due_date = data.get("due_date")
    max_points = data.get("max_points", 100.0)
    
    if not title:
        raise ValidationError("Title is required.")
    if not type_of_work or type_of_work not in WEIGHTS:
        raise ValidationError("Valid Type of work is required.")
    if not class_id:
        raise ValidationError("Class is required.")
    if not due_date:
        raise ValidationError("Due date is required.")
        
    user = db.session.get(User, g.current_user_id)
    
    assignment = Assignment(
        title=title,
        description=data.get("description"),
        type_of_work=type_of_work,
        weight=WEIGHTS[type_of_work],
        max_points=max_points,
        class_id=class_id,
        subject_id=subject_id,
        teacher_id=user.teacher_id or user.id,
        due_date=due_date,
        attachment_url=data.get("attachment_url"),
        retakeable=bool(data.get("retakeable", False))
    )
    
    db.session.add(assignment)
    db.session.commit()
    
    return jsonify(assignment.to_dict()), 201


@api_bp.route("/assignments/<string:assignment_id>", methods=["PUT"])
@jwt_required
@require_role("teacher", "admin")
def update_assignment(assignment_id):
    """Update an existing assignment."""
    assignment = db.session.get(Assignment, assignment_id)
    if not assignment:
        raise NotFoundError("Assignment", assignment_id)

    data = request.get_json(force=True) or {}

    if "title" in data:
        assignment.title = data["title"]
    if "description" in data:
        assignment.description = data["description"]
    if "type_of_work" in data and data["type_of_work"] in WEIGHTS:
        assignment.type_of_work = data["type_of_work"]
        assignment.weight = WEIGHTS[data["type_of_work"]]
    if "max_points" in data:
        assignment.max_points = data["max_points"]
    if "due_date" in data:
        assignment.due_date = data["due_date"]
    if "attachment_url" in data:
        assignment.attachment_url = data["attachment_url"]
    if "retakeable" in data:
        assignment.retakeable = bool(data["retakeable"])

    db.session.commit()
    return jsonify(assignment.to_dict()), 200


@api_bp.route("/assignments/<string:assignment_id>", methods=["DELETE"])
@jwt_required
@require_role("teacher", "admin")
def delete_assignment(assignment_id):
    """Delete an assignment and all its associated grades."""
    from ..models import Grade
    assignment = db.session.get(Assignment, assignment_id)
    if not assignment:
        raise NotFoundError("Assignment", assignment_id)

    # Cascade-delete grades for this assignment
    Grade.query.filter_by(assignment_id=assignment_id).delete()
    db.session.delete(assignment)
    db.session.commit()
    return jsonify({"message": "Assignment deleted"}), 200
