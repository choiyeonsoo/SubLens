"use client";

import { useEffect, useState } from "react";
import { X } from "lucide-react";
import {
  useCategories,
  useCreateSubscription,
  useUpdateSubscription,
} from "@/features/subscription/hooks";
import ServiceSelectField from "@/components/ServiceSelectField";
import Select from "@/components/ui/Select";
import type {
  SubscriptionCreateRequest,
  SubscriptionResponse,
} from "@/features/subscription/types";

interface Props {
  open: boolean;
  onClose: () => void;
  initial?: SubscriptionResponse | null;
}

interface FormState {
  serviceName: string;
  categoryId: string;
  amount: string;
  currency: "KRW" | "USD" | "EUR" | "JPY" | "GBP";
  billingCycle: "WEEKLY" | "MONTHLY" | "YEARLY";
  startDate: string;
  nextBillingDate: string;
  notifyDaysBefore: string; // '0' = 알림 없음
}

const CURRENCIES = ["KRW", "USD", "EUR", "JPY", "GBP"] as const;
const BILLING_CYCLES = [
  { value: "MONTHLY", label: "월간" },
  { value: "YEARLY", label: "연간" },
  { value: "WEEKLY", label: "주간" },
] as const;
const NOTIFY_OPTIONS = [
  { value: "0", label: "알림 없음" },
  { value: "1", label: "1일 전" },
  { value: "3", label: "3일 전" },
  { value: "7", label: "7일 전" },
];

function today(): string {
  return new Date().toISOString().split("T")[0];
}

function toFormState(sub: SubscriptionResponse): FormState {
  return {
    serviceName: sub.serviceName,
    categoryId: sub.category?.id ?? "",
    amount: String(sub.amount),
    currency: sub.currency as FormState["currency"],
    billingCycle: sub.billingCycle as FormState["billingCycle"],
    startDate: sub.startDate?.split("T")[0] ?? today(),
    nextBillingDate: sub.nextBillingDate?.split("T")[0] ?? "",
    notifyDaysBefore: sub.notifyBefore ? String(sub.notifyDaysBefore) : "0",
  };
}

const DEFAULT_FORM: FormState = {
  serviceName: "",
  categoryId: "",
  amount: "",
  currency: "KRW",
  billingCycle: "MONTHLY",
  startDate: today(),
  nextBillingDate: "",
  notifyDaysBefore: "0",
};

