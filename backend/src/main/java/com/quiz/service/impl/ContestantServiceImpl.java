package com.quiz.service.impl;

import com.quiz.dto.request.ContestantRegisterRequest;
import com.quiz.dto.response.ContestantResponse;
import com.quiz.entity.ContestPhase;
import com.quiz.entity.Contestant;
import com.quiz.enums.PhaseStatus;
import com.quiz.exception.BusinessException;
import com.quiz.repository.ContestPhaseRepository;
import com.quiz.repository.ContestantRepository;
import com.quiz.service.ContestantService;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
@RequiredArgsConstructor
public class ContestantServiceImpl implements ContestantService {

  private final ContestantRepository contestantRepository;
  private final ContestPhaseRepository contestPhaseRepository;

  @Override
  @Transactional
  public ContestantResponse register(ContestantRegisterRequest request) {
    // Require an active phase
    ContestPhase activePhase = contestPhaseRepository.findFirstByStatus(PhaseStatus.ACTIVE)
            .orElseThrow(() -> new BusinessException("NO_ACTIVE_PHASE",
                    "Cuộc thi chưa được mở. Vui lòng liên hệ ban tổ chức."));

    // Check if phone already registered in the current phase
    if (contestantRepository.existsByPhoneAndPhaseId(request.getPhone(), activePhase.getId())) {
      throw new BusinessException("ALREADY_PARTICIPATED", "Số điện thoại này đã tham gia thi trong đợt hiện tại");
    }

    Contestant contestant = Contestant.builder()
            .fullName(request.getFullName())
            .unit(request.getUnit())
            .phone(request.getPhone())
            .email(request.getEmail())
            .phase(activePhase)
            .build();

    contestant = contestantRepository.save(contestant);

    return ContestantResponse.builder()
            .contestantId(contestant.getId())
            .fullName(contestant.getFullName())
            .unit(contestant.getUnit())
            .build();
  }
}

