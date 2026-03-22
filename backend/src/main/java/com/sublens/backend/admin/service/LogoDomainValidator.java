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

    // 리다이렉트를 따라가도록 NORMAL 설정
    private static final HttpClient HTTP_CLIENT = HttpClient.newBuilder()
            .connectTimeout(Duration.ofSeconds(5))
            .followRedirects(HttpClient.Redirect.NORMAL)
            .build();

    /**
     * Google Favicon API로 logoDomain의 유효성을 검증합니다.
     * 리다이렉트를 따라간 최종 응답 기준으로 판단합니다.
     * - 상태코드가 200이 아니면 null 반환
     * - Content-Length가 726(placeholder)이면 null 반환
     * - 정상 이미지면 원본 logoDomain을 반환합니다.
     * - 네트워크 오류 시 logoDomain을 그대로 반환합니다.
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

            if (response.statusCode() != 200) {
                log.debug("Logo domain '{}' returned status {}, storing as null", logoDomain, response.statusCode());
                return null;
            }

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
