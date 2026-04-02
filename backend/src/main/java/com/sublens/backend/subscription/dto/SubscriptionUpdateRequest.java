package com.sublens.backend.subscription.dto;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.UUID;

import com.sublens.backend.subscription.enums.BillingCycle;
import com.sublens.backend.subscription.enums.Currency;

import jakarta.validation.constraints.DecimalMin;
import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Pattern;
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

    private UUID serviceId;

    private String description;

    private UUID categoryId;

    @NotNull(message = "금액은 필수입니다.")
    @DecimalMin(value = "0", message = "금액은 0 이상이어야 합니다.")
    private BigDecimal amount;

    private Currency currency = Currency.KRW;

    private BillingCycle billingCycle = BillingCycle.MONTHLY;

    private LocalDate startDate;

    // MONTHLY 전용 (1~31)
    @Min(value = 1, message = "날짜는 최소 1일입니다.")
    @Max(value = 31, message = "날짜는 최대 31일입니다.")
    private Integer billingDayOfMonth;

    // WEEKLY 전용 (1=월 ~ 7=일)
    @Min(value = 1, message = "요일은 1(월) ~ 7(일) 사이여야 합니다.")
    @Max(value = 7, message = "요일은 1(월) ~ 7(일) 사이여야 합니다.")
    private Integer billingDayOfWeek;

    // YEARLY 전용 ("MMDD" 형식, 예: "0319")
    @Pattern(regexp = "^(0[1-9]|1[0-2])(0[1-9]|[12][0-9]|3[01])$",
             message = "연간 청구일은 MMDD 형식이어야 합니다. (예: 0319)")
    private String billingDateOfYear;

    private boolean notifyBefore = true;

    @Min(value = 1, message = "알림 일수는 최소 1일입니다.")
    @Max(value = 30, message = "알림 일수는 최대 30일입니다.")
    private int notifyDaysBefore = 3;
}
