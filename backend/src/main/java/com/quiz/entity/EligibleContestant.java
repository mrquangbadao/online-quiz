package com.quiz.entity;

import jakarta.persistence.*;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;
import lombok.*;
import org.hibernate.annotations.CreationTimestamp;

import java.time.LocalDateTime;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
@Entity
@Table(name = "eligible_contestants", schema = "public", indexes = {
        @Index(name = "idx_eligible_contestants_name", columnList = "full_name"),
        @Index(name = "idx_eligible_contestants_registered", columnList = "is_registered")
})
public class EligibleContestant {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "id", nullable = false)
    private Long id;

    @NotNull
    @Column(name = "order_number", nullable = false)
    private Integer orderNumber;

    @Size(max = 200)
    @NotNull
    @Column(name = "full_name", nullable = false, length = 200)
    private String fullName;

    @Size(max = 200)
    @NotNull
    @Column(name = "unit", nullable = false, length = 200)
    private String unit;

    @Size(max = 50)
    @Column(name = "score_week1", length = 50)
    private String scoreWeek1;

    @Size(max = 50)
    @Column(name = "score_week2", length = 50)
    private String scoreWeek2;

    @Size(max = 50)
    @Column(name = "score_week3", length = 50)
    private String scoreWeek3;

    @Size(max = 50)
    @Column(name = "score_week4", length = 50)
    private String scoreWeek4;

    @Column(name = "total_score_preliminary")
    private Integer totalScorePreliminary;

    @Builder.Default
    @Column(name = "is_registered")
    private Boolean isRegistered = false;

    @Size(max = 20)
    @Column(name = "phone", length = 20)
    private String phone;

    @Size(max = 200)
    @Column(name = "email", length = 200)
    private String email;

    @Column(name = "registered_contestant_id")
    private Long registeredContestantId;

    @CreationTimestamp
    @Column(name = "created_at", updatable = false)
    private LocalDateTime createdAt;
}
