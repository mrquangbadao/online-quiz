package com.quiz.entity;

import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.CreationTimestamp;

import java.time.LocalDateTime;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
@Entity
@Table(name = "email_otp", indexes = {
        @Index(name = "idx_email_otp_email_phase_created_at",
                columnList = "normalized_email, phase_id, created_at"),
        @Index(name = "idx_email_otp_expires_at", columnList = "expires_at")
})
public class EmailOtp {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "email", nullable = false, length = 200)
    private String email;

    @Column(name = "normalized_email", nullable = false, length = 200)
    private String normalizedEmail;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "phase_id", nullable = false)
    private ContestPhase phase;

    @Column(name = "otp_hash", nullable = false, length = 255)
    private String otpHash;

    @Column(name = "expires_at", nullable = false)
    private LocalDateTime expiresAt;

    @Column(name = "attempts", nullable = false)
    private int attempts;

    @Column(name = "max_attempts", nullable = false)
    private int maxAttempts;

    @Column(name = "used_at")
    private LocalDateTime usedAt;

    @Column(name = "last_sent_at", nullable = false)
    private LocalDateTime lastSentAt;

    @CreationTimestamp
    @Column(name = "created_at", nullable = false, updatable = false)
    private LocalDateTime createdAt;
}
