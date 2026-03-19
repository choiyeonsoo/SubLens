package com.sublens.backend.subscription.controller;

import java.util.List;

import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import com.sublens.backend.global.exception.ApiResponse;
import com.sublens.backend.subscription.dto.SubscriptionServiceResponse;
import com.sublens.backend.subscription.repository.ServiceCatalogRepository;

import lombok.RequiredArgsConstructor;

@RestController
@RequestMapping("/api/subscription-services")
@RequiredArgsConstructor
public class ServiceCategoryController {

    private final ServiceCatalogRepository repository;

    @GetMapping
    public ResponseEntity<ApiResponse<List<SubscriptionServiceResponse>>> getAll() {
        List<SubscriptionServiceResponse> result = repository
            .findAllActiveOrdered()
            .stream()
            .map(SubscriptionServiceResponse::from)
            .toList();

        return ResponseEntity.ok(ApiResponse.success(result));
    }
}
