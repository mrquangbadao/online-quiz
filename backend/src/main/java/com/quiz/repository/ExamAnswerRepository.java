package com.quiz.repository;

import java.util.List;

import com.quiz.entity.ExamAnswer;
import org.springframework.data.jpa.repository.JpaRepository;

public interface ExamAnswerRepository extends JpaRepository<ExamAnswer, Long> {
  List<ExamAnswer> findByExamId(Long examId);
}
