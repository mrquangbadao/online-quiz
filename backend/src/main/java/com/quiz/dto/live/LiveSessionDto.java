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
}
