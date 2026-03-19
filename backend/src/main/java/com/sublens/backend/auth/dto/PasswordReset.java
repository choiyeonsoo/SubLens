package com.sublens.backend.auth.dto;

import jakarta.validation.constraints.NotBlank;
import lombok.Getter;

@Getter
public class PasswordReset {
    @NotBlank(message = "토큰은 필수입니다.")
    private String token;

    @NotBlank(message = "비밀번호는 필수입니다.")
    private String password;
}
