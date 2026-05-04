"""Authentication service — login, refresh, current_user logic."""
from __future__ import annotations

from werkzeug.security import check_password_hash

from ..core.errors import AuthError, NotFoundError
from ..core.logging_cfg import get_logger
from ..core.security import make_tokens
from ..repositories.user_repo import user_repo
from ..schemas.auth import TokenResponse, UserOut

logger = get_logger(__name__)


class AuthService:

    def login(self, email: str, password: str) -> dict:
        """Validate credentials and return access + refresh tokens.

        Returns:
            dict suitable for JSON serialisation with TokenResponse shape.

        Raises:
            AuthError: if credentials are invalid.
        """
        user = user_repo.get_by_email(email.strip().lower())
        if not user or not check_password_hash(user.password_hash, password):
            logger.warning("Failed login attempt for email=%s", email)
            raise AuthError("Invalid email or password.")

        permissions = [rp.permission.code for rp in user.role.permissions] if user.role else []
        role_name = user.role.name if user.role else "student"

        tokens = make_tokens(user.id, role_name, permissions)

        user_out = {
            "id": user.id,
            "name": user.name,
            "email": user.email,
            "role": role_name,
            "role_id": user.role_id or "",
            "permissions": permissions,
            "teacher_id": user.teacher_id,
            "student_id": user.student_id,
        }

        logger.info("User logged in: %s (role=%s)", user.email, role_name)
        return {**tokens, "user": user_out}

    def get_user_dict(self, user_id: str) -> dict:
        """Return the current user as a dict (for /auth/me)."""
        user = user_repo.get_with_permissions(user_id)
        if not user:
            raise NotFoundError("User", user_id)
        permissions = [rp.permission.code for rp in user.role.permissions] if user.role else []
        return {
            "id": user.id,
            "name": user.name,
            "email": user.email,
            "role": user.role.name if user.role else "student",
            "role_id": user.role_id or "",
            "permissions": permissions,
            "teacher_id": user.teacher_id,
            "student_id": user.student_id,
        }


auth_service = AuthService()
