package com.quiz.service;

import com.quiz.entity.ContestPhase;

import java.util.List;

public interface ContestPhaseService {
  ContestPhase startPhase(String name);
  ContestPhase startPhase(String name, Boolean requireWhitelist, Integer mcQuestionCount,
                          Integer timeLimitMinutes, Boolean hasScenarios);
  ContestPhase startPhase(String name, String phaseType, Boolean requireWhitelist, Integer mcQuestionCount,
                          Integer timeLimitMinutes, Boolean hasScenarios);
  ContestPhase stopPhase(Long id);
  void deletePhase(Long id);
  List<ContestPhase> listPhases();
  ContestPhase getCurrentPhase(); // null if none active
  ContestPhase reactivatePhase(Long id);
}