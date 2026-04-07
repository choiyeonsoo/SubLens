"""
type3: 번들 상품 약관·조건 질문 — bundle_catalog DB 데이터 기반 답변
"""

import os
import json
import logging
import anthropic
from dotenv import load_dotenv

from db import execute_query
import memory as mem

load_dotenv()

logger = logging.getLogger(__name__)
_client = anthropic.Anthropic(api_key=os.getenv("ANTHROPIC_API_KEY"))

SYSTEM_PROMPT = """당신은 SUBLENS 구독 관리 서비스의 번들 상품 전문 AI입니다.
아래 [번들 정보]를 바탕으로 사용자의 질문에 친절하고 정확하게 답변하세요.

규칙:
- "문서", "DB", "데이터베이스" 등의 단어를 답변에 절대 언급하지 마세요.
- 제공된 번들 정보에 없는 내용은 "해당 내용은 현재 안내드리기 어렵습니다. 통신사 고객센터에 문의해 주세요."라고 말하세요.
- 여러 번들이 조회된 경우 비교해서 설명하세요.
- 친절하고 간결하게 답변하세요.
- 마크다운 사용 금지 (번호 목록과 하이픈(-) 목록은 허용).
- 답변은 한국어로 작성하세요.
"""


def _search_bundles(question: str) -> list[dict]:
    """질문에서 통신사·번들명 키워드를 추출해 관련 번들을 조회합니다."""

    # 통신사 키워드 매핑
    carrier_keywords = {
        "LG U+": ["lgu", "lg u+", "lg유플러스", "유플러스", "유독", "lgu+"],
        "SKT": ["skt", "sk텔레콤", "티플", "t우주", "sk"],
        "KT": ["kt", "케이티", "올레"],
        "NAVER": ["네이버", "naver"],
    }

    question_lower = question.lower()
    matched_carriers = [
        carrier for carrier, keywords in carrier_keywords.items()
        if any(kw in question_lower for kw in keywords)
    ]

    # 번들명 키워드 추출 (질문에서 따옴표 없이도 동작)
    rows = execute_query(
        """
        SELECT id, provider, plan_name, base_price, original_price,
               includes, description, telecom_exclusive, has_options
        FROM bundle_catalog
        WHERE is_active = true
        ORDER BY provider, base_price
        """,
        {},
    )

    if not rows:
        return []

    # 통신사 필터
    if matched_carriers:
        rows = [r for r in rows if r.get("provider") in matched_carriers
                or r.get("telecom_exclusive") in matched_carriers]

    # 서비스명 키워드 매칭 (includes 또는 plan_name에 포함)
    q_words = [w for w in question_lower.split() if len(w) > 1]
    scored: list[tuple[int, dict]] = []
    for row in rows:
        plan_lower = (row.get("plan_name") or "").lower()
        includes = row.get("includes") or []
        includes_lower = " ".join(includes).lower()
        desc_lower = (row.get("description") or "").lower()

        score = sum(
            1 for w in q_words
            if w in plan_lower or w in includes_lower or w in desc_lower
        )
        scored.append((score, row))

    # 점수 기준 정렬, 상위 5개만 반환 (점수 0이면 통신사 필터된 전체)
    scored.sort(key=lambda x: x[0], reverse=True)
    top = [r for s, r in scored if s > 0][:5]
    if not top and matched_carriers:
        # 키워드 매칭 없으면 통신사 전체 번들 반환 (최대 10개)
        top = [r for _, r in scored][:10]

    return top


async def run(question: str, user_id: str, session_id: str) -> str:
    bundles = _search_bundles(question)

    if not bundles:
        return (
            "해당 번들 상품 정보를 찾을 수 없습니다. "
            "통신사 고객센터 또는 공식 홈페이지에서 확인해 주세요."
        )

    logger.info(f"[type3] 조회된 번들 수: {len(bundles)}")

    # DB 데이터를 Claude에게 전달할 형태로 정리
    bundle_context = json.dumps(
        [
            {
                "번들명": b["plan_name"],
                "제공사": b["provider"],
                "월정액": b["base_price"],
                "정가": b.get("original_price"),
                "포함서비스": b.get("includes") or [],
                "통신사전용": b.get("telecom_exclusive"),
                "옵션선택가능": b.get("has_options"),
                "상세설명": b.get("description") or "",
            }
            for b in bundles
        ],
        ensure_ascii=False,
        indent=2,
    )
    

    history = mem.get_history(user_id, session_id)
    messages = history + [
        {
            "role": "user",
            "content": f"[번들 정보]\n{bundle_context}\n\n[사용자 질문]\n{question}",
        }
    ]

    response = _client.messages.create(
        model="claude-sonnet-4-20250514",
        max_tokens=800,
        system=SYSTEM_PROMPT,
        messages=messages,
    )

    return response.content[0].text.strip()


_async_client = anthropic.AsyncAnthropic(api_key=os.getenv("ANTHROPIC_API_KEY"))


async def run_stream(question: str, user_id: str, session_id: str):
    """Streaming version — yields SSE event dicts with token chunks."""
    bundles = _search_bundles(question)

    if not bundles:
        yield {
            "event": "token",
            "text": "해당 번들 상품 정보를 찾을 수 없습니다. 통신사 고객센터 또는 공식 홈페이지에서 확인해 주세요.",
        }
        return

    logger.info(f"[type3] 조회된 번들 수: {len(bundles)}")

    bundle_context = json.dumps(
        [
            {
                "번들명": b["plan_name"],
                "제공사": b["provider"],
                "월정액": b["base_price"],
                "정가": b.get("original_price"),
                "포함서비스": b.get("includes") or [],
                "통신사전용": b.get("telecom_exclusive"),
                "옵션선택가능": b.get("has_options"),
                "상세설명": b.get("description") or "",
            }
            for b in bundles
        ],
        ensure_ascii=False,
        indent=2,
    )

    history = mem.get_history(user_id, session_id)
    messages = history + [
        {
            "role": "user",
            "content": f"[번들 정보]\n{bundle_context}\n\n[사용자 질문]\n{question}",
        }
    ]

    async with _async_client.messages.stream(
        model="claude-sonnet-4-20250514",
        max_tokens=800,
        system=SYSTEM_PROMPT,
        messages=messages,
    ) as stream:
        async for text in stream.text_stream:
            yield {"event": "token", "text": text}
