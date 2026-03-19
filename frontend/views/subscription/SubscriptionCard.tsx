"use client";

import { Pencil, Pause, Play, Trash2 } from "lucide-react";
import type { SubscriptionResponse } from "@/features/subscription/types";
import { useDeleteSubscription, useUpdateSubscriptionStatus } from "@/features/subscription/hooks";

interface Props {
  subscription: SubscriptionResponse;
  onEdit: (subscription: SubscriptionResponse) => void;
}

const STATUS_BADGE: Record<string, { label: string; className: string }> = {
  ACTIVE: {
    label: "활성",
    className: "bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-400",
  },
  PAUSED: {
    label: "일시정지",
    className: "bg-yellow-100 text-yellow-700 dark:bg-yellow-900/40 dark:text-yellow-400",
  },
  CANCELLED: {
    label: "해지",
    className: "bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-400",
  },
};

const BILLING_CYCLE_LABEL: Record<string, string> = {
  MONTHLY: "월",
  YEARLY: "년",
  WEEKLY: "주",
};

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

function formatDate(dateStr: string): string {
  const date = new Date(dateStr);
  return `${date.getMonth() + 1}월 ${date.getDate()}일`;
}

function getInitial(name: string): string {
  return name.charAt(0).toUpperCase();
}

export default function SubscriptionCard({ subscription, onEdit }: Props) {
  const deleteSubscription = useDeleteSubscription();
  const updateStatus = useUpdateSubscriptionStatus();

  const badge = STATUS_BADGE[subscription.status] ?? STATUS_BADGE.ACTIVE;
  const bgColor = "#6d28d9";

  const handleDelete = () => {
    if (!window.confirm(`'${subscription.serviceName}' 구독을 삭제할까요?`)) return;
    deleteSubscription.mutate(subscription.id);
  };

  const handleTogglePause = () => {
    const nextStatus = subscription.status === "ACTIVE" ? "PAUSED" : "ACTIVE";
    updateStatus.mutate({ id: subscription.id, status: nextStatus });
  };

  return (
    <div className="flex flex-col rounded-xl border border-gray-100 bg-white shadow-sm transition-shadow hover:shadow-md dark:border-gray-800 dark:bg-gray-900">
      {/* 상단 */}
      <div className="flex items-start gap-3 p-4">
        {/* 서비스 아이콘 */}
        <div
          className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg text-sm font-bold text-white"
          style={{ backgroundColor: bgColor }}
        >
          {getInitial(subscription.serviceName)}
        </div>

        {/* 서비스 정보 */}
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-semibold text-gray-900 dark:text-white">
            {subscription.serviceName}
          </p>
          <p className="mt-0.5 truncate text-xs text-gray-400 dark:text-gray-500">
            {subscription.category?.name ?? "카테고리 없음"}
          </p>
        </div>

        {/* 상태 뱃지 */}
        <span
          className={`shrink-0 rounded-full px-2 py-0.5 text-xs font-medium ${badge.className}`}
        >
          {badge.label}
        </span>
      </div>

      <hr className="border-gray-100 dark:border-gray-800" />

      {/* 하단 */}
      <div className="flex flex-1 flex-col gap-3 p-4">
        {/* 금액 + 결제 주기 */}
        <div className="flex items-baseline gap-1">
          <span className="text-lg font-bold text-gray-900 dark:text-white">
            {formatAmount(subscription.amount, subscription.currency)}
          </span>
          <span className="text-sm text-gray-400 dark:text-gray-500">
            / {BILLING_CYCLE_LABEL[subscription.billingCycle] ?? subscription.billingCycle}
          </span>
        </div>

        {/* 다음 갱신일 */}
        <p className="text-xs text-gray-400 dark:text-gray-500">
          다음 갱신일:{" "}
          <span className="font-medium text-gray-600 dark:text-gray-300">
            {formatDate(subscription.nextBillingDate)}
          </span>
        </p>

        {/* 액션 버튼 */}
        <div className="flex items-center gap-1 pt-1">
          <button
            onClick={() => onEdit(subscription)}
            className="flex cursor-pointer items-center gap-1 rounded-md px-2.5 py-1.5 text-xs font-medium text-gray-500 transition-colors hover:bg-gray-100 hover:text-gray-700 dark:text-gray-400 dark:hover:bg-gray-800 dark:hover:text-gray-200"
          >
            <Pencil className="h-3.5 w-3.5" />
            수정
          </button>

          {subscription.status !== "CANCELLED" && (
            <button
              onClick={handleTogglePause}
              disabled={updateStatus.isPending}
              className="flex cursor-pointer items-center gap-1 rounded-md px-2.5 py-1.5 text-xs font-medium text-gray-500 transition-colors hover:bg-gray-100 hover:text-gray-700 disabled:cursor-not-allowed disabled:opacity-50 dark:text-gray-400 dark:hover:bg-gray-800 dark:hover:text-gray-200"
            >
              {subscription.status === "ACTIVE" ? (
                <>
                  <Pause className="h-3.5 w-3.5" />
                  일시정지
                </>
              ) : (
                <>
                  <Play className="h-3.5 w-3.5" />
                  재개
                </>
              )}
            </button>
          )}

          <button
            onClick={handleDelete}
            disabled={deleteSubscription.isPending}
            className="ml-auto flex cursor-pointer items-center gap-1 rounded-md px-2.5 py-1.5 text-xs font-medium text-red-400 transition-colors hover:bg-red-50 hover:text-red-600 disabled:cursor-not-allowed disabled:opacity-50 dark:hover:bg-red-900/20"
          >
            <Trash2 className="h-3.5 w-3.5" />
            삭제
          </button>
        </div>
      </div>
    </div>
  );
}
