"""SQLAlchemy models — mirrors the Supabase schema exactly."""

import uuid
import json
from datetime import datetime, date as date_type

from .extensions import db


def _uuid():
    return str(uuid.uuid4())


# ──────────────────────────── Subjects ────────────────────────────

class Subject(db.Model):
    __tablename__ = "subjects"

    id = db.Column(db.String(36), primary_key=True, default=_uuid)
    name = db.Column(db.String(200), nullable=False)
    code = db.Column(db.String(50), nullable=True) # e.g. MATH-101
    category = db.Column(db.String(100), nullable=True) # e.g. Natural Sciences
    credits = db.Column(db.Integer, default=1)
    standard_hours = db.Column(db.Integer, default=4) # Hours per week

    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    updated_at = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    teachers = db.relationship("TeacherSubject", backref="subject", cascade="all, delete-orphan")

    def to_dict(self):
        return {
            "id": self.id,
            "name": self.name,
            "code": self.code,
            "category": self.category,
            "credits": self.credits,
            "standard_hours": self.standard_hours,
            "teacher_ids": [t.teacher_id for t in self.teachers],
            "created_at": self.created_at.isoformat() if self.created_at else None,
            "updated_at": self.updated_at.isoformat() if self.updated_at else None,
        }


class GradeSubject(db.Model):
    __tablename__ = "grade_subjects"

    id = db.Column(db.String(36), primary_key=True, default=_uuid)
    grade_level = db.Column(db.Integer, nullable=False)  # e.g. 1-12
    subject_id = db.Column(
        db.String(36), db.ForeignKey("subjects.id", ondelete="CASCADE"), nullable=False
    )
    hours_per_week = db.Column(db.Integer, default=4)

    subject = db.relationship("Subject", lazy="joined")

    def to_dict(self):
        return {
            "id": self.id,
            "grade_level": self.grade_level,
            "subject_id": self.subject_id,
            "subject_name": self.subject.name if self.subject else None,
            "subject_code": self.subject.code if self.subject else None,
            "hours_per_week": self.hours_per_week,
        }


# ──────────────────────────── Teachers ────────────────────────────

class Teacher(db.Model):
    __tablename__ = "teachers"

    id = db.Column(db.String(36), primary_key=True, default=_uuid)
    name = db.Column(db.String(200), nullable=False)
    email = db.Column(db.String(200), nullable=True)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    updated_at = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    subjects = db.relationship(
        "TeacherSubject", backref="teacher", cascade="all, delete-orphan"
    )

    def to_dict(self):
        return {
            "id": self.id,
            "name": self.name,
            "email": self.email,
            "created_at": self.created_at.isoformat() if self.created_at else None,
            "updated_at": self.updated_at.isoformat() if self.updated_at else None,
            "teacher_subjects": [ts.to_dict() for ts in self.subjects],
        }


class TeacherSubject(db.Model):
    __tablename__ = "teacher_subjects"

    id = db.Column(db.String(36), primary_key=True, default=_uuid)
    teacher_id = db.Column(
        db.String(36), db.ForeignKey("teachers.id", ondelete="CASCADE"), nullable=False
    )
    subject_id = db.Column(
        db.String(36), db.ForeignKey("subjects.id", ondelete="CASCADE"), nullable=False
    )

    def to_dict(self):
        return {"id": self.id, "teacher_id": self.teacher_id, "subject_id": self.subject_id}


class TeacherWorkload(db.Model):
    __tablename__ = "teacher_workloads"

    id = db.Column(db.String(36), primary_key=True, default=_uuid)
    teacher_id = db.Column(db.String(36), db.ForeignKey("teachers.id", ondelete="CASCADE"), nullable=False)
    subject_id = db.Column(db.String(36), db.ForeignKey("subjects.id", ondelete="CASCADE"), nullable=False)
    class_id = db.Column(db.String(36), db.ForeignKey("classes.id", ondelete="CASCADE"), nullable=False)
    hours_per_week = db.Column(db.Integer, nullable=False, default=1)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    
    teacher = db.relationship("Teacher", lazy="joined")
    subject = db.relationship("Subject", lazy="joined")
    class_group = db.relationship("ClassGroup", lazy="joined")

    def to_dict(self):
        return {
            "id": self.id,
            "teacher_id": self.teacher_id,
            "subject_id": self.subject_id,
            "class_id": self.class_id,
            "hours_per_week": self.hours_per_week,
            "teacher_name": self.teacher.name if self.teacher else None,
            "subject_name": self.subject.name if self.subject else None,
            "class_name": self.class_group.name if self.class_group else None,
        }


class TeacherConstraint(db.Model):
    __tablename__ = "teacher_constraints"

    id = db.Column(db.String(36), primary_key=True, default=_uuid)
    teacher_id = db.Column(db.String(36), db.ForeignKey("teachers.id", ondelete="CASCADE"), nullable=False)
    max_hours_per_day = db.Column(db.Integer, default=6)
    max_hours_per_week = db.Column(db.Integer, default=24)
    consecutive_limits = db.Column(db.Integer, default=4)
    blocked_slots = db.Column(db.Text, default="[]") # JSON string array of "day-period" formats
    special_wishes = db.Column(db.Text, nullable=True)
    
    teacher = db.relationship("Teacher", lazy="joined")

    def to_dict(self):
        import json
        return {
            "id": self.id,
            "teacher_id": self.teacher_id,
            "max_hours_per_day": self.max_hours_per_day,
            "max_hours_per_week": self.max_hours_per_week,
            "consecutive_limits": self.consecutive_limits,
            "blocked_slots": json.loads(self.blocked_slots) if self.blocked_slots else [],
            "special_wishes": self.special_wishes,
        }


# ──────────────────────────── Rooms ────────────────────────────

class Room(db.Model):
    __tablename__ = "rooms"

    id = db.Column(db.String(36), primary_key=True, default=_uuid)
    name = db.Column(db.String(100), nullable=False)
    capacity = db.Column(db.Integer, default=30)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    updated_at = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    def to_dict(self):
        return {
            "id": self.id,
            "name": self.name,
            "capacity": self.capacity,
            "created_at": self.created_at.isoformat() if self.created_at else None,
            "updated_at": self.updated_at.isoformat() if self.updated_at else None,
        }


