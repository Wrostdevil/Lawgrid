"""Lazy Supabase clients.

Creating a Supabase client at import time makes the entire API impossible to
start without cloud credentials. These helpers only construct a client when the
required environment variables are present, and raise a clear error otherwise.
"""

from typing import Optional

from supabase import Client, create_client

from app.core.config import settings


def _build_client(key: str, *, admin: bool) -> Optional[Client]:
    if not settings.SUPABASE_URL or not key:
        return None
    try:
        return create_client(settings.SUPABASE_URL, key)
    except Exception:  # pragma: no cover - surfaced when the client is used
        if admin:
            raise
        return None


# Respects RLS when used with a user token in the future.
supabase: Optional[Client] = _build_client(
    settings.SUPABASE_ANON_KEY, admin=False
)

# Bypasses RLS. Only used by trusted backend operations.
supabase_admin: Optional[Client] = _build_client(
    settings.SUPABASE_SERVICE_ROLE_KEY, admin=True
)


def require_supabase_admin() -> Client:
    if supabase_admin is None:
        raise RuntimeError(
            "Supabase is not configured. Set SUPABASE_URL and "
            "SUPABASE_SERVICE_ROLE_KEY to use marketplace features."
        )
    return supabase_admin
