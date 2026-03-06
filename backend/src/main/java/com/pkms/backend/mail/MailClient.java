package com.pkms.backend.mail;

public interface MailClient {

    /**
     * 템플릿 기반 메일 발송
     *
     * @param to         수신자 이메일
     * @param subject    제목
     * @param html       내용
     */
    void send(String to,
        String subject,
        String html);
}