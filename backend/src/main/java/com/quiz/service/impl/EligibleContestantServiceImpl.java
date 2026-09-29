package com.quiz.service.impl;

import com.quiz.dto.response.EligibleContestantResponse;
import com.quiz.entity.EligibleContestant;
import com.quiz.entity.Exam;
import com.quiz.enums.ExamStatus;
import com.quiz.exception.BusinessException;
import com.quiz.repository.ContestantRepository;
import com.quiz.repository.EligibleContestantRepository;
import com.quiz.repository.ExamRepository;
import com.quiz.service.EligibleContestantService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.Collections;
import java.util.List;
import java.util.Map;
import java.util.Objects;
import java.util.stream.Collectors;

@Slf4j
@Service
@RequiredArgsConstructor
public class EligibleContestantServiceImpl implements EligibleContestantService {

    private final EligibleContestantRepository eligibleContestantRepository;
    private final ExamRepository examRepository;
    private final ContestantRepository contestantRepository;

    @Override
    @Transactional(readOnly = true)
    public List<EligibleContestantResponse> getPublicEligibleList() {
        return eligibleContestantRepository.findAllByOrderByOrderNumberAsc().stream()
                .map(this::mapToPublicResponse)
                .collect(Collectors.toList());
    }

    @Override
    @Transactional(readOnly = true)
    public List<EligibleContestantResponse> getAdminEligibleList() {
        List<EligibleContestant> list = eligibleContestantRepository.findAllByOrderByOrderNumberAsc();
        List<Long> contestantIds = list.stream()
                .map(EligibleContestant::getRegisteredContestantId)
                .filter(Objects::nonNull)
                .collect(Collectors.toList());

        Map<Long, Exam> examMap = contestantIds.isEmpty() ? Collections.emptyMap() :
                examRepository.findByContestantIdIn(contestantIds).stream()
                        .collect(Collectors.toMap(
                                e -> e.getContestant().getId(),
                                e -> e,
                                (e1, e2) -> e1.getId() > e2.getId() ? e1 : e2
                        ));

        return list.stream()
                .map(c -> {
                    Exam exam = c.getRegisteredContestantId() != null ? examMap.get(c.getRegisteredContestantId()) : null;
                    return EligibleContestantResponse.builder()
                            .id(c.getId())
                            .orderNumber(c.getOrderNumber())
                            .fullName(c.getFullName())
                            .unit(c.getUnit())
                            .scoreWeek1(c.getScoreWeek1())
                            .scoreWeek2(c.getScoreWeek2())
                            .scoreWeek3(c.getScoreWeek3())
                            .scoreWeek4(c.getScoreWeek4())
                            .totalScorePreliminary(c.getTotalScorePreliminary())
                            .isRegistered(Boolean.TRUE.equals(c.getIsRegistered()))
                            .phone(c.getPhone())
                            .email(c.getEmail())
                            .examId(exam != null ? exam.getId() : null)
                            .examStatus(exam != null ? exam.getStatus().name() : null)
                            .examScore(exam != null ? exam.getTotalScore() : null)
                            .examDurationSeconds(exam != null ? exam.getDurationSeconds() : null)
                            .build();
                })
                .collect(Collectors.toList());
    }

    @Override
    @Transactional(readOnly = true)
    public EligibleContestant validateAndMatchContestant(Long eligibleContestantId, String fullName, String unit) {
        EligibleContestant candidate;
        if (eligibleContestantId != null) {
            candidate = eligibleContestantRepository.findById(eligibleContestantId)
                    .orElseThrow(() -> new BusinessException("ELIGIBLE_CONTESTANT_NOT_FOUND",
                            "Thí sinh không nằm trong danh sách đủ điều kiện thi vòng loại cấp tỉnh."));
        } else {
            candidate = eligibleContestantRepository.findFirstByFullNameIgnoreCaseAndUnitIgnoreCase(fullName.trim(), unit.trim())
                    .orElseThrow(() -> new BusinessException("NOT_ELIGIBLE_FOR_PHASE",
                            "Họ tên và Đơn vị không khớp với danh sách 70 thí sinh đủ điều kiện thi vòng loại cấp tỉnh."));
        }

        if (Boolean.TRUE.equals(candidate.getIsRegistered())) {
            Long linkedContestantId = candidate.getRegisteredContestantId();
            boolean hasActiveOrSubmittedExam = false;
            if (linkedContestantId != null) {
                hasActiveOrSubmittedExam = examRepository.existsByContestantIdAndStatusIn(
                        linkedContestantId,
                        List.of(ExamStatus.IN_PROGRESS, ExamStatus.SUBMITTED)
                );
            }
            if (hasActiveOrSubmittedExam) {
                throw new BusinessException("CONTESTANT_ALREADY_REGISTERED",
                        "Thí sinh '" + candidate.getFullName() + "' đã hoàn thành hoặc đang tham gia bài thi.");
            }
        }

        return candidate;
    }

