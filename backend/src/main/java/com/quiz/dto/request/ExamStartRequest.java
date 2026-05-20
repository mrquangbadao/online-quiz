package com.quiz.dto.request;

import jakarta.validation.constraints.NotNull;
import lombok.Data;

@Data
public class ExamStartRequest {

    @NotNull
    private Long contestantId;
}
