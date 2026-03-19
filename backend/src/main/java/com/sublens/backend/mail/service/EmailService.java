package com.sublens.backend.mail.service;

import org.springframework.stereotype.Service;

import com.sublens.backend.mail.MailClient;
import com.sublens.backend.mail.PasswordResetTemplate;

import lombok.RequiredArgsConstructor;

@Service
@RequiredArgsConstructor
public class EmailService {

    private final MailClient mailClient;

    public void sendPasswordReset(String to,
                                  String name,
                                  String token) {

        String resetUrl =
                "http://localhost:3000/reset-password?token=" + token;

        PasswordResetTemplate template =
                new PasswordResetTemplate(name, resetUrl);
                System.out.println("📧 메일 발송 시도: " + to);
        mailClient.send(
                to,
                template.getSubject(),
                template.getHtml()
        );
    }
}
