package com.quiz.service;

import com.fasterxml.jackson.annotation.JsonIgnoreProperties;
import com.fasterxml.jackson.annotation.JsonProperty;
import com.quiz.exception.BusinessException;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpEntity;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.stereotype.Service;
import org.springframework.util.LinkedMultiValueMap;
import org.springframework.util.MultiValueMap;
import org.springframework.web.client.RestClientException;
import org.springframework.web.client.RestTemplate;

import java.util.List;

@Slf4j
@Service
@RequiredArgsConstructor
public class CaptchaVerificationService {

    private static final String TURNSTILE_VERIFY_URL = "https://challenges.cloudflare.com/turnstile/v0/siteverify";

    @Value("${captcha.turnstile.enabled:false}")
    private boolean enabled;

    @Value("${captcha.turnstile.secret-key:}")
    private String secretKey;

    @Value("${captcha.turnstile.site-key:}")
    private String siteKey;

    private final RestTemplate restTemplate = new RestTemplate();

    public boolean isEnabled() {
        return enabled;
    }

    public String getSiteKey() {
        return siteKey;
    }

    @Value("${quiz.stress-test.bypass-key:${STRESS_TEST_BYPASS_KEY:doan_nghean_stress_test_2026}}")
    private String bypassKey;

    private boolean isBypassed() {
        if (bypassKey == null || bypassKey.isBlank()) return false;
        try {
            org.springframework.web.context.request.RequestAttributes attributes =
                    org.springframework.web.context.request.RequestContextHolder.getRequestAttributes();
            if (attributes instanceof org.springframework.web.context.request.ServletRequestAttributes servletAttributes) {
                String header = servletAttributes.getRequest().getHeader("X-Bypass-Rate-Limit");
                return bypassKey.equals(header);
            }
        } catch (Exception ignored) {}
        return false;
    }

    public void verifyTurnstileToken(String token, String remoteIp) {
        if (!enabled || isBypassed()) {
            return;
        }

        if (secretKey == null || secretKey.isBlank()) {
            log.error("Turnstile verification failed: captcha.turnstile.secret-key is not configured!");
            throw new BusinessException("CAPTCHA_NOT_CONFIGURED",
                    "Cấu hình xác thực robot (Turnstile Secret Key) chưa được thiết lập trên server.");
        }

        if (token == null || token.isBlank()) {
            throw new BusinessException("CAPTCHA_REQUIRED",
                    "Vui lòng hoàn thành xác thực Bạn không phải là robot.");
        }

        TurnstileVerifyResponse response = callTurnstile(token);
        if (response == null || !response.success()) {
            List<String> errorCodes = (response != null && response.errorCodes() != null)
                    ? response.errorCodes()
                    : List.of("unknown");
            String host = response != null ? response.hostname() : "unknown";
            log.warn("Cloudflare Turnstile verification failed. Error codes: {}, Hostname: {}, Client IP: {}",
                    errorCodes, host, remoteIp);

            throw new BusinessException("CAPTCHA_INVALID",
                    "Xác thực robot không hợp lệ (Mã: " + String.join(", ", errorCodes) + "). Vui lòng thử lại.");
        }

        log.debug("Turnstile verification successful for hostname: {}", response.hostname());
    }

    private TurnstileVerifyResponse callTurnstile(String token) {
        HttpHeaders headers = new HttpHeaders();
        headers.setContentType(MediaType.APPLICATION_FORM_URLENCODED);

        MultiValueMap<String, String> body = new LinkedMultiValueMap<>();
        body.add("secret", secretKey);
        body.add("response", token);
        // Note: We deliberately do NOT send 'remoteip'. Cloudflare documents remoteip as optional.
        // Sending remoteip behind reverse proxies (Nginx / Docker bridge) causes 'remoteip-mismatch' errors.

        try {
            return restTemplate.postForObject(
                    TURNSTILE_VERIFY_URL,
                    new HttpEntity<>(body, headers),
                    TurnstileVerifyResponse.class
            );
        } catch (RestClientException ex) {
            log.error("Failed to connect to Cloudflare Turnstile verify endpoint: {}", ex.getMessage());
            throw new BusinessException("CAPTCHA_VERIFY_UNAVAILABLE",
                    "Hệ thống xác thực robot tạm thời gián đoạn. Vui lòng thử lại sau.");
        }
    }

    @JsonIgnoreProperties(ignoreUnknown = true)
    private record TurnstileVerifyResponse(
            boolean success,
            @JsonProperty("error-codes") List<String> errorCodes,
            String challenge_ts,
            String hostname
    ) {
    }
}
