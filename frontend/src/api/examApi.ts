import axiosClient from './axiosClient';
import type {
  ContestantRegisterRequest, ContestantResponse,
  ExamStartRequest, ExamStartResponse,
  ExamSubmitRequest, ExamResultResponse,
} from '../types';

export const examApi = {
  register: (data: ContestantRegisterRequest) =>
    axiosClient.post<{ data: ContestantResponse }>('/contestant/register', data),
  startExam: (data: ExamStartRequest) =>
    axiosClient.post<{ data: ExamStartResponse }>('/exams/start', data),
  submitExam: (examId: number, data: ExamSubmitRequest) =>
    axiosClient.post<{ data: ExamResultResponse }>(`/exams/${examId}/submit`, data),
  saveDraftAnswer: (examId: number, data: { questionId: number; questionType: string; selectedAnswer: string | null }) =>
    axiosClient.post<{ data: null }>(`/exams/${examId}/draft-answer`, data),
  getActiveCount: () =>
    axiosClient.get<{ count: number }>('/exams/active-count'),
  getCurrentPhase: () =>
    axiosClient.get<{
      data: {
        id: number;
        name: string;
        status: string;
        startTime?: string;
        endTime?: string;
        phaseType?: string;
        mcQuestionCount?: number;
        timeLimitMinutes?: number;
        hasScenarios?: boolean;
        hasPrediction?: boolean;
        requireWhitelist?: boolean;
      } | null;
    }>('/exams/phase/current'),
};
