package com.quiz.repository;

import com.quiz.entity.ScenarioQuestion;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface ScenarioQuestionRepository extends JpaRepository<ScenarioQuestion, Long> {

  List<ScenarioQuestion> findByIsActiveTrueOrderByDisplayOrderAsc();
}
