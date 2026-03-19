package com.sublens.backend.auth.controller;

import java.util.Map;
import java.util.UUID;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.security.core.Authentication;
import org.springframework.data.redis.core.RedisTemplate;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import com.sublens.backend.auth.dto.LoginRequest;
import com.sublens.backend.auth.dto.LoginResponse;
import com.sublens.backend.auth.dto.PasswordReset;
import com.sublens.backend.auth.dto.PasswordResetRequest;
import com.sublens.backend.auth.dto.SignupRequest;
import com.sublens.backend.auth.dto.UserResponse;
import com.sublens.backend.auth.jwt.JwtTokenProvider;
import com.sublens.backend.auth.service.AuthService;
import com.sublens.backend.global.exception.ApiResponse;
import com.sublens.backend.global.exception.BusinessException;
import com.sublens.backend.global.exception.ErrorCode;
import com.sublens.backend.user.User;
import com.sublens.backend.user.repository.UserRepository;

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
    private final UserRepository userRepository;

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
    public ResponseEntity<ApiResponse<UserResponse>> me(Authentication authentication) {

        if (authentication == null) {
            return ResponseEntity.status(401).build();
        }

        // authentication.getName() = userId (JwtAuthenticationFilter에서 세팅한 값)
        User user = userRepository.findById(UUID.fromString(authentication.getName()))
                .orElseThrow(() -> new BusinessException(ErrorCode.USER_NOT_FOUND));

        return ResponseEntity.ok(
                ApiResponse.success(new UserResponse(
                        user.getId().toString(),
                        user.getEmail(),
                        user.getName(),
                        user.getRole().name()  // "FREE" or "PRO"
                ))
        );
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

    @Value("${jwt.access-token-expiration}")
    private long accessTokenExpiration;

    @Value("${jwt.refresh-token-expiration}")
    private long refreshTokenExpiration;

    private void addTokenCookies(HttpServletResponse response,
            String accessToken,
            String refreshToken) {

        Cookie accessCookie = new Cookie("access_token", accessToken);
        accessCookie.setHttpOnly(true);
        accessCookie.setSecure(false); // 운영에서는 true
        accessCookie.setPath("/");
        accessCookie.setMaxAge((int) (accessTokenExpiration / 1000));

        Cookie refreshCookie = new Cookie("refresh_token", refreshToken);
        refreshCookie.setHttpOnly(true);
        refreshCookie.setSecure(false); // 운영에서는 true
        refreshCookie.setPath("/");
        refreshCookie.setMaxAge((int) (refreshTokenExpiration / 1000));

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
