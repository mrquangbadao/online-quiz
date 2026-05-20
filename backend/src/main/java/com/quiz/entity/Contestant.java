package com.quiz.entity;

import jakarta.persistence.*;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;
import lombok.*;
import org.hibernate.annotations.ColumnDefault;
import org.hibernate.annotations.CreationTimestamp;
import org.hibernate.annotations.OnDelete;
import org.hibernate.annotations.OnDeleteAction;

import java.time.Instant;
import java.time.LocalDateTime;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
@Entity
@Table(name = "contestants", schema = "public", indexes = {
        @Index(name = "idx_contestants_phone_phase",
                columnList = "phone, phase_id",
                unique = true),
        @Index(name = "idx_contestants_phone",
                columnList = "phone")})
public class Contestant {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "id", nullable = false)
    private Long id;

    @Size(max = 200)
    @NotNull
    @Column(name = "full_name", nullable = false, length = 200)
    private String fullName;

    @Size(max = 200)
    @NotNull
    @Column(name = "unit", nullable = false, length = 200)
    private String unit;

    @Size(max = 20)
    @NotNull
    @Column(name = "phone", nullable = false, length = 20)
    private String phone;

    @Size(max = 200)
    @Column(name = "email", length = 200)
    private String email;

    @ManyToOne(fetch = FetchType.LAZY)
    @OnDelete(action = OnDeleteAction.CASCADE)
    @JoinColumn(name = "phase_id")
    private ContestPhase phase;

    @CreationTimestamp
    @ColumnDefault("now()")
    @Column(name = "created_at", updatable = false)
    private LocalDateTime createdAt;


}