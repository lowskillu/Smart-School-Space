"""UniPrep repositories — extracurriculars, honors, exam registrations, test results."""
from __future__ import annotations

from datetime import datetime

from ..models import (
    UniPrepExtracurricular,
    UniPrepHonor,
    ExamRegistration,
    TestResult,
)
from ..schemas.uni_prep import (
    ExtracurricularCreate,
    HonorCreate,
    ExamRegistrationCreate,
    TestResultCreate,
)
from .base import BaseRepository
from ..extensions import db


class ExtracurricularRepository(BaseRepository[UniPrepExtracurricular]):
    model = UniPrepExtracurricular

    def list_by_student(self, student_id: str) -> list[UniPrepExtracurricular]:
        return (
            UniPrepExtracurricular.query
            .filter_by(student_id=student_id)
            .order_by(UniPrepExtracurricular.created_at.asc())
            .all()
        )

    def create_for_student(self, student_id: str, data: ExtracurricularCreate) -> UniPrepExtracurricular:
        row = UniPrepExtracurricular(
            student_id=student_id,
            title=data.title,
            role=data.role,
            organization=data.organization,
            hours_per_week=data.hours_per_week,
            weeks_per_year=data.weeks_per_year,
            category=data.category,
            description=data.description,
        )
        db.session.add(row)
        db.session.commit()
        return row


class HonorRepository(BaseRepository[UniPrepHonor]):
    model = UniPrepHonor

    def list_by_student(self, student_id: str) -> list[UniPrepHonor]:
        return (
            UniPrepHonor.query
            .filter_by(student_id=student_id)
            .order_by(UniPrepHonor.year_received.desc())
            .all()
        )

    def create_for_student(self, student_id: str, data: HonorCreate) -> UniPrepHonor:
        row = UniPrepHonor(
            student_id=student_id,
            title=data.title,
            level=data.level,
            year_received=data.year_received,
        )
        db.session.add(row)
        db.session.commit()
        return row


class ExamRegistrationRepository(BaseRepository[ExamRegistration]):
    model = ExamRegistration

    def list_by_student(self, student_id: str) -> list[ExamRegistration]:
        return (
            ExamRegistration.query
            .filter_by(student_id=student_id)
            .order_by(ExamRegistration.exam_date.asc())
            .all()
        )

    def create_for_student(self, student_id: str, data: ExamRegistrationCreate) -> ExamRegistration:
        exam_date = data.exam_date
        if isinstance(exam_date, str):
            try:
                exam_date = datetime.fromisoformat(exam_date)
            except ValueError:
                exam_date = None
        row = ExamRegistration(
            student_id=student_id,
            exam_type=data.exam_type,
            subject=data.subject,
            exam_date=exam_date,
            location=data.location,
        )
        db.session.add(row)
        db.session.commit()
        return row


class TestResultRepository(BaseRepository[TestResult]):
    model = TestResult

    def list_by_student(self, student_id: str, exam_type: str | None = None) -> list[TestResult]:
        q = TestResult.query.filter_by(student_id=student_id)
        if exam_type:
            q = q.filter_by(exam_type=exam_type)
        return q.order_by(TestResult.date_taken.desc()).all()

    def create_for_student(self, student_id: str, data: TestResultCreate) -> TestResult:
        date_taken = data.date_taken
        if isinstance(date_taken, str) and date_taken:
            try:
                date_taken = datetime.fromisoformat(date_taken)
            except ValueError:
                date_taken = None
        row = TestResult(
            student_id=student_id,
            exam_type=data.exam_type,
            subject=data.subject,
            score=data.score,
            is_mock=data.is_mock,
            date_taken=date_taken,
        )
        db.session.add(row)
        db.session.commit()
        return row


extracurricular_repo = ExtracurricularRepository()
honor_repo = HonorRepository()
exam_reg_repo = ExamRegistrationRepository()
test_result_repo = TestResultRepository()
