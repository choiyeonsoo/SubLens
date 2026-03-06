package com.pkms.backend.mail;

public class PasswordResetTemplate implements MailTemplate {

    private final String name;
    private final String resetUrl;

    public PasswordResetTemplate(String name, String resetUrl) {
        this.name = name;
        this.resetUrl = resetUrl;
    }

    @Override
    public String getSubject() {
        return "비밀번호 재설정 안내";
    }

    @Override
    public String getHtml() {
        return """
                <h2>비밀번호 재설정</h2>
                <p>%s님 안녕하세요.</p>
                <p>아래 버튼을 클릭해주세요.</p>
                <a href="%s"
                   style="padding:10px 20px;background:#000;color:#fff;text-decoration:none;">
                   비밀번호 변경
                </a>
                <p>이 링크는 10분 후 만료됩니다.</p>
                """.formatted(name, resetUrl);
    }
}
