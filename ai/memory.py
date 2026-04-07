import os
import json
import time
import redis
from dotenv import load_dotenv

load_dotenv()

REDIS_URL = os.getenv("REDIS_URL", "redis://localhost:6379")
TTL = 7200  # 2 hours
MAX_MESSAGES = 20  # 10 turns
MAX_SESSIONS = 20


def _get_client() -> redis.Redis:
    return redis.from_url(REDIS_URL, decode_responses=True)


# ── Conversation history ────────────────────────────────────────────────────

def get_history(user_id: str, session_id: str) -> list[dict]:
    client = _get_client()
    raw = client.get(f"conv:{user_id}:{session_id}")
    if not raw:
        return []
    return json.loads(raw)


def append_turn(
    user_id: str,
    session_id: str,
    question: str,
    answer: str,
    *,
    session_title: str | None = None,
) -> None:
    client = _get_client()
    key = f"conv:{user_id}:{session_id}"
    history = get_history(user_id, session_id)

    history.append({"role": "user", "content": question})
    history.append({"role": "assistant", "content": answer})

    if len(history) > MAX_MESSAGES:
        history = history[len(history) - MAX_MESSAGES:]

    client.setex(key, TTL, json.dumps(history, ensure_ascii=False))

    title = session_title or question[:40]
    _upsert_session_meta(client, user_id, session_id, title)


# ── Calculation result cache ────────────────────────────────────────────────

def save_calc_result(user_id: str, session_id: str, calc_result: dict) -> None:
    client = _get_client()
    client.setex(
        f"calc:{user_id}:{session_id}",
        TTL,
        json.dumps(calc_result, ensure_ascii=False),
    )


def get_calc_result(user_id: str, session_id: str) -> dict | None:
    client = _get_client()
    raw = client.get(f"calc:{user_id}:{session_id}")
    if not raw:
        return None
    return json.loads(raw)


# ── Session management ──────────────────────────────────────────────────────

def _upsert_session_meta(
    client: redis.Redis, user_id: str, session_id: str, title: str
) -> None:
    """Create or update session metadata in both a hash and a sorted set."""
    sess_key = f"sessions:{user_id}"
    meta_key = f"sessmeta:{user_id}:{session_id}"
    now = time.time()

    existing = client.get(meta_key)
    if existing:
        meta = json.loads(existing)
        meta["updatedAt"] = now
    else:
        meta = {
            "id": session_id,
            "title": title,
            "createdAt": now,
            "updatedAt": now,
        }

    client.setex(meta_key, TTL, json.dumps(meta, ensure_ascii=False))
    client.zadd(sess_key, {session_id: now})
    client.expire(sess_key, TTL)


def list_sessions(user_id: str) -> list[dict]:
    """Return all active sessions for a user, newest first."""
    client = _get_client()
    sess_key = f"sessions:{user_id}"

    session_ids = client.zrevrange(sess_key, 0, -1)
    if not session_ids:
        return []

    pipe = client.pipeline()
    for sid in session_ids:
        pipe.get(f"sessmeta:{user_id}:{sid}")
        pipe.exists(f"conv:{user_id}:{sid}")
    results = pipe.execute()

    sessions: list[dict] = []
    stale_ids: list[str] = []
    for i, sid in enumerate(session_ids):
        meta_raw = results[i * 2]
        conv_exists = results[i * 2 + 1]
        if not meta_raw or not conv_exists:
            stale_ids.append(sid)
            continue
        sessions.append(json.loads(meta_raw))

    if stale_ids:
        client.zrem(sess_key, *stale_ids)

    return sessions[:MAX_SESSIONS]


def get_session_messages(user_id: str, session_id: str) -> list[dict]:
    """Return conversation messages for a specific session."""
    return get_history(user_id, session_id)


def delete_session(user_id: str, session_id: str) -> None:
    """Delete a session and all associated data."""
    client = _get_client()
    client.delete(
        f"conv:{user_id}:{session_id}",
        f"calc:{user_id}:{session_id}",
        f"sessmeta:{user_id}:{session_id}",
    )
    client.zrem(f"sessions:{user_id}", session_id)
