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
@Table(name = "live_round2_topics", schema = "public", indexes = {
        @Index(name = "idx_live_round2_topics_session_id", columnList = "session_id")
}, uniqueConstraints = {
        @UniqueConstraint(name = "uq_session_topic_code", columnNames = {"session_id", "code"})
})
public class LiveRound2Topic {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "id", nullable = false)
    private Long id;

    @NotNull
    @Column(name = "session_id", nullable = false)
    private Long sessionId;

    @Size(max = 50)
    @NotNull
    @Column(name = "code", nullable = false, length = 50)
    private String code; // Ví dụ: 'ĐỀ 01'

    @NotNull
    @Column(name = "scenario_1", nullable = false, columnDefinition = "TEXT")
    private String scenario1;

    @NotNull
    @Column(name = "scenario_2", nullable = false, columnDefinition = "TEXT")
    private String scenario2;

    @Builder.Default
    @Column(name = "max_score_1", precision = 4, scale = 1)
    private BigDecimal maxScore1 = BigDecimal.valueOf(20.0);

    @Builder.Default
    @Column(name = "max_score_2", precision = 4, scale = 1)
    private BigDecimal maxScore2 = BigDecimal.valueOf(20.0);

    @CreationTimestamp
    @Column(name = "created_at", updatable = false)
    private LocalDateTime createdAt;
}
