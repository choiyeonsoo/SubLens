const CURRENCY_LOCALE: Record<string, { locale: string; currency: string }> = {
  KRW: { locale: "ko-KR", currency: "KRW" },
  USD: { locale: "en-US", currency: "USD" },
  EUR: { locale: "de-DE", currency: "EUR" },
  JPY: { locale: "ja-JP", currency: "JPY" },
  GBP: { locale: "en-GB", currency: "GBP" },
};

export function formatAmount(amount: number, currency: string): string {
  const config = CURRENCY_LOCALE[currency] ?? { locale: "ko-KR", currency };
  return new Intl.NumberFormat(config.locale, {
    style: "currency",
    currency: config.currency,
    maximumFractionDigits: currency === "KRW" || currency === "JPY" ? 0 : 2,
  }).format(amount);
}

export function toMonthlyAmount(amount: number, cycle: string): number {
  if (cycle === "YEARLY") return amount / 12;
  if (cycle === "WEEKLY") return amount * (52 / 12);
  return amount;
}
