import asyncio
import json
import logging
import os

import anthropic
from dotenv import load_dotenv

from db import execute_query

from agents.type4_calculator import calculate_optimization, _normalize_includes, _name_matches_includes, _matches_bundle, _to_monthly, _ALIAS_LOOKUP
import memory as mem

load_dotenv()

logger = logging.getLogger(__name__)
_client = anthropic.Anthropic(api_key=os.getenv("ANTHROPIC_API_KEY"))
_async_client = anthropic.AsyncAnthropic(api_key=os.getenv("ANTHROPIC_API_KEY"))

_HYPOTHETICAL_KEYWORDS = [
    "추가하면", "추가할 경우", "추가하게 되면", "추가했을 때",
    "추가한다면", "추가했다면", "추가하게 된다면",
    "가입하면", "가입할 경우", "가입하게 되면", "가입한다면", "가입했다면",
    "구독하면", "구독할 경우", "구독한다면", "넣으면", "등록하면",
    "시작하면", "시작할 경우", "시작하게 되면", "시작한다면",
    "묶으면", "결합하면", "추가되면", "추가될 경우", "추가되게 되면", "추가될 때",
    "통합하면", "통합할 경우", "통합하게 되면", "통합될 때",
    "합치면", "합칠 경우", "합치게 되면", "합쳐질 때",
    "바꾸면", "바꿀 경우", "바꾸게 되면", "바꿨을 때", "바꾼다면",
    "전환하면", "전환할 경우", "전환하게 되면", "전환한다면",
    "변경하면", "변경할 경우", "변경하게 되면", "변경한다면",
]

_CANCELLATION_KEYWORDS = [
    "해지하면", "해지할 경우", "해지하게 되면", "해지했을 때",
    "취소하면", "취소할 경우", "취소하게 되면", "취소했을 때",
    "끊으면", "끊을 경우", "없애면", "없앨 경우",
    "빼면", "빼고", "제거하면", "제거할 경우",
    "안 쓰면", "안쓰면", "지우면", "해제하면", "탈퇴하면",
]

