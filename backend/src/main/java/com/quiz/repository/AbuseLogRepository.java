package com.quiz.repository;

import com.quiz.entity.AbuseLog;
import org.springframework.data.jpa.repository.JpaRepository;

public interface AbuseLogRepository extends JpaRepository<AbuseLog, Long> {
}
