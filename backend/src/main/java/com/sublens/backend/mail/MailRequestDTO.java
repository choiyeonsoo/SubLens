package com.sublens.backend.mail;
import lombok.Builder;
import lombok.Getter;

@Getter
@Builder
public class MailRequestDTO {

    private String to;
    private String name;
    private String token;
}