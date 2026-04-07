"use client";

import { useEffect, useState } from "react";
import { X, Package, User, AlertTriangle, CheckCircle, HelpCircle } from "lucide-react";
import {
  useCategories,
  useCreateSubscription,
  useUpdateSubscription,
  useBundles,
  useSubscriptions,
} from "@/features/subscription/hooks";
import ServiceSelectField from "@/components/ServiceSelectField";
import Select from "@/components/ui/Select";
import { Button } from "@/components/ui/Button";
import type {
  BundleItem,
  SubscriptionCreateRequest,
  SubscriptionResponse,
} from "@/features/subscription/types";

// ── 상수 ──────────────────────────────────────────────────────────────────
const CURRENCIES = ["KRW", "USD", "EUR", "JPY", "GBP"] as const;
const BILLING_CYCLES = [
  { value: "YEARLY",  label: "연간" },
  { value: "MONTHLY", label: "월간" },
  { value: "WEEKLY",  label: "주간" },
] as const;
const NOTIFY_OPTIONS = [
  { value: "0",  label: "알림 없음" },
  { value: "1",  label: "1일 전" },
  { value: "3",  label: "3일 전" },
  { value: "7",  label: "7일 전" },
];
const WEEKDAY_OPTIONS = [
  { value: "1", label: "월요일" }, { value: "2", label: "화요일" },
  { value: "3", label: "수요일" }, { value: "4", label: "목요일" },
  { value: "5", label: "금요일" }, { value: "6", label: "토요일" },
  { value: "7", label: "일요일" },
];
const PRESET_NOTIFY = new Set(["0", "1", "3", "7"]);

const PROVIDERS = [
  { label: "전체",   value: undefined },
  { label: "LGU+",  value: "LGU+" },
  { label: "SKT",   value: "SKT" },
  { label: "KT",    value: "KT" },
  { label: "네이버", value: "NAVER" },
] as const;

// ── Types ──────────────────────────────────────────────────────────────────
type Mode = "INDIVIDUAL" | "BUNDLE";

interface FormState {
  serviceName: string;
  categoryId: string;
  amount: string;
  currency: "KRW" | "USD" | "EUR" | "JPY" | "GBP";
  billingCycle: "WEEKLY" | "MONTHLY" | "YEARLY";
  startDate: string;
  billingDayOfMonth: string;
  billingDayOfWeek: string;
  billingDateOfYearMonth: string;
  billingDateOfYearDay: string;
  notifyDaysBefore: string;
  customNotifyDaysInput: string;
}

interface Props {
  open: boolean;
  onClose: () => void;
  initial?: SubscriptionResponse | null;
}

// ── Helpers ────────────────────────────────────────────────────────────────
function today(): string {
  return new Date().toISOString().split("T")[0];
}

function toFormState(sub: SubscriptionResponse): FormState {
  const yearMonth = sub.billingDateOfYear?.substring(0, 2) ?? "";
  const yearDay   = sub.billingDateOfYear?.substring(2, 4) ?? "";
  const rawDays   = sub.notifyBefore ? String(sub.notifyDaysBefore) : "0";
  const isPreset  = PRESET_NOTIFY.has(rawDays);
  return {
    serviceName:            sub.serviceName,
    categoryId:             sub.category?.id ?? "",
    amount:                 String(sub.amount),
    currency:               sub.currency as FormState["currency"],
    billingCycle:           sub.billingCycle as FormState["billingCycle"],
    startDate:              sub.startDate?.split("T")[0] ?? today(),
    billingDayOfMonth:      sub.billingDayOfMonth ? String(sub.billingDayOfMonth) : "",
    billingDayOfWeek:       sub.billingDayOfWeek  ? String(sub.billingDayOfWeek)  : "",
    billingDateOfYearMonth: yearMonth ? String(parseInt(yearMonth)) : "",
    billingDateOfYearDay:   yearDay   ? String(parseInt(yearDay))   : "",
    notifyDaysBefore:       isPreset ? rawDays : "custom",
    customNotifyDaysInput:  isPreset ? "" : rawDays,
  };
}

