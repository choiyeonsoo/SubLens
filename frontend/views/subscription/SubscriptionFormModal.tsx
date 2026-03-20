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
import { Button } from "@/components/ui/Button";
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
  // MONTHLY
  billingDayOfMonth: string;
  // WEEKLY
  billingDayOfWeek: string;
  // YEARLY
  billingDateOfYearMonth: string;
  billingDateOfYearDay: string;
  notifyDaysBefore: string;
  customNotifyDaysInput: string;
}

const CURRENCIES = ["KRW", "USD", "EUR", "JPY", "GBP"] as const;
const BILLING_CYCLES = [
  { value: "YEARLY", label: "연간" },
  { value: "MONTHLY", label: "월간" },
  { value: "WEEKLY", label: "주간" },
] as const;
const NOTIFY_OPTIONS = [
  { value: "0", label: "알림 없음" },
  { value: "1", label: "1일 전" },
  { value: "3", label: "3일 전" },
  { value: "7", label: "7일 전" },
  { value: "custom", label: "직접 입력" },
];
const PRESET_NOTIFY = new Set(["0", "1", "3", "7"]);
const WEEKDAY_OPTIONS = [
  { value: "1", label: "월요일" },
  { value: "2", label: "화요일" },
  { value: "3", label: "수요일" },
  { value: "4", label: "목요일" },
  { value: "5", label: "금요일" },
  { value: "6", label: "토요일" },
  { value: "7", label: "일요일" },
];

function today(): string {
  return new Date().toISOString().split("T")[0];
}

function toFormState(sub: SubscriptionResponse): FormState {
  const yearMonth = sub.billingDateOfYear?.substring(0, 2) ?? "";
  const yearDay = sub.billingDateOfYear?.substring(2, 4) ?? "";
  const rawDays = sub.notifyBefore ? String(sub.notifyDaysBefore) : "0";
  const isPreset = PRESET_NOTIFY.has(rawDays);
  return {
    serviceName: sub.serviceName,
    categoryId: sub.category?.id ?? "",
    amount: String(sub.amount),
    currency: sub.currency as FormState["currency"],
    billingCycle: sub.billingCycle as FormState["billingCycle"],
    startDate: sub.startDate?.split("T")[0] ?? today(),
    billingDayOfMonth: sub.billingDayOfMonth ? String(sub.billingDayOfMonth) : "",
    billingDayOfWeek: sub.billingDayOfWeek ? String(sub.billingDayOfWeek) : "",
    billingDateOfYearMonth: yearMonth ? String(parseInt(yearMonth)) : "",
    billingDateOfYearDay: yearDay ? String(parseInt(yearDay)) : "",
    notifyDaysBefore: isPreset ? rawDays : "custom",
    customNotifyDaysInput: isPreset ? "" : rawDays,
  };
}

