package com.quiz.repository;

import com.quiz.entity.LiveQuestion;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;

public interface LiveQuestionRepository extends JpaRepository<LiveQuestion, Long> {
    List<LiveQuestion> findBySessionIdOrderByQuestionOrderAsc(Long sessionId);
    Optional<LiveQuestion> findBySessionIdAndQuestionOrder(Long sessionId, Integer questionOrder);
    void deleteBySessionId(Long sessionId);
}
