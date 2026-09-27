package com.quiz.service;

import com.fasterxml.jackson.annotation.JsonIgnoreProperties;
import com.quiz.exception.BusinessException;
import lombok.RequiredArgsConstructor;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpEntity;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.stereotype.Service;
import org.springframework.util.LinkedMultiValueMap;
import org.springframework.util.MultiValueMap;
import org.springframework.web.client.RestClientException;
import org.springframework.web.client.RestTemplate;

@Service
@RequiredArgsConstructor
public class CaptchaVerificationService {

    private static final String TURNSTILE_VERIFY_URL = "https://challenges.cloudflare.com/turnstile/v0/siteverify";

    @Value("${captcha.turnstile.enabled:false}")
    private boolean enabled;

    @Value("${captcha.turnstile.secret-key:}")
    private String secretKey;

    private final RestTemplate restTemplate = new RestTemplate();

    public boolean isEnabled() {
        return enabled;
    }

    public void verifyTurnstileToken(String token, String remoteIp) {
        if (!enabled) {
            return;
        }

        if (secretKey == null || secretKey.isBlank()) {
            throw new BusinessException("CAPTCHA_NOT_CONFIGURED",
                    "Human verification is not configured.");
        }

        if (token == null || token.isBlank()) {
            throw new BusinessException("CAPTCHA_REQUIRED",
                    "Human verification is required.");
        }

        TurnstileVerifyResponse response = callTurnstile(token, remoteIp);
        if (response == null || !response.success()) {
            throw new BusinessException("CAPTCHA_INVALID",
                    "Human verification failed. Please try again.");
        }
    }

    private TurnstileVerifyResponse callTurnstile(String token, String remoteIp) {
        HttpHeaders headers = new HttpHeaders();
        headers.setContentType(MediaType.APPLICATION_FORM_URLENCODED);

        MultiValueMap<String, String> body = new LinkedMultiValueMap<>();
        body.add("secret", secretKey);
        body.add("response", token);
        if (remoteIp != null && !remoteIp.isBlank() && !"unknown".equalsIgnoreCase(remoteIp)) {
            body.add("remoteip", remoteIp);
        }

        try {
            return restTemplate.postForObject(
                    TURNSTILE_VERIFY_URL,
                    new HttpEntity<>(body, headers),
                    TurnstileVerifyResponse.class
            );
        } catch (RestClientException ex) {
            throw new BusinessException("CAPTCHA_VERIFY_UNAVAILABLE",
                    "Human verification is temporarily unavailable.");
        }
    }

    @JsonIgnoreProperties(ignoreUnknown = true)
    private record TurnstileVerifyResponse(boolean success) {
    }
}
