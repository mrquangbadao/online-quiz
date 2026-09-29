package com.quiz.repository;

import java.util.List;

import com.quiz.entity.ExamAnswer;
import java.util.Optional;
import org.springframework.data.jpa.repository.JpaRepository;

public interface ExamAnswerRepository extends JpaRepository<ExamAnswer, Long> {
  List<ExamAnswer> findByExamId(Long examId);
  Optional<ExamAnswer> findByExamIdAndQuestionIdAndQuestionType(Long examId, Long questionId, String questionType);
}
