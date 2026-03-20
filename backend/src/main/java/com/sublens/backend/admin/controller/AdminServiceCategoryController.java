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

import com.sublens.backend.admin.dto.ServiceCategoryRequest;
import com.sublens.backend.admin.dto.ServiceCategoryResponse;
import com.sublens.backend.admin.service.AdminService;
import com.sublens.backend.global.exception.ApiResponse;

import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;

@RestController
@RequestMapping("/api/admin/service-categories")
@RequiredArgsConstructor
public class AdminServiceCategoryController {

    private final AdminService adminService;

    @GetMapping
    public ResponseEntity<ApiResponse<List<ServiceCategoryResponse>>> list() {
        return ResponseEntity.ok(ApiResponse.success(adminService.listCategories()));
    }

    @PostMapping
    public ResponseEntity<ApiResponse<ServiceCategoryResponse>> create(
            @Valid @RequestBody ServiceCategoryRequest req) {
        return ResponseEntity.ok(ApiResponse.success(adminService.createCategory(req)));
    }

    @PutMapping("/{id}")
    public ResponseEntity<ApiResponse<ServiceCategoryResponse>> update(
            @PathVariable UUID id,
            @Valid @RequestBody ServiceCategoryRequest req) {
        return ResponseEntity.ok(ApiResponse.success(adminService.updateCategory(id, req)));
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<ApiResponse<Void>> delete(@PathVariable UUID id) {
        adminService.deleteCategory(id);
        return ResponseEntity.ok(ApiResponse.success(null));
    }
}
