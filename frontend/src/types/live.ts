export interface ShuffledOption {
  originalKey: 'A' | 'B' | 'C' | 'D';
  content: string;
}

export interface LiveQuestionDto {
  id: number;
  sessionId: number;
  questionOrder: number;
  title: string;
  videoUrl?: string;
  videoType?: 'YOUTUBE' | 'DIRECT_FILE' | 'NONE';
  optionA: string;
  optionB: string;
  optionC: string;
  optionD: string;
  correctOption?: string | null;
  explanation?: string | null;
  timeLimitSeconds: number;
  shuffledOptions?: ShuffledOption[];
  hasAnswered?: boolean;
  playerSelectedOption?: string | null;
  playerResponseTimeMs?: number | null;
}

export interface LivePlayerDto {
  id: number;
  sessionId: number;
  contestantId?: number | null;
  orderNumber: number;
  fullName: string;
  unit: string;
  position?: string;
  email?: string;
  phone?: string;
  avatarUrl?: string;
  isCheckedIn: boolean;
  checkedInAt?: string | null;
  isRescueRequested?: boolean;

  // Vòng 1
  hopeStarUsed: boolean;
  hopeStarQuestionIndex?: number | null;
  round1Score: number;
  round1TotalTimeMs: number;

  // Vòng 2
  round2DrawCode?: string | null;
  round2Scenario1Score?: number;
  round2Scenario2Score?: number;
  round2Score: number;

  // Vòng 3
  round3PairGroup?: number | null;
  round3Score: number;

  // Tổng kết
  totalScore: number;
  finalRank?: number | null;
  rankDelta?: number; // +2, -1, 0
  round1History?: (boolean | null)[]; // Lịch sử đúng/sai câu 1..10
  round1ScoreHistory?: (number | null)[]; // Lịch sử điểm số câu 1..10 (+5, +10, -2, 0...)
}

export interface LiveSessionDto {
  id: number;
  phaseId: number;
  name: string;
  status: 'LOBBY' | 'ROUND1' | 'ROUND2' | 'ROUND3' | 'FINISHED';
  currentRound: number;
  currentQuestionIndex: number;
  round1State: 'IDLE' | 'HOPE_STAR_5S' | 'VIDEO_PLAYING' | 'QUESTION_READING' | 'QUESTION_40S' | 'ANSWER_REVEALED' | 'LEADERBOARD';
  createdAt: string;
  players: LivePlayerDto[];
  currentQuestion?: LiveQuestionDto | null;
  questionStartedAt?: number;
  revealedData?: any;
}

export interface LiveAnswerSubmissionDto {
  sessionId: number;
  questionId: number;
  playerId: number;
  selectedOption: string;
  shuffledOrder: string;
  clientTimestamp?: number;
}

export interface LiveRound2Topic {
  id: number;
  sessionId: number;
  code: string;
  scenario1: string;
  scenario2: string;
  maxScore1: number;
  maxScore2: number;
}

export interface LiveRound3Pair {
  id: number;
  sessionId: number;
  pairNumber: number;
  player1Id: number;
  player2Id: number;
  drawnAt?: string;
}

export interface LiveEventMessage {
  eventType: string;
  sessionId: number;
  round: number;
  questionIndex: number;
  payload: any;
  timestamp: number;
}
