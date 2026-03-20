package com.sublens.backend.subscription.dto;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.UUID;

import com.sublens.backend.category.dto.CategoryResponse;
import com.sublens.backend.subscription.Subscription;
import com.sublens.backend.subscription.enums.BillingCycle;
import com.sublens.backend.subscription.enums.Currency;
import com.sublens.backend.subscription.enums.SubscriptionStatus;

import lombok.AllArgsConstructor;
import lombok.Getter;

@Getter
@AllArgsConstructor
public class SubscriptionResponse {

    private UUID id;
    private UUID userId;
    private CategoryResponse category;
    private String serviceName;
    private String description;
    private BigDecimal amount;
    private Currency currency;
    private BillingCycle billingCycle;
    private LocalDate startDate;
    private LocalDate nextBillingDate;
    private SubscriptionStatus status;
    private boolean notifyBefore;
    private int notifyDaysBefore;
    private Integer billingDayOfMonth;
    private Integer billingDayOfWeek;
    private String billingDateOfYear;
    private LocalDateTime createdAt;
    private LocalDateTime updatedAt;

    public static SubscriptionResponse from(Subscription s) {
        return new SubscriptionResponse(
                s.getId(),
                s.getUserId(),
                s.getCategory() != null ? CategoryResponse.from(s.getCategory()) : null,
                s.getServiceName(),
                s.getDescription(),
                s.getAmount(),
                s.getCurrency(),
                s.getBillingCycle(),
                s.getStartDate(),
                s.getNextBillingDate(),
                s.getStatus(),
                s.isNotifyBefore(),
                s.getNotifyDaysBefore(),
                s.getBillingDayOfMonth(),
                s.getBillingDayOfWeek(),
                s.getBillingDateOfYear(),
                s.getCreatedAt(),
                s.getUpdatedAt());
    }
}
