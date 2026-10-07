package com.quiz.repository;

import com.quiz.entity.LiveRound2Topic;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;

public interface LiveRound2TopicRepository extends JpaRepository<LiveRound2Topic, Long> {
    List<LiveRound2Topic> findBySessionIdOrderByCodeAsc(Long sessionId);
    Optional<LiveRound2Topic> findBySessionIdAndCode(Long sessionId, String code);
    void deleteBySessionId(Long sessionId);
}
