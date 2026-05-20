import type { AxiosError } from 'axios';

interface ApiErrorBody {
  message?: string;
  code?: string;
  errors?: Record<string, string>;
}

export function extractApiError(
  err: unknown,
  defaultMessage = 'Có lỗi xảy ra. Vui lòng thử lại.'
): string {
  if (!err || typeof err !== 'object') return defaultMessage;
  const axiosErr = err as AxiosError<ApiErrorBody>;

  if (axiosErr.response?.data) {
    const { message, errors } = axiosErr.response.data;
    if (errors) {
      const firstError = Object.values(errors)[0];
      if (firstError) return firstError;
    }
    if (message) return message;
  }

  if (axiosErr.code === 'ECONNABORTED' || axiosErr.message?.includes('timeout')) {
    return 'Kết nối quá thời gian. Vui lòng kiểm tra mạng và thử lại.';
  }

  if (!axiosErr.response) {
    return 'Không thể kết nối đến máy chủ. Vui lòng kiểm tra kết nối mạng.';
  }

  return defaultMessage;
}
