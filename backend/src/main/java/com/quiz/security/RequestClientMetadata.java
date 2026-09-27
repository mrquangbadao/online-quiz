package com.quiz.security;

public record RequestClientMetadata(
        String clientIp,
        String userAgent,
        String deviceId,
        String requestUri
) {
}
