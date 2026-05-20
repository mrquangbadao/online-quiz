package com.quiz.entity;

import jakarta.persistence.*;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;
import lombok.*;
import org.hibernate.annotations.OnDelete;
import org.hibernate.annotations.OnDeleteAction;

@Getter
@Setter
@AllArgsConstructor
@NoArgsConstructor
@Builder
@Entity
@Table(name = "exam_answers", schema = "public", indexes = {@Index(name = "idx_exam_answers_exam",
        columnList = "exam_id")})
public class ExamAnswer {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "id", nullable = false)
    private Long id;

    @NotNull
    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @OnDelete(action = OnDeleteAction.CASCADE)
    @JoinColumn(name = "exam_id", nullable = false)
    private Exam exam;

    @NotNull
    @Column(name = "question_id", nullable = false)
    private Long questionId;

    @Size(max = 2)
    @NotNull
    @Column(name = "question_type", nullable = false, length = 2)
    private String questionType;

    @Column(name = "selected_answer", length = Integer.MAX_VALUE)
    private String selectedAnswer;

    @Column(name = "is_correct")
    private Boolean isCorrect;


}