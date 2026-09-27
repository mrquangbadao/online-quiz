package com.quiz.dto.response;

import lombok.Builder;
import lombok.Data;

@Data
@Builder
public class RequestOtpResponse {
    private long expiresInSeconds;
    private long resendAvailableInSeconds;
}
