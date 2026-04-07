import json
import logging
from typing import Any

from fastapi import APIRouter, HTTPException
from fastapi.responses import StreamingResponse
from pydantic import BaseModel
from classifier import classify_query
import memory as mem
from agents import type1_sql, type2_rag, type3_rag, type4_optimize

logger = logging.getLogger(__name__)

router = APIRouter()


class QueryRequest(BaseModel):
    user_id: str
    question: str
    session_id: str


class QueryResponse(BaseModel):
    answer: Any
    query_type: str
    confidence: float


def _sse(data: dict) -> str:
    return f"data: {json.dumps(data, ensure_ascii=False)}\n\n"


# ── Session management endpoints ────────────────────────────────────────────

@router.get("/sessions/{user_id}")
async def list_sessions(user_id: str):
    return mem.list_sessions(user_id)


@router.get("/sessions/{user_id}/{session_id}")
async def get_session(user_id: str, session_id: str):
    messages = mem.get_session_messages(user_id, session_id)
    if not messages:
        raise HTTPException(status_code=404, detail="Session not found or expired")
    return messages


@router.delete("/sessions/{user_id}/{session_id}")
async def delete_session(user_id: str, session_id: str):
    mem.delete_session(user_id, session_id)
    return {"ok": True}


# ── Query endpoints ─────────────────────────────────────────────────────────

@router.post("/query", response_model=QueryResponse)
async def query(req: QueryRequest):
    classification = classify_query(req.question)
    query_type: str = classification["type"]
    confidence: float = classification.get("confidence", 0.0)

    try:
        if query_type == "type_1":
            answer = await type1_sql.run(req.question, req.user_id, req.session_id)
        elif query_type == "type_2":
            answer = await type2_rag.run(req.question, req.user_id, req.session_id)
        elif query_type == "type_3":
            answer = await type3_rag.run(req.question, req.user_id, req.session_id)
        elif query_type == "type_4":
            answer = await type4_optimize.run(req.question, req.user_id, req.session_id)
        else:
            answer = "알 수 없는 질문 유형입니다."
    except Exception as e:
        logger.error(f"[query] agent 오류 — type={query_type}: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail=str(e))

    history_answer = json.dumps(answer, ensure_ascii=False) if isinstance(answer, dict) else answer
    mem.append_turn(req.user_id, req.session_id, req.question, history_answer)

    return QueryResponse(answer=answer, query_type=query_type, confidence=confidence)


@router.post("/query/stream")
async def query_stream(req: QueryRequest):
    classification = classify_query(req.question)
    query_type: str = classification["type"]
    confidence: float = classification.get("confidence", 0.0)

    async def generate():
        yield _sse({"event": "classify", "query_type": query_type, "confidence": confidence})

        full_text = ""
        final_answer = None

        try:
            if query_type == "type_1":
                gen = type1_sql.run_stream(req.question, req.user_id, req.session_id)
            elif query_type == "type_2":
                gen = type2_rag.run_stream(req.question, req.user_id, req.session_id)
            elif query_type == "type_3":
                gen = type3_rag.run_stream(req.question, req.user_id, req.session_id)
            elif query_type == "type_4":
                gen = type4_optimize.run_stream(req.question, req.user_id, req.session_id)
            else:
                yield _sse({"event": "token", "text": "알 수 없는 질문 유형입니다."})
                full_text = "알 수 없는 질문 유형입니다."
                gen = None

            if gen is not None:
                async for event in gen:
                    if event["event"] == "done":
                        final_answer = event.get("answer")
                    else:
                        yield _sse(event)
                        if event["event"] == "token":
                            full_text += event["text"]

        except Exception as e:
            logger.error(f"[query_stream] agent 오류 — type={query_type}: {e}", exc_info=True)
            yield _sse({"event": "error", "message": str(e)})
            return

        answer = final_answer if final_answer is not None else full_text

        yield _sse({
            "event": "done",
            "answer": answer,
            "query_type": query_type,
            "confidence": confidence,
        })

        history_answer = json.dumps(answer, ensure_ascii=False) if isinstance(answer, dict) else answer
        mem.append_turn(req.user_id, req.session_id, req.question, history_answer)

    return StreamingResponse(generate(), media_type="text/event-stream")
