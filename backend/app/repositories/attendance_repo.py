"""Attendance repository with upsert and optimised list queries."""
from __future__ import annotations

from sqlalchemy.orm import joinedload

from ..extensions import db
from ..models import Attendance, Student
from ..schemas.attendance import AttendanceUpsert
from .base import BaseRepository


class AttendanceRepository(BaseRepository[Attendance]):
    model = Attendance

    def upsert(self, data: AttendanceUpsert) -> Attendance:
        """Insert or update an attendance record atomically."""
        existing = Attendance.query.filter_by(
            student_id=data.student_id,
            class_id=data.class_id,
            period=data.period,
            day=data.day,
            date=data.date,
        ).first()

        if existing:
            existing.status = data.status
            existing.face_id = data.face_id
            db.session.commit()
            return existing

        new_record = Attendance(
            student_id=data.student_id,
            class_id=data.class_id,
            day=data.day,
            period=data.period,
            date=data.date,
            status=data.status,
            face_id=data.face_id,
        )
        db.session.add(new_record)
        db.session.commit()
        return new_record

    def upsert_batch(self, items: list[AttendanceUpsert]) -> list[Attendance]:
        """Upsert multiple attendance records in a single transaction."""
        results = []
        for data in items:
            existing = Attendance.query.filter_by(
                student_id=data.student_id,
                class_id=data.class_id,
                period=data.period,
                day=data.day,
                date=data.date,
            ).first()
            
            if existing:
                existing.status = data.status
                existing.face_id = data.face_id
                results.append(existing)
            else:
                new_record = Attendance(
                    student_id=data.student_id,
                    class_id=data.class_id,
                    day=data.day,
                    period=data.period,
                    date=data.date,
                    status=data.status,
                    face_id=data.face_id,
                )
                db.session.add(new_record)
                results.append(new_record)
        
        db.session.commit()
        return results

    def list_filtered(
        self,
        class_id: str | None = None,
        student_id: str | None = None,
        day: int | None = None,
        date: str | None = None,
    ) -> list[Attendance]:
        """List attendance records with optional filters."""
        q = Attendance.query
        if class_id:
            q = q.filter_by(class_id=class_id)
        if student_id:
            q = q.filter_by(student_id=student_id)
        if day is not None:
            q = q.filter_by(day=day)
        if date:
            q = q.filter_by(date=date)
        return q.all()


attendance_repo = AttendanceRepository()
