package com.quiz.repository;

import com.quiz.entity.LivePlayer;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;

public interface LivePlayerRepository extends JpaRepository<LivePlayer, Long> {
    List<LivePlayer> findBySessionIdOrderByOrderNumberAsc(Long sessionId);
    List<LivePlayer> findBySessionIdOrderByTotalScoreDescRound1TotalTimeMsAsc(Long sessionId);
    Optional<LivePlayer> findBySessionIdAndOrderNumber(Long sessionId, Integer orderNumber);
    Optional<LivePlayer> findBySessionIdAndContestantId(Long sessionId, Long contestantId);
    Optional<LivePlayer> findBySessionIdAndEmail(Long sessionId, String email);
    Optional<LivePlayer> findFirstBySessionIdAndEmailIgnoreCase(Long sessionId, String email);
    void deleteBySessionId(Long sessionId);
}
