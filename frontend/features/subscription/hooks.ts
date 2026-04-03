import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  createSubscription,
  deleteSubscription,
  getBundles,
  getCategories,
  getSubscriptions,
  updateSubscription,
  updateSubscriptionStatus,
} from "./api";
import type {
  SubscriptionCreateRequest,
  SubscriptionListRequest,
  SubscriptionServiceItem,
  SubscriptionUpdateRequest,
} from "./types";
import api from "@/lib/axios";
import { ApiResponse } from "@/lib/type";

export const useSubscriptions = (req: SubscriptionListRequest) => {
  return useQuery({
    queryKey: ["subscriptions", req],
    queryFn: () => getSubscriptions(req),
  });
};

export const useCreateSubscription = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (req: SubscriptionCreateRequest) => createSubscription(req),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["subscriptions"] });
    },
    onError: (error) => {
      console.error("구독 생성 실패:", error);
    },
  });
};

export const useUpdateSubscription = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (req: SubscriptionUpdateRequest) => updateSubscription(req),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["subscriptions"] });
    },
    onError: (error) => {
      console.error("구독 수정 실패:", error);
    },
  });
};

export const useUpdateSubscriptionStatus = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (req: { id: string; status: string }) => updateSubscriptionStatus(req),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["subscriptions"] });
    },
    onError: (error) => {
      console.error("구독 상태 변경 실패:", error);
    },
  });
};

export const useDeleteSubscription = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => deleteSubscription(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["subscriptions"] });
    },
    onError: (error) => {
      console.error("구독 삭제 실패:", error);
    },
  });
};

export const useCategories = () => {
  return useQuery({
    queryKey: ["categories"],
    queryFn: getCategories,
  });
};

export function useBundles(provider: string) {
  return useQuery({
    queryKey: ["bundles", provider],
    queryFn: () => getBundles(provider),
    enabled: !!provider,
    staleTime: 1000 * 60 * 10, // 10분 캐시
  });
}

export function useSubscriptionServices() {
  return useQuery({
    queryKey: ["subscription-services"],
    queryFn: async () => {
      const res = await api.get<ApiResponse<SubscriptionServiceItem[]>>(
        "/api/subscription-services"
      );
      return res.data.data;
    },
    staleTime: 1000 * 60 * 60, // 1시간 캐시 — 자주 안 바뀌는 데이터
  });
}
