package com.quiz.security;

import jakarta.servlet.http.HttpServletRequest;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Component;

@Component
public class RequestMetadataResolver {

    @Value("${security.trust-forward-headers:false}")
    private boolean trustForwardHeaders;

    public RequestClientMetadata resolve(HttpServletRequest request) {
        return new RequestClientMetadata(
                resolveClientIp(request),
                trimToNull(request.getHeader("User-Agent")),
                trimToNull(request.getHeader("X-Device-Id")),
                request.getRequestURI()
        );
    }

    /**
     * Only trust forwarded headers when the deployment is explicitly configured
     * to sit behind a trusted proxy. This avoids client-side spoofing in direct setups.
     */
    private String resolveClientIp(HttpServletRequest request) {
        if (trustForwardHeaders) {
            String forwardedFor = trimToNull(request.getHeader("X-Forwarded-For"));
            if (forwardedFor != null) {
                return forwardedFor.split(",")[0].trim();
            }

            String realIp = trimToNull(request.getHeader("X-Real-IP"));
            if (realIp != null) {
                return realIp;
            }
        }

        return request.getRemoteAddr();
    }

    private String trimToNull(String value) {
        if (value == null) {
            return null;
        }
        String trimmed = value.trim();
        return trimmed.isEmpty() ? null : trimmed;
    }
}
