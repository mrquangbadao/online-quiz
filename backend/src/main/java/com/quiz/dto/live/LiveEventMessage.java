package com.quiz.dto.live;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.Instant;

/**
 * Universal WebSocket STOMP message payload for Live Arena.
 */
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class LiveEventMessage {
    private String eventType; // SESSION_STATUS_CHANGED, HOPE_STAR_STARTED, HOPE_STAR_ACTIVATED, VIDEO_PLAYING, QUESTION_READING, QUESTION_STARTED, QUESTION_TICK, ANSWER_REVEALED, LEADERBOARD_UPDATED, ROUND2_TOPIC_ASSIGNED, ROUND3_PAIR_DRAWN, WINNERS_ANNOUNCED
    private Long sessionId;
    private Integer round;
    private Integer questionIndex;
    private Object payload;
    @Builder.Default
    private long timestamp = Instant.now().toEpochMilli();
}
