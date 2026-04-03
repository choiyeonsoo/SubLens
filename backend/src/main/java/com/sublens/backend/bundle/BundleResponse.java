package com.sublens.backend.bundle;

import java.util.UUID;

import lombok.Getter;
import lombok.RequiredArgsConstructor;

@Getter
@RequiredArgsConstructor
public class BundleResponse {

    private final UUID id;
    private final String provider;
    private final String planName;
    private final int basePrice;
    private final String[] includes;

    public static BundleResponse from(BundleCatalog b) {
        return new BundleResponse(
                b.getId(),
                b.getProvider(),
                b.getPlanName(),
                b.getBasePrice(),
                b.getIncludes());
    }
}
