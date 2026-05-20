package com.quiz.dto.response;

import lombok.Builder;
import lombok.Data;

import java.time.LocalDateTime;
import java.util.List;

@Data @Builder
public class ExamStartResponse {
    private Long examId;
    private LocalDateTime startTime;
    private int timeLimitMinutes;   // 0 = no limit
    private List<MCQuestionDto> multipleChoiceQuestions;
    private List<ScenarioQuestionDto> scenarioQuestions;

    @Data @Builder
    public static class MCQuestionDto {
        private int order;
        private Long questionId;
        private String content;
        private String optionA;
        private String optionB;
        private String optionC;
        private String optionD; // nullable — absent for 3-option questions
        private String optionE; // nullable — present only for 5-option questions
    }

    @Data @Builder
    public static class ScenarioQuestionDto {
        private int order;
        private Long questionId;
        private String title;
        private String description;
        private String videoUrl;
        private String optionA;
        private String optionB;
        private String optionC;
        private String optionD; // nullable
        private String optionE; // nullable
    }
}
