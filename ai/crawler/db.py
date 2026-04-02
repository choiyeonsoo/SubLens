import os
import psycopg2
import psycopg2.extras
from dotenv import load_dotenv

load_dotenv()

# 모듈 레벨 단일 커넥션 - 크롤 세션 전체에서 재사용
_conn = None


def get_conn():
    global _conn
    if _conn is None or _conn.closed:
        _conn = psycopg2.connect(os.environ["DATABASE_URL"])
    return _conn


def close_conn():
    global _conn
    if _conn and not _conn.closed:
        _conn.close()
        _conn = None


def save_bundle(data: dict) -> None:
    conn = get_conn()
    try:
        with conn.cursor(cursor_factory=psycopg2.extras.RealDictCursor) as cur:

            cur.execute(
                """
                SELECT id, base_price FROM bundle_catalog
                WHERE provider = %s AND plan_name = %s
                """,
                (data["provider"], data["plan_name"]),
            )
            existing = cur.fetchone()

            if existing:
                bundle_id = existing["id"]

                if existing["base_price"] != data["base_price"]:
                    cur.execute(
                        """
                        INSERT INTO bundle_price_history
                            (bundle_id, old_price, new_price, change_reason)
                        VALUES (%s, %s, %s, 'crawl_update')
                        """,
                        (bundle_id, existing["base_price"], data["base_price"]),
                    )
                    print(
                        f"  [가격변동] {data['plan_name']}: "
                        f"{existing['base_price']}원 → {data['base_price']}원"
                    )

                cur.execute(
                    """
                    UPDATE bundle_catalog SET
                        plan_url          = %s,
                        description       = %s,
                        includes          = %s,
                        service_ids       = %s::uuid[],
                        base_price        = %s,
                        original_price    = %s,
                        discount_rate     = %s,
                        contract_months   = %s,
                        telecom_exclusive = %s,
                        has_options       = %s,
                        is_active         = true,
                        crawled_at        = NOW(),
                        updated_at        = NOW()
                    WHERE id = %s
                    """,
                    (
                        data.get("plan_url"),
                        data.get("description"),
                        data["includes"],
                        data.get("service_ids") or [],
                        data["base_price"],
                        data.get("original_price"),
                        data.get("discount_rate"),
                        data.get("contract_months"),
                        data.get("telecom_exclusive"),
                        data.get("has_options", False),
                        bundle_id,
                    ),
                )

            else:
                cur.execute(
                    """
                    INSERT INTO bundle_catalog
                        (provider, provider_url, plan_name, plan_url, description,
                         includes, service_ids, base_price, original_price, discount_rate,
                         contract_months, telecom_exclusive, has_options)
                    VALUES (%s,%s,%s,%s,%s,%s,%s::uuid[],%s,%s,%s,%s,%s,%s)
                    RETURNING id
                    """,
                    (
                        data["provider"],
                        data.get("provider_url"),
                        data["plan_name"],
                        data.get("plan_url"),
                        data.get("description"),
                        data["includes"],
                        data.get("service_ids") or [],
                        data["base_price"],
                        data.get("original_price"),
                        data.get("discount_rate"),
                        data.get("contract_months"),
                        data.get("telecom_exclusive"),
                        data.get("has_options", False),
                    ),
                )
                bundle_id = cur.fetchone()["id"]
                print(f"  [신규] {data['plan_name']} 저장 완료")

        conn.commit()
    except Exception:
        conn.rollback()
        raise

    if data.get("options"):
        save_options(bundle_id, data["options"])


def save_options(bundle_id: str, options: list[dict]) -> None:
    conn = get_conn()
    try:
        with conn.cursor() as cur:
            for opt in options:
                cur.execute(
                    """
                    INSERT INTO bundle_option
                        (bundle_id, option_name, option_spec, extra_price, total_price)
                    VALUES (%s, %s, %s, %s, %s)
                    ON CONFLICT DO NOTHING
                    """,
                    (
                        bundle_id,
                        opt["option_name"],
                        opt.get("option_spec"),
                        opt.get("extra_price", 0),
                        opt["total_price"],
                    ),
                )
        conn.commit()
    except Exception:
        conn.rollback()
        raise


def soft_delete_inactive(provider: str, active_plan_names: list[str]) -> None:
    conn = get_conn()
    try:
        with conn.cursor() as cur:
            cur.execute(
                """
                UPDATE bundle_catalog
                SET is_active = false, updated_at = NOW()
                WHERE provider = %s
                  AND plan_name != ALL(%s)
                  AND is_active = true
                """,
                (provider, active_plan_names),
            )
            count = cur.rowcount
            if count > 0:
                print(f"  [soft delete] {provider} 상품 {count}건 비활성화")
        conn.commit()
    except Exception:
        conn.rollback()
        raise


def validate_crawl_result(provider: str, new_count: int, expected_min: int) -> None:
    if new_count < expected_min * 0.7:
        print(
            f"[경고] {provider} 크롤링 이상: {new_count}건 수집 "
            f"(기대 최소 {expected_min}건) — 봇 차단 또는 페이지 구조 변경 의심"
        )


def fetch_service_name_to_id() -> dict[str, str]:
    """subscription_services 테이블에서 name→id 매핑을 반환 (소문자 키)"""
    conn = get_conn()
    try:
        with conn.cursor(cursor_factory=psycopg2.extras.RealDictCursor) as cur:
            cur.execute("SELECT id, name FROM subscription_services WHERE is_active = true")
            rows = cur.fetchall()
        return {row["name"].lower(): str(row["id"]) for row in rows}
    except Exception:
        conn.rollback()
        raise


# 한국어 표기 → subscription_services.name 매핑 테이블
KO_TO_SERVICE_NAME: dict[str, str] = {
    "넷플릭스": "Netflix",
    "유튜브 프리미엄": "YouTube Premium",
    "유튜브프리미엄": "YouTube Premium",
    "디즈니+": "Disney+",
    "디즈니플러스": "Disney+",
    "티빙": "Tving",
    "웨이브": "Wavve",
    "왓챠": "Watcha",
    "스포티파이": "Spotify",
    "멜론": "Melon",
    "지니뮤직": "Genie",
    "지니": "Genie",
    "플로": "FLO",
    "밀리의서재": "Millie's Library",
    "쿠팡플레이": "Coupang Play",
    "애플TV+": "Apple TV+",
}


def resolve_service_ids(includes: list[str], name_to_id: dict[str, str]) -> list[str]:
    """
    includes(한국어 서비스명 리스트)를 subscription_services UUID 리스트로 변환.
    KO_TO_SERVICE_NAME으로 영문 정규명 변환 후 name_to_id로 UUID 조회.
    매핑 실패 항목은 무시.
    """
    result = []
    for ko_name in includes:
        en_name = KO_TO_SERVICE_NAME.get(ko_name, ko_name)
        uid = name_to_id.get(en_name.lower())
        if uid and uid not in result:
            result.append(uid)
    return result