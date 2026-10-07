package com.quiz.repository;

import com.quiz.entity.LiveSession;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;

public interface LiveSessionRepository extends JpaRepository<LiveSession, Long> {
    Optional<LiveSession> findFirstByStatusNotOrderByCreatedAtDesc(String status);
    Optional<LiveSession> findFirstByPhaseIdOrderByCreatedAtDesc(Long phaseId);
    List<LiveSession> findByPhaseId(Long phaseId);
    void deleteByPhaseId(Long phaseId);
    List<LiveSession> findAllByOrderByCreatedAtDesc();
}
