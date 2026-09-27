package com.quiz.dto.response;

import lombok.Builder;
import lombok.Data;

@Data
@Builder
public class VerifyOtpResponse {
    private String verificationToken;
    private long expiresInSeconds;
}
