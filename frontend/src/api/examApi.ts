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
  getActiveCount: () =>
    axiosClient.get<{ count: number }>('/exams/active-count'),
  getCurrentPhase: () =>
    axiosClient.get<{ data: { id: number; name: string; status: string } | null }>('/exams/phase/current'),
};
