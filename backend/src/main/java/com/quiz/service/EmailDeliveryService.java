package com.quiz.service;

import lombok.RequiredArgsConstructor;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.mail.SimpleMailMessage;
import org.springframework.mail.javamail.JavaMailSender;
import org.springframework.stereotype.Service;

@Service
@RequiredArgsConstructor
public class EmailDeliveryService {

    private final JavaMailSender javaMailSender;

    @Value("${quiz.otp.mail.from:${spring.mail.username:}}")
    private String fromAddress;

    public void sendOtpEmail(String email, String otpCode) {
        SimpleMailMessage message = new SimpleMailMessage();
        if (fromAddress != null && !fromAddress.isBlank()) {
            message.setFrom(fromAddress);
        }
        message.setTo(email);
        message.setSubject("Quiz verification code");
        message.setText(buildBody(otpCode));
        javaMailSender.send(message);
    }

    private String buildBody(String otpCode) {
        return "Your quiz verification code is: " + otpCode + System.lineSeparator()
                + "This code expires in 5 minutes." + System.lineSeparator()
                + "If you did not request this code, you can safely ignore this email.";
    }
}
