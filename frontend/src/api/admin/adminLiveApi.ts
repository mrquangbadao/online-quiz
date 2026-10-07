import axiosClient from '../axiosClient';
import { ApiResponse } from '../../types';
import {
  LivePlayerDto,
  LiveQuestionDto,
  LiveRound2Topic,
  LiveRound3Pair,
  LiveSessionDto,
} from '../../types/live';

export const adminLiveApi = {
  createSession: async (phaseId?: number, name?: string): Promise<LiveSessionDto> => {
    const res = await axiosClient.post<ApiResponse<LiveSessionDto>>('/admin/live/session/create', {
      phaseId,
      name,
    });
    return res.data.data;
  },

  initPlayers: async (sessionId: number): Promise<LivePlayerDto[]> => {
    const res = await axiosClient.post<ApiResponse<LivePlayerDto[]>>(
      `/admin/live/session/${sessionId}/init-players`
    );
    return res.data.data;
  },

  getPreviewTop10: async (sessionId: number): Promise<LivePlayerDto[]> => {
    const res = await axiosClient.get<ApiResponse<LivePlayerDto[]>>(
      `/admin/live/session/${sessionId}/preview-top10`
    );
    return res.data.data;
  },

  importTop10: async (sessionId: number): Promise<LivePlayerDto[]> => {
    const res = await axiosClient.post<ApiResponse<LivePlayerDto[]>>(
      `/admin/live/session/${sessionId}/import-top10`
    );
    return res.data.data;
  },

  savePlayers: async (sessionId: number, players: LivePlayerDto[]): Promise<LivePlayerDto[]> => {
    const res = await axiosClient.post<ApiResponse<LivePlayerDto[]>>(
      `/admin/live/session/${sessionId}/save-players`,
      players
    );
    return res.data.data;
  },

  generateSupportOtp: async (playerId: number): Promise<{ otpCode: string }> => {
    const res = await axiosClient.post<ApiResponse<{ otpCode: string }>>(
      `/admin/live/player/${playerId}/support-otp`
    );
    return res.data.data;
  },

  bypassCheckIn: async (playerId: number): Promise<LivePlayerDto> => {
    const res = await axiosClient.post<ApiResponse<LivePlayerDto>>(
      `/admin/live/player/${playerId}/bypass-checkin`
    );
    return res.data.data;
  },

  resetPlayerCheckIn: async (playerId: number): Promise<LivePlayerDto> => {
    const res = await axiosClient.post<ApiResponse<LivePlayerDto>>(
      `/admin/live/player/${playerId}/reset-checkin`
    );
    return res.data.data;
  },

  getQuestions: async (sessionId: number): Promise<LiveQuestionDto[]> => {
    const res = await axiosClient.get<ApiResponse<LiveQuestionDto[]>>(
      `/admin/live/session/${sessionId}/questions`
    );
    return res.data.data;
  },

  saveQuestions: async (sessionId: number, questions: Partial<LiveQuestionDto>[]): Promise<LiveQuestionDto[]> => {
    const res = await axiosClient.post<ApiResponse<LiveQuestionDto[]>>(
      `/admin/live/session/${sessionId}/save-questions`,
      questions
    );
    return res.data.data;
  },

  saveRound2Topics: async (sessionId: number, topics: Partial<LiveRound2Topic>[]): Promise<LiveRound2Topic[]> => {
    const res = await axiosClient.post<ApiResponse<LiveRound2Topic[]>>(
      `/admin/live/session/${sessionId}/save-round2-topics`,
      topics
    );
    return res.data.data;
  },

  updateAvatar: async (playerId: number, avatarUrl: string): Promise<LivePlayerDto> => {
    const res = await axiosClient.post<ApiResponse<LivePlayerDto>>(
      `/admin/live/player/${playerId}/avatar`,
      { avatarUrl }
    );
    return res.data.data;
  },

  setRound: async (sessionId: number, round: number, status?: string): Promise<void> => {
    await axiosClient.post<ApiResponse<void>>(`/admin/live/session/${sessionId}/set-round`, {
      round,
      status,
    });
  },

  // Vòng 1
  startHopeStar: async (sessionId: number, questionOrder: number): Promise<void> => {
    await axiosClient.post<ApiResponse<void>>(
      `/admin/live/round1/${sessionId}/hope-star-start`,
      { questionOrder }
    );
  },

  playVideo: async (sessionId: number, questionOrder: number): Promise<void> => {
    await axiosClient.post<ApiResponse<void>>(
      `/admin/live/round1/${sessionId}/video-play`,
      { questionOrder }
    );
  },

  readQuestion: async (sessionId: number, questionOrder: number): Promise<void> => {
    await axiosClient.post<ApiResponse<void>>(
      `/admin/live/round1/${sessionId}/question-read`,
      { questionOrder }
    );
  },

  startQuestion: async (sessionId: number, questionOrder: number): Promise<void> => {
    await axiosClient.post<ApiResponse<void>>(
      `/admin/live/round1/${sessionId}/question-start`,
      { questionOrder }
    );
  },

  revealAnswer: async (sessionId: number, questionOrder: number): Promise<LiveSessionDto> => {
    const res = await axiosClient.post<ApiResponse<LiveSessionDto>>(
      `/admin/live/round1/${sessionId}/answer-reveal`,
      { questionOrder }
    );
    return res.data.data;
  },

  showLeaderboard: async (sessionId: number): Promise<LiveSessionDto> => {
    const res = await axiosClient.post<ApiResponse<LiveSessionDto>>(
      `/admin/live/round1/${sessionId}/show-leaderboard`
    );
    return res.data.data;
  },

  getQuestionAnswers: async (sessionId: number, questionId: number): Promise<any[]> => {
    const res = await axiosClient.get<ApiResponse<any[]>>(
      `/admin/live/round1/session/${sessionId}/question/${questionId}/answers`
    );
    return res.data.data;
  },

  // Vòng 2
  assignRound2Topic: async (
    sessionId: number,
    playerId: number,
    topicCode: string
  ): Promise<void> => {
    await axiosClient.post<ApiResponse<void>>(`/admin/live/round2/${sessionId}/assign-topic`, {
      playerId,
      topicCode,
    });
  },

  showRound2TopicQuestion: async (sessionId: number, topicCode: string): Promise<void> => {
    await axiosClient.post<ApiResponse<void>>(
      `/admin/live/round2/${sessionId}/show-topic-question`,
      { topicCode }
    );
  },

  updateRound2Score: async (
    playerId: number,
    scenario1Score: number,
    scenario2Score: number
  ): Promise<void> => {
    await axiosClient.post<ApiResponse<void>>(`/admin/live/round2/player/${playerId}/score`, {
      scenario1Score,
      scenario2Score,
    });
  },

  getRound2Topics: async (sessionId: number): Promise<LiveRound2Topic[]> => {
    const res = await axiosClient.get<ApiResponse<LiveRound2Topic[]>>(
      `/admin/live/round2/${sessionId}/topics`
    );
    return res.data.data;
  },

  // Vòng 3
  drawRandomPairs: async (sessionId: number): Promise<LiveRound3Pair[]> => {
    const res = await axiosClient.post<ApiResponse<LiveRound3Pair[]>>(
      `/admin/live/round3/${sessionId}/random-draw`
    );
    return res.data.data;
  },

  updateRound3Score: async (playerId: number, score: number): Promise<void> => {
    await axiosClient.post<ApiResponse<void>>(`/admin/live/round3/player/${playerId}/score`, {
      score,
    });
  },

  getRound3Pairs: async (sessionId: number): Promise<LiveRound3Pair[]> => {
    const res = await axiosClient.get<ApiResponse<LiveRound3Pair[]>>(
      `/admin/live/round3/${sessionId}/pairs`
    );
    return res.data.data;
  },

  // Kết thúc & Làm sạch dữ liệu
  finishSession: async (sessionId: number): Promise<LiveSessionDto> => {
    const res = await axiosClient.post<ApiResponse<LiveSessionDto>>(
      `/admin/live/session/${sessionId}/finish`
    );
    return res.data.data;
  },

  resetSession: async (sessionId?: number): Promise<LiveSessionDto> => {
    const url = sessionId ? `/admin/live/session/${sessionId}/reset` : '/admin/live/session/reset';
    const res = await axiosClient.post<ApiResponse<LiveSessionDto>>(url);
    return res.data.data;
  },

  deleteSession: async (sessionId: number): Promise<void> => {
    await axiosClient.delete<ApiResponse<void>>(
      `/admin/live/session/${sessionId}`
    );
  },
};
