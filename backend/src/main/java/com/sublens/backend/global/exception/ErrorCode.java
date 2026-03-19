package com.sublens.backend.global.exception;

import org.springframework.http.HttpStatus;

public enum ErrorCode {

    // 공통
    INTERNAL_SERVER_ERROR(HttpStatus.INTERNAL_SERVER_ERROR, "서버 내부 오류"),
    INVALID_REQUEST(HttpStatus.BAD_REQUEST, "잘못된 요청"),

    // JWT
    TOKEN_EXPIRED(HttpStatus.UNAUTHORIZED, "토큰이 만료되었습니다."),
    INVALID_SIGNATURE(HttpStatus.UNAUTHORIZED, "토큰 서명이 유효하지 않습니다."),
    MALFORMED_TOKEN(HttpStatus.BAD_REQUEST, "토큰 형식이 올바르지 않습니다."),
    UNSUPPORTED_TOKEN(HttpStatus.BAD_REQUEST, "지원되지 않는 토큰입니다."),
    EMPTY_TOKEN(HttpStatus.BAD_REQUEST, "토큰이 존재하지 않습니다."),

    // USER
    USER_NOT_FOUND(HttpStatus.NOT_FOUND, "존재하지 않는 사용자입니다."),
    EMAIL_NOT_FOUND(HttpStatus.NOT_FOUND, "존재하지 않는 이메일입니다."),
    INVALID_PASSWORD(HttpStatus.UNAUTHORIZED, "비밀번호가 일치하지 않습니다."),
    DUPLICATE_EMAIL(HttpStatus.CONFLICT, "이미 존재하는 이메일입니다."),

    // PASSWORD RESET
    INVALID_RESET_TOKEN(HttpStatus.BAD_REQUEST, "유효하지 않거나 만료된 재설정 토큰입니다."),

    // SUBSCRIPTION
    SUBSCRIPTION_NOT_FOUND(HttpStatus.NOT_FOUND, "구독 정보를 찾을 수 없습니다."),
    SUBSCRIPTION_ACCESS_DENIED(HttpStatus.FORBIDDEN, "해당 구독에 접근 권한이 없습니다."),
    SUBSCRIPTION_LIMIT_EXCEEDED(HttpStatus.FORBIDDEN, "무료 플랜은 최대 5개의 구독만 등록할 수 있습니다."),
    INVALID_BILLING_DATE(HttpStatus.BAD_REQUEST, "청구일은 오늘 이후여야 합니다.");

    private final HttpStatus status;
    private final String message;

    ErrorCode(HttpStatus status, String message) {
        this.status = status;
        this.message = message;
    }

    public HttpStatus getStatus() {
        return status;
    }

    public String getMessage() {
        return message;
    }
}