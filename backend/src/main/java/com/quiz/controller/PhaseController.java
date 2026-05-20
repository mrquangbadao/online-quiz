package com.quiz.controller;

import com.quiz.dto.response.ApiResponse;
import com.quiz.entity.ContestPhase;
import com.quiz.service.ContestPhaseService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/phases")
@RequiredArgsConstructor
public class PhaseController {

    private final ContestPhaseService contestPhaseService;

    /**
     * Public endpoint — returns current active phase or null.
     * Used by the contest page to show "competition not open" message.
     */
    @GetMapping("/current")
    public ResponseEntity<ApiResponse<ContestPhase>> getCurrentPhase() {
        return ResponseEntity.ok(ApiResponse.ok(contestPhaseService.getCurrentPhase()));
    }
}
