from flask import jsonify, request, g
from . import api_bp
from ..models import User, Course, CourseTargetClass, CourseSchedule, CourseEnrollment, Student, CourseCancellation, Chat, ChatMember, Message
from ..extensions import db
from ..core.security import jwt_required, require_role, get_current_user_id
from ..core.errors import ValidationError, NotFoundError
from datetime import datetime, timedelta
import json

@api_bp.route("/courses", methods=["GET"])
@jwt_required
def list_courses():
    user_id = get_current_user_id()
    
    # Filters
    teacher_id = request.args.get("teacher_id")
    class_id = request.args.get("class_id")
    
    query = Course.query.filter_by(is_active=True)
    
    # Filter by user role/class if student
    user = User.query.get(user_id)
    if user and user.role and user.role.name == 'student':
        student = db.session.get(Student, user.student_id) if user.student_id else None
        class_id = student.class_id if student else None
        
        if class_id:
            # Show courses for student's class OR global courses
            query = query.filter(
                db.or_(
                    Course.target_classes.any(CourseTargetClass.class_id == class_id),
                    ~Course.target_classes.any()
                )
            )
        else:
            # If student has no class, only show global courses
            query = query.filter(~Course.target_classes.any())

    if teacher_id:
        query = query.filter_by(teacher_id=teacher_id)
    
    if class_id:
        query = query.join(CourseTargetClass).filter(CourseTargetClass.class_id == class_id)
        
    courses = query.order_by(Course.created_at.desc()).all()
    
    result = []
    for c in courses:
        d = c.to_dict()
        # Check if current user is enrolled
        is_enrolled = CourseEnrollment.query.filter_by(course_id=c.id, student_id=user_id).first() is not None
        d["is_enrolled"] = is_enrolled
        result.append(d)
        
    return jsonify(result), 200

@api_bp.route("/courses", methods=["POST"])
@jwt_required
@require_role("teacher", "admin")
def create_course():
    user_id = get_current_user_id()
    data = request.get_json(force=True) or {}
    
    title = data.get("title")
    if not title:
        raise ValidationError("Title is required.")

    new_course = Course(
        title=title,
        description=data.get("description"),
        teacher_id=user_id,
        enrollment_limit=data.get("enrollment_limit", 20),
        category=data.get("category", "academic")
    )
    db.session.add(new_course)
    db.session.flush()

    # Add target classes
    target_class_ids = data.get("target_class_ids", [])
    for cid in target_class_ids:
        db.session.add(CourseTargetClass(course_id=new_course.id, class_id=cid))

    # Add schedules
    schedules_data = data.get("schedules", [])
    for s in schedules_data:
        sched = CourseSchedule(
            course_id=new_course.id,
            day_of_week=s.get("day_of_week"),
            start_time=s.get("start_time"),
            end_time=s.get("end_time"),
            start_date=datetime.fromisoformat(s.get("start_date")).date() if s.get("start_date") else datetime.utcnow().date(),
            end_date=datetime.fromisoformat(s.get("end_date")).date() if s.get("end_date") else None
        )
        db.session.add(sched)

    db.session.commit()
    return jsonify(new_course.to_dict()), 201

@api_bp.route("/courses/<string:course_id>/enroll", methods=["POST"])
@jwt_required
def enroll_course(course_id):
    user_id = get_current_user_id()
    user = User.query.get(user_id)
    course = db.session.get(Course, course_id)
    if not course:
        raise NotFoundError("Course", course_id)

    if not course.is_active:
        raise ValidationError("Course is not active.")

    # Check limit
    enrollment_count = CourseEnrollment.query.filter_by(course_id=course_id).count()
    if enrollment_count >= course.enrollment_limit:
        raise ValidationError("Enrollment limit reached.")

    # Check if already enrolled
    existing = CourseEnrollment.query.filter_by(course_id=course_id, student_id=user_id).first()
    if existing:
        return jsonify(existing.to_dict() if hasattr(existing, 'to_dict') else {"id": existing.id}), 200

    # Strict Eligibility Check: Check if student belongs to a target class
    if user.role and user.role.name == 'student':
        student = db.session.get(Student, user.student_id) if user.student_id else None
        target_classes = CourseTargetClass.query.filter_by(course_id=course_id).all()
        if target_classes:
            target_class_ids = [tc.class_id for tc in target_classes]
            if not student or student.class_id not in target_class_ids:
                raise ValidationError(f"Your class is not eligible for this course. Targeted: {target_class_ids}, Yours: {student.class_id if student else 'None'}")

    data = request.get_json(force=True) or {}
    new_enrollment = CourseEnrollment(
        course_id=course_id, 
        student_id=user_id,
        enrollment_type=data.get("enrollment_type", "full")
    )

    # Calculate expires_at
    if new_enrollment.enrollment_type == "day":
        new_enrollment.expires_at = datetime.utcnow() + timedelta(days=1)
    elif new_enrollment.enrollment_type == "week":
        new_enrollment.expires_at = datetime.utcnow() + timedelta(weeks=1)
    elif new_enrollment.enrollment_type == "month":
        new_enrollment.expires_at = datetime.utcnow() + timedelta(days=30)

    db.session.add(new_enrollment)
    db.session.commit()
    
    return jsonify({
        "id": new_enrollment.id, 
        "course_id": course_id, 
        "student_id": user_id,
        "enrollment_type": new_enrollment.enrollment_type,
        "expires_at": new_enrollment.expires_at.isoformat() if new_enrollment.expires_at else None
    }), 201

