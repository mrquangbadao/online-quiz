
package com.quiz.service;

import com.quiz.dto.response.LeaderboardResponse;

public interface LeaderboardService {
  /** phaseId = null → all-time leaderboard */
  LeaderboardResponse getLeaderboard(Long phaseId);
}