from flask import jsonify, request
from . import api_bp
from ..extensions import db
from ..models import AlumniRecord
from ..core.security import jwt_required

@api_bp.route("/alumni", methods=["GET"])
@jwt_required
def get_alumni():
    alumni = AlumniRecord.query.order_by(AlumniRecord.graduation_year.desc()).all()
    return jsonify([a.to_dict() for a in alumni]), 200

@api_bp.route("/alumni", methods=["POST"])
@jwt_required
def create_alumni_record():
    data = request.get_json() or {}
    
    new_alumni = AlumniRecord(
        name=data.get("name"),
        graduation_year=data.get("graduation_year"),
        college_name=data.get("college_name"),
        major=data.get("major"),
        essay_title=data.get("essay_title"),
        essay_content=data.get("essay_content"),
        image_url=data.get("image_url")
    )
    
    db.session.add(new_alumni)
    db.session.commit()
    
    return jsonify(new_alumni.to_dict()), 201
