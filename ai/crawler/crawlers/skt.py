"""
SKT T우주 크롤러
목록 URL: https://m.sktuniverse.co.kr/category/sub/tab/detail?ctanId=CC00000012&ctgId=CA00000001&sort=SCORE_DESC
셀렉터 (2026-04-01 직접 확인):
  - 상품 카드:  .info-product-ver
  - 브랜드명:   .txt-brand
  - 설명:       .txt-name
  - 할인가:     .txt-price-sale (~포함이면 옵션 있음)
  - 원가:       .txt-price-orgin
  - 링크 방식:  SPA - href 없음, 카드 클릭 시 JS로 URL 변경
"""

import re
import time
from playwright.sync_api import Page

from db import save_bundle, soft_delete_inactive, validate_crawl_result

PROVIDER = "SKT"
PROVIDER_URL = "https://m.sktuniverse.co.kr/category/sub/tab/detail?ctanId=CC00000012&ctgId=CA00000001&sort=SCORE_DESC"
BASE_URL = "https://m.sktuniverse.co.kr"
TELECOM_EXCLUSIVE = "SKT"
EXPECTED_MIN = 15


def crawl(page: Page) -> int:
    print(f"\n{'='*50}")
    print(f"[SKT] 크롤링 시작")
    print(f"{'='*50}")

    page.goto(PROVIDER_URL, wait_until="domcontentloaded", timeout=30000)
    time.sleep(3)

    # 1단계: 목록 페이지에서 기본 정보 + 인덱스 수집
    products = _parse_product_list(page)
    if not products:
        print("[SKT] 상품 목록 파싱 실패")
        return 0

    print(f"[SKT] {len(products)}개 상품, 옵션 있는 상품: {sum(1 for p in products if p['has_options'])}개")
    saved_names = []

    for idx, product in enumerate(products):
        try:
            # SKT는 단일 상품 구조 — 옵션 크롤링 없음
            save_bundle(product)
            saved_names.append(product["plan_name"])

        except Exception as e:
            print(f"  [오류] {product.get('plan_name','?')}: {e}")

    soft_delete_inactive(PROVIDER, saved_names)
    validate_crawl_result(PROVIDER, len(saved_names), EXPECTED_MIN)

    print(f"[SKT] 완료: {len(saved_names)}건 저장")
    return len(saved_names)


def _parse_product_list(page: Page) -> list[dict]:
    products = []
    cards = page.query_selector_all(".info-product-ver")

    for card in cards:
        try:
            brand_el = card.query_selector(".txt-brand")
            name_el  = card.query_selector(".txt-name")
            sale_el  = card.query_selector(".txt-price-sale")
            orig_el  = card.query_selector(".txt-price-orgin")

            brand     = brand_el.inner_text().strip() if brand_el else None
            desc      = name_el.inner_text().strip() if name_el else None
            sale_text = sale_el.inner_text().strip() if sale_el else ""
            orig_text = orig_el.inner_text().strip() if orig_el else ""

            plan_name = brand or (desc[:40] if desc else None)
            if not plan_name:
                continue

            base_price, original_price, discount_rate = _parse_prices(sale_text, orig_text)
            has_options = "~" in sale_text
            includes    = _extract_includes(plan_name + " " + (desc or ""))

            products.append({
                "provider":          PROVIDER,
                "provider_url":      PROVIDER_URL,
                "plan_name":         plan_name,
                "plan_url":          None,
                "description":       desc,
                "includes":          includes,
                "base_price":        base_price,
                "original_price":    original_price,
                "discount_rate":     discount_rate,
                "contract_months":   None,
                "telecom_exclusive": TELECOM_EXCLUSIVE,
                "has_options":       has_options,
                "options":           [],
            })
        except Exception as e:
            print(f"  [SKT] 카드 파싱 오류: {e}")

    return products


def _crawl_options_by_click(page: Page, card_index: int) -> list[dict]:
    """
    카드를 JS로 클릭해서 SPA 상세 페이지로 이동 후 옵션 수집
    JS evaluate 방식: Playwright 요소 참조가 네비게이션으로 무효화되는 문제 방지
    """
    options = []
    try:
        # 현재 URL 저장
        current_url = page.url

        # JS로 클릭 (요소 참조 대신 인덱스 기반)
        clicked = page.evaluate(f"""
            const cards = document.querySelectorAll('.info-product-ver');
            if (cards[{card_index}]) {{
                cards[{card_index}].click();
                true;
            }} else {{
                false;
            }}
        """)

        if not clicked:
            return options

        # URL 변화 대기 (SPA 네비게이션)
        page.wait_for_url(lambda url: url != current_url and "detail" in url, timeout=8000)
        time.sleep(2)

        # 상세 페이지에서 하위 상품 수집
        detail_cards = page.query_selector_all(".info-product-ver")
        for item in detail_cards:
            brand_el = item.query_selector(".txt-brand")
            name_el  = item.query_selector(".txt-name")
            sale_el  = item.query_selector(".txt-price-sale")

            opt_name  = brand_el.inner_text().strip() if brand_el else None
            opt_spec  = name_el.inner_text().strip() if name_el else None
            sale_text = sale_el.inner_text().strip() if sale_el else "0원"
            price     = _extract_price(sale_text)

            if opt_name and price > 0:
                options.append({
                    "option_name":  opt_name,
                    "option_spec":  opt_spec,
                    "extra_price":  0,
                    "total_price":  price,
                })

        print(f"    → 상세 페이지 옵션 {len(options)}개 수집")

    except Exception as e:
        print(f"  [SKT] 옵션 클릭 크롤링 실패 (idx={card_index}): {e}")

    return options


def _parse_prices(sale_text: str, orig_text: str) -> tuple[int, int | None, int | None]:
    base = _extract_price(sale_text)
    orig = _extract_price(orig_text)
    discount_rate = None
    if base and orig and orig > base:
        discount_rate = round((orig - base) / orig * 100)
    return base, (orig if orig and orig != base else None), discount_rate


def _extract_price(text: str) -> int:
    digits = re.sub(r"[^\d]", "", text.replace(",", ""))
    val = int(digits) if digits else 0
    return val if val >= 1000 else 0


def _extract_includes(text: str) -> list[str]:
    known_services = [
        "넷플릭스", "Netflix",
        "유튜브 프리미엄", "YouTube Premium", "유튜브",
        "왓챠", "웨이브", "티빙", "디즈니+", "디즈니플러스", "디즈니",
        "스포티파이", "멜론", "지니뮤직", "지니", "플로",
        "밀리의서재", "리디", "윌라",
        "쿠팡플레이", "애플TV+",
        "올리브영", "스타벅스", "이마트24", "세븐일레븐", "투썸플레이스",
        "배달의민족", "요기요", "배스킨라빈스", "CGV",
    ]
    found = []
    for svc in known_services:
        if svc in text and svc not in found:
            found.append(svc)
    return found