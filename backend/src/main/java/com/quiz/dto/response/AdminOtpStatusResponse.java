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
public class AdminOtpStatusResponse {

    private String email;
    private boolean hasActiveOtp;
    private boolean used;
    private boolean expired;
    private LocalDateTime createdAt;
    private LocalDateTime expiresAt;
    private int attempts;
    private int maxAttempts;
}
