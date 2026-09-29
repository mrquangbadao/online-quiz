package com.quiz.controller;

import com.quiz.dto.response.ApiResponse;
import com.quiz.entity.AppSetting;
import com.quiz.enums.PhaseStatus;
import com.quiz.repository.AppSettingRepository;
import com.quiz.repository.ContestPhaseRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.util.Map;
import java.util.Set;

@Slf4j
@RestController
@RequestMapping("/api/settings")
@RequiredArgsConstructor
public class SettingsController {

  private static final Set<String> ALLOWED_KEYS = Set.of(
          "slogan",
          "exam_time_limit_minutes",
          "exam_mc_question_count",
          "prediction_answer"
  );

  private final AppSettingRepository settingRepository;
  private final ContestPhaseRepository contestPhaseRepository;
  private final com.quiz.service.CaptchaVerificationService captchaVerificationService;

  /** Public — captcha configuration for frontend */
  @GetMapping("/captcha-config")
  public ResponseEntity<ApiResponse<Map<String, Object>>> getCaptchaConfig() {
    return ResponseEntity.ok(ApiResponse.ok(Map.of(
            "enabled", captchaVerificationService.isEnabled(),
            "siteKey", captchaVerificationService.getSiteKey() != null ? captchaVerificationService.getSiteKey() : ""
    )));
  }

  /** Public — anyone can read the slogan */
  @GetMapping("/slogan")
  public ResponseEntity<ApiResponse<String>> getSlogan() {
    String value = settingRepository.findById("slogan")
            .map(AppSetting::getValue)
            .orElse("");
    return ResponseEntity.ok(ApiResponse.ok(value));
  }

  /** Public — anyone can read the exam time limit (0 = no limit) */
  @GetMapping("/exam-time-limit")
  public ResponseEntity<ApiResponse<Integer>> getTimeLimitMinutes() {
    int value = settingRepository.findById("exam_time_limit_minutes")
            .map(s -> { try { return Integer.parseInt(s.getValue()); } catch (NumberFormatException e) { return 0; } })
            .orElse(0);
    return ResponseEntity.ok(ApiResponse.ok(value));
  }

  /** Public — anyone can read the exam MC question count */
  @GetMapping("/mc-question-count")
  public ResponseEntity<ApiResponse<Integer>> getMcQuestionCount() {
    int value = settingRepository.findById("exam_mc_question_count")
            .map(s -> { try { return Integer.parseInt(s.getValue()); } catch (NumberFormatException e) { return 30; } })
            .orElse(30);
    return ResponseEntity.ok(ApiResponse.ok(value));
  }

  /** Admin only — admin can read the prediction answer */
  @PreAuthorize("hasRole('ADMIN')")
  @GetMapping("/prediction-answer")
  public ResponseEntity<ApiResponse<Integer>> getPredictionAnswer() {
    int value = settingRepository.findById("prediction_answer")
            .map(s -> { try { return Integer.parseInt(s.getValue()); } catch (NumberFormatException e) { return 0; } })
            .orElse(0);
    return ResponseEntity.ok(ApiResponse.ok(value));
  }

  /** Admin only — update any setting by key */
  @PreAuthorize("hasRole('ADMIN')")
  @PutMapping("/{key}")
  public ResponseEntity<ApiResponse<Void>> updateSetting(
          @PathVariable String key,
          @RequestBody Map<String, String> body) {
    if (!ALLOWED_KEYS.contains(key)) {
      return ResponseEntity.badRequest().body(ApiResponse.error("Setting key không hợp lệ"));
    }
    String value = body.get("value");
    if (value == null) {
      return ResponseEntity.badRequest().body(ApiResponse.error("'value' is required"));
    }
    AppSetting setting = settingRepository.findById(key)
            .orElse(AppSetting.builder().key(key).build());
    setting.setValue(value);
    settingRepository.save(setting);
    log.info("Setting '{}' updated by admin to '{}'", key, value);

    // Sync to active contest phase if active
    if ("exam_time_limit_minutes".equals(key)) {
      try {
        int minutes = Integer.parseInt(value);
        contestPhaseRepository.findFirstByStatus(PhaseStatus.ACTIVE).ifPresent(phase -> {
          phase.setTimeLimitMinutes(minutes);
          contestPhaseRepository.save(phase);
          log.info("Active phase '{}' time limit synced to {} minutes", phase.getName(), minutes);
        });
      } catch (NumberFormatException ignored) {}
    } else if ("exam_mc_question_count".equals(key)) {
      try {
        int count = Integer.parseInt(value);
        contestPhaseRepository.findFirstByStatus(PhaseStatus.ACTIVE).ifPresent(phase -> {
          phase.setMcQuestionCount(count);
          contestPhaseRepository.save(phase);
          log.info("Active phase '{}' question count synced to {} questions", phase.getName(), count);
        });
      } catch (NumberFormatException ignored) {}
    }

    return ResponseEntity.ok(ApiResponse.ok(null));
  }
}

