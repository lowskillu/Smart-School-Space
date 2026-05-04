"""UniPrep endpoints — extracurriculars, honors, exam registrations, test results."""
from __future__ import annotations

from flask import g, jsonify, request

import os
import json
import requests
from . import api_bp
from ..extensions import db
from ..models import UniversityApplication, UniPrepEssay, RecommendationRequest
from ..core.security import jwt_required
from ..schemas.uni_prep import (
    ExtracurricularCreate,
    ExamRegistrationCreate,
    HonorCreate,
    TestResultCreate,
)
from ..services.uni_prep_service import uni_prep_service


def _student_id() -> str:
    """Return student_id from query param or fall back to current user id."""
    return request.args.get("student_id") or g.current_user_id


# ─── Extracurriculars ────────────────────────────────────────────────────────

@api_bp.route("/uni-prep/extracurriculars", methods=["GET"])
@jwt_required
def list_extracurriculars():
    return jsonify(uni_prep_service.get_extracurriculars(_student_id()))


@api_bp.route("/uni-prep/extracurriculars", methods=["POST"])
@jwt_required
def create_extracurricular():
    body = ExtracurricularCreate.model_validate(request.get_json(force=True) or {})
    return jsonify(uni_prep_service.add_extracurricular(g.current_user_id, body)), 201


@api_bp.route("/uni-prep/extracurriculars/<string:id>", methods=["DELETE"])
@jwt_required
def delete_extracurricular(id: str):
    uni_prep_service.delete_extracurricular(id, g.current_user_id)
    return "", 204


# ─── Honors ─────────────────────────────────────────────────────────────────

@api_bp.route("/uni-prep/honors", methods=["GET"])
@jwt_required
def list_honors():
    return jsonify(uni_prep_service.get_honors(_student_id()))


@api_bp.route("/uni-prep/honors", methods=["POST"])
@jwt_required
def create_honor():
    body = HonorCreate.model_validate(request.get_json(force=True) or {})
    return jsonify(uni_prep_service.add_honor(g.current_user_id, body)), 201


@api_bp.route("/uni-prep/honors/<string:id>", methods=["DELETE"])
@jwt_required
def delete_honor(id: str):
    uni_prep_service.delete_honor(id, g.current_user_id)
    return "", 204


# ─── Exam Registrations ──────────────────────────────────────────────────────

@api_bp.route("/uni-prep/exam-registrations", methods=["GET"])
@jwt_required
def list_exam_registrations():
    return jsonify(uni_prep_service.get_exam_registrations(_student_id()))


@api_bp.route("/uni-prep/exam-registrations", methods=["POST"])
@jwt_required
def create_exam_registration():
    body = ExamRegistrationCreate.model_validate(request.get_json(force=True) or {})
    return jsonify(uni_prep_service.add_exam_registration(g.current_user_id, body)), 201


@api_bp.route("/uni-prep/exam-registrations/<string:id>", methods=["DELETE"])
@jwt_required
def delete_exam_registration(id: str):
    uni_prep_service.delete_exam_registration(id, g.current_user_id)
    return "", 204


# ─── Test Results ────────────────────────────────────────────────────────────

@api_bp.route("/uni-prep/test-results", methods=["GET"])
@jwt_required
def list_test_results():
    exam_type = request.args.get("exam_type")
    return jsonify(uni_prep_service.get_test_results(_student_id(), exam_type))


@api_bp.route("/uni-prep/test-results", methods=["POST"])
@jwt_required
def create_test_result():
    body = TestResultCreate.model_validate(request.get_json(force=True) or {})
    return jsonify(uni_prep_service.add_test_result(g.current_user_id, body)), 201


@api_bp.route("/uni-prep/test-results/<string:id>", methods=["DELETE"])
@jwt_required
def delete_test_result(id: str):
    uni_prep_service.delete_test_result(id, g.current_user_id)
    return "", 204


