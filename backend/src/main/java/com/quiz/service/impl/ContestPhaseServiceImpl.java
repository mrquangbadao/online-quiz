package com.quiz.service.impl;

import com.quiz.entity.ContestPhase;
import com.quiz.enums.PhaseStatus;
import com.quiz.exception.BusinessException;
import com.quiz.entity.EligibleContestant;
import com.quiz.repository.ContestPhaseRepository;
import com.quiz.repository.EligibleContestantRepository;
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
  private final EligibleContestantRepository eligibleContestantRepository;
  private final com.quiz.service.ExamService examService;

  @Override
  @Transactional
  public ContestPhase startPhase(String name) {
    return startPhase(name, null, null, null, null);
  }

  @Override
  @Transactional
  public ContestPhase startPhase(String name, Boolean requireWhitelist, Integer mcQuestionCount,
                                 Integer timeLimitMinutes, Boolean hasScenarios) {
    // Only 1 contest phase can be active at the same time
    contestPhaseRepository.findFirstByStatus(PhaseStatus.ACTIVE).ifPresent(existing -> {
      throw new BusinessException("ANOTHER_PHASE_ACTIVE",
          "Đang có đợt thi '" + existing.getName() + "' đang diễn ra. Vui lòng kết thúc đợt thi hiện tại trước khi tạo đợt thi mới.");
    });

    ContestPhase.ContestPhaseBuilder builder = ContestPhase.builder()
            .name(name)
            .status(PhaseStatus.ACTIVE)
            .startTime(LocalDateTime.now());

    if (requireWhitelist != null) builder.requireWhitelist(requireWhitelist);
    if (mcQuestionCount != null) builder.mcQuestionCount(mcQuestionCount);
    if (timeLimitMinutes != null) builder.timeLimitMinutes(timeLimitMinutes);
    if (hasScenarios != null) builder.hasScenarios(hasScenarios);

    ContestPhase phase = builder.build();
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
    ContestPhase savedPhase = contestPhaseRepository.save(phase);

    // Auto-submit all in-progress exams for this phase immediately
    examService.autoSubmitInProgressExamsForPhase(id);

    return savedPhase;
  }

  @Override
  @Transactional
  public void deletePhase(Long id) {
    ContestPhase phase = contestPhaseRepository.findById(id)
            .orElseThrow(() -> new BusinessException("PHASE_NOT_FOUND", "Không tìm thấy giai đoạn thi"));

    // 1. Reset any eligible contestants linked to this phase
    List<EligibleContestant> eligibleList = eligibleContestantRepository.findAll();
    for (EligibleContestant ec : eligibleList) {
        if (Boolean.TRUE.equals(ec.getIsRegistered())) {
            ec.setIsRegistered(false);
            ec.setPhone(null);
            ec.setEmail(null);
            ec.setRegisteredContestantId(null);
        }
    }
    eligibleContestantRepository.saveAll(eligibleList);
    eligibleContestantRepository.flush();

    // 2. Delete all exams in this phase (cascades to questions & answers)
    examRepository.deleteAllByPhaseId(id);
    examRepository.flush();

    // 3. Delete the phase (cascades to contestants, email_otp, email_verification_sessions)
    contestPhaseRepository.delete(phase);
    contestPhaseRepository.flush();
  }

  @Override
  public List<ContestPhase> listPhases() {
    return contestPhaseRepository.findAllByOrderByCreatedAtDesc();
  }

  @Override
  @Transactional
  public ContestPhase reactivatePhase(Long id) {
      ContestPhase phase = contestPhaseRepository.findById(id)
              .orElseThrow(() -> new BusinessException("PHASE_NOT_FOUND", "Không tìm thấy giai đoạn thi"));
      if (phase.getStatus() == PhaseStatus.ACTIVE) {
          throw new BusinessException("PHASE_ALREADY_ACTIVE", "Giai đoạn thi đang hoạt động");
      }
      // Prevent reactivation if another phase is already active
      contestPhaseRepository.findFirstByStatus(PhaseStatus.ACTIVE).ifPresent(existing -> {
          throw new BusinessException("ANOTHER_PHASE_ACTIVE",
                  "Không thể mở lại vì đang có đợt thi '" + existing.getName() + "' đang hoạt động. Hãy kết thúc đợt thi đó trước.");
      });
      phase.setStatus(PhaseStatus.ACTIVE);
      phase.setEndTime(null);
      return contestPhaseRepository.save(phase);
  }

  @Override
  public ContestPhase getCurrentPhase() {
    return contestPhaseRepository.findFirstByStatus(PhaseStatus.ACTIVE).orElse(null);
  }
}
