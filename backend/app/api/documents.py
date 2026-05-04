from flask import jsonify, request
from ..extensions import db
from ..models import Document, DocumentVersion
from . import api_bp


@api_bp.route("/documents", methods=["GET"])
def list_documents():
    student_id = request.args.get("student_id")
    q = Document.query.order_by(Document.created_at.desc())
    if student_id:
        q = q.filter_by(student_id=student_id)
    rows = q.all()
    return jsonify([r.to_dict() for r in rows])


@api_bp.route("/documents", methods=["POST"])
def create_document():
    data = request.get_json(force=True)
    obj = Document(
        title=data["title"],
        student_id=data.get("student_id"),
        category=data.get("category"),
        status=data.get("status", "draft"),
        file_path=data.get("file_path"),
        file_type=data.get("file_type"),
        uploaded_by=data.get("uploaded_by"),
    )
    db.session.add(obj)
    db.session.commit()
    return jsonify(obj.to_dict()), 201


@api_bp.route("/documents/<string:id>/status", methods=["PATCH"])
def update_document_status(id):
    data = request.get_json(force=True)
    obj = db.session.get(Document, id)
    if not obj:
        return jsonify({"error": "not found"}), 404
    obj.status = data["status"]
    db.session.commit()
    return jsonify(obj.to_dict())


@api_bp.route("/document_versions", methods=["GET"])
def list_document_versions():
    document_id = request.args.get("document_id")
    if not document_id:
        return jsonify([])
    rows = (
        DocumentVersion.query
        .filter_by(document_id=document_id)
        .order_by(DocumentVersion.version_number.desc())
        .all()
    )
    return jsonify([r.to_dict() for r in rows])
