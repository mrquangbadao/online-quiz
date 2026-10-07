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
@Table(name = "live_questions", schema = "public", indexes = {
        @Index(name = "idx_live_questions_session_id", columnList = "session_id")
}, uniqueConstraints = {
        @UniqueConstraint(name = "uq_session_question_order", columnNames = {"session_id", "question_order"})
})
public class LiveQuestion {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "id", nullable = false)
    private Long id;

    @NotNull
    @Column(name = "session_id", nullable = false)
    private Long sessionId;

    @NotNull
    @Column(name = "question_order", nullable = false)
    private Integer questionOrder; // 1 đến 10

    @NotNull
    @Column(name = "title", nullable = false, columnDefinition = "TEXT")
    private String title;

    @Size(max = 500)
    @Column(name = "video_url")
    private String videoUrl;

    @Builder.Default
    @Column(name = "video_type", length = 50)
    private String videoType = "NONE"; // YOUTUBE, DIRECT_FILE, NONE

    @NotNull
    @Column(name = "option_a", nullable = false, columnDefinition = "TEXT")
    private String optionA;

    @NotNull
    @Column(name = "option_b", nullable = false, columnDefinition = "TEXT")
    private String optionB;

    @NotNull
    @Column(name = "option_c", nullable = false, columnDefinition = "TEXT")
    private String optionC;

    @NotNull
    @Column(name = "option_d", nullable = false, columnDefinition = "TEXT")
    private String optionD;

    @NotNull
    @Column(name = "correct_option", nullable = false, columnDefinition = "TEXT")
    private String correctOption; // 'A', 'B', 'C', 'D' hoặc toàn văn nội dung đáp án đúng

    @Column(name = "explanation", columnDefinition = "TEXT")
    private String explanation;

    @Builder.Default
    @Column(name = "time_limit_seconds", nullable = false)
    private Integer timeLimitSeconds = 40;

    @CreationTimestamp
    @Column(name = "created_at", updatable = false)
    private LocalDateTime createdAt;
}
