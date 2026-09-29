package com.quiz.repository;

import com.quiz.entity.EmailOtp;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;

public interface EmailOtpRepository extends JpaRepository<EmailOtp, Long> {
    Optional<EmailOtp> findFirstByNormalizedEmailAndPhaseIdAndUsedAtIsNullOrderByCreatedAtDesc(
            String normalizedEmail, Long phaseId);

    List<EmailOtp> findByNormalizedEmailAndPhaseIdAndUsedAtIsNullOrderByCreatedAtDesc(
            String normalizedEmail, Long phaseId);

    Optional<EmailOtp> findFirstByNormalizedEmailAndPhaseIdOrderByCreatedAtDesc(
            String normalizedEmail, Long phaseId);
}
