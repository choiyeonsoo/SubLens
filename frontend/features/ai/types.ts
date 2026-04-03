export interface CurrentSubscription {
  name: string;
  price: number;
  replaced: boolean;
}

export interface RecommendedBundle {
  name: string;
  provider: string;
  price: number;
  saves: number;
  includes: string[];
  replaces: string[];
  telecom_exclusive: string | null;
  cautions: string[];
}

export interface KeepSubscription {
  name: string;
  price: number;
}

export interface OptimizeData {
  view_type: "optimize";
  current_total: number;
  optimized_total: number;
  savings: number;
  current_subscriptions: CurrentSubscription[];
  recommended_bundles: RecommendedBundle[];
  keep_subscriptions: KeepSubscription[];
  cautions: string[];
}

export interface CompareOption {
  name: string;
  provider: string;
  price: number;
  pros: string[];
  cons: string[];
  recommended: boolean;
}

export interface CompareData {
  view_type: "compare";
  options: CompareOption[];
  summary: string;
}

export interface SimpleData {
  view_type: "simple";
  answer: string;
  supporting_data: string | null;
}

export type AiResponse = OptimizeData | CompareData | SimpleData;

// ── Type 1 ──────────────────────────────────────────────────────────────────

export interface Subscription {
  name: string;
  price: number;
  billing_cycle: string;
  next_billing_date: string;
  status: string;
}

export interface StatusData {
  view_type: "status";
  total_monthly_cost: number;
  subscription_count: number;
  active_subscriptions: Subscription[];
  answer: string;
}

export interface TotalData {
  view_type: "total";
  amount: number;
  period: string;
  breakdown: { name: string; price: number }[];
  answer: string;
}

export interface ForecastData {
  view_type: "forecast";
  monthly_average: number;
  annual_estimate: number;
  based_on_count: number;
  answer: string;
}

export interface SingleData {
  view_type: "single";
  answer: string;
}

export type Type1Data = StatusData | TotalData | ForecastData | SingleData;

export interface Type1ApiResponse {
  type: "type_1";
  data: Type1Data;
}

export type AiApiResponse = AiResponse | Type1ApiResponse;
