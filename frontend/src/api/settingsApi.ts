import axiosClient from './axiosClient';

export const settingsApi = {
  getCaptchaConfig: () =>
    axiosClient.get<{ data: { enabled: boolean; siteKey: string } }>('/settings/captcha-config'),
  getSlogan: () => axiosClient.get<{ data: string }>('/settings/slogan'),
  updateSlogan: (value: string) => axiosClient.put('/settings/slogan', { value }),
  getTimeLimitMinutes: () => axiosClient.get<{ data: number }>('/settings/exam-time-limit'),
  updateTimeLimitMinutes: (minutes: number) =>
    axiosClient.put('/settings/exam_time_limit_minutes', { value: String(minutes) }),
  getMcQuestionCount: () => axiosClient.get<{ data: number }>('/settings/mc-question-count'),
  updateMcQuestionCount: (count: number) =>
    axiosClient.put('/settings/exam_mc_question_count', { value: String(count) }),
  getPredictionAnswer: () => axiosClient.get<{ data: number }>('/settings/prediction-answer'),
  updatePredictionAnswer: (answer: number) =>
    axiosClient.put('/settings/prediction_answer', { value: String(answer) }),
};