export default function SubscriptionFormModal({ open, onClose, initial }: Props) {
  const isEdit = !!initial;
  const { data: categories = [] } = useCategories();
  const createMutation = useCreateSubscription();
  const updateMutation = useUpdateSubscription();

  const [form, setForm] = useState<FormState>(DEFAULT_FORM);
  const [errors, setErrors] = useState<Partial<Record<keyof FormState, string>>>({});

  useEffect(() => {
    if (open) {
      setForm(initial ? toFormState(initial) : DEFAULT_FORM);
      setErrors({});
    }
  }, [open, initial]);

  if (!open) return null;

  const isPending = createMutation.isPending || updateMutation.isPending;

  const set = (key: keyof FormState, value: string) => {
    setForm((prev) => ({ ...prev, [key]: value }));
    setErrors((prev) => ({ ...prev, [key]: undefined }));
  };

  const validate = (): boolean => {
    const next: typeof errors = {};

    if (!form.serviceName.trim()) {
      next.serviceName = "서비스명을 입력해주세요.";
    }
    const amount = Number(form.amount);
    if (isNaN(amount) || amount < 0) {
      next.amount = "금액은 0 이상이어야 합니다.";
    }
    if (!form.nextBillingDate) {
      next.nextBillingDate = "다음 갱신일을 선택해주세요.";
    } else if (form.nextBillingDate <= today()) {
      next.nextBillingDate = "다음 갱신일은 오늘 이후여야 합니다.";
    }

    setErrors(next);
    return Object.keys(next).length === 0;
  };

  const handleSubmit = () => {
    if (!validate()) return;

    const notifyDays = Number(form.notifyDaysBefore);
    const payload: SubscriptionCreateRequest = {
      serviceName: form.serviceName.trim(),
      categoryId: form.categoryId || undefined,
      amount: Number(form.amount),
      currency: form.currency,
      billingCycle: form.billingCycle,
      startDate: form.startDate || undefined,
      nextBillingDate: form.nextBillingDate,
      notifyBefore: notifyDays > 0,
      notifyDaysBefore: notifyDays > 0 ? notifyDays : undefined,
    };

    if (isEdit && initial) {
      updateMutation.mutate({ ...payload, id: initial.id }, { onSuccess: onClose });
    } else {
      createMutation.mutate(payload, { onSuccess: onClose });
    }
  };

  const inputClass = (field: keyof FormState) =>
    `w-full rounded-lg border px-3 py-2 text-sm outline-none transition-colors focus:ring-2 focus:ring-violet-500 dark:bg-gray-800 dark:text-white ${
      errors[field] ? "border-red-400 dark:border-red-500" : "border-gray-200 dark:border-gray-700"
    }`;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div className="flex max-h-[90vh] w-full max-w-md flex-col overflow-hidden rounded-2xl bg-white shadow-xl dark:bg-gray-900">
        {/* 헤더 */}
        <div className="flex items-center justify-between border-b border-gray-100 px-5 py-4 dark:border-gray-800">
          <h2 className="text-base font-semibold text-gray-900 dark:text-white">
            {isEdit ? "구독 수정" : "구독 추가"}
          </h2>
          <button
            onClick={onClose}
            className="cursor-pointer rounded-md p-1 text-gray-400 transition-colors hover:bg-gray-100 hover:text-gray-600 dark:hover:bg-gray-800"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* 폼 */}
        <div className="flex-1 overflow-y-auto px-5 py-4">
          <div className="flex flex-col gap-4">
            {/* 서비스명 */}
            <div>
              <label className="mb-1 block text-xs font-medium text-gray-600 dark:text-gray-400">
                서비스명 <span className="text-red-400">*</span>
              </label>
              <ServiceSelectField
                value={form.serviceName}
                onChange={(v) => set("serviceName", v)}
                error={errors.serviceName}
              />
              {errors.serviceName && (
                <p className="mt-1 text-xs text-red-500">{errors.serviceName}</p>
              )}
            </div>

            {/* 카테고리 */}
            <div>
              <label className="mb-1 block text-xs font-medium text-gray-600 dark:text-gray-400">
                카테고리
              </label>
              <Select
                value={form.categoryId}
                onChange={(v) => set("categoryId", v)}
                options={[
                  { value: "", label: "카테고리 없음" },
                  ...categories.map((cat) => ({ value: cat.id, label: cat.name })),
                ]}
              />
            </div>

            {/* 금액 + 통화 */}
            <div>
              <label className="mb-1 block text-xs font-medium text-gray-600 dark:text-gray-400">
                금액 <span className="text-red-400">*</span>
              </label>
              <div className="flex gap-2">
                <input
                  type="number"
                  min="0"
                  placeholder="0"
                  value={form.amount}
                  onChange={(e) => set("amount", e.target.value)}
                  className={`flex-1 ${inputClass("amount")}`}
                />
                <div className="w-24">
                  <Select
                    value={form.currency}
                    onChange={(v) => set("currency", v as FormState["currency"])}
                    options={CURRENCIES.map((c) => ({ value: c, label: c }))}
                  />
                </div>
              </div>
              {errors.amount && <p className="mt-1 text-xs text-red-500">{errors.amount}</p>}
            </div>

            {/* 결제 주기 */}
            <div>
              <label className="mb-1 block text-xs font-medium text-gray-600 dark:text-gray-400">
                결제 주기
              </label>
              <Select
                value={form.billingCycle}
                onChange={(v) => set("billingCycle", v as FormState["billingCycle"])}
                options={BILLING_CYCLES.map(({ value, label }) => ({ value, label }))}
              />
            </div>

            {/* 시작일 + 다음 갱신일 */}
            <div className="flex gap-3">
              <div className="flex-1">
                <label className="mb-1 block text-xs font-medium text-gray-600 dark:text-gray-400">
                  시작일
                </label>
                <input
                  type="date"
                  value={form.startDate}
                  onChange={(e) => set("startDate", e.target.value)}
                  className={inputClass("startDate")}
                />
              </div>
              <div className="flex-1">
                <label className="mb-1 block text-xs font-medium text-gray-600 dark:text-gray-400">
                  다음 갱신일 <span className="text-red-400">*</span>
                </label>
                <input
                  type="date"
                  value={form.nextBillingDate}
                  onChange={(e) => set("nextBillingDate", e.target.value)}
                  className={inputClass("nextBillingDate")}
                />
                {errors.nextBillingDate && (
                  <p className="mt-1 text-xs text-red-500">{errors.nextBillingDate}</p>
                )}
              </div>
            </div>

            {/* 갱신 알림 */}
            <div>
              <label className="mb-1 block text-xs font-medium text-gray-600 dark:text-gray-400">
                갱신 알림
              </label>
              <Select
                value={form.notifyDaysBefore}
                onChange={(v) => set("notifyDaysBefore", v)}
                options={NOTIFY_OPTIONS.map(({ value, label }) => ({ value, label }))}
              />
            </div>
          </div>
        </div>

        {/* 푸터 */}
        <div className="flex justify-end gap-2 border-t border-gray-100 px-5 py-4 dark:border-gray-800">
          <button
            onClick={onClose}
            className="cursor-pointer rounded-lg px-4 py-2 text-sm font-medium text-gray-600 transition-colors hover:bg-gray-100 dark:text-gray-400 dark:hover:bg-gray-800"
          >
            취소
          </button>
          <button
            onClick={handleSubmit}
            disabled={isPending}
            className="cursor-pointer rounded-lg bg-violet-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-violet-700 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {isPending ? "저장 중..." : isEdit ? "수정" : "추가"}
          </button>
        </div>
      </div>
    </div>
  );
}
