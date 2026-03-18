import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  createSubscription,
  deleteSubscription,
  getCategories,
  getSubscriptions,
  updateSubscription,
  updateSubscriptionStatus,
} from './api';
import type { SubscriptionCreateRequest, SubscriptionListRequest, SubscriptionUpdateRequest } from './types';

export const useSubscriptions = (req: SubscriptionListRequest) => {
  return useQuery({
    queryKey: ['subscriptions', req],
    queryFn: () => getSubscriptions(req),
  });
};

export const useCreateSubscription = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (req: SubscriptionCreateRequest) => createSubscription(req),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['subscriptions'] });
    },
    onError: (error) => {
      console.error('구독 생성 실패:', error);
    },
  });
};

export const useUpdateSubscription = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (req: SubscriptionUpdateRequest) => updateSubscription(req),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['subscriptions'] });
    },
    onError: (error) => {
      console.error('구독 수정 실패:', error);
    },
  });
};

export const useUpdateSubscriptionStatus = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (req: { id: string; status: string }) => updateSubscriptionStatus(req),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['subscriptions'] });
    },
    onError: (error) => {
      console.error('구독 상태 변경 실패:', error);
    },
  });
};

export const useDeleteSubscription = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => deleteSubscription(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['subscriptions'] });
    },
    onError: (error) => {
      console.error('구독 삭제 실패:', error);
    },
  });
};

export const useCategories = () => {
  return useQuery({
    queryKey: ['categories'],
    queryFn: getCategories,
  });
};