# Claude's only job: determine view_type + write summary + cautions (Korean).
# All numbers are pre-calculated by Python and must not be changed.
_CAUTION_SYSTEM_PROMPT = """\
당신은 구독 최적화 AI입니다. 사용자 질문의 의도를 파악해 아래 네 가지 중 하나로 응답하세요.

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
[케이스 0] 구독 해지/제거 시뮬레이션
  - 판단 기준: [해지 시뮬레이션 계산 결과] 섹션이 제공된 경우, 또는
    "~해지하면", "~취소하면", "~빼면", "~끊으면" 등 현재 구독을 제거하는 시뮬레이션 질문
  - 처리 방법: [해지 시뮬레이션 계산 결과]를 바탕으로 설명
    1. 해지 대상 구독명과 월간 절약액 명시
    2. 변경 전/후 월 총액 비교
    3. 연간 절약액 제시 (월간 × 12)
    4. 숫자는 [해지 시뮬레이션 계산 결과]에서 그대로 사용, 변경 금지
    5. 해지 대상이 현재 구독에 없으면 "해당 구독이 등록되어 있지 않습니다"로 안내
  - 출력: view_type = "simple"
  {
    "view_type": "simple",
    "answer": "해지 시뮬레이션 결과 설명 (현재 총액, 해지 후 총액, 월간/연간 절약액 명시)",
    "supporting_data": "해지 대상 구독명과 각 금액",
    "summary": "결과 1~2문장 요약",
    "cautions": ["주의사항1", ...]
  }

[케이스 0-B] 복합 시뮬레이션 (해지 + 번들 전환)
  - 판단 기준: [복합 시뮬레이션 계산 결과] 섹션이 제공된 경우
  - 처리 방법: [복합 시뮬레이션 계산 결과]를 바탕으로 설명
    1. 해지 대상 구독 + 추가 번들 조합 설명
    2. 현재 총액 → 변경 후 총액 → 월간/연간 총 절약액
    3. 숫자는 계산 결과에서 그대로 사용, 변경 금지
  - 출력: view_type = "simple"
  {
    "view_type": "simple",
    "answer": "복합 시뮬레이션 결과 설명 (해지 내역, 번들 전환 내역, 최종 절약액 명시)",
    "supporting_data": "해지 구독 목록과 금액, 번들 정보",
    "summary": "결과 1~2문장 요약",
    "cautions": ["주의사항1", ...]
  }

[케이스 1] 서비스 전환/비교 질문
  - 판단 기준: "만약 ~로 바꾼다면", "~대신 ~쓰면", "~이 더 나아?" 등 현재 구독 서비스를 다른 서비스로 교체하는 가격 비교 질문
  - 처리 방법:
    1. 사용자 구독에서 현재 서비스 금액 확인
    2. [가용 번들 목록]에서 언급된 서비스가 includes에 포함된 번들 검색
    3. 현재 서비스 금액 vs 번들 금액 단순 비교
  - 출력: view_type = "simple"
  {
    "view_type": "simple",
    "answer": "한국어로 가격 비교 결과 설명 (현재 금액, 번들 금액, 차액 명시)",
    "supporting_data": "비교에 사용한 번들명과 금액",
    "summary": "비교 결과 1~2문장 요약",
    "cautions": ["주의사항1", ...]
  }

[케이스 2] 가상 시나리오 질문
  - 판단 기준: "~를 추가하면", "~에 가입하면", "~를 추가할 경우" 등 현재 없는 번들을 추가하는 가상 상황 질문
  - 처리 방법: [가상 시나리오 계산 결과]를 바탕으로 설명
    1. 번들 추가 시 대체되는 구독 목록과 절약/추가 비용 설명
    2. net_change < 0이면 절약, > 0이면 비용 증가로 안내
    3. 숫자는 [가상 시나리오 계산 결과]에서 그대로 사용, 변경 금지
  - 출력: view_type = "simple"
  {
    "view_type": "simple",
    "answer": "가상 시나리오 결과 설명 (현재 총액, 번들 추가 후 총액, 순 변화액 명시)",
    "supporting_data": "번들명, 대체 가능한 구독 목록과 금액",
    "summary": "결과 1~2문장 요약",
    "cautions": ["주의사항1", ...]
  }

[케이스 3] 전체 구독 최적화 질문 (기본)
  - 판단 기준: 케이스 1·2가 아닌 모든 질문
  - 처리 방법:
    1. view_type = "optimize"
    2. summary: 절약 금액·추천 번들 이름 포함 1~2문장 한국어 요약
    3. cautions: 아래 항목 중 해당하는 것 2~4개
       - telecom_exclusive 있으면 통신사 전용 명시
       - telecom_exclusive 있으면 반드시 포함: "통신사 번들 상품은 1년 약정이 적용될 수 있으며, 중도 해지 시 위약금이 발생할 수 있습니다. 가입 전 약정 조건을 꼭 확인하세요."
       - has_options=true이면 옵션에 따라 추가 비용 가능
       - 가격은 VAT 포함 기준
    4. 숫자는 절대 변경 금지 — 입력값 그대로 복사
  - 출력:
  {
    "view_type": "optimize",
    "current_total": <입력값 그대로>,
    "optimized_total": <입력값 그대로>,
    "savings": <입력값 그대로>,
    "recommended_bundles": <입력값 그대로>,
    "keep_subscriptions": <입력값 그대로>,
    "summary": "한국어 요약",
    "cautions": ["주의사항1", ...]
  }
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
공통 규칙: 유효한 JSON만 출력. 마크다운·설명 텍스트 금지.\
"""

_NUMBER_FIELDS = ("current_total", "optimized_total", "savings")


def _find_cancellation_targets(question: str, subscriptions: list[dict]) -> list[dict]:
    """
    해지/취소 관련 키워드가 있을 때 사용자가 제거하려는 구독을 식별한다.
    서비스명을 공백 제거 후 질문에서 탐색하고, 별칭 테이블도 참조한다.
    """
    if not any(kw in question for kw in _CANCELLATION_KEYWORDS):
        return []

    q_nospace = question.lower().replace(" ", "")
    targets = []
    seen: set[str] = set()

    for s in subscriptions:
        name = s["service_name"]
        if name in seen:
            continue
        name_lower = name.lower()
        name_nospace = name_lower.replace(" ", "")

        matched = len(name_nospace) >= 2 and name_nospace in q_nospace
        if not matched:
            for alias in _ALIAS_LOOKUP.get(name_lower, []):
                alias_ns = alias.replace(" ", "")
                if len(alias_ns) >= 2 and alias_ns in q_nospace:
                    matched = True
                    break

        if matched:
            targets.append(s)
            seen.add(name)
            logger.info(f"[type4] 해지 대상 감지: {name} ({s.get('_monthly', 0)}원)")

    return targets


