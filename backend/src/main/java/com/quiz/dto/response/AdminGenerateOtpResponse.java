package com.quiz.dto.response;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class AdminGenerateOtpResponse {

    private String email;
    private String otpCode;
    private LocalDateTime expiresAt;
    private long expiresInSeconds;
    private String message;
}
