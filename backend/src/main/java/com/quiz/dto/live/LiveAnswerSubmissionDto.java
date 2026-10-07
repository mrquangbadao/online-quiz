package com.quiz.dto.live;

import jakarta.validation.constraints.NotNull;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class LiveAnswerSubmissionDto {
    @NotNull
    private Long sessionId;

    @NotNull
    private Long questionId;

    @NotNull
    private Long playerId;

    @NotNull
    private String selectedOption; // A, B, C, D

    private String shuffledOrder; // Ví dụ: "C,A,D,B"
    private Long clientTimestamp;
    private String deviceId;
}
