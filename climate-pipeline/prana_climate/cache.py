"""Optional Redis cache for the assess endpoint.

Most repeat lookups will hit the same ``(h3_cell, asset_type, scenario,
horizon)`` tuple. Caching those responses for 24 h takes the S3 hot-read
path off the critical path for popular cells.

The cache is optional — if ``PRANA_REDIS_URL`` is not set we silently
fall back to a no-op cache so local dev still works.
"""
from __future__ import annotations

import hashlib
import json
import logging
import os
from typing import Any, Optional

log = logging.getLogger(__name__)


class NoopCache:
    """Used when no Redis is configured — never errors, never returns hits."""

    def get(self, key: str) -> Optional[Any]:
        return None

    def set(self, key: str, value: Any, ttl_seconds: int = 86_400) -> None:
        return None


class RedisCache:
    def __init__(self, url: str) -> None:
        import redis  # imported lazily to keep the dep optional
        self._client = redis.Redis.from_url(url, decode_responses=True)
        log.info("Connected to Redis cache")

    def get(self, key: str) -> Optional[Any]:
        raw = self._client.get(key)
        if raw is None:
            return None
        try:
            return json.loads(raw)
        except json.JSONDecodeError:
            log.warning("Cache key %s returned non-JSON value; ignoring.", key)
            return None

    def set(self, key: str, value: Any, ttl_seconds: int = 86_400) -> None:
        self._client.set(key, json.dumps(value), ex=ttl_seconds)


def make_cache() -> NoopCache | RedisCache:
    url = os.getenv("PRANA_REDIS_URL")
    if not url:
        return NoopCache()
    try:
        return RedisCache(url)
    except Exception as exc:
        log.warning("Falling back to no-op cache: %s", exc)
        return NoopCache()


def cache_key(*parts: Any) -> str:
    blob = ":".join(str(p) for p in parts)
    return "prana:" + hashlib.sha256(blob.encode()).hexdigest()[:32]
