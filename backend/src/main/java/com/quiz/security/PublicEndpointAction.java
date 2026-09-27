package com.quiz.security;

import java.time.Duration;

public enum PublicEndpointAction {
    AUTH_LOGIN("auth_login", "/api/auth/login",
            "Too many failed login attempts. Try again after 10 minutes."),
    AUTH_REQUEST_OTP("auth_request_otp", "/api/auth/request-otp",
            "Too many OTP requests. Try again after 10 minutes."),
    AUTH_VERIFY_OTP("auth_verify_otp", "/api/auth/verify-otp",
            "Too many OTP verification attempts. Try again after 10 minutes."),
    CONTESTANT_REGISTER("contestant_register", "/api/contestant/register",
            "Too many registration attempts. Try again after 10 minutes."),
    EXAM_START("exam_start", "/api/exams/start",
            "Too many exam start attempts. Try again after 10 minutes."),
    EXAM_SUBMIT("exam_submit", "/api/exams/submit",
            "Too many exam submit attempts. Try again after 10 minutes.");

    private static final int DEFAULT_MAX_ATTEMPTS = 5;
    private static final Duration DEFAULT_WINDOW = Duration.ofMinutes(10);

    private final String key;
    private final String endpoint;
    private final String limitMessage;

    PublicEndpointAction(String key, String endpoint, String limitMessage) {
        this.key = key;
        this.endpoint = endpoint;
        this.limitMessage = limitMessage;
    }

    public String key() {
        return key;
    }

    public String endpoint() {
        return endpoint;
    }

    public int maxAttempts() {
        return DEFAULT_MAX_ATTEMPTS;
    }

    public Duration window() {
        return DEFAULT_WINDOW;
    }

    public String limitMessage() {
        return limitMessage;
    }
}
