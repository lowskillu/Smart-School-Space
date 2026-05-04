from flask import jsonify, request
from . import api_bp
from ..models import db, SchoolCalendar
from ..core.security import require_role, jwt_required
from datetime import datetime

@api_bp.route('/calendar', methods=['GET'])
@jwt_required
def get_calendar():
    start_date = request.args.get('start_date')
    end_date = request.args.get('end_date')
    
    query = SchoolCalendar.query
    if start_date:
        query = query.filter(SchoolCalendar.date >= start_date)
    if end_date:
        query = query.filter(SchoolCalendar.date <= end_date)
        
    events = query.all()
    return jsonify([e.to_dict() for e in events])

@api_bp.route('/calendar', methods=['POST'])
@jwt_required
@require_role('admin')
def update_calendar():
    data = request.json
    date_str = data.get('date')
    type_str = data.get('type') # category
    color = data.get('color')
    description = data.get('description')
    
    if not date_str:
        return jsonify({'error': 'Date is required'}), 400
        
    entry = SchoolCalendar.query.filter_by(date=date_str).first()
    
    if type_str == 'clear':
        if entry:
            db.session.delete(entry)
            db.session.commit()
        return jsonify({'status': 'deleted'})
        
    if not entry:
        entry = SchoolCalendar(date=date_str)
        db.session.add(entry)
        
    entry.type = type_str
    entry.color = color
    entry.description = description
    db.session.commit()
    
    return jsonify(entry.to_dict())

@api_bp.route('/calendar/batch', methods=['POST'])
@jwt_required
@require_role('admin')
def batch_update_calendar():
    data = request.json
    dates = data.get('dates', [])
    type_str = data.get('type')
    color = data.get('color')
    description = data.get('description')
    
    for date_str in dates:
        entry = SchoolCalendar.query.filter_by(date=date_str).first()
        if type_str == 'clear':
            if entry:
                db.session.delete(entry)
        else:
            if not entry:
                entry = SchoolCalendar(date=date_str)
                db.session.add(entry)
            entry.type = type_str
            entry.color = color
            entry.description = description
            
    db.session.commit()
    return jsonify({'status': 'success'})
