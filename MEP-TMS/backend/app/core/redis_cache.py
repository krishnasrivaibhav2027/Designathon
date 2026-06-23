"""
Redis caching layer for MEP-TMS.

Strategy
--------
- Cache all successful GET responses (HTTP 200) with route-specific TTLs.
- Heavy analytics endpoints get 60s TTL; lighter list endpoints get 15s.
- Cache keys are scoped per-user by hashing the Authorization header,
  so no user ever sees another user's data.
- POST / PUT / DELETE on a resource namespace busts all cached keys in that
  namespace, so stale data is never served after a write.
- Non-data routes (docs, openapi, health, debug-log) are excluded.
- If Redis is unavailable the middleware transparently falls back to
  normal (non-cached) request handling — no errors surface to clients.
"""

import hashlib
import json
import re
import asyncio
from typing import Optional

import redis as redis_lib

from app.core.config import settings

# ---------------------------------------------------------------------------
# Global client instance (set during app startup)
# ---------------------------------------------------------------------------
_redis_client: Optional[redis_lib.Redis] = None

# ---------------------------------------------------------------------------
# TTL configuration — route prefix → seconds
# Longer TTL for expensive aggregation endpoints, shorter for list endpoints.
# ---------------------------------------------------------------------------
_ROUTE_TTLS: list[tuple[str, int]] = [
    ("/api/users/dashboard-analytics",  60),   # 10+ DB queries, changes infrequently
    ("/api/users/activity-logs",         30),   # login/logout feed
    ("/api/report/toppers",              60),   # expensive score aggregation
    ("/api/report/progress-tracker",     60),
    ("/api/attendance",                  20),
    ("/api/assessment",                  20),
    ("/api/batch",                       15),
    ("/api/users",                       15),
    ("/api/report",                      20),
    ("/api/notification",                10),
]

DEFAULT_CACHE_TTL = 15  # fallback for anything not matched above

# Routes that should never be cached
_SKIP_PREFIXES = (
    "/docs",
    "/redoc",
    "/openapi.json",
    "/api/health",
    "/api/debug-log",
    "/api/chat",        # websocket / real-time, never cache
    "/api/auth",        # auth endpoints must never be cached
)

# ---------------------------------------------------------------------------
# Cache-bust namespace map
# When a mutating request (POST/PUT/DELETE) is made to a path prefix,
# all Redis keys whose namespace tag matches are deleted.
# ---------------------------------------------------------------------------
_BUST_NAMESPACES: list[tuple[str, str]] = [
    ("/api/users",       "users"),
    ("/api/batch",       "batch"),
    ("/api/attendance",  "attendance"),
    ("/api/assessment",  "assessment"),
    ("/api/report",      "report"),
    ("/api/notification","notification"),
    ("/api/onboarding",  "onboarding"),
]


# ---------------------------------------------------------------------------
# Connection lifecycle
# ---------------------------------------------------------------------------

def connect_to_redis() -> None:
    """Initialise the Redis connection.  Called during app startup."""
    global _redis_client
    url = getattr(settings, "REDIS_URL", "")
    if not url:
        print("[WARN] REDIS_URL not set — caching disabled.")
        return
    try:
        client = redis_lib.from_url(
            url,
            decode_responses=True,
            socket_connect_timeout=3,
            socket_timeout=2,
            retry_on_timeout=True,
        )
        client.ping()
        _redis_client = client
        print("[OK] Connected to Redis — caching enabled.")
    except Exception as exc:
        print(f"[WARN] Redis connection failed ({exc}) — caching disabled.")
        _redis_client = None


def close_redis_connection() -> None:
    """Close the Redis connection.  Called during app shutdown."""
    global _redis_client
    if _redis_client:
        try:
            _redis_client.close()
        except Exception:
            pass
        _redis_client = None
        print("[OK] Redis connection closed.")


def get_redis() -> Optional[redis_lib.Redis]:
    """Return the active Redis client (or None if unavailable)."""
    return _redis_client


# ---------------------------------------------------------------------------
# TTL + namespace helpers
# ---------------------------------------------------------------------------

def _get_ttl(path: str) -> int:
    """Return the appropriate TTL for a given route path."""
    for prefix, ttl in _ROUTE_TTLS:
        if path.startswith(prefix):
            return ttl
    return DEFAULT_CACHE_TTL


