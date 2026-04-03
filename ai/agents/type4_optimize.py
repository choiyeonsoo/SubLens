import json
import logging
import os

import anthropic
from dotenv import load_dotenv

from db import execute_query

from agents.type4_calculator import calculate_optimization
import memory as mem

load_dotenv()

logger = logging.getLogger(__name__)
_client = anthropic.Anthropic(api_key=os.getenv("ANTHROPIC_API_KEY"))

# Claude's only job: determine view_type + write cautions (Korean, 2-4 items).
# All numbers are pre-calculated by Python and must not be changed.
_CAUTION_SYSTEM_PROMPT = """\
당신은 구독 최적화 결과에 주의사항을 추가하는 역할만 합니다.

역할:
1. view_type을 "optimize"로 설정
2. 번들 데이터를 보고 한국어로 주의사항 2~4개 작성
   (예: 광고형 플랜 안내, 통신사 전용 조건, 약정/위약금 조건 등)
3. 숫자는 절대 변경하지 마세요 — 입력값을 그대로 복사
4. 유효한 JSON만 출력 — 마크다운·설명 텍스트 금지

출력 스키마:
{
  "view_type": "optimize",
  "current_total": <입력값 그대로>,
  "optimized_total": <입력값 그대로>,
  "savings": <입력값 그대로>,
  "recommended_bundles": <입력값 그대로>,
  "keep_subscriptions": <입력값 그대로>,
  "cautions": ["한국어 주의사항", ...]
}\
"""

_NUMBER_FIELDS = ("current_total", "optimized_total", "savings")


def _fetch_user_subscriptions(user_id: str) -> list[dict]:
    sql = """
        SELECT service_name, amount, billing_cycle, is_bundle, bundle_id
        FROM subscriptions
        WHERE user_id = %(user_id)s AND status = 'ACTIVE'
    """
    logger.info(f"[SQL 생성] {sql.strip()}")
    logger.info(f"[SQL 파라미터] user_id={user_id}")
    rows = execute_query(sql, {"user_id": user_id})
    logger.info(f"[SQL 결과] {len(rows)}행 반환")
    logger.debug(f"[SQL 결과 상세] {rows}")
    return rows


def _fetch_mobile_carrier(user_id: str) -> str:
    sql = "SELECT mobile_carrier FROM users WHERE id = %(user_id)s"
    logger.info(f"[SQL 생성] {sql}")
    logger.info(f"[SQL 파라미터] user_id={user_id}")
    rows = execute_query(sql, {"user_id": user_id})
    logger.info(f"[SQL 결과] {len(rows)}행 반환")
    logger.debug(f"[SQL 결과 상세] {rows}")
    if rows:
        return rows[0].get("mobile_carrier") or "알 수 없음"
    return "알 수 없음"


def _fetch_bundle_candidates(mobile_carrier: str) -> list[dict]:
    sql = """
        SELECT bc.id, bc.provider, bc.plan_name, bc.base_price,
               bc.original_price, bc.includes, bc.description,
               bc.telecom_exclusive, bc.has_options
        FROM bundle_catalog bc
        WHERE bc.is_active = true
          AND (bc.telecom_exclusive IS NULL OR bc.telecom_exclusive = %(carrier)s)
        ORDER BY bc.base_price
    """
    logger.info(f"[SQL 생성] {sql.strip()}")
    logger.info(f"[SQL 파라미터] mobile_carrier={mobile_carrier}")
    rows = execute_query(sql, {"carrier": mobile_carrier})
    logger.info(f"[SQL 결과] {len(rows)}행 반환")
    logger.debug(f"[SQL 결과 상세] {rows}")
    return rows



async def run(question: str, user_id: str, session_id: str) -> dict:
    # ── Step 1: fetch user subscriptions ──────────────────────────────────────
    subscriptions = _fetch_user_subscriptions(user_id)

    subscribed_bundle_ids = {
        str(s["bundle_id"]) for s in subscriptions
        if s.get("is_bundle") and s.get("bundle_id")
    }

    # ── Step 2: fetch bundle candidates (carrier-filtered, not yet subscribed) ─
    mobile_carrier = _fetch_mobile_carrier(user_id)
    bundles = _fetch_bundle_candidates(mobile_carrier)
    bundles = [b for b in bundles if str(b["id"]) not in subscribed_bundle_ids]
    # ── Step 3: pure Python calculation — deterministic, no Claude ────────────
    calc_result = calculate_optimization(subscriptions, bundles)
    logger.info(
        f"[type4] 계산 완료: current={calc_result['current_total']}, "
        f"optimized={calc_result['optimized_total']}, "
        f"savings={calc_result['savings']}, "
        f"bundles={len(calc_result['recommended_bundles'])}"
    )

    # ── Step 4: ask Claude for cautions + view_type only ──────────────────────
    # Send only the fields Claude needs to annotate; numbers are already final.
    claude_input = {
        "current_total": calc_result["current_total"],
        "optimized_total": calc_result["optimized_total"],
        "savings": calc_result["savings"],
        "recommended_bundles": calc_result["recommended_bundles"],
        "keep_subscriptions": calc_result["keep_subscriptions"],
    }
    user_prompt = (
        f"사용자 질문: {question}\n\n"
        f"계산 결과 (숫자 변경 금지):\n"
        f"{json.dumps(claude_input, ensure_ascii=False, indent=2)}"
    )

    history = mem.get_history(session_id)
    messages = history + [{"role": "user", "content": user_prompt}]

    response = _client.messages.create(
        model="claude-sonnet-4-20250514",
        max_tokens=600,
        temperature=0,
        system=_CAUTION_SYSTEM_PROMPT,
        messages=messages,
    )
    raw = response.content[0].text.strip()

    try:
        claude_result = json.loads(raw)
    except json.JSONDecodeError:
        logger.warning(f"[type4] Claude JSON 파싱 실패, cautions 없이 반환. raw={raw[:200]}")
        claude_result = {}

    # ── Step 5: safety assertion — Claude must not alter numbers ──────────────
    for field in _NUMBER_FIELDS:
        expected = calc_result[field]
        actual = claude_result.get(field)
        if actual is not None and actual != expected:
            logger.warning(
                f"[type4] Claude가 {field}를 변경함: expected={expected}, got={actual} — 계산값으로 복원"
            )

    # ── Step 6: build final response from calc_result (numbers always win) ────
    final: dict = {
        "view_type": "optimize",
        **calc_result,
        "cautions": claude_result.get("cautions", []),
    }
    return final
