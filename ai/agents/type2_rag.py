"""
type2: SUBLENS 사용법 질문 — PDF 문서 기반 RAG 답변
"""

import os
import logging
import anthropic
from dotenv import load_dotenv

import memory as mem
from rag import retrieve

load_dotenv()

logger = logging.getLogger(__name__)

_client = anthropic.Anthropic(api_key=os.getenv("ANTHROPIC_API_KEY"))

COLLECTION = "sublens_guide"

SYSTEM_PROMPT = """당신은 SUBLENS 구독 관리 서비스의 친절한 AI 도우미입니다.
아래 [참고 정보]를 바탕으로 사용자의 질문에 자연스럽고 친근하게 답변하세요.

규칙:
- "문서", "참고 문서", "가이드" 등의 단어를 답변에 절대 언급하지 마세요.
- 참고 정보에 해당 내용이 있다면 반드시 활용해서 구체적으로 안내하세요.
- 구독·서비스와 전혀 무관한 질문(날씨, 스포츠 등)은 "저는 SUBLENS 구독 관리 전용 AI라 해당 질문은 답변하기 어렵습니다. 구독 추가, 비용 분석, 번들 추천 등 구독 관련 질문을 해주세요 😊"라고 말하세요.
- 참고 정보에 없는 내용은 "현재 해당 내용은 안내드리기 어렵습니다. 더 궁금하신 점은 고객센터로 문의해 주세요."라고 말하세요.
- 친절하고 간결하게 답변하세요. 불필요한 반복 금지.
- 마크다운 사용 금지 (번호 목록과 하이픈(-) 목록은 허용).
- 답변은 한국어로 작성하세요.
"""


async def run(question: str, user_id: str, session_id: str) -> str:
    chunks = retrieve(question, COLLECTION, top_k=6)

    if not chunks:
        logger.warning("[type2_rag] ChromaDB 컬렉션이 없거나 비어 있음 — ingest.py를 먼저 실행하세요.")
        return (
            "사용 가이드 데이터가 아직 준비되지 않았습니다. "
            "잠시 후 다시 시도해 주세요."
        )

    context = "\n\n---\n\n".join(chunks)
    logger.info(f"[type2_rag] 검색된 청크 수: {len(chunks)}")

    history = mem.get_history(user_id, session_id)

    messages = history + [
        {
            "role": "user",
            "content": (
                f"[참고 정보]\n{context}\n\n"
                f"[사용자 질문]\n{question}"
            ),
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
    chunks = retrieve(question, COLLECTION, top_k=6)

    if not chunks:
        logger.warning("[type2_rag] ChromaDB 컬렉션이 없거나 비어 있음 — ingest.py를 먼저 실행하세요.")
        yield {
            "event": "token",
            "text": "사용 가이드 데이터가 아직 준비되지 않았습니다. 잠시 후 다시 시도해 주세요.",
        }
        return

    context = "\n\n---\n\n".join(chunks)
    logger.info(f"[type2_rag] 검색된 청크 수: {len(chunks)}")

    history = mem.get_history(user_id, session_id)
    messages = history + [
        {
            "role": "user",
            "content": (
                f"[참고 정보]\n{context}\n\n"
                f"[사용자 질문]\n{question}"
            ),
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
