package com.pkms.backend.auth.controller;

import java.util.Map;

import org.springframework.security.core.Authentication;
import org.springframework.data.redis.core.RedisTemplate;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import com.pkms.backend.auth.dto.LoginRequest;
import com.pkms.backend.auth.dto.LoginResponse;
import com.pkms.backend.auth.dto.PasswordReset;
import com.pkms.backend.auth.dto.PasswordResetRequest;
import com.pkms.backend.auth.dto.SignupRequest;
import com.pkms.backend.auth.jwt.JwtTokenProvider;
import com.pkms.backend.auth.service.AuthService;
import com.pkms.backend.global.exception.BusinessException;
import com.pkms.backend.global.exception.ErrorCode;

import jakarta.servlet.http.Cookie;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import lombok.RequiredArgsConstructor;

@RestController
@RequestMapping("/api/auth")
@RequiredArgsConstructor
public class AuthController {
    private final AuthService authService;
    private final JwtTokenProvider jwtTokenProvider;
    private final RedisTemplate<String, String> redisTemplate;

    @PostMapping("/signup")
    public String signup(@RequestBody SignupRequest request) {
        authService.signup(request);
        return "회원가입 완료";
    }

    @PostMapping("/login")
    public ResponseEntity<Void> login(@RequestBody LoginRequest request,
            HttpServletResponse response) {

        LoginResponse tokens = authService.login(request);

        addTokenCookies(response,
                tokens.getAccessToken(),
                tokens.getRefreshToken());
        return ResponseEntity.ok().build();
    }

    @GetMapping("/me")
    public ResponseEntity<?> me(Authentication authentication) {

        if (authentication == null) {
            return ResponseEntity.status(401).build();
        }

        return ResponseEntity.ok(
                Map.of(
                        "userId", authentication.getName(),
                        "roles", authentication.getAuthorities()));
    }

    @PostMapping("/logout")
    public ResponseEntity<?> logout(Authentication authentication,
            HttpServletResponse response) {

        if (authentication != null) {
            String userId = authentication.getName();
            redisTemplate.delete("refresh:" + userId);
        }

        Cookie accessCookie = new Cookie("access_token", null);
        accessCookie.setPath("/");
        accessCookie.setMaxAge(0);

        Cookie refreshCookie = new Cookie("refresh_token", null);
        refreshCookie.setPath("/");
        refreshCookie.setMaxAge(0);

        response.addCookie(accessCookie);
        response.addCookie(refreshCookie);

        return ResponseEntity.ok().build();
    }

    @PostMapping("/reissue")
    public ResponseEntity<?> reissue(HttpServletRequest request,
            HttpServletResponse response) {

        String refreshToken = jwtTokenProvider
                .resolveRefreshTokenFromCookie(request);

        if (refreshToken == null) {
            throw new BusinessException(ErrorCode.TOKEN_EXPIRED);
        }

        LoginResponse tokenResponse = authService.reissue(refreshToken);

        addTokenCookies(response,
                tokenResponse.getAccessToken(),
                tokenResponse.getRefreshToken());

        return ResponseEntity.ok().build();
    }

    private void addTokenCookies(HttpServletResponse response,
            String accessToken,
            String refreshToken) {

        Cookie accessCookie = new Cookie("access_token", accessToken);
        accessCookie.setHttpOnly(true);
        accessCookie.setSecure(false); // 운영에서는 true
        accessCookie.setPath("/");
        accessCookie.setMaxAge(60 * 30); // 30분

        Cookie refreshCookie = new Cookie("refresh_token", refreshToken);
        refreshCookie.setHttpOnly(true);
        refreshCookie.setSecure(false); // 운영에서는 true
        refreshCookie.setPath("/");
        refreshCookie.setMaxAge(60 * 60 * 24); // 24시간

        response.addCookie(accessCookie);
        response.addCookie(refreshCookie);
    }

    @GetMapping("/validate-token")
    public ResponseEntity<?> validateResetToken(@RequestParam("token") String token) {
        authService.validateResetToken(token);
        return ResponseEntity.ok().build();
    }

    @PostMapping("/request-reset")
    public ResponseEntity<?> requestPasswordReset(
            @RequestBody PasswordResetRequest request
    ) {

        authService.requestPasswordReset(request.getEmail());

        // 보안상 항상 성공 응답
        return ResponseEntity.ok().build();
    }

    @PostMapping("/reset-password")
    public ResponseEntity<?> resetPassword(@RequestBody PasswordReset request) {
        authService.resetPassword(request.getToken(), request.getPassword());
        return ResponseEntity.ok().build();
    }
}
