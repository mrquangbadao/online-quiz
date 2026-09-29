package com.quiz.entity;

import com.quiz.enums.PhaseStatus;
import jakarta.persistence.*;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;
import lombok.*;
import org.hibernate.annotations.ColumnDefault;
import org.hibernate.annotations.CreationTimestamp;

import java.time.Instant;
import java.time.LocalDateTime;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
@Entity
@Table(name = "contest_phases", schema = "public", indexes = {@Index(name = "idx_contest_phases_status",
        columnList = "status")})
public class ContestPhase {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "id", nullable = false)
    private Long id;

    @Size(max = 200)
    @NotNull
    @Column(name = "name", nullable = false, length = 200)
    private String name;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 10)
    @Builder.Default
    private PhaseStatus status = PhaseStatus.ACTIVE;

    @Column(name = "start_time", nullable = false)
    private LocalDateTime startTime;

    @Column(name = "end_time")
    private LocalDateTime endTime;

    @CreationTimestamp
    @Column(name = "created_at", updatable = false)
    private LocalDateTime createdAt;

    @Builder.Default
    @Column(name = "phase_type", nullable = false, length = 50)
    private String phaseType = "STANDARD";

    @Builder.Default
    @Column(name = "mc_question_count", nullable = false)
    private Integer mcQuestionCount = 10;

    @Builder.Default
    @Column(name = "time_limit_minutes", nullable = false)
    private Integer timeLimitMinutes = 15;

    @Builder.Default
    @Column(name = "has_scenarios", nullable = false)
    private Boolean hasScenarios = true;

    @Builder.Default
    @Column(name = "has_prediction", nullable = false)
    private Boolean hasPrediction = true;

    @Builder.Default
    @Column(name = "require_whitelist", nullable = false)
    private Boolean requireWhitelist = true;
}