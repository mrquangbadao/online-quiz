package com.quiz.entity;

import jakarta.persistence.*;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;
import lombok.*;
import org.hibernate.annotations.CreationTimestamp;
import org.hibernate.annotations.UpdateTimestamp;

import java.math.BigDecimal;
import java.time.LocalDateTime;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
@Entity
@Table(name = "live_players", schema = "public", indexes = {
        @Index(name = "idx_live_players_session_id", columnList = "session_id"),
        @Index(name = "idx_live_players_contestant_id", columnList = "contestant_id")
}, uniqueConstraints = {
        @UniqueConstraint(name = "uq_session_player_order", columnNames = {"session_id", "order_number"})
})
public class LivePlayer {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "id", nullable = false)
    private Long id;

    @NotNull
    @Column(name = "session_id", nullable = false)
    private Long sessionId;

    @Column(name = "contestant_id")
    private Long contestantId;

    @NotNull
    @Column(name = "order_number", nullable = false)
    private Integer orderNumber; // SBD / Thứ tự (1 - 10)

    @Size(max = 255)
    @NotNull
    @Column(name = "full_name", nullable = false)
    private String fullName;

    @Size(max = 255)
    @NotNull
    @Column(name = "unit", nullable = false)
    private String unit;

    @Size(max = 255)
    @Column(name = "position")
    private String position;

    @Size(max = 255)
    @Column(name = "email")
    private String email;

    @Size(max = 50)
    @Column(name = "phone")
    private String phone;

    @Column(name = "avatar_url", columnDefinition = "TEXT")
    private String avatarUrl;

    @Builder.Default
    @Column(name = "is_checked_in", nullable = false)
    private Boolean isCheckedIn = false;

    @Column(name = "checked_in_at")
    private LocalDateTime checkedInAt;

    @Size(max = 100)
    @Column(name = "device_id", length = 100)
    private String deviceId;

    @Builder.Default
    @Column(name = "is_rescue_requested")
    private Boolean isRescueRequested = false;

    // --- Trạng thái Vòng 1 (Thông thái) ---
    @Builder.Default
    @Column(name = "hope_star_used", nullable = false)
    private Boolean hopeStarUsed = false;

    @Column(name = "hope_star_question_index")
    private Integer hopeStarQuestionIndex;

    @Builder.Default
    @Column(name = "round1_score", nullable = false, precision = 5, scale = 1)
    private BigDecimal round1Score = BigDecimal.ZERO;

    @Builder.Default
    @Column(name = "round1_total_time_ms", nullable = false)
    private Long round1TotalTimeMs = 0L;

    // --- Trạng thái Vòng 2 (Nhạy bén) ---
    @Column(name = "round2_draw_code", length = 50)
    private String round2DrawCode;

    @Builder.Default
    @Column(name = "round2_scenario1_score", precision = 5, scale = 1)
    private BigDecimal round2Scenario1Score = BigDecimal.ZERO;

    @Builder.Default
    @Column(name = "round2_scenario2_score", precision = 5, scale = 1)
    private BigDecimal round2Scenario2Score = BigDecimal.ZERO;

    @Builder.Default
    @Column(name = "round2_score", nullable = false, precision = 5, scale = 1)
    private BigDecimal round2Score = BigDecimal.ZERO;

    // --- Trạng thái Vòng 3 (Bản lĩnh) ---
    @Column(name = "round3_pair_group")
    private Integer round3PairGroup; // Cặp đấu (1 - 5)

    @Builder.Default
    @Column(name = "round3_score", nullable = false, precision = 5, scale = 1)
    private BigDecimal round3Score = BigDecimal.ZERO;

    // --- Tổng kết & Vinh danh ---
    @Builder.Default
    @Column(name = "total_score", nullable = false, precision = 6, scale = 1)
    private BigDecimal totalScore = BigDecimal.ZERO;

    @Column(name = "final_rank")
    private Integer finalRank;

    @CreationTimestamp
    @Column(name = "created_at", updatable = false)
    private LocalDateTime createdAt;

    @UpdateTimestamp
    @Column(name = "updated_at")
    private LocalDateTime updatedAt;
}
