package com.quiz.entity;

import jakarta.persistence.*;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;
import lombok.*;
import org.hibernate.annotations.ColumnDefault;
import org.hibernate.annotations.CreationTimestamp;
import org.hibernate.annotations.UpdateTimestamp;

import java.time.Instant;

@Getter
@Setter
@Builder
@NoArgsConstructor
@AllArgsConstructor
@Entity
@Table(name = "questions", schema = "public", indexes = {@Index(name = "idx_questions_active",
        columnList = "is_active")})
public class Question {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "id", nullable = false)
    private Long id;

    @NotNull
    @Column(name = "content", nullable = false, length = Integer.MAX_VALUE)
    private String content;

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

    @Size(max = 100)
    @Column(name = "category", length = 100)
    private String category;

    @ColumnDefault("true")
    @Column(name = "is_active")
    @Builder.Default
    private Boolean isActive = true;

    @CreationTimestamp
    @ColumnDefault("now()")
    @Column(name = "created_at")
    private Instant createdAt;

    @UpdateTimestamp
    @ColumnDefault("now()")
    @Column(name = "updated_at")
    private Instant updatedAt;


}