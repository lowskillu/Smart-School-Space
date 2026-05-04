"""Grades endpoints."""
from __future__ import annotations

from flask import g, jsonify, request

from . import api_bp
from ..extensions import db
from ..core.security import jwt_required, require_permission
from ..models import Grade, Student, Assignment, TargetGrade
from ..schemas.grade import GradeCreate
import os
import requests


@api_bp.route("/grades", methods=["GET"])
@jwt_required
@require_permission("view_grades")
def list_grades():
    student_id = request.args.get("student_id")
    from ..services.grade_service import grade_service
    return jsonify(grade_service.list_grades(student_id))


@api_bp.route("/grades/class/<string:class_id>", methods=["GET"])
@jwt_required
def list_grades_by_class(class_id):
    """Get all grades for a class, optionally filtered by subject_id."""
    subject_id = request.args.get("subject_id")
    query = Grade.query.join(Student, Grade.student_id == Student.id).filter(Student.class_id == class_id)
    if subject_id:
        query = query.filter(Grade.subject_id == subject_id)
    return jsonify([g.to_dict() for g in query.all()])


@api_bp.route("/grades/assignment/<string:assignment_id>", methods=["GET"])
@jwt_required
def list_grades_by_assignment(assignment_id):
    """Get all grades for a specific assignment."""
    grades = Grade.query.filter_by(assignment_id=assignment_id).all()
    return jsonify([g.to_dict() for g in grades])


@api_bp.route("/grades", methods=["POST"])
@jwt_required
@require_permission("edit_grades")
def create_grade():
    body = GradeCreate.model_validate(request.get_json(force=True) or {})
    from ..services.grade_service import grade_service
    return jsonify(grade_service.create_grade(body)), 201


@api_bp.route("/grades/batch", methods=["POST"])
@jwt_required
@require_permission("edit_grades")
def batch_upsert_grades():
    """Upsert multiple grades at once (for grading an assignment for a whole class)."""
    data = request.get_json(force=True) or []
    if not isinstance(data, list):
        return jsonify({"error": "Expected a list of grade records"}), 400

    try:
        results = []
        for item in data:
            student_id = item.get("student_id")
            subject_id = item.get("subject_id")
            assignment_id = item.get("assignment_id")
            score = item.get("score")
            semester = item.get("semester", "2025-2026")
            comments = item.get("comments")

            if not student_id or score is None:
                continue

            # Find existing grade for this student + assignment
            existing = None
            if assignment_id:
                existing = Grade.query.filter_by(
                    student_id=student_id,
                    assignment_id=assignment_id,
                ).first()

            if existing:
                existing.score = score
                existing.comments = comments
                results.append(existing)
            else:
                new_grade = Grade(
                    student_id=student_id,
                    subject_id=subject_id,
                    assignment_id=assignment_id,
                    score=score,
                    semester=semester,
                    comments=comments,
                )
                db.session.add(new_grade)
                results.append(new_grade)

        db.session.commit()
        return jsonify([r.to_dict() for r in results]), 200
    except Exception as e:
        db.session.rollback()
        return jsonify({"error": str(e)}), 500


@api_bp.route("/grades/<string:grade_id>", methods=["PUT"])
@jwt_required
@require_permission("edit_grades")
def update_grade(grade_id):
    """Update a single grade."""
    grade = db.session.get(Grade, grade_id)
    if not grade:
        return jsonify({"error": "Grade not found"}), 404

    data = request.get_json(force=True) or {}
    if "score" in data:
        grade.score = data["score"]
    if "comments" in data:
        grade.comments = data["comments"]
    if "semester" in data:
        grade.semester = data["semester"]

    db.session.commit()
    return jsonify(grade.to_dict()), 200


@api_bp.route("/grades/summary", methods=["GET"])
@jwt_required
@require_permission("view_grades")
def grade_summary():
    student_id = request.args.get("student_id") or g.current_user_id
    year = request.args.get("year")
    from ..services.grade_service import grade_service
    return jsonify(grade_service.get_summary(student_id, year))


