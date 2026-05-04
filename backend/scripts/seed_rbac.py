import os
import sys

# Add the parent directory to sys.path to allow importing from 'app'
sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), '..')))

from app import create_app
from app.extensions import db
from app.models import Permission, Role, RolePermission, User
from werkzeug.security import generate_password_hash

def seed():
    app = create_app()
    with app.app_context():
        # 1. Create Permissions
        permissions_data = [
            ("view_attendance", "Can view attendance logs"),
            ("edit_grades", "Can edit student grades"),
            ("manage_essays", "Can submit and edit essays"),
            ("view_face_id_logs", "Can monitor school entry/exit logs"),
            ("manage_users", "Can manage school accounts and roles"),
            ("edit_schedule", "Can manage the school schedule"),
            ("view_analytics", "Can view school-wide analytics"),
            ("view_student_profiles", "Can view detailed student information"),
        ]

        perms = {}
        for code, desc in permissions_data:
            perm = Permission.query.filter_by(code=code).first()
            if not perm:
                perm = Permission(code=code, description=desc)
                db.session.add(perm)
                print(f"Created permission: {code}")
            perms[code] = perm

        db.session.commit()

        # 2. Create Roles
        roles_data = {
            "Admin": list(perms.keys()),
            "Teacher": ["view_attendance", "edit_grades", "edit_schedule", "view_analytics"],
            "Student": ["manage_essays", "view_attendance"],
            "Curator": ["view_attendance", "view_face_id_logs", "view_student_profiles", "view_analytics"]
        }

        role_objs = {}
        for role_name, role_perms in roles_data.items():
            role = Role.query.filter_by(name=role_name).first()
            if not role:
                role = Role(name=role_name)
                db.session.add(role)
                db.session.commit()
                print(f"Created role: {role_name}")
            
            role_objs[role_name] = role

            # Add Permissions to Role
            for p_code in role_perms:
                p_id = perms[p_code].id
                rp = RolePermission.query.filter_by(role_id=role.id, permission_id=p_id).first()
                if not rp:
                    rp = RolePermission(role_id=role.id, permission_id=p_id)
                    db.session.add(rp)
                    print(f"Added permission {p_code} to role {role_name}")
        
        db.session.commit()

        # 3. Create a test Admin user if not exists
        admin_email = "admin@smartschool.ai"
        admin_user = User.query.filter_by(email=admin_email).first()
        if not admin_user:
            admin_user = User(
                email=admin_email,
                name="System Administrator",
                password_hash=generate_password_hash("admin123"),
                role_id=role_objs["Admin"].id
            )
            db.session.add(admin_user)
            print(f"Created admin user: {admin_email}")
        
        db.session.commit()
        print("Seeding complete!")

if __name__ == "__main__":
    seed()
