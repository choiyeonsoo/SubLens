package com.pkms.backend.subscription;

import java.util.List;
import java.util.Map;
import java.util.UUID;

import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import com.pkms.backend.global.exception.ApiResponse;
import com.pkms.backend.subscription.dto.SubscriptionCreateRequest;
import com.pkms.backend.subscription.dto.SubscriptionDetailRequest;
import com.pkms.backend.subscription.dto.SubscriptionListRequest;
import com.pkms.backend.subscription.dto.SubscriptionResponse;
import com.pkms.backend.subscription.dto.SubscriptionStatusRequest;
import com.pkms.backend.subscription.dto.SubscriptionSummaryResponse;
import com.pkms.backend.subscription.dto.SubscriptionUpdateRequest;

import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;

@RestController
@RequestMapping("/api/subscriptions")
@RequiredArgsConstructor
public class SubscriptionController {

    private final SubscriptionService subscriptionService;

    @PostMapping("/list")
    public ResponseEntity<ApiResponse<List<SubscriptionResponse>>> list(
            @RequestBody(required = false) SubscriptionListRequest request) {

        if (request == null) request = new SubscriptionListRequest();
        return ResponseEntity.ok(ApiResponse.success(subscriptionService.list(request)));
    }

    @PostMapping("/detail")
    public ResponseEntity<ApiResponse<SubscriptionResponse>> detail(
            @Valid @RequestBody SubscriptionDetailRequest request) {

        return ResponseEntity.ok(ApiResponse.success(subscriptionService.detail(request.getId())));
    }

    @PostMapping("/create")
    public ResponseEntity<ApiResponse<SubscriptionResponse>> create(
            @Valid @RequestBody SubscriptionCreateRequest request) {

        return ResponseEntity
                .status(HttpStatus.CREATED)
                .body(ApiResponse.success(subscriptionService.create(request)));
    }

    @PostMapping("/update")
    public ResponseEntity<ApiResponse<SubscriptionResponse>> update(
            @Valid @RequestBody SubscriptionUpdateRequest request) {

        return ResponseEntity.ok(ApiResponse.success(subscriptionService.update(request)));
    }

    @PostMapping("/status")
    public ResponseEntity<ApiResponse<SubscriptionResponse>> status(
            @Valid @RequestBody SubscriptionStatusRequest request) {

        return ResponseEntity.ok(ApiResponse.success(subscriptionService.updateStatus(request)));
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<ApiResponse<Void>> delete(@PathVariable UUID id) {
        subscriptionService.delete(id);
        return ResponseEntity.ok(ApiResponse.success(null));
    }

    @PostMapping("/summary")
    public ResponseEntity<ApiResponse<SubscriptionSummaryResponse>> summary(
            @RequestBody(required = false) Map<String, Object> body) {

        return ResponseEntity.ok(ApiResponse.success(subscriptionService.summary()));
    }
}
