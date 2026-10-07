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
  private final com.quiz.repository.LiveSessionRepository liveSessionRepository;
  private final com.quiz.service.LiveArenaService liveArenaService;
  private final com.quiz.repository.ContestantRepository contestantRepository;

  @Override
  @Transactional
  public ContestPhase startPhase(String name) {
    return startPhase(name, "STANDARD", null, null, null, null);
  }

  @Override
  @Transactional
  public ContestPhase startPhase(String name, Boolean requireWhitelist, Integer mcQuestionCount,
                                 Integer timeLimitMinutes, Boolean hasScenarios) {
    return startPhase(name, "STANDARD", requireWhitelist, mcQuestionCount, timeLimitMinutes, hasScenarios);
  }

  @Override
  @Transactional
  public ContestPhase startPhase(String name, String phaseType, Boolean requireWhitelist, Integer mcQuestionCount,
                                 Integer timeLimitMinutes, Boolean hasScenarios) {
    // Only 1 contest phase can be active at the same time
    contestPhaseRepository.findFirstByStatus(PhaseStatus.ACTIVE).ifPresent(existing -> {
      throw new BusinessException("ANOTHER_PHASE_ACTIVE",
          "Đang có đợt thi '" + existing.getName() + "' đang diễn ra. Vui lòng kết thúc đợt thi hiện tại trước khi tạo đợt thi mới.");
    });

    String type = (phaseType != null && !phaseType.isBlank()) ? phaseType.trim().toUpperCase() : "STANDARD";

    ContestPhase.ContestPhaseBuilder builder = ContestPhase.builder()
            .name(name)
            .phaseType(type)
            .status(PhaseStatus.ACTIVE)
            .startTime(LocalDateTime.now());

    if ("LIVE_ARENA".equals(type)) {
      builder.requireWhitelist(true);
      builder.mcQuestionCount(10);
      builder.timeLimitMinutes(40);
      builder.hasScenarios(true);
    } else {
      if (requireWhitelist != null) builder.requireWhitelist(requireWhitelist);
      if (mcQuestionCount != null) builder.mcQuestionCount(mcQuestionCount);
      if (timeLimitMinutes != null) builder.timeLimitMinutes(timeLimitMinutes);
      if (hasScenarios != null) builder.hasScenarios(hasScenarios);
    }

    ContestPhase phase = contestPhaseRepository.save(builder.build());

    if ("LIVE_ARENA".equals(type)) {
      liveSessionRepository.findFirstByPhaseIdOrderByCreatedAtDesc(phase.getId()).orElseGet(() -> {
        return liveSessionRepository.save(com.quiz.entity.LiveSession.builder()
                .phaseId(phase.getId())
                .name(phase.getName())
                .status("LOBBY")
                .currentRound(1)
                .currentQuestionIndex(0)
                .round1State("IDLE")
                .build());
      });
    }

    return phase;
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

    // If live arena, mark live session as FINISHED
    if ("LIVE_ARENA".equalsIgnoreCase(phase.getPhaseType())) {
      liveSessionRepository.findFirstByPhaseIdOrderByCreatedAtDesc(id).ifPresent(s -> {
        if (!"FINISHED".equals(s.getStatus())) {
          s.setStatus("FINISHED");
          liveSessionRepository.save(s);
        }
      });
    }

    return savedPhase;
  }

  @Override
  @Transactional
  public void deletePhase(Long id) {
    ContestPhase phase = contestPhaseRepository.findById(id)
            .orElseThrow(() -> new BusinessException("PHASE_NOT_FOUND", "Không tìm thấy giai đoạn thi"));

    // 1. Xóa toàn bộ các phiên thi Vòng Chung kết (LiveSession) liên quan
    liveArenaService.deleteAllSessionsByPhaseId(id);
    if ("LIVE_ARENA".equalsIgnoreCase(phase.getPhaseType()) || "FINALS".equalsIgnoreCase(phase.getPhaseType())) {
      // Nếu là đợt thi Chung kết, dọn dẹp sạch toàn bộ các live sessions còn tồn đọng trong hệ thống
      List<com.quiz.entity.LiveSession> allSessions = liveSessionRepository.findAll();
      for (com.quiz.entity.LiveSession s : allSessions) {
        liveArenaService.deleteSession(s.getId());
      }
    }

    // 2. Reset toàn bộ danh sách 70 thí sinh đủ điều kiện (Eligible Contestant) để làm sạch hoàn toàn dữ liệu test
    List<EligibleContestant> eligibleList = eligibleContestantRepository.findAll();
    for (EligibleContestant ec : eligibleList) {
        ec.setIsRegistered(false);
        ec.setIsSelfRegistered(false);
        ec.setPhone(null);
        ec.setEmail(null);
        ec.setRegisteredContestantId(null);
    }
    eligibleContestantRepository.saveAll(eligibleList);
    eligibleContestantRepository.flush();

    // 3. Xóa toàn bộ bài thi (Exams) thuộc đợt thi này (cascades exam_questions, exam_answers)
    examRepository.deleteAllByPhaseId(id);
    examRepository.flush();

    // 4. Xóa toàn bộ thí sinh đã đăng ký thuộc đợt thi này
    contestantRepository.deleteByPhaseId(id);
    contestantRepository.flush();

    // 5. Xóa đợt thi (cascades email_otp, verification sessions)
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
      ContestPhase savedPhase = contestPhaseRepository.save(phase);

      if ("LIVE_ARENA".equalsIgnoreCase(phase.getPhaseType())) {
        liveSessionRepository.findFirstByPhaseIdOrderByCreatedAtDesc(id).ifPresent(s -> {
          s.setStatus("LOBBY");
          liveSessionRepository.save(s);
        });
      }

      return savedPhase;
  }

  @Override
  public ContestPhase getCurrentPhase() {
    return contestPhaseRepository.findFirstByStatus(PhaseStatus.ACTIVE).orElse(null);
  }
}
