import logging
import os
import re
import anthropic
from dotenv import load_dotenv
from db import execute_query
from prompts import SQL_SCHEMA_PROMPT, MAX_TOKENS_BY_TYPE
import memory as mem

load_dotenv()

logger = logging.getLogger(__name__)
_client = anthropic.Anthropic(api_key=os.getenv("ANTHROPIC_API_KEY"))

_DANGEROUS_KEYWORDS = re.compile(
    r"\b(INSERT|UPDATE|DELETE|DROP|TRUNCATE|ALTER|CREATE|REPLACE|MERGE|EXEC|EXECUTE)\b",
    re.IGNORECASE,
)


def _inject_user_id(sql: str, user_id: str) -> str:
    """Force-inject WHERE user_id = '...' before any trailing clause (ORDER BY / GROUP BY / LIMIT / OFFSET)."""
    sql = sql.strip().rstrip(";")
    user_filter = f"user_id = '{user_id}'"
    has_where = bool(re.search(r"\bWHERE\b", sql, re.IGNORECASE))

    # Find the first ORDER BY / GROUP BY / LIMIT / OFFSET that is at the top level (depth 0)
    trailing = re.compile(r"\b(ORDER\s+BY|GROUP\s+BY|LIMIT|OFFSET)\b", re.IGNORECASE)
    for m in trailing.finditer(sql):
        depth = sql[: m.start()].count("(") - sql[: m.start()].count(")")
        if depth == 0:
            prefix = sql[: m.start()].rstrip()
            suffix = sql[m.start() :]
            connector = "AND" if has_where else "WHERE"
            return f"{prefix} {connector} {user_filter} {suffix}"

    # No trailing clauses — append at end
    connector = "AND" if has_where else "WHERE"
    return f"{sql} {connector} {user_filter}"


def _is_safe_sql(sql: str) -> bool:
    return not _DANGEROUS_KEYWORDS.search(sql)


def _fix_pg_syntax(sql: str) -> str:
    """Correct common MySQL-isms to PostgreSQL syntax."""
    # MONTH(col) → EXTRACT(MONTH FROM col)
    sql = re.sub(r"\bMONTH\s*\(([^)]+)\)", r"EXTRACT(MONTH FROM \1)", sql, flags=re.IGNORECASE)
    # YEAR(col) → EXTRACT(YEAR FROM col)
    sql = re.sub(r"\bYEAR\s*\(([^)]+)\)", r"EXTRACT(YEAR FROM \1)", sql, flags=re.IGNORECASE)
    # CURRENT_DATE() → CURRENT_DATE
    sql = re.sub(r"\bCURRENT_DATE\s*\(\s*\)", "CURRENT_DATE", sql, flags=re.IGNORECASE)
    return sql


async def run(question: str, user_id: str, session_id: str) -> str:
    # Step 1: Generate SQL from question
    sql_response = _client.messages.create(
        model="claude-sonnet-4-20250514",
        max_tokens=300,
        temperature=0,
        system=SQL_SCHEMA_PROMPT,
        messages=[{"role": "user", "content": question}],
    )
    raw_sql = sql_response.content[0].text.strip()

    # Strip markdown code fences if present
    raw_sql = re.sub(r"^```[a-zA-Z]*\n?", "", raw_sql)
    raw_sql = re.sub(r"\n?```$", "", raw_sql).strip()

    # Step 2: Correct MySQL-isms to PostgreSQL syntax
    raw_sql = _fix_pg_syntax(raw_sql)

    # Step 3: Security — reject dangerous statements
    if not _is_safe_sql(raw_sql):
        return "보안 정책상 해당 요청을 처리할 수 없습니다."

    # Step 4: Force-inject user_id filter
    safe_sql = _inject_user_id(raw_sql, user_id)

    logger.info(f"[SQL 생성] {safe_sql}")
    logger.info(f"[SQL 파라미터] user_id={user_id}")

    # Step 5: Execute query
    try:
        rows = execute_query(safe_sql, {})
    except Exception as e:
        logger.error(f"[SQL 실행 오류] sql={safe_sql!r} error={e}", exc_info=True)
        return f"데이터 조회 중 오류가 발생했습니다: {str(e)}"

    logger.info(f"[SQL 결과] {len(rows)}행 반환")
    logger.debug(f"[SQL 결과 상세] {rows}")

    if not rows:
        return "조회된 구독 데이터가 없습니다."

    # Step 6: Generate natural language answer with conversation history
    history = mem.get_history(user_id, session_id)
    messages = history + [
        {
            "role": "user",
            "content": f"질문: {question}\n\nSQL 조회 결과:\n{rows}",
        }
    ]

    answer_response = _client.messages.create(
        model="claude-sonnet-4-20250514",
        max_tokens=MAX_TOKENS_BY_TYPE["type_1"],
        system="당신은 SUBLENS 구독 관리 도우미입니다. SQL 조회 결과를 바탕으로 사용자 질문에 친절하게 한국어로 답변해주세요.",
        messages=messages,
    )
    return answer_response.content[0].text.strip()


_async_client = anthropic.AsyncAnthropic(api_key=os.getenv("ANTHROPIC_API_KEY"))


async def run_stream(question: str, user_id: str, session_id: str):
    """Streaming version — yields SSE event dicts."""
    yield {"event": "status", "text": "데이터 쿼리 생성 중..."}

    sql_response = await _async_client.messages.create(
        model="claude-sonnet-4-20250514",
        max_tokens=300,
        temperature=0,
        system=SQL_SCHEMA_PROMPT,
        messages=[{"role": "user", "content": question}],
    )
    raw_sql = sql_response.content[0].text.strip()
    raw_sql = re.sub(r"^```[a-zA-Z]*\n?", "", raw_sql)
    raw_sql = re.sub(r"\n?```$", "", raw_sql).strip()
    raw_sql = _fix_pg_syntax(raw_sql)

    if not _is_safe_sql(raw_sql):
        yield {"event": "token", "text": "보안 정책상 해당 요청을 처리할 수 없습니다."}
        return

    safe_sql = _inject_user_id(raw_sql, user_id)
    logger.info(f"[SQL 생성] {safe_sql}")

    yield {"event": "status", "text": "데이터 조회 중..."}

    try:
        rows = execute_query(safe_sql, {})
    except Exception as e:
        logger.error(f"[SQL 실행 오류] sql={safe_sql!r} error={e}", exc_info=True)
        yield {"event": "token", "text": f"데이터 조회 중 오류가 발생했습니다: {str(e)}"}
        return

    logger.info(f"[SQL 결과] {len(rows)}행 반환")

    if not rows:
        yield {"event": "token", "text": "조회된 구독 데이터가 없습니다."}
        return

    history = mem.get_history(user_id, session_id)
    messages = history + [
        {
            "role": "user",
            "content": f"질문: {question}\n\nSQL 조회 결과:\n{rows}",
        }
    ]

    async with _async_client.messages.stream(
        model="claude-sonnet-4-20250514",
        max_tokens=MAX_TOKENS_BY_TYPE["type_1"],
        system="당신은 SUBLENS 구독 관리 도우미입니다. SQL 조회 결과를 바탕으로 사용자 질문에 친절하게 한국어로 답변해주세요.",
        messages=messages,
    ) as stream:
        async for text in stream.text_stream:
            yield {"event": "token", "text": text}
