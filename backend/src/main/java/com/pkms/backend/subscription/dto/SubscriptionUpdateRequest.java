package com.pkms.backend.subscription.dto;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.UUID;

import com.pkms.backend.subscription.enums.BillingCycle;
import com.pkms.backend.subscription.enums.Currency;

import jakarta.validation.constraints.DecimalMin;
import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;
import lombok.Getter;
import lombok.Setter;

@Getter
@Setter
public class SubscriptionUpdateRequest {

    @NotNull(message = "id는 필수입니다.")
    private UUID id;

    @NotBlank(message = "서비스명은 필수입니다.")
    @Size(max = 100, message = "서비스명은 100자 이하여야 합니다.")
    private String serviceName;

    private String description;

    private UUID categoryId;

    private String logoUrl;

    private String color;

    @NotNull(message = "금액은 필수입니다.")
    @DecimalMin(value = "0", message = "금액은 0 이상이어야 합니다.")
    private BigDecimal amount;

    private Currency currency = Currency.KRW;

    private BillingCycle billingCycle = BillingCycle.MONTHLY;

    private LocalDate startDate;

    @NotNull(message = "다음 청구일은 필수입니다.")
    private LocalDate nextBillingDate;

    private boolean notifyBefore = true;

    @Min(value = 1, message = "알림 일수는 최소 1일입니다.")
    @Max(value = 30, message = "알림 일수는 최대 30일입니다.")
    private int notifyDaysBefore = 3;
}
