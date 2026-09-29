package com.quiz.security;

import java.time.Duration;

public enum PublicEndpointAction {
    AUTH_LOGIN("auth_login", "/api/auth/login", 10, Duration.ofMinutes(10),
            "Too many failed login attempts. Try again after 10 minutes."),
    AUTH_REQUEST_OTP("auth_request_otp", "/api/auth/request-otp", 300, Duration.ofMinutes(10),
            "Too many OTP requests from this network. Try again after 10 minutes."),
    AUTH_VERIFY_OTP("auth_verify_otp", "/api/auth/verify-otp", 300, Duration.ofMinutes(10),
            "Too many OTP verification attempts from this network. Try again after 10 minutes."),
    CONTESTANT_REGISTER("contestant_register", "/api/contestant/register", 300, Duration.ofMinutes(10),
            "Too many registration attempts from this network. Try again after 10 minutes."),
    EXAM_START("exam_start", "/api/exams/start", 300, Duration.ofMinutes(10),
            "Too many exam start attempts from this network. Try again after 10 minutes."),
    EXAM_SUBMIT("exam_submit", "/api/exams/submit", 300, Duration.ofMinutes(10),
            "Too many exam submit attempts from this network. Try again after 10 minutes.");

    private final String key;
    private final String endpoint;
    private final int maxAttempts;
    private final Duration window;
    private final String limitMessage;

    PublicEndpointAction(String key, String endpoint, int maxAttempts, Duration window, String limitMessage) {
        this.key = key;
        this.endpoint = endpoint;
        this.maxAttempts = maxAttempts;
        this.window = window;
        this.limitMessage = limitMessage;
    }

    public String key() {
        return key;
    }

    public String endpoint() {
        return endpoint;
    }

    public int maxAttempts() {
        return maxAttempts;
    }

    public Duration window() {
        return window;
    }

    public String limitMessage() {
        return limitMessage;
    }
}
