"""Language switching endpoint."""

from flask import jsonify, request, session
from . import api_bp

SUPPORTED_LANGUAGES = ["ru", "en", "kk", "es", "zh"]


@api_bp.route("/set-lang/<lang>", methods=["POST"])
def set_lang(lang):
    if lang not in SUPPORTED_LANGUAGES:
        return jsonify({"error": f"Unsupported language: {lang}"}), 400
    session["lang"] = lang
    return jsonify({"lang": lang})


@api_bp.route("/current-lang", methods=["GET"])
def current_lang():
    return jsonify({"lang": session.get("lang", "ru")})
