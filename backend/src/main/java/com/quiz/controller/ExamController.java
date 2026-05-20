package com.quiz.controller;

import com.quiz.dto.request.ExamStartRequest;
import com.quiz.dto.request.ExamSubmitRequest;
import com.quiz.dto.response.ApiResponse;
import com.quiz.dto.response.ExamResultResponse;
import com.quiz.dto.response.ExamStartResponse;
import com.quiz.entity.ContestPhase;
import com.quiz.service.ContestPhaseService;
import com.quiz.service.ExamService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.Map;

@Slf4j
@RestController
@RequestMapping("/api/exams")
@RequiredArgsConstructor
public class ExamController {

  private final ExamService examService;
  private final ContestPhaseService contestPhaseService;

  @PostMapping("/start")
  public ResponseEntity<ApiResponse<ExamStartResponse>> startExam(
          @Valid @RequestBody ExamStartRequest request) {
    ExamStartResponse response = examService.startExam(request);
    return ResponseEntity.status(HttpStatus.CREATED).body(ApiResponse.ok(response));
  }

  @PostMapping("/{examId}/submit")
  public ResponseEntity<ApiResponse<ExamResultResponse>> submitExam(
          @PathVariable Long examId,
          @Valid @RequestBody ExamSubmitRequest request) {
    ExamResultResponse response = examService.submitExam(examId, request);
    return ResponseEntity.ok(ApiResponse.ok(response));
  }

  @GetMapping("/active-count")
  public ResponseEntity<Map<String, Long>> getActiveCount() {
    return ResponseEntity.ok(Map.of("count", examService.getActiveExamCount()));
  }

  @GetMapping("/phase/current")
  public ResponseEntity<ApiResponse<ContestPhase>> getCurrentPhase() {
    return ResponseEntity.ok(ApiResponse.ok(contestPhaseService.getCurrentPhase()));
  }
}

