from app import create_app
from app.extensions import db
from app.models import Permission, Role, RolePermission

def seed():
    app = create_app()
    with app.app_context():
        # Define permissions
        perms = [
            # Tabs
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
            
            # Actions
            ("action_edit_grades", "Ability to modify student grades"),
            ("action_delete_users", "Ability to remove user accounts"),
            ("action_modify_schedule", "Ability to change lesson times/rooms"),
            ("action_manage_essays", "Ability to review and feedback on essays"),
            ("action_export_reports", "Ability to export PDFs and Excel reports")
        ]
        
        created_perms = {}
        for code, desc in perms:
            perm = Permission.query.filter_by(code=code).first()
            if not perm:
                perm = Permission(code=code, description=desc)
                db.session.add(perm)
                print(f"Created permission: {code}")
            created_perms[code] = perm
            
        db.session.commit()
        
        # Default assignments for Admin
        admin_role = Role.query.filter_by(name="admin").first()
        if admin_role:
            for perm in Permission.query.all():
                rp = RolePermission.query.filter_by(role_id=admin_role.id, permission_id=perm.id).first()
                if not rp:
                    rp = RolePermission(role_id=admin_role.id, permission_id=perm.id)
                    db.session.add(rp)
            print("Assigned all permissions to Admin role")
            
        # Default assignments for Teacher
        teacher_role = Role.query.filter_by(name="teacher").first()
        if teacher_role:
            teacher_perms = [
                "tab_dashboard", "tab_attendance", "tab_schedule", "tab_marks", 
                "tab_communication", "tab_meals", "tab_services", "tab_university_prep",
                "action_edit_grades", "tab_alumni"
            ]
            for code in teacher_perms:
                if code in created_perms:
                    p = created_perms[code]
                    rp = RolePermission.query.filter_by(role_id=teacher_role.id, permission_id=p.id).first()
                    if not rp:
                        rp = RolePermission(role_id=teacher_role.id, permission_id=p.id)
                        db.session.add(rp)
            print("Assigned basic permissions to Teacher role")

        # Default assignments for Student
        student_role = Role.query.filter_by(name="student").first()
        if student_role:
            student_perms = [
                "tab_dashboard", "tab_schedule", "tab_marks", "tab_attendance", 
                "tab_admissions", "tab_communication", "tab_services"
            ]
            for code in student_perms:
                if code in created_perms:
                    p = created_perms[code]
                    rp = RolePermission.query.filter_by(role_id=student_role.id, permission_id=p.id).first()
                    if not rp:
                        rp = RolePermission(role_id=student_role.id, permission_id=p.id)
                        db.session.add(rp)
            print("Assigned basic permissions to Student role")

        db.session.commit()
        print("Seeding complete.")

if __name__ == "__main__":
    seed()
