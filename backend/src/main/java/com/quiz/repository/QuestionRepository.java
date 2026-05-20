package com.quiz.repository;

import com.quiz.entity.Question;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;

import java.util.List;

public interface QuestionRepository extends JpaRepository<Question, Long> {

  @Query(value = "SELECT * FROM questions WHERE is_active = true ORDER BY RANDOM() LIMIT :count", nativeQuery = true)
  List<Question> findRandomActiveQuestions(int count);

  long countByIsActiveTrue();
}
