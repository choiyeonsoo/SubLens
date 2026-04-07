"""
Pure-Python subscription optimization calculator.
No Claude API calls — all math is deterministic.

Supports:
- Composite subscription decomposition ("넷플릭스 + 유튜브 프리미엄" → individual parts)
- Existing bundle coverage detection (services already included in user's current bundles)
- Exhaustive non-overlapping combination search
"""
from __future__ import annotations
import logging
import math
import re

logger = logging.getLogger(__name__)

# ── Service name aliases (Korean ↔ English) ────────────────────────────────

_ALIASES: dict[str, list[str]] = {
    "넷플릭스":        ["netflix"],
    "유튜브 프리미엄": ["youtube premium", "youtube"],
    "유튜브프리미엄":  ["youtube premium", "youtube"],
    "스포티파이":      ["spotify"],
    "왓챠":           ["watcha"],
    "웨이브":         ["wavve"],
    "티빙":           ["tving"],
    "시즌":           ["seezn"],
    "애플 tv+":       ["apple tv+", "apple tv"],
    "애플tv+":        ["apple tv+", "apple tv"],
    "디즈니+":        ["disney+", "disney plus"],
    "디즈니플러스":    ["disney+", "disney plus"],
    "네이버플러스":    ["naver plus", "네이버 플러스"],
    "네이버 플러스":   ["naver plus"],
    "카카오tv":       ["kakao tv"],
    "멜론":           ["melon"],
    "지니뮤직":       ["genie", "지니"],
    "플로":           ["flo"],
    "밀리의서재":      ["millie", "밀리"],
    "리디":           ["ridi", "ridibooks"],
    "클래스101":      ["class101"],
    "gemini":         ["구글 ai", "구글ai", "google ai"],
    "제미나이":        ["구글 ai", "구글ai", "google ai", "gemini"],
    "구글 ai":        ["gemini", "제미나이", "google ai"],
    "chatgpt":        ["챗gpt", "chat gpt"],
    "챗gpt":          ["chatgpt", "chat gpt"],
    "claude":         ["클로드"],
    "클로드":          ["claude"],
}

_ALIAS_LOOKUP: dict[str, list[str]] = {}
for _kor, _engs in _ALIASES.items():
    _ALIAS_LOOKUP[_kor] = _engs
    for _eng in _engs:
        _ALIAS_LOOKUP.setdefault(_eng, []).append(_kor)


# ── Helpers ─────────────────────────────────────────────────────────────────

def _expand_aliases(name: str) -> list[str]:
    key = name.lower().strip()
    return [key] + [a.lower() for a in _ALIAS_LOOKUP.get(key, [])]


def _normalize_includes(includes) -> list[str]:
    if includes is None:
        return []
    if isinstance(includes, list):
        return [str(i).strip() for i in includes if i and str(i).strip()]
    s = str(includes).strip()
    if s.startswith("{") and s.endswith("}"):
        s = s[1:-1]
    return [part.strip() for part in s.split(",") if part.strip()]


def _to_monthly(amount: int, billing_cycle: str) -> int:
    cycle = (billing_cycle or "MONTHLY").upper()
    if cycle == "YEARLY":
        return math.ceil(amount / 12)
    if cycle == "WEEKLY":
        return math.ceil(amount * 52 / 12)
    return amount


def _split_composite_name(name: str) -> list[str]:
    parts = re.split(r"\s*[+&·/]\s*", name.strip())
    return [p.strip() for p in parts if p.strip()]