    @Override
    @Transactional
    public void markAsRegistered(EligibleContestant eligibleContestant, Long contestantId, String phone, String email) {
        eligibleContestant.setIsRegistered(true);
        eligibleContestant.setRegisteredContestantId(contestantId);
        eligibleContestant.setPhone(phone);
        eligibleContestant.setEmail(email);
        eligibleContestantRepository.save(eligibleContestant);
        log.info("Marked eligible contestant id={} name={} as registered with contestantId={}",
                eligibleContestant.getId(), eligibleContestant.getFullName(), contestantId);
    }

    @Override
    @Transactional
    public EligibleContestantResponse createEligibleContestant(com.quiz.dto.request.EligibleContestantRequest request) {
        EligibleContestant candidate = EligibleContestant.builder()
                .orderNumber(request.getOrderNumber())
                .fullName(request.getFullName().trim())
                .unit(request.getUnit().trim())
                .scoreWeek1(request.getScoreWeek1())
                .scoreWeek2(request.getScoreWeek2())
                .scoreWeek3(request.getScoreWeek3())
                .scoreWeek4(request.getScoreWeek4())
                .totalScorePreliminary(request.getTotalScorePreliminary())
                .phone(request.getPhone())
                .email(request.getEmail())
                .isRegistered(false)
                .build();
        EligibleContestant saved = eligibleContestantRepository.save(candidate);
        log.info("Created eligible contestant id={} name={}", saved.getId(), saved.getFullName());
        return mapToPublicResponse(saved);
    }

    @Override
    @Transactional
    public EligibleContestantResponse updateEligibleContestant(Long id, com.quiz.dto.request.EligibleContestantRequest request) {
        EligibleContestant candidate = eligibleContestantRepository.findById(id)
                .orElseThrow(() -> new BusinessException("ELIGIBLE_CONTESTANT_NOT_FOUND", "Không tìm thấy thí sinh"));

        candidate.setOrderNumber(request.getOrderNumber());
        candidate.setFullName(request.getFullName().trim());
        candidate.setUnit(request.getUnit().trim());
        candidate.setScoreWeek1(request.getScoreWeek1());
        candidate.setScoreWeek2(request.getScoreWeek2());
        candidate.setScoreWeek3(request.getScoreWeek3());
        candidate.setScoreWeek4(request.getScoreWeek4());
        candidate.setTotalScorePreliminary(request.getTotalScorePreliminary());
        if (request.getPhone() != null) candidate.setPhone(request.getPhone().trim());
        if (request.getEmail() != null) candidate.setEmail(request.getEmail().trim());

        EligibleContestant saved = eligibleContestantRepository.save(candidate);
        log.info("Updated eligible contestant id={} name={}", saved.getId(), saved.getFullName());
        return mapToPublicResponse(saved);
    }

    @Override
    @Transactional
    public void deleteEligibleContestant(Long id) {
        EligibleContestant candidate = eligibleContestantRepository.findById(id)
                .orElseThrow(() -> new BusinessException("ELIGIBLE_CONTESTANT_NOT_FOUND", "Không tìm thấy thí sinh"));
        eligibleContestantRepository.delete(candidate);
        log.info("Deleted eligible contestant id={} name={}", id, candidate.getFullName());
    }

    @Override
    @Transactional
    public void resetContestantRegistration(Long id) {
        EligibleContestant candidate = eligibleContestantRepository.findById(id)
                .orElseThrow(() -> new BusinessException("ELIGIBLE_CONTESTANT_NOT_FOUND", "Không tìm thấy thí sinh"));

        Long contestantId = candidate.getRegisteredContestantId();
        if (contestantId != null) {
            // Delete any exams for this contestant
            List<Exam> exams = examRepository.findByContestantIdIn(List.of(contestantId));
            if (!exams.isEmpty()) {
                examRepository.deleteAll(exams);
                examRepository.flush();
                log.info("Deleted {} exams associated with contestantId={}", exams.size(), contestantId);
            }
            // Delete contestant record so their email & phone are freed
            contestantRepository.deleteById(contestantId);
            log.info("Deleted contestant record id={} associated with eligible contestant id={}", contestantId, id);
        }

        candidate.setIsRegistered(false);
        candidate.setPhone(null);
        candidate.setEmail(null);
        candidate.setRegisteredContestantId(null);
        eligibleContestantRepository.save(candidate);
        log.info("Reset registration status for eligible contestant id={} name={}", id, candidate.getFullName());
    }

    private EligibleContestantResponse mapToPublicResponse(EligibleContestant entity) {
        return EligibleContestantResponse.builder()
                .id(entity.getId())
                .orderNumber(entity.getOrderNumber())
                .fullName(entity.getFullName())
                .unit(entity.getUnit())
                .scoreWeek1(entity.getScoreWeek1())
                .scoreWeek2(entity.getScoreWeek2())
                .scoreWeek3(entity.getScoreWeek3())
                .scoreWeek4(entity.getScoreWeek4())
                .totalScorePreliminary(entity.getTotalScorePreliminary())
                .isRegistered(Boolean.TRUE.equals(entity.getIsRegistered()))
                .build();
    }
}
