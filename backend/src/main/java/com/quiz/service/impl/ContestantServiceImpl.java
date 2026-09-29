package com.quiz.service.impl;

import com.quiz.dto.request.ContestantRegisterRequest;
import com.quiz.dto.response.ContestantResponse;
import com.quiz.entity.ContestPhase;
import com.quiz.entity.Contestant;
import com.quiz.entity.EmailVerificationSession;
import com.quiz.entity.EligibleContestant;
import com.quiz.enums.PhaseStatus;
import com.quiz.exception.BusinessException;
import com.quiz.repository.ContestPhaseRepository;
import com.quiz.repository.ContestantRepository;
import com.quiz.service.ContestantService;
import com.quiz.service.EligibleContestantService;
import com.quiz.service.EmailOtpService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import com.quiz.entity.Exam;
import com.quiz.enums.ExamStatus;
import com.quiz.repository.ExamRepository;
import java.security.SecureRandom;
import java.time.LocalDateTime;
import java.util.Base64;
import java.util.List;
import java.util.Optional;

@Slf4j
@Service
@RequiredArgsConstructor
public class ContestantServiceImpl implements ContestantService {

  private static final String DUPLICATE_REGISTRATION_MESSAGE =
          "Email hoặc số điện thoại này đã hoàn thành bài thi trong đợt thi hiện tại.";
  private static final SecureRandom SECURE_RANDOM = new SecureRandom();

  private final ContestantRepository contestantRepository;
  private final ExamRepository examRepository;
  private final ContestPhaseRepository contestPhaseRepository;
  private final EmailOtpService emailOtpService;
  private final EligibleContestantService eligibleContestantService;
  private final PasswordEncoder passwordEncoder;

  @Value("${quiz.exam.start-token-ttl-minutes:10}")
  private long startExamTokenTtlMinutes;

  @Override
  @Transactional
  public ContestantResponse register(ContestantRegisterRequest request) {
    ContestPhase activePhase = contestPhaseRepository.findFirstByStatus(PhaseStatus.ACTIVE)
            .orElseThrow(() -> new BusinessException("NO_ACTIVE_PHASE",
                    "Hiện tại không có đợt thi nào đang mở."));

    // If the phase enforces a whitelist (e.g. Provincial Qualifier for 70 finalists)
    // or an eligibleContestantId was selected, verify the contestant is on the eligible list.
    EligibleContestant eligibleContestant = null;
    if (Boolean.TRUE.equals(activePhase.getRequireWhitelist()) || request.getEligibleContestantId() != null) {
      eligibleContestant = eligibleContestantService.validateAndMatchContestant(
              request.getEligibleContestantId(),
              request.getFullName(),
              request.getUnit()
      );
    }

    String normalizedEmail = emailOtpService.normalizeEmailValue(request.getEmail());
    EmailVerificationSession verificationSession = emailOtpService.requireValidVerificationSession(
            request.getEmail(),
            activePhase.getId(),
            request.getVerificationToken()
    );

    if (!normalizedEmail.equals(verificationSession.getNormalizedEmail())) {
      throw new BusinessException("VERIFICATION_TOKEN_INVALID",
              "Mã xác thực không hợp lệ hoặc đã hết hạn.");
    }

    // Check if contestant already exists for this phone in the active phase (phone is primary unique key)
    Optional<Contestant> byPhone = contestantRepository.findFirstByPhoneAndPhaseId(request.getPhone(), activePhase.getId());
    Contestant existingContestant = byPhone.orElse(null);

    // Enforce email sharing limit (max 10 contestants per email per phase)
    if (existingContestant == null) {
      long emailUsageCount = contestantRepository.countByNormalizedEmailAndPhaseId(normalizedEmail, activePhase.getId());
      if (emailUsageCount >= 10) {
        throw new BusinessException("EMAIL_USAGE_EXCEEDED",
                "Email này đã được sử dụng để đăng ký cho tối đa 10 thí sinh trong đợt thi.");
      }
    } else if (!normalizedEmail.equals(existingContestant.getNormalizedEmail())) {
      long emailUsageCount = contestantRepository.countByNormalizedEmailAndPhaseId(normalizedEmail, activePhase.getId());
      if (emailUsageCount >= 10) {
        throw new BusinessException("EMAIL_USAGE_EXCEEDED",
                "Email này đã được sử dụng để đăng ký cho tối đa 10 thí sinh trong đợt thi.");
      }
    }

    if (existingContestant != null) {
      List<Exam> existingExams = examRepository.findByContestantIdIn(List.of(existingContestant.getId()));
      boolean hasSubmitted = existingExams.stream().anyMatch(e -> e.getStatus() == ExamStatus.SUBMITTED);
      if (hasSubmitted) {
        throwDuplicateRegistration();
      }
      boolean hasInProgress = existingExams.stream().anyMatch(e -> e.getStatus() == ExamStatus.IN_PROGRESS);
      if (hasInProgress) {
        // Allow contestant to resume their in-progress exam session
        log.info("Contestant id={} already has an IN_PROGRESS exam. Allowing re-authentication to resume session.",
                existingContestant.getId());
      }
    }

    String startExamToken = generateStartExamToken();
    LocalDateTime now = LocalDateTime.now();

    Contestant contestant;
    if (existingContestant != null) {
      // Reuse existing contestant record if previous attempt did not start an exam or was reset
      contestant = existingContestant;
      contestant.setFullName(request.getFullName().trim());
      contestant.setUnit(request.getUnit().trim());
      contestant.setPhone(request.getPhone());
      contestant.setEmail(request.getEmail().trim());
      contestant.setNormalizedEmail(normalizedEmail);
      contestant.setStartExamTokenHash(passwordEncoder.encode(startExamToken));
      contestant.setStartExamTokenExpiresAt(now.plusMinutes(startExamTokenTtlMinutes));
      contestant.setStartExamTokenConsumedAt(null);
    } else {
      contestant = Contestant.builder()
              .fullName(request.getFullName().trim())
              .unit(request.getUnit().trim())
              .phone(request.getPhone())
              .email(request.getEmail().trim())
              .normalizedEmail(normalizedEmail)
              .startExamTokenHash(passwordEncoder.encode(startExamToken))
              .startExamTokenExpiresAt(now.plusMinutes(startExamTokenTtlMinutes))
              .startExamTokenConsumedAt(null)
              .phase(activePhase)
              .build();
    }

    try {
      contestant = contestantRepository.saveAndFlush(contestant);
    } catch (DataIntegrityViolationException ex) {
      throwDuplicateRegistration();
      return null;
    }

    if (eligibleContestant != null) {
      eligibleContestantService.markAsRegistered(
              eligibleContestant,
              contestant.getId(),
              request.getPhone(),
              request.getEmail().trim()
      );
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
