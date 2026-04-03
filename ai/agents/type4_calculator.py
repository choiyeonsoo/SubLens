"""
Pure-Python subscription optimization calculator.
No Claude API calls — all math is deterministic.
"""
from __future__ import annotations


def _normalize_includes(includes) -> list[str]:
    """Normalize PostgreSQL text[] or comma-separated string to a plain Python list."""
    if includes is None:
        return []
    if isinstance(includes, list):
        return [str(i).strip() for i in includes if i and str(i).strip()]
    s = str(includes).strip()
    # PostgreSQL array literal format: {Netflix,YouTube}
    if s.startswith("{") and s.endswith("}"):
        s = s[1:-1]
    return [part.strip() for part in s.split(",") if part.strip()]


def _matches_bundle(service_name: str, includes: list[str]) -> bool:
    """Case-insensitive partial match: subscription name ↔ bundle includes item."""
    name_lower = service_name.lower()
    for inc in includes:
        inc_lower = inc.lower()
        if inc_lower in name_lower or name_lower in inc_lower:
            return True
    return False


def calculate_optimization(
    subscriptions: list[dict],
    bundles: list[dict],
) -> dict:
    """
    Calculate the best non-overlapping bundle combination for a user.

    Args:
        subscriptions: Active subscription rows (service_name, amount, is_bundle, ...)
        bundles:       bundle_catalog rows already filtered for carrier + not yet subscribed

    Returns a dict with current_total, optimized_total, savings, recommended_bundles,
    current_subscriptions, keep_subscriptions, replaced_subscriptions.
    All numeric values are Python int.
    """
    current_total = int(sum(int(s.get("amount") or 0) for s in subscriptions))

    # Only individual (non-bundle) subscriptions are candidates for replacement.
    # Existing bundle subscriptions are treated as fixed costs.
    individual_subs = [s for s in subscriptions if not s.get("is_bundle")]
    bundle_subs = [s for s in subscriptions if s.get("is_bundle")]

    # ── Step 1: calculate initial savings per bundle against all individual subs ──
    candidates: list[dict] = []
    for b in bundles:
        includes = _normalize_includes(b.get("includes"))
        base_price = int(b.get("base_price") or 0)
        matched = [s for s in individual_subs if _matches_bundle(s["service_name"], includes)]
        replaceable_cost = int(sum(int(s.get("amount") or 0) for s in matched))
        savings = replaceable_cost - base_price
        if savings > 0:
            candidates.append({
                "bundle": b,
                "includes": includes,
                "initial_savings": savings,
            })

    # ── Step 2: keep top 3 by initial savings ──
    candidates.sort(key=lambda c: c["initial_savings"], reverse=True)
    candidates = candidates[:3]

    # ── Step 3: greedy non-overlapping selection ──
    remaining = list(individual_subs)
    selected: list[dict] = []

    for cand in candidates:
        b = cand["bundle"]
        includes = cand["includes"]

        # Re-evaluate savings against the current remaining (not yet replaced) subs
        matched = [s for s in remaining if _matches_bundle(s["service_name"], includes)]
        if not matched:
            continue
        replaceable_cost = int(sum(int(s.get("amount") or 0) for s in matched))
        savings = replaceable_cost - int(b.get("base_price") or 0)
        if savings <= 0:
            continue

        selected.append({"bundle": b, "includes": includes, "matched": matched, "savings": savings})

        # Remove matched subs so the next bundle cannot double-count them
        matched_names = {m["service_name"] for m in matched}
        remaining = [s for s in remaining if s["service_name"] not in matched_names]

    # ── Step 4: build result ──
    total_savings = int(sum(item["savings"] for item in selected))
    optimized_total = current_total - total_savings

    replaced_names = {m["service_name"] for item in selected for m in item["matched"]}

    current_subscriptions = [
        {
            "name": s["service_name"],
            "price": int(s.get("amount") or 0),
            "replaced": s["service_name"] in replaced_names,
        }
        for s in subscriptions
    ]

    recommended_bundles = [
        {
            "id": str(item["bundle"]["id"]),
            "name": item["bundle"]["plan_name"],
            "provider": item["bundle"]["provider"],
            "price": int(item["bundle"].get("base_price") or 0),
            "saves": item["savings"],
            "includes": item["includes"],
            "replaces": [
                {"name": m["service_name"], "price": int(m.get("amount") or 0)}
                for m in item["matched"]
            ],
            "telecom_exclusive": item["bundle"].get("telecom_exclusive"),
            "has_options": bool(item["bundle"].get("has_options")),
            "cautions": [],
        }
        for item in selected
    ]

    # keep = unmatched individual subs + existing bundle subs (fixed costs)
    keep_subscriptions = [
        {"name": s["service_name"], "price": int(s.get("amount") or 0)}
        for s in remaining
    ] + [
        {"name": s["service_name"], "price": int(s.get("amount") or 0)}
        for s in bundle_subs
    ]

    replaced_subscriptions = [
        {"name": m["service_name"], "price": int(m.get("amount") or 0)}
        for item in selected
        for m in item["matched"]
    ]

    return {
        "current_total": current_total,
        "optimized_total": optimized_total,
        "savings": total_savings,
        "current_subscriptions": current_subscriptions,
        "recommended_bundles": recommended_bundles,
        "keep_subscriptions": keep_subscriptions,
        "replaced_subscriptions": replaced_subscriptions,
    }