def _calculate_cancellation(targets: list[dict], current_total: int) -> dict:
    """해지 시뮬레이션: 대상 구독 제거 후 비용 변화를 계산한다."""
    cancel_cost = sum(s["_monthly"] for s in targets)
    new_total = current_total - cancel_cost
    return {
        "scenario": "cancellation",
        "cancelled_subscriptions": [
            {"name": s["service_name"], "price": s["_monthly"]} for s in targets
        ],
        "cancel_cost": cancel_cost,
        "current_total": current_total,
        "new_total": new_total,
        "monthly_savings": cancel_cost,
        "yearly_savings": cancel_cost * 12,
    }


def _calculate_combined(
    cancel_targets: list[dict],
    bundle: dict,
    subscriptions: list[dict],
    current_total: int,
) -> dict:
    """
    복합 시뮬레이션: 지정 구독 해지 후 번들 추가 시 비용 변화를 계산한다.
    1) 해지 대상 제거 → 잔여 구독 풀
    2) 잔여 풀에서 번들이 대체 가능한 구독 계산
    3) 최종 총액 = current - 해지비용 - 번들대체비용 + 번들가격
    """
    cancel_names = {s["service_name"] for s in cancel_targets}
    cancel_cost = sum(s["_monthly"] for s in cancel_targets)
    remaining = [s for s in subscriptions if s["service_name"] not in cancel_names]

    includes = _normalize_includes(bundle.get("includes"))
    bundle_price = int(bundle.get("base_price") or 0)
    matched_in_remaining = [
        s for s in remaining
        if _matches_bundle(s["service_name"], includes, s.get("_canonical"))
    ]
    replaceable_cost = int(sum(s["_monthly"] for s in matched_in_remaining))
    final_total = current_total - cancel_cost - replaceable_cost + bundle_price
    total_savings = current_total - final_total

    logger.info(
        f"[type4] 복합 시뮬레이션: cancel={cancel_cost}, "
        f"bundle={bundle['plan_name']} {bundle_price}, "
        f"replaceable={replaceable_cost}, final={final_total}, savings={total_savings}"
    )
    return {
        "scenario": "cancel_and_bundle",
        "cancelled_subscriptions": [
            {"name": s["service_name"], "price": s["_monthly"]} for s in cancel_targets
        ],
        "cancel_cost": cancel_cost,
        "bundle_name": bundle["plan_name"],
        "provider": bundle["provider"],
        "bundle_price": bundle_price,
        "bundle_replaces": [
            {"name": s["service_name"], "price": s["_monthly"]} for s in matched_in_remaining
        ],
        "replaceable_cost": replaceable_cost,
        "current_total": current_total,
        "after_cancel_total": current_total - cancel_cost,
        "final_total": final_total,
        "total_monthly_savings": total_savings,
        "total_yearly_savings": total_savings * 12,
    }


def _find_hypothetical_bundle(question: str, all_bundles: list[dict]) -> dict | None:
    """
    가상 시나리오 질문에서 언급된 번들을 순수 Python으로 식별 (Haiku 호출 제거).
    번들 plan_name / provider 토큰이 질문에 포함되면 매칭. 가장 긴 매칭 우선.
    """
    if not any(kw in question for kw in _HYPOTHETICAL_KEYWORDS):
        return None

    q_lower = question.lower()
    best: dict | None = None
    best_score = 0

    for b in all_bundles:
        score = 0
        name_lower = b["plan_name"].lower()
        provider_lower = b["provider"].lower()

        # plan_name 전체가 질문에 포함되면 가장 높은 점수
        if name_lower in q_lower:
            score = len(name_lower) * 2
        else:
            # 토큰 단위로 부분 매칭 (2글자 이상)
            for token in name_lower.split():
                if len(token) >= 2 and token in q_lower:
                    score += len(token)

        # provider도 추가 가산
        if provider_lower in q_lower:
            score += len(provider_lower)

        if score > best_score:
            best_score = score
            best = b

    if best:
        logger.info(f"[type4] 가상 번들 감지(plan_name/provider): {best['plan_name']} (score={best_score})")
        return best

    # ── includes 폴백: 번들 이름이 아닌 포함 서비스명이 질문에 언급된 경우 ────
    # 예: "지니뮤직 추가한다면" → 지니뮤직이 includes에 있는 번들을 찾음
    q_nospace = q_lower.replace(" ", "")
    includes_best: dict | None = None
    includes_best_score = 0

    for b in all_bundles:
        includes = _normalize_includes(b.get("includes"))
        score = 0
        for inc in includes:
            inc_ns = inc.lower().replace(" ", "")
            if len(inc_ns) >= 3 and inc_ns in q_nospace:
                score += len(inc_ns)
        if score > includes_best_score:
            includes_best_score = score
            includes_best = b

    if includes_best:
        logger.info(
            f"[type4] 가상 번들 감지(includes): {includes_best['plan_name']} (score={includes_best_score})"
        )
    return includes_best


