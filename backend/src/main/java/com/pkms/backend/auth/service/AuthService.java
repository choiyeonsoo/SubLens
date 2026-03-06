package com.pkms.backend.auth.service;

import java.util.UUID;
import java.util.concurrent.TimeUnit;

import org.springframework.data.redis.core.RedisTemplate;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;

import com.pkms.backend.auth.dto.LoginRequest;
import com.pkms.backend.auth.dto.LoginResponse;
import com.pkms.backend.auth.dto.SignupRequest;
import com.pkms.backend.auth.jwt.JwtTokenProvider;
import com.pkms.backend.global.exception.BusinessException;
import com.pkms.backend.global.exception.ErrorCode;
import com.pkms.backend.mail.EmailService;
import com.pkms.backend.user.Role;
import com.pkms.backend.user.User;
import com.pkms.backend.user.repository.UserRepository;

import lombok.RequiredArgsConstructor;

@Service
@RequiredArgsConstructor
public class AuthService {
    private final UserRepository userRepository;
    private final PasswordEncoder passwordEncoder;
    private final JwtTokenProvider jwtTokenProvider;
    private final RedisTemplate<String, String> redisTemplate;
    private final EmailService emailService;

    public void signup(SignupRequest request) {

        if (userRepository.existsByEmail(request.getEmail())) {
            throw new BusinessException(ErrorCode.DUPLICATE_EMAIL);
        }

        User user = User.builder()
                .email(request.getEmail())
                .password(passwordEncoder.encode(request.getPassword()))
                .name(request.getName())
                .phoneNumber(request.getPhoneNumber())
                .role(Role.USER)
                .build();

        userRepository.save(user);
    }

    public LoginResponse login(LoginRequest request) {

        User user = userRepository.findByEmail(request.getEmail())
                .orElseThrow(() -> new BusinessException(ErrorCode.EMAIL_NOT_FOUND));

        if (!passwordEncoder.matches(request.getPassword(), user.getPassword())) {
            throw new BusinessException(ErrorCode.INVALID_PASSWORD);
        }

        String accessToken = jwtTokenProvider.createAccessToken(user);
        String refreshToken = jwtTokenProvider.createRefreshToken(user);

        // 🔹 Redis 저장 (24시간)
        redisTemplate.opsForValue().set(
                "refresh:" + user.getId(),
                refreshToken,
                24,
                TimeUnit.HOURS);

        return new LoginResponse(accessToken, refreshToken);
    }

    // 리프레시 토큰 재발급
    public LoginResponse reissue(String refreshToken) {

        // 1️⃣ 유효성 검사
        jwtTokenProvider.validateToken(refreshToken);

        // 2️⃣ userId 추출 (Provider에게 맡김)
        Long userId = jwtTokenProvider.getUserIdFromToken(refreshToken);

        // 3️⃣ Redis 확인
        String storedRefresh = redisTemplate.opsForValue()
                .get("refresh:" + userId);

        if (storedRefresh == null || !storedRefresh.equals(refreshToken)) {
            throw new BusinessException(ErrorCode.TOKEN_EXPIRED);
        }

        // 4️⃣ 사용자 조회
        User user = userRepository.findById(userId)
                .orElseThrow(() -> new BusinessException(ErrorCode.EMAIL_NOT_FOUND));

        // 5️⃣ 새 토큰 발급
        String newAccess = jwtTokenProvider.createAccessToken(user);
        String newRefresh = jwtTokenProvider.createRefreshToken(user);

        // 6️⃣ Rotation
        redisTemplate.opsForValue().set(
                "refresh:" + userId,
                newRefresh,
                24,
                TimeUnit.HOURS);

        return new LoginResponse(newAccess, newRefresh);
    }

    public String validateResetToken(String token) {
        String userId = redisTemplate.opsForValue().get("reset:token:" + token);
        if (userId == null) {
            throw new BusinessException(ErrorCode.INVALID_RESET_TOKEN);
        }
        return userId;
    }

    public void requestPasswordReset(String email) {
        User user = userRepository.findByEmail(email)
                .orElse(null);

        if (user == null) {
            return;
        }

        String userId = user.getId().toString();

        // 기존 토큰이 있으면 무효화
        String oldToken = redisTemplate.opsForValue().get("reset:user:" + userId);
        if (oldToken != null) {
            redisTemplate.delete("reset:token:" + oldToken);
        }

        String newToken = UUID.randomUUID().toString();

        // 듀얼 키 저장 (10분 TTL)
        redisTemplate.opsForValue().set(
                "reset:user:" + userId, newToken, 10, TimeUnit.MINUTES);
        redisTemplate.opsForValue().set(
                "reset:token:" + newToken, userId, 10, TimeUnit.MINUTES);

        emailService.sendPasswordReset(user.getEmail(), user.getName(), newToken);
    }

    public void resetPassword(String token, String password) {

        String userId = redisTemplate.opsForValue().get("reset:token:" + token);
    
        if (userId == null) {
            throw new BusinessException(ErrorCode.INVALID_RESET_TOKEN);
        }
    
        User user = userRepository.findById(Long.valueOf(userId))
                .orElseThrow(() -> new BusinessException(ErrorCode.EMAIL_NOT_FOUND));
    
        user.setPassword(passwordEncoder.encode(password));
    
        userRepository.save(user);
    
        // 🔥 토큰 삭제 (중요)
        redisTemplate.delete("reset:token:" + token);
    }
}
