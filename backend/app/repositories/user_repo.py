"""User repository — optimised queries with eager loading to prevent N+1."""
from __future__ import annotations

from sqlalchemy.orm import joinedload

from ..extensions import db
from ..models import Role, RolePermission, User
from .base import BaseRepository


class UserRepository(BaseRepository[User]):
    model = User

    def get_by_email(self, email: str) -> User | None:
        """Exact match on indexed email column — O(log n)."""
        return User.query.filter_by(email=email).first()

    def get_with_permissions(self, user_id: str) -> User | None:
        """Single query that eagerly loads role + permissions.
        Eliminates the 2-query N+1 on every /auth/me call.
        """
        return (
            User.query
            .options(
                joinedload(User.role).joinedload(Role.permissions)
                .joinedload(RolePermission.permission)
            )
            .filter_by(id=user_id)
            .first()
        )


# Module-level singleton — import and use directly in services
user_repo = UserRepository()
