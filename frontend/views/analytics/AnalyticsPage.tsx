"use client";

import { useCallback, useMemo, useState } from "react";
import { useTheme } from "next-themes";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
} from "recharts";
import { TrendingUp, TrendingDown, Minus } from "lucide-react";
import { useSubscriptions, useSubscriptionServices } from "@/features/subscription/hooks";
import type { SubscriptionResponse } from "@/features/subscription/types";
import ServiceLogo from "@/components/ServiceLogo";

// ── Helpers ───────────────────────────────────────────────────────

function toMonthlyAmount(amount: number, cycle: string): number {
  if (cycle === "YEARLY") return amount / 12;
  if (cycle === "WEEKLY") return amount * (52 / 12);
  return amount;
}

const CURRENCY_LOCALE: Record<string, { locale: string; currency: string }> = {
  KRW: { locale: "ko-KR", currency: "KRW" },
  USD: { locale: "en-US", currency: "USD" },
  EUR: { locale: "de-DE", currency: "EUR" },
  JPY: { locale: "ja-JP", currency: "JPY" },
  GBP: { locale: "en-GB", currency: "GBP" },
};

function formatAmount(amount: number, currency: string): string {
  const config = CURRENCY_LOCALE[currency] ?? { locale: "ko-KR", currency };
  return new Intl.NumberFormat(config.locale, {
    style: "currency",
    currency: config.currency,
    maximumFractionDigits: currency === "KRW" || currency === "JPY" ? 0 : 2,
  }).format(amount);
}

/** 특정 년/월에 해당 구독이 청구된 금액을 반환 (WEEKLY는 해당 월의 발생 횟수 × 금액) */
function getMonthAmount(sub: SubscriptionResponse, year: number, month: number): number {
  const startDate = new Date(sub.startDate);
  startDate.setHours(0, 0, 0, 0);
  const monthEnd = new Date(year, month + 1, 0);
  monthEnd.setHours(23, 59, 59, 999);

  if (startDate > monthEnd) return 0;

  if (sub.billingCycle === "MONTHLY") {
    const day = Math.min(sub.billingDayOfMonth ?? 1, new Date(year, month + 1, 0).getDate());
    const billingDate = new Date(year, month, day);
    return billingDate >= startDate ? sub.amount : 0;
  }

  if (sub.billingCycle === "YEARLY") {
    if (!sub.billingDateOfYear) return 0;
    const billMonth = parseInt(sub.billingDateOfYear.substring(0, 2)) - 1;
    const billDay = parseInt(sub.billingDateOfYear.substring(2, 4));
    if (billMonth !== month) return 0;
    const billingDate = new Date(year, month, billDay);
    return billingDate >= startDate ? sub.amount : 0;
  }

  if (sub.billingCycle === "WEEKLY") {
    const dow = sub.billingDayOfWeek ?? 1; // 1=Mon, 7=Sun
    const jsDow = dow === 7 ? 0 : dow; // JS: 0=Sun
    let d = new Date(year, month, 1);
    while (d.getDay() !== jsDow) d.setDate(d.getDate() + 1);
    let count = 0;
    while (d <= monthEnd) {
      if (d >= startDate) count++;
      d.setDate(d.getDate() + 7);
    }
    return sub.amount * count;
  }

  return 0;
}

type Period = "3m" | "6m" | "1y" | "all";

interface MonthEntry {
  year: number;
  month: number;
  label: string;
}

function buildMonths(period: Period, subs: SubscriptionResponse[]): MonthEntry[] {
  const today = new Date();
  const currentYear = today.getFullYear();
  const currentMonth = today.getMonth();

  let count: number;
  if (period === "3m") count = 3;
  else if (period === "6m") count = 6;
  else if (period === "1y") count = 12;
  else {
    if (subs.length === 0) {
      count = 1;
    } else {
      const earliest = subs.reduce((min, s) => {
        const d = new Date(s.startDate);
        return d < min ? d : min;
      }, new Date());
      const diff =
        (currentYear - earliest.getFullYear()) * 12 +
        (currentMonth - earliest.getMonth()) +
        1;
      count = Math.max(diff, 1);
    }
  }

  const result: MonthEntry[] = [];
  for (let i = count - 1; i >= 0; i--) {
    let m = currentMonth - i;
    let y = currentYear;
    while (m < 0) {
      m += 12;
      y--;
    }
    const yearPrefix = y !== currentYear ? `${y}/` : "";
    result.push({ year: y, month: m, label: `${yearPrefix}${m + 1}월` });
  }
  return result;
}

