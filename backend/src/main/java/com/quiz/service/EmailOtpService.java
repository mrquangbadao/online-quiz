package com.quiz.service;

import com.quiz.dto.request.RequestOtpRequest;
import com.quiz.dto.request.VerifyOtpRequest;
import com.quiz.dto.response.RequestOtpResponse;
import com.quiz.dto.response.VerifyOtpResponse;
import com.quiz.entity.ContestPhase;
import com.quiz.entity.EmailOtp;
import com.quiz.entity.EmailVerificationSession;
import com.quiz.enums.PhaseStatus;
import com.quiz.exception.BusinessException;
import com.quiz.repository.ContestPhaseRepository;
import com.quiz.repository.EmailOtpRepository;
import com.quiz.repository.EmailVerificationSessionRepository;
import com.quiz.security.RequestRateLimiter;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.mail.MailException;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.security.SecureRandom;
import java.time.Duration;
import java.time.LocalDateTime;
import java.util.Base64;
import java.util.List;

@Slf4j
@Service
@RequiredArgsConstructor
public class EmailOtpService {

    private static final SecureRandom SECURE_RANDOM = new SecureRandom();

    private final ContestPhaseRepository contestPhaseRepository;
    private final EmailOtpRepository emailOtpRepository;
    private final EmailVerificationSessionRepository verificationSessionRepository;
    private final EmailDeliveryService emailDeliveryService;
    private final PasswordEncoder passwordEncoder;
    private final RequestRateLimiter requestRateLimiter;

    @Value("${quiz.otp.ttl-minutes:5}")
    private long otpTtlMinutes;

    @Value("${quiz.otp.resend-cooldown-seconds:60}")
    private long resendCooldownSeconds;

    @Value("${quiz.otp.max-attempts:5}")
    private int otpMaxAttempts;

    @Value("${quiz.otp.email-request-limit:3}")
    private int otpEmailRequestLimit;

    @Value("${quiz.otp.email-request-window-minutes:10}")
    private long otpEmailRequestWindowMinutes;

    @Value("${quiz.otp.verification-session-ttl-minutes:10}")
    private long verificationSessionTtlMinutes;

    @Transactional
    public RequestOtpResponse requestOtp(RequestOtpRequest request) {
        ContestPhase activePhase = requireActivePhase();
        String normalizedEmail = normalizeEmail(request.getEmail());

        rateLimitRequestOtpByEmail(normalizedEmail, activePhase.getId());

        EmailOtp latestOtp = emailOtpRepository
                .findFirstByNormalizedEmailAndPhaseIdAndUsedAtIsNullOrderByCreatedAtDesc(
                        normalizedEmail, activePhase.getId())
                .orElse(null);

        enforceResendCooldown(latestOtp);
        invalidateUnusedOtps(normalizedEmail, activePhase.getId());

        String otpCode = generateOtpCode();
        LocalDateTime now = LocalDateTime.now();
        EmailOtp emailOtp = EmailOtp.builder()
                .email(request.getEmail().trim())
                .normalizedEmail(normalizedEmail)
                .phase(activePhase)
                .otpHash(passwordEncoder.encode(otpCode))
                .expiresAt(now.plusMinutes(otpTtlMinutes))
                .attempts(0)
                .maxAttempts(otpMaxAttempts)
                .lastSentAt(now)
                .build();

        emailOtpRepository.save(emailOtp);

        try {
            emailDeliveryService.sendOtpEmail(request.getEmail().trim(), otpCode);
        } catch (MailException ex) {
            log.error("Failed to deliver OTP email to {}: {}", normalizedEmail, ex.getMessage(), ex);
            emailOtpRepository.delete(emailOtp);
            throw new BusinessException("OTP_DELIVERY_FAILED",
                    "Unable to send OTP email at the moment. Please try again.");
        }

        return RequestOtpResponse.builder()
                .expiresInSeconds(Duration.ofMinutes(otpTtlMinutes).toSeconds())
                .resendAvailableInSeconds(resendCooldownSeconds)
                .build();
    }

    @Transactional(noRollbackFor = BusinessException.class)
    public VerifyOtpResponse verifyOtp(VerifyOtpRequest request) {
        ContestPhase activePhase = requireActivePhase();
        String normalizedEmail = normalizeEmail(request.getEmail());

        rateLimitVerifyOtpByEmail(normalizedEmail, activePhase.getId());

        EmailOtp emailOtp = emailOtpRepository
                .findFirstByNormalizedEmailAndPhaseIdAndUsedAtIsNullOrderByCreatedAtDesc(
                        normalizedEmail, activePhase.getId())
                .orElseThrow(() -> new BusinessException("OTP_NOT_FOUND",
                        "No active OTP request was found for this email."));

        if (emailOtp.getExpiresAt().isBefore(LocalDateTime.now())) {
            // Expired OTPs are marked as used so the same code cannot be retried indefinitely.
            emailOtp.setUsedAt(LocalDateTime.now());
            emailOtpRepository.save(emailOtp);
            throw new BusinessException("OTP_EXPIRED", "The OTP code has expired.");
        }

        if (emailOtp.getAttempts() >= emailOtp.getMaxAttempts()) {
            throw new BusinessException("OTP_ATTEMPTS_EXCEEDED",
                    "The OTP code has exceeded the allowed number of attempts.");
        }

        if (!passwordEncoder.matches(request.getOtp(), emailOtp.getOtpHash())) {
            // Failed attempts must survive the business exception to enforce OTP brute-force limits.
            emailOtp.setAttempts(emailOtp.getAttempts() + 1);
            emailOtpRepository.save(emailOtp);
            throw new BusinessException("OTP_INVALID", "The OTP code is invalid.");
        }

        LocalDateTime now = LocalDateTime.now();
        emailOtp.setUsedAt(now);
        emailOtpRepository.save(emailOtp);

        invalidateVerificationSessions(normalizedEmail, activePhase.getId());

        String verificationToken = generateVerificationToken();
        verificationSessionRepository.save(EmailVerificationSession.builder()
                .email(request.getEmail().trim())
                .normalizedEmail(normalizedEmail)
                .phase(activePhase)
                .tokenHash(passwordEncoder.encode(verificationToken))
                .verifiedAt(now)
                .expiresAt(now.plusMinutes(verificationSessionTtlMinutes))
                .build());

        return VerifyOtpResponse.builder()
                .verificationToken(verificationToken)
                .expiresInSeconds(Duration.ofMinutes(verificationSessionTtlMinutes).toSeconds())
                .build();
    }

