package com.quiz.repository;

import com.quiz.entity.LivePlayerAnswer;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;

public interface LivePlayerAnswerRepository extends JpaRepository<LivePlayerAnswer, Long> {
    List<LivePlayerAnswer> findBySessionId(Long sessionId);
    List<LivePlayerAnswer> findBySessionIdAndQuestionId(Long sessionId, Long questionId);
    Optional<LivePlayerAnswer> findBySessionIdAndQuestionIdAndPlayerId(Long sessionId, Long questionId, Long playerId);
    List<LivePlayerAnswer> findBySessionIdAndPlayerIdOrderByQuestionIdAsc(Long sessionId, Long playerId);
    void deleteBySessionId(Long sessionId);
}
