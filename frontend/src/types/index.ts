export interface AuthResponse {
  token: string;
  expiresIn: number;
  username: string;
  fullName: string;
}

export interface ContestantRegisterRequest {
  fullName: string;
  unit: string;
  phone: string;
  email: string;
  verificationToken: string;
  eligibleContestantId?: number;
}

export interface EligibleContestant {
  id: number;
  orderNumber: number;
  fullName: string;
  unit: string;
  scoreWeek1?: string;
  scoreWeek2?: string;
  scoreWeek3?: string;
  scoreWeek4?: string;
  totalScorePreliminary?: number;
  isRegistered: boolean;
  phone?: string;
  email?: string;
  examId?: number;
  examStatus?: string;
  examScore?: number;
  examDurationSeconds?: number;
}

export interface ContestantResponse {
  contestantId: number;
  fullName: string;
  unit: string;
  startExamToken: string;
}

export interface ExamStartRequest {
  contestantId: number;
  startExamToken: string;
}

export interface RequestOtpRequest {
  email: string;
  captchaToken?: string;
}

export interface RequestOtpResponse {
  expiresInSeconds: number;
  resendAvailableInSeconds: number;
}

export interface VerifyOtpRequest {
  email: string;
  otp: string;
}

export interface VerifyOtpResponse {
  verificationToken: string;
  expiresInSeconds: number;
}

export interface MCQuestion {
  order: number;
  questionId: number;
  content: string;
  optionA: string;
  optionB: string;
  optionC: string;
  optionD?: string | null;
  optionE?: string | null;
}

export interface ScenarioQuestion {
  order: number;
  questionId: number;
  title: string;
  description: string;
  videoUrl: string;
  optionA: string;
  optionB: string;
  optionC: string;
  optionD?: string | null;
  optionE?: string | null;
}

export interface ExamStartResponse {
  examId: number;
  submitToken: string;
  startTime: string;
  timeLimitMinutes: number;
  multipleChoiceQuestions: MCQuestion[];
  scenarioQuestions: ScenarioQuestion[];
  draftAnswers?: Record<string, string>;
  isResumed?: boolean;
}

export interface AnswerItem {
  questionId: number;
  questionType: "MC" | "SC";
  selectedAnswer: "A" | "B" | "C" | "D" | null;
}

export interface ExamSubmitRequest {
  submitToken: string;
  answers: AnswerItem[];
  prediction?: number;
}

export interface AnswerResult {
  questionId: number;
  questionType: "MC" | "SC";
  selectedAnswer: string | null;
  correctAnswer: string;
  isCorrect: boolean;
}

export interface ExamResultResponse {
  examId: number;
  mcScore: number;
  scenarioScore: number;
  totalScore: number;
  durationSeconds: number;
  prediction: number;
  answers: AnswerResult[];
}

export interface LeaderboardEntry {
  rank: number;
  examId: number;
  fullName: string;
  unit: string;
  phone?: string;
  totalScore: number;
  durationSeconds: number;
  prediction: number;
}

export interface LeaderboardResponse {
  entries: LeaderboardEntry[];
  totalParticipants: number;
}

export interface AdminExamDetail {
  examId: number;
  fullName: string;
  unit: string;
  phone: string;
  startTime: string;
  endTime: string;
  durationSeconds: number;
  mcScore: number;
  scenarioScore: number;
  totalScore: number;
  prediction: number | null;
  status: string;
  phaseName: string | null;
  answers: {
    questionId: number;
    questionType: string;
    questionContent: string;
    selectedAnswer: string | null;
    correctAnswer: string;
    isCorrect: boolean;
    optionA: string;
    optionB: string;
    optionC: string;
    optionD: string | null;
    optionE: string | null;
  }[];
}