def _calculate_hypothetical(
    bundle: dict, subscriptions: list[dict], current_total: int
) -> dict:
    """
    특정 번들을 추가했을 때의 비용 변화를 순수 Python으로 계산.
    번들 가격 + (대체 불가 구독 합계) vs 현재 총액 비교.
    """
    includes = _normalize_includes(bundle.get("includes"))
    bundle_price = int(bundle.get("base_price") or 0)

    individual_subs = [s for s in subscriptions if not s.get("is_bundle")]
    matched = [
        s for s in individual_subs
        if _matches_bundle(s["service_name"], includes, s.get("_canonical"))
    ]
    replaceable_cost = int(sum(s["_monthly"] for s in matched))
    # 순 변화: 번들 추가 비용 - 없앨 수 있는 구독 비용 (음수 = 절약)
    net_change = bundle_price - replaceable_cost
    new_total = current_total + net_change

    logger.info(
        f"[type4] 가상 시나리오: bundle={bundle['plan_name']} price={bundle_price}, "
        f"replaceable={replaceable_cost}, net_change={net_change}"
    )
    return {
        "bundle_name": bundle["plan_name"],
        "provider": bundle["provider"],
        "bundle_price": bundle_price,
        "replaceable_subscriptions": [
            {"name": m["service_name"], "price": m["_monthly"]} for m in matched
        ],
        "replaceable_cost": replaceable_cost,
        "net_change": net_change,
        "new_total": new_total,
        "current_total": current_total,
    }


def _normalize_service_names(subscriptions: list[dict], bundles: list[dict]) -> None:
    """
    Claude Haiku로 구독 서비스명을 번들 includes 기준 정규화.
    각 subscription dict에 '_canonical' 키를 인플레이스 추가.
    """
    import re as _re

    all_includes = sorted({
        inc
        for b in bundles
        for inc in (b.get("includes") or [])
    })
    if not all_includes:
        return

    sub_names = [s["service_name"] for s in subscriptions]

    prompt = (
        f"[구독 서비스명]\n{json.dumps(sub_names, ensure_ascii=False)}\n\n"
        f"[번들 포함 서비스명 목록]\n{json.dumps(all_includes, ensure_ascii=False)}\n\n"
        "위 구독 서비스명을 번들 목록의 이름과 매칭하여 정규화하세요.\n"
        "매칭 안 되면 원래 이름 유지. JSON만 반환: {\"원래이름\": \"정규화된이름\", ...}"
    )

    try:
        resp = _client.messages.create(
            model="claude-haiku-4-5-20251001",
            max_tokens=500,
            temperature=0,
            system="유효한 JSON만 출력하세요. 마크다운, 설명 텍스트, 코드 블록 금지.",
            messages=[{"role": "user", "content": prompt}],
        )
        raw_text = resp.content[0].text.strip()
        raw_text = _re.sub(r"^```[a-zA-Z]*\n?", "", raw_text)
        raw_text = _re.sub(r"\n?```$", "", raw_text).strip()
        logger.info(f"[type4] Haiku 정규화 응답: {raw_text[:300]}")
        name_map: dict = json.loads(raw_text)
    except Exception as e:
        logger.warning(f"[type4] 서비스명 정규화 실패: {e}")
        name_map = {}

    for s in subscriptions:
        original = s["service_name"]
        canonical = name_map.get(original, original)
        if canonical != original:
            logger.info(f"[type4] 정규화: {original} → {canonical}")
        s["_canonical"] = canonical


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


def _build_existing_coverage(subscriptions: list[dict], all_bundles: list[dict]) -> set[str]:
    """Return lowercase service names already covered by the user's existing bundle subscriptions."""
    coverage: set[str] = set()
    for s in subscriptions:
        bid = s.get("bundle_id")
        if not bid:
            continue
        for b in all_bundles:
            if str(b["id"]) == str(bid):
                for inc in _normalize_includes(b.get("includes")):
                    coverage.add(inc.lower().strip())
                break
    if coverage:
        logger.info(f"[type4] 기존 번들 포함 서비스: {sorted(coverage)}")
    return coverage


