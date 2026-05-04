from flask import jsonify, request, current_app
from ..extensions import db
from ..models import Chat, ChatMember, Message, User, Role, Student, Teacher, Meeting, MeetingParticipant, ClassGroup
from . import api_bp
from ..core.security import jwt_required, get_current_user_id
from datetime import datetime, timedelta
import os
import json
import secrets
import string
from werkzeug.utils import secure_filename

@api_bp.route("/chats", methods=["GET"])
@jwt_required
def get_user_chats():
    user_id = get_current_user_id()
    # Get all chats where user is a member
    memberships = ChatMember.query.filter_by(user_id=user_id).all()
    chats = []
    for m in memberships:
        chat = m.chat
        chat_dict = chat.to_dict()
        
        # For private chats, find the other member's name
        if not chat.is_group:
            other_member = ChatMember.query.filter(
                ChatMember.chat_id == chat.id,
                ChatMember.user_id != user_id
            ).first()
            if other_member and other_member.user:
                chat_dict["name"] = other_member.user.name
                chat_dict["other_user_id"] = other_member.user.id
            elif other_member:
                chat_dict["name"] = "Deleted User"
                chat_dict["other_user_id"] = other_member.user_id
        
        # Get last message
        last_msg = Message.query.filter_by(chat_id=chat.id).order_by(Message.created_at.desc()).first()
        chat_dict["last_message"] = last_msg.to_dict() if last_msg else None
        
        # Unread count
        unread_count = Message.query.filter_by(chat_id=chat.id, is_read=False).filter(Message.sender_id != user_id).count()
        chat_dict["unread_count"] = unread_count
        
        chats.append(chat_dict)
    
    # Sort by last message time
    chats.sort(key=lambda x: x["last_message"]["created_at"] if x["last_message"] else x["created_at"], reverse=True)
    return jsonify(chats), 200

@api_bp.route("/chats", methods=["POST"])
@jwt_required
def create_chat():
    user_id = get_current_user_id()
    data = request.get_json(force=True) or {}
    is_group = data.get("is_group", False)
    name = data.get("name")
    participant_ids = data.get("participant_ids", []) # List of user IDs

    if not is_group:
        if not participant_ids:
            return jsonify({"error": "Other participant ID required for private chat"}), 400
        
        other_user_id = participant_ids[0]
        # Check if private chat already exists
        existing_chat = db.session.query(Chat).join(ChatMember).filter(
            Chat.is_group == False
        ).filter(Chat.id.in_(
            db.session.query(ChatMember.chat_id).filter_by(user_id=user_id)
        )).filter(Chat.id.in_(
            db.session.query(ChatMember.chat_id).filter_by(user_id=other_user_id)
        )).first()
        
        if existing_chat:
            return jsonify(existing_chat.to_dict()), 200

    # Create new chat
    new_chat = Chat(is_group=is_group, name=name)
    db.session.add(new_chat)
    db.session.flush() # Get ID

    # Add creator
    db.session.add(ChatMember(chat_id=new_chat.id, user_id=user_id))
    
    # Add participants
    for p_id in participant_ids:
        if p_id != user_id:
            db.session.add(ChatMember(chat_id=new_chat.id, user_id=p_id))
    
    db.session.commit()
    return jsonify(new_chat.to_dict()), 201

@api_bp.route("/chats/<string:chat_id>/messages", methods=["GET"])
@jwt_required
def get_chat_messages(chat_id):
    user_id = get_current_user_id()
    messages = Message.query.filter_by(chat_id=chat_id).order_by(Message.created_at.asc()).all()
    
    # Mark as read
    Message.query.filter_by(chat_id=chat_id, is_read=False).filter(Message.sender_id != user_id).update({"is_read": True})
    db.session.commit()

    # Filter out messages deleted for this user
    result = []
    for m in messages:
        deleted_for = json.loads(m.deleted_for) if m.deleted_for else []
        if user_id not in deleted_for:
            result.append(m.to_dict())
            
    return jsonify(result), 200

@api_bp.route("/chats/<string:chat_id>/messages", methods=["POST"])
@jwt_required
def send_message(chat_id):
    user_id = get_current_user_id()
    data = request.get_json(force=True) or {}
    
    msg = Message(
        chat_id=chat_id,
        sender_id=user_id,
        content=data.get("content") or "",
        file_url=data.get("file_url"),
        file_type=data.get("file_type")
    )
    db.session.add(msg)
    db.session.commit()
    return jsonify(msg.to_dict()), 201

@api_bp.route("/chats/<string:chat_id>/messages/<string:message_id>", methods=["PATCH"])
@jwt_required
def update_message(chat_id, message_id):
    user_id = get_current_user_id()
    data = request.get_json(force=True) or {}
    msg = Message.query.get_or_404(message_id)
    
    # Only sender can edit content
    if "content" in data and msg.sender_id == user_id:
        msg.content = data["content"]
        msg.is_edited = True
        
    # Anyone in chat can pin (or we can restrict to admins later)
    if "is_pinned" in data:
        msg.is_pinned = data["is_pinned"]
        
    db.session.commit()
    return jsonify(msg.to_dict()), 200

