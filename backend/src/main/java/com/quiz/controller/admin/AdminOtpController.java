package com.quiz.controller.admin;

import com.quiz.dto.request.AdminGenerateOtpRequest;
import com.quiz.dto.response.AdminGenerateOtpResponse;
import com.quiz.dto.response.AdminOtpStatusResponse;
import com.quiz.dto.response.ApiResponse;
import com.quiz.service.EmailOtpService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/admin/otp")
@RequiredArgsConstructor
@PreAuthorize("hasRole('ADMIN')")
public class AdminOtpController {

    private final EmailOtpService emailOtpService;

    @PostMapping("/generate")
    public ResponseEntity<ApiResponse<AdminGenerateOtpResponse>> generateSupportOtp(
            @Valid @RequestBody AdminGenerateOtpRequest request) {
        AdminGenerateOtpResponse response = emailOtpService.generateAdminSupportOtp(request.getEmail());
        return ResponseEntity.ok(ApiResponse.ok("OTP created successfully", response));
    }

    @GetMapping("/status")
    public ResponseEntity<ApiResponse<AdminOtpStatusResponse>> getOtpStatus(
            @RequestParam String email) {
        AdminOtpStatusResponse response = emailOtpService.getLatestOtpStatus(email);
        return ResponseEntity.ok(ApiResponse.ok("OTP status retrieved", response));
    }
}
