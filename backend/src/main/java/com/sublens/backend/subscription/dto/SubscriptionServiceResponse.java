package com.sublens.backend.subscription.dto;

import java.util.UUID;

import com.sublens.backend.subscription.ServiceCatalog;

public record SubscriptionServiceResponse(
    UUID   id,
    String name,
    String category,
    String logoUrl
) {
    public static SubscriptionServiceResponse from(ServiceCatalog s) {
        return new SubscriptionServiceResponse(
            s.getId(),
            s.getName(),
            s.getCategory().getName(),
            "https://www.google.com/s2/favicons?domain=" + s.getLogoDomain() + "&sz=64"
        );
    }
}