# ─── University Applications ──────────────────────────────────────────────────

@api_bp.route("/uni-prep/colleges", methods=["GET"])
@jwt_required
def list_college_applications():
    student_id = _student_id()
    apps = UniversityApplication.query.filter_by(student_id=student_id).all()
    return jsonify([a.to_dict() for a in apps])


@api_bp.route("/uni-prep/colleges", methods=["POST"])
@jwt_required
def create_college_application():
    data = request.get_json(force=True) or {}
    app = UniversityApplication(
        student_id=g.current_user_id,
        name=data.get("name"),
        country=data.get("country"),
        acceptance_rate=data.get("acceptanceRate"),
        global_rank=data.get("globalRank"),
        sat_avg=data.get("sat"),
        alevel_req=data.get("alevel"),
        ib_req=data.get("ib"),
        ielts_req=data.get("ielts"),
        tuition_fee=data.get("cost"),
        financial_aid=data.get("financialAid", False),
        deadline=data.get("regularDecision"),
        status=data.get("status", "Draft")
    )
    db.session.add(app)
    db.session.commit()
    return jsonify(app.to_dict()), 201


@api_bp.route("/uni-prep/colleges/<string:id>", methods=["DELETE"])
@jwt_required
def delete_college_application(id: str):
    obj = UniversityApplication.query.filter_by(id=id, student_id=g.current_user_id).first()
    if obj:
        db.session.delete(obj)
        db.session.commit()
    return "", 204

# ─── Essays ──────────────────────────────────────────────────────────────────

@api_bp.route("/uni-prep/essays", methods=["GET"])
@jwt_required
def list_essays():
    student_id = _student_id()
    essays = UniPrepEssay.query.filter_by(student_id=student_id).all()
    return jsonify([e.to_dict() for e in essays])

@api_bp.route("/uni-prep/essays", methods=["POST"])
@jwt_required
def create_essay():
    data = request.get_json(force=True) or {}
    essay = UniPrepEssay(
        student_id=g.current_user_id,
        title=data.get("title", "Untitled Essay"),
        topic=data.get("topic"),
        content=data.get("content", ""),
        status=data.get("status", "Not Started")
    )
    db.session.add(essay)
    db.session.commit()
    return jsonify(essay.to_dict()), 201

@api_bp.route("/uni-prep/essays/<string:id>", methods=["PUT"])
@jwt_required
def update_essay(id: str):
    essay = UniPrepEssay.query.filter_by(id=id, student_id=g.current_user_id).first()
    if not essay:
        return jsonify({"error": "Not found"}), 404
        
    data = request.get_json(force=True) or {}
    if "title" in data: essay.title = data["title"]
    if "topic" in data: essay.topic = data["topic"]
    if "content" in data: essay.content = data["content"]
    if "status" in data: essay.status = data["status"]
    
    db.session.commit()
    return jsonify(essay.to_dict())

@api_bp.route("/uni-prep/essays/<string:id>/analyze", methods=["POST"])
@jwt_required
def analyze_essay(id: str):
    essay = UniPrepEssay.query.filter_by(id=id, student_id=g.current_user_id).first()
    if not essay or not essay.content:
        return jsonify({"error": "Empty or not found"}), 404
        
    api_key = os.environ.get("VITE_OPENROUTER_API_KEY")
    if not api_key:
        return jsonify({"error": "No AI API key"}), 500
        
    prompt = f"Please review the following university application essay. Provide brief, actionable feedback on structure, grammar, and impact in Russian.\n\nEssay:\n{essay.content}"
    
    try:
        response = requests.post(
            "https://openrouter.ai/api/v1/chat/completions",
            headers={"Authorization": f"Bearer {api_key}", "Content-Type": "application/json"},
            json={"model": "google/gemini-2.5-flash", "messages": [{"role": "user", "content": prompt}]},
            timeout=15
        )
        response.raise_for_status()
        reply = response.json()["choices"][0]["message"]["content"]
        return jsonify({"feedback": reply})
    except Exception as e:
        return jsonify({"error": str(e)}), 500

