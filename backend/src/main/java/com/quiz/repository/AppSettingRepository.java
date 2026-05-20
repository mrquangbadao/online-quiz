package com.quiz.repository;

import com.quiz.entity.AppSetting;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.Optional;

public interface AppSettingRepository extends JpaRepository<AppSetting, String> {
}