# ──────────────────────────── Classes ────────────────────────────

class ClassGroup(db.Model):
    __tablename__ = "classes"

    id = db.Column(db.String(36), primary_key=True, default=_uuid)
    name = db.Column(db.String(100), nullable=False)
    grade_level = db.Column(db.Integer, nullable=True)
    capacity = db.Column(db.Integer, default=30)
    homeroom_id = db.Column(db.String(36), db.ForeignKey("rooms.id", ondelete="SET NULL"), nullable=True)
    class_teacher_id = db.Column(db.String(36), db.ForeignKey("teachers.id", ondelete="SET NULL"), nullable=True)
    
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    updated_at = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    students = db.relationship("Student", backref="class_group", lazy=True)
    homeroom = db.relationship("Room", foreign_keys=[homeroom_id])
    class_teacher = db.relationship("Teacher", foreign_keys=[class_teacher_id])

    def to_dict(self):
        return {
            "id": self.id,
            "name": self.name,
            "grade_level": self.grade_level,
            "capacity": self.capacity,
            "homeroom_id": self.homeroom_id,
            "homeroom_name": self.homeroom.name if self.homeroom else None,
            "class_teacher_id": self.class_teacher_id,
            "class_teacher_name": self.class_teacher.name if self.class_teacher else None,
            "created_at": self.created_at.isoformat() if self.created_at else None,
            "updated_at": self.updated_at.isoformat() if self.updated_at else None,
        }


# ──────────────────────────── Students ────────────────────────────

class Student(db.Model):
    __tablename__ = "students"

    id = db.Column(db.String(36), primary_key=True, default=_uuid)
    name = db.Column(db.String(200), nullable=False)
    email = db.Column(db.String(200), nullable=True)
    class_id = db.Column(
        db.String(36), db.ForeignKey("classes.id", ondelete="SET NULL"), nullable=True
    )
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    updated_at = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    def to_dict(self):
        return {
            "id": self.id,
            "name": self.name,
            "email": self.email,
            "class_id": self.class_id,
            "created_at": self.created_at.isoformat() if self.created_at else None,
            "updated_at": self.updated_at.isoformat() if self.updated_at else None,
        }


# ──────────────────────────── Schedule Entries ────────────────────

class ScheduleEntry(db.Model):
    __tablename__ = "schedule_entries"

    id = db.Column(db.String(36), primary_key=True, default=_uuid)
    class_id = db.Column(
        db.String(36), db.ForeignKey("classes.id", ondelete="CASCADE"), nullable=False
    )
    subject_id = db.Column(
        db.String(36), db.ForeignKey("subjects.id", ondelete="CASCADE"), nullable=False
    )
    teacher_id = db.Column(
        db.String(36), db.ForeignKey("teachers.id", ondelete="CASCADE"), nullable=False
    )
    room_id = db.Column(
        db.String(36), db.ForeignKey("rooms.id", ondelete="SET NULL"), nullable=True
    )
    day = db.Column(db.Integer, nullable=False)          # 0=Mon .. 4=Fri
    period = db.Column(db.Integer, nullable=False)        # 0..7 (8 periods per day)
    has_conflict = db.Column(db.Boolean, default=False)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)

    subject = db.relationship("Subject", lazy="joined")
    teacher = db.relationship("Teacher", lazy="joined")
    room = db.relationship("Room", lazy="joined")
    class_group = db.relationship("ClassGroup", lazy="joined")

    def to_dict(self):
        return {
            "id": self.id,
            "class_id": self.class_id,
            "subject_id": self.subject_id,
            "teacher_id": self.teacher_id,
            "room_id": self.room_id,
            "day": self.day,
            "period": self.period,
            "has_conflict": self.has_conflict,
            "created_at": self.created_at.isoformat() if self.created_at else None,
            "subject_name": self.subject.name if self.subject else None,
            "teacher_name": self.teacher.name if self.teacher else None,
            "room_name": self.room.name if self.room else None,
            "class_name": self.class_group.name if self.class_group else None,
            "subjects": {"name": self.subject.name} if self.subject else None,
            "teachers": {"name": self.teacher.name} if self.teacher else None,
            "rooms": {"name": self.room.name} if self.room else None,
            "classes": {"name": self.class_group.name} if self.class_group else None,
        }


class SavedSchedule(db.Model):
    """A named snapshot of a generated schedule."""
    __tablename__ = "saved_schedules"

    id = db.Column(db.String(36), primary_key=True, default=_uuid)
    name = db.Column(db.String(200), nullable=False)
    grade_levels = db.Column(db.Text, nullable=True)       # JSON: [1,2,3]
    total_entries = db.Column(db.Integer, default=0)
    total_classes = db.Column(db.Integer, default=0)
    entries_json = db.Column(db.Text, nullable=False)       # JSON blob of entries
    is_active = db.Column(db.Boolean, default=False)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)

    def to_dict(self):
        return {
            "id": self.id,
            "name": self.name,
            "grade_levels": json.loads(self.grade_levels) if self.grade_levels else [],
            "total_entries": self.total_entries,
            "total_classes": self.total_classes,
            "is_active": self.is_active,
            "created_at": self.created_at.isoformat() if self.created_at else None,
        }


# ──────────────────────────── Attendance ──────────────────────────

class Attendance(db.Model):
    __tablename__ = "attendance"

    id = db.Column(db.String(36), primary_key=True, default=_uuid)
    student_id = db.Column(
        db.String(36), db.ForeignKey("students.id", ondelete="CASCADE"), nullable=False
    )
    class_id = db.Column(
        db.String(36), db.ForeignKey("classes.id", ondelete="CASCADE"), nullable=False
    )
    day = db.Column(db.Integer, nullable=False)
    period = db.Column(db.Integer, nullable=False)
    date = db.Column(db.String(10), nullable=False)  # "YYYY-MM-DD"
    status = db.Column(db.String(10), default="present")
    face_id = db.Column(db.Boolean, nullable=True)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)

    student = db.relationship("Student", lazy="joined")

    __table_args__ = (
        db.UniqueConstraint(
            "student_id", "class_id", "period", "day", "date",
            name="uq_attendance_slot",
        ),
    )

    def to_dict(self):
        return {
            "id": self.id,
            "student_id": self.student_id,
            "class_id": self.class_id,
            "day": self.day,
            "period": self.period,
            "date": self.date,
            "status": self.status,
            "face_id": self.face_id,
            "created_at": self.created_at.isoformat() if self.created_at else None,
            "students": {"name": self.student.name} if self.student else None,
        }