const DEFAULT_FORM: FormState = {
  serviceName: "", categoryId: "", amount: "",
  currency: "KRW", billingCycle: "MONTHLY", startDate: today(),
  billingDayOfMonth: "", billingDayOfWeek: "",
  billingDateOfYearMonth: "", billingDateOfYearDay: "",
  notifyDaysBefore: "0", customNotifyDaysInput: "",
};

// ── 충돌 감지 ──────────────────────────────────────────────────────────────
function useConflicts(existingSubs: SubscriptionResponse[]) {
  // 이미 등록된 bundleId 목록
  const registeredBundleIds = new Set(
    existingSubs.filter((s) => s.isBundle && s.bundleId).map((s) => s.bundleId!)
  );
  // 개별 구독 서비스명 목록 (소문자)
  const individualServiceNames = new Set(
    existingSubs.filter((s) => !s.isBundle).map((s) => s.serviceName.toLowerCase())
  );

  function getBundleConflict(bundle: BundleItem): {
    isDuplicate: boolean;
    overlapping: string[];
  } {
    const isDuplicate = registeredBundleIds.has(bundle.id);
    const overlapping = (bundle.includes ?? []).filter((name) =>
      individualServiceNames.has(name.toLowerCase())
    );
    return { isDuplicate, overlapping };
  }

  return { getBundleConflict };
}

