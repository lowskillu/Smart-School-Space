import time
import threading
from datetime import datetime, timedelta
from ..extensions import db
from ..models import Course, CourseSchedule, CourseEnrollment, Message, Chat, ChatMember, User
from flask import current_app

def send_notification(app, user_id, course_title, minutes_left):
    with app.app_context():
        # Find or create a system chat with the user
        # In this app, we can just send a message from a "System" or the teacher
        # Let's send it as a message in a private chat between teacher and student, 
        # or just a general notification if we had a notification table.
        # Since we only have Chat/Message, let's find the private chat or create one.
        
        # For now, let's just log it or send a message if possible.
        # Actually, let's just create a 'System' message in their private chat.
        print(f"NOTIFICATION for {user_id}: Course '{course_title}' starts in {minutes_left} minutes!")

def check_course_notifications(app):
    # Keep track of sent notifications to avoid duplicates in the same minute
    # Format: (course_id, session_date, minutes_threshold)
    sent_notifications = set()

    while True:
        with app.app_context():
            try:
                now = datetime.now()
                today_date = now.date()
                today_weekday = now.weekday() # 0=Mon
                current_time_str = now.strftime("%H:%M")
                
                # Check for sessions in the next 65 minutes
                schedules = CourseSchedule.query.all()
                
                for s in schedules:
                    # Check if session is today
                    is_today = False
                    if s.day_of_week is not None:
                        if s.day_of_week == today_weekday:
                            # Check date range
                            if s.start_date <= today_date and (s.end_date is None or s.end_date >= today_date):
                                is_today = True
                    else:
                        if s.start_date == today_date:
                            is_today = True
                    
                    if is_today:
                        # Calculate time difference
                        sched_hour, sched_min = map(int, s.start_time.split(':'))
                        sched_datetime = datetime.combine(today_date, datetime.min.time()).replace(hour=sched_hour, minute=sched_min)
                        
                        diff = (sched_datetime - now).total_seconds() / 60
                        
                        thresholds = [60, 30, 5]
                        for t in thresholds:
                            # If we are within [t-1, t] minutes of the start
                            if t - 1 <= diff <= t:
                                notification_key = (s.course_id, today_date, t)
                                if notification_key not in sent_notifications:
                                    # Send notifications to all enrolled students
                                    course = db.session.get(Course, s.course_id)
                                    enrollments = CourseEnrollment.query.filter_by(course_id=s.course_id).all()
                                    for enr in enrollments:
                                        send_notification(app, enr.student_id, course.title, t)
                                    
                                    sent_notifications.add(notification_key)
                
                # Clean up old sent_notifications (older than today)
                sent_notifications = {k for k in sent_notifications if k[1] == today_date}
                
            except Exception as e:
                print(f"Error in course notification worker: {e}")
                
        time.sleep(30) # Check every 30 seconds

def start_notification_service(app):
    thread = threading.Thread(target=check_course_notifications, args=(app,))
    thread.daemon = True
    thread.start()
    return thread