def _name_matches_includes(name: str, includes: list[str]) -> bool:
    name_variants = _expand_aliases(name)
    for inc in includes:
        inc_variants = _expand_aliases(inc)
        for nv in name_variants:
            for iv in inc_variants:
                if len(nv) < 2 or len(iv) < 2:
                    continue
                if nv == iv:
                    return True
                nv_ns = nv.replace(" ", "")
                iv_ns = iv.replace(" ", "")
                if len(nv_ns) >= 2 and nv_ns == iv_ns:
                    return True
                shorter, longer = (nv, iv) if len(nv) <= len(iv) else (iv, nv)
                if len(shorter) >= 3 and shorter in longer and len(shorter) / len(longer) >= 0.6:
                    return True
                shorter_ns, longer_ns = (nv_ns, iv_ns) if len(nv_ns) <= len(iv_ns) else (iv_ns, nv_ns)
                if len(shorter_ns) >= 3 and shorter_ns in longer_ns and len(shorter_ns) / len(longer_ns) >= 0.6:
                    return True
    return False


def _matches_bundle(service_name: str, includes: list[str], canonical: str | None = None) -> bool:
    names_to_check = [service_name]
    if canonical and canonical != service_name:
        names_to_check.append(canonical)

    for name in names_to_check:
        if _name_matches_includes(name, includes):
            return True
    return False


# ── Main optimisation ───────────────────────────────────────────────────────

