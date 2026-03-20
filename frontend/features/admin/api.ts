import api from '@/lib/axios';
import type {
  AdminServiceCategory,
  AdminServiceCategoryRequest,
  AdminSubscriptionService,
  AdminSubscriptionServiceRequest,
} from './types';

// 카테고리
export const getAdminCategories = async (): Promise<AdminServiceCategory[]> => {
  const res = await api.get('/api/admin/service-categories');
  return res.data.data;
};

export const createAdminCategory = async (
  req: AdminServiceCategoryRequest,
): Promise<AdminServiceCategory> => {
  const res = await api.post('/api/admin/service-categories', req);
  return res.data.data;
};

export const updateAdminCategory = async (
  id: string,
  req: AdminServiceCategoryRequest,
): Promise<AdminServiceCategory> => {
  const res = await api.put(`/api/admin/service-categories/${id}`, req);
  return res.data.data;
};

export const deleteAdminCategory = async (id: string): Promise<void> => {
  await api.delete(`/api/admin/service-categories/${id}`);
};

// 서비스
export const getAdminServices = async (): Promise<AdminSubscriptionService[]> => {
  const res = await api.get('/api/admin/subscription-services');
  return res.data.data;
};

export const createAdminService = async (
  req: AdminSubscriptionServiceRequest,
): Promise<AdminSubscriptionService> => {
  const res = await api.post('/api/admin/subscription-services', req);
  return res.data.data;
};

export const updateAdminService = async (
  id: string,
  req: AdminSubscriptionServiceRequest,
): Promise<AdminSubscriptionService> => {
  const res = await api.put(`/api/admin/subscription-services/${id}`, req);
  return res.data.data;
};

export const deleteAdminService = async (id: string): Promise<void> => {
  await api.delete(`/api/admin/subscription-services/${id}`);
};
