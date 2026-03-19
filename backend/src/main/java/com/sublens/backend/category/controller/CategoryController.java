package com.sublens.backend.category.controller;

import java.util.List;
import java.util.Map;

import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import com.sublens.backend.category.dto.CategoryResponse;
import com.sublens.backend.category.repository.SubscriptionCategoryRepository;
import com.sublens.backend.global.exception.ApiResponse;

import lombok.RequiredArgsConstructor;

@RestController
@RequestMapping("/api/categories")
@RequiredArgsConstructor
public class CategoryController {

    private final SubscriptionCategoryRepository categoryRepository;

    @PostMapping("/list")
    public ResponseEntity<ApiResponse<List<CategoryResponse>>> list(
            @RequestBody(required = false) Map<String, Object> body) {

        List<CategoryResponse> result = categoryRepository.findAllByOrderByNameAsc()
                .stream()
                .map(CategoryResponse::from)
                .toList();

        return ResponseEntity.ok(ApiResponse.success(result));
    }
}
