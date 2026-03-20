package com.sublens.backend.admin.dto;

import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import lombok.Getter;

@Getter
public class SubscriptionServiceRequest {

    @NotBlank(message = "서비스 이름은 필수입니다.")
    private String name;

    private String logoDomain;

    private String websiteUrl;

    @NotBlank(message = "카테고리는 필수입니다.")
    private String categoryId;

    @NotNull(message = "정렬 순서는 필수입니다.")
    @Min(value = 0, message = "정렬 순서는 0 이상이어야 합니다.")
    private Integer displayOrder;

    @NotNull(message = "활성 여부는 필수입니다.")
    private Boolean isActive;
}
