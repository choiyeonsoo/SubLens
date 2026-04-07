package com.sublens.backend.bundle;

import java.util.List;

import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import com.sublens.backend.global.exception.ApiResponse;

import lombok.RequiredArgsConstructor;

@RestController
@RequestMapping("/api/bundles")
@RequiredArgsConstructor
public class BundleController {

    private final BundleRepository bundleRepository;

    @GetMapping
    public ApiResponse<List<BundleResponse>> list(
            @RequestParam(required = false) String provider) {
        List<BundleResponse> bundles = (provider == null || provider.isBlank())
                ? bundleRepository.findByIsActiveTrue().stream().map(BundleResponse::from).toList()
                : bundleRepository.findByProviderAndIsActiveTrue(provider).stream().map(BundleResponse::from).toList();
        return ApiResponse.success(bundles);
    }
}
