import axiosClient from './axiosClient';
import type {
  AuthResponse,
  RequestOtpRequest,
  RequestOtpResponse,
  VerifyOtpRequest,
  VerifyOtpResponse,
} from '../types';

export const authApi = {
  login: (username: string, password: string) =>
    axiosClient.post<{ data: AuthResponse }>('/auth/login', { username, password }),
  requestOtp: (data: RequestOtpRequest) =>
    axiosClient.post<{ data: RequestOtpResponse }>('/auth/request-otp', data),
  verifyOtp: (data: VerifyOtpRequest) =>
    axiosClient.post<{ data: VerifyOtpResponse }>('/auth/verify-otp', data),
};
