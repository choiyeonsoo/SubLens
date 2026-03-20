package com.sublens.backend.admin.dto;

import com.sublens.backend.subscription.ServiceCategory;
import lombok.Getter;

@Getter
public class ServiceCategoryResponse {

    private final String id;
    private final String name;
    private final int displayOrder;

    private ServiceCategoryResponse(ServiceCategory category) {
        this.id = category.getId().toString();
        this.name = category.getName();
        this.displayOrder = category.getDisplayOrder();
    }

    public static ServiceCategoryResponse from(ServiceCategory category) {
        return new ServiceCategoryResponse(category);
    }
}
