package com.quiz.repository;

import com.quiz.entity.Contestant;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.Optional;

public interface ContestantRepository extends JpaRepository<Contestant, Long> {
    boolean existsByPhoneAndPhaseId(String phone, Long phaseId);
    boolean existsByNormalizedEmailAndPhaseId(String normalizedEmail, Long phaseId);

    Optional<Contestant> findFirstByNormalizedEmailAndPhaseId(String normalizedEmail, Long phaseId);
    Optional<Contestant> findFirstByPhoneAndPhaseId(String phone, Long phaseId);
    long countByNormalizedEmailAndPhaseId(String normalizedEmail, Long phaseId);
}