@api_bp.route("/chats/<string:chat_id>/messages/<string:message_id>", methods=["DELETE"])
@jwt_required
def delete_message(chat_id, message_id):
    user_id = get_current_user_id()
    msg = Message.query.get_or_404(message_id)
    
    # Query param: type=everyone or type=me (default)
    delete_type = request.args.get("type", "me")

    if delete_type == "everyone":
        if msg.sender_id != user_id:
            return jsonify({"error": "Only sender can delete for everyone"}), 403
        db.session.delete(msg)
    else:
        # Delete for me
        deleted_for = json.loads(msg.deleted_for) if msg.deleted_for else []
        if user_id not in deleted_for:
            deleted_for.append(user_id)
            msg.deleted_for = json.dumps(deleted_for)
            
    db.session.commit()
    return jsonify({"message": "Deleted"}), 200

@api_bp.route("/users/search", methods=["GET"])
@jwt_required
def search_users():
    query_str = request.args.get("q", "")
    role_filter = request.args.get("role")
    class_id = request.args.get("class_id")
    
    q = User.query
    if query_str:
        q = q.filter(User.name.ilike(f"%{query_str}%"))
    
    if role_filter:
        role = Role.query.filter_by(name=role_filter).first()
        if role:
            q = q.filter_by(role_id=role.id)
            
    if class_id:
        # Join with Student to filter by class
        q = q.join(Student, User.student_id == Student.id).filter(Student.class_id == class_id)
        
    users = q.limit(20).all()
    return jsonify([u.to_dict() for u in users]), 200

# Optional: Upload endpoint
@api_bp.route("/communication/upload", methods=["POST"])
@jwt_required
def upload_chat_file():
    if 'file' not in request.files:
        return jsonify({"error": "No file part"}), 400
    file = request.files['file']
    if file.filename == '':
        return jsonify({"error": "No selected file"}), 400
    
    if file:
        filename = secure_filename(file.filename)
        # Add timestamp to avoid collisions
        filename = f"{int(datetime.utcnow().timestamp())}_{filename}"
        upload_folder = os.path.join(current_app.root_path, 'static', 'uploads', 'chats')
        os.makedirs(upload_folder, exist_ok=True)
        file.save(os.path.join(upload_folder, filename))
        
        file_url = f"/static/uploads/chats/{filename}"
        return jsonify({"file_url": file_url}), 200

# ──────────────────────────── Meetings ──────────────────────────────

@api_bp.route("/meetings", methods=["GET"])
@jwt_required
def get_user_meetings():
    user_id = get_current_user_id()
    now = datetime.utcnow()
    
    # Auto-cleanup expired meetings
    all_active = Meeting.query.filter_by(is_active=True).all()
    for m in all_active:
        base_time = m.started_at or m.scheduled_time
        if base_time:
            # Ensure base_time is naive if now is naive
            if base_time.tzinfo is not None:
                base_time = base_time.replace(tzinfo=None)
            
            end_time = base_time + timedelta(minutes=m.duration)
            if now > end_time:
                m.is_active = False
    db.session.commit()

    # Meetings hosted by me
    hosted = Meeting.query.filter_by(host_id=user_id, is_active=True).all()
    
    # Meetings where I am invited (direct or via class)
    user = User.query.get(user_id)
    class_id = None
    if user.student_id:
        student = Student.query.get(user.student_id)
        if student:
            class_id = student.class_id

    invited_q = Meeting.query.join(MeetingParticipant).filter(
        Meeting.is_active == True,
        db.or_(
            MeetingParticipant.user_id == user_id,
            MeetingParticipant.class_id == class_id if class_id else False
        )
    )
    invited = invited_q.all()
    
    # Combine and unique
    all_meetings = list(set(hosted + invited))
    # Sort by scheduled_time
    all_meetings.sort(key=lambda x: x.scheduled_time or x.created_at, reverse=False)
    
    return jsonify([m.to_dict() for m in all_meetings]), 200

