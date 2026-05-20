package com.quiz.service.impl;

import com.quiz.entity.ContestPhase;
import com.quiz.enums.PhaseStatus;
import com.quiz.exception.BusinessException;
import com.quiz.repository.ContestPhaseRepository;
import com.quiz.repository.ExamRepository;
import com.quiz.service.ContestPhaseService;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.List;

@Service
@RequiredArgsConstructor
public class ContestPhaseServiceImpl implements ContestPhaseService {

  private final ContestPhaseRepository contestPhaseRepository;
  private final ExamRepository examRepository;

  @Override
  @Transactional
  public ContestPhase startPhase(String name) {
    // Automatically end any currently active phase before creating a new one
    contestPhaseRepository.findFirstByStatus(PhaseStatus.ACTIVE).ifPresent(existing -> {
      existing.setStatus(PhaseStatus.ENDED);
      existing.setEndTime(LocalDateTime.now());
      contestPhaseRepository.save(existing);
    });

    ContestPhase phase = ContestPhase.builder()
            .name(name)
            .status(PhaseStatus.ACTIVE)
            .startTime(LocalDateTime.now())
            .build();
    return contestPhaseRepository.save(phase);
  }

  @Override
  @Transactional
  public ContestPhase stopPhase(Long id) {
    ContestPhase phase = contestPhaseRepository.findById(id)
            .orElseThrow(() -> new BusinessException("PHASE_NOT_FOUND", "Không tìm thấy giai đoạn thi"));
    if (phase.getStatus() == PhaseStatus.ENDED) {
      throw new BusinessException("PHASE_ALREADY_ENDED", "Giai đoạn này đã kết thúc");
    }
    phase.setStatus(PhaseStatus.ENDED);
    phase.setEndTime(LocalDateTime.now());
    return contestPhaseRepository.save(phase);
  }

  @Override
  @Transactional
  public void deletePhase(Long id) {
    ContestPhase phase = contestPhaseRepository.findById(id)
            .orElseThrow(() -> new BusinessException("PHASE_NOT_FOUND", "Không tìm thấy giai đoạn thi"));
    // Delete all exams in this phase (cascades to exam_questions and exam_answers via DB)
    examRepository.deleteAllByPhaseId(id);
    contestPhaseRepository.delete(phase);
  }

  @Override
  public List<ContestPhase> listPhases() {
    return contestPhaseRepository.findAllByOrderByCreatedAtDesc();
  }

  @Override
  public ContestPhase getCurrentPhase() {
    return contestPhaseRepository.findFirstByStatus(PhaseStatus.ACTIVE).orElse(null);
  }
}
