package com.pkms.backend.subscription.dto;

import java.util.UUID;

import com.pkms.backend.subscription.enums.SubscriptionStatus;

import jakarta.validation.constraints.NotNull;
import lombok.Getter;
import lombok.Setter;

@Getter
@Setter
public class SubscriptionStatusRequest {

    @NotNull(message = "id는 필수입니다.")
    private UUID id;

    @NotNull(message = "status는 필수입니다.")
    private SubscriptionStatus status;
}
