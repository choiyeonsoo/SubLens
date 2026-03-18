package com.pkms.backend.subscription.dto;

import java.util.UUID;

import lombok.Getter;
import lombok.Setter;

@Getter
@Setter
public class SubscriptionListRequest {

    /** ACTIVE | PAUSED | CANCELLED | ALL. null 또는 ALL이면 전체 조회 */
    private String status = "ACTIVE";

    private UUID categoryId;

    /** next_billing_date | amount | created_at */
    private String sort = "created_at";
}
