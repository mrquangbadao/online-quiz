package com.quiz.dto.response;

import lombok.Builder;
import lombok.Data;

import java.util.List;

@Data @Builder
public class LeaderboardResponse {
    private List<LeaderboardEntry> entries;
    private long totalParticipants;

    @Data @Builder
    public static class LeaderboardEntry {
        private int rank;
        private Long examId;
        private String fullName;
        private String unit;
        private String phone;
        private int totalScore;
        private long durationSeconds;
        private int prediction;
    }
}