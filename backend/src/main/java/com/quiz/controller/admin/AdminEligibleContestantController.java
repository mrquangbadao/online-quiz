package com.quiz.controller.admin;

import com.quiz.dto.response.ApiResponse;
import com.quiz.dto.response.EligibleContestantResponse;
import com.quiz.service.EligibleContestantService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;

@RestController
@RequestMapping("/api/admin/eligible-contestants")
@RequiredArgsConstructor
@PreAuthorize("hasRole('ADMIN')")
public class AdminEligibleContestantController {

    private final EligibleContestantService eligibleContestantService;

    @GetMapping
    public ResponseEntity<ApiResponse<List<EligibleContestantResponse>>> getAdminEligibleList() {
        return ResponseEntity.ok(ApiResponse.ok(eligibleContestantService.getAdminEligibleList()));
    }

    @org.springframework.web.bind.annotation.PostMapping
    public ResponseEntity<ApiResponse<EligibleContestantResponse>> createEligibleContestant(
            @jakarta.validation.Valid @org.springframework.web.bind.annotation.RequestBody com.quiz.dto.request.EligibleContestantRequest request) {
        return ResponseEntity.status(org.springframework.http.HttpStatus.CREATED)
                .body(ApiResponse.ok(eligibleContestantService.createEligibleContestant(request)));
    }

    @org.springframework.web.bind.annotation.PutMapping("/{id}")
    public ResponseEntity<ApiResponse<EligibleContestantResponse>> updateEligibleContestant(
            @org.springframework.web.bind.annotation.PathVariable Long id,
            @jakarta.validation.Valid @org.springframework.web.bind.annotation.RequestBody com.quiz.dto.request.EligibleContestantRequest request) {
        return ResponseEntity.ok(ApiResponse.ok(eligibleContestantService.updateEligibleContestant(id, request)));
    }

    @org.springframework.web.bind.annotation.DeleteMapping("/{id}")
    public ResponseEntity<ApiResponse<Void>> deleteEligibleContestant(
            @org.springframework.web.bind.annotation.PathVariable Long id) {
        eligibleContestantService.deleteEligibleContestant(id);
        return ResponseEntity.ok(ApiResponse.ok(null));
    }

    @org.springframework.web.bind.annotation.PutMapping("/{id}/reset-registration")
    public ResponseEntity<ApiResponse<Void>> resetContestantRegistration(
            @org.springframework.web.bind.annotation.PathVariable Long id) {
        eligibleContestantService.resetContestantRegistration(id);
        return ResponseEntity.ok(ApiResponse.ok(null));
    }
}
