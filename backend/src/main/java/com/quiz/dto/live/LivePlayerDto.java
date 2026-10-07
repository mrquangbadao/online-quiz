package com.quiz.dto.live;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.math.BigDecimal;
import java.time.LocalDateTime;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class LivePlayerDto {
    private Long id;
    private Long sessionId;
    private Long contestantId;
    private Integer orderNumber;
    private String fullName;
    private String unit;
    private String position;
    private String email;
    private String phone;
    private String avatarUrl;
    private Boolean isCheckedIn;
    private LocalDateTime checkedInAt;
    private String deviceId;
    private Boolean isRescueRequested;

    // Vòng 1
    private Boolean hopeStarUsed;
    private Integer hopeStarQuestionIndex;
    private BigDecimal round1Score;
    private Long round1TotalTimeMs;

    // Vòng 2
    private String round2DrawCode;
    private BigDecimal round2Scenario1Score;
    private BigDecimal round2Scenario2Score;
    private BigDecimal round2Score;

    // Vòng 3
    private Integer round3PairGroup;
    private BigDecimal round3Score;

    // Tổng kết
    private BigDecimal totalScore;
    private Integer finalRank;
    private Integer rankDelta; // +2, -1, 0

    // Lịch sử đúng sai từng câu Vòng 1 (ví dụ [true, false, true, ...])
    private java.util.List<Boolean> round1History;

    // Lịch sử điểm số từng câu Vòng 1 (ví dụ [5.0, 10.0, -2.0, 0.0, ...])
    private java.util.List<BigDecimal> round1ScoreHistory;
}