# ──────────────────────────── University Preparations ──────────────────

class UniversityApplication(db.Model):
    __tablename__ = "university_applications"

    id = db.Column(db.String(36), primary_key=True, default=_uuid)
    student_id = db.Column(
        db.String(36), db.ForeignKey("students.id", ondelete="CASCADE"), nullable=False
    )
    name = db.Column(db.String(255), nullable=False)
    country = db.Column(db.String(100), nullable=True)
    acceptance_rate = db.Column(db.Float, nullable=True)
    global_rank = db.Column(db.Integer, nullable=True)
    sat_avg = db.Column(db.Integer, nullable=True)
    alevel_req = db.Column(db.String(50), nullable=True)
    ib_req = db.Column(db.Integer, nullable=True)
    ielts_req = db.Column(db.Float, nullable=True)
    tuition_fee = db.Column(db.Integer, nullable=True)
    financial_aid = db.Column(db.Boolean, default=False)
    deadline = db.Column(db.String(100), nullable=True)
    status = db.Column(db.String(20), default="Draft") # Draft, Applying, Submitted
    created_at = db.Column(db.DateTime, default=datetime.utcnow)

    def to_dict(self):
        return {
            "id": self.id,
            "student_id": self.student_id,
            "name": self.name,
            "country": self.country,
            "acceptanceRate": self.acceptance_rate,
            "globalRank": self.global_rank,
            "sat": self.sat_avg,
            "alevel": self.alevel_req,
            "ib": self.ib_req,
            "ielts": self.ielts_req,
            "cost": self.tuition_fee,
            "financialAid": self.financial_aid,
            "regularDecision": self.deadline,
            "status": self.status,
            "created_at": self.created_at.isoformat() if self.created_at else None,
        }


# ─────────────────────────────────────────────────────────────────────────────


# ──────────────────────────── Grades ──────────────────────────────

class Grade(db.Model):
    __tablename__ = "grades"

    id = db.Column(db.String(36), primary_key=True, default=_uuid)
    student_id = db.Column(
        db.String(36), db.ForeignKey("students.id", ondelete="CASCADE"), nullable=False
    )
    subject_id = db.Column(
        db.String(36), db.ForeignKey("subjects.id", ondelete="CASCADE"), nullable=False
    )
    score = db.Column(db.Float, nullable=True)
    semester = db.Column(db.String(20), nullable=True)
    comments = db.Column(db.Text, nullable=True)
    assignment_id = db.Column(
        db.String(36), db.ForeignKey("assignments.id", ondelete="CASCADE"), nullable=True
    )
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    updated_at = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    subject = db.relationship("Subject", lazy="joined")
    student = db.relationship("Student", lazy="joined")

    def to_dict(self):
        return {
            "id": self.id,
            "student_id": self.student_id,
            "subject_id": self.subject_id,
            "score": self.score,
            "semester": self.semester,
            "comments": self.comments,
            "assignment_id": self.assignment_id,
            "created_at": self.created_at.isoformat() if self.created_at else None,
            "updated_at": self.updated_at.isoformat() if self.updated_at else None,
            "subjects": {"name": self.subject.name} if self.subject else None,
            "students": {"name": self.student.name} if self.student else None,
        }


# ──────────────────────────── Documents ───────────────────────────

class Document(db.Model):
    __tablename__ = "documents"

    id = db.Column(db.String(36), primary_key=True, default=_uuid)
    title = db.Column(db.String(300), nullable=False)
    student_id = db.Column(
        db.String(36), db.ForeignKey("students.id", ondelete="SET NULL"), nullable=True
    )
    category = db.Column(db.String(50), nullable=True)
    status = db.Column(db.String(20), default="draft")
    file_path = db.Column(db.String(500), nullable=True)
    file_type = db.Column(db.String(20), nullable=True)
    uploaded_by = db.Column(db.String(200), nullable=True)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    updated_at = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    versions = db.relationship(
        "DocumentVersion", backref="document", cascade="all, delete-orphan", lazy=True
    )

    def to_dict(self):
        return {
            "id": self.id,
            "title": self.title,
            "student_id": self.student_id,
            "category": self.category,
            "status": self.status,
            "file_path": self.file_path,
            "file_type": self.file_type,
            "uploaded_by": self.uploaded_by,
            "created_at": self.created_at.isoformat() if self.created_at else None,
            "updated_at": self.updated_at.isoformat() if self.updated_at else None,
        }


class DocumentVersion(db.Model):
    __tablename__ = "document_versions"

    id = db.Column(db.String(36), primary_key=True, default=_uuid)
    document_id = db.Column(
        db.String(36), db.ForeignKey("documents.id", ondelete="CASCADE"), nullable=False
    )
    version_number = db.Column(db.Integer, default=1)
    content = db.Column(db.Text, nullable=True)
    editor_notes = db.Column(db.Text, nullable=True)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)

    def to_dict(self):
        return {
            "id": self.id,
            "document_id": self.document_id,
            "version_number": self.version_number,
            "content": self.content,
            "editor_notes": self.editor_notes,
            "created_at": self.created_at.isoformat() if self.created_at else None,
        }


# ──────────────────────────── RBAC (Access Control) ─────────────────

class Permission(db.Model):
    __tablename__ = "permissions"

    id = db.Column(db.String(36), primary_key=True, default=_uuid)
    code = db.Column(db.String(100), unique=True, nullable=False)  # e.g. 'view_attendance'
    description = db.Column(db.String(250), nullable=True)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)

    def to_dict(self):
        return {
            "id": self.id,
            "code": self.code,
            "description": self.description,
        }


class Role(db.Model):
    __tablename__ = "roles"

    id = db.Column(db.String(36), primary_key=True, default=_uuid)
    name = db.Column(db.String(50), unique=True, nullable=False)  # e.g. 'Admin', 'Teacher'
    created_at = db.Column(db.DateTime, default=datetime.utcnow)

    permissions = db.relationship(
        "RolePermission", backref="role", cascade="all, delete-orphan"
    )

    def to_dict(self):
        return {
            "id": self.id,
            "name": self.name,
            "permissions": [p.permission.code for p in self.permissions],
        }


