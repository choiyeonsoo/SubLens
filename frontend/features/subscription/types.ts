export interface SubscriptionListRequest {
  status?: "ACTIVE" | "PAUSED" | "CANCELLED" | "ALL";
  categoryId?: string;
  sort?: "next_billing_date" | "amount" | "created_at";
}

export interface SubscriptionCreateRequest {
  serviceName: string;
  description?: string;
  categoryId?: string;
  amount: number;
  currency: "KRW" | "USD" | "EUR" | "JPY" | "GBP";
  billingCycle: "WEEKLY" | "MONTHLY" | "YEARLY";
  startDate?: string;
  // 청구 기준일 (billingCycle에 따라 하나만 전송)
  billingDayOfMonth?: number;  // MONTHLY 전용 (1~31)
  billingDayOfWeek?: number;   // WEEKLY 전용 (1=월 ~ 7=일)
  billingDateOfYear?: string;  // YEARLY 전용 ("MMDD", 예: "0319")
  notifyBefore?: boolean;
  notifyDaysBefore?: number;
  // 번들 구독
  isBundle?: boolean;
  bundleId?: string;
}

export interface SubscriptionUpdateRequest extends SubscriptionCreateRequest {
  id: string;
}

export interface SubscriptionResponse {
  id: string;
  serviceName: string;
  description?: string;
  amount: number;
  currency: string;
  billingCycle: string;
  nextBillingDate: string;
  startDate: string;
  status: "ACTIVE" | "PAUSED" | "CANCELLED";
  notifyBefore: boolean;
  notifyDaysBefore: number;
  billingDayOfMonth?: number;
  billingDayOfWeek?: number;
  billingDateOfYear?: string;
  isBundle: boolean;
  bundleId?: string;
  category?: {
    id: string;
    name: string;
    icon: string;
    color: string;
  };
}

export interface BundleItem {
  id: string;
  provider: string;
  planName: string;
  basePrice: number;
  includes: string[];
}

export interface CategoryResponse {
  id: string;
  name: string;
  icon: string;
  color: string;
  isDefault: boolean;
}

export interface SubscriptionServiceItem {
  id: string;
  name: string;
  category: string;
  logoDomain: string;
  logoUrl: string;
  websiteUrl?: string;
}
