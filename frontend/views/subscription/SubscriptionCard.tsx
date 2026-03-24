"use client";

import { Pencil, Pause, Play, Trash2, MoreVertical, ExternalLink } from "lucide-react";
import ServiceLogo from "@/components/ServiceLogo";
import { useRef, useState } from "react";
import { useClickOutside } from "@/hooks/useClickOutside";
import { formatAmount } from "@/lib/formatters";
import { toast } from "sonner";
import type { SubscriptionResponse } from "@/features/subscription/types";
import {
  useDeleteSubscription,
  useSubscriptionServices,
  useUpdateSubscriptionStatus,
} from "@/features/subscription/hooks";

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


function formatDate(dateStr: string): string {
  const date = new Date(dateStr);
  return `${date.getMonth() + 1}월 ${date.getDate()}일`;
}

const WEEKDAY_LABEL: Record<number, string> = {
  1: "월요일", 2: "화요일", 3: "수요일", 4: "목요일",
  5: "금요일", 6: "토요일", 7: "일요일",
};

function formatBillingDay(subscription: SubscriptionResponse): string {
  switch (subscription.billingCycle) {
    case "MONTHLY":
      return subscription.billingDayOfMonth
        ? `매달 ${subscription.billingDayOfMonth}일`
        : "";
    case "WEEKLY":
      return subscription.billingDayOfWeek
        ? `매주 ${WEEKDAY_LABEL[subscription.billingDayOfWeek] ?? ""}`
        : "";
    case "YEARLY": {
      if (!subscription.billingDateOfYear) return "";
      const m = parseInt(subscription.billingDateOfYear.substring(0, 2));
      const d = parseInt(subscription.billingDateOfYear.substring(2, 4));
      return `매년 ${m}월 ${d}일`;
    }
    default:
      return "";
  }
}

export default function SubscriptionCard({ subscription, onEdit }: Props) {
  const deleteSubscription = useDeleteSubscription();
  const updateStatus = useUpdateSubscriptionStatus();
  const { data: services = [] } = useSubscriptionServices();
  const service = services.find((s) => s.name === subscription.serviceName);
  const badge = STATUS_BADGE[subscription.status] ?? STATUS_BADGE.ACTIVE;

  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  useClickOutside(menuRef, () => setMenuOpen(false), menuOpen);

  const handleDelete = () => {
    setMenuOpen(false);
    if (!window.confirm(`'${subscription.serviceName}' 구독을 삭제할까요?`)) return;
    deleteSubscription.mutate(subscription.id, {
      onSuccess: () => toast.success(`'${subscription.serviceName}' 구독이 삭제되었습니다.`),
      onError: () => toast.error("구독 삭제에 실패했습니다."),
    });
  };

  const handleTogglePause = () => {
    setMenuOpen(false);
    const nextStatus = subscription.status === "ACTIVE" ? "PAUSED" : "ACTIVE";
    updateStatus.mutate({ id: subscription.id, status: nextStatus }, {
      onSuccess: () =>
        toast.success(
          nextStatus === "PAUSED"
            ? `'${subscription.serviceName}' 구독이 일시정지되었습니다.`
            : `'${subscription.serviceName}' 구독이 재개되었습니다.`
        ),
    });
  };

  const handleEdit = () => {
    setMenuOpen(false);
    onEdit(subscription);
  };

  return (
    <div className="group flex flex-col rounded-xl border border-gray-100 bg-white shadow-sm transition-shadow hover:shadow-md dark:border-gray-800 dark:bg-gray-900">
      {/* 상단 */}
      <div className="flex items-start gap-3 p-4">
        {/* 서비스 아이콘 */}
        <ServiceLogo
          name={subscription.serviceName}
          logoDomain={service?.logoDomain}
          size={40}
        />
        {/* 서비스 정보 */}
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-1">
            <p className="truncate text-sm font-semibold text-gray-900 dark:text-white">
              {subscription.serviceName}
            </p>
            {service?.websiteUrl && (
              <a
                href={service.websiteUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="shrink-0 text-gray-400 hover:text-violet-500"
              >
                <ExternalLink className="h-3.5 w-3.5" />
              </a>
            )}
          </div>
          <p className="mt-0.5 truncate text-xs text-gray-400 dark:text-gray-500">
            {subscription.category?.name ?? "카테고리 없음"}
          </p>
        </div>

        {/* 상태 뱃지 + 케밥 메뉴 */}
        <div className="flex shrink-0 items-center gap-1">
          <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${badge.className}`}>
            {badge.label}
          </span>

          {/* 케밥 메뉴 */}
          <div className="relative" ref={menuRef}>
            <button
              onClick={() => setMenuOpen((v) => !v)}
              className="flex cursor-pointer items-center justify-center rounded-md p-1 text-gray-300 transition-colors hover:bg-gray-100 hover:text-gray-600 dark:text-gray-600 dark:hover:bg-gray-800 dark:hover:text-gray-300"
            >
              <MoreVertical className="h-4 w-4" />
            </button>

            {menuOpen && (
              <div className="absolute right-0 top-full z-10 mt-1 w-36 overflow-hidden rounded-lg border border-gray-100 bg-white shadow-lg dark:border-gray-700 dark:bg-gray-800">
                <button
                  onClick={handleEdit}
                  className="flex w-full cursor-pointer items-center gap-2 px-3 py-2 text-xs text-gray-700 hover:bg-gray-50 dark:text-gray-200 dark:hover:bg-gray-700"
                >
                  <Pencil className="h-3.5 w-3.5" />
                  수정
                </button>

                {subscription.status !== "CANCELLED" && (
                  <button
                    onClick={handleTogglePause}
                    disabled={updateStatus.isPending}
                    className="flex w-full cursor-pointer items-center gap-2 px-3 py-2 text-xs text-gray-700 hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-50 dark:text-gray-200 dark:hover:bg-gray-700"
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

                <hr className="border-gray-100 dark:border-gray-700" />

                <button
                  onClick={handleDelete}
                  disabled={deleteSubscription.isPending}
                  className="flex w-full cursor-pointer items-center gap-2 px-3 py-2 text-xs text-red-500 hover:bg-red-50 disabled:cursor-not-allowed disabled:opacity-50 dark:hover:bg-red-900/20"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                  삭제
                </button>
              </div>
            )}
          </div>
        </div>
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

        {/* 청구 기준일 */}
        {formatBillingDay(subscription) && (
          <p className="text-xs text-gray-400 dark:text-gray-500">
            <span className="font-medium text-gray-600 dark:text-gray-300">
              {formatBillingDay(subscription)}
            </span>
          </p>
        )}

        {/* 다음 갱신일 */}
        <p className="text-xs text-gray-400 dark:text-gray-500">
          다음 갱신일:{" "}
          <span className="font-medium text-gray-600 dark:text-gray-300">
            {formatDate(subscription.nextBillingDate)}
          </span>
        </p>
      </div>
    </div>
  );
}
