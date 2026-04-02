"""
KT 구독 크롤러
URL: https://my.kt.com/product/OttSubscribeView.do
셀렉터 (2026-04-01 직접 확인):
  - 상품 카드: .ottProductFrame (36개)
  - 상품명:    .opage-name
  - 정상가:    .opage-price
  - 할인가:    .opage-discount-price
  - 뱃지:      .opage-discount-badge
  - 링크:      .opage-subscription-link
"""

import re
import time
from playwright.sync_api import Page

from db import save_bundle, soft_delete_inactive, validate_crawl_result, fetch_service_name_to_id, resolve_service_ids

PROVIDER = "KT"
PROVIDER_URL = "https://my.kt.com/product/OttSubscribeView.do"
TELECOM_EXCLUSIVE = "KT"
EXPECTED_MIN = 25


def crawl(page: Page) -> int:
    print(f"\n{'='*50}")
    print(f"[KT] 크롤링 시작")
    print(f"{'='*50}")

    page.goto(PROVIDER_URL, wait_until="domcontentloaded", timeout=30000)
    time.sleep(3)

    name_to_id = fetch_service_name_to_id()
    products = _parse_product_list(page, name_to_id)

    if not products:
        print("[KT] 상품 목록 파싱 실패")
        return 0

    print(f"[KT] {len(products)}개 상품 발견")
    saved_names = []

    for product in products:
        try:
            save_bundle(product)
            saved_names.append(product["plan_name"])
        except Exception as e:
            print(f"  [오류] {product.get('plan_name', '?')}: {e}")

    soft_delete_inactive(PROVIDER, saved_names)
    validate_crawl_result(PROVIDER, len(saved_names), EXPECTED_MIN)

    print(f"[KT] 완료: {len(saved_names)}건 저장")
    return len(saved_names)


def _parse_product_list(page: Page, name_to_id: dict) -> list[dict]:
    products = []

    cards = page.query_selector_all(".ottProductFrame")
    if not cards:
        print("  [KT] .ottProductFrame 셀렉터 매칭 실패")
        return []

    for card in cards:
        try:
            name_el    = card.query_selector(".opage-name")
            price_el   = card.query_selector(".opage-price")
            disc_el    = card.query_selector(".opage-discount-price")
            badge_el   = card.query_selector(".opage-discount-badge")
            link_el    = card.query_selector(".opage-subscription-link")

            plan_name = name_el.inner_text().strip() if name_el else None
            if not plan_name:
                continue

            price_text = price_el.inner_text().strip() if price_el else ""
            disc_text  = disc_el.inner_text().strip() if disc_el else ""
            badge_text = badge_el.inner_text().strip() if badge_el else ""
            plan_url   = link_el.get_attribute("href") if link_el else None

            original_price = _extract_price(price_text)
            base_price     = _extract_price(disc_text)

            # 할인가 없으면 정상가가 곧 판매가
            if base_price == 0:
                base_price = original_price
                original_price = None

            discount_rate = None
            if original_price and base_price and original_price > base_price:
                discount_rate = round((original_price - base_price) / original_price * 100)

            # KT Only 여부 뱃지에서 확인
            is_kt_only = "KT Only" in badge_text or "KT only" in badge_text

            includes = _extract_includes(plan_name)
            service_ids = resolve_service_ids(includes, name_to_id)

            products.append({
                "provider": PROVIDER,
                "provider_url": PROVIDER_URL,
                "plan_name": plan_name,
                "plan_url": plan_url,
                "description": badge_text.replace("\n", " ") if badge_text else None,
                "includes": includes,
                "service_ids": service_ids,
                "base_price": base_price,
                "original_price": original_price,
                "discount_rate": discount_rate,
                "contract_months": None,
                "telecom_exclusive": TELECOM_EXCLUSIVE if is_kt_only else TELECOM_EXCLUSIVE,
                "has_options": False,
                "options": [],
            })

        except Exception as e:
            print(f"  [KT] 카드 파싱 오류: {e}")
            continue

    return products


def _extract_price(text: str) -> int:
    """
    '정상가\n월 19,800 원' → 19800
    '월 7,000원 ~17,000원' → 7000 (범위 가격이면 최솟값)
    """
    prices = re.findall(r'[\d,]+', text.replace(' ', ''))
    vals = [int(p.replace(',', '')) for p in prices if int(p.replace(',', '')) >= 1000]
    if not vals:
        return 0
    return min(vals)


def _extract_includes(name: str) -> list[str]:
    known_services = [
        "넷플릭스", "Netflix",
        "유튜브 프리미엄", "YouTube Premium", "유튜브",
        "왓챠", "웨이브", "티빙", "시즌",
        "디즈니플러스", "디즈니+", "디즈니",
        "스포티파이", "멜론", "지니뮤직", "지니", "플로",
        "밀리의서재", "리디", "윌라",
        "쿠팡플레이", "애플TV+",
        "메가MGC커피", "스타벅스", "CGV",
        "티티케어",
    ]
    found = []
    for svc in known_services:
        if svc in name and svc not in found:
            found.append(svc)
    return found