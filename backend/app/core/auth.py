from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from jose import jwt, JWTError, jwk
from app.core.config import settings
import logging
import httpx
import time
from typing import Optional, Dict, Any

logger = logging.getLogger(__name__)

# Cache for JWKS (Public Keys)
_jwks_cache: Optional[Dict[str, Any]] = None
_jwks_last_fetch: float = 0
JWKS_CACHE_TTL = 3600  # 1 hour


async def get_jwks() -> Optional[Dict[str, Any]]:
    global _jwks_cache, _jwks_last_fetch
    now = time.time()

    if _jwks_cache and (now - _jwks_last_fetch < JWKS_CACHE_TTL):
        return _jwks_cache

    if not settings.SUPABASE_URL:
        return None

    try:
        jwks_url = f"{settings.SUPABASE_URL.rstrip('/')}/auth/v1/.well-known/jwks.json"
        async with httpx.AsyncClient(timeout=10.0) as client:
            response = await client.get(jwks_url)
            if response.status_code == 200:
                _jwks_cache = response.json()
                _jwks_last_fetch = now
                logger.info("Successfully fetched and cached Supabase JWKS.")
                return _jwks_cache
            else:
                logger.error(f"Failed to fetch JWKS: {response.status_code} - {response.text}")
    except Exception as e:
        logger.error(f"Error fetching JWKS: {str(e)}")

    return _jwks_cache  # Return stale cache if fetch fails


security = HTTPBearer()
optional_security = HTTPBearer(auto_error=False)


async def _decode_token(credentials: HTTPAuthorizationCredentials) -> Dict[str, Any]:
    token = credentials.credentials

    # 1. Unverified header to determine algorithm
    try:
        header = jwt.get_unverified_header(token)
        alg = header.get("alg", "HS256")
    except Exception:
        alg = "HS256"

    # 2. Decode based on algorithm
    if alg == "HS256":
        if not settings.SUPABASE_JWT_SECRET:
            raise HTTPException(
                status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
                detail="Authentication is not configured (SUPABASE_JWT_SECRET missing).",
            )
        payload = jwt.decode(
            token,
            settings.SUPABASE_JWT_SECRET,
            algorithms=["HS256"],
            options={"verify_aud": False},
        )
    elif alg == "ES256":
        jwks = await get_jwks()
        if not jwks:
            raise HTTPException(
                status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
                detail="Authentication is not configured (Supabase JWKS unavailable).",
            )

        kid = header.get("kid")
        key_data = next((k for k in jwks.get("keys", []) if k.get("kid") == kid), None)
        if not key_data:
            key_data = next((k for k in jwks.get("keys", []) if k.get("alg") == "ES256"), None)

        if not key_data:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="No matching signing key for this session.",
            )

        public_key = jwk.construct(key_data)
        payload = jwt.decode(
            token,
            public_key,
            algorithms=["ES256"],
            options={"verify_aud": False},
        )
    else:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail=f"Unsupported token algorithm: {alg}",
        )

    user_id: str = payload.get("sub")
    if not user_id:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid token: missing sub",
        )
    return payload


async def get_current_user(
    credentials: HTTPAuthorizationCredentials = Depends(security),
) -> Dict[str, Any]:
    try:
        return await _decode_token(credentials)
    except HTTPException:
        raise
    except JWTError as e:
        logger.error(f"JWT validation failed: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Session expired or invalid.",
        )


async def get_optional_user(
    credentials: Optional[HTTPAuthorizationCredentials] = Depends(optional_security),
) -> Optional[Dict[str, Any]]:
    """Return the authenticated user, or None for anonymous local-demo traffic."""
    if credentials is None:
        return None
    try:
        return await _decode_token(credentials)
    except HTTPException:
        raise
    except JWTError:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Session expired or invalid.",
        )


async def require_auth_if_enabled(
    user: Optional[Dict[str, Any]] = Depends(get_optional_user),
) -> Optional[Dict[str, Any]]:
    """Enforce auth only when AUTH_REQUIRED=true.

    Local demos can run without Supabase; shared deployments must set
    AUTH_REQUIRED=true.
    """
    if settings.AUTH_REQUIRED and user is None:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Authentication required.",
        )
    return user


async def _role_for_user(user: Dict[str, Any]) -> Optional[str]:
    user_id = user.get("sub")
    if not user_id:
        return None

    # The user_roles table is the source of truth. user_metadata.role is
    # user-editable and must not be trusted for authorization.
    try:
        from app.core.supabase import supabase_admin

        if supabase_admin is not None:
            result = (
                supabase_admin.table("user_roles")
                .select("role")
                .eq("id", user_id)
                .maybe_single()
                .execute()
            )
            if result and result.data:
                return result.data.get("role")
    except Exception as exc:  # pragma: no cover - depends on remote service
        logger.warning("Could not read role from user_roles: %s", exc)

    # Local-only fallback so the demo can run without a database. Never used
    # when AUTH_REQUIRED is on.
    if not settings.AUTH_REQUIRED:
        return user.get("user_metadata", {}).get("role", "citizen")
    return None


async def get_current_citizen(user=Depends(get_current_user)):
    role = await _role_for_user(user)
    if role not in ("citizen", "admin"):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Citizens only",
        )
    return user


async def get_current_lawyer(user=Depends(get_current_user)):
    role = await _role_for_user(user)
    if role not in ("lawyer", "admin"):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Lawyers only",
        )
    return user


async def get_current_admin(user=Depends(get_current_user)):
    role = await _role_for_user(user)
    if role != "admin":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Admins only",
        )
    return user