@api_bp.route("/grades/student/detailed", methods=["GET"])
@jwt_required
def student_detailed_grades():
    """Get all grades for the current student grouped by subject with assignment info."""
    from ..models import User, ScheduleEntry, Subject
    user = db.session.get(User, g.current_user_id)
    if not user or not user.student_id:
        return jsonify([])

    student = db.session.get(Student, user.student_id)
    if not student or not student.class_id:
        return jsonify([])

    # Find all subjects for this student's class
    subject_ids = db.session.query(ScheduleEntry.subject_id).filter(
        ScheduleEntry.class_id == student.class_id
    ).distinct().all()
    subject_ids = [s[0] for s in subject_ids if s[0]]

    result = []
    for sid in subject_ids:
        subj = db.session.get(Subject, sid)
        if not subj:
            continue

        assignments = Assignment.query.filter_by(
            class_id=student.class_id,
            subject_id=sid
        ).order_by(Assignment.due_date).all()

        assign_list = []
        for a in assignments:
            grade = Grade.query.filter_by(
                student_id=student.id,
                assignment_id=a.id
            ).first()
            assign_list.append({
                "id": a.id,
                "title": a.title,
                "type_of_work": a.type_of_work,
                "max_points": a.max_points,
                "weight": a.weight if hasattr(a, 'weight') else None,
                "score": grade.score if grade else None,
                "retakeable": a.retakeable if hasattr(a, 'retakeable') else None,
            })

        result.append({
            "subject_id": sid,
            "subject_name": subj.name,
            "assignments": assign_list,
        })

    return jsonify(result)

@api_bp.route("/grades/target", methods=["GET"])
@jwt_required
def get_target_grades():
    """Get target grades for current user."""
    from ..models import User
    user = db.session.get(User, g.current_user_id)
    if not user:
        return jsonify({})
    targets = TargetGrade.query.filter_by(student_id=user.id).all()
    return jsonify({t.subject_id: t.target_percentage for t in targets})

@api_bp.route("/grades/target", methods=["POST"])
@jwt_required
def save_target_grade():
    """Save target grade for a subject."""
    from ..models import User
    user = db.session.get(User, g.current_user_id)
    if not user:
        return jsonify({"error": "Unauthorized"}), 401
    
    data = request.get_json(force=True)
    subject_id = data.get("subject_id")
    target_percentage = data.get("target_percentage")
    
    if not subject_id or target_percentage is None:
        return jsonify({"error": "Missing data"}), 400
        
    target = TargetGrade.query.filter_by(student_id=user.id, subject_id=subject_id).first()
    if target:
        target.target_percentage = target_percentage
    else:
        target = TargetGrade(student_id=user.id, subject_id=subject_id, target_percentage=target_percentage)
        db.session.add(target)
        
    db.session.commit()
    return jsonify({"success": True})

@api_bp.route("/grades/target/analyze", methods=["POST"])
@jwt_required
def analyze_target_grades():
    """Send student's grades to OpenRouter AI and get advice."""
    data = request.get_json(force=True)
    subject_name = data.get("subject_name")
    target_pct = data.get("target_pct")
    current_pct = data.get("current_pct")
    assignments = data.get("assignments")
    question = data.get("question")
    
    api_key = os.environ.get("VITE_OPENROUTER_API_KEY")
    if not api_key:
        return jsonify({"error": "No AI API key"}), 500
        
    prompt = f"Я ученик. Моя цель по предмету '{subject_name}' - {target_pct}%. Сейчас у меня {current_pct:.1f}%. "
    prompt += f"Вот мои оценки:\n"
    for a in assignments:
        score_str = f"{a['score']}/{a['max_points']}" if a.get('score') is not None else "Нет оценки"
        retake_str = "Можно пересдать" if a.get('retakeable') else "Нельзя пересдать"
        prompt += f"- {a['title']} ({a['type_of_work']}): {score_str} ({retake_str})\n"
    
    if question:
        prompt += f"\nМой вопрос: {question}\n\nОтветь на мой вопрос с учетом моих оценок. Дай короткий, полезный и дружелюбный ответ на русском языке."
    else:
        prompt += "\nПроанализируй эти оценки и дай короткий совет (максимум 2-3 предложения) на русском языке о том, что мне нужно исправить или пересдать, чтобы достичь моей цели."
    
    try:
        response = requests.post(
            "https://openrouter.ai/api/v1/chat/completions",
            headers={
                "Authorization": f"Bearer {api_key}",
                "Content-Type": "application/json"
            },
            json={
                "model": "google/gemini-2.5-flash",
                "messages": [{"role": "user", "content": prompt}]
            },
            timeout=10
        )
        response.raise_for_status()
        reply = response.json()["choices"][0]["message"]["content"]
        return jsonify({"advice": reply})
    except Exception as e:
        return jsonify({"error": str(e)}), 500
