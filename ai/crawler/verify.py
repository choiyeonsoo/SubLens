"""
크롤링 결과 검증 스크립트
사용법: python verify.py
"""
import sys
sys.path.insert(0, ".")
from db import get_conn, close_conn

def verify():
    conn = get_conn()
    cur = conn.cursor()

    print("\n" + "="*60)
    print("SUBLENS 크롤링 결과 검증")
    print("="*60)

    # 1. 사이트별 상품 수
    cur.execute("""
        SELECT provider, COUNT(*) AS 상품수,
               SUM(CASE WHEN has_options THEN 1 ELSE 0 END) AS 옵션있는상품
        FROM bundle_catalog
        WHERE is_active = true
        GROUP BY provider
        ORDER BY provider;
    """)
    rows = cur.fetchall()
    print("\n[1] 사이트별 저장 현황")
    print(f"  {'사이트':<10} {'상품수':>6} {'옵션있는상품':>12}")
    print(f"  {'-'*30}")
    for row in rows:
        print(f"  {row[0]:<10} {row[1]:>6} {row[2]:>12}")

    # 2. 옵션 저장 현황
    cur.execute("""
        SELECT 
            bc.provider,
            bc.plan_name,
            COUNT(bo.id) AS 옵션수
        FROM bundle_catalog bc
        LEFT JOIN bundle_option bo ON bo.bundle_id = bc.id
        WHERE bc.has_options = true AND bc.is_active = true
        GROUP BY bc.provider, bc.plan_name
        ORDER BY bc.provider, 옵션수 DESC
        LIMIT 20;
    """)
    rows = cur.fetchall()
    print("\n[2] 옵션 저장 현황 (has_options=true 상품)")
    print(f"  {'사이트':<8} {'상품명':<35} {'옵션수':>6}")
    print(f"  {'-'*52}")
    for row in rows:
        status = "✅" if row[2] > 0 else "❌ 옵션 없음"
        print(f"  {row[0]:<8} {row[1][:33]:<35} {row[2]:>4} {status}")

    # 3. 옵션 상세 샘플 (첫 번째 상품)
    cur.execute("""
        SELECT bc.plan_name, bo.option_name, bo.option_spec, bo.extra_price
        FROM bundle_option bo
        JOIN bundle_catalog bc ON bc.id = bo.bundle_id
        WHERE bc.provider = 'LGU+'
        LIMIT 10;
    """)
    rows = cur.fetchall()
    print("\n[3] LGU+ 옵션 샘플")
    if rows:
        print(f"  {'상품명':<25} {'옵션명':<20} {'스펙':<25} {'추가금액':>8}")
        print(f"  {'-'*82}")
        for row in rows:
            print(f"  {str(row[0])[:23]:<25} {str(row[1])[:18]:<20} {str(row[2] or '')[:23]:<25} {row[3]:>8}원")
    else:
        print("  ❌ 옵션 데이터 없음 — 크롤러 재실행 필요")

    print("\n" + "="*60)
    cur.close()
    close_conn()

if __name__ == "__main__":
    verify()