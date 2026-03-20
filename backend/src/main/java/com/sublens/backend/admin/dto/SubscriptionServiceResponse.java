package com.sublens.backend.admin.dto;

import com.fasterxml.jackson.annotation.JsonProperty;
import com.sublens.backend.subscription.ServiceCatalog;
import lombok.Getter;

@Getter
public class SubscriptionServiceResponse {

    private final String id;
    private final String name;
    private final String logoDomain;
    private final String websiteUrl;
    private final int displayOrder;
    @JsonProperty("isActive")
    private final boolean isActive;
    private final ServiceCategoryResponse category;

    private SubscriptionServiceResponse(ServiceCatalog service) {
        this.id = service.getId().toString();
        this.name = service.getName();
        this.logoDomain = service.getLogoDomain();
        this.websiteUrl = service.getWebsiteUrl();
        this.displayOrder = service.getDisplayOrder();
        this.isActive = service.isActive();
        this.category = ServiceCategoryResponse.from(service.getCategory());
    }

    public static SubscriptionServiceResponse from(ServiceCatalog service) {
        return new SubscriptionServiceResponse(service);
    }
}
