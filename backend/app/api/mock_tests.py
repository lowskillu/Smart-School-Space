from flask import Blueprint, jsonify, request, g
from ..extensions import db
from ..core.security import jwt_required, require_permission
from ..models import MockTest, MockTestQuestion, MockTestAttempt
from datetime import datetime
import json

api_bp = Blueprint("mock_tests", __name__)

@api_bp.route("/mock-tests", methods=["GET"])
@jwt_required
def list_mock_tests():
    """List all available mock tests."""
    tests = MockTest.query.all()
    return jsonify([t.to_dict() for t in tests])

@api_bp.route("/mock-tests/<string:id>", methods=["GET"])
@jwt_required
def get_mock_test(id):
    """Get a specific mock test with its questions (no correct answers for students)."""
    test = db.session.get(MockTest, id)
    if not test:
        return jsonify({"error": "Not found"}), 404
        
    data = test.to_dict()
    questions = []
    for q in test.questions:
        qd = q.to_dict()
        # Remove correct answer and explanation if not admin/teacher
        # For simplicity, we just remove them for the initial fetch 
        # Attempt submission will grade it on the server.
        qd.pop("correct_answer_index", None)
        qd.pop("explanation", None)
        questions.append(qd)
        
    data["questions"] = questions
    return jsonify(data)

@api_bp.route("/mock-tests/admin", methods=["POST"])
@jwt_required
@require_permission("manage_curriculum")
def create_mock_test():
    """Admin creates a new mock test."""
    data = request.get_json()
    test = MockTest(
        title=data.get("title"),
        exam_type=data.get("exam_type"),
        subject=data.get("subject"),
        duration_minutes=data.get("duration_minutes", 60),
        created_by=g.current_user_id
    )
    db.session.add(test)
    db.session.flush() # To get test.id
    
    for q_data in data.get("questions", []):
        q = MockTestQuestion(
            test_id=test.id,
            text=q_data.get("text"),
            options=q_data.get("options", []),
            correct_answer_index=q_data.get("correct_answer_index", 0),
            explanation=q_data.get("explanation", "")
        )
        db.session.add(q)
        
    db.session.commit()
    return jsonify(test.to_dict()), 201

@api_bp.route("/mock-tests/<string:test_id>/attempt", methods=["POST"])
@jwt_required
def start_attempt(test_id):
    """Student starts or resumes an attempt."""
    test = db.session.get(MockTest, test_id)
    if not test:
        return jsonify({"error": "Test not found"}), 404
        
    # Check if existing in_progress or paused attempt
    attempt = MockTestAttempt.query.filter_by(
        test_id=test_id, 
        student_id=g.current_user_id
    ).filter(MockTestAttempt.status.in_(["in_progress", "paused"])).first()
    
    if not attempt:
        attempt = MockTestAttempt(
            test_id=test_id,
            student_id=g.current_user_id,
            remaining_seconds=test.duration_minutes * 60,
            status="in_progress"
        )
        db.session.add(attempt)
        db.session.commit()
    elif attempt.status == "paused":
        attempt.status = "in_progress"
        db.session.commit()
        
    return jsonify(attempt.to_dict())

@api_bp.route("/mock-tests/attempt/<string:attempt_id>", methods=["PUT"])
@jwt_required
def update_attempt(attempt_id):
    """Save progress, pause, or submit the test."""
    attempt = db.session.get(MockTestAttempt, attempt_id)
    if not attempt or attempt.student_id != g.current_user_id:
        return jsonify({"error": "Not found"}), 404
        
    data = request.get_json()
    action = data.get("action", "save") # save, pause, submit
    answers = data.get("answers", attempt.answers)
    remaining_seconds = data.get("remaining_seconds", attempt.remaining_seconds)
    
    attempt.answers = answers
    attempt.remaining_seconds = remaining_seconds
    
    if action == "pause":
        attempt.status = "paused"
    elif action == "submit":
        attempt.status = "completed"
        attempt.end_time = datetime.utcnow()
        
        # Calculate score
        test = db.session.get(MockTest, attempt.test_id)
        correct_count = 0
        total_questions = len(test.questions)
        
        for q in test.questions:
            ans = answers.get(q.id)
            if ans is not None and int(ans) == q.correct_answer_index:
                correct_count += 1
                
        attempt.score = int((correct_count / total_questions) * 100) if total_questions > 0 else 0
        
    db.session.commit()
    return jsonify(attempt.to_dict())

@api_bp.route("/mock-tests/attempts", methods=["GET"])
@jwt_required
def list_attempts():
    """List student's attempts."""
    attempts = MockTestAttempt.query.filter_by(student_id=g.current_user_id).order_by(MockTestAttempt.start_time.desc()).all()
    
    results = []
    for a in attempts:
        ad = a.to_dict()
        test = db.session.get(MockTest, a.test_id)
        if test:
            ad["test_title"] = test.title
            ad["exam_type"] = test.exam_type
        results.append(ad)
        
    return jsonify(results)
