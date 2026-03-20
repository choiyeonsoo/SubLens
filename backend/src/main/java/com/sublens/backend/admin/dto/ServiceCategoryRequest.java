package com.sublens.backend.admin.dto;

import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import lombok.Getter;

@Getter
public class ServiceCategoryRequest {

    @NotBlank(message = "카테고리 이름은 필수입니다.")
    private String name;

    @NotNull(message = "정렬 순서는 필수입니다.")
    @Min(value = 0, message = "정렬 순서는 0 이상이어야 합니다.")
    private Integer displayOrder;
}