def _get_bust_namespace(path: str) -> Optional[str]:
    """Return the cache namespace to bust for a given write-path, or None."""
    for prefix, ns in _BUST_NAMESPACES:
        if path.startswith(prefix):
            return ns
    return None


def _make_cache_key(auth_header: str, path: str, query: str, namespace: str) -> str:
    """Build a short, user-scoped cache key tagged with a namespace."""
    user_hash = (
        hashlib.sha256(auth_header.encode()).hexdigest()[:16]
        if auth_header
        else "anon"
    )
    raw = f"{path}?{query}" if query else path
    route_hash = hashlib.sha256(raw.encode()).hexdigest()[:24]
    return f"mep:{namespace}:{user_hash}:{route_hash}"


def _bust_namespace(client: redis_lib.Redis, namespace: str) -> None:
    """Delete all cache keys that belong to a namespace (pattern scan)."""
    try:
        pattern = f"mep:{namespace}:*"
        cursor = 0
        deleted = 0
        while True:
            cursor, keys = client.scan(cursor, match=pattern, count=200)
            if keys:
                client.delete(*keys)
                deleted += len(keys)
            if cursor == 0:
                break
        if deleted:
            print(f"[Redis] Busted {deleted} key(s) in namespace '{namespace}'")
    except Exception as exc:
        print(f"[Redis] Cache bust error for namespace '{namespace}': {exc}")


# ---------------------------------------------------------------------------
# FastAPI middleware
# ---------------------------------------------------------------------------

async def redis_cache_middleware(request, call_next):
    """
    HTTP middleware that:
    - Serves cached GET responses with route-aware TTLs.
    - Busts namespace caches on mutating requests (POST/PUT/PATCH/DELETE).
    """
    from fastapi.responses import Response

    path = request.url.path

    # ── Skip non-cacheable routes entirely ──────────────────────────────────
    if any(path.startswith(p) for p in _SKIP_PREFIXES):
        return await call_next(request)

    client = _redis_client  # local ref for thread-safety
    method = request.method.upper()

    # ── Cache bust on writes ─────────────────────────────────────────────────
    if method in ("POST", "PUT", "PATCH", "DELETE") and client:
        namespace = _get_bust_namespace(path)
        if namespace:
            try:
                await asyncio.to_thread(_bust_namespace, client, namespace)
            except Exception:
                pass
        # Always continue to the real handler for writes
        return await call_next(request)

    # ── Only cache GETs beyond this point ────────────────────────────────────
    if method != "GET":
        return await call_next(request)

    # Determine namespace from the path (for keying)
    cache_namespace = "misc"
    for prefix, ns in _BUST_NAMESPACES:
        if path.startswith(prefix):
            cache_namespace = ns
            break

    ttl = _get_ttl(path)

    if client:
        try:
            auth_header = request.headers.get("authorization", "")
            cache_key = _make_cache_key(
                auth_header, path, request.url.query, cache_namespace
            )

            cached_raw = await asyncio.to_thread(client.get, cache_key)
            if cached_raw:
                cached = json.loads(cached_raw)
                return Response(
                    content=cached["body"].encode("utf-8"),
                    status_code=cached["status_code"],
                    media_type=cached.get("media_type", "application/json"),
                    headers={"X-Cache": "HIT", "X-Cache-TTL": str(ttl)},
                )
        except Exception as exc:
            print(f"[Redis] Cache read error: {exc}")

    # ── Execute the actual request ────────────────────────────────────────────
    response = await call_next(request)

    # Only cache successful JSON-ish responses
    if client and response.status_code == 200:
        try:
            body_chunks: list[bytes] = []
            async for chunk in response.body_iterator:
                body_chunks.append(chunk)
            body_bytes = b"".join(body_chunks)

            auth_header = request.headers.get("authorization", "")
            cache_key = _make_cache_key(
                auth_header, path, request.url.query, cache_namespace
            )

            payload = {
                "body": body_bytes.decode("utf-8", errors="replace"),
                "status_code": response.status_code,
                "media_type": response.media_type or "application/json",
            }
            await asyncio.to_thread(client.setex, cache_key, ttl, json.dumps(payload))

            headers = dict(response.headers)
            headers.pop("content-length", None)
            headers["X-Cache"] = "MISS"
            headers["X-Cache-TTL"] = str(ttl)
            return Response(
                content=body_bytes,
                status_code=response.status_code,
                media_type=response.media_type,
                headers=headers,
            )
        except Exception as exc:
            print(f"[Redis] Cache write error: {exc}")
            return response

    return response
