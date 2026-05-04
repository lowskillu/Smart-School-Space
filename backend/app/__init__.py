"""Flask application factory."""
from __future__ import annotations

import os

from flask import Flask, session, request
from flask_cors import CORS

from .extensions import db, babel, jwt
from .core.logging_cfg import configure_logging, get_logger
from .core.handlers import register_error_handlers
from .core.security import setup_jwt_callbacks

logger = get_logger(__name__)

SUPPORTED_LANGUAGES = ["ru", "en", "kk", "es", "zh"]


def get_locale():
    """Determine the best locale for the current request."""
    if "lang" in session:
        return session["lang"]
    return request.accept_languages.best_match(SUPPORTED_LANGUAGES, default="ru")


def create_app(config_name: str | None = None) -> Flask:
    configure_logging()

    app = Flask(__name__, instance_relative_config=True)

    # ── Config ─────────────────────────────────────────────────────────────
    if config_name is None:
        config_name = os.environ.get("FLASK_CONFIG", "config.DevelopmentConfig")
    app.config.from_object(config_name)

    # Ensure instance dir exists
    os.makedirs(app.instance_path, exist_ok=True)

    # ── Extensions ──────────────────────────────────────────────────────────
    db.init_app(app)
    babel.init_app(app, locale_selector=get_locale)
    jwt.init_app(app)

    # CORS — allow the Vite dev server + Production URL from env
    allowed_origins = [
        "http://localhost:8080",
        "http://127.0.0.1:8080",
        "http://localhost:5173",  # Default Vite port
        "http://127.0.0.1:5173",
    ]
    env_origin = os.environ.get("FRONTEND_URL")
    if env_origin:
        allowed_origins.append(env_origin)

    CORS(app, supports_credentials=True, origins=allowed_origins)

    # ── JWT callbacks (token blacklist, error responses) ───────────────────
    setup_jwt_callbacks(jwt)

    # ── Global error handlers ──────────────────────────────────────────────
    register_error_handlers(app)

    # ── Blueprints ─────────────────────────────────────────────────────────
    from .api import api_bp
    app.register_blueprint(api_bp, url_prefix="/api")

    # ── File Uploads ───────────────────────────────────────────────────────
    upload_dir = os.path.join(os.path.dirname(os.path.dirname(__file__)), "uploads")
    os.makedirs(upload_dir, exist_ok=True)
    app.config["UPLOAD_FOLDER"] = upload_dir

    from flask import send_from_directory
    @app.route("/uploads/<path:filename>")
    def serve_upload(filename):
        return send_from_directory(upload_dir, filename)

    # ── Database ───────────────────────────────────────────────────────────
    with app.app_context():
        from . import models  # noqa: F401 — ensure models are registered
        db.create_all()
        logger.info("Database tables verified/created.")

    logger.info("SmartSchool API started. Config: %s", config_name)
    
    # Start background services
    from .services.course_notifications import start_notification_service
    start_notification_service(app)
    
    return app