// ── Component ──────────────────────────────────────────────────────────────
export default function SubscriptionSidePanel({ open, onClose, initial }: Props) {
  const isEdit = !!initial;

  const { data: categories = [] } = useCategories();
  const { data: existingSubs = [] } = useSubscriptions({ status: "ACTIVE" });
  const createMutation = useCreateSubscription();
  const updateMutation = useUpdateSubscription();

  const [mode, setMode] = useState<Mode>(() =>
    initial?.isBundle ? "BUNDLE" : "INDIVIDUAL"
  );
  const [form, setForm] = useState<FormState>(() =>
    initial ? toFormState(initial) : DEFAULT_FORM
  );
  const [errors, setErrors] = useState<Partial<Record<keyof FormState, string>>>({});
  const [visible, setVisible] = useState(false);

  // 번들 모드 상태
  const [selectedProvider, setSelectedProvider] = useState<string | undefined>(undefined);
  const [selectedBundle, setSelectedBundle] = useState<BundleItem | null>(null);
  const [tooltipBundle, setTooltipBundle] = useState<string | null>(null);
  const [bundleSearch, setBundleSearch] = useState("");

  const { data: bundles = [], isLoading: bundlesLoading } = useBundles(selectedProvider);
  const { getBundleConflict } = useConflicts(existingSubs);

  // 슬라이드 애니메이션
  useEffect(() => {
    if (open) setVisible(true);
  }, [open]);

  const handleClose = () => {
    onClose();
    setTimeout(() => setVisible(false), 200);
  };

  if (!visible && !open) return null;

  const isPending = createMutation.isPending || updateMutation.isPending;

  const set = (key: keyof FormState, value: string) => {
    setForm((prev) => ({ ...prev, [key]: value }));
    setErrors((prev) => ({ ...prev, [key]: undefined }));
  };

  function switchMode(next: Mode) {
    setMode(next);
    setForm(DEFAULT_FORM);
    setErrors({});
    setSelectedBundle(null);
  }

  // 번들 선택 시 폼 자동 채우기
  function handleSelectBundle(bundle: BundleItem) {
    const { isDuplicate } = getBundleConflict(bundle);
    if (isDuplicate) return;
    setSelectedBundle(bundle);
    setForm((prev) => ({
      ...prev,
      serviceName: bundle.planName,
      amount: String(bundle.basePrice),
      billingCycle: "MONTHLY",
    }));
    setErrors({});
  }

  // ── Validation ──────────────────────────────────────────────────────────
  const validate = (): boolean => {
    const next: typeof errors = {};
    if (!form.serviceName.trim()) next.serviceName = "서비스명을 입력해주세요.";
    if (form.amount.trim() === "") {
      next.amount = "금액을 입력해주세요.";
    } else {
      const amount = Number(form.amount);
      if (isNaN(amount) || amount < 0) next.amount = "금액은 0 이상이어야 합니다.";
    }
    if (mode === "BUNDLE" && !selectedBundle && !isEdit)
      next.serviceName = "번들 상품을 선택해주세요.";

    if (form.billingCycle === "MONTHLY") {
      const day = Number(form.billingDayOfMonth);
      if (!form.billingDayOfMonth || !Number.isInteger(day) || day < 1 || day > 31)
        next.billingDayOfMonth = "1 ~ 31 사이의 날짜를 입력해주세요.";
    }
    if (form.billingCycle === "WEEKLY") {
      if (!form.billingDayOfWeek) next.billingDayOfWeek = "요일을 선택해주세요.";
    }
    if (form.billingCycle === "YEARLY") {
      const m = Number(form.billingDateOfYearMonth);
      const d = Number(form.billingDateOfYearDay);
      if (!form.billingDateOfYearMonth || !Number.isInteger(m) || m < 1 || m > 12)
        next.billingDateOfYearMonth = "1 ~ 12 사이의 월을 입력해주세요.";
      else {
        const maxDay = new Date(2000, m, 0).getDate();
        if (!form.billingDateOfYearDay || !Number.isInteger(d) || d < 1 || d > maxDay)
          next.billingDateOfYearDay = `1 ~ ${maxDay} 사이의 일을 입력해주세요.`;
      }
    }
    if (form.notifyDaysBefore === "custom") {
      const days = Number(form.customNotifyDaysInput);
      if (!form.customNotifyDaysInput || !Number.isInteger(days) || days < 1 || days > 30)
        next.customNotifyDaysInput = "1 ~ 30 사이의 값을 입력해주세요.";
    }
    setErrors(next);
    return Object.keys(next).length === 0;
  };

  // ── Submit ──────────────────────────────────────────────────────────────
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
      serviceName:      form.serviceName.trim(),
      categoryId:       form.categoryId || undefined,
      amount:           Number(form.amount),
      currency:         form.currency,
      billingCycle:     form.billingCycle,
      startDate:        form.startDate || undefined,
      billingDayOfMonth: form.billingCycle === "MONTHLY" ? Number(form.billingDayOfMonth) : undefined,
      billingDayOfWeek:  form.billingCycle === "WEEKLY"  ? Number(form.billingDayOfWeek)  : undefined,
      billingDateOfYear,
      notifyBefore:     notifyDays > 0,
      notifyDaysBefore: notifyDays > 0 ? notifyDays : undefined,
      isBundle:  mode === "BUNDLE",
      bundleId:  mode === "BUNDLE" ? (selectedBundle?.id ?? initial?.bundleId) : undefined,
    };

    if (isEdit && initial) {
      updateMutation.mutate({ ...payload, id: initial.id }, { onSuccess: handleClose });
    } else {
      createMutation.mutate(payload, { onSuccess: handleClose });
    }
  };

  const inputClass = (field: keyof FormState) =>
    `w-full rounded-lg border px-3 py-2 text-sm outline-none transition-colors focus:ring-2 focus:ring-violet-500 dark:bg-gray-800 dark:text-white ${
      errors[field]
        ? "border-red-400 dark:border-red-500"
        : "border-gray-200 dark:border-gray-700"
    }`;

  // ── 결제일/알림 공통 필드 ────────────────────────────────────────────────
  const billingFields = (
    <div className="flex flex-col gap-4">
      <div>
        <label className="mb-1 block text-xs font-medium text-gray-600 dark:text-gray-400">
          결제 주기 <span className="text-red-400">*</span>
        </label>
        <div className="flex gap-2">
          <div className="flex-1">
            <Select
              value={form.billingCycle}
              onChange={(v) => {
                setForm((prev) => ({
                  ...prev,
                  billingCycle: v as FormState["billingCycle"],
                  billingDayOfMonth: "", billingDayOfWeek: "",
                  billingDateOfYearMonth: "", billingDateOfYearDay: "",
                }));
                setErrors({});
              }}
              placeholder="주기"
              options={BILLING_CYCLES.map(({ value, label }) => ({ value, label }))}
            />
          </div>
          {form.billingCycle === "MONTHLY" && (
            <div className="w-28">
              <input
                type="number" min="1" max="31" placeholder="일 (1~31)"
                value={form.billingDayOfMonth}
                onChange={(e) => set("billingDayOfMonth", e.target.value)}
                className={inputClass("billingDayOfMonth")}
              />
            </div>
          )}
          {form.billingCycle === "WEEKLY" && (
            <div className="w-28">
              <Select
                value={form.billingDayOfWeek}
                onChange={(v) => set("billingDayOfWeek", v)}
                placeholder="요일"
                options={WEEKDAY_OPTIONS}
              />
            </div>
          )}
          {form.billingCycle === "YEARLY" && (
            <div className="flex w-36 items-center gap-1">
              <input
                type="number" min="1" max="12" placeholder="월"
                value={form.billingDateOfYearMonth}
                onChange={(e) => set("billingDateOfYearMonth", e.target.value)}
                className={`w-14 ${inputClass("billingDateOfYearMonth")}`}
              />
              <span className="text-xs text-gray-400">월</span>
              <input
                type="number" min="1" max="31" placeholder="일"
                value={form.billingDateOfYearDay}
                onChange={(e) => set("billingDateOfYearDay", e.target.value)}
                className={`w-14 ${inputClass("billingDateOfYearDay")}`}
              />
              <span className="text-xs text-gray-400">일</span>
            </div>
          )}
        </div>
        {(errors.billingDayOfMonth || errors.billingDayOfWeek || errors.billingDateOfYearMonth || errors.billingDateOfYearDay) && (
          <p className="mt-1 text-xs text-red-500">
            {errors.billingDayOfMonth ?? errors.billingDayOfWeek ?? errors.billingDateOfYearMonth ?? errors.billingDateOfYearDay}
          </p>
        )}
      </div>

      <div>
        <label className="mb-1 block text-xs font-medium text-gray-600 dark:text-gray-400">
          시작일
        </label>
        <input
          type="date" value={form.startDate}
          onChange={(e) => set("startDate", e.target.value)}
          className={inputClass("startDate")}
        />
      </div>

      <div>
        <label className="mb-1 block text-xs font-medium text-gray-600 dark:text-gray-400">
          갱신 알림
        </label>
        <Select
          value={form.notifyDaysBefore}
          onChange={(v) => {
            setForm((prev) => ({ ...prev, notifyDaysBefore: v ?? "0", customNotifyDaysInput: "" }));
            setErrors((prev) => ({ ...prev, notifyDaysBefore: undefined, customNotifyDaysInput: undefined }));
          }}
          placeholder="알림 설정"
          options={NOTIFY_OPTIONS.map(({ value, label }) => ({ value, label }))}
        />
        {errors.customNotifyDaysInput && (
          <p className="mt-1 text-xs text-red-500">{errors.customNotifyDaysInput}</p>
        )}
      </div>
    </div>
  );

  return (
    <>
      {/* 딤 오버레이 */}
      <div
        className={`fixed inset-0 z-30 bg-black/30 transition-opacity ${
          open ? "opacity-100 duration-300" : "pointer-events-none opacity-0 duration-200"
        }`}
        onClick={handleClose}
      />

      {/* 사이드 패널 */}
      <div
        className={`fixed right-0 top-0 z-40 flex h-full w-full flex-col bg-white shadow-2xl transition-transform dark:bg-gray-900 sm:w-[420px] ${
          open ? "translate-x-0 duration-300 ease-out" : "translate-x-full duration-200 ease-in"
        }`}
      >
        {/* 헤더 */}
        <div className="flex shrink-0 items-center justify-between border-b border-gray-100 px-5 py-4 dark:border-gray-800">
          <h2 className="text-base font-semibold text-gray-900 dark:text-white">
            {isEdit ? "구독 수정" : "새 구독 추가"}
          </h2>
          <Button variant="ghost" size="icon" onClick={handleClose}>
            <X className="h-5 w-5" />
          </Button>
        </div>

        {/* 폼 */}
        <div className="flex-1 overflow-y-auto px-5 py-5">
          <div className="flex flex-col gap-5">

            {/* ── 모드 탭 (수정 시 숨김) ── */}
            {!isEdit && (
              <div className="flex gap-1 rounded-lg bg-gray-100 p-1 dark:bg-gray-800">
                {(["INDIVIDUAL", "BUNDLE"] as const).map((m) => (
                  <button
                    key={m}
                    onClick={() => switchMode(m)}
                    className={`flex flex-1 items-center justify-center gap-1.5 rounded-md py-1.5 text-sm font-medium transition-colors ${
                      mode === m
                        ? "bg-white text-gray-900 shadow-sm dark:bg-gray-700 dark:text-white"
                        : "text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
                    }`}
                  >
                    {m === "INDIVIDUAL"
                      ? <><User className="h-3.5 w-3.5" /> 개별 구독</>
                      : <><Package className="h-3.5 w-3.5" /> 번들 구독</>
                    }
                  </button>
                ))}
              </div>
            )}

            {/* ══════════════ 개별 구독 폼 ══════════════ */}
            {mode === "INDIVIDUAL" && (
              <>
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

                <div>
                  <label className="mb-1 block text-xs font-medium text-gray-600 dark:text-gray-400">
                    금액 <span className="text-red-400">*</span>
                  </label>
                  <div className="flex gap-2">
                    <input
                      type="number" min="0" placeholder="0"
                      value={form.amount}
                      onChange={(e) => set("amount", e.target.value)}
                      className={`flex-1 ${inputClass("amount")}`}
                    />
                    <div className="w-24">
                      <Select
                        value={form.currency}
                        onChange={(v) => set("currency", v as FormState["currency"])}
                        placeholder="통화"
                        options={CURRENCIES.map((c) => ({ value: c, label: c }))}
                      />
                    </div>
                  </div>
                  {errors.amount && <p className="mt-1 text-xs text-red-500">{errors.amount}</p>}
                </div>

                {billingFields}
              </>
            )}

            {/* ══════════════ 번들 구독 폼 ══════════════ */}
            {mode === "BUNDLE" && (
              <>
                {/* 수정 모드: 번들명 read-only */}
                {isEdit ? (
                  <div className="rounded-lg border border-gray-200 bg-gray-50 px-4 py-3 dark:border-gray-700 dark:bg-gray-800">
                    <p className="text-xs text-gray-500 dark:text-gray-400">번들 상품</p>
                    <p className="mt-0.5 text-sm font-medium text-gray-800 dark:text-gray-200">
                      {form.serviceName}
                    </p>
                  </div>
                ) : selectedBundle ? (
                  /* ── 번들 선택 완료 상태 ── */
                  <>
                    <div className="rounded-xl border border-violet-200 bg-violet-50 p-4 dark:border-violet-800 dark:bg-violet-950">
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex-1">
                          <div className="flex items-center gap-2">
                            <CheckCircle className="h-4 w-4 text-violet-600 dark:text-violet-400" />
                            <span className="text-sm font-semibold text-violet-900 dark:text-violet-100">
                              {selectedBundle.planName}
                            </span>
                          </div>
                          <p className="mt-0.5 text-xs text-violet-600 dark:text-violet-400">
                            {selectedBundle.provider} · {selectedBundle.basePrice.toLocaleString()}원/월
                          </p>
                          {(selectedBundle.includes?.length ?? 0) > 0 && (
                            <div className="mt-2 flex flex-wrap gap-1">
                              {selectedBundle.includes.map((s) => {
                                const { overlapping } = getBundleConflict(selectedBundle);
                                const isOverlap = overlapping
                                  .map((o) => o.toLowerCase())
                                  .includes(s.toLowerCase());
                                return (
                                  <span
                                    key={s}
                                    className={`rounded-full px-2 py-0.5 text-xs font-medium ${
                                      isOverlap
                                        ? "bg-amber-100 text-amber-700 dark:bg-amber-900 dark:text-amber-300"
                                        : "bg-violet-100 text-violet-700 dark:bg-violet-900 dark:text-violet-300"
                                    }`}
                                  >
                                    {isOverlap && "⚠ "}
                                    {s}
                                  </span>
                                );
                              })}
                            </div>
                          )}
                          {getBundleConflict(selectedBundle).overlapping.length > 0 && (
                            <p className="mt-2 text-xs text-amber-600 dark:text-amber-400">
                              ⚠ 개별 구독 중인 서비스와 중복됩니다. 등록은 가능하나 이중 결제가 발생할 수 있어요.
                            </p>
                          )}
                        </div>
                        <button
                          onClick={() => {
                            setSelectedBundle(null);
                            setForm((prev) => ({ ...prev, serviceName: "", amount: "" }));
                          }}
                          className="shrink-0 rounded-md p-1 text-violet-400 hover:text-violet-600 dark:hover:text-violet-200"
                        >
                          <X className="h-4 w-4" />
                        </button>
                      </div>
                    </div>

                    {/* 금액 */}
                    <div>
                      <div className="mb-1 flex items-center gap-1">
                        <label className="text-xs font-medium text-gray-600 dark:text-gray-400">
                          금액 <span className="text-red-400">*</span>
                        </label>
                        <div className="group relative">
                          <HelpCircle className="h-3.5 w-3.5 cursor-help text-gray-400 hover:text-violet-500 dark:text-gray-500 dark:hover:text-violet-400" />
                          <div className="pointer-events-none absolute left-0 top-5 z-10 w-60 rounded-lg border border-gray-200 bg-white p-3 text-xs text-gray-600 opacity-0 shadow-lg transition-opacity group-hover:opacity-100 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-300">
                            번들 상품의 기본 가격을 미리 채워드렸어요. 선택한 옵션에 따라 실제 결제 금액이 다를 수 있으니 확인 후 수정해주세요.
                            <div className="absolute -top-1.5 left-3 h-3 w-3 rotate-45 border-l border-t border-gray-200 bg-white dark:border-gray-700 dark:bg-gray-900" />
                          </div>
                        </div>
                      </div>
                      <div className="flex gap-2">
                        <input
                          type="number" min="0"
                          value={form.amount}
                          onChange={(e) => set("amount", e.target.value)}
                          className={`flex-1 ${inputClass("amount")}`}
                        />
                        <div className="w-24">
                          <Select
                            value={form.currency}
                            onChange={(v) => set("currency", v as FormState["currency"])}
                            placeholder="통화"
                            options={CURRENCIES.map((c) => ({ value: c, label: c }))}
                          />
                        </div>
                      </div>
                      {errors.amount && <p className="mt-1 text-xs text-red-500">{errors.amount}</p>}
                    </div>

                    {billingFields}
                  </>
                ) : (
                  /* ── 번들 선택 전: 통신사 필터 + 번들 목록 ── */
                  <>
                    {/* 안내 범례 */}
                    <div className="flex items-center gap-2 rounded-lg bg-gray-50 px-3 py-2 text-xs text-gray-500 dark:bg-gray-800 dark:text-gray-400">
                      <span className="inline-block rounded-full bg-amber-100 px-2 py-0.5 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400">서비스명</span>
                      개별 구독 중인 서비스와 중복됩니다
                    </div>

                    {/* 통신사 필터 칩 */}
                    <div>
                      <label className="mb-2 block text-xs font-medium text-gray-600 dark:text-gray-400">
                        통신사 · 플랫폼
                      </label>
                      <div className="flex flex-wrap gap-1.5">
                        {PROVIDERS.map(({ label, value }) => (
                          <button
                            key={label}
                            onClick={() => setSelectedProvider(value)}
                            className={`rounded-full border px-3 py-1 text-xs font-medium transition-colors ${
                              selectedProvider === value
                                ? "border-violet-500 bg-violet-50 text-violet-700 dark:bg-violet-950 dark:text-violet-300"
                                : "border-gray-200 text-gray-500 hover:border-violet-300 dark:border-gray-700 dark:text-gray-400 dark:hover:border-violet-700"
                            }`}
                          >
                            {label}
                          </button>
                        ))}
                      </div>
                    </div>

                    {/* 검색 */}
                    <div className="relative">
                      <input
                        type="text"
                        placeholder="서비스명 검색"
                        value={bundleSearch}
                        onChange={(e) => setBundleSearch(e.target.value)}
                        className="w-full rounded-lg border border-gray-200 py-2 pl-3 pr-8 text-sm outline-none transition-colors focus:ring-2 focus:ring-violet-500 dark:border-gray-700 dark:bg-gray-800 dark:text-white dark:placeholder:text-gray-500"
                      />
                      {bundleSearch && (
                        <button
                          onClick={() => setBundleSearch("")}
                          className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200"
                        >
                          <X className="h-3.5 w-3.5" />
                        </button>
                      )}
                    </div>

                    {/* 번들 카드 목록 */}
                    <div className="flex flex-col gap-2">
                      {bundlesLoading ? (
                        <div className="flex flex-col gap-2">
                          {[1, 2, 3].map((i) => (
                            <div key={i} className="h-20 animate-pulse rounded-xl bg-gray-100 dark:bg-gray-800" />
                          ))}
                        </div>
                      ) : bundles.length === 0 ? (
                        <p className="py-8 text-center text-sm text-gray-400">
                          등록된 번들 상품이 없습니다
                        </p>
                      ) : (
                        (() => {
                          const filtered = bundles.filter(
                            (b) =>
                              !bundleSearch.trim() ||
                              b.planName.toLowerCase().includes(bundleSearch.trim().toLowerCase())
                          );
                          if (filtered.length === 0) {
                            return (
                              <p className="py-8 text-center text-sm text-gray-400">
                                &apos;{bundleSearch}&apos;에 해당하는 번들이 없습니다
                              </p>
                            );
                          }
                          return filtered.map((bundle) => {
                            const { isDuplicate, overlapping } = getBundleConflict(bundle);
                            return (
                              <BundleCard
                                key={bundle.id}
                                bundle={bundle}
                                isDuplicate={isDuplicate}
                                overlapping={overlapping}
                                tooltipOpen={tooltipBundle === bundle.id}
                                onTooltipToggle={(id) =>
                                  setTooltipBundle((prev) => (prev === id ? null : id))
                                }
                                onSelect={handleSelectBundle}
                              />
                            );
                          });
                        })()
                      )}
                    </div>
                  </>
                )}
              </>
            )}
          </div>
        </div>

        {/* 하단 버튼 */}
        <div className="flex shrink-0 justify-end gap-2 border-t border-gray-100 px-5 py-4 dark:border-gray-800">
          <Button variant="ghost" onClick={handleClose}>취소</Button>
          {(mode === "INDIVIDUAL" || isEdit || selectedBundle) && (
            <Button variant="primary" onClick={handleSubmit} disabled={isPending}>
              {isPending ? "저장 중..." : isEdit ? "수정" : "추가하기"}
            </Button>
          )}
        </div>
      </div>
    </>
  );
}

