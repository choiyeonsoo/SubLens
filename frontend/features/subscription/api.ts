import api from '@/lib/axios';
import type {
  CategoryResponse,
  SubscriptionCreateRequest,
  SubscriptionListRequest,
  SubscriptionResponse,
  SubscriptionUpdateRequest,
} from './types';

export const getSubscriptions = async (req: SubscriptionListRequest): Promise<SubscriptionResponse[]> => {
  const response = await api.post('/api/subscriptions/list', req);
  return response.data.data;
};

export const getSubscriptionDetail = async (req: { id: string }): Promise<SubscriptionResponse> => {
  const response = await api.post('/api/subscriptions/detail', req);
  return response.data.data;
};

export const createSubscription = async (req: SubscriptionCreateRequest): Promise<SubscriptionResponse> => {
  const response = await api.post('/api/subscriptions/create', req);
  return response.data.data;
};

export const updateSubscription = async (req: SubscriptionUpdateRequest): Promise<SubscriptionResponse> => {
  const response = await api.post('/api/subscriptions/update', req);
  return response.data.data;
};

export const updateSubscriptionStatus = async (req: { id: string; status: string }): Promise<SubscriptionResponse> => {
  const response = await api.post('/api/subscriptions/status', req);
  return response.data.data;
};

export const deleteSubscription = async (id: string): Promise<void> => {
  await api.delete(`/api/subscriptions/${id}`);
};

export const getCategories = async (): Promise<CategoryResponse[]> => {
  const response = await api.post('/api/categories/list');
  return response.data.data;
};