async def run(question: str, user_id: str, session_id: str) -> dict:
    # ── Step 1: DB 병렬 조회 (subscriptions + carrier 동시) ───────────────────
    subscriptions, mobile_carrier = await asyncio.gather(
        asyncio.to_thread(_fetch_user_subscriptions, user_id),
        asyncio.to_thread(_fetch_mobile_carrier, user_id),
    )

    for s in subscriptions:
        logger.info(
            f"[type4] 구독: {s['service_name']} | "
            f"{s.get('amount')}원/{s.get('billing_cycle')} | "
            f"is_bundle={s.get('is_bundle')} | bundle_id={s.get('bundle_id')}"
        )

    subscribed_bundle_ids = {
        str(s["bundle_id"]) for s in subscriptions
        if s.get("bundle_id")
    }
    logger.info(f"[type4] 이미 구독 중인 bundle_id: {subscribed_bundle_ids or '없음'}")

    # ── Step 2: 번들 조회 (carrier 확정 후) ───────────────────────────────────
    all_bundles = await asyncio.to_thread(_fetch_bundle_candidates, mobile_carrier)
    bundles = [b for b in all_bundles if str(b["id"]) not in subscribed_bundle_ids]
    logger.info(f"[type4] 번들 후보: 전체 {len(all_bundles)}개 → 필터 후 {len(bundles)}개")

    # 기존 번들이 이미 커버하는 서비스 목록
    existing_coverage = _build_existing_coverage(subscriptions, all_bundles)

    # ── Step 2.5: 시뮬레이션 감지 (순수 Python, 즉시) ───────────────────────
    # 시뮬레이션 경로는 Haiku 정규화 불필요 → 바로 계산 후 early return

    # _monthly 필드 사전 계산 (모든 시뮬레이션 경로에서 필요)
    for s in subscriptions:
        s["_monthly"] = _to_monthly(int(s.get("amount") or 0), s.get("billing_cycle", "MONTHLY"))
        s.setdefault("_canonical", s["service_name"])
    current_total = int(sum(s["_monthly"] for s in subscriptions))

    cancel_targets = _find_cancellation_targets(question, subscriptions)
    hypo_bundle = _find_hypothetical_bundle(question, all_bundles)

    if cancel_targets and hypo_bundle:
        # ── 복합 시뮬레이션: 해지 + 번들 전환 ───────────────────────────────
        combined = _calculate_combined(cancel_targets, hypo_bundle, subscriptions, current_total)
        user_prompt = (
            f"사용자 질문: {question}\n\n"
            f"[복합 시뮬레이션 계산 결과 — 숫자 변경 금지]\n"
            f"{json.dumps(combined, ensure_ascii=False, indent=2)}\n\n"
            f"[사용자 현재 구독]\n"
            f"{json.dumps([{'name': s['service_name'], 'monthly_price': s['_monthly']} for s in subscriptions], ensure_ascii=False)}"
        )
        history = mem.get_history(user_id, session_id)
        response = _client.messages.create(
            model="claude-sonnet-4-20250514",
            max_tokens=1000,
            temperature=0,
            system=_CAUTION_SYSTEM_PROMPT,
            messages=history + [{"role": "user", "content": user_prompt}],
        )
        raw = response.content[0].text.strip()
        try:
            claude_result = json.loads(raw)
        except json.JSONDecodeError:
            logger.warning(f"[type4] 복합 시뮬레이션 Claude JSON 파싱 실패: {raw[:200]}")
            claude_result = {"view_type": "simple", "answer": raw, "summary": "", "cautions": []}
        mem.append_turn(user_id, session_id, user_prompt, raw)
        return {
            "view_type": "simple",
            "answer": claude_result.get("answer", ""),
            "supporting_data": claude_result.get("supporting_data"),
            "summary": claude_result.get("summary", ""),
            "cautions": claude_result.get("cautions", []),
        }

    if cancel_targets:
        # ── 해지 시뮬레이션 ───────────────────────────────────────────────────
        cancellation = _calculate_cancellation(cancel_targets, current_total)
        user_prompt = (
            f"사용자 질문: {question}\n\n"
            f"[해지 시뮬레이션 계산 결과 — 숫자 변경 금지]\n"
            f"{json.dumps(cancellation, ensure_ascii=False, indent=2)}\n\n"
            f"[사용자 현재 구독]\n"
            f"{json.dumps([{'name': s['service_name'], 'monthly_price': s['_monthly']} for s in subscriptions], ensure_ascii=False)}"
        )
        history = mem.get_history(user_id, session_id)
        response = _client.messages.create(
            model="claude-sonnet-4-20250514",
            max_tokens=1000,
            temperature=0,
            system=_CAUTION_SYSTEM_PROMPT,
            messages=history + [{"role": "user", "content": user_prompt}],
        )
        raw = response.content[0].text.strip()
        try:
            claude_result = json.loads(raw)
        except json.JSONDecodeError:
            logger.warning(f"[type4] 해지 시뮬레이션 Claude JSON 파싱 실패: {raw[:200]}")
            claude_result = {"view_type": "simple", "answer": raw, "summary": "", "cautions": []}
        mem.append_turn(user_id, session_id, user_prompt, raw)
        return {
            "view_type": "simple",
            "answer": claude_result.get("answer", ""),
            "supporting_data": claude_result.get("supporting_data"),
            "summary": claude_result.get("summary", ""),
            "cautions": claude_result.get("cautions", []),
        }

    if hypo_bundle:
        # ── 번들 추가 가상 시나리오 ───────────────────────────────────────────
        hypo = _calculate_hypothetical(hypo_bundle, subscriptions, current_total)
        user_prompt = (
            f"사용자 질문: {question}\n\n"
            f"[가상 시나리오 계산 결과 — 숫자 변경 금지]\n"
            f"{json.dumps(hypo, ensure_ascii=False, indent=2)}\n\n"
            f"[사용자 현재 구독]\n"
            f"{json.dumps([{'name': s['service_name'], 'monthly_price': s['_monthly']} for s in subscriptions], ensure_ascii=False)}"
        )
        history = mem.get_history(user_id, session_id)
        response = _client.messages.create(
            model="claude-sonnet-4-20250514",
            max_tokens=1000,
            temperature=0,
            system=_CAUTION_SYSTEM_PROMPT,
            messages=history + [{"role": "user", "content": user_prompt}],
        )
        raw = response.content[0].text.strip()
        try:
            claude_result = json.loads(raw)
        except json.JSONDecodeError:
            logger.warning(f"[type4] 가상 시나리오 Claude JSON 파싱 실패: {raw[:200]}")
            claude_result = {"view_type": "simple", "answer": raw, "summary": "", "cautions": []}
        mem.append_turn(user_id, session_id, user_prompt, raw)
        return {
            "view_type": "simple",
            "answer": claude_result.get("answer", ""),
            "supporting_data": claude_result.get("supporting_data"),
            "summary": claude_result.get("summary", ""),
            "cautions": claude_result.get("cautions", []),
        }

    # ── Step 3: Haiku 정규화 (일반 최적화 경로만) ────────────────────────────
    await asyncio.to_thread(_normalize_service_names, subscriptions, bundles)

    # ── Step 4: pure Python 최적화 계산 ─────────────────────────────────────
    # 팔로업 질문("그럼 얼마야?", "다시 계산해줘") 감지 → 이전 결과 재활용
    _FOLLOWUP_KEYWORDS = ["그럼", "그러면", "방금", "아까", "다시", "그거", "그게", "얼마야", "얼마나"]
    is_followup = (
        any(kw in question for kw in _FOLLOWUP_KEYWORDS)
        and mem.get_calc_result(user_id, session_id) is not None
    )
    if is_followup:
        calc_result = mem.get_calc_result(user_id, session_id)
        logger.info("[type4] 팔로업 질문 감지 — 캐시된 calc_result 재활용")
    else:
        calc_result = calculate_optimization(subscriptions, bundles, existing_coverage)
        mem.save_calc_result(user_id, session_id, calc_result)
    logger.info(
        f"[type4] 계산 완료: current={calc_result['current_total']}, "
        f"optimized={calc_result['optimized_total']}, "
        f"savings={calc_result['savings']}, "
        f"bundles={len(calc_result['recommended_bundles'])}"
    )

    # ── Step 5: Claude — summary + cautions + view_type ──────────────────────
    claude_input = {
        "current_total": calc_result["current_total"],
        "optimized_total": calc_result["optimized_total"],
        "savings": calc_result["savings"],
        "recommended_bundles": calc_result["recommended_bundles"],
        "keep_subscriptions": calc_result["keep_subscriptions"],
    }
    # 비교 질문에 대비해 현재 구독 목록 + 전체 가용 번들을 함께 전달
    user_subscriptions_summary = [
        {"name": s["service_name"], "monthly_price": s["_monthly"]}
        for s in subscriptions
    ]
    bundles_summary = [
        {
            "plan_name": b["plan_name"],
            "provider": b["provider"],
            "price": int(b.get("base_price") or 0),
            "includes": b.get("includes") or [],
            "telecom_exclusive": b.get("telecom_exclusive"),
        }
        for b in bundles
    ]
    user_prompt = (
        f"사용자 질문: {question}\n\n"
        f"[사용자 현재 구독]\n"
        f"{json.dumps(user_subscriptions_summary, ensure_ascii=False)}\n\n"
        f"[가용 번들 목록]\n"
        f"{json.dumps(bundles_summary, ensure_ascii=False)}\n\n"
        f"[최적화 계산 결과 — 숫자 변경 금지]\n"
        f"{json.dumps(claude_input, ensure_ascii=False, indent=2)}"
    )

    history = mem.get_history(user_id, session_id)
    messages = history + [{"role": "user", "content": user_prompt}]

    response = _client.messages.create(
        model="claude-sonnet-4-20250514",
        max_tokens=2000,
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

    # ── Step 6: build final response ──────────────────────────────────────────
    if claude_result.get("view_type") == "simple":
        # 가격 비교 질문: Claude가 직접 답변
        final = {
            "view_type": "simple",
            "answer": claude_result.get("answer", ""),
            "supporting_data": claude_result.get("supporting_data"),
            "summary": claude_result.get("summary", ""),
            "cautions": claude_result.get("cautions", []),
        }
    else:
        # 최적화 질문: 계산값 우선, Claude는 summary + cautions만
        final = {
            "view_type": "optimize",
            **calc_result,
            "summary": claude_result.get("summary", ""),
            "cautions": claude_result.get("cautions", []),
        }
    return final


async def run_stream(question: str, user_id: str, session_id: str):
    """Streaming version — yields SSE event dicts with status updates + final done event."""
    yield {"event": "status", "text": "구독 데이터 조회 중..."}

    subscriptions, mobile_carrier = await asyncio.gather(
        asyncio.to_thread(_fetch_user_subscriptions, user_id),
        asyncio.to_thread(_fetch_mobile_carrier, user_id),
    )

    subscribed_bundle_ids = {
        str(s["bundle_id"]) for s in subscriptions
        if s.get("bundle_id")
    }

    yield {"event": "status", "text": "번들 상품 조회 중..."}

    all_bundles = await asyncio.to_thread(_fetch_bundle_candidates, mobile_carrier)
    bundles = [b for b in all_bundles if str(b["id"]) not in subscribed_bundle_ids]

    existing_coverage = _build_existing_coverage(subscriptions, all_bundles)

    # _monthly 필드 사전 계산
    for s in subscriptions:
        s["_monthly"] = _to_monthly(int(s.get("amount") or 0), s.get("billing_cycle", "MONTHLY"))
        s.setdefault("_canonical", s["service_name"])
    current_total = int(sum(s["_monthly"] for s in subscriptions))

    cancel_targets = _find_cancellation_targets(question, subscriptions)
    hypo_bundle = _find_hypothetical_bundle(question, all_bundles)

    if cancel_targets or hypo_bundle:
        yield {"event": "status", "text": "시뮬레이션 분석 중..."}

        if cancel_targets and hypo_bundle:
            calc_data = _calculate_combined(cancel_targets, hypo_bundle, subscriptions, current_total)
            section_label = "복합 시뮬레이션 계산 결과"
        elif cancel_targets:
            calc_data = _calculate_cancellation(cancel_targets, current_total)
            section_label = "해지 시뮬레이션 계산 결과"
        else:
            calc_data = _calculate_hypothetical(hypo_bundle, subscriptions, current_total)
            section_label = "가상 시나리오 계산 결과"

        user_prompt = (
            f"사용자 질문: {question}\n\n"
            f"[{section_label} — 숫자 변경 금지]\n"
            f"{json.dumps(calc_data, ensure_ascii=False, indent=2)}\n\n"
            f"[사용자 현재 구독]\n"
            f"{json.dumps([{'name': s['service_name'], 'monthly_price': s['_monthly']} for s in subscriptions], ensure_ascii=False)}"
        )
        history = mem.get_history(user_id, session_id)

        yield {"event": "status", "text": "답변 생성 중..."}

        response = await _async_client.messages.create(
            model="claude-sonnet-4-20250514",
            max_tokens=1000,
            temperature=0,
            system=_CAUTION_SYSTEM_PROMPT,
            messages=history + [{"role": "user", "content": user_prompt}],
        )
        raw = response.content[0].text.strip()
        try:
            claude_result = json.loads(raw)
        except json.JSONDecodeError:
            logger.warning(f"[type4] 시뮬레이션 Claude JSON 파싱 실패: {raw[:200]}")
            claude_result = {"view_type": "simple", "answer": raw, "summary": "", "cautions": []}

        mem.append_turn(user_id, session_id, user_prompt, raw)
        yield {"event": "done", "answer": {
            "view_type": "simple",
            "answer": claude_result.get("answer", ""),
            "supporting_data": claude_result.get("supporting_data"),
            "summary": claude_result.get("summary", ""),
            "cautions": claude_result.get("cautions", []),
        }}
        return

    yield {"event": "status", "text": "서비스 매칭 분석 중..."}
    await asyncio.to_thread(_normalize_service_names, subscriptions, bundles)

    yield {"event": "status", "text": "최적 조합 계산 중..."}

    _FOLLOWUP_KW = ["그럼", "그러면", "방금", "아까", "다시", "그거", "그게", "얼마야", "얼마나"]
    is_followup = (
        any(kw in question for kw in _FOLLOWUP_KW)
        and mem.get_calc_result(user_id, session_id) is not None
    )
    if is_followup:
        calc_result = mem.get_calc_result(user_id, session_id)
        logger.info("[type4] 팔로업 질문 감지 — 캐시된 calc_result 재활용")
    else:
        calc_result = calculate_optimization(subscriptions, bundles, existing_coverage)
        mem.save_calc_result(user_id, session_id, calc_result)

    logger.info(
        f"[type4] 계산 완료: current={calc_result['current_total']}, "
        f"optimized={calc_result['optimized_total']}, "
        f"savings={calc_result['savings']}, "
        f"bundles={len(calc_result['recommended_bundles'])}"
    )

    yield {"event": "status", "text": "추천 결과 생성 중..."}

    claude_input = {
        "current_total": calc_result["current_total"],
        "optimized_total": calc_result["optimized_total"],
        "savings": calc_result["savings"],
        "recommended_bundles": calc_result["recommended_bundles"],
        "keep_subscriptions": calc_result["keep_subscriptions"],
    }
    user_subscriptions_summary = [
        {"name": s["service_name"], "monthly_price": s["_monthly"]}
        for s in subscriptions
    ]
    bundles_summary = [
        {
            "plan_name": b["plan_name"],
            "provider": b["provider"],
            "price": int(b.get("base_price") or 0),
            "includes": b.get("includes") or [],
            "telecom_exclusive": b.get("telecom_exclusive"),
        }
        for b in bundles
    ]
    user_prompt = (
        f"사용자 질문: {question}\n\n"
        f"[사용자 현재 구독]\n"
        f"{json.dumps(user_subscriptions_summary, ensure_ascii=False)}\n\n"
        f"[가용 번들 목록]\n"
        f"{json.dumps(bundles_summary, ensure_ascii=False)}\n\n"
        f"[최적화 계산 결과 — 숫자 변경 금지]\n"
        f"{json.dumps(claude_input, ensure_ascii=False, indent=2)}"
    )

    history = mem.get_history(user_id, session_id)

    response = await _async_client.messages.create(
        model="claude-sonnet-4-20250514",
        max_tokens=2000,
        temperature=0,
        system=_CAUTION_SYSTEM_PROMPT,
        messages=history + [{"role": "user", "content": user_prompt}],
    )
    raw = response.content[0].text.strip()

    try:
        claude_result = json.loads(raw)
    except json.JSONDecodeError:
        logger.warning(f"[type4] Claude JSON 파싱 실패, cautions 없이 반환. raw={raw[:200]}")
        claude_result = {}

    for field in _NUMBER_FIELDS:
        expected = calc_result[field]
        actual = claude_result.get(field)
        if actual is not None and actual != expected:
            logger.warning(
                f"[type4] Claude가 {field}를 변경함: expected={expected}, got={actual} — 계산값으로 복원"
            )

    if claude_result.get("view_type") == "simple":
        final = {
            "view_type": "simple",
            "answer": claude_result.get("answer", ""),
            "supporting_data": claude_result.get("supporting_data"),
            "summary": claude_result.get("summary", ""),
            "cautions": claude_result.get("cautions", []),
        }
    else:
        final = {
            "view_type": "optimize",
            **calc_result,
            "summary": claude_result.get("summary", ""),
            "cautions": claude_result.get("cautions", []),
        }

    yield {"event": "done", "answer": final}