@api_bp.route("/uni-prep/essays/<string:id>", methods=["DELETE"])
@jwt_required
def delete_essay(id: str):
    essay = UniPrepEssay.query.filter_by(id=id, student_id=g.current_user_id).first()
    if essay:
        db.session.delete(essay)
        db.session.commit()
    return "", 204

# ─── Recommendations ─────────────────────────────────────────────────────────

@api_bp.route("/uni-prep/recommendations", methods=["GET"])
@jwt_required
def list_student_recommendations():
    reqs = RecommendationRequest.query.filter_by(student_id=g.current_user_id).all()
    return jsonify([r.to_dict() for r in reqs])

@api_bp.route("/uni-prep/recommendations", methods=["POST"])
@jwt_required
def create_recommendation_request():
    data = request.get_json(force=True) or {}
    req = RecommendationRequest(
        student_id=g.current_user_id,
        teacher_id=data.get("teacher_id"),
        major=data.get("major"),
        deadline=data.get("deadline"), # Expected ISO string
        status="pending"
    )
    db.session.add(req)
    db.session.commit()
    return jsonify(req.to_dict()), 201

@api_bp.route("/uni-prep/recommendations/teacher", methods=["GET"])
@jwt_required
def list_teacher_recommendations():
    reqs = RecommendationRequest.query.filter_by(teacher_id=g.current_user_id).all()
    return jsonify([r.to_dict() for r in reqs])

@api_bp.route("/uni-prep/recommendations/<string:id>", methods=["PUT"])
@jwt_required
def update_recommendation(id: str):
    req = RecommendationRequest.query.filter_by(id=id).first()
    if not req or req.teacher_id != g.current_user_id:
        return jsonify({"error": "Not found or unauthorized"}), 404
        
    data = request.get_json(force=True) or {}
    if "status" in data: req.status = data["status"]
    if "content" in data: req.content = data["content"]
    if "feedback" in data: req.feedback = data["feedback"]
    
    db.session.commit()
    return jsonify(req.to_dict())


@api_bp.route("/parse-university", methods=["GET"])
@jwt_required
def parse_university_ai():
    """Parses university requirements using Gemini AI via OpenRouter."""
    api_key = os.environ.get("VITE_OPENROUTER_API_KEY")
    model_name = os.environ.get("VITE_AI_MODEL", "google/gemini-3-flash-preview")

    if not api_key:
        return jsonify({"error": "VITE_OPENROUTER_API_KEY is not configured"}), 500
        
    name = request.args.get("name", "Harvard")
    
    prompt = f"""
    Find and return detailed admission requirements for {name}. 
    Return strictly JSON object in this format:
    {{
        "name": "Full name",
        "country": "Country",
        "acceptance_rate": 0.0,
        "global_rank": 0,
        "sat_req": 0,
        "alevel_req": "string",
        "ib_req": 0,
        "ielts_req": 0.0,
        "tuition_fee": 0,
        "financial_aid": true/false,
        "regular_decision": "Month Day"
    }}
    """
    
    try:
        response = requests.post(
            "https://openrouter.ai/api/v1/chat/completions",
            headers={
                "Authorization": f"Bearer {api_key}",
                "Content-Type": "application/json",
                "HTTP-Referer": "https://smart-school-space.ai",
                "X-Title": "Smart School Space",
            },
            json={
                "model": model_name,
                "messages": [{"role": "user", "content": prompt}],
                "response_format": {"type": "json_object"}
            },
            timeout=30
        )
        response.raise_for_status()
        resp_json = response.json()
        content = resp_json["choices"][0]["message"]["content"]
        data = json.loads(content)
        return jsonify({"status": "success", "data": data})
    except Exception as e:
        return jsonify({"status": "error", "message": str(e)}), 500
