package com.quiz.repository;

import com.quiz.entity.EligibleContestant;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;

public interface EligibleContestantRepository extends JpaRepository<EligibleContestant, Long> {

    List<EligibleContestant> findAllByOrderByOrderNumberAsc();

    List<EligibleContestant> findByIsRegisteredFalseOrderByOrderNumberAsc();

    Optional<EligibleContestant> findFirstByFullNameIgnoreCaseAndUnitIgnoreCase(String fullName, String unit);

    Optional<EligibleContestant> findFirstByRegisteredContestantId(Long registeredContestantId);

    boolean existsByOrderNumber(Integer orderNumber);
}
