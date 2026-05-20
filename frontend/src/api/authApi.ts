import axiosClient from './axiosClient';
import type { AuthResponse } from '../types';

export const authApi = {
  login: (username: string, password: string) =>
    axiosClient.post<{ data: AuthResponse }>('/auth/login', { username, password }),
};
