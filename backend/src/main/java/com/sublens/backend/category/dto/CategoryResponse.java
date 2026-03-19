package com.sublens.backend.category.dto;

import java.util.UUID;

import com.sublens.backend.category.SubscriptionCategory;

import lombok.AllArgsConstructor;
import lombok.Getter;

@Getter
@AllArgsConstructor
public class CategoryResponse {

    private UUID id;
    private String name;
    private String icon;
    private String color;
    private boolean isDefault;

    public static CategoryResponse from(SubscriptionCategory category) {
        return new CategoryResponse(
                category.getId(),
                category.getName(),
                category.getIcon(),
                category.getColor(),
                category.isDefault());
    }
}
