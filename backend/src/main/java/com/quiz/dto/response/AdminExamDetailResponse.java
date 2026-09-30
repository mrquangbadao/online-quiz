package com.quiz.dto.response;

import com.fasterxml.jackson.annotation.JsonFormat;
import lombok.Builder;
import lombok.Data;

import java.time.LocalDateTime;
import java.util.List;

@Data @Builder
public class AdminExamDetailResponse {

    private Long examId;
    private String fullName;
    private String unit;
    private String phone;

    @JsonFormat(pattern = "yyyy-MM-dd'T'HH:mm:ss")
    private LocalDateTime startTime;
    @JsonFormat(pattern = "yyyy-MM-dd'T'HH:mm:ss")
    private LocalDateTime endTime;
    private Long durationSeconds;

    private int mcScore;
    private int scenarioScore;
    private int totalScore;
    private Integer prediction;
    private String status;
    private String phaseName;
    private Boolean hasScenarios;

    private List<AnswerDetail> answers;

    @Data @Builder
    public static class AnswerDetail {
        private Long questionId;
        private String questionType; // "MC" or "SC"
        private String questionContent; // content for MC, title for SC
        private String selectedAnswer;
        private String correctAnswer;
        private Boolean isCorrect;
        private String optionA;
        private String optionB;
        private String optionC;
        private String optionD;
        private String optionE;
    }
}