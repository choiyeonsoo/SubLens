from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from classifier import classify_query
import memory as mem
from agents import type1_sql, type2_rag, type3_rag, type4_optimize

router = APIRouter()


class QueryRequest(BaseModel):
    user_id: str
    question: str
    session_id: str


class QueryResponse(BaseModel):
    answer: str
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
        raise HTTPException(status_code=500, detail=str(e))

    # Step 3: Persist conversation turn
    mem.append_turn(req.session_id, req.question, answer)

    return QueryResponse(answer=answer, query_type=query_type, confidence=confidence)
