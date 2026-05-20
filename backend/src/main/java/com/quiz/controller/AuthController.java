package com.quiz.controller;

import com.quiz.dto.request.LoginRequest;
import com.quiz.dto.response.ApiResponse;
import com.quiz.dto.response.AuthResponse;
import com.quiz.security.LoginRateLimiter;
import com.quiz.service.AuthService;
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
  private final LoginRateLimiter loginRateLimiter;

  @PostMapping("/login")
  public ResponseEntity<ApiResponse<AuthResponse>> login(
          @Valid @RequestBody LoginRequest request,
          HttpServletRequest httpRequest) {
    String ip = resolveClientIp(httpRequest);
    loginRateLimiter.checkAndIncrement(ip);
    try {
      AuthResponse response = authService.login(request);
      loginRateLimiter.reset(ip); // reset on success
      return ResponseEntity.ok(ApiResponse.ok(response));
    } catch (BadCredentialsException ex) {
      throw ex; // let GlobalExceptionHandler handle it; counter stays incremented
    }
  }

  private String resolveClientIp(HttpServletRequest request) {
    String xForwardedFor = request.getHeader("X-Forwarded-For");
    if (xForwardedFor != null && !xForwardedFor.isBlank()) {
      return xForwardedFor.split(",")[0].trim();
    }
    return request.getRemoteAddr();
  }
}
