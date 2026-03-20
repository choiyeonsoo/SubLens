export interface AdminServiceCategory {
  id: string;
  name: string;
  displayOrder: number;
}

export interface AdminServiceCategoryRequest {
  name: string;
  displayOrder: number;
}

export interface AdminSubscriptionService {
  id: string;
  name: string;
  logoDomain: string;
  websiteUrl?: string;
  displayOrder: number;
  isActive: boolean;
  category: AdminServiceCategory;
}

export interface AdminSubscriptionServiceRequest {
  name: string;
  logoDomain: string;
  websiteUrl?: string;
  categoryId: string;
  displayOrder: number;
  isActive: boolean;
}
