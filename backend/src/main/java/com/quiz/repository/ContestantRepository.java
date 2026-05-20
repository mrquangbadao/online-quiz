package com.quiz.repository;

import com.quiz.entity.Contestant;
import org.springframework.data.jpa.repository.JpaRepository;

public interface ContestantRepository extends JpaRepository<Contestant, Long> {
    boolean existsByPhoneAndPhaseId(String phone, Long phaseId);
}