const PIE_COLORS = [
  "#7C3AED",
  "#3B82F6",
  "#10B981",
  "#F59E0B",
  "#EF4444",
  "#8B5CF6",
  "#06B6D4",
  "#84CC16",
  "#F97316",
  "#EC4899",
];

const PERIOD_TABS: { label: string; value: Period }[] = [
  { label: "3개월", value: "3m" },
  { label: "6개월", value: "6m" },
  { label: "1년", value: "1y" },
  { label: "전체", value: "all" },
];

function Skeleton({ className }: { className?: string }) {
  return (
    <div className={`animate-pulse rounded-xl bg-gray-200 dark:bg-gray-800 ${className}`} />
  );
}

// ── Main Component ────────────────────────────────────────────────

export default function AnalyticsPage() {
  const { data: allSubs = [], isLoading } = useSubscriptions({ status: "ALL" });
  const { data: services = [] } = useSubscriptionServices();
  const [period, setPeriod] = useState<Period>("6m");
  const { resolvedTheme } = useTheme();

  const activeSubs = useMemo(
    () => allSubs.filter((s) => s.status === "ACTIVE"),
    [allSubs],
  );

  const primaryCurrency = useMemo(() => {
    const currencies = [...new Set(activeSubs.map((s) => s.currency))];
    return currencies.length === 1 ? currencies[0] : "KRW";
  }, [activeSubs]);

  const fmt = useCallback(
    (n: number) => formatAmount(Math.round(n), primaryCurrency),
    [primaryCurrency],
  );

  // 현재 날짜 기준
  const todayYear = new Date().getFullYear();
  const todayMonth = new Date().getMonth();
  const lastMonthIndex = todayMonth === 0 ? 11 : todayMonth - 1;
  const lastMonthYear = todayMonth === 0 ? todayYear - 1 : todayYear;

  // 선택 기간 월 목록
  const periodMonths = useMemo(
    () => buildMonths(period, activeSubs),
    [period, activeSubs],
  );

  // 전체 기간 월 목록 (누적 계산용)
  const allMonths = useMemo(() => buildMonths("all", activeSubs), [activeSubs]);

  // 막대 차트 데이터
  const monthlyBarData = useMemo(
    () =>
      periodMonths.map(({ year, month, label }) => ({
        label,
        amount: activeSubs.reduce((sum, sub) => sum + getMonthAmount(sub, year, month), 0),
      })),
    [periodMonths, activeSubs],
  );

  // 이번 달 / 지난 달 합계
  const thisMonthTotal = useMemo(
    () => activeSubs.reduce((sum, sub) => sum + getMonthAmount(sub, todayYear, todayMonth), 0),
    [activeSubs, todayYear, todayMonth],
  );
  const lastMonthTotal = useMemo(
    () =>
      activeSubs.reduce((sum, sub) => sum + getMonthAmount(sub, lastMonthYear, lastMonthIndex), 0),
    [activeSubs, lastMonthYear, lastMonthIndex],
  );

  // 전체 월별 금액 배열
  const allMonthlyAmounts = useMemo(
    () =>
      allMonths.map(({ year, month }) =>
        activeSubs.reduce((sum, sub) => sum + getMonthAmount(sub, year, month), 0),
      ),
    [allMonths, activeSubs],
  );

  const totalCumulative = useMemo(
    () => allMonthlyAmounts.reduce((a, b) => a + b, 0),
    [allMonthlyAmounts],
  );

  const monthlyAvg = useMemo(
    () => (allMonthlyAmounts.length > 0 ? totalCumulative / allMonthlyAmounts.length : 0),
    [totalCumulative, allMonthlyAmounts],
  );

  const vsLastMonth = thisMonthTotal - lastMonthTotal;

  // 3개월 평균
  const avg3m = useMemo(() => {
    const amounts: number[] = [];
    for (let i = 2; i >= 0; i--) {
      let m = todayMonth - i;
      let y = todayYear;
      while (m < 0) {
        m += 12;
        y--;
      }
      amounts.push(activeSubs.reduce((sum, sub) => sum + getMonthAmount(sub, y, m), 0));
    }
    return amounts.reduce((a, b) => a + b, 0) / 3;
  }, [activeSubs, todayYear, todayMonth]);

  // 최고/최저 지출월
  const { maxEntry, minEntry } = useMemo(() => {
    if (allMonthlyAmounts.length === 0) return { maxEntry: null, minEntry: null };
    let maxIdx = 0;
    let minIdx = -1;
    allMonthlyAmounts.forEach((v, i) => {
      if (v > allMonthlyAmounts[maxIdx]) maxIdx = i;
      if (v > 0 && (minIdx === -1 || v < allMonthlyAmounts[minIdx])) minIdx = i;
    });
    return {
      maxEntry: allMonths[maxIdx]
        ? { label: allMonths[maxIdx].label, amount: allMonthlyAmounts[maxIdx] }
        : null,
      minEntry:
        minIdx >= 0 && allMonths[minIdx]
          ? { label: allMonths[minIdx].label, amount: allMonthlyAmounts[minIdx] }
          : null,
    };
  }, [allMonthlyAmounts, allMonths]);

  // 카테고리별 월 환산 지출
  const categoryData = useMemo(() => {
    const catMap: Record<string, number> = {};
    activeSubs.forEach((sub) => {
      const cat = sub.category?.name ?? "기타";
      catMap[cat] = (catMap[cat] ?? 0) + toMonthlyAmount(sub.amount, sub.billingCycle);
    });
    const total = Object.values(catMap).reduce((a, b) => a + b, 0);
    return Object.entries(catMap)
      .map(([name, amount]) => ({
        name,
        amount,
        pct: total > 0 ? Math.round((amount / total) * 100) : 0,
      }))
      .sort((a, b) => b.amount - a.amount);
  }, [activeSubs]);

  // 서비스별 지출 순위
  const serviceRanking = useMemo(() => {
    const total = activeSubs.reduce((s, x) => s + toMonthlyAmount(x.amount, x.billingCycle), 0);
    return [...activeSubs]
      .map((sub) => {
        const monthly = toMonthlyAmount(sub.amount, sub.billingCycle);
        return {
          ...sub,
          monthly,
          pct: total > 0 ? Math.round((monthly / total) * 100) : 0,
        };
      })
      .sort((a, b) => b.monthly - a.monthly);
  }, [activeSubs]);

  // Y축 포맷
  const yAxisFmt = useCallback(
    (value: number): string => {
      if (primaryCurrency === "KRW" || primaryCurrency === "JPY") {
        if (value >= 10000) return `${Math.round(value / 1000)}k`;
      }
      return String(Math.round(value));
    },
    [primaryCurrency],
  );

  // ── Loading Skeleton ──
  if (isLoading) {
    return (
      <div className="h-full overflow-y-auto">
        <div className="mx-auto max-w-7xl space-y-6 p-6">
          <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
            {Array.from({ length: 4 }).map((_, i) => (
              <Skeleton key={i} className="h-24" />
            ))}
          </div>
          <div className="flex gap-2">
            {Array.from({ length: 4 }).map((_, i) => (
              <Skeleton key={i} className="h-9 w-20" />
            ))}
          </div>
          <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
            <Skeleton className="h-80" />
            <Skeleton className="h-80" />
          </div>
          <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
            <Skeleton className="h-72" />
            <Skeleton className="h-72" />
            <Skeleton className="h-72" />
          </div>
        </div>
      </div>
    );
  }

  const noData = activeSubs.length === 0;

  return (
    <div className="h-full overflow-y-auto">
      <div className="mx-auto max-w-7xl space-y-6 p-6">
        {/* ── Section 1: 요약 지표 4개 ── */}
        <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
          {/* 총 누적 지출 */}
          <div className="rounded-xl border border-gray-100 bg-white p-5 dark:border-gray-800 dark:bg-gray-900">
            <p className="mb-2 text-xs font-medium text-gray-500 dark:text-gray-400">
              총 누적 지출
            </p>
            <p className="truncate text-xl font-bold text-violet-600 dark:text-violet-400">
              {fmt(totalCumulative)}
            </p>
          </div>

          {/* 월 평균 지출 */}
          <div className="rounded-xl border border-gray-100 bg-white p-5 dark:border-gray-800 dark:bg-gray-900">
            <p className="mb-2 text-xs font-medium text-gray-500 dark:text-gray-400">
              월 평균 지출
            </p>
            <p className="truncate text-xl font-bold text-blue-600 dark:text-blue-400">
              {fmt(monthlyAvg)}
            </p>
          </div>

          {/* 전월 대비 */}
          <div className="rounded-xl border border-gray-100 bg-white p-5 dark:border-gray-800 dark:bg-gray-900">
            <p className="mb-2 text-xs font-medium text-gray-500 dark:text-gray-400">전월 대비</p>
            <div className="flex items-center gap-2">
              <p
                className={`truncate text-xl font-bold ${
                  vsLastMonth > 0
                    ? "text-red-500 dark:text-red-400"
                    : vsLastMonth < 0
                      ? "text-green-600 dark:text-green-400"
                      : "text-gray-600 dark:text-gray-400"
                }`}
              >
                {vsLastMonth >= 0 ? `+${fmt(vsLastMonth)}` : fmt(vsLastMonth)}
              </p>
              {vsLastMonth > 0 ? (
                <span className="flex shrink-0 items-center gap-0.5 rounded-full bg-red-100 px-2 py-0.5 text-xs font-medium text-red-600 dark:bg-red-900/40 dark:text-red-400">
                  <TrendingUp className="h-3 w-3" />
                  증가
                </span>
              ) : vsLastMonth < 0 ? (
                <span className="flex shrink-0 items-center gap-0.5 rounded-full bg-green-100 px-2 py-0.5 text-xs font-medium text-green-600 dark:bg-green-900/40 dark:text-green-400">
                  <TrendingDown className="h-3 w-3" />
                  감소
                </span>
              ) : (
                <span className="flex shrink-0 items-center gap-0.5 rounded-full bg-gray-100 px-2 py-0.5 text-xs font-medium text-gray-500 dark:bg-gray-800 dark:text-gray-400">
                  <Minus className="h-3 w-3" />
                  동일
                </span>
              )}
            </div>
          </div>

          {/* 연간 예상 */}
          <div className="rounded-xl border border-gray-100 bg-white p-5 dark:border-gray-800 dark:bg-gray-900">
            <p className="mb-2 text-xs font-medium text-gray-500 dark:text-gray-400">연간 예상</p>
            <p className="truncate text-xl font-bold text-amber-600 dark:text-amber-400">
              {fmt(thisMonthTotal * 12)}
            </p>
          </div>
        </div>

        {/* ── Section 2: 기간 탭 ── */}
        <div className="flex items-center gap-1">
          {PERIOD_TABS.map(({ label, value }) => (
            <button
              key={value}
              onClick={() => setPeriod(value)}
              className={`rounded-lg px-4 py-2 text-sm font-medium transition-colors ${
                period === value
                  ? "bg-violet-600 text-white"
                  : "bg-gray-100 text-gray-600 hover:bg-gray-200 dark:bg-gray-800 dark:text-gray-400 dark:hover:bg-gray-700"
              }`}
            >
              {label}
            </button>
          ))}
        </div>

        {/* ── Section 3: 월별 막대 차트 + 카테고리 도넛 차트 ── */}
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
          {/* 월별 지출 막대 차트 */}
          <div className="rounded-xl border border-gray-100 bg-white p-5 dark:border-gray-800 dark:bg-gray-900">
            <h3 className="mb-4 text-sm font-semibold text-gray-900 dark:text-white">월별 지출</h3>
            {noData ? (
              <p className="py-16 text-center text-sm text-gray-400">데이터 없음</p>
            ) : (
              <ResponsiveContainer width="100%" height={260}>
                <BarChart
                  data={monthlyBarData}
                  margin={{ top: 4, right: 8, left: 0, bottom: 4 }}
                >
                  <CartesianGrid strokeDasharray="3 3" stroke="#f3f4f6" vertical={false} />
                  <XAxis
                    dataKey="label"
                    tick={{ fontSize: 11, fill: "#9ca3af" }}
                    tickLine={false}
                    axisLine={false}
                  />
                  <YAxis
                    tickFormatter={yAxisFmt}
                    tick={{ fontSize: 11, fill: "#9ca3af" }}
                    tickLine={false}
                    axisLine={false}
                    width={44}
                  />
                  <Tooltip
                    formatter={(value) => [fmt(Number(value)), "지출"]}
                    contentStyle={{
                      borderRadius: 8,
                      border: "1px solid #e5e7eb",
                      fontSize: 12,
                    }}
                    cursor={{ fill: resolvedTheme === "dark" ? "rgba(124, 58, 237, 0.15)" : "#f5f3ff" }}
                  />
                  <Bar dataKey="amount" fill="#7C3AED" radius={[4, 4, 0, 0]} maxBarSize={48} />
                </BarChart>
              </ResponsiveContainer>
            )}
          </div>

          {/* 카테고리별 비중 도넛 차트 */}
          <div className="rounded-xl border border-gray-100 bg-white p-5 dark:border-gray-800 dark:bg-gray-900">
            <h3 className="mb-4 text-sm font-semibold text-gray-900 dark:text-white">
              카테고리별 비중
            </h3>
            {categoryData.length === 0 ? (
              <p className="py-16 text-center text-sm text-gray-400">데이터 없음</p>
            ) : (
              <>
                <ResponsiveContainer width="100%" height={200}>
                  <PieChart>
                    <Pie
                      data={categoryData}
                      cx="50%"
                      cy="50%"
                      innerRadius={55}
                      outerRadius={88}
                      paddingAngle={2}
                      dataKey="amount"
                    >
                      {categoryData.map((_, i) => (
                        <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip
                      formatter={(value) => [fmt(Number(value)), "월 지출"]}
                      contentStyle={{
                        borderRadius: 8,
                        border: "1px solid #e5e7eb",
                        fontSize: 12,
                      }}
                    />
                  </PieChart>
                </ResponsiveContainer>
                {/* 커스텀 레전드 */}
                <div className="mt-3 flex flex-wrap justify-center gap-x-4 gap-y-2">
                  {categoryData.map((cat, i) => (
                    <div key={cat.name} className="flex items-center gap-1.5">
                      <div
                        className="h-2.5 w-2.5 shrink-0 rounded-full"
                        style={{ backgroundColor: PIE_COLORS[i % PIE_COLORS.length] }}
                      />
                      <span className="text-xs text-gray-600 dark:text-gray-400">
                        {cat.name} {cat.pct}%
                      </span>
                    </div>
                  ))}
                </div>
              </>
            )}
          </div>
        </div>

        {/* ── Section 4: 서비스 순위 + 카테고리 바 + 기간별 비교 ── */}
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
          {/* 서비스별 지출 순위 */}
          <div className="rounded-xl border border-gray-100 bg-white p-5 dark:border-gray-800 dark:bg-gray-900">
            <h3 className="mb-4 text-sm font-semibold text-gray-900 dark:text-white">
              서비스별 지출 순위
            </h3>
            {serviceRanking.length === 0 ? (
              <p className="py-8 text-center text-sm text-gray-400">데이터 없음</p>
            ) : (
              <div className="space-y-3">
                {serviceRanking.map((sub, i) => {
                  const svc = services.find((s) => s.name === sub.serviceName);
                  return (
                    <div key={sub.id} className="flex items-center gap-3">
                      <span className="w-5 shrink-0 text-center text-xs font-semibold text-gray-400">
                        {i + 1}
                      </span>
                      <ServiceLogo
                        name={sub.serviceName}
                        logoDomain={svc?.logoDomain}
                        size={28}
                      />
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-medium text-gray-900 dark:text-white">
                          {sub.serviceName}
                        </p>
                        <p className="truncate text-xs text-gray-400">
                          {sub.category?.name ?? "기타"}
                        </p>
                      </div>
                      <div className="shrink-0 text-right">
                        <p className="text-sm font-semibold text-gray-900 dark:text-white">
                          {fmt(sub.monthly)}
                        </p>
                        <p className="text-xs text-gray-400">{sub.pct}%</p>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* 카테고리별 가로 바 차트 (Tailwind) */}
          <div className="rounded-xl border border-gray-100 bg-white p-5 dark:border-gray-800 dark:bg-gray-900">
            <h3 className="mb-4 text-sm font-semibold text-gray-900 dark:text-white">
              카테고리별 지출
            </h3>
            {categoryData.length === 0 ? (
              <p className="py-8 text-center text-sm text-gray-400">데이터 없음</p>
            ) : (
              <>
                <div className="space-y-4">
                  {categoryData.map((cat, i) => (
                    <div key={cat.name}>
                      <div className="mb-1.5 flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <div
                            className="h-2.5 w-2.5 shrink-0 rounded-full"
                            style={{ backgroundColor: PIE_COLORS[i % PIE_COLORS.length] }}
                          />
                          <span className="text-xs text-gray-600 dark:text-gray-400">
                            {cat.name}
                          </span>
                        </div>
                        <span className="text-xs font-semibold text-gray-900 dark:text-white">
                          {cat.pct}%
                        </span>
                      </div>
                      <div className="h-2 w-full overflow-hidden rounded-full bg-gray-100 dark:bg-gray-800">
                        <div
                          className="h-full rounded-full transition-all duration-500"
                          style={{
                            width: `${cat.pct}%`,
                            backgroundColor: PIE_COLORS[i % PIE_COLORS.length],
                          }}
                        />
                      </div>
                      <p className="mt-0.5 text-right text-xs text-gray-400 dark:text-gray-500">
                        {fmt(cat.amount)}/월
                      </p>
                    </div>
                  ))}
                </div>
                {categoryData[0] && (
                  <div className="mt-4 rounded-lg bg-violet-50 px-3 py-2.5 dark:bg-violet-950/40">
                    <p className="text-xs text-violet-700 dark:text-violet-300">
                      <span className="font-semibold">{categoryData[0].name}</span>이(가) 전체
                      지출의 <span className="font-semibold">{categoryData[0].pct}%</span>를
                      차지합니다.
                    </p>
                  </div>
                )}
              </>
            )}
          </div>

          {/* 기간별 비교 */}
          <div className="rounded-xl border border-gray-100 bg-white p-5 dark:border-gray-800 dark:bg-gray-900">
            <h3 className="mb-4 text-sm font-semibold text-gray-900 dark:text-white">
              기간별 비교
            </h3>
            <div className="space-y-3">
              {(
                [
                  { label: "이번 달", value: fmt(thisMonthTotal), dot: "bg-violet-500" },
                  { label: "지난 달", value: fmt(lastMonthTotal), dot: "bg-blue-500" },
                  { label: "3개월 평균", value: fmt(avg3m), dot: "bg-indigo-400" },
                  ...(maxEntry
                    ? [
                        {
                          label: `최고 지출월 (${maxEntry.label})`,
                          value: fmt(maxEntry.amount),
                          dot: "bg-red-400",
                        },
                      ]
                    : []),
                  ...(minEntry && minEntry.amount > 0
                    ? [
                        {
                          label: `최저 지출월 (${minEntry.label})`,
                          value: fmt(minEntry.amount),
                          dot: "bg-green-400",
                        },
                      ]
                    : []),
                ] as { label: string; value: string; dot: string }[]
              ).map(({ label, value, dot }) => (
                <div key={label} className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className={`h-2 w-2 shrink-0 rounded-full ${dot}`} />
                    <span className="text-xs text-gray-600 dark:text-gray-400">{label}</span>
                  </div>
                  <span className="text-sm font-semibold text-gray-900 dark:text-white">
                    {value}
                  </span>
                </div>
              ))}
              <hr className="border-gray-100 dark:border-gray-800" />
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div
                    className={`h-2 w-2 shrink-0 rounded-full ${
                      vsLastMonth > 0
                        ? "bg-red-400"
                        : vsLastMonth < 0
                          ? "bg-green-400"
                          : "bg-gray-400"
                    }`}
                  />
                  <span className="text-xs text-gray-600 dark:text-gray-400">전월 대비</span>
                </div>
                <span
                  className={`text-sm font-semibold ${
                    vsLastMonth > 0
                      ? "text-red-500"
                      : vsLastMonth < 0
                        ? "text-green-600"
                        : "text-gray-500"
                  }`}
                >
                  {vsLastMonth >= 0 ? `+${fmt(vsLastMonth)}` : fmt(vsLastMonth)}
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
