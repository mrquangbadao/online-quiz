package com.quiz.entity;

import jakarta.persistence.*;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;
import lombok.*;
import org.hibernate.annotations.ColumnDefault;
import org.hibernate.annotations.CreationTimestamp;
import org.hibernate.annotations.UpdateTimestamp;

import java.time.Instant;
import java.time.LocalDateTime;

@Getter
@Setter
@AllArgsConstructor
@NoArgsConstructor
@Builder
@Entity
@Table(name = "scenario_questions", schema = "public", uniqueConstraints = {@UniqueConstraint(name = "scenario_questions_display_order_key",
        columnNames = {"display_order"})})
public class ScenarioQuestion {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "id", nullable = false)
    private Long id;

    @Size(max = 500)
    @NotNull
    @Column(name = "title", nullable = false, length = 500)
    private String title;

    @Column(name = "description", length = Integer.MAX_VALUE)
    private String description;

    @Size(max = 2000)
    @NotNull
    @Column(name = "video_url", nullable = false, length = 2000)
    private String videoUrl;

    @Size(max = 1000)
    @NotNull
    @Column(name = "option_a", nullable = false, length = 1000)
    private String optionA;

    @Size(max = 1000)
    @NotNull
    @Column(name = "option_b", nullable = false, length = 1000)
    private String optionB;

    @Size(max = 1000)
    @NotNull
    @Column(name = "option_c", nullable = false, length = 1000)
    private String optionC;

    @Size(max = 1000)
    @Column(name = "option_d", length = 1000)
    private String optionD;

    @Size(max = 1000)
    @Column(name = "option_e", length = 1000)
    private String optionE;

    @NotNull
    @Column(name = "correct_answer", nullable = false, length = Integer.MAX_VALUE)
    private String correctAnswer;

    @NotNull
    @Column(name = "display_order", nullable = false)
    private Integer displayOrder;

    @ColumnDefault("true")
    @Column(name = "is_active")
    private Boolean isActive;

    @CreationTimestamp
    @ColumnDefault("now()")
    @Column(name = "created_at")
    private LocalDateTime createdAt;

    @UpdateTimestamp
    @ColumnDefault("now()")
    @Column(name = "updated_at")
    private LocalDateTime updatedAt;


}