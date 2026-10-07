import axiosClient from './axiosClient';
import { ApiResponse } from '../types';
import {
  LiveAnswerSubmissionDto,
  LivePlayerDto,
  LiveQuestionDto,
  LiveRound2Topic,
  LiveRound3Pair,
  LiveSessionDto,
} from '../types/live';

export const liveApi = {
  getActiveSession: async (): Promise<LiveSessionDto> => {
    const res = await axiosClient.get<ApiResponse<LiveSessionDto>>('/live/session/active');
    return res.data.data;
  },

  getFinalists: async (): Promise<LivePlayerDto[]> => {
    const res = await axiosClient.get<ApiResponse<LivePlayerDto[]>>('/live/finalists');
    return res.data.data;
  },

  requestOtp: async (sessionId: number, email: string, playerId?: number): Promise<string> => {
    const res = await axiosClient.post<ApiResponse<string>>('/live/auth/request-otp', {
      sessionId,
      email,
      playerId,
    });
    return res.data.data;
  },

  verifyOtp: async (sessionId: number, email: string, otp: string, playerId?: number, deviceId?: string): Promise<LivePlayerDto> => {
    const res = await axiosClient.post<ApiResponse<LivePlayerDto>>('/live/auth/verify-otp', {
      sessionId,
      email,
      otp,
      playerId,
      deviceId,
    });
    return res.data.data;
  },

  getSessionById: async (sessionId: number): Promise<LiveSessionDto> => {
    const res = await axiosClient.get<ApiResponse<LiveSessionDto>>(`/live/session/${sessionId}`);
    return res.data.data;
  },

  checkInPlayer: async (sessionId: number, playerId: number): Promise<LivePlayerDto> => {
    const res = await axiosClient.post<ApiResponse<LivePlayerDto>>('/live/player/check-in', {
      sessionId,
      playerId,
    });
    return res.data.data;
  },

  releasePlayerCheckIn: async (playerId: number, deviceId?: string): Promise<LivePlayerDto> => {
    const url = deviceId 
      ? `/live/player/${playerId}/release-checkin?deviceId=${encodeURIComponent(deviceId)}`
      : `/live/player/${playerId}/release-checkin`;
    const res = await axiosClient.post<ApiResponse<LivePlayerDto>>(url);
    return res.data.data;
  },

  getShuffledQuestion: async (questionId: number, playerId: number): Promise<LiveQuestionDto> => {
    const res = await axiosClient.get<ApiResponse<LiveQuestionDto>>(
      `/live/question/${questionId}/player/${playerId}`
    );
    return res.data.data;
  },

  submitAnswer: async (submission: LiveAnswerSubmissionDto): Promise<void> => {
    await axiosClient.post<ApiResponse<string>>('/live/answer/submit', submission);
  },

  activateHopeStar: async (
    sessionId: number,
    playerId: number,
    questionOrder: number,
    deviceId?: string
  ): Promise<boolean> => {
    const res = await axiosClient.post<ApiResponse<boolean>>('/live/hope-star/activate', {
      sessionId,
      playerId,
      questionOrder,
      deviceId,
    });
    return res.data.data;
  },

  requestRescue: async (playerId: number, deviceId?: string): Promise<LivePlayerDto> => {
    const url = deviceId 
      ? `/live/player/${playerId}/request-rescue?deviceId=${encodeURIComponent(deviceId)}`
      : `/live/player/${playerId}/request-rescue`;
    const res = await axiosClient.post<ApiResponse<LivePlayerDto>>(url);
    return res.data.data;
  },

  getRound2Topics: async (sessionId: number): Promise<LiveRound2Topic[]> => {
    const res = await axiosClient.get<ApiResponse<LiveRound2Topic[]>>(
      `/live/round2/session/${sessionId}/topics`
    );
    return res.data.data;
  },

  getRound3Pairs: async (sessionId: number): Promise<LiveRound3Pair[]> => {
    const res = await axiosClient.get<ApiResponse<LiveRound3Pair[]>>(
      `/live/round3/session/${sessionId}/pairs`
    );
    return res.data.data;
  },
};
