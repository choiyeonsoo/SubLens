package com.pkms.backend.subscription.dto;

import java.math.BigDecimal;
import java.util.List;

import lombok.AllArgsConstructor;
import lombok.Getter;

@Getter
@AllArgsConstructor
public class SubscriptionSummaryResponse {

    private BigDecimal totalMonthly;
    private BigDecimal totalYearly;
    private long activeCount;
    private List<String> currencies;
    private List<CategorySummary> byCategory;

    @Getter
    @AllArgsConstructor
    public static class CategorySummary {
        private String category;
        private BigDecimal amount;
        private long count;
    }
}
