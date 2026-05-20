package com.quiz.dto.response;

import lombok.Builder;
import lombok.Data;

@Data @Builder
public class ContestantResponse {
    private Long contestantId;
    private String fullName;
    private String unit;
}
