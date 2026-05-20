package com.quiz.repository;

import com.quiz.entity.ContestPhase;
import com.quiz.enums.PhaseStatus;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;

public interface ContestPhaseRepository extends JpaRepository<ContestPhase, Long> {
    Optional<ContestPhase> findFirstByStatus(PhaseStatus status);

    List<ContestPhase> findAllByOrderByCreatedAtDesc();
}
