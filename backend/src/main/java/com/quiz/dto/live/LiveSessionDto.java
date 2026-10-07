package com.quiz.dto.live;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;
import java.util.List;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class LiveSessionDto {
    private Long id;
    private Long phaseId;
    private String name;
    private String status; // LOBBY, ROUND1, ROUND2, ROUND3, FINISHED
    private Integer currentRound;
    private Integer currentQuestionIndex;
    private String round1State; // IDLE, HOPE_STAR_5S, VIDEO_PLAYING, QUESTION_READING, QUESTION_40S, ANSWER_REVEALED, LEADERBOARD
    private LocalDateTime createdAt;
    private List<LivePlayerDto> players;
    private LiveQuestionDto currentQuestion;
    private Long questionStartedAt; // Timestamp ms when current question/action started
    private java.util.Map<String, Object> revealedData; // Data populated when round1State is ANSWER_REVEALED or LEADERBOARD
    private Long round2BatchEndAt; // Timestamp ms when round 2 10-minute batch ends
    private Boolean round2BatchRunning; // Whether round 2 10-minute batch is running
    private List<Long> round2BatchPlayerIds; // List of player IDs in current batch
    private java.util.Map<String, Object> round3DuelState; // Current active duel info and timer in Round 3
    private String round3ViewMode; // RULES or PAIRS
}
