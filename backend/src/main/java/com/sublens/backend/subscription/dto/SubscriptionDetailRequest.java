package com.sublens.backend.subscription.dto;

import java.util.UUID;

import jakarta.validation.constraints.NotNull;
import lombok.Getter;
import lombok.Setter;

@Getter
@Setter
public class SubscriptionDetailRequest {

    @NotNull(message = "id는 필수입니다.")
    private UUID id;
}
