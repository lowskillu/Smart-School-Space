"""Grade service — business logic for grades and GPA summaries."""
from __future__ import annotations

from ..core.cache import timed_cache, invalidate_cache
from ..core.logging_cfg import get_logger
from ..repositories.grade_repo import grade_repo
from ..schemas.grade import GradeCreate

logger = get_logger(__name__)

_SUMMARY_CACHE_PREFIX = "grade_summary_"


class GradeService:

    def list_grades(self, student_id: str | None = None) -> list[dict]:
        if student_id:
            rows = grade_repo.list_by_student(student_id)
        else:
            rows = grade_repo.list_all()
        return [r.to_dict() for r in rows]

    def create_grade(self, data: GradeCreate) -> dict:
        grade = grade_repo.create(
            student_id=data.student_id,
            subject_id=data.subject_id,
            score=data.score,
            semester=data.semester,
            comments=data.comments,
        )
        # Invalidate cached summary for this student
        invalidate_cache(f"{_SUMMARY_CACHE_PREFIX}{data.student_id}")
        logger.info(
            "Grade created: student=%s subject=%s score=%.1f",
            data.student_id, data.subject_id, data.score,
        )
        return grade.to_dict()

    def get_summary(self, student_id: str, year: str | None = None) -> dict:
        """Return GPA summary, cached for 5 minutes."""
        cache_key = f"{_SUMMARY_CACHE_PREFIX}{student_id}_{year or 'all'}"

        # Manual TTL cache check (no Flask-Caching available)
        from ..core.cache import _store
        import time
        entry = _store.get(cache_key)
        if entry:
            value, expires_at = entry
            if time.monotonic() < expires_at:
                return value

        result = grade_repo.summary_by_student(student_id, year)
        import time as _time
        from ..core.cache import _store as _s
        _s[cache_key] = (result, _time.monotonic() + 300)
        return result


grade_service = GradeService()
