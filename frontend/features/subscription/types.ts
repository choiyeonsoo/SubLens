export interface SubscriptionListRequest {
  status?: "ACTIVE" | "PAUSED" | "CANCELLED" | "ALL";
  categoryId?: string;
  sort?: "next_billing_date" | "amount" | "created_at";
}

export interface SubscriptionCreateRequest {
  serviceName: string;
  description?: string;
  categoryId?: string;
  logoUrl?: string;
  color?: string;
  amount: number;
  currency: "KRW" | "USD" | "EUR" | "JPY" | "GBP";
  billingCycle: "WEEKLY" | "MONTHLY" | "YEARLY";
  startDate?: string;
  nextBillingDate: string;
  notifyBefore?: boolean;
  notifyDaysBefore?: number;
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
  category?: {
    id: string;
    name: string;
    icon: string;
    color: string;
  };
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
  logoUrl: string;
}
