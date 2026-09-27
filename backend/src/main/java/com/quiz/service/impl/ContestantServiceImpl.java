package com.quiz.service.impl;

import com.quiz.dto.request.ContestantRegisterRequest;
import com.quiz.dto.response.ContestantResponse;
import com.quiz.entity.ContestPhase;
import com.quiz.entity.Contestant;
import com.quiz.entity.EmailVerificationSession;
import com.quiz.enums.PhaseStatus;
import com.quiz.exception.BusinessException;
import com.quiz.repository.ContestPhaseRepository;
import com.quiz.repository.ContestantRepository;
import com.quiz.service.ContestantService;
import com.quiz.service.EmailOtpService;
import lombok.RequiredArgsConstructor;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.security.SecureRandom;
import java.time.LocalDateTime;
import java.util.Base64;

@Service
@RequiredArgsConstructor
public class ContestantServiceImpl implements ContestantService {

  private static final String DUPLICATE_REGISTRATION_MESSAGE =
          "The email address or phone number has already participated in the current phase.";
  private static final SecureRandom SECURE_RANDOM = new SecureRandom();

  private final ContestantRepository contestantRepository;
  private final ContestPhaseRepository contestPhaseRepository;
  private final EmailOtpService emailOtpService;
  private final PasswordEncoder passwordEncoder;

  @Value("${quiz.exam.start-token-ttl-minutes:10}")
  private long startExamTokenTtlMinutes;

  @Override
  @Transactional
  public ContestantResponse register(ContestantRegisterRequest request) {
    ContestPhase activePhase = contestPhaseRepository.findFirstByStatus(PhaseStatus.ACTIVE)
            .orElseThrow(() -> new BusinessException("NO_ACTIVE_PHASE",
                    "The contest phase is not active at the moment."));

    String normalizedEmail = emailOtpService.normalizeEmailValue(request.getEmail());
    EmailVerificationSession verificationSession = emailOtpService.requireValidVerificationSession(
            request.getEmail(),
            activePhase.getId(),
            request.getVerificationToken()
    );

    if (!normalizedEmail.equals(verificationSession.getNormalizedEmail())) {
      throw new BusinessException("VERIFICATION_TOKEN_INVALID",
              "The verification token is invalid or has expired.");
    }

    if (contestantRepository.existsByNormalizedEmailAndPhaseId(normalizedEmail, activePhase.getId())) {
      throwDuplicateRegistration();
    }

    if (contestantRepository.existsByPhoneAndPhaseId(request.getPhone(), activePhase.getId())) {
      throwDuplicateRegistration();
    }

    String startExamToken = generateStartExamToken();
    LocalDateTime now = LocalDateTime.now();

    Contestant contestant = Contestant.builder()
            .fullName(request.getFullName().trim())
            .unit(request.getUnit().trim())
            .phone(request.getPhone())
            .email(request.getEmail().trim())
            .normalizedEmail(normalizedEmail)
            // The start token is issued only after OTP verification and is consumed
            // by the next /exams/start call to prevent contestantId-only bypasses.
            .startExamTokenHash(passwordEncoder.encode(startExamToken))
            .startExamTokenExpiresAt(now.plusMinutes(startExamTokenTtlMinutes))
            .startExamTokenConsumedAt(null)
            .phase(activePhase)
            .build();

    try {
      contestant = contestantRepository.saveAndFlush(contestant);
    } catch (DataIntegrityViolationException ex) {
      throwDuplicateRegistration();
      return null;
    }

    emailOtpService.consumeVerificationSession(verificationSession);

    return ContestantResponse.builder()
            .contestantId(contestant.getId())
            .fullName(contestant.getFullName())
            .unit(contestant.getUnit())
            .startExamToken(startExamToken)
            .build();
  }

  private void throwDuplicateRegistration() {
    throw new BusinessException("ALREADY_PARTICIPATED", DUPLICATE_REGISTRATION_MESSAGE);
  }

  private String generateStartExamToken() {
    byte[] bytes = new byte[24];
    SECURE_RANDOM.nextBytes(bytes);
    return Base64.getUrlEncoder().withoutPadding().encodeToString(bytes);
  }
}