class RolePermission(db.Model):
    __tablename__ = "role_permissions"

    id = db.Column(db.String(36), primary_key=True, default=_uuid)
    role_id = db.Column(
        db.String(36), db.ForeignKey("roles.id", ondelete="CASCADE"), nullable=False
    )
    permission_id = db.Column(
        db.String(36), db.ForeignKey("permissions.id", ondelete="CASCADE"), nullable=False
    )
    # Scope define what user can see: 'own', 'class', 'school'
    scope = db.Column(db.String(20), default="school") 

    permission = db.relationship("Permission")

    __table_args__ = (
        db.UniqueConstraint("role_id", "permission_id", name="uq_role_permission"),
    )


class User(db.Model):
    __tablename__ = "users"

    id = db.Column(db.String(36), primary_key=True, default=_uuid)
    email = db.Column(db.String(200), unique=True, nullable=False)
    password_hash = db.Column(db.String(200), nullable=False)
    name = db.Column(db.String(200), nullable=False)
    role_id = db.Column(
        db.String(36), db.ForeignKey("roles.id", ondelete="SET NULL"), nullable=True
    )
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    updated_at = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    # Link to Teacher/Student profile if necessary
    teacher_id = db.Column(db.String(36), db.ForeignKey("teachers.id", ondelete="SET NULL"), nullable=True)
    student_id = db.Column(db.String(36), db.ForeignKey("students.id", ondelete="SET NULL"), nullable=True)

    role = db.relationship("Role", backref="users")
    teacher = db.relationship("Teacher", foreign_keys=[teacher_id], lazy="joined")
    student = db.relationship("Student", foreign_keys=[student_id], lazy="joined")

    def to_dict(self):
        return {
            "id": self.id,
            "email": self.email,
            "name": self.name,
            "role": self.role.name if self.role else None,
            "role_id": self.role_id,
            "permissions": [p.permission.code for p in self.role.permissions] if self.role else [],
            "teacher_id": self.teacher_id,
            "student_id": self.student_id,
            "class_name": self.student.class_group.name if self.student and self.student.class_group else None,
        }

# ──────────────────────────── Communication & Chats ─────────────────

class Chat(db.Model):
    __tablename__ = "chats"

    id = db.Column(db.String(36), primary_key=True, default=_uuid)
    name = db.Column(db.String(200), nullable=True)  # Null for private chats
    is_group = db.Column(db.Boolean, default=False)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    
    members = db.relationship("ChatMember", backref="chat", cascade="all, delete-orphan")
    messages = db.relationship("Message", backref="chat", cascade="all, delete-orphan", lazy="dynamic")

    def to_dict(self):
        return {
            "id": self.id,
            "name": self.name,
            "is_group": self.is_group,
            "created_at": self.created_at.isoformat() if self.created_at else None,
        }

