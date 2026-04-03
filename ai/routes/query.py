import json
import logging
from typing import Any

from fastapi import APIRouter, HTTPException
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


@router.post("/query", response_model=QueryResponse)
async def query(req: QueryRequest):
    # Step 1: Classify
    classification = classify_query(req.question)
    query_type: str = classification["type"]
    confidence: float = classification.get("confidence", 0.0)

    # Step 2: Route to agent
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

    # Step 3: Persist conversation turn
    # Claude API requires content to be a string — serialize dict answers (type_4) before storing
    history_answer = json.dumps(answer, ensure_ascii=False) if isinstance(answer, dict) else answer
    mem.append_turn(req.session_id, req.question, history_answer)

    return QueryResponse(answer=answer, query_type=query_type, confidence=confidence)
