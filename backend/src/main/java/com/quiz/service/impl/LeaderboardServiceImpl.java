package com.quiz.service.impl;

import com.quiz.dto.response.LeaderboardResponse;
import com.quiz.entity.Exam;
import com.quiz.repository.ExamRepository;
import com.quiz.service.LeaderboardService;
import com.quiz.util.PhoneMaskUtil;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

import java.util.List;
import java.util.concurrent.atomic.AtomicInteger;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class LeaderboardServiceImpl implements LeaderboardService {

  private final ExamRepository examRepository;

  @Override
  public LeaderboardResponse getLeaderboard(Long phaseId) {
    List<Exam> exams = phaseId != null
            ? examRepository.findLeaderboardByPhase(phaseId)
            : examRepository.findLeaderboard();
    AtomicInteger rank = new AtomicInteger(1);

    List<LeaderboardResponse.LeaderboardEntry> entries = exams.stream()
            .map(e -> LeaderboardResponse.LeaderboardEntry.builder()
                    .rank(rank.getAndIncrement())
                    .examId(e.getId())
                    .fullName(e.getContestant().getFullName())
                    .unit(e.getContestant().getUnit())
                    .phone(PhoneMaskUtil.mask(e.getContestant().getPhone()))
                    .totalScore(e.getTotalScore())
                    .durationSeconds(e.getDurationSeconds())
                    .prediction(e.getPrediction() != null ? e.getPrediction() : 0)
                    .build())
            .collect(Collectors.toList());

    return LeaderboardResponse.builder()
            .entries(entries)
            .totalParticipants(exams.size())
            .build();
  }
}

