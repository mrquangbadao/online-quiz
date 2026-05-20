package com.quiz.controller;

import com.quiz.dto.response.ApiResponse;
import com.quiz.dto.response.LeaderboardResponse;
import com.quiz.service.LeaderboardService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/leaderboard")
@RequiredArgsConstructor
public class LeaderboardController {

  private final LeaderboardService leaderboardService;

  @GetMapping
  public ResponseEntity<ApiResponse<LeaderboardResponse>> getLeaderboard(
          @RequestParam(required = false) Long phaseId) {
    return ResponseEntity.ok(ApiResponse.ok(leaderboardService.getLeaderboard(phaseId)));
  }
}

