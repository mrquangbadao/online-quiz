package com.quiz.controller;

import com.quiz.dto.request.LoginRequest;
import com.quiz.dto.request.RequestOtpRequest;
import com.quiz.dto.request.VerifyOtpRequest;
import com.quiz.dto.response.ApiResponse;
import com.quiz.dto.response.AuthResponse;
import com.quiz.dto.response.RequestOtpResponse;
import com.quiz.dto.response.VerifyOtpResponse;
import com.quiz.exception.BusinessException;
import com.quiz.security.PublicEndpointAction;
import com.quiz.security.RequestClientMetadata;
import com.quiz.security.RequestMetadataResolver;
import com.quiz.security.RequestRateLimiter;
import com.quiz.service.AbuseLogService;
import com.quiz.service.AuthService;
import com.quiz.service.CaptchaVerificationService;
import com.quiz.service.EmailOtpService;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.authentication.BadCredentialsException;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/auth")
@RequiredArgsConstructor
public class AuthController {

  private final AuthService authService;
  private final RequestRateLimiter requestRateLimiter;
  private final RequestMetadataResolver requestMetadataResolver;
  private final AbuseLogService abuseLogService;
  private final EmailOtpService emailOtpService;
  private final CaptchaVerificationService captchaVerificationService;

  @PostMapping("/login")
  public ResponseEntity<ApiResponse<AuthResponse>> login(
          @Valid @RequestBody LoginRequest request,
          HttpServletRequest httpRequest) {
    RequestClientMetadata metadata = requestMetadataResolver.resolve(httpRequest);

    try {
      requestRateLimiter.checkAndIncrement(PublicEndpointAction.AUTH_LOGIN, metadata.clientIp());
      AuthResponse response = authService.login(request);
      // Resetting the login counter keeps this limiter focused on failed attempts.
      requestRateLimiter.reset(PublicEndpointAction.AUTH_LOGIN, metadata.clientIp());
      abuseLogService.log(PublicEndpointAction.AUTH_LOGIN, metadata,
              "SUCCESS", null, null, null);
      return ResponseEntity.ok(ApiResponse.ok(response));
    } catch (BadCredentialsException ex) {
      abuseLogService.log(PublicEndpointAction.AUTH_LOGIN, metadata,
              "REJECTED", "BAD_CREDENTIALS", null, null);
      throw ex;
    } catch (BusinessException ex) {
      abuseLogService.log(PublicEndpointAction.AUTH_LOGIN, metadata,
              "REJECTED", ex.getCode(), null, null);
      throw ex;
    }
  }

  @PostMapping("/request-otp")
  public ResponseEntity<ApiResponse<RequestOtpResponse>> requestOtp(
          @Valid @RequestBody RequestOtpRequest request,
          HttpServletRequest httpRequest) {
    RequestClientMetadata metadata = requestMetadataResolver.resolve(httpRequest);

    try {
      requestRateLimiter.checkAndIncrement(PublicEndpointAction.AUTH_REQUEST_OTP, metadata.clientIp());
      captchaVerificationService.verifyTurnstileToken(request.getCaptchaToken(), metadata.clientIp());
      RequestOtpResponse response = emailOtpService.requestOtp(request);
      abuseLogService.log(PublicEndpointAction.AUTH_REQUEST_OTP, metadata,
              "SUCCESS", null, request.getEmail(), null);
      return ResponseEntity.ok(ApiResponse.ok(response));
    } catch (BusinessException ex) {
      abuseLogService.log(PublicEndpointAction.AUTH_REQUEST_OTP, metadata,
              "REJECTED", ex.getCode(), request.getEmail(), null);
      throw ex;
    }
  }

  @PostMapping("/verify-otp")
  public ResponseEntity<ApiResponse<VerifyOtpResponse>> verifyOtp(
          @Valid @RequestBody VerifyOtpRequest request,
          HttpServletRequest httpRequest) {
    RequestClientMetadata metadata = requestMetadataResolver.resolve(httpRequest);

    try {
      requestRateLimiter.checkAndIncrement(PublicEndpointAction.AUTH_VERIFY_OTP, metadata.clientIp());
      VerifyOtpResponse response = emailOtpService.verifyOtp(request);
      abuseLogService.log(PublicEndpointAction.AUTH_VERIFY_OTP, metadata,
              "SUCCESS", null, request.getEmail(), null);
      return ResponseEntity.ok(ApiResponse.ok(response));
    } catch (BusinessException ex) {
      abuseLogService.log(PublicEndpointAction.AUTH_VERIFY_OTP, metadata,
              "REJECTED", ex.getCode(), request.getEmail(), null);
      throw ex;
    }
  }
}
