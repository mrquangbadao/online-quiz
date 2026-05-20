import axiosClient from '../axiosClient';
import type { AdminExamDetail } from '../../types';

export const adminApi = {
  getDashboard: (phaseId?: number) =>
    axiosClient.get('/admin/dashboard', { params: phaseId != null ? { phaseId } : {} }),
  getAllExams: () => axiosClient.get('/admin/exams'),
  getExamDetail: (examId: number) =>
    axiosClient.get<{ data: AdminExamDetail }>(`/admin/exams/${examId}`),
  exportExcel: () =>
    axiosClient.get('/admin/reports/export', { responseType: 'blob' }),

  getAllQuestions: () => axiosClient.get('/admin/questions'),
  createQuestion: (data: Record<string, unknown>) => axiosClient.post('/admin/questions', data),
  downloadTemplate: () => axiosClient.get('/admin/questions/template', { responseType: 'blob' }),
  importQuestions: (file: File) => {
    const form = new FormData();
    form.append('file', file);
    return axiosClient.post('/admin/questions/import', form, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
  },
  updateQuestion: (id: number, data: Record<string, unknown>) =>
    axiosClient.put(`/admin/questions/${id}`, data),
  deleteQuestion: (id: number) => axiosClient.delete(`/admin/questions/${id}`),

  getAllScenarioQuestions: () => axiosClient.get('/admin/questions/scenarios'),
  createScenarioQuestion: (data: Record<string, unknown>) =>
    axiosClient.post('/admin/questions/scenarios', data),
  updateScenarioQuestion: (id: number, data: Record<string, unknown>) =>
    axiosClient.put(`/admin/questions/scenarios/${id}`, data),
  deleteScenarioQuestion: (id: number) =>
    axiosClient.delete(`/admin/questions/scenarios/${id}`),

  getAllUnits: () => axiosClient.get('/admin/units'),
  createUnit: (name: string, code?: string) =>
    axiosClient.post('/admin/units', { name, code }),
  updateUnit: (id: number, data: Record<string, unknown>) =>
    axiosClient.put(`/admin/units/${id}`, data),
  deleteUnit: (id: number) => axiosClient.delete(`/admin/units/${id}`),
  importUnits: (file: File) => {
    const form = new FormData();
    form.append('file', file);
    return axiosClient.post('/admin/units/import', form, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
  },

  updateSlogan: (value: string) => axiosClient.put('/settings/slogan', { value }),

  getPhases: () => axiosClient.get<{ data: ContestPhase[] }>('/admin/phases'),
  getCurrentPhase: () => axiosClient.get<{ data: ContestPhase | null }>('/admin/phases/current'),
  startPhase: (name: string) =>
    axiosClient.post<{ data: ContestPhase }>('/admin/phases/start', { name }),
  stopPhase: (id: number) =>
    axiosClient.put<{ data: ContestPhase }>(`/admin/phases/${id}/stop`),
  deletePhase: (id: number) => axiosClient.delete(`/admin/phases/${id}`),

  getUnitStats: (phaseId?: number) =>
    axiosClient.get<{ data: UnitStat[] }>('/admin/stats/by-unit', {
      params: phaseId != null ? { phaseId } : {},
    }),

  listUsers: () => axiosClient.get('/admin/users'),
  createUser: (data: { username: string; password: string; fullName?: string }) =>
    axiosClient.post('/admin/users', data),
  deleteUser: (id: number) => axiosClient.delete(`/admin/users/${id}`),
  changePassword: (data: { currentPassword: string; newPassword: string }) =>
    axiosClient.put('/admin/users/change-password', data),
};

export interface ContestPhase {
  id: number;
  name: string;
  status: 'ACTIVE' | 'ENDED';
  startTime: string;
  endTime: string | null;
  createdAt: string;
}

export interface UnitStat {
  unit: string;
  count: number;
}
