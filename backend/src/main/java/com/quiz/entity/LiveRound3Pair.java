package com.quiz.entity;

import jakarta.persistence.*;
import jakarta.validation.constraints.NotNull;
import lombok.*;
import org.hibernate.annotations.CreationTimestamp;

import java.time.LocalDateTime;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
@Entity
@Table(name = "live_round3_pairs", schema = "public", indexes = {
        @Index(name = "idx_live_round3_pairs_session_id", columnList = "session_id")
}, uniqueConstraints = {
        @UniqueConstraint(name = "uq_session_pair_number", columnNames = {"session_id", "pair_number"})
})
public class LiveRound3Pair {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "id", nullable = false)
    private Long id;

    @NotNull
    @Column(name = "session_id", nullable = false)
    private Long sessionId;

    @NotNull
    @Column(name = "pair_number", nullable = false)
    private Integer pairNumber; // 1 đến 5

    @NotNull
    @Column(name = "player1_id", nullable = false)
    private Long player1Id;

    @NotNull
    @Column(name = "player2_id", nullable = false)
    private Long player2Id;

    @CreationTimestamp
    @Column(name = "drawn_at", updatable = false)
    private LocalDateTime drawnAt;
}
