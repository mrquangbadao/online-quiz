package com.quiz.repository;

import com.quiz.entity.LiveRound3Pair;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;

public interface LiveRound3PairRepository extends JpaRepository<LiveRound3Pair, Long> {
    List<LiveRound3Pair> findBySessionIdOrderByPairNumberAsc(Long sessionId);
    Optional<LiveRound3Pair> findBySessionIdAndPairNumber(Long sessionId, Integer pairNumber);
    void deleteBySessionId(Long sessionId);
}
