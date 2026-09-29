import axiosClient from './axiosClient';
import type { EligibleContestant } from '../types';

export const eligibleApi = {
  getPublicList: () =>
    axiosClient.get<{ data: EligibleContestant[] }>('/eligible-contestants'),

  getAdminList: () =>
    axiosClient.get<{ data: EligibleContestant[] }>('/admin/eligible-contestants'),

  create: (data: Partial<EligibleContestant>) =>
    axiosClient.post<{ data: EligibleContestant }>('/admin/eligible-contestants', data),

  update: (id: number, data: Partial<EligibleContestant>) =>
    axiosClient.put<{ data: EligibleContestant }>(`/admin/eligible-contestants/${id}`, data),

  delete: (id: number) =>
    axiosClient.delete(`/admin/eligible-contestants/${id}`),

  resetRegistration: (id: number) =>
    axiosClient.put(`/admin/eligible-contestants/${id}/reset-registration`),

  resetAllRegistrations: () =>
    axiosClient.put('/admin/eligible-contestants/reset-all-registrations'),
};
