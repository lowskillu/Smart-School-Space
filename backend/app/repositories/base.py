"""Generic base repository with common CRUD operations.

Usage:
    class UserRepository(BaseRepository[User]):
        model = User

        def get_by_email(self, email: str) -> User | None:
            return self.model.query.filter_by(email=email).first()
"""
from __future__ import annotations

from typing import Generic, TypeVar

from ..extensions import db
from ..core.errors import NotFoundError

T = TypeVar("T", bound=db.Model)  # type: ignore[name-defined]


class BaseRepository(Generic[T]):
    model: type[T]

    # ── Read ────────────────────────────────────────────────────────────────

    def get_by_id(self, id: str) -> T | None:
        return db.session.get(self.model, id)

    def get_by_id_or_404(self, id: str) -> T:
        obj = self.get_by_id(id)
        if obj is None:
            raise NotFoundError(self.model.__name__, id)
        return obj

    def list_all(self) -> list[T]:
        return self.model.query.all()

    def filter_by(self, **kwargs) -> list[T]:
        return self.model.query.filter_by(**kwargs).all()

    def first_by(self, **kwargs) -> T | None:
        return self.model.query.filter_by(**kwargs).first()

    # ── Write ───────────────────────────────────────────────────────────────

    def create(self, commit: bool = True, **kwargs) -> T:
        obj = self.model(**kwargs)  # type: ignore[call-arg]
        db.session.add(obj)
        if commit:
            db.session.commit()
        else:
            db.session.flush()
        return obj

    def save(self, obj: T, commit: bool = True) -> T:
        db.session.add(obj)
        if commit:
            db.session.commit()
        return obj

    def delete(self, obj: T, commit: bool = True) -> None:
        db.session.delete(obj)
        if commit:
            db.session.commit()

    def delete_by_id(self, id: str) -> bool:
        obj = self.get_by_id(id)
        if obj is None:
            return False
        self.delete(obj)
        return True
