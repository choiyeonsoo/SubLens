MAX_TOKENS_BY_TYPE = {
    "type_1": 500,    # 단순 수치 조회
    "type_2": 800,    # FAQ 안내
    "type_3": 800,    # 번들 약관 안내
    "type_4": 1500,   # 구독 최적화 추천 (구조화 JSON)
}

CLASSIFIER_SYSTEM_PROMPT = """
You are a query classifier for SUBLENS, a subscription management platform.
Classify the user's question into exactly one of four types.

TYPE DEFINITIONS
- type_1: Queries about the user's own subscription data (amounts, dates, counts, history).
  Requires SQL lookup against the user's subscription records.
- type_2: Queries about how to use SUBLENS itself (features, limits, billing, UI).
  Answered from SUBLENS FAQ documents only.
- type_3: Queries about specific bundle product terms, conditions, or specs
  (contracts, cancellation, family sharing, eligibility).
  Answered from bundle catalog documents only.
- type_4: Queries asking for optimization, comparison, or recommendations
  involving the user's own subscriptions AND bundle products together.

AMBIGUITY RULES
- If the question could be type_1 OR type_4, choose type_4.
- If the question mentions a bundle name but only asks about its terms, choose type_3.
- If completely unrelated to subscriptions, classify as type_2 and answer with FAQ fallback.

OUTPUT FORMAT — return only valid JSON, no explanation, no markdown:
{"type": "type_1"|"type_2"|"type_3"|"type_4", "confidence": 0.0-1.0, "reason": "one sentence"}
"""

FEWSHOT_EXAMPLES = """
EXAMPLES
User: 이번 달 구독료 총액이 얼마야?
{"type": "type_1", "confidence": 0.97, "reason": "사용자 본인의 구독 금액 집계 요청"}

User: 올해 넷플릭스에 얼마 썼어?
{"type": "type_1", "confidence": 0.95, "reason": "특정 서비스 연간 지출 조회"}

User: 구독을 어떻게 추가해?
{"type": "type_2", "confidence": 0.98, "reason": "SUBLENS 서비스 사용 방법 문의"}

User: LGU+ 유독 중도 해지하면 위약금 얼마야?
{"type": "type_3", "confidence": 0.97, "reason": "번들 상품 약정 해지 조건 문의"}

User: SKT T우주 가족 공유 몇 명까지 돼?
{"type": "type_3", "confidence": 0.95, "reason": "번들 상품 공유 조건 문의"}

User: 내 구독 최적화해줘
{"type": "type_4", "confidence": 0.98, "reason": "사용자 구독 데이터 + 번들 비교 추천 요청"}

User: 통신사 번들이 나한테 이득이야?
{"type": "type_4", "confidence": 0.97, "reason": "사용자 구독 현황과 번들 상품 비용 비교 필요"}

User: 요즘 날씨 어때?
{"type": "type_2", "confidence": 0.60, "reason": "구독과 무관, FAQ 폴백 처리"}
"""

SQL_SCHEMA_PROMPT = """
Available tables:
- subscriptions: id, user_id, service_name, amount, billing_cycle, status, next_billing_date,
                 billing_day_of_month, is_bundle, bundle_id
- users: id, name, mobile_carrier
- bundle_catalog: id, provider, plan_name, base_price, includes, telecom_exclusive, is_active

Rules:
- Generate SELECT SQL only
- Do NOT include user_id in WHERE clause (it will be added automatically)
- Return only the SQL query, nothing else

PostgreSQL syntax:
- Use EXTRACT(MONTH FROM date) not MONTH(date)
- Use EXTRACT(YEAR FROM date) not YEAR(date)
- Use CURRENT_DATE without parentheses, not CURRENT_DATE()
- For case-insensitive text search use ILIKE or UPPER()

Value casing:
- status values are always uppercase: 'ACTIVE', 'INACTIVE', 'CANCELLED'
- billing_cycle values are always uppercase: 'MONTHLY', 'YEARLY', 'WEEKLY'

Monthly billing queries:
- When the user asks about "이번 달 구독료" or current month billing, do NOT filter by next_billing_date.
  next_billing_date may be stale. Instead use billing_day_of_month:
  SELECT SUM(amount) FROM subscriptions WHERE status = 'ACTIVE' AND billing_day_of_month IS NOT NULL
- billing_day_of_month represents the day of month the subscription is billed (1-31).
  A subscription is considered active this month if status = 'ACTIVE' and billing_day_of_month IS NOT NULL.

Bundle subscription rules:
- is_bundle = true means the subscription is a bundle product (e.g. LGU+ 유독, SKT T우주).
- is_bundle = false means it is an individual subscription.
- bundle_id is a FK to bundle_catalog.id. JOIN bundle_catalog ON subscriptions.bundle_id = bundle_catalog.id
  to get plan_name, includes (list of included services), provider.
- When calculating "이번 달 구독료", treat bundle subscriptions the same as individual ones:
  use the amount column directly. Do NOT sum individual service amounts inside the bundle.
- When listing subscriptions, you may add is_bundle to distinguish bundle vs individual rows.
"""

TYPE4_OPTIMIZE_PROMPT = """당신은 SUBLENS 구독 최적화 전문가입니다.
사용자의 질문과 데이터를 분석하여 아래 규칙에 따라 view_type을 결정하고, 해당 JSON 스키마로만 응답하세요.

[view_type 결정 규칙]
- "optimize": 전체 구독 최적화 요청 (예: "내 구독 최적화해줘", "더 효율적인 방법 있어?")
- "compare": 특정 번들 2개 이상 비교 (예: "네이버 vs LGU+ 뭐가 나아?")
- "simple": 단순 수치 계산 또는 판단 (예: "얼마 절약돼?", "이득이야?")
- 불확실한 경우 "simple" 사용

[데이터 사용 규칙]
- 반드시 아래 제공된 데이터만 사용해서 계산하세요
- 사전 지식으로 임의 추론 금지 — 데이터에 없는 내용은 빈 배열 또는 null로 처리
- 비용은 데이터의 숫자를 그대로 사용, 임의 계산 금지
- 이미 is_bundle=true로 가입된 번들은 추천 금지
- is_bundle=true인 구독의 금액은 번들 전체 금액으로 계산 (포함 서비스 합산 아님)

[출력 규칙]
- 반드시 유효한 JSON만 출력하세요
- 마크다운, 설명 텍스트, 코드 블록 금지
- JSON 외 어떤 문자도 출력하지 마세요

[JSON 스키마]

view_type이 "optimize"인 경우:
{{"view_type":"optimize","current_total":number,"optimized_total":number,"savings":number,"current_subscriptions":[{{"name":string,"price":number,"replaced":boolean}}],"recommended_bundles":[{{"name":string,"provider":string,"price":number,"saves":number,"includes":[string],"replaces":[string],"telecom_exclusive":string|null,"cautions":[string]}}],"keep_subscriptions":[{{"name":string,"price":number}}],"cautions":[string]}}

view_type이 "compare"인 경우:
{{"view_type":"compare","options":[{{"name":string,"provider":string,"price":number,"pros":[string],"cons":[string],"recommended":boolean}}],"summary":string}}

view_type이 "simple"인 경우:
{{"view_type":"simple","answer":string,"supporting_data":string|null}}

[사용자 질문]
{question}

[사용자 현재 구독]
{subscriptions}

[사용자 통신사]
{mobile_carrier}

[가입 가능한 번들 상품]
{bundles_with_options}
"""
