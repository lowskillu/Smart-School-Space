from functools import wraps
from flask import abort, session
from ..models import User

def get_current_user_permissions():
    """
    Retrieves permissions for the currently logged-in user.
    Assumes user_id is stored in the session.
    """
    user_id = session.get("user_id")
    if not user_id:
        return []
    
    user = User.query.get(user_id)
    if not user or not user.role:
        return []
    
    return [rp.permission.code for rp in user.role.permissions]

def check_permission(permission_code):
    """Decorator to check if the current user has a specific permission."""
    def decorator(f):
        @wraps(f)
        def decorated_function(*args, **kwargs):
            user_id = session.get("user_id")
            if not user_id:
                abort(401)
            user = User.query.get(user_id)
            if not user or not user.role:
                abort(403)
                
            if user.role.name.lower() == 'admin':
                return f(*args, **kwargs)
                
            user_permissions = [rp.permission.code for rp in user.role.permissions]
            if permission_code not in user_permissions:
                abort(403)
            return f(*args, **kwargs)
        return decorated_function
    return decorator

def admin_required(f):
    """Decorator to check if the current user is an admin."""
    @wraps(f)
    def decorated_function(*args, **kwargs):
        user_id = session.get("user_id")
        if not user_id:
            abort(401)
        user = User.query.get(user_id)
        if not user or not user.role or user.role.name.lower() != 'admin':
            abort(403)
        return f(*args, **kwargs)
    return decorated_function

