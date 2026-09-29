package com.quiz.dto.response;

import lombok.Builder;
import lombok.Data;

@Data
@Builder
public class EligibleContestantResponse {
    private Long id;
    private Integer orderNumber;
    private String fullName;
    private String unit;
    private String scoreWeek1;
    private String scoreWeek2;
    private String scoreWeek3;
    private String scoreWeek4;
    private Integer totalScorePreliminary;
    private Boolean isRegistered;
    private String phone;
    private String email;
    private Long examId;
    private String examStatus;
    private Integer examScore;
    private Long examDurationSeconds;
}