    @Transactional(readOnly = true)
    public EmailVerificationSession requireValidVerificationSession(String email,
                                                                    Long phaseId,
                                                                    String verificationToken) {
        String normalizedEmail = normalizeEmail(email);
        List<EmailVerificationSession> sessions = verificationSessionRepository
                .findByNormalizedEmailAndPhaseIdAndConsumedAtIsNullOrderByVerifiedAtDesc(normalizedEmail, phaseId);

        LocalDateTime now = LocalDateTime.now();
        for (EmailVerificationSession session : sessions) {
            if (session.getExpiresAt().isBefore(now)) {
                continue;
            }
            if (passwordEncoder.matches(verificationToken, session.getTokenHash())) {
                return session;
            }
        }

        throw new BusinessException("VERIFICATION_TOKEN_INVALID",
                "The verification token is invalid or has expired.");
    }

    @Transactional
    public void consumeVerificationSession(EmailVerificationSession session) {
        session.setConsumedAt(LocalDateTime.now());
        verificationSessionRepository.save(session);
    }

    public String normalizeEmailValue(String email) {
        return normalizeEmail(email);
    }

    private ContestPhase requireActivePhase() {
        return contestPhaseRepository.findFirstByStatus(PhaseStatus.ACTIVE)
                .orElseThrow(() -> new BusinessException("NO_ACTIVE_PHASE",
                        "The contest phase is not active at the moment."));
    }

    private void enforceResendCooldown(EmailOtp latestOtp) {
        if (latestOtp == null || latestOtp.getLastSentAt() == null) {
            return;
        }

        long elapsedSeconds = Duration.between(latestOtp.getLastSentAt(), LocalDateTime.now()).getSeconds();
        if (elapsedSeconds < resendCooldownSeconds) {
            long waitSeconds = resendCooldownSeconds - Math.max(elapsedSeconds, 0);
            throw new BusinessException("TOO_MANY_REQUESTS",
                    "Please wait " + waitSeconds + " seconds before requesting another OTP.");
        }
    }

    private void invalidateUnusedOtps(String normalizedEmail, Long phaseId) {
        List<EmailOtp> unusedOtps = emailOtpRepository
                .findByNormalizedEmailAndPhaseIdAndUsedAtIsNullOrderByCreatedAtDesc(normalizedEmail, phaseId);
        if (unusedOtps.isEmpty()) {
            return;
        }

        LocalDateTime now = LocalDateTime.now();
        unusedOtps.forEach(otp -> otp.setUsedAt(now));
        emailOtpRepository.saveAll(unusedOtps);
    }

    private void invalidateVerificationSessions(String normalizedEmail, Long phaseId) {
        List<EmailVerificationSession> sessions = verificationSessionRepository
                .findByNormalizedEmailAndPhaseIdAndConsumedAtIsNull(normalizedEmail, phaseId);
        if (sessions.isEmpty()) {
            return;
        }

        LocalDateTime now = LocalDateTime.now();
        sessions.forEach(session -> session.setConsumedAt(now));
        verificationSessionRepository.saveAll(sessions);
    }

    private void rateLimitRequestOtpByEmail(String normalizedEmail, Long phaseId) {
        requestRateLimiter.checkAndIncrement(
                "auth_request_otp_email",
                otpEmailRequestLimit,
                Duration.ofMinutes(otpEmailRequestWindowMinutes),
                "Too many OTP requests for this email. Try again later.",
                normalizedEmail + ":" + phaseId
        );
    }

    private void rateLimitVerifyOtpByEmail(String normalizedEmail, Long phaseId) {
        requestRateLimiter.checkAndIncrement(
                "auth_verify_otp_email",
                otpMaxAttempts,
                Duration.ofMinutes(otpEmailRequestWindowMinutes),
                "Too many OTP verification attempts for this email. Try again later.",
                normalizedEmail + ":" + phaseId
        );
    }

    private String normalizeEmail(String email) {
        return email == null ? null : email.trim().toLowerCase();
    }

    private String generateOtpCode() {
        int value = SECURE_RANDOM.nextInt(900_000) + 100_000;
        return Integer.toString(value);
    }

    private String generateVerificationToken() {
        byte[] bytes = new byte[24];
        SECURE_RANDOM.nextBytes(bytes);
        return Base64.getUrlEncoder().withoutPadding().encodeToString(bytes);
    }
}
