import logging
import os
import json
import anthropic
from dotenv import load_dotenv
from prompts import CLASSIFIER_SYSTEM_PROMPT, FEWSHOT_EXAMPLES

load_dotenv()

logger = logging.getLogger(__name__)

_client = anthropic.Anthropic(api_key=os.getenv("ANTHROPIC_API_KEY"))
FALLBACK_CONFIDENCE = 0.55


def classify_query(question: str) -> dict:
    """
    Returns {"type": "type_1|2|3|4", "confidence": float, "reason": str}
    Falls back to type_2 if confidence < FALLBACK_CONFIDENCE or on parse error.
    """
    user_content = f"{FEWSHOT_EXAMPLES}\nUser: {question}"

    message = _client.messages.create(
        model="claude-sonnet-4-20250514",
        max_tokens=100,
        temperature=0,
        system=CLASSIFIER_SYSTEM_PROMPT,
        messages=[{"role": "user", "content": user_content}],
    )

    raw = message.content[0].text.strip()

    try:
        result = json.loads(raw)
        if result.get("confidence", 0) < FALLBACK_CONFIDENCE:
            result["type"] = "type_2"
        logger.info(f"[분류] type={result['type']}, confidence={result['confidence']}, reason={result['reason']}")
        return result
    except (json.JSONDecodeError, KeyError):
        result = {"type": "type_2", "confidence": 0.0, "reason": "분류 실패 — FAQ 폴백"}
        logger.info(f"[분류] type={result['type']}, confidence={result['confidence']}, reason={result['reason']}")
        return result
