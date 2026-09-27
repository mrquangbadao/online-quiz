package com.quiz.dto.request;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;
import lombok.Data;

@Data
public class ExamStartRequest {

    @NotNull
    private Long contestantId;

    @NotBlank
    @Size(max = 255)
    private String startExamToken;
}