@api_bp.route("/courses/<string:course_id>/cancel-sessions", methods=["POST"])
@jwt_required
def cancel_course_sessions(course_id):
    user_id = get_current_user_id()
    course = db.session.get(Course, course_id)
    if not course:
        raise NotFoundError("Course", course_id)
    
    user = User.query.get(user_id)
    if course.teacher_id != user_id and user.role.name != "admin":
        raise ValidationError("Only the teacher or an admin can cancel sessions.")

    data = request.get_json()
    start_date = datetime.fromisoformat(data["start_date"]).date()
    end_date = datetime.fromisoformat(data["end_date"]).date()
    reason = data.get("reason", "")

    cancellation = CourseCancellation(
        course_id=course_id,
        start_date=start_date,
        end_date=end_date,
        reason=reason
    )
    db.session.add(cancellation)
    db.session.commit()

    # Send notifications to enrolled students via chat
    enrollments = CourseEnrollment.query.filter_by(course_id=course_id).all()
    for e in enrollments:
        if e.student_id == user_id: continue # Don't notify self (if teacher is enrolled)
        
        # Find or create private chat between teacher/admin and student
        chat = Chat.query.join(ChatMember).filter(Chat.is_group == False).filter(Chat.id.in_(
            db.session.query(ChatMember.chat_id).filter_by(user_id=user_id)
        )).filter(Chat.id.in_(
            db.session.query(ChatMember.chat_id).filter_by(user_id=e.student_id)
        )).first()

        if not chat:
            chat = Chat(is_group=False)
            db.session.add(chat)
            db.session.flush()
            db.session.add(ChatMember(chat_id=chat.id, user_id=user_id))
            db.session.add(ChatMember(chat_id=chat.id, user_id=e.student_id))
            db.session.flush()
        
        msg_content = f"🚫 **{course.title}**: Sessions cancelled from **{start_date}** to **{end_date}**.\n\nReason: {reason if reason else 'Not specified'}"
        
        db.session.add(Message(
            chat_id=chat.id,
            sender_id=user_id,
            content=msg_content
        ))
    
    db.session.commit()

    return jsonify(cancellation.to_dict()), 201

@api_bp.route("/courses/<string:course_id>/unenroll", methods=["POST"])
@jwt_required
def unenroll_course(course_id):
    user_id = get_current_user_id()
    enrollment = CourseEnrollment.query.filter_by(course_id=course_id, student_id=user_id).first()
    
    if not enrollment:
        raise NotFoundError("Enrollment", f"Course {course_id}")
        
    db.session.delete(enrollment)
    db.session.commit()
    return "", 204

@api_bp.route("/courses/<string:course_id>/enrollments", methods=["GET"])
@jwt_required
@require_role("teacher", "admin")
def list_enrollments(course_id):
    course = db.session.get(Course, course_id)
    if not course:
        raise NotFoundError("Course", course_id)
    
    user_id = get_current_user_id()
    user = User.query.get(user_id)
    if course.teacher_id != user_id and user.role.name != "admin":
        raise ValidationError("Only the assigned teacher or an admin can view the enrollment list.")

    enrollments = CourseEnrollment.query.filter_by(course_id=course_id).all()
    result = []
    for e in enrollments:
        student_user = User.query.get(e.student_id)
        result.append({
            "id": e.id,
            "student_id": e.student_id,
            "student_name": student_user.name if student_user else "Unknown student",
            "enrolled_at": e.enrolled_at.isoformat()
        })
    return jsonify(result), 200

