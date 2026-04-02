import logging
import os
import anthropic
from dotenv import load_dotenv
from db import execute_query
from prompts import TYPE4_OPTIMIZE_PROMPT
import memory as mem

load_dotenv()

logger = logging.getLogger(__name__)
_client = anthropic.Anthropic(api_key=os.getenv("ANTHROPIC_API_KEY"))


def _fetch_user_subscriptions(user_id: str) -> list[dict]:
    sql = """
        SELECT service_name, amount, billing_cycle
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


def _fetch_bundle_options(bundle_ids: list[str]) -> list[dict]:
    if not bundle_ids:
        return []
    sql = """
        SELECT bo.bundle_id, bo.option_name, bo.option_spec,
               bo.extra_price, bo.total_price
        FROM bundle_option bo
        WHERE bo.bundle_id = ANY(%(ids)s)
    """
    logger.info(f"[SQL 생성] {sql.strip()}")
    logger.info(f"[SQL 파라미터] bundle_ids({len(bundle_ids)}개)={bundle_ids}")
    rows = execute_query(sql, {"ids": bundle_ids})
    logger.info(f"[SQL 결과] {len(rows)}행 반환")
    logger.debug(f"[SQL 결과 상세] {rows}")
    return rows


def _build_bundles_with_options(bundles: list[dict], options: list[dict]) -> str:
    options_by_bundle: dict[str, list] = {}
    for opt in options:
        bid = str(opt["bundle_id"])
        options_by_bundle.setdefault(bid, []).append(opt)

    lines = []
    for b in bundles:
        bid = str(b["id"])
        lines.append(
            f"- [{b['provider']}] {b['plan_name']}: 기본가 {b['base_price']}원 "
            f"(원가 {b['original_price']}원), 포함 서비스: {b['includes']}, "
            f"통신사 전용: {b['telecom_exclusive'] or '없음'}"
        )
        if b.get("has_options") and bid in options_by_bundle:
            for opt in options_by_bundle[bid]:
                lines.append(
                    f"  * 옵션 [{opt['option_name']}] {opt['option_spec']}: "
                    f"+{opt['extra_price']}원 (합계 {opt['total_price']}원)"
                )
    return "\n".join(lines) if lines else "가입 가능한 번들 상품이 없습니다."


async def run(question: str, user_id: str, session_id: str) -> str:
    # Step 1: User subscriptions
    subscriptions = _fetch_user_subscriptions(user_id)
    if not subscriptions:
        subs_text = "현재 활성 구독 없음"
    else:
        subs_text = "\n".join(
            f"- {s['service_name']}: {s['amount']}원/{s['billing_cycle']}"
            for s in subscriptions
        )

    # Step 2: Mobile carrier
    mobile_carrier = _fetch_mobile_carrier(user_id)

    # Step 3: Bundle candidates matching the carrier
    bundles = _fetch_bundle_candidates(mobile_carrier)
    bundle_ids = [str(b["id"]) for b in bundles]

    # Step 4: Bundle options for each candidate
    options = _fetch_bundle_options(bundle_ids)

    # Step 5: Build prompt
    bundles_text = _build_bundles_with_options(bundles, options)
    prompt = TYPE4_OPTIMIZE_PROMPT.format(
        subscriptions=subs_text,
        mobile_carrier=mobile_carrier,
        bundles_with_options=bundles_text,
    )

    # Include conversation history
    history = mem.get_history(session_id)
    messages = history + [{"role": "user", "content": prompt}]

    response = _client.messages.create(
        model="claude-sonnet-4-20250514",
        max_tokens=1000,
        messages=messages,
    )
    return response.content[0].text.strip()
