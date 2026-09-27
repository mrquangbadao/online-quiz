package com.quiz.repository;

import com.quiz.entity.EmailVerificationSession;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface EmailVerificationSessionRepository extends JpaRepository<EmailVerificationSession, Long> {
    List<EmailVerificationSession> findByNormalizedEmailAndPhaseIdAndConsumedAtIsNull(
            String normalizedEmail, Long phaseId);

    List<EmailVerificationSession> findByNormalizedEmailAndPhaseIdAndConsumedAtIsNullOrderByVerifiedAtDesc(
            String normalizedEmail, Long phaseId);
}
