"""
SUBLENS 번들 크롤러 실행 진입점
사용법:
    python main.py              # 세 사이트 전체 실행
    python main.py --site lgu   # LGU+ 만
    python main.py --site skt   # SKT 만
    python main.py --site kt    # KT 만
    python main.py --headless   # 헤드리스 모드 (서버/크론용)
"""

import sys
import argparse
import traceback
from datetime import datetime

from playwright.sync_api import sync_playwright

# 크롤러 모듈 경로 설정
sys.path.insert(0, ".")
from crawlers import lguplus, skt, kt
from db import close_conn


def run(site_filter: str | None = None, headless: bool = False):
    start = datetime.now()
    print(f"\n{'#'*60}")
    print(f"SUBLENS 번들 크롤러 시작: {start.strftime('%Y-%m-%d %H:%M:%S')}")
    print(f"{'#'*60}")

    results = {}

    with sync_playwright() as p:
        browser = p.chromium.launch(
            headless=headless,
            args=["--no-sandbox", "--disable-setuid-sandbox"],
        )
        context = browser.new_context(
            user_agent=(
                "Mozilla/5.0 (Windows NT 10.0; Win64; x64) "
                "AppleWebKit/537.36 (KHTML, like Gecko) "
                "Chrome/124.0.0.0 Safari/537.36"
            ),
            viewport={"width": 1280, "height": 800},
            locale="ko-KR",
        )
        page = context.new_page()

        crawlers = {
            "lgu": ("LGU+ 유독", lguplus.crawl),
            "skt": ("SKT T우주", skt.crawl),
            "kt":  ("KT 구독",   kt.crawl),
        }

        for key, (name, crawl_fn) in crawlers.items():
            if site_filter and site_filter != key:
                continue

            try:
                count = crawl_fn(page)
                results[name] = {"status": "✅ 성공", "count": count}
            except Exception as e:
                results[name] = {"status": "❌ 실패", "error": str(e)}
                traceback.print_exc()

        browser.close()

    # DB 커넥션 정리
    close_conn()

    # 결과 요약
    elapsed = (datetime.now() - start).seconds
    print(f"\n{'#'*60}")
    print(f"크롤링 완료 ({elapsed}초 소요)")
    print(f"{'#'*60}")
    for name, result in results.items():
        if "count" in result:
            print(f"  {result['status']} {name}: {result['count']}건")
        else:
            print(f"  {result['status']} {name}: {result.get('error', '')}")


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="SUBLENS 번들 크롤러")
    parser.add_argument("--site", choices=["lgu", "skt", "kt"], help="특정 사이트만 실행")
    parser.add_argument("--headless", action="store_true", help="헤드리스 모드")
    args = parser.parse_args()

    run(site_filter=args.site, headless=args.headless)