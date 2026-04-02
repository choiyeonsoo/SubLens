import os
import json
import redis
from dotenv import load_dotenv

load_dotenv()

REDIS_URL = os.getenv("REDIS_URL", "redis://localhost:6379")
TTL = 7200  # 2 hours
MAX_MESSAGES = 20  # 10 turns


def _get_client() -> redis.Redis:
    return redis.from_url(REDIS_URL, decode_responses=True)


def get_history(session_id: str) -> list[dict]:
    client = _get_client()
    raw = client.get(f"conv:{session_id}")
    if not raw:
        return []
    return json.loads(raw)


def append_turn(session_id: str, question: str, answer: str) -> None:
    client = _get_client()
    key = f"conv:{session_id}"
    history = get_history(session_id)

    history.append({"role": "user", "content": question})
    history.append({"role": "assistant", "content": answer})

    # Keep only the latest MAX_MESSAGES messages
    if len(history) > MAX_MESSAGES:
        history = history[len(history) - MAX_MESSAGES:]

    client.setex(key, TTL, json.dumps(history, ensure_ascii=False))
