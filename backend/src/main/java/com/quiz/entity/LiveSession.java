package com.quiz.entity;

import jakarta.persistence.*;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;
import lombok.*;
import org.hibernate.annotations.CreationTimestamp;
import org.hibernate.annotations.UpdateTimestamp;

import java.time.LocalDateTime;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
@Entity
@Table(name = "live_sessions", schema = "public", indexes = {
        @Index(name = "idx_live_sessions_phase_id", columnList = "phase_id")
})
public class LiveSession {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "id", nullable = false)
    private Long id;

    @Column(name = "phase_id")
    private Long phaseId;

    @Size(max = 255)
    @NotNull
    @Column(name = "name", nullable = false)
    private String name;

    @Builder.Default
    @Column(name = "status", nullable = false, length = 50)
    private String status = "LOBBY"; // LOBBY, ROUND1, ROUND2, ROUND3, FINISHED

    @Builder.Default
    @Column(name = "current_round", nullable = false)
    private Integer currentRound = 1;

    @Builder.Default
    @Column(name = "current_question_index", nullable = false)
    private Integer currentQuestionIndex = 0;

    @Builder.Default
    @Column(name = "round1_state", length = 50)
    private String round1State = "IDLE"; // IDLE, HOPE_STAR_5S, VIDEO_PLAYING, QUESTION_READING, QUESTION_40S, ANSWER_REVEALED, LEADERBOARD

    @CreationTimestamp
    @Column(name = "created_at", updatable = false)
    private LocalDateTime createdAt;

    @UpdateTimestamp
    @Column(name = "updated_at")
    private LocalDateTime updatedAt;
}
