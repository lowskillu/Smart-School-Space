"""UniPrep service — extracurriculars, honors, exam registrations, test results."""
from __future__ import annotations

from ..core.errors import NotFoundError
from ..core.logging_cfg import get_logger
from ..repositories.uni_prep_repo import (
    exam_reg_repo,
    extracurricular_repo,
    honor_repo,
    test_result_repo,
)
from ..schemas.uni_prep import (
    ExtracurricularCreate,
    ExamRegistrationCreate,
    HonorCreate,
    TestResultCreate,
)

logger = get_logger(__name__)


class UniPrepService:

    # ─── Extracurriculars ──────────────────────────────────────────────────

    def get_extracurriculars(self, student_id: str) -> list[dict]:
        rows = extracurricular_repo.list_by_student(student_id)
        return [r.to_dict() for r in rows]

    def add_extracurricular(self, student_id: str, data: ExtracurricularCreate) -> dict:
        row = extracurricular_repo.create_for_student(student_id, data)
        logger.info("Extracurricular added: student=%s title=%s", student_id, data.title)
        return row.to_dict()

    def delete_extracurricular(self, id: str, student_id: str) -> None:
        row = extracurricular_repo.get_by_id(id)
        if not row or row.student_id != student_id:
            raise NotFoundError("Extracurricular", id)
        extracurricular_repo.delete(row)
        logger.info("Extracurricular deleted: id=%s", id)

    # ─── Honors ───────────────────────────────────────────────────────────

    def get_honors(self, student_id: str) -> list[dict]:
        return [r.to_dict() for r in honor_repo.list_by_student(student_id)]

    def add_honor(self, student_id: str, data: HonorCreate) -> dict:
        row = honor_repo.create_for_student(student_id, data)
        logger.info("Honor added: student=%s title=%s", student_id, data.title)
        return row.to_dict()

    def delete_honor(self, id: str, student_id: str) -> None:
        row = honor_repo.get_by_id(id)
        if not row or row.student_id != student_id:
            raise NotFoundError("Honor", id)
        honor_repo.delete(row)

    # ─── Exam Registrations ────────────────────────────────────────────────

    def get_exam_registrations(self, student_id: str) -> list[dict]:
        return [r.to_dict() for r in exam_reg_repo.list_by_student(student_id)]

    def add_exam_registration(self, student_id: str, data: ExamRegistrationCreate) -> dict:
        row = exam_reg_repo.create_for_student(student_id, data)
        logger.info("Exam registered: student=%s type=%s", student_id, data.exam_type)
        return row.to_dict()

    def delete_exam_registration(self, id: str, student_id: str) -> None:
        row = exam_reg_repo.get_by_id(id)
        if not row or row.student_id != student_id:
            raise NotFoundError("ExamRegistration", id)
        exam_reg_repo.delete(row)

    # ─── Test Results ──────────────────────────────────────────────────────

    def get_test_results(self, student_id: str, exam_type: str | None = None) -> list[dict]:
        rows = test_result_repo.list_by_student(student_id, exam_type)
        return [r.to_dict() for r in rows]

    def add_test_result(self, student_id: str, data: TestResultCreate) -> dict:
        row = test_result_repo.create_for_student(student_id, data)
        logger.info("Test result added: student=%s type=%s score=%s", student_id, data.exam_type, data.score)
        return row.to_dict()

    def delete_test_result(self, id: str, student_id: str) -> None:
        row = test_result_repo.get_by_id(id)
        if not row or row.student_id != student_id:
            raise NotFoundError("TestResult", id)
        test_result_repo.delete(row)


uni_prep_service = UniPrepService()
