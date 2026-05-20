package com.quiz.dto.request;

import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotEmpty;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Pattern;
import lombok.Data;

import java.util.List;

@Data
public class ExamSubmitRequest {

    @NotEmpty
    private List<AnswerItem> answers;

    @Min(0) @Max(200)
    private Integer prediction;

    @Data
    public static class AnswerItem {
        @NotNull
        private Long questionId;

        @NotBlank
        @Pattern(regexp = "^(MC|SC)$", message = "questionType phải là MC hoặc SC")
        private String questionType;

        @Pattern(regexp = "^[A-E]$", message = "selectedAnswer phải là A, B, C, D hoặc E")
        private String selectedAnswer; // "A" | "B" | "C" | "D" | "E" | null
    }
}

