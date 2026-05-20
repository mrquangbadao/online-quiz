package com.quiz.repository;

import com.quiz.entity.Unit;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;

public interface UnitRepository extends JpaRepository<Unit, Long> {

  List<Unit> findByIsActiveTrueOrderByNameAsc();

  Optional<Unit> findByName(String name);

  boolean existsByName(String name);
}
