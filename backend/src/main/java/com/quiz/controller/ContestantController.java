package com.quiz.controller;

import com.quiz.dto.request.ContestantRegisterRequest;
import com.quiz.dto.response.ApiResponse;
import com.quiz.dto.response.ContestantResponse;
import com.quiz.exception.BusinessException;
import com.quiz.security.PublicEndpointAction;
import com.quiz.security.RequestClientMetadata;
import com.quiz.security.RequestMetadataResolver;
import com.quiz.security.RequestRateLimiter;
import com.quiz.service.AbuseLogService;
import com.quiz.service.ContestantService;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/contestant")
@RequiredArgsConstructor
public class ContestantController {

  private final ContestantService contestantService;
  private final RequestRateLimiter requestRateLimiter;
  private final RequestMetadataResolver requestMetadataResolver;
  private final AbuseLogService abuseLogService;

  @PostMapping("/register")
  public ResponseEntity<ApiResponse<ContestantResponse>> register(
          @Valid @RequestBody ContestantRegisterRequest request,
          HttpServletRequest httpRequest) {
    RequestClientMetadata metadata = requestMetadataResolver.resolve(httpRequest);

    try {
      requestRateLimiter.checkAndIncrement(PublicEndpointAction.CONTESTANT_REGISTER, metadata.clientIp());
      ContestantResponse response = contestantService.register(request);
      abuseLogService.log(PublicEndpointAction.CONTESTANT_REGISTER, metadata,
              "SUCCESS", null, request.getEmail(), response.getContestantId());
      return ResponseEntity.status(HttpStatus.CREATED).body(ApiResponse.ok(response));
    } catch (BusinessException ex) {
      abuseLogService.log(PublicEndpointAction.CONTESTANT_REGISTER, metadata,
              "REJECTED", ex.getCode(), request.getEmail(), null);
      throw ex;
    }
  }
}
