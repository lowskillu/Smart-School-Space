"""Simple in-process cache using functools.lru_cache and a TTL wrapper.

Flask-Caching is not available offline, so we implement a lightweight
time-aware cache for read-heavy endpoints (subjects, classes, rooms, food items).

Usage:
    from app.core.cache import timed_cache, invalidate_cache

    @timed_cache(ttl=300, key="all_subjects")
    def get_subjects(): ...

    invalidate_cache("all_subjects")   # call after a write mutation
"""
from __future__ import annotations

import time
from typing import Any, Callable, TypeVar

F = TypeVar("F", bound=Callable[..., Any])

_store: dict[str, tuple[Any, float]] = {}  # key → (value, expires_at)


def timed_cache(ttl: int = 300, key: str | None = None) -> Callable[[F], F]:
    """Decorator: cache the function result for ``ttl`` seconds.

    Args:
        ttl: Time-to-live in seconds.
        key: Explicit cache key. Defaults to ``<module>.<qualname>``.
    """
    def decorator(fn: F) -> F:
        cache_key = key or f"{fn.__module__}.{fn.__qualname__}"

        def wrapper(*args, **kwargs):
            now = time.monotonic()
            entry = _store.get(cache_key)
            if entry is not None:
                value, expires_at = entry
                if now < expires_at:
                    return value
            result = fn(*args, **kwargs)
            _store[cache_key] = (result, now + ttl)
            return result

        wrapper.__wrapped__ = fn  # type: ignore[attr-defined]
        return wrapper  # type: ignore[return-value]

    return decorator


def invalidate_cache(*keys: str) -> None:
    """Remove the given keys from the cache (e.g. after a write)."""
    for k in keys:
        _store.pop(k, None)


def invalidate_all() -> None:
    """Clear the entire cache (useful in tests)."""
    _store.clear()
