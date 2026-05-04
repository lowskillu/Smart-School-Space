#!/usr/bin/env python3
import os
import sys
import uuid

# Add backend to path
sys.path.insert(0, os.path.dirname(__file__))

from app import create_app
from app.extensions import db
from app.models import Role, Permission, RolePermission

def _uuid():
    return str(uuid.uuid4())

ALL_PERMISSIONS = [
    ("view_attendance", "View attendance records"),
    ("edit_attendance", "Mark / edit attendance"),
    ("view_grades", "View grade book"),
    ("edit_grades", "Edit grades"),
    ("manage_essays", "Manage college essays"),
    ("view_face_id_logs", "View face recognition logs"),
    ("manage_users", "Create / edit / delete users"),
    ("edit_schedule", "Edit timetable"),
    ("view_analytics", "View analytics dashboards"),
    ("view_student_profiles", "View student profile details"),
]

ROLE_PERMISSIONS = {
    "admin": [p[0] for p in ALL_PERMISSIONS],
    "teacher": [
        "view_attendance", "edit_attendance",
        "view_grades", "edit_grades",
        "edit_schedule", "view_analytics",
    ],
    "student": [
        "manage_essays", "view_attendance", "view_grades",
    ],
    "counselor": [
        "manage_essays", "view_analytics",
        "view_student_profiles",
    ],
    "curator": [
        "view_attendance", "view_face_id_logs",
        "view_student_profiles", "view_analytics",
    ],
}

def sync():
    app = create_app()
    with app.app_context():
        print("🔐 Syncing RBAC permissions...")
        
        # 1. Ensure all permissions exist
        perm_objs = {}
        for code, desc in ALL_PERMISSIONS:
            p = Permission.query.filter_by(code=code).first()
            if not p:
                p = Permission(id=_uuid(), code=code, description=desc)
                db.session.add(p)
                print(f"   [+] Permission created: {code}")
            else:
                p.description = desc
            perm_objs[code] = p
        
        db.session.flush()

        # 2. Ensure all roles exist and have correct permissions
        for role_name, perm_codes in ROLE_PERMISSIONS.items():
            role = Role.query.filter_by(name=role_name).first()
            if not role:
                role = Role(id=_uuid(), name=role_name)
                db.session.add(role)
                print(f"   [+] Role created: {role_name}")
            
            db.session.flush()

            # Clear existing role-permissions for this role to avoid duplicates/stale perms
            RolePermission.query.filter_by(role_id=role.id).delete()
            
            # Re-add correct permissions
            for code in perm_codes:
                p = perm_objs[code]
                rp = RolePermission(id=_uuid(), role_id=role.id, permission_id=p.id)
                db.session.add(rp)
            
            print(f"   [*] Synced permissions for role: {role_name}")

        db.session.commit()
        print("✅ RBAC synchronization complete.")

if __name__ == "__main__":
    sync()
