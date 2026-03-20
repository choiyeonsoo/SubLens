package com.sublens.backend.admin.service;

import java.util.List;
import java.util.UUID;

import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import com.sublens.backend.admin.dto.ServiceCategoryRequest;
import com.sublens.backend.admin.dto.ServiceCategoryResponse;
import com.sublens.backend.admin.dto.SubscriptionServiceRequest;
import com.sublens.backend.admin.dto.SubscriptionServiceResponse;
import com.sublens.backend.global.exception.BusinessException;
import com.sublens.backend.global.exception.ErrorCode;
import com.sublens.backend.subscription.ServiceCatalog;
import com.sublens.backend.subscription.ServiceCategory;
import com.sublens.backend.subscription.repository.ServiceCatalogRepository;
import com.sublens.backend.subscription.repository.ServiceCategoryRepository;

import lombok.RequiredArgsConstructor;

@Service
@RequiredArgsConstructor
@Transactional
public class AdminService {

    private final ServiceCategoryRepository categoryRepository;
    private final ServiceCatalogRepository catalogRepository;
    private final LogoDomainValidator logoDomainValidator;

    // ── 카테고리 ──────────────────────────────────────────────

    @Transactional(readOnly = true)
    public List<ServiceCategoryResponse> listCategories() {
        return categoryRepository.findAllByOrderByDisplayOrderAsc()
                .stream()
                .map(ServiceCategoryResponse::from)
                .toList();
    }

    public ServiceCategoryResponse createCategory(ServiceCategoryRequest req) {
        ServiceCategory category = ServiceCategory.builder()
                .name(req.getName())
                .displayOrder(req.getDisplayOrder())
                .build();
        return ServiceCategoryResponse.from(categoryRepository.save(category));
    }

    public ServiceCategoryResponse updateCategory(UUID id, ServiceCategoryRequest req) {
        ServiceCategory category = categoryRepository.findById(id)
                .orElseThrow(() -> new BusinessException(ErrorCode.SERVICE_CATEGORY_NOT_FOUND));
        category.setName(req.getName());
        category.setDisplayOrder(req.getDisplayOrder());
        return ServiceCategoryResponse.from(category);
    }

    public void deleteCategory(UUID id) {
        ServiceCategory category = categoryRepository.findById(id)
                .orElseThrow(() -> new BusinessException(ErrorCode.SERVICE_CATEGORY_NOT_FOUND));
        boolean inUse = catalogRepository.existsByCategoryId(id);
        if (inUse) {
            throw new BusinessException(ErrorCode.SERVICE_CATEGORY_IN_USE);
        }
        categoryRepository.delete(category);
    }

    // ── 서비스 ────────────────────────────────────────────────

    @Transactional(readOnly = true)
    public List<SubscriptionServiceResponse> listServices() {
        return catalogRepository.findAllOrderedForAdmin()
                .stream()
                .map(SubscriptionServiceResponse::from)
                .toList();
    }

    public SubscriptionServiceResponse createService(SubscriptionServiceRequest req) {
        ServiceCategory category = categoryRepository.findById(UUID.fromString(req.getCategoryId()))
                .orElseThrow(() -> new BusinessException(ErrorCode.SERVICE_CATEGORY_NOT_FOUND));
        String validatedDomain = logoDomainValidator.resolve(req.getLogoDomain());
        ServiceCatalog service = ServiceCatalog.builder()
                .name(req.getName())
                .logoDomain(validatedDomain)
                .websiteUrl(req.getWebsiteUrl())
                .category(category)
                .displayOrder(req.getDisplayOrder())
                .isActive(req.getIsActive())
                .build();
        return SubscriptionServiceResponse.from(catalogRepository.save(service));
    }

    public SubscriptionServiceResponse updateService(UUID id, SubscriptionServiceRequest req) {
        ServiceCatalog service = catalogRepository.findById(id)
                .orElseThrow(() -> new BusinessException(ErrorCode.SUBSCRIPTION_SERVICE_NOT_FOUND));
        ServiceCategory category = categoryRepository.findById(UUID.fromString(req.getCategoryId()))
                .orElseThrow(() -> new BusinessException(ErrorCode.SERVICE_CATEGORY_NOT_FOUND));
        String validatedDomain = logoDomainValidator.resolve(req.getLogoDomain());
        service.setName(req.getName());
        service.setLogoDomain(validatedDomain);
        service.setWebsiteUrl(req.getWebsiteUrl());
        service.setCategory(category);
        service.setDisplayOrder(req.getDisplayOrder());
        service.setActive(req.getIsActive());
        return SubscriptionServiceResponse.from(service);
    }

    public void deleteService(UUID id) {
        ServiceCatalog service = catalogRepository.findById(id)
                .orElseThrow(() -> new BusinessException(ErrorCode.SUBSCRIPTION_SERVICE_NOT_FOUND));
        catalogRepository.delete(service);
    }
}
