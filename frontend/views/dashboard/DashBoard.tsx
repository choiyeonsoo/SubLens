"use client";

import { useMemo } from "react";
import { useSubscriptions, useSubscriptionServices } from "@/features/subscription/hooks";
import type { SubscriptionResponse, SubscriptionServiceItem } from "@/features/subscription/types";
import ServiceLogo from "@/components/ServiceLogo";
import { Skeleton } from "@/components/ui/Skeleton";
import PageHeader from "@/components/PageHeader";
import { formatAmount, toMonthlyAmount } from "@/lib/formatters";

// ── Helpers ───────────────────────────────────────────────────────

function getDday(dateStr: string): number {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const target = new Date(dateStr);
  target.setHours(0, 0, 0, 0);
  return Math.round((target.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
}

function formatMonthDay(dateStr: string): string {
  const d = new Date(dateStr);
  return `${d.getMonth() + 1}/${d.getDate()}`;
}

// ── Sub-components ────────────────────────────────────────────────

function DDayBadge({ dday }: { dday: number }) {
  const label = dday === 0 ? "D-day" : dday > 0 ? `D-${dday}` : `D+${Math.abs(dday)}`;
  const cls =
    dday <= 3
      ? "bg-red-100 text-red-600 dark:bg-red-900/40 dark:text-red-400"
      : dday <= 7
        ? "bg-yellow-100 text-yellow-700 dark:bg-yellow-900/40 dark:text-yellow-400"
        : "bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-400";
  return (
    <span className={`shrink-0 rounded-full px-2 py-0.5 text-xs font-medium ${cls}`}>{label}</span>
  );
}

function SummaryCard({
  title,
  value,
  sub,
  accent,
}: {
  title: string;
  value: string;
  sub: string;
  accent: string;
}) {
  return (
    <div className="rounded-xl border border-gray-100 bg-white p-5 dark:border-gray-800 dark:bg-gray-900">
      <p className="mb-2 text-xs font-medium text-gray-500 dark:text-gray-400">{title}</p>
      <p className={`mb-1 truncate text-xl font-bold ${accent}`}>{value}</p>
      <p className="truncate text-xs text-gray-400 dark:text-gray-500">{sub}</p>
    </div>
  );
}

function RenewalRow({
  sub,
  services,
}: {
  sub: SubscriptionResponse;
  services: SubscriptionServiceItem[];
}) {
  const service = services.find((s) => s.name === sub.serviceName);
  const dday = getDday(sub.nextBillingDate);
  return (
    <div className="flex items-center gap-3 rounded-lg px-2 py-1.5 transition-colors hover:bg-gray-50 dark:hover:bg-gray-800/50">
      <ServiceLogo name={sub.serviceName} logoDomain={service?.logoDomain} size={28} />
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-medium text-gray-900 dark:text-white">
          {sub.serviceName}
        </p>
        <p className="text-xs text-gray-400">{formatMonthDay(sub.nextBillingDate)}</p>
      </div>
      <DDayBadge dday={dday} />
      <p className="shrink-0 text-sm font-semibold text-gray-900 dark:text-white">
        {formatAmount(sub.amount, sub.currency)}
      </p>
    </div>
  );
}

function SubRow({
  sub,
  services,
}: {
  sub: SubscriptionResponse;
  services: SubscriptionServiceItem[];
}) {
  const service = services.find((s) => s.name === sub.serviceName);
  return (
    <div className="flex items-center gap-2">
      <ServiceLogo name={sub.serviceName} logoDomain={service?.logoDomain} size={28} />
      <div className="min-w-0 flex-1">
        <p className="truncate text-xs font-medium text-gray-900 dark:text-white">
          {sub.serviceName}
        </p>
        <p className="text-xs text-gray-400">{formatMonthDay(sub.nextBillingDate)}</p>
      </div>
      <p className="shrink-0 text-xs font-semibold text-gray-900 dark:text-white">
        {formatAmount(sub.amount, sub.currency)}
      </p>
    </div>
  );
}

function StatusRow({ label, value, dot }: { label: string; value: string; dot: string }) {
  return (
    <div className="flex items-center justify-between">
      <div className="flex items-center gap-2">
        <div className={`h-2 w-2 rounded-full ${dot}`} />
        <span className="text-sm text-gray-600 dark:text-gray-400">{label}</span>
      </div>
      <span className="text-sm font-semibold text-gray-900 dark:text-white">{value}</span>
    </div>
  );
}

// ── Dashboard ─────────────────────────────────────────────────────

export default function DashBoard() {
  const { data: allSubs = [], isLoading } = useSubscriptions({ status: "ALL" });
  const { data: services = [] } = useSubscriptionServices();

  const computed = useMemo(() => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const year = today.getFullYear();
    const month = today.getMonth();

    const activeSubs = allSubs.filter((s) => s.status === "ACTIVE");
    const pausedCount = allSubs.filter((s) => s.status === "PAUSED").length;
    const cancelledCount = allSubs.filter((s) => s.status === "CANCELLED").length;

    // This Sunday (end of week)
    const dayOfWeek = today.getDay(); // 0=Sun
    const daysUntilSunday = dayOfWeek === 0 ? 0 : 7 - dayOfWeek;
    const sunday = new Date(today);
    sunday.setDate(today.getDate() + daysUntilSunday);

    // Week label: Mon ~ Sun
    const daysToMonday = dayOfWeek === 0 ? -6 : 1 - dayOfWeek;
    const monday = new Date(today);
    monday.setDate(today.getDate() + daysToMonday);

    // This month subs (next_billing_date in current month), sorted asc
    const thisMonthSubs = activeSubs
      .filter((s) => {
        const d = new Date(s.nextBillingDate);
        d.setHours(0, 0, 0, 0);
        return d.getFullYear() === year && d.getMonth() === month;
      })
      .sort(
        (a, b) => new Date(a.nextBillingDate).getTime() - new Date(b.nextBillingDate).getTime()
      );

    // Next month subs (max 3)
    const nm = month === 11 ? 0 : month + 1;
    const nmy = month === 11 ? year + 1 : year;
    const nextMonthSubs = activeSubs
      .filter((s) => {
        const d = new Date(s.nextBillingDate);
        return d.getFullYear() === nmy && d.getMonth() === nm;
      })
      .sort((a, b) => new Date(a.nextBillingDate).getTime() - new Date(b.nextBillingDate).getTime())
      .slice(0, 3);

    // This week subs (today ~ sunday), sorted asc
    const thisWeekSubs = activeSubs
      .filter((s) => {
        const d = new Date(s.nextBillingDate);
        d.setHours(0, 0, 0, 0);
        return d >= today && d <= sunday;
      })
      .sort(
        (a, b) => new Date(a.nextBillingDate).getTime() - new Date(b.nextBillingDate).getTime()
      );

    // Totals
    const thisMonthTotal = thisMonthSubs.reduce((s, x) => s + x.amount, 0);
    const thisWeekTotal = thisWeekSubs.reduce((s, x) => s + x.amount, 0);
    const monthlyEquiv = activeSubs.reduce(
      (s, x) => s + toMonthlyAmount(x.amount, x.billingCycle),
      0
    );
    const yearlyTotal = monthlyEquiv * 12;

    // Category breakdown (monthly equivalent)
    const catMap: Record<string, number> = {};
    activeSubs.forEach((s) => {
      const cat = s.category?.name ?? "기타";
      catMap[cat] = (catMap[cat] ?? 0) + toMonthlyAmount(s.amount, s.billingCycle);
    });
    const catTotal = Object.values(catMap).reduce((a, b) => a + b, 0);
    const categoryData = Object.entries(catMap)
      .map(([name, amount]) => ({
        name,
        amount,
        pct: catTotal > 0 ? Math.round((amount / catTotal) * 100) : 0,
      }))
      .sort((a, b) => b.amount - a.amount);

    // Primary currency
    const currencies = [...new Set(activeSubs.map((s) => s.currency))];
    const primaryCurrency = currencies.length === 1 ? currencies[0] : "KRW";

    // Labels
    const weekLabel = `${monday.getMonth() + 1}/${monday.getDate()}(월) ~ ${sunday.getMonth() + 1}/${sunday.getDate()}(일)`;
    const lastDay = new Date(year, month + 1, 0).getDate();
    const monthLabel = `${year}년 ${month + 1}월 1일 ~ ${lastDay}일`;
    const currentMonthLabel = `${month + 1}월`;
    const nextMonthLabel = `${nm + 1}월`;

    return {
      activeSubs,
      pausedCount,
      cancelledCount,
      thisMonthSubs,
      nextMonthSubs,
      thisWeekSubs,
      thisMonthTotal,
      thisWeekTotal,
      monthlyEquiv,
      yearlyTotal,
      categoryData,
      primaryCurrency,
      weekLabel,
      monthLabel,
      currentMonthLabel,
      nextMonthLabel,
    };
  }, [allSubs]);

  const {
    activeSubs,
    pausedCount,
    cancelledCount,
    thisMonthSubs,
    nextMonthSubs,
    thisWeekSubs,
    thisMonthTotal,
    thisWeekTotal,
    monthlyEquiv,
    yearlyTotal,
    categoryData,
    primaryCurrency,
    weekLabel,
    monthLabel,
    currentMonthLabel,
    nextMonthLabel,
  } = computed;

  const fmt = (n: number) => formatAmount(Math.round(n), primaryCurrency);

  // ── Loading skeleton ──
  if (isLoading) {
    return (
      <div className="h-full overflow-y-auto">
        <div className="mx-auto max-w-7xl space-y-6 p-6">
          <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
            {[...Array(4)].map((_, i) => (
              <Skeleton key={i} className="h-28" />
            ))}
          </div>
          <div className="grid grid-cols-1 gap-4 lg:grid-cols-5">
            <Skeleton className="h-80 lg:col-span-3" />
            <Skeleton className="h-80 lg:col-span-2" />
          </div>
          <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
            <Skeleton className="h-64" />
            <Skeleton className="h-64" />
            <Skeleton className="h-64" />
          </div>
        </div>
      </div>
    );
  }

  // ── Week sub label ──
  const weekSubLabel =
    thisWeekSubs.length === 0
      ? "이번 주 갱신 없음"
      : thisWeekSubs.length <= 3
        ? thisWeekSubs.map((s) => s.serviceName).join(", ")
        : `${thisWeekSubs
            .slice(0, 2)
            .map((s) => s.serviceName)
            .join(", ")} 외 ${thisWeekSubs.length - 2}건`;

  return (
    <div className="h-full overflow-y-auto">
      <div className="mx-auto max-w-7xl space-y-6 p-6">
        {/* ── 페이지 헤더 ── */}
        <PageHeader title="대시보드" description="구독 현황과 지출 요약을 한눈에 확인하세요" />

        {/* ── Section 1: Summary Cards ── */}
        <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
          <SummaryCard
            title="이번 달 지출 예정"
            value={fmt(thisMonthTotal)}
            sub={`${thisMonthSubs.length}건 갱신 예정`}
            accent="text-violet-600 dark:text-violet-400"
          />
          <SummaryCard
            title="이번 주 지출 예정"
            value={fmt(thisWeekTotal)}
            sub={weekSubLabel}
            accent="text-blue-600 dark:text-blue-400"
          />
          <SummaryCard
            title="활성 구독"
            value={`${activeSubs.length}건`}
            sub={pausedCount > 0 ? `일시정지 ${pausedCount}건` : "모두 활성"}
            accent="text-green-600 dark:text-green-400"
          />
          <SummaryCard
            title="연간 예상 지출"
            value={fmt(yearlyTotal)}
            sub={`월 평균 ${fmt(monthlyEquiv)}`}
            accent="text-amber-600 dark:text-amber-400"
          />
        </div>

        {/* ── Section 2: Renewal List + Category Chart ── */}
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-5">
          {/* Left: 이번 달 갱신 예정 리스트 */}
          <div className="rounded-xl border border-gray-100 bg-white p-5 dark:border-gray-800 dark:bg-gray-900 lg:col-span-3">
            <h3 className="mb-4 text-sm font-semibold text-gray-900 dark:text-white">
              이번 달 갱신 예정
            </h3>
            {thisMonthSubs.length === 0 && nextMonthSubs.length === 0 ? (
              <p className="py-10 text-center text-sm text-gray-400">
                갱신 예정인 구독이 없습니다.
              </p>
            ) : (
              <div>
                {thisMonthSubs.length > 0 && (
                  <>
                    <p className="mb-1 px-2 text-xs font-medium text-gray-400 dark:text-gray-500">
                      {currentMonthLabel}
                    </p>
                    <div className="space-y-0.5">
                      {thisMonthSubs.map((s) => (
                        <RenewalRow key={s.id} sub={s} services={services} />
                      ))}
                    </div>
                  </>
                )}
                {nextMonthSubs.length > 0 && (
                  <>
                    <hr className="my-3 border-gray-100 dark:border-gray-800" />
                    <p className="mb-1 px-2 text-xs font-medium text-gray-400 dark:text-gray-500">
                      {nextMonthLabel} (최대 3건)
                    </p>
                    <div className="space-y-0.5">
                      {nextMonthSubs.map((s) => (
                        <RenewalRow key={s.id} sub={s} services={services} />
                      ))}
                    </div>
                  </>
                )}
              </div>
            )}
          </div>

          {/* Right: 카테고리별 지출 바 차트 */}
          <div className="rounded-xl border border-gray-100 bg-white p-5 dark:border-gray-800 dark:bg-gray-900 lg:col-span-2">
            <h3 className="mb-4 text-sm font-semibold text-gray-900 dark:text-white">
              카테고리별 지출
            </h3>
            {categoryData.length === 0 ? (
              <p className="py-10 text-center text-sm text-gray-400">데이터 없음</p>
            ) : (
              <div className="space-y-4">
                {categoryData.map((cat) => (
                  <div key={cat.name}>
                    <div className="mb-1 flex items-center justify-between">
                      <span className="text-xs text-gray-600 dark:text-gray-400">{cat.name}</span>
                      <span className="text-xs font-semibold text-gray-900 dark:text-white">
                        {cat.pct}%
                      </span>
                    </div>
                    <div className="h-2 w-full overflow-hidden rounded-full bg-gray-100 dark:bg-gray-800">
                      <div
                        className="h-full rounded-full bg-violet-500 transition-all"
                        style={{ width: `${cat.pct}%` }}
                      />
                    </div>
                    <p className="mt-0.5 text-right text-xs text-gray-400 dark:text-gray-500">
                      {fmt(cat.amount)}/월
                    </p>
                  </div>
                ))}
                {categoryData[0] && (
                  <div className="mt-2 rounded-lg bg-violet-50 px-3 py-2.5 dark:bg-violet-950/40">
                    <p className="text-xs text-violet-700 dark:text-violet-300">
                      <span className="font-semibold">{categoryData[0].name}</span>이(가) 전체
                      지출의 <span className="font-semibold">{categoryData[0].pct}%</span>를
                      차지합니다.
                    </p>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>

        {/* ── Section 3: Weekly / Monthly / Status ── */}
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
          {/* Left: 이번 주 지출 예정 */}
          <div className="rounded-xl border border-gray-100 bg-white p-5 dark:border-gray-800 dark:bg-gray-900">
            <h3 className="text-sm font-semibold text-gray-900 dark:text-white">
              이번 주 지출 예정
            </h3>
            <p className="mb-3 mt-0.5 text-xs text-gray-400 dark:text-gray-500">{weekLabel}</p>
            <p className="mb-4 text-2xl font-bold text-gray-900 dark:text-white">
              {fmt(thisWeekTotal)}
            </p>
            {thisWeekSubs.length === 0 ? (
              <p className="py-4 text-center text-sm text-gray-400">이번 주 갱신 예정 없음</p>
            ) : (
              <div className="max-h-48 space-y-2.5 overflow-y-auto">
                {thisWeekSubs.map((s) => (
                  <SubRow key={s.id} sub={s} services={services} />
                ))}
              </div>
            )}
          </div>

          {/* Center: 이번 달 지출 예정 */}
          <div className="rounded-xl border border-gray-100 bg-white p-5 dark:border-gray-800 dark:bg-gray-900">
            <h3 className="text-sm font-semibold text-gray-900 dark:text-white">
              이번 달 지출 예정
            </h3>
            <p className="mb-3 mt-0.5 text-xs text-gray-400 dark:text-gray-500">{monthLabel}</p>
            <p className="mb-4 text-2xl font-bold text-gray-900 dark:text-white">
              {fmt(thisMonthTotal)}
            </p>
            {thisMonthSubs.length === 0 ? (
              <p className="py-4 text-center text-sm text-gray-400">이번 달 갱신 예정 없음</p>
            ) : (
              <div className="max-h-48 space-y-2.5 overflow-y-auto">
                {thisMonthSubs.map((s) => (
                  <SubRow key={s.id} sub={s} services={services} />
                ))}
              </div>
            )}
          </div>

          {/* Right: 구독 현황 요약 */}
          <div className="rounded-xl border border-gray-100 bg-white p-5 dark:border-gray-800 dark:bg-gray-900">
            <h3 className="mb-4 text-sm font-semibold text-gray-900 dark:text-white">구독 현황</h3>
            <div className="space-y-3">
              <StatusRow label="활성" value={`${activeSubs.length}건`} dot="bg-green-500" />
              <StatusRow label="일시정지" value={`${pausedCount}건`} dot="bg-yellow-500" />
              <StatusRow label="해지" value={`${cancelledCount}건`} dot="bg-red-500" />
              <hr className="border-gray-100 dark:border-gray-800" />
              <StatusRow
                label="이번 달 갱신"
                value={`${thisMonthSubs.length}건`}
                dot="bg-violet-500"
              />
              <StatusRow label="월 평균 지출" value={fmt(monthlyEquiv)} dot="bg-blue-400" />
              <StatusRow label="연간 예상 지출" value={fmt(yearlyTotal)} dot="bg-gray-400" />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
