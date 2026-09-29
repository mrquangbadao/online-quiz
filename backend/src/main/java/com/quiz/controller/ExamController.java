package com.quiz.controller;

import com.quiz.dto.request.ExamStartRequest;
import com.quiz.dto.request.ExamSubmitRequest;
import com.quiz.dto.response.ApiResponse;
import com.quiz.dto.response.ExamResultResponse;
import com.quiz.dto.response.ExamStartResponse;
import com.quiz.entity.ContestPhase;
import com.quiz.exception.BusinessException;
import com.quiz.security.PublicEndpointAction;
import com.quiz.security.RequestClientMetadata;
import com.quiz.security.RequestMetadataResolver;
import com.quiz.security.RequestRateLimiter;
import com.quiz.service.AbuseLogService;
import com.quiz.service.ContestPhaseService;
import com.quiz.service.ExamService;
import jakarta.servlet.http.HttpServletRequest;
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
  private final RequestRateLimiter requestRateLimiter;
  private final RequestMetadataResolver requestMetadataResolver;
  private final AbuseLogService abuseLogService;

  @PostMapping("/start")
  public ResponseEntity<ApiResponse<ExamStartResponse>> startExam(
          @Valid @RequestBody ExamStartRequest request,
          HttpServletRequest httpRequest) {
    RequestClientMetadata metadata = requestMetadataResolver.resolve(httpRequest);

    try {
      requestRateLimiter.checkAndIncrement(PublicEndpointAction.EXAM_START, metadata.clientIp());
      ExamStartResponse response = examService.startExam(request);
      abuseLogService.log(PublicEndpointAction.EXAM_START, metadata,
              "SUCCESS", null, null, request.getContestantId());
      return ResponseEntity.status(HttpStatus.CREATED).body(ApiResponse.ok(response));
    } catch (BusinessException ex) {
      abuseLogService.log(PublicEndpointAction.EXAM_START, metadata,
              "REJECTED", ex.getCode(), null, request.getContestantId());
      throw ex;
    }
  }

  @PostMapping("/{examId}/submit")
  public ResponseEntity<ApiResponse<ExamResultResponse>> submitExam(
          @PathVariable Long examId,
          @Valid @RequestBody ExamSubmitRequest request,
          HttpServletRequest httpRequest) {
    RequestClientMetadata metadata = requestMetadataResolver.resolve(httpRequest);

    try {
      requestRateLimiter.checkAndIncrement(PublicEndpointAction.EXAM_SUBMIT, metadata.clientIp() + "_" + examId);
      ExamResultResponse response = examService.submitExam(examId, request);
      abuseLogService.log(PublicEndpointAction.EXAM_SUBMIT, metadata, "SUCCESS", null, "examId=" + examId, null);
      return ResponseEntity.ok(ApiResponse.ok(response));
    } catch (BusinessException ex) {
      abuseLogService.log(PublicEndpointAction.EXAM_SUBMIT, metadata, "REJECTED", ex.getCode(), "examId=" + examId, null);
      throw ex;
    }
  }

  @PostMapping("/{examId}/draft-answer")
  public ResponseEntity<ApiResponse<Void>> saveDraftAnswer(
          @PathVariable Long examId,
          @Valid @RequestBody com.quiz.dto.request.ExamDraftAnswerRequest request) {
    examService.saveDraftAnswer(examId, request);
    return ResponseEntity.ok(ApiResponse.ok(null));
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

