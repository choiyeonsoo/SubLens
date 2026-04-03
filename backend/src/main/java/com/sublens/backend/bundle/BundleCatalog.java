package com.sublens.backend.bundle;

import java.util.UUID;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import lombok.Getter;
import lombok.NoArgsConstructor;

@Entity
@Table(name = "bundle_catalog")
@Getter
@NoArgsConstructor
public class BundleCatalog {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;

    @Column(nullable = false, length = 100)
    private String provider;

    @Column(name = "plan_name", nullable = false, length = 100)
    private String planName;

    @Column(columnDefinition = "TEXT")
    private String description;

    @Column(name = "includes", columnDefinition = "text[]")
    private String[] includes;

    @Column(name = "base_price", nullable = false)
    private int basePrice;

    @Column(name = "original_price")
    private int originalPrice;

    @Column(name = "discount_rate")
    private int discountRate;

    @Column(name = "contract_months")
    private int contractMonths;

    @Column(name = "telecom_exclusive", length = 50)
    private String telecomExclusive;

    @Column(name = "has_options", nullable = false)
    private boolean hasOptions;

    @Column(name = "is_active", nullable = false)
    private boolean isActive;
}
