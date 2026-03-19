package com.sublens.backend.security;

import java.io.IOException;

import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Component;
import org.springframework.web.filter.OncePerRequestFilter;

import com.sublens.backend.auth.jwt.JwtTokenProvider;
import com.sublens.backend.global.exception.BusinessException;

import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import lombok.RequiredArgsConstructor;

@Component
@RequiredArgsConstructor
public class JwtAuthenticationFilter extends OncePerRequestFilter {

    private final JwtTokenProvider jwtTokenProvider;

    @Override
    protected boolean shouldNotFilter(HttpServletRequest request) {
        String path = request.getRequestURI();
        return path.startsWith("/api/auth/login")
                || path.startsWith("/api/auth/signup")
                || path.startsWith("/api/auth/reissue");
    }

    @Override
    protected void doFilterInternal(HttpServletRequest request,
            HttpServletResponse response,
            FilterChain filterChain)
            throws ServletException, IOException {

        String token = jwtTokenProvider.resolveTokenFromCookie(request);

        if (token != null) {
            try {
                jwtTokenProvider.validateToken(token);
                Authentication authentication = jwtTokenProvider.getAuthentication(token);
                SecurityContextHolder.getContext()
                        .setAuthentication(authentication);

            } catch (BusinessException e) {

                SecurityContextHolder.clearContext();
                response.setStatus(e.getErrorCode().getStatus().value());
                response.setContentType("application/json;charset=UTF-8");

                response.getWriter().write(String.format(
                        "{\"success\":false,\"code\":\"%s\",\"message\":\"%s\",\"data\":null}",
                        e.getErrorCode().name(),
                        e.getErrorCode().getMessage()));

                return;
            }
        }

        filterChain.doFilter(request, response);
    }
}