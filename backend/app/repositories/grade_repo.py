"""Grade repository — aggregated GPA queries to eliminate N+1."""
from __future__ import annotations

from sqlalchemy import func

from ..extensions import db
from ..models import Grade, Subject
from .base import BaseRepository


class GradeRepository(BaseRepository[Grade]):
    model = Grade

    def list_by_student(self, student_id: str) -> list[Grade]:
        return Grade.query.filter_by(student_id=student_id).all()

    def summary_by_student(self, student_id: str, year: str | None = None) -> dict:
        """Single query — returns avg score per subject.
        """
        # 1. Calculate overall summary (avg per subject)
        summary_query = (
            db.session.query(
                Subject.name,
                func.avg(Grade.score).label("avg_score"),
            )
            .join(Grade, Grade.subject_id == Subject.id)
            .filter(Grade.student_id == student_id)
        )
        if year and year != "All":
            summary_query = summary_query.filter(Grade.semester.startswith(year))
        
        summary_rows = summary_query.group_by(Subject.name).all()

        if not summary_rows:
            return {"chart": [], "summary": {}}

        summary = {name: round(float(avg), 1) for name, avg in summary_rows}

        # 2. Generate chart data (aggregated per month/period if available, otherwise distribute linearly)
        # Note: In current schema, 'created_at' can be used as a proxy for time.
        # For simplicity and robustness, we fetch all grades and group them by month.
        all_grades = (
            db.session.query(
                Grade.score,
                Grade.created_at,
                Subject.name.label("subject_name")
            )
            .join(Subject, Grade.subject_id == Subject.id)
            .filter(Grade.student_id == student_id)
            .order_by(Grade.created_at)
            .all()
        )

        # Map months to names
        month_names = ["Sep", "Oct", "Nov", "Dec", "Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug"]
        
        # Group by month
        chart_map = {} # {month_name: {subject_name: [scores]}}
        for score, dt, subj in all_grades:
            m_idx = dt.month - 1 # 0-indexed
            # Shift scholarly year: Sep is month 8 in 0-indexed
            # We'll just use chronological months for now or specific school months
            m_name = month_names[m_idx]
            if m_name not in chart_map:
                chart_map[m_name] = {}
            if subj not in chart_map[m_name]:
                chart_map[m_name][subj] = []
            chart_map[m_name][subj].append(score)

        # Build final chart array
        chart = []
        for m_name in month_names:
            if m_name in chart_map:
                point = {"month": m_name}
                for subj, scores in chart_map[m_name].items():
                    point[subj] = round(sum(scores) / len(scores), 1)
                chart.append(point)

        return {"chart": chart, "summary": summary}


grade_repo = GradeRepository()
