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
@Table(name = "abuse_logs", indexes = {
        @Index(name = "idx_abuse_logs_action_created_at", columnList = "action, created_at"),
        @Index(name = "idx_abuse_logs_ip_created_at", columnList = "ip, created_at")
})
public class AbuseLog {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "ip", nullable = false, length = 100)
    private String ip;

    @Column(name = "user_agent", length = 1000)
    private String userAgent;

    @Column(name = "device_id", length = 255)
    private String deviceId;

    @Column(name = "endpoint", nullable = false, length = 255)
    private String endpoint;

    @Column(name = "action", nullable = false, length = 100)
    private String action;

    @Column(name = "result", nullable = false, length = 50)
    private String result;

    @Column(name = "reason", length = 500)
    private String reason;

    @Column(name = "email", length = 200)
    private String email;

    @Column(name = "contestant_id")
    private Long contestantId;

    @CreationTimestamp
    @Column(name = "created_at", nullable = false, updatable = false)
    private LocalDateTime createdAt;
}
