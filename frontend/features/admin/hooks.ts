import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import {
  createAdminCategory,
  createAdminService,
  deleteAdminCategory,
  deleteAdminService,
  getAdminCategories,
  getAdminServices,
  updateAdminCategory,
  updateAdminService,
} from './api';
import type { AdminServiceCategoryRequest, AdminSubscriptionServiceRequest } from './types';

// ── 카테고리 ──────────────────────────────────────────────────

export const useAdminCategories = () =>
  useQuery({ queryKey: ['admin', 'categories'], queryFn: getAdminCategories });

export const useCreateAdminCategory = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (req: AdminServiceCategoryRequest) => createAdminCategory(req),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['admin', 'categories'] });
      toast.success('카테고리가 추가되었습니다.');
    },
    onError: () => toast.error('카테고리 추가에 실패했습니다.'),
  });
};

export const useUpdateAdminCategory = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, req }: { id: string; req: AdminServiceCategoryRequest }) =>
      updateAdminCategory(id, req),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['admin', 'categories'] });
      toast.success('카테고리가 수정되었습니다.');
    },
    onError: () => toast.error('카테고리 수정에 실패했습니다.'),
  });
};

export const useDeleteAdminCategory = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => deleteAdminCategory(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['admin', 'categories'] });
      toast.success('카테고리가 삭제되었습니다.');
    },
    onError: (err: { response?: { data?: { message?: string } } }) => {
      const msg = err?.response?.data?.message ?? '카테고리 삭제에 실패했습니다.';
      toast.error(msg);
    },
  });
};

// ── 서비스 ────────────────────────────────────────────────────

export const useAdminServices = () =>
  useQuery({ queryKey: ['admin', 'services'], queryFn: getAdminServices });

export const useCreateAdminService = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (req: AdminSubscriptionServiceRequest) => createAdminService(req),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['admin', 'services'] });
      toast.success('서비스가 추가되었습니다.');
    },
    onError: () => toast.error('서비스 추가에 실패했습니다.'),
  });
};

export const useUpdateAdminService = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, req }: { id: string; req: AdminSubscriptionServiceRequest }) =>
      updateAdminService(id, req),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['admin', 'services'] });
      toast.success('서비스가 수정되었습니다.');
    },
    onError: () => toast.error('서비스 수정에 실패했습니다.'),
  });
};

export const useDeleteAdminService = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => deleteAdminService(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['admin', 'services'] });
      toast.success('서비스가 삭제되었습니다.');
    },
    onError: () => toast.error('서비스 삭제에 실패했습니다.'),
  });
};
