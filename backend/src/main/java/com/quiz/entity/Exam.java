package com.quiz.entity;

import com.quiz.enums.ExamStatus;
import jakarta.persistence.*;
import jakarta.validation.constraints.NotNull;
import lombok.*;
import org.hibernate.annotations.ColumnDefault;
import org.hibernate.annotations.CreationTimestamp;

import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;

@SuppressWarnings("Lombok")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
@Entity
@Table(name = "exams", schema = "public", indexes = {
        @Index(name = "idx_exams_contestant",
                columnList = "contestant_id"),
        @Index(name = "idx_exams_phase",
                columnList = "phase_id"),
        @Index(name = "idx_exams_status",
                columnList = "status")})
public class Exam {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "id", nullable = false)
    private Long id;

    @NotNull
    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "contestant_id", nullable = false)
    private Contestant contestant;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "phase_id")
    private ContestPhase phase;

    @Column(name = "start_time")
    private LocalDateTime startTime;

    @Column(name = "end_time")
    private LocalDateTime endTime;

    @Column(name = "duration_seconds")
    private Long durationSeconds;

    @ColumnDefault("0")
    @Builder.Default
    @Column(name = "mc_score")
    private Integer mcScore = 0;

    @ColumnDefault("0")
    @Builder.Default
    @Column(name = "scenario_score")
    private Integer scenarioScore = 0;

    @ColumnDefault("0")
    @Column(name = "total_score")
    private Integer totalScore;

    @Column(name = "prediction")
    private Integer prediction;

    @Enumerated(EnumType.STRING)
    @Column(name = "status", nullable = false, length = 20)
    @Builder.Default
    private ExamStatus status = ExamStatus.IN_PROGRESS;

    @Column(name = "submit_token_hash")
    private String submitTokenHash;

    @Column(name = "submit_token_expires_at")
    private LocalDateTime submitTokenExpiresAt;

    @Column(name = "submit_token_consumed_at")
    private LocalDateTime submitTokenConsumedAt;

    @CreationTimestamp
    @ColumnDefault("now()")
    @Column(name = "created_at")
    private LocalDateTime createdAt;

    @OneToMany(mappedBy = "exam", cascade = CascadeType.ALL, orphanRemoval = true)
    @Builder.Default
    private List<ExamQuestion> examQuestions = new ArrayList<>();

    @OneToMany(mappedBy = "exam", cascade = CascadeType.ALL, orphanRemoval = true)
    @Builder.Default
    private List<ExamAnswer> examAnswers = new ArrayList<>();


}