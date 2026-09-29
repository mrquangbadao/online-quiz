package com.quiz.controller.admin;

import com.quiz.dto.response.ApiResponse;
import com.quiz.entity.ContestPhase;
import com.quiz.service.ContestPhaseService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/admin/phases")
@PreAuthorize("hasRole('ADMIN')")
@RequiredArgsConstructor
public class ContestPhaseController {

    private final ContestPhaseService contestPhaseService;

    @GetMapping
    public ResponseEntity<ApiResponse<List<ContestPhase>>> listPhases() {
        return ResponseEntity.ok(ApiResponse.ok(contestPhaseService.listPhases()));
    }

    @GetMapping("/current")
    public ResponseEntity<ApiResponse<ContestPhase>> getCurrentPhase() {
        return ResponseEntity.ok(ApiResponse.ok(contestPhaseService.getCurrentPhase()));
    }

    @PostMapping("/start")
    public ResponseEntity<ApiResponse<ContestPhase>> startPhase(@RequestBody Map<String, Object> body) {
        String name = body.getOrDefault("name", "Giai đoạn thi").toString();
        Boolean requireWhitelist = body.containsKey("requireWhitelist")
                ? Boolean.valueOf(body.get("requireWhitelist").toString()) : null;
        Integer mcQuestionCount = body.containsKey("mcQuestionCount")
                ? Integer.valueOf(body.get("mcQuestionCount").toString()) : null;
        Integer timeLimitMinutes = body.containsKey("timeLimitMinutes")
                ? Integer.valueOf(body.get("timeLimitMinutes").toString()) : null;
        Boolean hasScenarios = body.containsKey("hasScenarios")
                ? Boolean.valueOf(body.get("hasScenarios").toString()) : null;
        return ResponseEntity.status(HttpStatus.CREATED)
                .body(ApiResponse.ok(contestPhaseService.startPhase(
                        name, requireWhitelist, mcQuestionCount, timeLimitMinutes, hasScenarios)));
    }

    @PutMapping("/{id}/stop")
    public ResponseEntity<ApiResponse<ContestPhase>> stopPhase(@PathVariable Long id) {
        return ResponseEntity.ok(ApiResponse.ok(contestPhaseService.stopPhase(id)));
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<ApiResponse<Void>> deletePhase(@PathVariable Long id) {
        contestPhaseService.deletePhase(id);
        return ResponseEntity.ok(ApiResponse.ok(null));
    }

    @PutMapping("/{id}/reactivate")
    public ResponseEntity<ApiResponse<ContestPhase>> reactivatePhase(@PathVariable Long id) {
        return ResponseEntity.ok(ApiResponse.ok(contestPhaseService.reactivatePhase(id)));
    }
}