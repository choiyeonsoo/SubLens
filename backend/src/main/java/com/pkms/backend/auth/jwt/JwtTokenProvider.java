package com.pkms.backend.auth.jwt;

import java.util.Collection;
import java.util.Date;
import java.util.List;

import org.springframework.security.core.Authentication;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.GrantedAuthority;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.stereotype.Component;
import com.pkms.backend.global.exception.BusinessException;
import com.pkms.backend.global.exception.ErrorCode;
import com.pkms.backend.user.User;

import io.jsonwebtoken.Claims;
import io.jsonwebtoken.ExpiredJwtException;
import io.jsonwebtoken.Jwts;
import io.jsonwebtoken.MalformedJwtException;
import io.jsonwebtoken.UnsupportedJwtException;
import io.jsonwebtoken.security.SignatureException;
import io.jsonwebtoken.security.Keys;
import jakarta.servlet.http.Cookie;
import jakarta.servlet.http.HttpServletRequest;
import lombok.RequiredArgsConstructor;

@Component
@RequiredArgsConstructor
public class JwtTokenProvider {
    @Value("${jwt.secret}")
    private String secretKey;

    @Value("${jwt.access-token-expiration}")
    private long accessTokenExpiration;

    @Value("${jwt.refresh-token-expiration}")
    private long refreshTokenExpiration;

    /*
     * 요청 들어옴
     * ↓
     * Filter 실행
     * ↓
     * resolveTokenFromCookie() -> 쿠키에서 토큰 추출
     * ↓
     * validateToken() -> 토큰 유효성 검증
     * ↓
     * getAuthentication() -> 토큰 기반 인증 객체 생성
     * ↓
     * SecurityContextHolder 저장
     * ↓
     * Controller 진입
     */

    // Access Token 생성
    public String createAccessToken(User user) {

        Date now = new Date();
        Date expiry = new Date(now.getTime() + accessTokenExpiration);

        return Jwts.builder()
                .setSubject(String.valueOf(user.getId()))
                .claim("role", user.getRole().name())
                .setIssuedAt(now)
                .setExpiration(expiry)
                .signWith(Keys.hmacShaKeyFor(secretKey.getBytes()))
                .compact();
    }

    public String createRefreshToken(User user) {

        Date now = new Date();
        Date expiry = new Date(now.getTime() + refreshTokenExpiration);

        return Jwts.builder()
                .setSubject(String.valueOf(user.getId()))
                .setIssuedAt(now)
                .setExpiration(expiry)
                .signWith(Keys.hmacShaKeyFor(secretKey.getBytes()))
                .compact();
    }

    // 토큰 유효성 검증
    public void validateToken(String token) {
        try {
            Jwts.parserBuilder()
                    .setSigningKey(Keys.hmacShaKeyFor(secretKey.getBytes()))
                    .build()
                    .parseClaimsJws(token);

        } catch (ExpiredJwtException e) {
            throw new BusinessException(ErrorCode.TOKEN_EXPIRED);

        } catch (SignatureException e) {
            throw new BusinessException(ErrorCode.INVALID_SIGNATURE);

        } catch (MalformedJwtException e) {
            throw new BusinessException(ErrorCode.MALFORMED_TOKEN);

        } catch (UnsupportedJwtException e) {
            throw new BusinessException(ErrorCode.UNSUPPORTED_TOKEN);

        } catch (IllegalArgumentException e) {
            throw new BusinessException(ErrorCode.EMPTY_TOKEN);
        }
    }

    // 쿠키에서 토큰 추출
    public String resolveTokenFromCookie(HttpServletRequest request) {

        if (request.getCookies() == null)
            return null;

        for (Cookie cookie : request.getCookies()) {
            if ("access_token".equals(cookie.getName())) {
                return cookie.getValue();
            }
        }

        return null;
    }

    // 토큰 기반 인증 객체 생성 (JWT를 Spring Security가 이해할 수 있는 인증 객체로 변환)
    public Authentication getAuthentication(String token) {

        Claims claims = Jwts.parserBuilder()
                .setSigningKey(Keys.hmacShaKeyFor(secretKey.getBytes()))
                .build()
                .parseClaimsJws(token)
                .getBody();

        String userId = claims.getSubject();
        String role = claims.get("role", String.class);

        Collection<? extends GrantedAuthority> authorities = List.of(new SimpleGrantedAuthority("ROLE_" + role));

        UserDetails userDetails = new org.springframework.security.core.userdetails.User(
                userId,
                "",
                authorities);

        return UsernamePasswordAuthenticationToken.authenticated(
                userDetails,
                null,
                authorities);
    }
}
