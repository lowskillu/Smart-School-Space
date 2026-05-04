"""API Blueprint — aggregates all resource routers."""

from flask import Blueprint

api_bp = Blueprint("api", __name__)

from . import subjects, teachers, rooms, classes, students, schedule, attendance, grades, documents, i18n, uni_prep, admin, staffing, auth, meals, assignments, courses, announcements, alumni, communication, calendar, mock_tests  # noqa: E402, F401