def calculate_optimization(
    subscriptions: list[dict],
    bundles: list[dict],
    existing_bundle_coverage: set[str] | None = None,
) -> dict:
    """
    Calculate the best non-overlapping bundle combination for a user.

    Args:
        subscriptions: Active subscription rows
        bundles:       bundle_catalog rows (filtered for carrier, excluding already-subscribed)
        existing_bundle_coverage: lowercase service names already covered by user's
            existing bundle subscriptions (e.g. from 네이버 플러스 멤버십)
    """
    existing_coverage = existing_bundle_coverage or set()

    for s in subscriptions:
        s["_monthly"] = _to_monthly(int(s.get("amount") or 0), s.get("billing_cycle", "MONTHLY"))

    current_total = int(sum(s["_monthly"] for s in subscriptions))

    individual_subs = [s for s in subscriptions if not s.get("is_bundle")]
    bundle_subs = [s for s in subscriptions if s.get("is_bundle")]
    logger.info(
        f"[calc] 개별 구독 {len(individual_subs)}개, 번들 구독 {len(bundle_subs)}개 "
        f"(고정비: {int(sum(s['_monthly'] for s in bundle_subs))}원)"
    )
    if existing_coverage:
        logger.info(f"[calc] 기존 번들 커버리지: {sorted(existing_coverage)}")

    # ── Step 0: Decompose composite subscriptions ────────────────────────────
    composite_groups: dict[str, dict] = {}
    expanded_subs: list[dict] = []

    for s in individual_subs:
        tokens = _split_composite_name(s["service_name"])
        if len(tokens) > 1:
            group_name = s["service_name"]
            composite_groups[group_name] = {
                "total": s["_monthly"],
                "parts": tokens,
                "original_sub": s,
            }
            for token in tokens:
                virtual = dict(s)
                virtual["service_name"] = token
                virtual["_canonical"] = token
                virtual["_monthly"] = 0
                virtual["_composite_group"] = group_name
                expanded_subs.append(virtual)
            logger.info(f"[calc] 복합 구독 분해: '{group_name}' ({s['_monthly']}원) → {tokens}")
        else:
            expanded_subs.append(s)

    # ── Step 0.5: Detect redundant subs (already covered by existing bundles) ─
    redundant_names: set[str] = set()
    redundant_savings = 0

    if existing_coverage:
        coverage_list = list(existing_coverage)
        for s in expanded_subs:
            if s.get("_composite_group"):
                continue
            if s.get("bundle_id"):
                continue
            if _name_matches_includes(s["service_name"], coverage_list):
                logger.info(
                    f"[calc] 중복 감지: '{s['service_name']}' ({s['_monthly']}원) "
                    f"— 기존 번들에 이미 포함, 취소 가능"
                )
                redundant_names.add(s["service_name"])
                redundant_savings += s["_monthly"]

        # Track which composite parts are already covered by existing bundles
        existing_comp_coverage: dict[str, set[str]] = {}
        for group_name, info in composite_groups.items():
            for part in info["parts"]:
                if _name_matches_includes(part, coverage_list):
                    existing_comp_coverage.setdefault(group_name, set()).add(part)
                    logger.info(
                        f"[calc] 복합 구독 '{group_name}' 중 '{part}' → 기존 번들에 이미 포함"
                    )
    else:
        existing_comp_coverage = {}

    # Remove redundant standalone subs from the pool
    pool_subs = [s for s in expanded_subs if s["service_name"] not in redundant_names]

    # ── Step 1: Find candidate bundles ───────────────────────────────────────
    candidates: list[dict] = []
    for b in bundles:
        includes = _normalize_includes(b.get("includes"))
        if not includes:
            continue
        base_price = int(b.get("base_price") or 0)
        matched = [
            s for s in pool_subs
            if _matches_bundle(s["service_name"], includes, s.get("_canonical"))
        ]
        if not matched:
            continue

        has_composite = any(m.get("_composite_group") for m in matched)
        normal_cost = int(sum(m["_monthly"] for m in matched if not m.get("_composite_group")))

        # Check single-bundle composite coverage (existing + this bundle)
        single_comp_cost = 0
        for m in matched:
            g = m.get("_composite_group")
            if not g:
                continue
            parts_by_bundle = {m2["service_name"] for m2 in matched if m2.get("_composite_group") == g}
            parts_by_existing = existing_comp_coverage.get(g, set())
            all_parts = set(composite_groups[g]["parts"])
            if (parts_by_bundle | parts_by_existing) >= all_parts:
                single_comp_cost += composite_groups[g]["total"]

        total_replaceable = normal_cost + single_comp_cost
        savings = total_replaceable - base_price

        if matched:
            logger.info(
                f"[calc] 번들 '{b.get('plan_name')}' ({base_price}원) → "
                f"매칭 {[m['service_name'] for m in matched]} "
                f"(대체비용 {total_replaceable}원, 절약 {savings}원"
                f"{', 복합구독 부분매칭' if has_composite and not single_comp_cost else ''})"
            )

        if savings > 0 or has_composite:
            candidates.append({
                "bundle": b,
                "includes": includes,
                "initial_savings": max(savings, 0),
            })

    logger.info(f"[calc] 번들 후보 (복합 포함): {len(candidates)}개")

    # ── Step 2: Exhaustive search (composite-aware) ──────────────────────────

    def _evaluate_combination(combo: list[dict]) -> tuple[int, list[dict]]:
        used: set[str] = set()
        assignments: list[tuple[dict, list[dict]]] = []

        for cand in combo:
            matched = [
                s for s in pool_subs
                if s["service_name"] not in used
                and _matches_bundle(s["service_name"], cand["includes"], s.get("_canonical"))
            ]
            if matched:
                assignments.append((cand, matched))
                used.update(m["service_name"] for m in matched)

        if not assignments:
            return 0, []

        # Check composite coverage across all bundles + existing coverage
        comp_coverage: dict[str, set[str]] = {}
        for _, matched in assignments:
            for m in matched:
                g = m.get("_composite_group")
                if g:
                    comp_coverage.setdefault(g, set()).add(m["service_name"])

        fully_covered = set()
        for g, new_parts in comp_coverage.items():
            all_parts = set(composite_groups[g]["parts"])
            combined = new_parts | existing_comp_coverage.get(g, set())
            if combined >= all_parts:
                fully_covered.add(g)

        # Calculate total savings
        total_replaceable = 0
        total_bundle_cost = 0
        counted_groups: set[str] = set()
        result: list[dict] = []

        for cand, matched in assignments:
            effective: list[dict] = []
            bundle_replaceable = 0

            for m in matched:
                g = m.get("_composite_group")
                if g:
                    if g in fully_covered:
                        effective.append(m)
                        if g not in counted_groups:
                            bundle_replaceable += composite_groups[g]["total"]
                            counted_groups.add(g)
                else:
                    effective.append(m)
                    bundle_replaceable += m["_monthly"]

            if not effective:
                continue

            bundle_cost = int(cand["bundle"].get("base_price") or 0)
            total_replaceable += bundle_replaceable
            total_bundle_cost += bundle_cost

            result.append({
                "bundle": cand["bundle"],
                "includes": cand["includes"],
                "matched": effective,
                "savings": bundle_replaceable - bundle_cost,
            })

        total_savings = total_replaceable - total_bundle_cost
        if total_savings <= 0:
            return 0, []

        return total_savings, result

    best_savings = 0
    selected: list[dict] = []

    search_candidates = candidates[:20]
    n = len(search_candidates)
    for mask in range(1, 1 << n):
        combo = [search_candidates[i] for i in range(n) if mask & (1 << i)]
        total, result = _evaluate_combination(combo)
        if total > best_savings:
            best_savings = total
            selected = result

    # ── Step 3: Build result ─────────────────────────────────────────────────
    total_savings = best_savings + redundant_savings
    optimized_total = current_total - total_savings

    # Replaced subscription names (original names, not virtual parts)
    replaced_names: set[str] = set(redundant_names)
    for item in selected:
        for m in item["matched"]:
            g = m.get("_composite_group")
            replaced_names.add(g if g else m["service_name"])

    current_subscriptions = [
        {
            "name": s["service_name"],
            "price": s["_monthly"],
            "billing_cycle": (s.get("billing_cycle") or "MONTHLY").upper(),
            "replaced": s["service_name"] in replaced_names,
        }
        for s in subscriptions
    ]

    recommended_bundles = []
    for item in selected:
        replaces = []
        seen_groups: set[str] = set()
        for m in item["matched"]:
            g = m.get("_composite_group")
            if g:
                if g not in seen_groups:
                    replaces.append({"name": g, "price": composite_groups[g]["total"]})
                    seen_groups.add(g)
            else:
                replaces.append({"name": m["service_name"], "price": m["_monthly"]})

        recommended_bundles.append({
            "id": str(item["bundle"]["id"]),
            "name": item["bundle"]["plan_name"],
            "provider": item["bundle"]["provider"],
            "price": int(item["bundle"].get("base_price") or 0),
            "saves": item["savings"],
            "includes": item["includes"],
            "replaces": replaces,
            "telecom_exclusive": item["bundle"].get("telecom_exclusive"),
            "has_options": bool(item["bundle"].get("has_options")),
            "description": item["bundle"].get("description", ""),
            "cautions": [],
        })

    keep_subscriptions = [
        {"name": s["service_name"], "price": s["_monthly"]}
        for s in individual_subs
        if s["service_name"] not in replaced_names
    ] + [
        {"name": s["service_name"], "price": s["_monthly"]}
        for s in bundle_subs
    ]

    replaced_subscriptions = list(
        {"name": n, "price": redundant_savings}
        for n in redundant_names
    )
    seen_groups: set[str] = set()
    for item in selected:
        for m in item["matched"]:
            g = m.get("_composite_group")
            if g:
                if g not in seen_groups:
                    replaced_subscriptions.append(
                        {"name": g, "price": composite_groups[g]["total"]}
                    )
                    seen_groups.add(g)
            else:
                replaced_subscriptions.append(
                    {"name": m["service_name"], "price": m["_monthly"]}
                )

    logger.info(
        f"[calc] 최종: 중복취소 {redundant_savings}원 + 번들최적화 {best_savings}원 "
        f"= 총 절약 {total_savings}원"
    )

    return {
        "current_total": current_total,
        "optimized_total": optimized_total,
        "savings": total_savings,
        "current_subscriptions": current_subscriptions,
        "recommended_bundles": recommended_bundles,
        "keep_subscriptions": keep_subscriptions,
        "replaced_subscriptions": replaced_subscriptions,
    }
