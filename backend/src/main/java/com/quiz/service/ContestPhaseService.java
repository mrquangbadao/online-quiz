package com.quiz.service;

import com.quiz.entity.ContestPhase;

import java.util.List;

public interface ContestPhaseService {
  ContestPhase startPhase(String name);
  ContestPhase stopPhase(Long id);
  void deletePhase(Long id);
  List<ContestPhase> listPhases();
  ContestPhase getCurrentPhase(); // null if none active
  ContestPhase reactivatePhase(Long id);
}