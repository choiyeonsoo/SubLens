import sys
import os

sys.path.insert(0, os.path.join(os.path.dirname(__file__), ".."))

from agents.type4_calculator import calculate_optimization


# ── helpers ────────────────────────────────────────────────────────────────────

def sub(name: str, amount: int, is_bundle: bool = False) -> dict:
    return {"service_name": name, "amount": amount, "is_bundle": is_bundle, "bundle_id": None}


def bundle(
    id: str,
    name: str,
    price: int,
    includes: list[str],
    telecom_exclusive: str | None = None,
) -> dict:
    return {
        "id": id,
        "plan_name": name,
        "provider": "테스트",
        "base_price": price,
        "original_price": price,
        "includes": includes,
        "telecom_exclusive": telecom_exclusive,
        "has_options": False,
        "description": "",
    }


# ── Test 1: basic savings calculation ─────────────────────────────────────────

def test_basic_savings():
    """
    User has 넷플릭스(27,000) + 요기요(4,990).
    Bundle includes ['넷플릭스', '요기요'], price 4,900.
    Expected savings: 31,990 - 4,900 = 27,090.
    """
    subs = [sub("넷플릭스", 27_000), sub("요기요", 4_990)]
    bundles = [bundle("b1", "테스트 번들", 4_900, ["넷플릭스", "요기요"])]

    result = calculate_optimization(subs, bundles)

    assert result["current_total"] == 31_990
    assert result["savings"] == 27_090
    assert result["optimized_total"] == 31_990 - 27_090
    assert len(result["recommended_bundles"]) == 1
    assert result["recommended_bundles"][0]["saves"] == 27_090

    # All numeric values must be int, not float
    assert isinstance(result["current_total"], int)
    assert isinstance(result["savings"], int)
    assert isinstance(result["optimized_total"], int)


# ── Test 2: greedy non-overlapping combination ─────────────────────────────────

def test_greedy_non_overlapping():
    """
    Bundle A covers 넷플릭스+유튜브 (savings=12,500).
    Bundle B covers 스포티파이+배달의민족 (savings=5,900).
    Both should be selected; replaced subscriptions must not be double-counted.
    """
    subs = [
        sub("넷플릭스", 9_500),
        sub("유튜브 프리미엄", 14_900),
        sub("스포티파이", 10_900),
        sub("배달의민족", 2_900),
    ]
    bundle_a = bundle("bA", "번들A", 11_900, ["넷플릭스", "유튜브"])   # saves 9500+14900-11900=12500
    bundle_b = bundle("bB", "번들B", 7_900, ["스포티파이", "배달"])    # saves 10900+2900-7900=5900

    result = calculate_optimization(subs, [bundle_a, bundle_b])

    assert result["savings"] == 12_500 + 5_900                         # 18,400
    assert result["optimized_total"] == result["current_total"] - 18_400
    assert len(result["recommended_bundles"]) == 2

    # No subscription should appear in both bundles' replaces lists
    all_replaced = [
        item["name"]
        for b in result["recommended_bundles"]
        for item in b["replaces"]
    ]
    assert len(all_replaced) == len(set(all_replaced)), "Double-counted replaced subscription"

    assert result["keep_subscriptions"] == []


# ── Test 3: bundle with negative savings is excluded ──────────────────────────

def test_negative_savings_excluded():
    """
    Bundle price (12,000) exceeds the replaceable subscription cost (9,500).
    That bundle must not appear in recommendations.
    """
    subs = [sub("넷플릭스", 9_500)]
    bundles = [bundle("b1", "비싼 번들", 12_000, ["넷플릭스"])]

    result = calculate_optimization(subs, bundles)

    assert result["savings"] == 0
    assert result["recommended_bundles"] == []
    assert result["optimized_total"] == result["current_total"]
    assert any(k["name"] == "넷플릭스" for k in result["keep_subscriptions"])


# ── Test 4: telecom_exclusive filtering is the SQL layer's responsibility ──────

def test_telecom_exclusive_not_filtered_by_calculator():
    """
    The calculator does NOT filter by telecom_exclusive — that is the SQL layer's job.
    If a bundle with telecom_exclusive is passed to the calculator, it is treated
    as eligible (SQL already ensured carrier match before calling us).
    """
    subs = [sub("넷플릭스", 9_500)]
    # Telecom-exclusive bundle passed in — calculator should still recommend it
    bundles = [bundle("b1", "LGU+ 전용 번들", 4_900, ["넷플릭스"], telecom_exclusive="LG U+")]

    result = calculate_optimization(subs, bundles)

    assert result["savings"] == 9_500 - 4_900               # 4,600
    assert len(result["recommended_bundles"]) == 1
    assert result["recommended_bundles"][0]["telecom_exclusive"] == "LG U+"
