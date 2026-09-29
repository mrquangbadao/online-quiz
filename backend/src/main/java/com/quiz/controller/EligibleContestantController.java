package com.quiz.controller;

import com.quiz.dto.response.ApiResponse;
import com.quiz.dto.response.EligibleContestantResponse;
import com.quiz.service.EligibleContestantService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;

@RestController
@RequestMapping("/api/eligible-contestants")
@RequiredArgsConstructor
public class EligibleContestantController {

    private final EligibleContestantService eligibleContestantService;

    @GetMapping
    public ResponseEntity<ApiResponse<List<EligibleContestantResponse>>> getPublicEligibleList() {
        return ResponseEntity.ok(ApiResponse.ok(eligibleContestantService.getPublicEligibleList()));
    }
}
