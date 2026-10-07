package com.quiz.entity;

import jakarta.persistence.*;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;
import lombok.*;
import org.hibernate.annotations.CreationTimestamp;

import java.math.BigDecimal;
import java.time.LocalDateTime;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
@Entity
@Table(name = "live_player_answers", schema = "public", indexes = {
        @Index(name = "idx_live_player_answers_session_id", columnList = "session_id"),
        @Index(name = "idx_live_player_answers_question_id", columnList = "question_id")
}, uniqueConstraints = {
        @UniqueConstraint(name = "uq_player_question", columnNames = {"session_id", "question_id", "player_id"})
})
public class LivePlayerAnswer {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "id", nullable = false)
    private Long id;

    @NotNull
    @Column(name = "session_id", nullable = false)
    private Long sessionId;

    @NotNull
    @Column(name = "question_id", nullable = false)
    private Long questionId;

    @NotNull
    @Column(name = "player_id", nullable = false)
    private Long playerId;

    @Column(name = "selected_option", columnDefinition = "TEXT")
    private String selectedOption; // A, B, C, D hoặc nội dung đáp án thí sinh đã chọn

    @Size(max = 20)
    @NotNull
    @Column(name = "shuffled_order", nullable = false, length = 20)
    private String shuffledOrder; // Ví dụ: "B,D,A,C"

    @Builder.Default
    @Column(name = "has_hope_star", nullable = false)
    private Boolean hasHopeStar = false;

    @Builder.Default
    @Column(name = "is_correct", nullable = false)
    private Boolean isCorrect = false;

    @Builder.Default
    @Column(name = "response_time_ms", nullable = false)
    private Long responseTimeMs = 0L;

    @Builder.Default
    @Column(name = "score_awarded", nullable = false, precision = 5, scale = 1)
    private BigDecimal scoreAwarded = BigDecimal.ZERO;

    @CreationTimestamp
    @Column(name = "server_received_at")
    private LocalDateTime serverReceivedAt;

    @CreationTimestamp
    @Column(name = "created_at", updatable = false)
    private LocalDateTime createdAt;
}
