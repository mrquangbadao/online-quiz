import axiosClient from './axiosClient';
import type { LeaderboardResponse } from '../types';

export const leaderboardApi = {
  getLeaderboard: (phaseId?: number) =>
    axiosClient.get<{ data: LeaderboardResponse }>('/leaderboard', {
      params: phaseId != null ? { phaseId } : {},
    }),
};
