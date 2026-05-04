
import random
import sys
import os
import uuid

# Ensure we can import from the app directory
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

from faker import Faker
from werkzeug.security import generate_password_hash
from app import create_app
from app.extensions import db
from app.models import Role, User, Student, Teacher, ClassGroup, Subject, Permission, RolePermission, Room, TeacherSubject, ScheduleEntry, GradeSubject, TeacherWorkload

fake = Faker(['ru_RU', 'en_US'])

def seed():
    app = create_app()
    with app.app_context():
        print("🧹 Clearing existing data...")
        # Clear in correct order
        db.session.query(ScheduleEntry).delete()
        db.session.query(TeacherWorkload).delete()
        db.session.query(GradeSubject).delete()
        db.session.query(User).delete()
        db.session.query(Student).delete()
        db.session.query(TeacherSubject).delete()
        db.session.query(Teacher).delete()
        db.session.query(ClassGroup).delete()
        db.session.query(Subject).delete()
        db.session.query(Room).delete()
        db.session.query(RolePermission).delete()
        db.session.query(Permission).delete()
        db.session.query(Role).delete()
        db.session.commit()

        print("🚀 Starting Fresh Database Seed...")
        
        db.create_all()

        # 1. Permissions & Roles
        print("🔐 Seeding Permissions & Roles...")
        permissions_data = [
            ("tab_dashboard", "Access Dashboard Tab"),
            ("tab_attendance", "Access Attendance Tab"),
            ("tab_college_prep", "Access College Prep Hub"),
            ("tab_admissions", "Access Admissions Hub"),
            ("tab_communication", "Access Communication/Chat"),
            ("tab_services", "Access Services (Buffet/Canteen)"),
            ("tab_admin_panel", "Access Admin System Hub"),
            ("tab_schedule", "Access Schedule Tab"),
            ("tab_marks", "Access Marks/Grades Tab"),
            ("tab_meals", "Access Meals/Canteen Tab"),
            ("tab_university_prep", "Access University Preparation"),
            ("tab_bell_setup", "Access Bell Schedule Setup"),
            ("tab_counselor_hub", "Access Counselor Hub"),
            ("tab_essay_queue", "Access Essay Review Queue"),
            ("tab_curator_search", "Access Student Locator/Search"),
            ("tab_user_management", "Access User Administration"),
            ("tab_classes_admin", "Access Classes & Groups Admin"),
            ("tab_subjects_admin", "Access Subjects Admin"),
            ("tab_rooms_admin", "Access Classrooms Admin"),
            ("tab_staffing_admin", "Access Staffing/Workload Admin"),
            ("tab_alumni", "Access Alumni Hall of Fame"),
            ("view_grades", "Ability to view student grades"),
            ("edit_grades", "Ability to modify student grades"),
            ("view_attendance", "Ability to view attendance"),
            ("edit_attendance", "Ability to manage attendance"),
            ("action_delete_users", "Ability to remove user accounts"),
            ("action_modify_schedule", "Ability to change lesson times/rooms"),
            ("action_manage_essays", "Ability to review and feedback on essays"),
            ("action_export_reports", "Ability to export PDFs and Excel reports")
        ]

        all_perms = {}
        for code, desc in permissions_data:
            perm = Permission(code=code, description=desc)
            db.session.add(perm)
            db.session.flush()
            all_perms[code] = perm

        role_data = {
            'admin': list(all_perms.keys()),
            'teacher': [
                "tab_dashboard", "tab_attendance", "tab_schedule", "tab_marks", 
                "tab_communication", "tab_meals", "tab_services", "tab_university_prep", 
                "view_grades", "edit_grades", "view_attendance", "edit_attendance", "tab_alumni"
            ],
            'student': [
                "tab_dashboard", "tab_schedule", "tab_marks", "tab_attendance", 
                "tab_admissions", "tab_communication", "tab_services", 
                "view_grades", "view_attendance"
            ],
            'counselor': ["tab_dashboard", "tab_counselor_hub", "tab_essay_queue", "tab_communication", "tab_services", "tab_alumni", "tab_admissions"],
            'curator': ["tab_dashboard", "tab_curator_search", "tab_schedule", "tab_attendance", "tab_communication", "tab_services", "tab_alumni"]
        }
        
        role_map = {}
        for rname, p_codes in role_data.items():
            role = Role(name=rname)
            db.session.add(role)
            db.session.flush()
            role_map[rname] = role
            for code in p_codes:
                if code in all_perms:
                    rp = RolePermission(role_id=role.id, permission_id=all_perms[code].id)
                    db.session.add(rp)
        db.session.commit()

        # 2. Admin
        admin = User(name="System Administrator", email="admin@space.io", password_hash=generate_password_hash("admin123"), role_id=role_map['admin'].id)
        db.session.add(admin)

        # 3. Subjects (User Specs)
        print("📚 Seeding Specialized Subjects...")
        subjects_specs = [
            {"name": "Математика / Алгебра", "code": "MATH", "cat": "Natural Sciences", "staff": 12, "h1_4": 7, "h5_9": 8, "h10_11": 8, "loc": "home"},
            {"name": "Русский язык", "code": "RUS", "cat": "Languages", "staff": 9, "h1_4": 7, "h5_9": 5, "h10_11": 2, "loc": "home"},
            {"name": "Литература / Чтение", "code": "LIT", "cat": "Languages", "staff": 7, "h1_4": 5, "h5_9": 4, "h10_11": 2, "loc": "home"},
            {"name": "Английский язык", "code": "ENG", "cat": "Languages", "staff": 8, "h1_4": 5, "h5_9": 5, "h10_11": 8, "loc": "home"},
            {"name": "Информатика", "code": "CS", "cat": "Technology", "staff": 5, "h1_4": 2, "h5_9": 3, "h10_11": 6, "loc": "CS Lab"},
            {"name": "Бизнес / Экономика", "code": "ECON", "cat": "Social Sciences", "staff": 1, "h1_4": 0, "h5_9": 0, "h10_11": 6, "loc": "home"},
            {"name": "Физика", "code": "PHYS", "cat": "Natural Sciences", "staff": 2, "h1_4": 0, "h5_9": 2, "h10_11": 2, "loc": "Physics Lab"},
            {"name": "Химия", "code": "CHEM", "cat": "Natural Sciences", "staff": 2, "h1_4": 0, "h5_9": 2, "h10_11": 2, "loc": "Chemistry Lab"},
            {"name": "Биология", "code": "BIO", "cat": "Natural Sciences", "staff": 3, "h1_4": 3, "h5_9": 2, "h10_11": 0, "loc": "Biology Lab"},
            {"name": "История и География", "code": "HIST", "cat": "Social Sciences", "staff": 4, "h1_4": 2, "h5_9": 3, "h10_11": 2, "loc": "home"},
            {"name": "Физкультура", "code": "PE", "cat": "Health", "staff": 6, "h1_4": 4, "h5_9": 4, "h10_11": 2, "loc": "Gym"},
            {"name": "ИЗО / Музыка / Труд", "code": "ART", "cat": "Arts", "staff": 4, "h1_4": 4, "h5_9": 1, "h10_11": 0, "loc": "home"},
            {"name": "Классный час", "code": "HR", "cat": "Other", "staff": 3, "h1_4": 1, "h5_9": 1, "h10_11": 0, "loc": "home"},
        ]
        
        subjects_map = {}
        for s in subjects_specs:
            sub = Subject(name=s['name'], code=s['code'], category=s['cat'], credits=5)
            db.session.add(sub)
            db.session.flush()
            subjects_map[s['name']] = sub
            s['model'] = sub
            
            # Populate GradeSubject (Curriculum)
            for g in range(1, 12):
                h = s['h1_4'] if g <= 4 else s['h5_9'] if g <= 9 else s['h10_11']
                if h > 0:
                    gs = GradeSubject(grade_level=g, subject_id=sub.id, hours_per_week=h)
                    db.session.add(gs)
        db.session.commit()

        # 4. Rooms
        print("🏢 Seeding Specialized Rooms...")
        standard_rooms = []
        for floor in range(1, 4):
            for rnum in range(1, 11):
                room = Room(name=f"{floor}{rnum:02d}", capacity=22)
                db.session.add(room)
                db.session.flush()
                standard_rooms.append(room)
        
        special_rooms_map = {}
        special_rooms_cfg = [
            ("Кабинет Информатики 1", 22), ("Кабинет Информатики 2", 22),
            ("Кабинет Физики", 22), ("Кабинет Химии", 22), ("Кабинет Биологии", 22),
            ("Спортзал", 60)
        ]
        for rname, rcap in special_rooms_cfg:
            room = Room(name=rname, capacity=rcap)
            db.session.add(room)
            db.session.flush()
            special_rooms_map[rname] = room

        # 5. Classes
        print("🏫 Creating 25 Classes...")
        classes = []
        for grade in range(1, 12):
            letters = (['А', 'Б'] if grade <= 4 else ['А', 'Б', 'В'] if grade <= 9 else ['А'])
            for letter in letters:
                cls = ClassGroup(name=f"{grade}{letter}", grade_level=grade, capacity=22)
                # Assign home room
                cls.homeroom_id = random.choice(standard_rooms).id
                db.session.add(cls)
                db.session.flush()
                classes.append(cls)
        
        # 6. Teachers (Pools)
        print("👨‍🏫 Seeding 66 Specialized Teachers...")
        teacher_pool = []
        teacher_count = 1
        
        for s in subjects_specs:
            s['teachers'] = []
            for i in range(s['staff']):
                t_email = f"teacher_{teacher_count}@space.io"
                t_name = fake.name()
                
                # Special Case: Petukhova Regina (Teacher 1)
                if teacher_count == 1:
                    t_name = "Петухова Регина Степановна"
                
                teacher = Teacher(id=str(uuid.uuid4()), name=t_name, email=t_email)
                db.session.add(teacher)
                db.session.flush()
                
                user = User(name=t_name, email=t_email, password_hash=generate_password_hash("teacher123"), role_id=role_map['teacher'].id, teacher_id=teacher.id)
                db.session.add(user)
                
                ts = TeacherSubject(teacher_id=teacher.id, subject_id=s['model'].id)
                db.session.add(ts)
                
                s['teachers'].append(teacher)
                teacher_pool.append(teacher)
                teacher_count += 1
        db.session.commit()

        # 7. Students
        print("🧑‍🎓 Seeding 500 Students...")
        total_students = 0
        for cls in classes:
            for _ in range(20):
                s_name = fake.name()
                s_email = f"student_{total_students + 1}@space.io"
                student_id = str(uuid.uuid4())
                student = Student(id=student_id, name=s_name, email=s_email, class_id=cls.id)
                db.session.add(student)
                db.session.flush()
                user = User(name=s_name, email=s_email, password_hash=generate_password_hash("student123"), role_id=role_map['student'].id, student_id=student_id)
                db.session.add(user)
                total_students += 1
            if total_students % 100 == 0: db.session.commit()

        # 8. Curator & Counselor
        counselor = User(name="Senior Counselor", email="counselor@space.io", password_hash=generate_password_hash("counselor123"), role_id=role_map['counselor'].id)
        curator = User(name="School Curator", email="curator@space.io", password_hash=generate_password_hash("curator123"), role_id=role_map['curator'].id)
        db.session.add(counselor)
        db.session.add(curator)

        # 9. SCHEDULE (The Hard Part)
        print("🗓️ Generating 1000 Schedule Entries (8 periods/day per class)...")
        # Map subject loc to actual room objects
        loc_map = {
            "CS Lab": [special_rooms_map["Кабинет Информатики 1"], special_rooms_map["Кабинет Информатики 2"]],
            "Physics Lab": [special_rooms_map["Кабинет Физики"]],
            "Chemistry Lab": [special_rooms_map["Кабинет Химии"]],
            "Biology Lab": [special_rooms_map["Кабинет Биологии"]],
            "Gym": [special_rooms_map["Спортзал"]],
        }

        for cls in classes:
            # Special logic for 1А: Петухова Регина Степановна (Teacher 1) for MATH
            regina = None
            for t in subjects_specs[0]['teachers']:
                if t.email == "teacher_1@space.io":
                    regina = t
                    break

            # Pre-assign one teacher per subject for this class for consistency
            class_subject_teachers = {}
            for s_spec in subjects_specs:
                teacher = random.choice(s_spec['teachers'])
                if cls.name == "1А" and s_spec['code'] == "MATH" and regina:
                    teacher = regina
                class_subject_teachers[s_spec['code']] = teacher
                
                # Create TeacherWorkload entry for the "Active Staff" UI
                h = s_spec['h1_4'] if cls.grade_level <= 4 else s_spec['h5_9'] if cls.grade_level <= 9 else s_spec['h10_11']
                if h > 0:
                    workload = TeacherWorkload(
                        teacher_id=teacher.id,
                        subject_id=s_spec['model'].id,
                        class_id=cls.id,
                        hours_per_week=h
                    )
                    db.session.add(workload)

            # Determine hours for this class
            hours_config = []
            for s in subjects_specs:
                h = s['h1_4'] if cls.grade_level <= 4 else s['h5_9'] if cls.grade_level <= 9 else s['h10_11']
                for _ in range(h):
                    hours_config.append(s)
            
            random.shuffle(hours_config)
            while len(hours_config) < 40:
                hours_config.append(subjects_specs[-1])
            hours_config = hours_config[:40]
            
            # Distribute into 5 days, 8 periods
            idx = 0
            for day in range(5):
                for period in range(8):
                    s_spec = hours_config[idx]
                    idx += 1
                    
                    # Use the pre-assigned teacher
                    teacher = class_subject_teachers[s_spec['code']]
                    
                    # Choose room
                    room_id = cls.homeroom_id
                    if s_spec['loc'] != "home":
                        rooms_available = loc_map.get(s_spec['loc'], [])
                        if rooms_available:
                            room_id = random.choice(rooms_available).id
                    
                    entry = ScheduleEntry(
                        class_id=cls.id,
                        subject_id=s_spec['model'].id,
                        teacher_id=teacher.id,
                        room_id=room_id,
                        day=day,
                        period=period
                    )
                    db.session.add(entry)
            
            if cls.name == "1А":
                print(f"   [OK] Specialized workload & schedule for 1А assigned.")

        db.session.commit()
        print("\n✅ SEEDING COMPLETE WITH FULL SCHEDULE")

if __name__ == "__main__":
    seed()
