package com.sublens.backend.admin.service;

import java.net.URI;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.time.Duration;

import org.springframework.stereotype.Component;

import lombok.extern.slf4j.Slf4j;

@Component
@Slf4j
public class LogoDomainValidator {

    private static final int PLACEHOLDER_CONTENT_LENGTH = 726;

    private static final HttpClient HTTP_CLIENT = HttpClient.newBuilder()
            .connectTimeout(Duration.ofSeconds(5))
            .build();

    /**
     * Google Favicon API로 logoDomain의 유효성을 검증합니다.
     * Content-Length가 726이면 빈 placeholder이므로 null을 반환합니다.
     * 정상 이미지면 원본 logoDomain을 반환합니다.
     * 네트워크 오류 시 logoDomain을 그대로 반환합니다.
     */
    public String resolve(String logoDomain) {
        if (logoDomain == null || logoDomain.isBlank()) {
            return null;
        }
        try {
            HttpRequest request = HttpRequest.newBuilder()
                    .uri(URI.create(
                            "https://www.google.com/s2/favicons?domain=" + logoDomain + "&sz=64"))
                    .timeout(Duration.ofSeconds(5))
                    .method("HEAD", HttpRequest.BodyPublishers.noBody())
                    .build();

            HttpResponse<Void> response = HTTP_CLIENT.send(
                    request, HttpResponse.BodyHandlers.discarding());

            long contentLength = response.headers()
                    .firstValueAsLong("content-length")
                    .orElse(-1);

            if (contentLength == PLACEHOLDER_CONTENT_LENGTH) {
                log.debug("Logo domain '{}' is a placeholder, storing as null", logoDomain);
                return null;
            }
            return logoDomain;

        } catch (Exception e) {
            log.warn("Logo domain validation failed for '{}': {}", logoDomain, e.getMessage());
            return logoDomain;
        }
    }
}