// ── 번들 카드 서브 컴포넌트 ────────────────────────────────────────────────
interface BundleCardProps {
  bundle: BundleItem;
  isDuplicate: boolean;
  overlapping: string[];
  tooltipOpen: boolean;
  onTooltipToggle: (id: string) => void;
  onSelect: (bundle: BundleItem) => void;
}

function BundleCard({
  bundle, isDuplicate, overlapping, tooltipOpen, onTooltipToggle, onSelect,
}: BundleCardProps) {
  const hasOverlap = overlapping.length > 0;

  return (
    <div
      className={`relative rounded-xl border p-4 transition-colors ${
        isDuplicate
          ? "cursor-not-allowed border-gray-100 bg-gray-50 opacity-60 dark:border-gray-800 dark:bg-gray-800/50"
          : "cursor-pointer border-gray-200 hover:border-violet-300 hover:bg-violet-50/40 dark:border-gray-700 dark:hover:border-violet-700 dark:hover:bg-violet-950/20"
      }`}
      onClick={() => !isDuplicate && onSelect(bundle)}
    >
      {/* 이미 등록됨 배지 */}
      {isDuplicate && (
        <span className="absolute right-3 top-3 rounded-full bg-gray-200 px-2 py-0.5 text-xs font-medium text-gray-500 dark:bg-gray-700 dark:text-gray-400">
          이미 등록됨
        </span>
      )}

      <div className="flex items-start justify-between gap-2">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <span className="text-sm font-semibold text-gray-900 dark:text-white truncate">
              {bundle.planName}
            </span>
          </div>
          <p className="mt-0.5 text-xs text-gray-400">
            {bundle.provider} · {bundle.basePrice.toLocaleString()}원/월
          </p>

          {/* 포함 서비스 태그 */}
          {(bundle.includes?.length ?? 0) > 0 && (
            <div className="mt-2 flex flex-wrap gap-1">
              {bundle.includes.map((s) => {
                const isOverlap = overlapping
                  .map((o) => o.toLowerCase())
                  .includes(s.toLowerCase());
                return (
                  <span
                    key={s}
                    className={`rounded-full px-2 py-0.5 text-xs ${
                      isOverlap
                        ? "bg-amber-50 text-amber-600 dark:bg-amber-900/30 dark:text-amber-400"
                        : "bg-gray-100 text-gray-500 dark:bg-gray-800 dark:text-gray-400"
                    }`}
                  >
                    {s}
                  </span>
                );
              })}
            </div>
          )}
        </div>

        {/* 중복 경고 아이콘 + 툴팁 */}
        {hasOverlap && !isDuplicate && (
          <div className="relative shrink-0">
            <button
              onClick={(e) => {
                e.stopPropagation();
                onTooltipToggle(bundle.id);
              }}
              className="rounded-full p-1 text-amber-500 hover:bg-amber-50 dark:hover:bg-amber-900/30"
              title="중복 안내"
            >
              <AlertTriangle className="h-4 w-4" />
            </button>
            {tooltipOpen && (
              <div className="absolute right-0 top-7 z-10 w-56 rounded-lg border border-amber-200 bg-white p-3 shadow-lg dark:border-amber-800 dark:bg-gray-900">
                <p className="mb-1 text-xs font-medium text-amber-700 dark:text-amber-400">
                  개별 구독과 중복
                </p>
                <ul className="space-y-0.5">
                  {overlapping.map((name) => (
                    <li key={name} className="text-xs text-gray-600 dark:text-gray-400">
                      · {name}
                    </li>
                  ))}
                </ul>
                <p className="mt-2 text-xs text-gray-400">
                  등록은 가능하나 이중 결제가 발생할 수 있어요.
                </p>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
