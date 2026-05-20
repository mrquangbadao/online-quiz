package com.quiz.scheduler;

import com.quiz.entity.Exam;
import com.quiz.entity.AppSetting;
import com.quiz.enums.ExamStatus;
import com.quiz.repository.AppSettingRepository;
import com.quiz.repository.ExamRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.List;

@Slf4j
@Component
@RequiredArgsConstructor
public class ExamExpiryScheduler {

    private final ExamRepository examRepository;
    private final AppSettingRepository settingRepository;

    /** Runs every minute — marks overdue IN_PROGRESS exams as EXPIRED */
    @Scheduled(fixedDelay = 60_000)
    @Transactional
    public void expireOverdueExams() {
        int limitMinutes = settingRepository.findById("exam_time_limit_minutes")
                .map(s -> {
                    try { return Integer.parseInt(s.getValue()); }
                    catch (NumberFormatException e) { return 0; }
                })
                .orElse(0);

        if (limitMinutes <= 0) return;

        LocalDateTime cutoff = LocalDateTime.now().minusMinutes(limitMinutes);
        List<Exam> overdue = examRepository.findByStatusAndStartTimeBefore(ExamStatus.IN_PROGRESS, cutoff);
        if (overdue.isEmpty()) return;

        overdue.forEach(e -> e.setStatus(ExamStatus.EXPIRED));
        examRepository.saveAll(overdue);
        log.info("Expired {} overdue exam(s) (limit={}m, cutoff={})", overdue.size(), limitMinutes, cutoff);
    }
}