@api_bp.route("/courses/<string:course_id>", methods=["PUT"])
@jwt_required
def update_course(course_id):
    user_id = get_current_user_id()
    course = db.session.get(Course, course_id)
    if not course:
        raise NotFoundError("Course", course_id)
    
    user = User.query.get(user_id)
    if course.teacher_id != user_id and user.role.name != "admin":
        raise ValidationError("Only the teacher or an admin can update this course.")
    
    data = request.get_json(force=True) or {}
    
    # Update basic info
    if "title" in data:
        course.title = data["title"]
    if "description" in data:
        course.description = data["description"]
    if "enrollment_limit" in data:
        course.enrollment_limit = data["enrollment_limit"]
    if "category" in data:
        course.category = data["category"]
    if "is_active" in data:
        course.is_active = data["is_active"]

    # Update target classes (replace existing)
    if "target_class_ids" in data:
        CourseTargetClass.query.filter_by(course_id=course.id).delete()
        for cid in data["target_class_ids"]:
            db.session.add(CourseTargetClass(course_id=course.id, class_id=cid))

    # Update schedules (replace existing)
    if "schedules" in data:
        CourseSchedule.query.filter_by(course_id=course.id).delete()
        schedules_data = data["schedules"]
        for s in schedules_data:
            sched = CourseSchedule(
                course_id=course.id,
                day_of_week=s.get("day_of_week"),
                start_time=s.get("start_time"),
                end_time=s.get("end_time"),
                start_date=datetime.fromisoformat(s.get("start_date")).date() if s.get("start_date") else datetime.utcnow().date(),
                end_date=datetime.fromisoformat(s.get("end_date")).date() if s.get("end_date") else None
            )
            db.session.add(sched)

    db.session.commit()
    return jsonify(course.to_dict()), 200

@api_bp.route("/courses/<string:course_id>", methods=["DELETE"])
@jwt_required
def delete_course(course_id):
    user_id = get_current_user_id()
    course = db.session.get(Course, course_id)
    if not course:
        raise NotFoundError("Course", course_id)
    
    user = User.query.get(user_id)
    if course.teacher_id != user_id and user.role.name != "admin":
        raise ValidationError("Only the teacher or an admin can delete this course.")
            
    db.session.delete(course)
    db.session.commit()
    return jsonify({"message": "Course deleted successfully"}), 200

@api_bp.route("/courses/<string:course_id>/enrollments/<string:user_id>", methods=["DELETE"])
@jwt_required
def kick_student(course_id, user_id):
    current_user_id = get_current_user_id()
    course = db.session.get(Course, course_id)
    if not course:
        raise NotFoundError("Course", course_id)
    
    current_user = User.query.get(current_user_id)
    if course.teacher_id != current_user_id and current_user.role.name != "admin":
        raise ValidationError("Only the teacher or an admin can kick students from this course.")
    
    enrollment = CourseEnrollment.query.filter_by(course_id=course_id, student_id=user_id).first()
    if not enrollment:
        raise NotFoundError("Enrollment", f"Course: {course_id}, User: {user_id}")
    
    # Send notification before deleting
    student_user = User.query.get(user_id)
    if student_user:
        try:
            # Look for existing private chat
            chat = Chat.query.join(ChatMember).filter(
                Chat.is_group == False,
                ChatMember.user_id == current_user_id
            ).filter(
                Chat.id.in_(
                    db.session.query(ChatMember.chat_id).filter(ChatMember.user_id == user_id)
                )
            ).first()
            
            if not chat:
                chat = Chat(is_group=False)
                db.session.add(chat)
                db.session.flush()
                db.session.add(ChatMember(chat_id=chat.id, user_id=current_user_id))
                db.session.add(ChatMember(chat_id=chat.id, user_id=user_id))
            
            msg_content = f"### ⚠️ Исключение из курса\n\nВы были исключены из курса **{course.title}**.\n\n*Если у вас есть вопросы, пожалуйста, свяжитесь с преподавателем.*"
            msg = Message(chat_id=chat.id, sender_id=current_user_id, content=msg_content)
            db.session.add(msg)
        except Exception as e:
            print(f"Failed to send kick notification: {e}")

    db.session.delete(enrollment)
    db.session.commit()
    return jsonify({"message": "Student kicked successfully"}), 200
