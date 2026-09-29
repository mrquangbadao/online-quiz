package com.quiz.scheduler;

import com.quiz.service.ExamService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;

@Slf4j
@Component
@RequiredArgsConstructor
public class ExamExpiryScheduler {

    private final ExamService examService;

    /** Runs every minute — auto-grades and submits overdue IN_PROGRESS exams */
    @Scheduled(fixedDelay = 60_000)
    public void expireOverdueExams() {
        try {
            examService.autoSubmitOverdueExams();
        } catch (Exception ex) {
            log.error("Error running autoSubmitOverdueExams scheduler", ex);
        }
    }
}