const DEFAULT_FORM: FormState = {
  serviceName: "",
  categoryId: "",
  amount: "",
  currency: "KRW",
  billingCycle: "MONTHLY",
  startDate: today(),
  billingDayOfMonth: "",
  billingDayOfWeek: "",
  billingDateOfYearMonth: "",
  billingDateOfYearDay: "",
  notifyDaysBefore: "0",
  customNotifyDaysInput: "",
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

    if (form.amount.trim() === "") {
      next.amount = "금액을 입력해주세요.";
    } else {
      const amount = Number(form.amount);
      if (isNaN(amount) || amount < 0) {
        next.amount = "금액은 0 이상이어야 합니다.";
      }
    }

    if (form.billingCycle === "MONTHLY") {
      const day = Number(form.billingDayOfMonth);
      if (!form.billingDayOfMonth || !Number.isInteger(day) || day < 1 || day > 31) {
        next.billingDayOfMonth = "1 ~ 31 사이의 날짜를 입력해주세요.";
      }
    }

    if (form.billingCycle === "WEEKLY") {
      if (!form.billingDayOfWeek) {
        next.billingDayOfWeek = "요일을 선택해주세요.";
      }
    }

    if (form.billingCycle === "YEARLY") {
      const m = Number(form.billingDateOfYearMonth);
      const d = Number(form.billingDateOfYearDay);
      if (!form.billingDateOfYearMonth || !Number.isInteger(m) || m < 1 || m > 12) {
        next.billingDateOfYearMonth = "1 ~ 12 사이의 월을 입력해주세요.";
      } else {
        const maxDay = new Date(2000, m, 0).getDate(); // 해당 월의 마지막 날
        if (!form.billingDateOfYearDay || !Number.isInteger(d) || d < 1 || d > maxDay) {
          next.billingDateOfYearDay = `1 ~ ${maxDay} 사이의 일을 입력해주세요.`;
        }
      }
    }

    if (form.notifyDaysBefore === "custom") {
      const days = Number(form.customNotifyDaysInput);
      if (!form.customNotifyDaysInput || !Number.isInteger(days) || days < 1 || days > 30) {
        next.customNotifyDaysInput = "1 ~ 30 사이의 값을 입력해주세요.";
      }
    }

    setErrors(next);
    return Object.keys(next).length === 0;
  };

  const handleSubmit = () => {
    if (!validate()) return;

    const notifyDays =
      form.notifyDaysBefore === "custom"
        ? Number(form.customNotifyDaysInput)
        : Number(form.notifyDaysBefore);

    const billingDateOfYear =
      form.billingCycle === "YEARLY"
        ? String(form.billingDateOfYearMonth).padStart(2, "0") +
          String(form.billingDateOfYearDay).padStart(2, "0")
        : undefined;

    const payload: SubscriptionCreateRequest = {
      serviceName: form.serviceName.trim(),
      categoryId: form.categoryId || undefined,
      amount: Number(form.amount),
      currency: form.currency,
      billingCycle: form.billingCycle,
      startDate: form.startDate || undefined,
      billingDayOfMonth:
        form.billingCycle === "MONTHLY" ? Number(form.billingDayOfMonth) : undefined,
      billingDayOfWeek: form.billingCycle === "WEEKLY" ? Number(form.billingDayOfWeek) : undefined,
      billingDateOfYear,
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
          <Button variant="ghost" size="icon" onClick={onClose}>
            <X className="h-5 w-5" />
          </Button>
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
                placeholder="카테고리 없음"
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
                    placeholder="통화 선택"
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
                onChange={(v) => {
                  set("billingCycle", v as FormState["billingCycle"]);
                  // 주기 변경 시 기존 기준일 초기화
                  setForm((prev) => ({
                    ...prev,
                    billingCycle: v as FormState["billingCycle"],
                    billingDayOfMonth: "",
                    billingDayOfWeek: "",
                    billingDateOfYearMonth: "",
                    billingDateOfYearDay: "",
                  }));
                  setErrors({});
                }}
                placeholder="결제 주기 선택"
                options={BILLING_CYCLES.map(({ value, label }) => ({ value, label }))}
              />
            </div>

            {/* 청구 기준일 — billingCycle에 따라 동적 렌더링 */}
            {form.billingCycle === "MONTHLY" && (
              <div>
                <label className="mb-1 block text-xs font-medium text-gray-600 dark:text-gray-400">
                  매달 몇 일? <span className="text-red-400">*</span>
                </label>
                <input
                  type="number"
                  min="1"
                  max="31"
                  placeholder="1 ~ 31"
                  value={form.billingDayOfMonth}
                  onChange={(e) => set("billingDayOfMonth", e.target.value)}
                  className={inputClass("billingDayOfMonth")}
                />
                {errors.billingDayOfMonth && (
                  <p className="mt-1 text-xs text-red-500">{errors.billingDayOfMonth}</p>
                )}
              </div>
            )}

            {form.billingCycle === "WEEKLY" && (
              <div>
                <label className="mb-1 block text-xs font-medium text-gray-600 dark:text-gray-400">
                  무슨 요일? <span className="text-red-400">*</span>
                </label>
                <Select
                  value={form.billingDayOfWeek}
                  onChange={(v) => set("billingDayOfWeek", v)}
                  placeholder="요일 선택"
                  options={WEEKDAY_OPTIONS}
                />
                {errors.billingDayOfWeek && (
                  <p className="mt-1 text-xs text-red-500">{errors.billingDayOfWeek}</p>
                )}
              </div>
            )}

            {form.billingCycle === "YEARLY" && (
              <div>
                <label className="mb-1 block text-xs font-medium text-gray-600 dark:text-gray-400">
                  몇 월 며칠? <span className="text-red-400">*</span>
                </label>
                <div className="flex items-center gap-2">
                  <input
                    type="number"
                    min="1"
                    max="12"
                    placeholder="월 (1~12)"
                    value={form.billingDateOfYearMonth}
                    onChange={(e) => set("billingDateOfYearMonth", e.target.value)}
                    className={`flex-1 ${inputClass("billingDateOfYearMonth")}`}
                  />
                  <span className="text-sm text-gray-400">월</span>
                  <input
                    type="number"
                    min="1"
                    max="31"
                    placeholder="일 (1~31)"
                    value={form.billingDateOfYearDay}
                    onChange={(e) => set("billingDateOfYearDay", e.target.value)}
                    className={`flex-1 ${inputClass("billingDateOfYearDay")}`}
                  />
                  <span className="text-sm text-gray-400">일</span>
                </div>
                {(errors.billingDateOfYearMonth || errors.billingDateOfYearDay) && (
                  <p className="mt-1 text-xs text-red-500">
                    {errors.billingDateOfYearMonth ?? errors.billingDateOfYearDay}
                  </p>
                )}
              </div>
            )}

            {/* 시작일 */}
            <div>
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

            {/* 갱신 알림 */}
            <div>
              <label className="mb-1 block text-xs font-medium text-gray-600 dark:text-gray-400">
                갱신 알림
              </label>
              <Select
                value={form.notifyDaysBefore}
                onChange={(v) => {
                  setForm((prev) => ({
                    ...prev,
                    notifyDaysBefore: v ?? "0",
                    customNotifyDaysInput: v === "custom" ? prev.customNotifyDaysInput : "",
                  }));
                  setErrors((prev) => ({
                    ...prev,
                    notifyDaysBefore: undefined,
                    customNotifyDaysInput: undefined,
                  }));
                }}
                placeholder="알림 설정"
                options={NOTIFY_OPTIONS.map(({ value, label }) => ({ value, label }))}
              />
              {form.notifyDaysBefore === "custom" && (
                <div className="mt-2 flex items-center gap-2">
                  <input
                    type="number"
                    min="1"
                    max="30"
                    placeholder="며칠 전?"
                    value={form.customNotifyDaysInput}
                    onChange={(e) => set("customNotifyDaysInput", e.target.value)}
                    className={`flex-1 ${inputClass("customNotifyDaysInput")}`}
                  />
                  <span className="text-sm text-gray-400">일 전</span>
                </div>
              )}
              {errors.customNotifyDaysInput && (
                <p className="mt-1 text-xs text-red-500">{errors.customNotifyDaysInput}</p>
              )}
            </div>
          </div>
        </div>

        {/* 푸터 */}
        <div className="flex justify-end gap-2 border-t border-gray-100 px-5 py-4 dark:border-gray-800">
          <Button variant="ghost" onClick={onClose}>
            취소
          </Button>
          <Button variant="primary" onClick={handleSubmit} disabled={isPending}>
            {isPending ? "저장 중..." : isEdit ? "수정" : "추가"}
          </Button>
        </div>
      </div>
    </div>
  );
}
