package com.quiz.dto.response;

import lombok.Builder;
import lombok.Data;

import java.util.List;

@Data @Builder
public class ExamResultResponse {
    private Long examId;
    private int mcScore;
    private int scenarioScore;
    private int totalScore;
    private long durationSeconds;
    private int prediction;
    private List<AnswerResultDto> answers;

    @Data @Builder
    public static class AnswerResultDto {
        private Long questionId;
        private String questionType;
        private String selectedAnswer;
        private String correctAnswer;
        private boolean isCorrect;
    }
}
