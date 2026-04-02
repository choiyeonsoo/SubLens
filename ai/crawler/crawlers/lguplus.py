"""
LGU+ 유독 크롤러
URL: https://www.lguplus.com/pogg/category/전체
셀렉터 (2026-04-01 직접 확인):
  - 상품 카드:  .pg-prod-item
  - 상품명:    .pi-tit .p-tt 또는 .pi-tit
  - 부제목:    .pi-stit
  - 가격:      .p-prcs
  - 옵션 버튼: .pr-btne (카드 내부)
  - 옵션 모달: div[class*="pg-pop"]
  - 옵션 항목: .pogg-product_add_on_area
  - 옵션명:    .product_add_on_name
  - 옵션스펙:  .product_add_on_option
  - 추가가격:  .price
  - 닫기:      .c-btn-close
"""

import re
import time
from playwright.sync_api import Page

from db import save_bundle, soft_delete_inactive, validate_crawl_result

PROVIDER = "LGU+"
PROVIDER_URL = "https://www.lguplus.com/pogg/category/%EC%A0%84%EC%B2%B4"
TELECOM_EXCLUSIVE = "LG U+"
EXPECTED_MIN = 40


def crawl(page: Page) -> int:
    print(f"\n{'='*50}")
    print(f"[LGU+] 크롤링 시작")
    print(f"{'='*50}")

    page.goto(PROVIDER_URL, wait_until="domcontentloaded", timeout=30000)
    time.sleep(3)

    # 상품 카드 요소 목록 수집
    items = page.query_selector_all(".pg-prod-item")
    if not items:
        print("[LGU+] .pg-prod-item 셀렉터 매칭 실패")
        return 0

    print(f"[LGU+] {len(items)}개 상품 발견, 크롤링 시작...")
    saved_names = []

    for idx, item in enumerate(items):
        try:
            product = _parse_item(item)
            if not product:
                continue

            # 옵션 있는 상품은 해당 카드의 버튼 직접 클릭
            if product["has_options"]:
                product["options"] = _crawl_options(page, item)

            save_bundle(product)
            saved_names.append(product["plan_name"])

        except Exception as e:
            print(f"  [오류] idx={idx}: {e}")

    soft_delete_inactive(PROVIDER, saved_names)
    validate_crawl_result(PROVIDER, len(saved_names), EXPECTED_MIN)

    print(f"[LGU+] 완료: {len(saved_names)}건 저장")
    return len(saved_names)


def _parse_item(item) -> dict | None:
    name_el  = item.query_selector(".pi-tit .p-tt, .pi-tit")
    sub_el   = item.query_selector(".pi-stit")
    price_el = item.query_selector(".p-prcs")
    btn_el   = item.query_selector(".pr-btne")

    name = name_el.inner_text().strip() if name_el else None
    if not name:
        return None

    description  = sub_el.inner_text().strip() if sub_el else None
    price_text   = price_el.inner_text().strip() if price_el else ""
    btn_text     = btn_el.inner_text().strip() if btn_el else ""
    has_options  = "옵션선택" in btn_text

    base_price, original_price, discount_rate = _parse_price_block(price_text)
    includes        = _extract_includes(name + " " + (description or ""))
    contract_months = _extract_contract(name + " " + (description or ""))

    return {
        "provider":          PROVIDER,
        "provider_url":      PROVIDER_URL,
        "plan_name":         name,
        "plan_url":          None,
        "description":       description,
        "includes":          includes,
        "base_price":        base_price,
        "original_price":    original_price,
        "discount_rate":     discount_rate,
        "contract_months":   contract_months,
        "telecom_exclusive": TELECOM_EXCLUSIVE,
        "has_options":       has_options,
        "options":           [],
    }


def _crawl_options(page: Page, item) -> list[dict]:
    """
    상품 카드(item) 안의 옵션선택 버튼을 직접 클릭 → 모달 파싱 → 닫기
    page.evaluate() 대신 Playwright 요소 직접 클릭으로 정확한 모달 오픈
    """
    options = []
    try:
        btn = item.query_selector(".pr-btne")
        if not btn:
            return options

        btn.click()
        page.wait_for_selector('div[class*="pg-pop"]', timeout=5000)
        time.sleep(0.8)

        popup = page.query_selector('div[class*="pg-pop"]')
        if not popup:
            return options

        option_items = popup.query_selector_all(".pogg-product_add_on_area")
        for opt in option_items:
            name_el  = opt.query_selector(".product_add_on_name")
            spec_el  = opt.query_selector(".product_add_on_option")
            price_el = opt.query_selector(".price")

            opt_name  = name_el.inner_text().strip() if name_el else None
            opt_spec  = spec_el.inner_text().strip() if spec_el else None
            # ".price" 예: "+ 0원" 또는 "+ 5,500원\n월 6,500원" → 첫 줄만
            price_text = price_el.inner_text().strip().split("\n")[0] if price_el else "0원"
            extra_price = _extract_price(price_text)

            if opt_name:
                options.append({
                    "option_name":  opt_name,
                    "option_spec":  opt_spec,
                    "extra_price":  extra_price,
                    "total_price":  extra_price,  # LGU+는 추가금액 = 합계금액
                })

        # 모달 닫기
        close_btn = popup.query_selector(".c-btn-close")
        if close_btn:
            close_btn.click()
            time.sleep(0.5)

    except Exception as e:
        print(f"  [LGU+] 옵션 파싱 실패: {e}")
        try:
            btn = page.query_selector(".c-btn-close")
            if btn:
                btn.click()
        except Exception:
            pass

    return options


def _parse_price_block(text: str) -> tuple[int, int | None, int | None]:
    prices = re.findall(r"[\d,]+원", text)
    discount_match = re.search(r"(\d+)%", text)
    price_ints = [int(p.replace(",", "").replace("원", "")) for p in prices]
    price_ints = [p for p in price_ints if p >= 1000]
    discount_rate = int(discount_match.group(1)) if discount_match else None
    if not price_ints:
        return 0, None, None
    if len(price_ints) == 1:
        return price_ints[0], None, None
    sorted_p = sorted(price_ints)
    return sorted_p[0], sorted_p[-1], discount_rate


def _extract_price(text: str) -> int:
    digits = re.sub(r"[^\d]", "", text.replace(",", ""))
    val = int(digits) if digits else 0
    return val if val >= 0 else 0


def _extract_includes(text: str) -> list[str]:
    known_services = [
        "넷플릭스", "유튜브 프리미엄", "유튜브프리미엄", "유튜브",
        "왓챠", "웨이브", "티빙", "시즌", "디즈니+", "디즈니플러스", "디즈니",
        "스포티파이", "멜론", "지니뮤직", "지니", "플로", "바이브",
        "밀리의서재", "리디", "윌라", "예스24", "크레마",
        "쿠팡플레이", "애플TV+",
        "클래스101", "캔바", "라이너", "구글 AI", "구글AI",
        "CGV", "스타벅스", "배달의민족", "요기요",
    ]
    found = []
    for svc in known_services:
        if svc in text and svc not in found:
            found.append(svc)
    return found


def _extract_contract(text: str) -> int | None:
    match = re.search(r"(\d+)개월", text)
    return int(match.group(1)) if match else None