class ChatMember(db.Model):
    __tablename__ = "chat_members"

    id = db.Column(db.String(36), primary_key=True, default=_uuid)
    chat_id = db.Column(db.String(36), db.ForeignKey("chats.id", ondelete="CASCADE"), nullable=False)
    user_id = db.Column(db.String(36), db.ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    joined_at = db.Column(db.DateTime, default=datetime.utcnow)

    # Useful for grouping/cohorts mapping on the frontend
    user_context = db.Column(db.String(100), nullable=True) # e.g., '10 A', 'House Gryffindor'

    user = db.relationship("User", lazy="joined")

    __table_args__ = (
        db.UniqueConstraint("chat_id", "user_id", name="uq_chat_member"),
    )

class Message(db.Model):
    __tablename__ = "messages"

    id = db.Column(db.String(36), primary_key=True, default=_uuid)
    chat_id = db.Column(db.String(36), db.ForeignKey("chats.id", ondelete="CASCADE"), nullable=False)
    sender_id = db.Column(db.String(36), db.ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    content = db.Column(db.Text, nullable=True) # Content can be null if it's only a file
    file_url = db.Column(db.String(500), nullable=True)
    file_type = db.Column(db.String(50), nullable=True) # 'image', 'file', 'video'
    is_read = db.Column(db.Boolean, default=False)
    is_pinned = db.Column(db.Boolean, default=False)
    is_edited = db.Column(db.Boolean, default=False)
    deleted_for = db.Column(db.Text, default="[]") # JSON array of user IDs
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    updated_at = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    sender = db.relationship("User", lazy="joined")

    def to_dict(self):
        return {
            "id": self.id,
            "chat_id": self.chat_id,
            "sender_id": self.sender_id,
            "sender_name": self.sender.name if self.sender else None,
            "content": self.content,
            "file_url": self.file_url,
            "file_type": self.file_type,
            "is_read": self.is_read,
            "is_pinned": self.is_pinned,
            "is_edited": self.is_edited,
            "deleted_for": json.loads(self.deleted_for) if self.deleted_for else [],
            "created_at": self.created_at.isoformat() + "Z" if self.created_at else None,
            "updated_at": self.updated_at.isoformat() + "Z" if self.updated_at else None,
        }

# ──────────────────────────── Meetings (Video Conf) ─────────────────

class Meeting(db.Model):
    __tablename__ = "meetings"

    id = db.Column(db.String(36), primary_key=True, default=_uuid)
    title = db.Column(db.String(200), nullable=False)
    host_id = db.Column(db.String(36), db.ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    room_key = db.Column(db.String(100), unique=True, default=_uuid) # Unique Jitsi key
    password = db.Column(db.String(50), nullable=True) # Access password
    scheduled_time = db.Column(db.DateTime, nullable=True)
    duration = db.Column(db.Integer, default=60) # Duration in minutes
    started_at = db.Column(db.DateTime, nullable=True) # When actual meeting started
    is_active = db.Column(db.Boolean, default=True)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)

    host = db.relationship("User", lazy="joined")
    participants = db.relationship("MeetingParticipant", backref="meeting", cascade="all, delete-orphan")

    def to_dict(self):
        return {
            "id": self.id,
            "title": self.title,
            "host_id": self.host_id,
            "host_name": self.host.name if self.host else None,
            "room_key": self.room_key,
            "password": self.password,
            "scheduled_time": self.scheduled_time.isoformat() + "Z" if self.scheduled_time else None,
            "duration": self.duration,
            "started_at": self.started_at.isoformat() + "Z" if self.started_at else None,
            "is_active": self.is_active,
            "created_at": self.created_at.isoformat() + "Z" if self.created_at else None,
            "participants": [
                {"id": p.user_id, "name": db.session.query(User.name).filter_by(id=p.user_id).scalar()}
                for p in self.participants if p.user_id
            ],
            "classes": [
                {"id": p.class_id, "name": db.session.query(ClassGroup.name).filter_by(id=p.class_id).scalar()}
                for p in self.participants if p.class_id
            ]
        }

class MeetingParticipant(db.Model):
    __tablename__ = "meeting_participants"

    id = db.Column(db.String(36), primary_key=True, default=_uuid)
    meeting_id = db.Column(db.String(36), db.ForeignKey("meetings.id", ondelete="CASCADE"), nullable=False)
    user_id = db.Column(db.String(36), db.ForeignKey("users.id", ondelete="CASCADE"), nullable=True)
    class_id = db.Column(db.String(36), db.ForeignKey("classes.id", ondelete="CASCADE"), nullable=True) # If inviting a whole class

    __table_args__ = (
        db.UniqueConstraint("meeting_id", "user_id", "class_id", name="uq_meeting_participant"),
    )

    image_url = db.Column(db.String(255), nullable=True)

class FoodItem(db.Model):
    __tablename__ = "food_items"

    id = db.Column(db.String(36), primary_key=True, default=_uuid)
    name = db.Column(db.String(200), nullable=False)
    description = db.Column(db.Text, nullable=True)
    price = db.Column(db.String(100), nullable=False, default="0")
    category = db.Column(db.String(100), nullable=True)
    type = db.Column(db.String(20), default="buffet") # 'canteen', 'buffet'
    weight = db.Column(db.String(50), nullable=True)
    calories = db.Column(db.Integer, nullable=True)
    proteins = db.Column(db.Float, nullable=True)
    fats = db.Column(db.Float, nullable=True)
    carbs = db.Column(db.Float, nullable=True)
    image_url = db.Column(db.String(255), nullable=True)

    def to_dict(self):
        return {
            "id": self.id,
            "name": self.name,
            "description": self.description,
            "price": self.price,
            "category": self.category,
            "type": self.type,
            "weight": self.weight,
            "calories": self.calories,
            "proteins": self.proteins,
            "fats": self.fats,
            "carbs": self.carbs,
            "image_url": self.image_url,
        }

class CanteenMenu(db.Model):
    __tablename__ = "canteen_menu"
    id = db.Column(db.String(36), primary_key=True, default=_uuid)
    date = db.Column(db.String(10), nullable=False) # YYYY-MM-DD
    meal_type = db.Column(db.String(20), nullable=False) # breakfast, lunch, snack, dinner
    name = db.Column(db.String(200), nullable=False)
    calories = db.Column(db.Integer, default=0)
    proteins = db.Column(db.Float, default=0.0)
    fats = db.Column(db.Float, default=0.0)
    carbs = db.Column(db.Float, default=0.0)
    start_time = db.Column(db.String(5), nullable=True) # HH:MM
    end_time = db.Column(db.String(5), nullable=True) # HH:MM
    food_item_id = db.Column(db.String(36), db.ForeignKey("food_items.id", ondelete="SET NULL"), nullable=True)

    food_item = db.relationship("FoodItem", lazy="joined")

    def to_dict(self):
        return {
            "id": self.id,
            "date": self.date,
            "meal_type": self.meal_type,
            "name": self.name,
            "calories": self.calories,
            "proteins": self.proteins,
            "fats": self.fats,
            "carbs": self.carbs,
            "start_time": self.start_time,
            "end_time": self.end_time,
            "food_item_id": self.food_item_id
        }

class Order(db.Model):
    __tablename__ = "orders"

    id = db.Column(db.String(36), primary_key=True, default=_uuid)
    user_id = db.Column(db.String(36), db.ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    total_amount = db.Column(db.Float, nullable=False, default=0.0)
    status = db.Column(db.String(30), default="paid") # 'paid', 'pending_parental_approval'
    created_at = db.Column(db.DateTime(timezone=True), server_default=db.func.now())
    
    items = db.relationship("OrderItem", backref="order", lazy="dynamic", cascade="all, delete-orphan")

class OrderItem(db.Model):
    __tablename__ = "order_items"

    id = db.Column(db.String(36), primary_key=True, default=_uuid)
    order_id = db.Column(db.String(36), db.ForeignKey("orders.id", ondelete="CASCADE"), nullable=False)
    food_item_id = db.Column(db.String(36), db.ForeignKey("food_items.id", ondelete="SET NULL"), nullable=True)
    quantity = db.Column(db.Integer, nullable=False, default=1)

# ──────────────────────────── Assignments ──────────────────────────

class Assignment(db.Model):
    __tablename__ = "assignments"

    id = db.Column(db.String(36), primary_key=True, default=_uuid)
    title = db.Column(db.String(200), nullable=False)
    description = db.Column(db.Text, nullable=True)
    type_of_work = db.Column(db.String(50), nullable=False) # Homework, FA, SAU, Group Project, Midterm / Final
    weight = db.Column(db.Integer, nullable=False, default=1)
    max_points = db.Column(db.Float, nullable=False, default=100.0)
    class_id = db.Column(db.String(36), db.ForeignKey("classes.id", ondelete="CASCADE"), nullable=False)
    subject_id = db.Column(db.String(36), db.ForeignKey("subjects.id", ondelete="CASCADE"), nullable=True)
    teacher_id = db.Column(db.String(36), db.ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    due_date = db.Column(db.String(10), nullable=False) # Store as YYYY-MM-DD
    attachment_url = db.Column(db.Text, nullable=True)  # URL/path to attached file
    retakeable = db.Column(db.Boolean, nullable=False, default=False)  # Teacher-set: can student retake?
    created_at = db.Column(db.DateTime, default=datetime.utcnow)

    class_group = db.relationship("ClassGroup", lazy="joined")
    teacher = db.relationship("User", lazy="joined")

    def to_dict(self):
        return {
            "id": self.id,
            "title": self.title,
            "description": self.description,
            "type_of_work": self.type_of_work,
            "weight": self.weight,
            "max_points": self.max_points,
            "class_id": self.class_id,
            "subject_id": self.subject_id,
            "teacher_id": self.teacher_id,
            "due_date": self.due_date,
            "attachment_url": self.attachment_url,
            "retakeable": self.retakeable,
            "created_at": self.created_at.isoformat() if self.created_at else None,
            "class_name": self.class_group.name if self.class_group else None,
            "teacher_name": self.teacher.name if self.teacher else None,
        }

# ──────────────────────────── Extracurricular Courses ─────────────────────


class UniPrepCollege(db.Model):
    __tablename__ = "uniprep_colleges"
    id = db.Column(db.String(36), primary_key=True, default=_uuid)
    student_id = db.Column(db.String(36), db.ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    name = db.Column(db.String(150), nullable=False)
    country = db.Column(db.String(100), nullable=True)
    city = db.Column(db.String(100), nullable=True)
    major = db.Column(db.String(150), nullable=True)
    
    # Stats
    acceptance_rate = db.Column(db.Float, nullable=True)
    global_rank = db.Column(db.Integer, nullable=True)
    
    # Testing Requirements
    sat_req = db.Column(db.Integer, nullable=True)
    act_req = db.Column(db.Integer, nullable=True)
    alevel_req = db.Column(db.String(50), nullable=True)
    ib_req = db.Column(db.Integer, nullable=True)
    ap_req = db.Column(db.String(50), nullable=True)
    ielts_req = db.Column(db.Float, nullable=True)
    toefl_req = db.Column(db.Integer, nullable=True)
    
    # Deadlines
    early_action = db.Column(db.DateTime(timezone=True), nullable=True)
    early_decision = db.Column(db.DateTime(timezone=True), nullable=True)
    regular_decision = db.Column(db.DateTime(timezone=True), nullable=True)
    
    # Financials
    tuition_fee = db.Column(db.Float, nullable=True)
    financial_aid = db.Column(db.Boolean, default=False)
    application_fee = db.Column(db.Float, nullable=True)
    
    # Status & Dynamic
    status = db.Column(db.String(50), default="Brainstorming") # reach, match, safety calculated dynamically, this is 'Application Status'
    created_at = db.Column(db.DateTime(timezone=True), server_default=db.func.now())

class UniPrepEssay(db.Model):
    __tablename__ = "uniprep_essays"
    id = db.Column(db.String(36), primary_key=True, default=_uuid)
    student_id = db.Column(db.String(36), db.ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    college_id = db.Column(db.String(36), db.ForeignKey("uniprep_colleges.id", ondelete="SET NULL"), nullable=True)
    title = db.Column(db.String(255), nullable=False)
    topic = db.Column(db.String(255), nullable=True)
    content = db.Column(db.Text, nullable=True)
    word_limit = db.Column(db.Integer, nullable=True)
    status = db.Column(db.String(50), default="Not Started") # Not Started, Brainstorming, Drafting, Review, Final Polish, Completed
    deadline = db.Column(db.DateTime(timezone=True), nullable=True)
    created_at = db.Column(db.DateTime(timezone=True), server_default=db.func.now())

class UniPrepExtracurricular(db.Model):
    __tablename__ = "uniprep_extracurriculars"
    id = db.Column(db.String(36), primary_key=True, default=_uuid)
    student_id = db.Column(db.String(36), db.ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    title = db.Column(db.String(100), nullable=False) # Activity Name
    role = db.Column(db.String(100), nullable=True) # Captain, Founder, etc.
    organization = db.Column(db.String(100), nullable=True)
    hours_per_week = db.Column(db.Integer, default=0)
    weeks_per_year = db.Column(db.Integer, default=0)
    category = db.Column(db.String(50)) # Sports, Music, Volunteering, STEM, Internship
    description = db.Column(db.String(150), nullable=True) # 150 char limit enforced in UI
    created_at = db.Column(db.DateTime(timezone=True), server_default=db.func.now())

class UniPrepHonor(db.Model):
    __tablename__ = "uniprep_honors"
    id = db.Column(db.String(36), primary_key=True, default=_uuid)
    student_id = db.Column(db.String(36), db.ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    title = db.Column(db.String(150), nullable=False)
    level = db.Column(db.String(50), nullable=False) # School, Regional, National, International
    year_received = db.Column(db.Integer)
    created_at = db.Column(db.DateTime(timezone=True), server_default=db.func.now())

class ExamRegistration(db.Model):
    __tablename__ = "exam_registrations"
    id = db.Column(db.String(36), primary_key=True, default=_uuid)
    student_id = db.Column(db.String(36), db.ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    exam_type = db.Column(db.String(20), nullable=False) # SAT, AP, A-LEVEL, IELTS
    subject = db.Column(db.String(100), nullable=True) # E.g. Calculus BC for AP
    exam_date = db.Column(db.DateTime(timezone=True), nullable=False)
    location = db.Column(db.String(150), nullable=True)
    created_at = db.Column(db.DateTime(timezone=True), server_default=db.func.now())

class TestResult(db.Model):
    __tablename__ = "test_results"
    id = db.Column(db.String(36), primary_key=True, default=_uuid)
    student_id = db.Column(db.String(36), db.ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    exam_type = db.Column(db.String(20), nullable=False)
    subject = db.Column(db.String(100), nullable=True)
    score = db.Column(db.Float, nullable=False) # Float to accommodate IELTS 7.5
    is_mock = db.Column(db.Boolean, default=False)
    date_taken = db.Column(db.DateTime(timezone=True), nullable=True)
    document_url = db.Column(db.String(255), nullable=True) # Attached past paper or report
    created_at = db.Column(db.DateTime(timezone=True), server_default=db.func.now())

class RecommendationRequest(db.Model):
    __tablename__ = "recommendation_requests"
    id = db.Column(db.String(36), primary_key=True, default=_uuid)
    student_id = db.Column(db.String(36), db.ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    teacher_id = db.Column(db.String(36), db.ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    status = db.Column(db.String(20), default="pending") # pending, approved, uploaded
    major = db.Column(db.String(150), nullable=True)
    deadline = db.Column(db.DateTime(timezone=True), nullable=True)
    cv_url = db.Column(db.String(255), nullable=True)
    content = db.Column(db.Text, nullable=True)
    feedback = db.Column(db.Text, nullable=True)
    created_at = db.Column(db.DateTime(timezone=True), server_default=db.func.now())
    
    # Relationships to get names
    student = db.relationship("User", foreign_keys=[student_id], lazy="joined")
    teacher = db.relationship("User", foreign_keys=[teacher_id], lazy="joined")
    
    def to_dict(self):
        return {
            "id": self.id,
            "student_id": self.student_id,
            "teacher_id": self.teacher_id,
            "student_name": self.student.name if self.student else "Unknown",
            "teacher_name": self.teacher.name if self.teacher else "Unknown",
            "status": self.status,
            "major": self.major,
            "deadline": self.deadline.isoformat() if self.deadline else None,
            "cv_url": self.cv_url,
            "content": self.content,
            "feedback": self.feedback,
            "created_at": self.created_at.isoformat() if self.created_at else None
        }
# ──────────────────────────── Announcements ─────────────────────────

class Announcement(db.Model):
    __tablename__ = "announcements"
    id = db.Column(db.String(36), primary_key=True, default=_uuid)
    title = db.Column(db.String(255), nullable=False)
    content = db.Column(db.Text, nullable=False)
    author_id = db.Column(db.String(36), db.ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    class_id = db.Column(db.String(36), db.ForeignKey("classes.id", ondelete="CASCADE"), nullable=True) # Null if global
    is_global = db.Column(db.Boolean, default=True)
    color = db.Column(db.String(20), nullable=True, default=None)  # Accent color for visual
    audience = db.Column(db.String(20), nullable=False, default="all")  # all | staff | teachers | admins
    created_at = db.Column(db.DateTime, default=datetime.utcnow)

    author = db.relationship("User", lazy="joined")

    def to_dict(self):
        return {
            "id": self.id,
            "title": self.title,
            "content": self.content,
            "author_name": self.author.name if self.author else "Admin",
            "class_id": self.class_id,
            "is_global": self.is_global,
            "color": self.color,
            "audience": self.audience,
            "created_at": self.created_at.isoformat() if self.created_at else None,
        }

# ──────────────────────────── Alumni ───────────────────────────────

class AlumniRecord(db.Model):
    __tablename__ = "alumni_records"
    id = db.Column(db.String(36), primary_key=True, default=_uuid)
    name = db.Column(db.String(200), nullable=False)
    graduation_year = db.Column(db.Integer, nullable=False)
    college_name = db.Column(db.String(200), nullable=False)
    major = db.Column(db.String(200), nullable=True)
    essay_title = db.Column(db.String(200), nullable=True)
    essay_content = db.Column(db.Text, nullable=True)
    image_url = db.Column(db.String(500), nullable=True)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)

    def to_dict(self):
        return {
            "id": self.id,
            "name": self.name,
            "graduation_year": self.graduation_year,
            "college_name": self.college_name,
            "major": self.major,
            "essay_title": self.essay_title,
            "essay_content": self.essay_content,
            "image_url": self.image_url,
            "created_at": self.created_at.isoformat() if self.created_at else None,
        }

# ──────────────────────────── System Settings ─────────────────────

class SchoolSetting(db.Model):
    __tablename__ = "school_settings"
    id = db.Column(db.String(36), primary_key=True, default=_uuid)
    key = db.Column(db.String(100), unique=True, nullable=False)
    value = db.Column(db.Text, nullable=False)
    updated_at = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    def to_dict(self):
        return {
            "key": self.key,
            "value": self.value,
            "updated_at": self.updated_at.isoformat() if self.updated_at else None,
        }

# ──────────────────────────── Courses ──────────────────────────────

class Course(db.Model):
    __tablename__ = "courses"

    id = db.Column(db.String(36), primary_key=True, default=_uuid)
    title = db.Column(db.String(200), nullable=False)
    description = db.Column(db.Text, nullable=True)
    teacher_id = db.Column(db.String(36), db.ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    enrollment_limit = db.Column(db.Integer, default=20)
    category = db.Column(db.String(50), default="academic") # academic, sports, art, language, tech
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    is_active = db.Column(db.Boolean, default=True)

    teacher = db.relationship("User", foreign_keys=[teacher_id])
    target_classes = db.relationship("CourseTargetClass", backref="course", cascade="all, delete-orphan")
    schedules = db.relationship("CourseSchedule", backref="course", cascade="all, delete-orphan")
    enrollments = db.relationship("CourseEnrollment", backref="course", cascade="all, delete-orphan")

    def to_dict(self):
        return {
            "id": self.id,
            "title": self.title,
            "description": self.description,
            "teacher_id": self.teacher_id,
            "teacher_name": self.teacher.name if self.teacher else None,
            "enrollment_limit": self.enrollment_limit,
            "enrollment_count": len(self.enrollments),
            "category": self.category or "academic",
            "created_at": self.created_at.isoformat() + "Z" if self.created_at else None,
            "is_active": self.is_active,
            "target_class_ids": [tc.class_id for tc in self.target_classes],
            "schedules": [s.to_dict() for s in self.schedules],
            "cancellations": [c.to_dict() for c in self.cancellations],
            "is_enrolled": False # To be set by API for specific user
        }

class CourseTargetClass(db.Model):
    __tablename__ = "course_target_classes"
    id = db.Column(db.String(36), primary_key=True, default=_uuid)
    course_id = db.Column(db.String(36), db.ForeignKey("courses.id", ondelete="CASCADE"), nullable=False)
    class_id = db.Column(db.String(36), db.ForeignKey("classes.id", ondelete="CASCADE"), nullable=False)

class CourseSchedule(db.Model):
    __tablename__ = "course_schedules"
    id = db.Column(db.String(36), primary_key=True, default=_uuid)
    course_id = db.Column(db.String(36), db.ForeignKey("courses.id", ondelete="CASCADE"), nullable=False)
    
    # 0=Mon, 1=Tue, ..., 6=Sun. If None, it's a one-time event on start_date
    day_of_week = db.Column(db.Integer, nullable=True)
    start_time = db.Column(db.String(5), nullable=False) # "HH:MM"
    end_time = db.Column(db.String(5), nullable=False)   # "HH:MM"
    
    start_date = db.Column(db.Date, nullable=False) # First occurrence
    end_date = db.Column(db.Date, nullable=True)    # Last occurrence for recurring

    def to_dict(self):
        return {
            "id": self.id,
            "day_of_week": self.day_of_week,
            "start_time": self.start_time,
            "end_time": self.end_time,
            "start_date": self.start_date.isoformat() if self.start_date else None,
            "end_date": self.end_date.isoformat() if self.end_date else None,
        }

class CourseEnrollment(db.Model):
    __tablename__ = "course_enrollments"
    id = db.Column(db.String(36), primary_key=True, default=_uuid)
    course_id = db.Column(db.String(36), db.ForeignKey("courses.id", ondelete="CASCADE"), nullable=False)
    student_id = db.Column(db.String(36), db.ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    enrolled_at = db.Column(db.DateTime, default=datetime.utcnow)
    enrollment_type = db.Column(db.String(20), default="full") # daily, weekly, monthly, full
    expires_at = db.Column(db.DateTime, nullable=True)

    __table_args__ = (
        db.UniqueConstraint("course_id", "student_id", name="uq_course_enrollment"),
    )

class CourseCancellation(db.Model):
    __tablename__ = "course_cancellations"
    id = db.Column(db.String(36), primary_key=True, default=_uuid)
    course_id = db.Column(db.String(36), db.ForeignKey("courses.id", ondelete="CASCADE"), nullable=False)
    start_date = db.Column(db.Date, nullable=False)
    end_date = db.Column(db.Date, nullable=False)
    reason = db.Column(db.Text, nullable=True)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)

    course = db.relationship("Course", backref=db.backref("cancellations", cascade="all, delete-orphan"))

    def to_dict(self):
        return {
            "id": self.id,
            "course_id": self.course_id,
            "start_date": self.start_date.isoformat(),
            "end_date": self.end_date.isoformat(),
            "reason": self.reason,
            "created_at": self.created_at.isoformat()
        }

class CanteenMealTime(db.Model):
    __tablename__ = 'canteen_meal_times'
    id = db.Column(db.Integer, primary_key=True)
    meal_type = db.Column(db.String(50), unique=True, nullable=False)
    start_time = db.Column(db.String(10), default='09:00')
    end_time = db.Column(db.String(10), default='10:00')

    def to_dict(self):
        return {
            'meal_type': self.meal_type,
            'start_time': self.start_time,
            'end_time': self.end_time
        }

class SchoolCalendar(db.Model):
    __tablename__ = 'school_calendar'
    id = db.Column(db.Integer, primary_key=True)
    date = db.Column(db.String(10), unique=True, nullable=False)
    type = db.Column(db.String(20), nullable=False) # 'holiday', 'vacation', 'weekend'
    color = db.Column(db.String(20), nullable=True, default="#3b82f6")
    description = db.Column(db.Text)

    def to_dict(self):
        return {
            'id': self.id,
            'date': self.date,
            'type': self.type,
            'color': self.color,
            'description': self.description
        }

class TargetGrade(db.Model):
    __tablename__ = "target_grades"
    id = db.Column(db.String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    student_id = db.Column(db.String(36), db.ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    subject_id = db.Column(db.String(36), db.ForeignKey("subjects.id", ondelete="CASCADE"), nullable=False)
    target_percentage = db.Column(db.Integer, nullable=False, default=80)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    updated_at = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    
    __table_args__ = (
        db.UniqueConstraint("student_id", "subject_id", name="uq_student_subject_target"),
    )

    def to_dict(self):
        return {
            "id": self.id,
            "student_id": self.student_id,
            "subject_id": self.subject_id,
            "target_percentage": self.target_percentage
        }

class MockTest(db.Model):
    __tablename__ = "mock_tests"
    id = db.Column(db.String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    title = db.Column(db.String(255), nullable=False)
    exam_type = db.Column(db.String(50), nullable=False) # SAT, IELTS, etc
    subject = db.Column(db.String(100), nullable=True)
    duration_minutes = db.Column(db.Integer, nullable=False, default=60)
    created_by = db.Column(db.String(36), db.ForeignKey("users.id", ondelete="SET NULL"), nullable=True)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    
    questions = db.relationship("MockTestQuestion", backref="test", cascade="all, delete-orphan", lazy=True)
    
    def to_dict(self):
        return {
            "id": self.id,
            "title": self.title,
            "exam_type": self.exam_type,
            "subject": self.subject,
            "duration_minutes": self.duration_minutes,
            "created_at": self.created_at.isoformat() if self.created_at else None
        }

class MockTestQuestion(db.Model):
    __tablename__ = "mock_test_questions"
    id = db.Column(db.String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    test_id = db.Column(db.String(36), db.ForeignKey("mock_tests.id", ondelete="CASCADE"), nullable=False)
    text = db.Column(db.Text, nullable=False)
    options = db.Column(db.JSON, nullable=False) # List of strings
    correct_answer_index = db.Column(db.Integer, nullable=False)
    explanation = db.Column(db.Text, nullable=True)
    
    def to_dict(self):
        return {
            "id": self.id,
            "test_id": self.test_id,
            "text": self.text,
            "options": self.options,
            "correct_answer_index": self.correct_answer_index,
            "explanation": self.explanation
        }

class MockTestAttempt(db.Model):
    __tablename__ = "mock_test_attempts"
    id = db.Column(db.String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    test_id = db.Column(db.String(36), db.ForeignKey("mock_tests.id", ondelete="CASCADE"), nullable=False)
    student_id = db.Column(db.String(36), db.ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    start_time = db.Column(db.DateTime, default=datetime.utcnow)
    end_time = db.Column(db.DateTime, nullable=True)
    status = db.Column(db.String(20), default="in_progress") # in_progress, paused, completed
    remaining_seconds = db.Column(db.Integer, nullable=False)
    answers = db.Column(db.JSON, default=dict) # Dict of question_id -> selected_index
    score = db.Column(db.Integer, nullable=True) # Percentage or raw score
    
    def to_dict(self):
        return {
            "id": self.id,
            "test_id": self.test_id,
            "student_id": self.student_id,
            "start_time": self.start_time.isoformat() if self.start_time else None,
            "end_time": self.end_time.isoformat() if self.end_time else None,
            "status": self.status,
            "remaining_seconds": self.remaining_seconds,
            "answers": self.answers,
            "score": self.score
        }
