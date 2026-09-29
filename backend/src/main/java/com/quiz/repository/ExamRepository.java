package com.quiz.repository;

import com.quiz.entity.Exam;
import com.quiz.enums.ExamStatus;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;

public interface ExamRepository extends JpaRepository<Exam, Long> {

  Optional<Exam> findByIdAndStatus(Long id, ExamStatus status);

  @org.springframework.data.jpa.repository.Lock(jakarta.persistence.LockModeType.PESSIMISTIC_WRITE)
  @Query("SELECT e FROM Exam e WHERE e.id = :id AND e.status = :status")
  Optional<Exam> findByIdAndStatusForUpdate(@Param("id") Long id, @Param("status") ExamStatus status);

  boolean existsByContestantIdAndStatusIn(Long contestantId, List<ExamStatus> statuses);

  Optional<Exam> findFirstByContestantIdAndStatus(Long contestantId, ExamStatus status);

  @Query("SELECT e FROM Exam e JOIN FETCH e.contestant WHERE e.contestant.id IN :contestantIds")
  List<Exam> findByContestantIdIn(@Param("contestantIds") List<Long> contestantIds);

  @Query("SELECT e FROM Exam e JOIN FETCH e.contestant " +
          "WHERE e.status = 'SUBMITTED' " +
          "ORDER BY e.totalScore DESC, e.durationSeconds ASC")
  List<Exam> findLeaderboard();

  @Query("SELECT e FROM Exam e JOIN FETCH e.contestant " +
          "WHERE e.status = 'SUBMITTED' AND e.phase.id = :phaseId " +
          "ORDER BY e.totalScore DESC, e.durationSeconds ASC")
  List<Exam> findLeaderboardByPhase(@Param("phaseId") Long phaseId);

  long countByStatus(ExamStatus status);

  List<Exam> findByPhaseIdAndStatus(Long phaseId, ExamStatus status);

  List<Exam> findByStatusAndStartTimeBefore(ExamStatus status, LocalDateTime cutoff);

  @Query("SELECT AVG(e.totalScore) FROM Exam e WHERE e.status = 'SUBMITTED'")
  Double findAverageScore();

  @Query("SELECT AVG(e.totalScore) FROM Exam e WHERE e.status = 'SUBMITTED' AND e.phase.id = :phaseId")
  Double findAverageScoreByPhase(@Param("phaseId") Long phaseId);

  @Query("SELECT COUNT(e) FROM Exam e WHERE e.status = :status AND e.phase.id = :phaseId")
  long countByStatusAndPhaseId(@Param("status") ExamStatus status, @Param("phaseId") Long phaseId);

  @Query("SELECT c.unit, COUNT(e) FROM Exam e JOIN e.contestant c " +
          "WHERE e.status = 'SUBMITTED' GROUP BY c.unit ORDER BY COUNT(e) DESC")
  List<Object[]> countSubmittedByUnit();

  @Query("SELECT c.unit, COUNT(e) FROM Exam e JOIN e.contestant c " +
          "WHERE e.status = 'SUBMITTED' AND e.phase.id = :phaseId " +
          "GROUP BY c.unit ORDER BY COUNT(e) DESC")
  List<Object[]> countSubmittedByUnitAndPhase(@Param("phaseId") Long phaseId);

  @Modifying
  @Query("DELETE FROM Exam e WHERE e.phase.id = :phaseId")
  void deleteAllByPhaseId(@Param("phaseId") Long phaseId);
}


