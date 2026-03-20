package com.sublens.backend.admin.controller;

import java.util.List;
import java.util.UUID;

import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import com.sublens.backend.admin.dto.SubscriptionServiceRequest;
import com.sublens.backend.admin.dto.SubscriptionServiceResponse;
import com.sublens.backend.admin.service.AdminService;
import com.sublens.backend.global.exception.ApiResponse;

import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;

@RestController
@RequestMapping("/api/admin/subscription-services")
@RequiredArgsConstructor
public class AdminSubscriptionServiceController {

    private final AdminService adminService;

    @GetMapping
    public ResponseEntity<ApiResponse<List<SubscriptionServiceResponse>>> list() {
        return ResponseEntity.ok(ApiResponse.success(adminService.listServices()));
    }

    @PostMapping
    public ResponseEntity<ApiResponse<SubscriptionServiceResponse>> create(
            @Valid @RequestBody SubscriptionServiceRequest req) {
        return ResponseEntity.ok(ApiResponse.success(adminService.createService(req)));
    }

    @PutMapping("/{id}")
    public ResponseEntity<ApiResponse<SubscriptionServiceResponse>> update(
            @PathVariable UUID id,
            @Valid @RequestBody SubscriptionServiceRequest req) {
        return ResponseEntity.ok(ApiResponse.success(adminService.updateService(id, req)));
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<ApiResponse<Void>> delete(@PathVariable UUID id) {
        adminService.deleteService(id);
        return ResponseEntity.ok(ApiResponse.success(null));
    }
}