@api_bp.route("/meetings", methods=["POST"])
@jwt_required
def create_meeting():
    user_id = get_current_user_id()
    data = request.get_json(force=True) or {}
    title = data.get("title", "New Meeting")
    scheduled_time_str = data.get("scheduled_time")
    duration = data.get("duration", 60)
    participant_ids = data.get("participant_ids", [])
    class_ids = data.get("class_ids", [])
    
    scheduled_time = None
    if scheduled_time_str:
        try:
            # Convert to naive UTC for DB compatibility
            dt = datetime.fromisoformat(scheduled_time_str.replace("Z", "+00:00"))
            scheduled_time = dt.replace(tzinfo=None)
        except:
            pass

    new_meeting = Meeting(
        title=title,
        host_id=user_id,
        scheduled_time=scheduled_time,
        duration=duration,
        password=''.join(secrets.choice(string.ascii_letters + string.digits) for _ in range(12)),
        is_active=True
    )
    db.session.add(new_meeting)
    db.session.flush()
    
    # Add participants
    for p_id in participant_ids:
        db.session.add(MeetingParticipant(meeting_id=new_meeting.id, user_id=p_id))
    
    for c_id in class_ids:
        db.session.add(MeetingParticipant(meeting_id=new_meeting.id, class_id=c_id))
        
    db.session.commit()

    # --- Notification Logic ---
    # Notify individual participants via private chat
    for p_id in participant_ids:
        if p_id == user_id: continue
        # Find or create private chat
        chat = Chat.query.join(ChatMember).filter(Chat.is_group == False).filter(Chat.id.in_(
            db.session.query(ChatMember.chat_id).filter_by(user_id=user_id)
        )).filter(Chat.id.in_(
            db.session.query(ChatMember.chat_id).filter_by(user_id=p_id)
        )).first()

        if not chat:
            # Create a new private chat if none exists
            chat = Chat(is_group=False)
            db.session.add(chat)
            db.session.flush()
            db.session.add(ChatMember(chat_id=chat.id, user_id=user_id))
            db.session.add(ChatMember(chat_id=chat.id, user_id=p_id))
            db.session.flush()
        
        time_str = scheduled_time.strftime("%H:%M") if scheduled_time else "now"
        msg_content = f"📅 Conference Invitation: {title}\nTime: {time_str}\nJoin here: /app/meetings/{new_meeting.room_key}"
        
        db.session.add(Message(
            chat_id=chat.id,
            sender_id=user_id,
            content=msg_content
        ))

    # Notify classes via their group chats (if they exist)
    for c_id in class_ids:
        cls = ClassGroup.query.get(c_id)
        if cls:
            # Find group chat for this class (simplified: search by name)
            group_chat = Chat.query.filter_by(is_group=True, name=cls.name).first()
            if group_chat:
                time_str = scheduled_time.strftime("%H:%M") if scheduled_time else "now"
                msg_content = f"📢 Class Conference: {title}\nTime: {time_str}\nJoin here: /app/meetings/{new_meeting.room_key}"
                db.session.add(Message(
                    chat_id=group_chat.id,
                    sender_id=user_id,
                    content=msg_content
                ))

    db.session.commit()
    return jsonify(new_meeting.to_dict()), 201

@api_bp.route("/meetings/<string:meeting_id>", methods=["DELETE"])
@jwt_required
def close_meeting(meeting_id):
    user_id = get_current_user_id()
    meeting = Meeting.query.get_or_404(meeting_id)
    
    if meeting.host_id != user_id:
        return jsonify({"error": "Only host can close the meeting"}), 403
        
    meeting.is_active = False
    db.session.commit()
    return jsonify({"message": "Meeting closed"}), 200

@api_bp.route("/meetings/<string:meeting_id>", methods=["PATCH"])
@jwt_required
def update_meeting(meeting_id):
    user_id = get_current_user_id()
    meeting = Meeting.query.get_or_404(meeting_id)
    
    if meeting.host_id != user_id:
        return jsonify({"error": "Only host can edit the meeting"}), 403
        
    data = request.get_json(force=True) or {}
    
    if "title" in data:
        meeting.title = data["title"]
    
    if "scheduled_time" in data:
        try:
            dt = datetime.fromisoformat(data["scheduled_time"].replace("Z", "+00:00"))
            meeting.scheduled_time = dt.replace(tzinfo=None)
        except:
            pass

    if "duration" in data:
        meeting.duration = data["duration"]
            
    # Update participants if provided
    if "participant_ids" in data or "class_ids" in data:
        # Clear existing
        MeetingParticipant.query.filter_by(meeting_id=meeting.id).delete()
        
        # Add new ones
        for p_id in data.get("participant_ids", []):
            db.session.add(MeetingParticipant(meeting_id=meeting.id, user_id=p_id))
        for c_id in data.get("class_ids", []):
            db.session.add(MeetingParticipant(meeting_id=meeting.id, class_id=c_id))
            
    db.session.commit()
    return jsonify(meeting.to_dict()), 200

@api_bp.route("/meetings/<string:meeting_id>/start", methods=["POST"])
@jwt_required
def start_meeting(meeting_id):
    meeting = Meeting.query.get_or_404(meeting_id)
    if not meeting.started_at:
        meeting.started_at = datetime.utcnow()
        db.session.commit()
    return jsonify(meeting.to_dict()), 200

@api_bp.route("/meetings/room/<string:room_key>", methods=["GET"])
@jwt_required
def get_meeting_by_room(room_key):
    meeting = Meeting.query.filter_by(room_key=room_key, is_active=True).first_or_404()
    return jsonify(meeting.to_dict()), 200
