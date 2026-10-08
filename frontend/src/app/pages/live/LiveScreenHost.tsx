import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { useSearchParams } from 'react-router-dom';
import confetti from 'canvas-confetti';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Star,
  Timer,
  CheckCircle2,
  XCircle,
  Award,
  Zap,
  Users,
  Radio,
  ArrowUp,
  ArrowDown,
  Minus,
  Sparkles,
  Trophy,
  Volume2,
  VolumeX,
  Maximize2,
  Play,
  BarChart3,
  Crown,
  ChevronRight,
  BookOpen,
  Clock,
  RotateCcw,
  Swords,
  AlertTriangle,
  Flame,
  ShieldAlert,
  Lightbulb,
  FileText,
  X,
  Pause,
  ChevronLeft,
} from 'lucide-react';
import { liveApi } from '../../../api/liveApi';
import { adminLiveApi } from '../../../api/admin/adminLiveApi';
import BrandMark from '../../components/BrandMark';
import DigitalTechBackground from '../../components/DigitalTechBackground';
import { useLiveSocket } from '../../../hooks/useLiveSocket';
import { liveSound } from '../../../utils/liveSound';
import {
  LiveEventMessage,
  LivePlayerDto,
  LiveQuestionDto,
  LiveRound2Topic,
  LiveRound3Pair,
  LiveRound3DisplayPair,
  LiveSessionDto,
} from '../../../types/live';
import { formatScore } from '../../../utils/scoreFormatter';

const getOptionDisplay = (selected: string | undefined, question: any) => {
  if (!selected || !selected.trim()) return { key: '', text: 'Chưa chọn' };
  const trimmed = selected.trim();
  if (trimmed === 'A') return { key: 'A', text: question?.optionA || 'A' };
  if (trimmed === 'B') return { key: 'B', text: question?.optionB || 'B' };
  if (trimmed === 'C') return { key: 'C', text: question?.optionC || 'C' };
  if (trimmed === 'D') return { key: 'D', text: question?.optionD || 'D' };
  if (question?.optionA && trimmed.toLowerCase() === question.optionA.trim().toLowerCase()) return { key: 'A', text: question.optionA };
  if (question?.optionB && trimmed.toLowerCase() === question.optionB.trim().toLowerCase()) return { key: 'B', text: question.optionB };
  if (question?.optionC && trimmed.toLowerCase() === question.optionC.trim().toLowerCase()) return { key: 'C', text: question.optionC };
  if (question?.optionD && trimmed.toLowerCase() === question.optionD.trim().toLowerCase()) return { key: 'D', text: question.optionD };
  return { key: trimmed.length <= 2 ? trimmed : '', text: trimmed };
};

export default function LiveScreenHost() {
  const [session, setSession] = useState<LiveSessionDto | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [soundEnabled, setSoundEnabled] = useState<boolean>(true);
  const [countdown, setCountdown] = useState<number>(0);
  const [timerRunning, setTimerRunning] = useState<boolean>(false);
  const [maxCountdown, setMaxCountdown] = useState<number>(40);
  const [revealedData, setRevealedData] = useState<any | null>(null);
  const [hopeStarPlayers, setHopeStarPlayers] = useState<Set<number>>(new Set());
  const [answeredPlayers, setAnsweredPlayers] = useState<Set<number>>(new Set());
  const [videoData, setVideoData] = useState<{ url: string; type: string } | null>(null);
  const targetEndTimeRef = useRef<number | null>(null);
  const r2TargetEndTimeRef = useRef<number | null>(null);

  // Round 2 State
  const [round2Topics, setRound2Topics] = useState<LiveRound2Topic[]>([]);
  const [selectedTopic, setSelectedTopic] = useState<LiveRound2Topic | null>(null);
  const [isTopicQuestionRevealed, setIsTopicQuestionRevealed] = useState<boolean>(false);
  const [activePlayerRound2, setActivePlayerRound2] = useState<LivePlayerDto | null>(null);
  const [r2CandidateSelecting, setR2CandidateSelecting] = useState<LivePlayerDto | null>(null);
  const [r2CandidateTopicCode, setR2CandidateTopicCode] = useState<string | null>(null);
  const [r2CurrentBatchPlayers, setR2CurrentBatchPlayers] = useState<LivePlayerDto[]>([]);
  const [r2ViewMode, setR2ViewMode] = useState<'SELECTING' | 'EXAM_RUNNING' | 'TIME_UP' | 'LEADERBOARD'>('SELECTING');
  const [r2LeaderboardTab, setR2LeaderboardTab] = useState<'ROUND2_ONLY' | 'CUMULATIVE'>('ROUND2_ONLY');
  const [round2Timer, setRound2Timer] = useState<number>(600); // 10 minutes (600s)
  const [round2TimerRunning, setRound2TimerRunning] = useState<boolean>(false);
  const [r2InspectingPlayer, setR2InspectingPlayer] = useState<LivePlayerDto | null>(null);
  const [r2AutoRotateEnabled, setR2AutoRotateEnabled] = useState<boolean>(true);
  const [r2AutoRotateSecondsLeft, setR2AutoRotateSecondsLeft] = useState<number>(30);
  const lastRound2SecondRef = useRef<number | null>(null);
  const [isPreview3Rounds, setIsPreview3Rounds] = useState<boolean>(false);

  // Round 3 Pairing & Duel State
  const [isShufflingPairs, setIsShufflingPairs] = useState<boolean>(false);
  const [round3Pairs, setRound3Pairs] = useState<any[]>([]);
  const [round3DisplayPairs, setRound3DisplayPairs] = useState<LiveRound3DisplayPair[]>([
    { pairNumber: 1, player1: null, player2: null },
    { pairNumber: 2, player1: null, player2: null },
    { pairNumber: 3, player1: null, player2: null },
    { pairNumber: 4, player1: null, player2: null },
    { pairNumber: 5, player1: null, player2: null },
  ]);
  const [round3DuelTimer, setRound3DuelTimer] = useState<number>(120);
  const [round3DuelTimerRunning, setRound3DuelTimerRunning] = useState<boolean>(false);
  const [round3DuelTimeUp, setRound3DuelTimeUp] = useState<boolean>(false);
  const [round3OvertimeRunning, setRound3OvertimeRunning] = useState<boolean>(false);
  const [round3OvertimeSeconds, setRound3OvertimeSeconds] = useState<number>(0);
  const r3DuelTargetEndTimeRef = useRef<number | null>(null);
  const r3OvertimeTargetStartRef = useRef<number | null>(null);
  const [round3ViewMode, setRound3ViewMode] = useState<'RULES' | 'PAIRS'>('PAIRS');

  // Winners State
  const [winners, setWinners] = useState<any[]>([]);
  const [finishedViewMode, setFinishedViewMode] = useState<'BOARD' | 'PODIUM'>('BOARD');

  const [searchParams, setSearchParams] = useSearchParams();
  const isPreviewFinished = searchParams.get('preview') === 'final' || searchParams.get('view') === 'finished';

  const isFinalView = session?.status === 'FINISHED' || isPreviewFinished || isPreview3Rounds;

  const round1State = session?.round1State || 'IDLE';

  const fetchSession = useCallback(async () => {
    try {
      setLoading(true);
      const data = await liveApi.getActiveSession();
      setSession(data);
      if (data?.revealedData) {
        setRevealedData(data.revealedData);
      }
      if (data.id) {
        const topics = await liveApi.getRound2Topics(data.id);
        setRound2Topics(topics);
        try {
          const pairs = await liveApi.getRound3DisplayPairs(data.id);
          if (pairs && pairs.length > 0) {
            setRound3DisplayPairs(pairs);
          }
        } catch (e) {
          console.error('Lỗi tải danh sách cặp đấu V3:', e);
        }
      }

      // Khôi phục đồng hồ Vòng 3 nếu reload trang trong lúc đang tranh tài
      if (data && data.status === 'ROUND3' && data.round3DuelState) {
        const duel = data.round3DuelState as any;
        if (duel.isTimerRunning && duel.endAt) {
          const duration = Number(duel.durationSeconds || 120);
          const rawRemaining = Math.max(0, Math.ceil((duel.endAt - Date.now()) / 1000));
          const remainingR3 = Math.min(duration, rawRemaining);
          if (remainingR3 > 0) {
            r3DuelTargetEndTimeRef.current = Date.now() + remainingR3 * 1000;
            setRound3DuelTimer(remainingR3);
            setRound3DuelTimerRunning(true);
            setRound3DuelTimeUp(false);
          } else {
            r3DuelTargetEndTimeRef.current = null;
            setRound3DuelTimer(0);
            setRound3DuelTimerRunning(false);
            setRound3DuelTimeUp(true);
          }
        } else if (duel.isTimeUp) {
          r3DuelTargetEndTimeRef.current = null;
          setRound3DuelTimer(0);
          setRound3DuelTimerRunning(false);
          setRound3DuelTimeUp(true);
        } else {
          r3DuelTargetEndTimeRef.current = null;
          setRound3DuelTimer(0);
          setRound3DuelTimerRunning(false);
          setRound3DuelTimeUp(false);
        }

        if (duel.isOvertimeRunning && duel.overtimeStartedAt) {
          r3OvertimeTargetStartRef.current = duel.overtimeStartedAt;
          const elapsed = Math.max(0, Math.floor((Date.now() - duel.overtimeStartedAt) / 1000));
          setRound3OvertimeSeconds(elapsed);
          setRound3OvertimeRunning(true);
        } else if (duel.overtimeSeconds) {
          setRound3OvertimeSeconds(Number(duel.overtimeSeconds));
          setRound3OvertimeRunning(false);
        }
      }

      if (data && data.status === 'ROUND3') {
        if (data.round3ViewMode === 'RULES') {
          setRound3ViewMode('RULES');
        } else {
          setRound3ViewMode('PAIRS');
        }
      }

      // Khôi phục đồng hồ nếu reload trang trong lúc đang đếm ngược
      if (data && (data.round1State === 'QUESTION_40S' || data.round1State === 'HOPE_STAR_5S')) {
        const limit = data.round1State === 'HOPE_STAR_5S' ? 5 : (data.currentQuestion?.timeLimitSeconds || 40);
        const started = data.questionStartedAt || Date.now();
        const target = started + limit * 1000;
        const remaining = Math.max(0, Math.ceil((target - Date.now()) / 1000));
        if (remaining > 0) {
          targetEndTimeRef.current = target;
          setMaxCountdown(limit);
          setCountdown(remaining);
          setTimerRunning(true);
        } else {
          targetEndTimeRef.current = null;
          setCountdown(0);
          setTimerRunning(false);
          if (data.round1State === 'QUESTION_40S' && data.currentQuestionIndex) {
            adminLiveApi.revealAnswer(data.id, data.currentQuestionIndex).catch(() => {});
          }
        }
      }

      // Khôi phục đồng hồ Vòng 2 10 phút nếu reload trang trong lúc đang đếm ngược
      if (data && data.status === 'ROUND2' && data.round2BatchRunning && data.round2BatchEndAt) {
        const remainingR2 = Math.max(0, Math.ceil((data.round2BatchEndAt - Date.now()) / 1000));
        if (remainingR2 > 0) {
          r2TargetEndTimeRef.current = data.round2BatchEndAt;
          setRound2Timer(remainingR2);
          setRound2TimerRunning(true);
          setR2ViewMode('EXAM_RUNNING');
          if (data.round2BatchPlayerIds && data.players) {
            setR2CurrentBatchPlayers(
              data.players.filter((p) => data.round2BatchPlayerIds?.includes(p.id) && (!p.round2Score || Number(p.round2Score) === 0))
            );
          }
        } else {
          r2TargetEndTimeRef.current = null;
          setRound2Timer(0);
          setRound2TimerRunning(false);
          setR2ViewMode('TIME_UP');
        }
      }

      if (data?.players) {
        const availableRound2 = data.players.filter((p) => Boolean(p.round2DrawCode) && (!p.round2Score || Number(p.round2Score) === 0));
        setR2CurrentBatchPlayers((prev) => {
          if (prev.length === 0) return availableRound2;
          return prev
            .map((bp) => data.players?.find((p) => p.id === bp.id) || bp)
            .filter((p) => Boolean(p.round2DrawCode) && (!p.round2Score || Number(p.round2Score) === 0));
        });

        if (data.round2InspectingPlayerId) {
          const inspected = data.players.find((p) => p.id === data.round2InspectingPlayerId);
          if (inspected) setR2InspectingPlayer(inspected);
        }
      }

      if (data && data.status === 'FINISHED' && !isPreview3Rounds && !searchParams.get('preview')) {
        setFinishedViewMode('PODIUM');
      }
    } catch (err) {
      console.error('Lỗi tải dữ liệu màn hình chính:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchSession();
  }, [fetchSession]);

  // WebSocket Event Listener
  const handleSocketMessage = useCallback(
    (event: LiveEventMessage) => {
      console.log('[LiveScreenHost WS]', event.eventType, event.payload);

      switch (event.eventType) {
        case 'SESSION_STATUS_CHANGED':
          setSession(event.payload);
          break;

        case 'SESSION_RESET':
          setSession(event.payload);
          setRevealedData(null);
          setAnsweredPlayers(new Set());
          setHopeStarPlayers(new Set());
          setR2CurrentBatchPlayers([]);
          setSelectedTopic(null);
          setTimerRunning(false);
          setCountdown(0);
          break;

        case 'PLAYERS_CONFIGURED':
          if (event.payload) {
            setSession((prev) => (prev ? { ...prev, players: event.payload } : prev));
          } else {
            fetchSession();
          }
          break;

        case 'PLAYER_CHECKED_IN':
          setSession((prev) => {
            if (!prev) return prev;
            return {
              ...prev,
              players: prev.players.map((p) =>
                p.id === event.payload.id ? { ...p, isCheckedIn: true } : p
              ),
            };
          });
          break;

        case 'HOPE_STAR_STARTED': {
          setRevealedData(null);
          setAnsweredPlayers(new Set());
          setHopeStarPlayers(new Set());
          const limit = event.payload.timeLimitSeconds || 5;
          const started = event.payload.startedAt || Date.now();
          targetEndTimeRef.current = started + limit * 1000;
          setMaxCountdown(limit);
          setCountdown(limit);
          setTimerRunning(true);
          setSession((prev) => {
            if (!prev) return prev;
            return {
              ...prev,
              status: 'ROUND1',
              currentRound: 1,
              round1State: 'HOPE_STAR_5S',
              currentQuestionIndex: event.payload.questionOrder ?? prev.currentQuestionIndex,
            };
          });
          if (soundEnabled) liveSound.playHopeStarChime();
          break;
        }

        case 'HOPE_STAR_ACTIVATED':
          setHopeStarPlayers((prev) => new Set(prev).add(event.payload.playerId));
          if (soundEnabled) liveSound.playHopeStarChime();
          break;

        case 'VIDEO_PLAYING':
          targetEndTimeRef.current = null;
          setTimerRunning(false);
          setCountdown(0);
          setVideoData({
            url: event.payload.videoUrl || '',
            type: event.payload.videoType || 'NONE',
          });
          setSession((prev) => {
            if (!prev) return prev;
            return {
              ...prev,
              status: 'ROUND1',
              currentRound: 1,
              round1State: 'VIDEO_PLAYING',
              currentQuestionIndex: event.payload.questionOrder ?? prev.currentQuestionIndex,
            };
          });
          break;

        case 'QUESTION_READING':
          targetEndTimeRef.current = null;
          setTimerRunning(false);
          setCountdown(40);
          setMaxCountdown(40);
          setVideoData(null);
          setSession((prev) => {
            if (!prev) return prev;
            return {
              ...prev,
              status: 'ROUND1',
              currentRound: 1,
              round1State: 'QUESTION_READING',
              currentQuestionIndex: event.payload.questionOrder ?? prev.currentQuestionIndex,
              currentQuestion: event.payload.question || prev.currentQuestion,
            };
          });
          fetchSession();
          break;

        case 'QUESTION_STARTED': {
          setRevealedData(null);
          setAnsweredPlayers(new Set());
          const limit = event.payload.timeLimitSeconds || 40;
          const started = event.payload.startedAt || Date.now();
          targetEndTimeRef.current = started + limit * 1000;
          setMaxCountdown(limit);
          setCountdown(limit);
          setTimerRunning(true);
          setSession((prev) => {
            if (!prev) return prev;
            return {
              ...prev,
              status: 'ROUND1',
              currentRound: 1,
              round1State: 'QUESTION_40S',
              currentQuestionIndex: event.payload.questionOrder ?? prev.currentQuestionIndex,
              currentQuestion: event.payload.question || prev.currentQuestion,
            };
          });
          break;
        }

        case 'PLAYER_ANSWERED':
          setAnsweredPlayers((prev) => new Set(prev).add(event.payload.playerId));
          break;

        case 'ANSWER_REVEALED':
          targetEndTimeRef.current = null;
          setTimerRunning(false);
          setCountdown(0);
          setRevealedData(event.payload);
          setSession((prev) => {
            if (!prev) return prev;
            return {
              ...prev,
              round1State: 'ANSWER_REVEALED',
              currentQuestionIndex: event.payload.questionOrder ?? prev.currentQuestionIndex,
              players: event.payload.leaderboard || prev.players,
              revealedData: event.payload,
            };
          });
          if (soundEnabled) liveSound.playCorrect();
          fetchSession();
          break;

        case 'LEADERBOARD_UPDATED':
          setSession((prev) => {
            if (!prev) return prev;
            return {
              ...prev,
              round1State: 'LEADERBOARD',
              players: event.payload.leaderboard || prev.players,
            };
          });
          fetchSession();
          break;

        case 'ROUND2_CANDIDATE_SELECTED':
          if (!event.payload?.player || event.payload?.playerId === 0) {
            setR2InspectingPlayer(null);
          } else {
            const pl = { ...event.payload.player };
            if (event.payload.scenario1 || event.payload.topic?.scenario1) {
              (pl as any).scenario1 = event.payload.scenario1 || event.payload.topic?.scenario1;
              (pl as any).scenario2 = event.payload.scenario2 || event.payload.topic?.scenario2;
            }
            setActivePlayerRound2(pl);
            setR2CandidateSelecting(pl);
            setR2CandidateTopicCode(pl.round2DrawCode || null);
            setR2InspectingPlayer(pl);
            setR2AutoRotateSecondsLeft(30);
            setR2ViewMode((prev) => (prev === 'EXAM_RUNNING' ? 'EXAM_RUNNING' : 'SELECTING'));
            if (soundEnabled) liveSound.playButtonClick();
          }
          break;

        case 'ROUND2_TOPIC_ASSIGNED':
          if (event.payload.topic) {
            setSelectedTopic(event.payload.topic);
          }
          if (event.payload.topicCode) {
            setR2CandidateTopicCode(event.payload.topicCode);
          }
          if (event.payload.player) {
            const p = event.payload.player;
            setActivePlayerRound2(p);
            setR2CandidateSelecting(p);
            if (!p.round2Score || Number(p.round2Score) === 0) {
              setR2CurrentBatchPlayers((prev) => {
                const exists = prev.some((item) => item.id === p.id);
                return exists
                  ? prev.map((item) =>
                      item.id === p.id ? { ...item, round2DrawCode: event.payload.topicCode } : item
                    )
                  : [...prev, { ...p, round2DrawCode: event.payload.topicCode }];
              });
            }
          }
          if (soundEnabled) liveSound.playCorrect();
          fetchSession();
          break;

        case 'ROUND2_SCORE_UPDATED': {
          const scoredId = event.payload?.playerId;
          if (scoredId) {
            setR2CurrentBatchPlayers((prev) => prev.filter((p) => p.id !== scoredId));
            if (r2CandidateSelecting?.id === scoredId) {
              setR2CandidateSelecting(null);
              setR2CandidateTopicCode(null);
            }
            if (activePlayerRound2?.id === scoredId) {
              setActivePlayerRound2(null);
            }
          }
          fetchSession();
          break;
        }

        case 'ROUND2_TOPIC_UNASSIGNED': {
          const pId = event.payload?.playerId;
          setR2CurrentBatchPlayers((prev) => prev.filter((p) => p.id !== pId));
          if (r2CandidateSelecting?.id === pId) {
            setR2CandidateTopicCode(null);
          }
          fetchSession();
          break;
        }

        case 'ROUND2_PLAYER_RESET': {
          fetchSession();
          break;
        }

        case 'ROUND2_BATCH_STARTED': {
          setR2InspectingPlayer(null);
          setR2ViewMode('EXAM_RUNNING');
          const endAt = event.payload.endAt || (Date.now() + (event.payload.durationSeconds || 600) * 1000);
          r2TargetEndTimeRef.current = endAt;
          const rem = Math.max(0, Math.ceil((endAt - Date.now()) / 1000));
          setRound2Timer(rem);
          setRound2TimerRunning(true);
          if (event.payload.players && event.payload.players.length > 0) {
            const valid = event.payload.players.filter((p: LivePlayerDto) => !p.round2Score || Number(p.round2Score) === 0);
            setR2CurrentBatchPlayers(valid);
          }
          if (soundEnabled) liveSound.playFanfare();
          break;
        }

        case 'ROUND2_BATCH_ENDED':
          r2TargetEndTimeRef.current = null;
          setR2InspectingPlayer(null);
          setR2ViewMode('TIME_UP');
          setRound2TimerRunning(false);
          setRound2Timer(0);
          if (soundEnabled) liveSound.playBuzzer();
          break;

        case 'ROUND2_LEADERBOARD_REVEALED':
          if (event.payload?.viewType === 'PREVIEW_3_ROUNDS') {
            setIsPreview3Rounds(true);
            setFinishedViewMode('BOARD');
          } else {
            setIsPreview3Rounds(false);
            setR2ViewMode('LEADERBOARD');
          }
          fetchSession();
          if (soundEnabled) liveSound.playFanfare();
          break;

        case 'ROUND2_SELECTING_REVEALED':
          setIsPreview3Rounds(false);
          setR2ViewMode('SELECTING');
          setR2CandidateSelecting(null);
          setActivePlayerRound2(null);
          setR2CandidateTopicCode(null);
          setR2CurrentBatchPlayers((prev) => prev.filter((p) => !p.round2Score || Number(p.round2Score) === 0));
          fetchSession();
          break;

        case 'ROUND2_BATCH_RESET':
          r2TargetEndTimeRef.current = null;
          setIsPreview3Rounds(false);
          setR2ViewMode('SELECTING');
          setR2CandidateSelecting(null);
          setActivePlayerRound2(null);
          setR2CandidateTopicCode(null);
          setR2CurrentBatchPlayers([]);
          setRound2Timer(600);
          setRound2TimerRunning(false);
          fetchSession();
          break;

        case 'ROUND2_TOPIC_REVEALED':
          setSelectedTopic((prev) => ({
            id: prev?.id || 0,
            sessionId: event.payload.sessionId,
            code: event.payload.topicCode,
            scenario1: event.payload.scenario1,
            scenario2: event.payload.scenario2,
            maxScore1: event.payload.maxScore1 || 20,
            maxScore2: event.payload.maxScore2 || 20,
          }));
          setIsTopicQuestionRevealed(true);
          setRound2Timer(600);
          setRound2TimerRunning(true);
          if (soundEnabled) liveSound.playCorrect();
          break;

        case 'ROUND3_SCORE_UPDATED':
          fetchSession();
          break;

        case 'ROUND3_PAIRS_UPDATED':
          if (event.payload?.pairs) {
            setRound3DisplayPairs(event.payload.pairs);
          }
          fetchSession();
          break;

        case 'ROUND3_DUEL_DISPLAYED': {
          const duel = event.payload;
          setSession((prev) => (prev ? { ...prev, round3DuelState: duel } : prev));
          r3DuelTargetEndTimeRef.current = null;
          setRound3DuelTimer(0);
          setRound3DuelTimerRunning(false);
          setRound3DuelTimeUp(false);
          setRound3OvertimeRunning(false);
          setRound3OvertimeSeconds(0);
          r3OvertimeTargetStartRef.current = null;
          if (soundEnabled) liveSound.playCorrect();
          break;
        }

        case 'ROUND3_DUEL_STARTED': {
          const duel = event.payload;
          setSession((prev) => (prev ? { ...prev, round3DuelState: duel } : prev));
          const duration = Number(duel.durationSeconds || 120);
          r3DuelTargetEndTimeRef.current = Date.now() + duration * 1000;
          setRound3DuelTimer(duration);
          setRound3DuelTimerRunning(true);
          setRound3DuelTimeUp(false);
          setRound3OvertimeRunning(false);
          setRound3OvertimeSeconds(0);
          r3OvertimeTargetStartRef.current = null;
          if (soundEnabled) liveSound.playFanfare();
          break;
        }

        case 'ROUND3_DUEL_TIME_UP':
          setSession((prev) => (prev ? {
            ...prev,
            round3DuelState: {
              ...(prev.round3DuelState || {}),
              isTimerRunning: false,
              isTimeUp: true
            }
          } : prev));
          r3DuelTargetEndTimeRef.current = null;
          setRound3DuelTimerRunning(false);
          setRound3DuelTimer(0);
          setRound3DuelTimeUp(true);
          if (soundEnabled) liveSound.playBuzzer();
          break;

        case 'ROUND3_OVERTIME_STARTED':
          setRound3OvertimeRunning(true);
          setRound3OvertimeSeconds(0);
          r3OvertimeTargetStartRef.current = event.payload?.overtimeStartedAt || Date.now();
          if (soundEnabled) liveSound.playTick();
          break;

        case 'ROUND3_OVERTIME_STOPPED':
          setRound3OvertimeRunning(false);
          setRound3OvertimeSeconds(Number(event.payload?.overtimeSeconds || 0));
          r3OvertimeTargetStartRef.current = null;
          if (soundEnabled) liveSound.playCorrect();
          break;

        case 'ROUND3_SHOW_ALL_PAIRS':
          setRound3ViewMode('PAIRS');
          setSession((prev) => (prev ? { ...prev, round3DuelState: undefined, round3ViewMode: 'PAIRS' } : prev));
          r3DuelTargetEndTimeRef.current = null;
          setRound3DuelTimerRunning(false);
          setRound3DuelTimer(0);
          setRound3DuelTimeUp(false);
          setRound3OvertimeRunning(false);
          setRound3OvertimeSeconds(0);
          r3OvertimeTargetStartRef.current = null;
          fetchSession();
          break;

        case 'ROUND3_RULES_DISPLAYED':
          setRound3ViewMode('RULES');
          setSession((prev) => (prev ? { ...prev, round3DuelState: undefined, round3ViewMode: 'RULES' } : prev));
          r3DuelTargetEndTimeRef.current = null;
          setRound3DuelTimerRunning(false);
          setRound3DuelTimer(0);
          setRound3DuelTimeUp(false);
          setRound3OvertimeRunning(false);
          setRound3OvertimeSeconds(0);
          r3OvertimeTargetStartRef.current = null;
          if (soundEnabled) liveSound.playCorrect();
          break;

        case 'ROUND3_PAIR_DRAWN':
          // Run Roulette Animation
          setIsShufflingPairs(true);
          if (soundEnabled) {
            const interval = setInterval(() => liveSound.playRouletteTick(), 100);
            setTimeout(() => {
              clearInterval(interval);
              setIsShufflingPairs(false);
              setRound3Pairs(event.payload.pairs || []);
              liveSound.playCorrect();
            }, 3000);
          } else {
            setTimeout(() => {
              setIsShufflingPairs(false);
              setRound3Pairs(event.payload.pairs || []);
            }, 2000);
          }
          break;

        case 'WINNERS_ANNOUNCED':
          setWinners(event.payload.winners || []);
          setFinishedViewMode('PODIUM');
          setIsPreview3Rounds(false);
          if (soundEnabled) liveSound.playGrandFanfare();
          try {
            confetti({
              particleCount: 160,
              spread: 100,
              origin: { y: 0.6 },
            });
          } catch (e) {}
          break;

        case 'FINISH_VIEW_MODE_CHANGED':
          if (event.payload?.viewMode === 'BOARD') {
            setFinishedViewMode('BOARD');
          } else {
            setFinishedViewMode('PODIUM');
            if (soundEnabled) liveSound.playGrandFanfare();
            try {
              confetti({ particleCount: 160, spread: 100, origin: { y: 0.6 } });
            } catch (e) {}
          }
          break;

        default:
          break;
      }
    },
    [soundEnabled, session, fetchSession]
  );

  const { isConnected } = useLiveSocket({
    sessionId: session?.id,
    onMessage: handleSocketMessage,
  });

  // Countdown timer for 40s / 5s synchronized with server epoch
  useEffect(() => {
    if (!timerRunning || !targetEndTimeRef.current) return;
    const interval = setInterval(() => {
      const remaining = Math.max(0, Math.ceil((targetEndTimeRef.current! - Date.now()) / 1000));
      setCountdown(remaining);
      if (remaining <= 0) {
        clearInterval(interval);
        setTimerRunning(false);
        targetEndTimeRef.current = null;
        if (soundEnabled) liveSound.playBuzzer();

        // Tự động chốt kết quả và công bố đáp án khi đếm ngược chạm 0s
        if (session?.id && session.currentQuestionIndex && round1State === 'QUESTION_40S') {
          adminLiveApi.revealAnswer(session.id, session.currentQuestionIndex).catch(() => {});
        }
      } else if (remaining <= 10 && soundEnabled) {
        liveSound.playUrgentCountdown(remaining);
      } else if (remaining <= 15 && soundEnabled) {
        liveSound.playTick();
      }
    }, 250);
    return () => clearInterval(interval);
  }, [timerRunning, soundEnabled, session?.id, session?.currentQuestionIndex, round1State]);

  // Round 2 10-minute timer ticker synchronized with server epoch
  useEffect(() => {
    if (!round2TimerRunning || !r2TargetEndTimeRef.current) {
      lastRound2SecondRef.current = null;
      return;
    }
    const interval = setInterval(() => {
      const remaining = Math.max(0, Math.ceil((r2TargetEndTimeRef.current! - Date.now()) / 1000));
      setRound2Timer(remaining);

      // Play standard countdown tick sound on each second elapsed
      if (lastRound2SecondRef.current !== remaining && remaining > 0) {
        lastRound2SecondRef.current = remaining;
        if (soundEnabled) {
          liveSound.playTick(remaining <= 5 ? 1046 : 880);
        }
      }

      if (remaining <= 0) {
        clearInterval(interval);
        setRound2TimerRunning(false);
        r2TargetEndTimeRef.current = null;
        setR2ViewMode('TIME_UP');
        if (soundEnabled) liveSound.playBuzzer();
      }
    }, 200);
    return () => clearInterval(interval);
  }, [round2TimerRunning, soundEnabled]);

  // Hàm tìm kiếm bộ đề chuẩn hóa theo mã đề
  const getTopicForCode = useCallback(
    (code?: string | null) => {
      if (!code) return null;
      const clean = code.trim().toUpperCase();
      let found = round2Topics.find((t) => t.code?.trim().toUpperCase() === clean);
      if (found) return found;
      const numMatch = clean.match(/\d+/);
      if (numMatch) {
        const num = parseInt(numMatch[0], 10);
        found = round2Topics.find((t) => {
          const tNum = t.code?.match(/\d+/);
          return tNum && parseInt(tNum[0], 10) === num;
        });
      }
      return found;
    },
    [round2Topics]
  );

  // Tự động tải lại nội dung đề thi đầy đủ nếu chưa có scenario text
  useEffect(() => {
    if (r2InspectingPlayer && session?.id) {
      const topic = getTopicForCode(r2InspectingPlayer.round2DrawCode);
      if (!topic || !topic.scenario1) {
        liveApi.getRound2Topics(session.id).then((topics) => {
          if (topics && topics.length > 0) {
            setRound2Topics(topics);
          }
        }).catch(() => {});
      }
    }
  }, [r2InspectingPlayer, session?.id, getTopicForCode]);

  // Auto-rotation effect for Round 2 (chuyển đề mỗi 30 giây theo thứ tự từ trái qua phải)
  useEffect(() => {
    if (r2ViewMode !== 'EXAM_RUNNING' || !round2TimerRunning || !r2AutoRotateEnabled) {
      return;
    }

    const interval = setInterval(() => {
      setR2AutoRotateSecondsLeft((prev) => {
        if (prev <= 1) {
          const list = (r2CurrentBatchPlayers && r2CurrentBatchPlayers.length > 0)
            ? r2CurrentBatchPlayers
            : (session?.players || [])
                .filter((p) => Boolean(p.round2DrawCode) && (!p.round2Score || Number(p.round2Score) === 0))
                .sort((a, b) => (a.orderNumber ?? 0) - (b.orderNumber ?? 0));

          if (list.length > 1) {
            setR2InspectingPlayer((current) => {
              const currentId = current?.id || list[0].id;
              const currentIndex = list.findIndex((p) => p.id === currentId);
              const nextIndex = (currentIndex + 1) % list.length;
              return list[nextIndex];
            });
          }
          return 30;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(interval);
  }, [r2ViewMode, round2TimerRunning, r2AutoRotateEnabled, r2CurrentBatchPlayers, session?.players]);

  // Round 3 Duel countdown ticker synchronized with server epoch
  useEffect(() => {
    if (!round3DuelTimerRunning || !r3DuelTargetEndTimeRef.current) return;
    const interval = setInterval(() => {
      const remaining = Math.max(0, Math.ceil((r3DuelTargetEndTimeRef.current! - Date.now()) / 1000));
      setRound3DuelTimer(remaining);
      if (remaining <= 0) {
        clearInterval(interval);
        setRound3DuelTimerRunning(false);
        r3DuelTargetEndTimeRef.current = null;
        setRound3DuelTimeUp(true);
        if (soundEnabled) liveSound.playBuzzer();
      } else if (remaining <= 10 && soundEnabled) {
        liveSound.playUrgentCountdown(remaining);
      } else if (remaining <= 15 && soundEnabled) {
        liveSound.playTick();
      }
    }, 250);
    return () => clearInterval(interval);
  }, [round3DuelTimerRunning, soundEnabled]);

  // Round 3 Overtime ticker
  useEffect(() => {
    if (!round3OvertimeRunning || !r3OvertimeTargetStartRef.current) return;
    const interval = setInterval(() => {
      const elapsed = Math.max(0, Math.floor((Date.now() - r3OvertimeTargetStartRef.current!) / 1000));
      setRound3OvertimeSeconds(elapsed);
    }, 500);
    return () => clearInterval(interval);
  }, [round3OvertimeRunning]);

  const handleNextCandidate = useCallback(() => {
    const list = (r2CurrentBatchPlayers && r2CurrentBatchPlayers.length > 0)
      ? r2CurrentBatchPlayers
      : (session?.players || [])
          .filter((p) => Boolean(p.round2DrawCode) && (!p.round2Score || Number(p.round2Score) === 0))
          .sort((a, b) => (a.orderNumber ?? 0) - (b.orderNumber ?? 0));
    if (list.length === 0) return;
    const currentId = r2InspectingPlayer?.id || list[0].id;
    const idx = list.findIndex((p) => p.id === currentId);
    const nextIdx = (idx + 1) % list.length;
    setR2InspectingPlayer(list[nextIdx]);
    setR2AutoRotateSecondsLeft(30);
  }, [r2CurrentBatchPlayers, session?.players, r2InspectingPlayer]);

  const handlePrevCandidate = useCallback(() => {
    const list = (r2CurrentBatchPlayers && r2CurrentBatchPlayers.length > 0)
      ? r2CurrentBatchPlayers
      : (session?.players || [])
          .filter((p) => Boolean(p.round2DrawCode) && (!p.round2Score || Number(p.round2Score) === 0))
          .sort((a, b) => (a.orderNumber ?? 0) - (b.orderNumber ?? 0));
    if (list.length === 0) return;
    const currentId = r2InspectingPlayer?.id || list[0].id;
    const idx = list.findIndex((p) => p.id === currentId);
    const prevIdx = (idx - 1 + list.length) % list.length;
    setR2InspectingPlayer(list[prevIdx]);
    setR2AutoRotateSecondsLeft(30);
  }, [r2CurrentBatchPlayers, session?.players, r2InspectingPlayer]);

  const toggleFullscreen = () => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen().catch(() => {});
    } else {
      document.exitFullscreen().catch(() => {});
    }
  };

  // Check-in count
  const checkedInCount = useMemo(() => {
    return session?.players?.filter((p) => p.isCheckedIn).length ?? 0;
  }, [session?.players]);

  // Realtime sorted leaderboard:
  // 1. Tổng điểm tích lũy (totalScore hoặc round1Score) giảm dần
  // 2. Trạng thái điểm danh (isCheckedIn: có thi/vào phòng) xếp trước
  // 3. Thời gian trả lời tích lũy (round1TotalTimeMs) tăng dần (nhanh hơn xếp trước)
  // 4. Số báo danh (orderNumber / SBD) tăng dần
  const sortedLeaderboard = useMemo(() => {
    if (!session?.players) return [];
    return [...session.players].sort((a, b) => {
      const scoreA = Number(a.totalScore ?? a.round1Score) || 0;
      const scoreB = Number(b.totalScore ?? b.round1Score) || 0;
      if (scoreB !== scoreA) {
        return scoreB - scoreA;
      }
      const checkedA = a.isCheckedIn ? 1 : 0;
      const checkedB = b.isCheckedIn ? 1 : 0;
      if (checkedB !== checkedA) {
        return checkedB - checkedA;
      }
      const timeA = Number(a.round1TotalTimeMs) || 0;
      const timeB = Number(b.round1TotalTimeMs) || 0;
      if (timeA !== timeB) {
        return timeA - timeB;
      }
      return (a.orderNumber || 0) - (b.orderNumber || 0);
    });
  }, [session?.players]);

  // Active revealed data (fallback to session.revealedData)
  const currentRevealed = useMemo(() => {
    return revealedData || session?.revealedData || null;
  }, [revealedData, session?.revealedData]);

  // Hope star players for current question
  const hopeStarPlayersThisQuestion = useMemo(() => {
    const currentQ = session?.currentQuestionIndex;
    if (!currentQ || !session?.players) return [];
    return session.players.filter((p) => {
      return (
        (p.hopeStarUsed && p.hopeStarQuestionIndex === currentQ) ||
        hopeStarPlayers.has(p.id)
      );
    });
  }, [session?.players, session?.currentQuestionIndex, hopeStarPlayers]);

  // Choice distribution statistics for Round 1 question
  const choiceStats = useMemo(() => {
    const defaultStats = {
      total: 10,
      countA: 0,
      countB: 0,
      countC: 0,
      countD: 0,
      percentA: 0,
      percentB: 0,
      percentC: 0,
      percentD: 0,
      countCorrect: 0,
      percentCorrect: 0,
    };
    if (!currentRevealed) return defaultStats;

    const answers: any[] = currentRevealed.answers || [];
    const stats = currentRevealed.stats || {};
    const totalAnswered = answers.length > 0 ? answers.length : (stats.totalAnswered || 0);

    const currentQ = session?.currentQuestion;
    const matchCount = (key: string, optionText?: string) => {
      const targetKey = key.trim().toLowerCase();
      const targetText = optionText ? optionText.trim().toLowerCase() : '';
      return answers.filter((a) => {
        const sel = (a.selectedOption || '').trim().toLowerCase();
        if (!sel) return false;
        if (sel === targetKey) return true;
        if (targetText && sel === targetText) return true;
        return false;
      }).length;
    };

    const calculatedCountA = matchCount('A', currentQ?.optionA);
    const calculatedCountB = matchCount('B', currentQ?.optionB);
    const calculatedCountC = matchCount('C', currentQ?.optionC);
    const calculatedCountD = matchCount('D', currentQ?.optionD);

    const countA = answers.length > 0 ? calculatedCountA : (stats.countA ?? 0);
    const countB = answers.length > 0 ? calculatedCountB : (stats.countB ?? 0);
    const countC = answers.length > 0 ? calculatedCountC : (stats.countC ?? 0);
    const countD = answers.length > 0 ? calculatedCountD : (stats.countD ?? 0);

    // Tính trực tiếp từ danh sách thí sinh trên màn hình cho câu hỏi hiện tại:
    // Đảm bảo 100% khớp với dải 10 câu hỏi của từng thí sinh đang hiển thị trên bảng xếp hạng!
    const qCurrent = session?.currentQuestionIndex || currentRevealed?.questionOrder || 1;
    let computedCorrect = 0;
    let computedIncorrect = 0;

    if (session?.players && session.players.length > 0) {
      session.players.forEach((p) => {
        const histVal = p.round1History ? p.round1History[qCurrent - 1] : null;
        const currentAns = answers.find((a: any) => a.playerId === p.id);

        if (histVal === true || (histVal === null && currentAns && Boolean(currentAns.isCorrect))) {
          computedCorrect++;
        } else if (
          histVal === false ||
          (histVal === null && currentAns && !currentAns.isCorrect) ||
          (p.isCheckedIn && (p.round1History || currentRevealed))
        ) {
          computedIncorrect++;
        }
      });
    }

    const countCorrect = computedCorrect;
    const countIncorrect = computedIncorrect;
    const computedTotal = countCorrect + countIncorrect;
    const safeTotal = computedTotal > 0 ? computedTotal : (answers.length > 0 ? answers.length : 10);

    return {
      total: safeTotal,
      totalAnswered,
      countA,
      countB,
      countC,
      countD,
      percentA: safeTotal > 0 ? Math.round((countA / safeTotal) * 100) : 0,
      percentB: safeTotal > 0 ? Math.round((countB / safeTotal) * 100) : 0,
      percentC: safeTotal > 0 ? Math.round((countC / safeTotal) * 100) : 0,
      percentD: safeTotal > 0 ? Math.round((countD / safeTotal) * 100) : 0,
      countCorrect,
      countIncorrect,
      percentCorrect: safeTotal > 0 ? Math.round((countCorrect / safeTotal) * 100) : 0,
    };
  }, [currentRevealed, session?.currentQuestion, session?.players, session?.currentQuestionIndex]);

  return (
    <div
      className="min-h-screen bg-gradient-to-b from-[#134bc4] via-[#1d63ea] to-[#1448b8] text-white flex flex-col justify-between overflow-hidden relative select-none"
      style={{ fontFamily: '"Be Vietnam Pro", sans-serif' }}
    >
      {/* Digital Transformation Vector Graphic Background matching Homepage */}
      <DigitalTechBackground />
      <div
        className="absolute inset-0 opacity-[0.04] pointer-events-none"
        style={{
          backgroundImage: "radial-gradient(#ffffff 1.5px, transparent 1.5px)",
          backgroundSize: "20px 20px",
        }}
      />

      {/* TOP BAR: Clean high-contrast navbar with Đoàn TNCS brand matching Homepage */}
      <header className="relative z-10 px-8 py-3.5 border-b border-white/15 flex items-center justify-between bg-[#10348c]/90 backdrop-blur-md shadow-md text-white">
        <div className="flex items-center gap-4">
          <BrandMark size={52} showBorder={false} className="shrink-0" />
          <div>
            <p className="text-xs font-black tracking-wider uppercase text-yellow-300">
              TỈNH ĐOÀN NGHỆ AN
            </p>
            <h1 className="text-xl font-extrabold uppercase tracking-wide text-white drop-shadow-xs">
              CHUNG KẾT HỘI THI BÍ THƯ ĐOÀN CƠ SỞ GIỎI TỈNH NGHỆ AN NĂM 2026
            </h1>
            <div className="text-xs font-bold text-sky-200 tracking-wide italic">
              "Đổi mới mạnh mẽ phương thức hoạt động của Đoàn"
            </div>
          </div>
        </div>

        {/* Stage Status Pill */}
        <div className="flex items-center gap-4">
          <div className="px-4 py-1.5 rounded-full bg-white/15 border border-white/20 text-white text-xs font-bold uppercase tracking-wider flex items-center gap-2 shadow-xs">
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-ping" />
            {isPreviewFinished && '👁️ XEM TRƯỚC: TỔNG KẾT 3 VÒNG'}
            {!isPreviewFinished && session?.status === 'LOBBY' && 'SẢNH CHỜ • ĐIỂM DANH THÍ SINH'}
            {!isPreviewFinished && session?.status === 'ROUND1' && (round1State === 'IDLE' ? 'VÒNG 1: THÔNG THÁI • PHỔ BIẾN THỂ LỆ' : `VÒNG 1: THÔNG THÁI • CÂU ${session?.currentQuestionIndex || 1}/10`)}
            {!isPreviewFinished && session?.status === 'ROUND2' && 'VÒNG 2: NHẠY BÉN • 10 PHÚT'}
            {!isPreviewFinished && session?.status === 'ROUND3' && 'VÒNG 3: BẢN LĨNH • ĐỐI KHÁNG'}
            {!isPreviewFinished && session?.status === 'FINISHED' && 'LỄ TRAO GIẢI & VINH DANH'}
          </div>

          <div className="flex items-center gap-2 text-white">
            {isPreviewFinished ? (
              <button
                onClick={() => {
                  searchParams.delete('preview');
                  searchParams.delete('view');
                  setSearchParams(searchParams);
                }}
                className="px-3 py-1.5 rounded-xl bg-yellow-400 hover:bg-yellow-300 text-blue-950 font-black text-xs flex items-center gap-1 shadow-md transition-all active:scale-95"
                title="Quay lại trạng thái trực tiếp của phiên thi"
              >
                <span>✕ Thoát Xem trước</span>
              </button>
            ) : (
              <button
                onClick={() => {
                  searchParams.set('preview', 'final');
                  setSearchParams(searchParams);
                }}
                className="px-3 py-1.5 rounded-xl bg-white/15 hover:bg-white/25 text-white border border-white/20 font-bold text-xs flex items-center gap-1 shadow-xs transition-colors"
                title="Bật xem trước màn hình tổng kết 3 vòng chung cuộc"
              >
                <Trophy className="w-3.5 h-3.5 text-yellow-300" />
                <span>Xem trước Bảng 3 vòng</span>
              </button>
            )}
            <button
              onClick={() => setSoundEnabled(!soundEnabled)}
              className="p-2 rounded-xl bg-white/15 border border-white/20 hover:bg-white/25 text-white transition-colors shadow-xs"
              title={soundEnabled ? 'Tắt âm thanh' : 'Bật âm thanh'}
            >
              {soundEnabled ? <Volume2 className="w-4 h-4 text-emerald-300" /> : <VolumeX className="w-4 h-4 text-rose-300" />}
            </button>
            <button
              onClick={toggleFullscreen}
              className="p-2 rounded-xl bg-white/15 border border-white/20 hover:bg-white/25 text-white transition-colors shadow-xs"
              title="Toàn màn hình"
            >
              <Maximize2 className="w-4 h-4" />
            </button>
          </div>
        </div>
      </header>

      {/* CENTER STAGE: Dynamic Arena Content */}
      <main className="relative z-10 flex-1 flex flex-col justify-center px-6 lg:px-12 py-3 max-w-[1720px] mx-auto w-full">
        {/* 1. LOBBY VIEW: 10 Contestants Grid */}
        {!isFinalView && session?.status === 'LOBBY' && (
          <div className="space-y-6 animate-fadeIn">
            <div className="text-center">
              <div className="inline-flex items-center gap-2 px-4 py-1 rounded-full bg-white/20 border border-white/30 text-yellow-300 text-xs font-black uppercase tracking-wider mb-2 shadow-xs">
                <Sparkles className="w-3.5 h-3.5 text-yellow-300" /> 10 GƯƠNG MẶT XUẤT SẮC NHẤT
              </div>
              <h2 className="text-3xl font-black text-white drop-shadow-md">DANH SÁCH THÍ SINH VÒNG CHUNG KẾT</h2>
              <p className="text-sm text-sky-100 mt-1">
                Hiện có <strong className="text-yellow-300 font-bold">{checkedInCount} / 10</strong> thí sinh đã điểm danh
              </p>
            </div>

            <div className="grid grid-cols-5 gap-4">
              {session?.players?.map((p) => (
                <div
                  key={p.id}
                  className={`relative rounded-3xl p-5 border-2 transition-all duration-300 flex flex-col items-center text-center shadow-xl ${
                    p.isCheckedIn
                      ? 'bg-white border-blue-400 shadow-blue-500/20 ring-4 ring-blue-500/10'
                      : 'bg-white/95 border-slate-200 opacity-80'
                  }`}
                >
                  <div className="w-24 h-24 rounded-2xl bg-slate-100 border-2 border-blue-500 flex items-center justify-center text-3xl font-black text-blue-700 mb-3 overflow-hidden shadow-md">
                    {p.avatarUrl ? (
                      <img src={p.avatarUrl} alt={p.fullName} className="w-full h-full object-cover" />
                    ) : (
                      <span className="text-2xl font-black text-blue-600">
                        {(p.fullName.trim().split(/\s+/).slice(-1)[0] || p.fullName).charAt(0).toUpperCase()}
                      </span>
                    )}
                  </div>

                  <h3 className="text-base font-extrabold text-slate-900 line-clamp-1">{p.fullName}</h3>
                  <p className="text-xs font-semibold text-slate-600 mt-1 line-clamp-1">{p.unit}</p>

                  <div className="mt-3.5">
                    {p.isCheckedIn ? (
                      <span className="inline-flex items-center gap-1.5 text-xs font-bold text-emerald-700 bg-emerald-50 px-3 py-1 rounded-full border border-emerald-300 shadow-sm">
                        <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" /> ĐÃ ĐIỂM DANH
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 text-xs font-medium text-slate-500 bg-slate-100 px-3 py-1 rounded-full border border-slate-200">
                        Chờ điểm danh
                      </span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* 2. ROUND 1 VIEW */}
        {!isFinalView && session?.status === 'ROUND1' && (
          <div className="space-y-6 animate-fadeIn">
            {/* Phase 0: Thể lệ Vòng 1 khi chưa bắt đầu câu hỏi (IDLE) */}
            {(!round1State || round1State === 'IDLE') && (
              <div className="space-y-6 animate-fadeIn py-2">
                <div className="text-center max-w-4xl mx-auto">
                  <div className="inline-flex items-center gap-3 px-7 py-3 rounded-full bg-gradient-to-r from-red-600 via-rose-600 to-amber-600 text-yellow-200 text-base sm:text-lg lg:text-xl font-black uppercase tracking-wider sm:tracking-widest shadow-2xl ring-4 ring-yellow-400/40 mb-6 lg:mb-8 animate-pulse">
                    <Sparkles className="w-5 h-5 text-yellow-300 animate-spin" style={{ animationDuration: '4s' }} />
                    VÒNG 1: BÍ THƯ ĐOÀN CƠ SỞ – THÔNG THÁI
                  </div>
                  <h2 className="text-3xl lg:text-5xl font-black text-white tracking-tight uppercase drop-shadow-md">
                    THỂ LỆ & QUY TẮC THI ĐẤU
                  </h2>
                  <p className="text-sm font-medium text-sky-100 mt-1 max-w-2xl mx-auto">
                    10 thí sinh thao tác trực tiếp trên thiết bị di động cá nhân • Phương án xáo trộn độc lập • Đảm bảo tính khách quan và công bằng tuyệt đối
                  </p>
                </div>

                {/* 3 Thẻ thể lệ chính */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-5 max-w-6xl mx-auto">
                  {/* Card 1: 10 Câu hỏi trắc nghiệm */}
                  <div className="bg-white rounded-3xl p-6 border-2 border-blue-200 shadow-xl shadow-blue-500/5 relative overflow-hidden flex flex-col justify-between hover:border-blue-400 transition-all">
                    <div className="absolute top-0 right-0 w-28 h-28 bg-blue-50 rounded-bl-full -mr-6 -mt-6 pointer-events-none" />
                    <div>
                      <div className="w-12 h-12 rounded-2xl bg-blue-600 text-white flex items-center justify-center font-black shadow-lg shadow-blue-600/30 mb-4">
                        <BookOpen className="w-6 h-6 text-white" />
                      </div>
                      <div className="text-xs font-black text-blue-700 uppercase tracking-wider mb-1">
                        QUY MÔ & THỜI GIAN
                      </div>
                      <h3 className="text-xl font-black text-slate-900 uppercase">
                        10 Câu hỏi trắc nghiệm
                      </h3>
                      <div className="mt-4 space-y-2.5 text-xs text-slate-600 leading-relaxed">
                        <div className="flex items-start gap-2 bg-slate-50 p-2.5 rounded-xl border border-slate-100">
                          <Clock className="w-4 h-4 text-blue-600 shrink-0 mt-0.5" />
                          <span>Thời gian suy nghĩ & trả lời: <strong className="text-slate-900 font-bold">40 giây / câu</strong>.</span>
                        </div>
                        <div className="flex items-start gap-2 bg-slate-50 p-2.5 rounded-xl border border-slate-100">
                          <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                          <span>Kiến thức tổng hợp: Nghiệp vụ công tác Đoàn, chính trị, pháp luật, lịch sử & xử lý tình huống.</span>
                        </div>
                        <div className="flex items-start gap-2 bg-slate-50 p-2.5 rounded-xl border border-slate-100">
                          <Zap className="w-4 h-4 text-amber-500 shrink-0 mt-0.5" />
                          <span>Phương án A, B, C, D được <strong className="text-slate-900 font-bold">xáo trộn ngẫu nhiên</strong> riêng biệt trên từng máy thí sinh.</span>
                        </div>
                      </div>
                    </div>
                    <div className="mt-5 pt-3 border-t border-slate-100 flex items-center justify-between text-[11px] font-bold text-blue-800">
                      <span>Cơ cấu tính điểm Vòng 1</span>
                      <span className="px-2.5 py-0.5 rounded-full bg-blue-100 text-blue-800">10 CÂU TÍCH LŨY</span>
                    </div>
                  </div>

                  {/* Card 2: Thang điểm suy giảm */}
                  <div className="bg-white rounded-3xl p-6 border-2 border-emerald-200 shadow-xl shadow-emerald-500/5 relative overflow-hidden flex flex-col justify-between hover:border-emerald-400 transition-all">
                    <div className="absolute top-0 right-0 w-28 h-28 bg-emerald-50 rounded-bl-full -mr-6 -mt-6 pointer-events-none" />
                    <div>
                      <div className="w-12 h-12 rounded-2xl bg-emerald-600 text-white flex items-center justify-center font-black shadow-lg shadow-emerald-600/30 mb-4">
                        <Timer className="w-6 h-6 text-white" />
                      </div>
                      <div className="text-xs font-black text-emerald-700 uppercase tracking-wider mb-1">
                        CƠ CHẾ TÍNH ĐIỂM
                      </div>
                      <h3 className="text-xl font-black text-slate-900 uppercase">
                        Thang điểm theo thời gian
                      </h3>
                      <div className="mt-4 space-y-2 text-xs">
                        <div className="flex items-center justify-between p-2.5 rounded-xl bg-emerald-50 border border-emerald-200">
                          <div className="flex items-center gap-2">
                            <span className="w-6 h-6 rounded-lg bg-emerald-600 text-white text-[11px] font-black flex items-center justify-center">1</span>
                            <span className="font-bold text-emerald-950">Từ 01 đến 10 giây</span>
                          </div>
                          <span className="text-sm font-black text-emerald-700 bg-white px-2.5 py-0.5 rounded-lg shadow-xs border border-emerald-200">+5 điểm</span>
                        </div>

                        <div className="flex items-center justify-between p-2.5 rounded-xl bg-blue-50 border border-blue-200">
                          <div className="flex items-center gap-2">
                            <span className="w-6 h-6 rounded-lg bg-blue-600 text-white text-[11px] font-black flex items-center justify-center">2</span>
                            <span className="font-bold text-blue-950">Từ 11 đến 30 giây</span>
                          </div>
                          <span className="text-sm font-black text-blue-700 bg-white px-2.5 py-0.5 rounded-lg shadow-xs border border-blue-200">+3 điểm</span>
                        </div>

                        <div className="flex items-center justify-between p-2.5 rounded-xl bg-amber-50 border border-amber-200">
                          <div className="flex items-center gap-2">
                            <span className="w-6 h-6 rounded-lg bg-amber-600 text-white text-[11px] font-black flex items-center justify-center">3</span>
                            <span className="font-bold text-amber-950">Từ 31 đến 40 giây</span>
                          </div>
                          <span className="text-sm font-black text-amber-700 bg-white px-2.5 py-0.5 rounded-lg shadow-xs border border-amber-200">+2 điểm</span>
                        </div>

                        <div className="flex items-center justify-between p-2.5 rounded-xl bg-rose-50 border border-rose-200">
                          <div className="flex items-center gap-2">
                            <span className="w-6 h-6 rounded-lg bg-rose-600 text-white text-[11px] font-black flex items-center justify-center">✕</span>
                            <span className="font-bold text-rose-950">Trả lời sai hoặc hết thời gian</span>
                          </div>
                          <span className="text-sm font-black text-rose-700 bg-white px-2.5 py-0.5 rounded-lg shadow-xs border border-rose-200">0 điểm</span>
                        </div>
                      </div>
                    </div>
                    <div className="mt-5 pt-3 border-t border-slate-100 flex items-center justify-between text-[11px] font-bold text-emerald-800">
                      <span>Tốc độ phản xạ quyết định</span>
                      <span className="px-2.5 py-0.5 rounded-full bg-emerald-100 text-emerald-800">TÍNH THEO GIÂY</span>
                    </div>
                  </div>

                  {/* Card 3: Ngôi sao hy vọng */}
                  <div className="bg-white rounded-3xl p-6 border-2 border-amber-200 shadow-xl shadow-amber-500/5 relative overflow-hidden flex flex-col justify-between hover:border-amber-400 transition-all">
                    <div className="absolute top-0 right-0 w-28 h-28 bg-amber-50 rounded-bl-full -mr-6 -mt-6 pointer-events-none" />
                    <div>
                      <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-amber-400 to-amber-600 text-white flex items-center justify-center font-black shadow-lg shadow-amber-500/30 mb-4">
                        <Star className="w-6 h-6 text-white fill-amber-200" />
                      </div>
                      <div className="text-xs font-black text-amber-600 uppercase tracking-wider mb-1">
                        QUYỀN ĐẶC BIỆT
                      </div>
                      <h3 className="text-xl font-black text-slate-900 uppercase">
                        Ngôi sao hy vọng
                      </h3>
                      <div className="mt-4 space-y-2.5 text-xs text-slate-600 leading-relaxed">
                        <div className="flex items-start gap-2 bg-amber-50/70 p-2.5 rounded-xl border border-amber-200">
                          <Star className="w-4 h-4 text-amber-600 fill-amber-500 shrink-0 mt-0.5" />
                          <span>Mỗi thí sinh có <strong className="text-slate-900 font-bold">duy nhất 01 lần</strong> đặt Ngôi sao hy vọng trong suốt 10 câu hỏi.</span>
                        </div>
                        <div className="flex items-start gap-2 bg-amber-50/70 p-2.5 rounded-xl border border-amber-200">
                          <Clock className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                          <span>Thời gian suy nghĩ đặt Ngôi sao hy vọng: <strong className="text-slate-900 font-bold">05 giây</strong> trước khi bắt đầu câu hỏi.</span>
                        </div>
                        <div className="flex items-start gap-2 bg-emerald-50 p-2.5 rounded-xl border border-emerald-200 text-emerald-900">
                          <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                          <span>Trả lời <strong className="font-bold text-emerald-700">ĐÚNG</strong>: Được <strong className="font-bold">nhân đôi điểm số</strong> (+10, +6, +4 điểm).</span>
                        </div>
                        <div className="flex items-start gap-2 bg-rose-50 p-2.5 rounded-xl border border-rose-200 text-rose-900">
                          <XCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
                          <span>Trả lời <strong className="font-bold text-rose-700">SAI</strong>: Bị <strong className="font-bold">trừ 2 điểm</strong> trực tiếp vào tổng điểm.</span>
                        </div>
                      </div>
                    </div>
                    <div className="mt-5 pt-3 border-t border-slate-100 flex items-center justify-between text-[11px] font-bold text-amber-800">
                      <span>Chiến thuật bứt phá</span>
                      <span className="px-2.5 py-0.5 rounded-full bg-amber-100 text-amber-900">1 LẦN DUY NHẤT</span>
                    </div>
                  </div>
                </div>

                {/* Bottom Stage Banner: Thí sinh sẵn sàng (Chỉ hiển thị các thí sinh đã vào phòng thi) */}
                {(() => {
                  const checkedInList = session?.players?.filter((p) => p.isCheckedIn) || [];
                  return (
                    <div className="max-w-6xl mx-auto bg-gradient-to-r from-blue-900 via-indigo-950 to-blue-900 text-white rounded-3xl p-5 shadow-2xl border border-blue-700/50 flex flex-col md:flex-row items-center justify-between gap-4">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-2xl bg-amber-500/20 border border-amber-400/40 flex items-center justify-center shrink-0">
                          <Sparkles className="w-5 h-5 text-amber-300 animate-pulse" />
                        </div>
                        <div>
                          <div className="text-[11px] font-black uppercase tracking-widest text-amber-300">
                            TRẠNG THÁI SÀN ĐẤU SÂN KHẤU
                          </div>
                          <div className="text-sm font-bold text-white">
                            {checkedInList.length > 0
                              ? `${checkedInList.length} Thí sinh đã điểm danh vào phòng • Sẵn sàng khởi động Câu số 01`
                              : 'Đang chờ thí sinh điểm danh vào phòng thi đấu...'}
                          </div>
                        </div>
                      </div>

                      {/* Checked in player pill chips only */}
                      <div className="flex items-center gap-1.5 flex-wrap justify-end">
                        {checkedInList.length === 0 ? (
                          <span className="text-xs text-blue-300 italic">Chưa có thí sinh nào vào phòng</span>
                        ) : (
                          checkedInList.map((p) => {
                            const lastWord = p.fullName.trim().split(' ').slice(-1)[0] || '';
                            const initialChar = lastWord.charAt(0).toUpperCase();
                            return (
                              <div
                                key={p.id}
                                className="flex items-center gap-1.5 px-2.5 py-1 rounded-xl bg-white/10 border border-white/20 text-xs font-bold text-white shadow-2xs"
                                title={`${p.fullName} - ${p.unit}`}
                              >
                                <div className="w-5 h-5 rounded-md bg-white/20 overflow-hidden flex items-center justify-center text-[10px] font-black shrink-0">
                                  {p.avatarUrl ? (
                                    <img src={p.avatarUrl} alt={p.fullName} className="w-full h-full object-cover" />
                                  ) : (
                                    <span className="text-yellow-300">{initialChar}</span>
                                  )}
                                </div>
                                <span className="max-w-[80px] truncate">{lastWord}</span>
                              </div>
                            );
                          })
                        )}
                      </div>
                    </div>
                  );
                })()}
              </div>
            )}

            {/* Phase 1: 5s Hope Star */}
            {round1State === 'HOPE_STAR_5S' && (
              <div className="text-center py-6 animate-scaleUp">
                <div className="bg-white border-2 border-amber-300 rounded-3xl p-8 md:p-10 shadow-2xl max-w-4xl mx-auto">
                  <div className="w-32 h-32 rounded-full bg-amber-50 border-4 border-amber-400 flex items-center justify-center mx-auto mb-5 relative shadow-lg shadow-amber-500/20">
                    <Star className="w-16 h-16 text-amber-500 fill-amber-400 animate-pulse" />
                    <div className="absolute inset-0 flex items-center justify-center">
                      <span className="text-4xl font-black text-amber-700">{countdown}</span>
                    </div>
                  </div>

                  <div className="text-xs font-black text-amber-600 uppercase tracking-widest mb-1.5">
                    CÂU HỎI SỐ {session?.currentQuestionIndex} / 10
                  </div>
                  <h2 className="text-3xl font-black text-slate-900 uppercase tracking-wide">
                    5 GIÂY QUYẾT ĐỊNH ĐẶT NGÔI SAO HY VỌNG
                  </h2>
                  <p className="text-sm text-slate-600 mt-2 max-w-lg mx-auto">
                    Mỗi thí sinh có duy nhất 1 lần đặt trong toàn bộ 10 câu. Đúng được nhân đôi điểm số (+10, +6, +4 điểm tùy thời gian), sai bị trừ 2 điểm!
                  </p>

                  {/* Hope Star Status Grid: Định danh bằng Ảnh & Tên (Bỏ SBD, ai đặt NSHV thì highlight nổi bật) */}
                  <div className="mt-8 flex flex-wrap justify-center gap-3">
                    {session?.players?.map((p) => {
                      const hasSelected = hopeStarPlayers.has(p.id);
                      const lastWord = p.fullName.trim().split(' ').slice(-1)[0] || '';
                      const initialChar = lastWord.charAt(0).toUpperCase();

                      return (
                        <div
                          key={p.id}
                          className={`px-3 py-2 rounded-2xl border transition-all duration-300 flex items-center gap-2.5 ${
                            hasSelected
                              ? 'bg-gradient-to-r from-amber-400 via-yellow-300 to-amber-400 text-slate-950 font-black border-amber-400 scale-110 shadow-xl shadow-amber-500/40 ring-4 ring-yellow-300/50 animate-bounce'
                              : 'bg-white/90 border-slate-200 text-slate-700 shadow-2xs hover:border-slate-300 opacity-90'
                          }`}
                        >
                          {/* Avatar or Initial fallback */}
                          {p.avatarUrl ? (
                            <img
                              src={p.avatarUrl}
                              alt={p.fullName}
                              className={`w-8 h-8 rounded-xl object-cover shrink-0 shadow-2xs ${
                                hasSelected
                                  ? 'border-2 border-slate-950 ring-2 ring-yellow-400'
                                  : 'border border-slate-300'
                              }`}
                            />
                          ) : (
                            <div
                              className={`w-8 h-8 rounded-xl shrink-0 font-black text-xs flex items-center justify-center shadow-2xs ${
                                hasSelected
                                  ? 'bg-slate-950 text-yellow-300 border-2 border-yellow-400 ring-2 ring-yellow-400'
                                  : 'bg-gradient-to-br from-blue-600 to-indigo-700 text-white border border-blue-400/30'
                              }`}
                            >
                              {initialChar}
                            </div>
                          )}

                          {/* Contestant Full Name */}
                          <div className="text-left leading-tight">
                            <span
                              className={`text-xs block ${
                                hasSelected ? 'font-black text-slate-950 tracking-tight' : 'font-bold text-slate-800'
                              }`}
                            >
                              {p.fullName}
                            </span>
                            {hasSelected && (
                              <span className="text-[10px] font-black uppercase text-amber-950 block tracking-wider">
                                ĐÃ ĐẶT NGÔI SAO HY VỌNG
                              </span>
                            )}
                          </div>

                          {/* Hope Star Icon */}
                          {hasSelected && (
                            <Star className="w-4 h-4 fill-slate-950 text-slate-950 ml-0.5 animate-spin-slow shrink-0" />
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>
            )}

            {/* Phase 2: Video Playing */}
            {round1State === 'VIDEO_PLAYING' && (
              <div className="text-center py-4 animate-fadeIn">
                <div className="bg-white border-2 border-slate-200 rounded-3xl p-6 md:p-8 shadow-2xl max-w-4xl mx-auto">
                  <div className="text-xs font-black text-blue-700 uppercase tracking-widest mb-2 flex items-center justify-center gap-2">
                    <Radio className="w-4 h-4 animate-pulse text-blue-600" /> CÂU HỎI VIDEO CLIP • CÂU SỐ {session?.currentQuestionIndex}
                  </div>
                  <h2 className="text-2xl font-bold text-slate-900 mb-6">
                    {session?.currentQuestion?.title || 'Mời Ban Giám khảo và các thí sinh theo dõi đoạn clip sau đây:'}
                  </h2>

                  <div className="max-w-3xl mx-auto aspect-video bg-black rounded-2xl overflow-hidden border border-slate-200 shadow-xl flex items-center justify-center">
                    {videoData?.url && videoData.url.includes('youtube') ? (
                      <iframe
                        src={videoData.url.replace('watch?v=', 'embed/') + '?autoplay=1'}
                        className="w-full h-full"
                        allow="autoplay; encrypted-media"
                        title="Video câu hỏi"
                      />
                    ) : (
                      <div className="text-slate-400 flex flex-col items-center gap-3">
                        <Play className="w-16 h-16 text-blue-600 opacity-60" />
                        <span className="text-sm">Đang phát video câu hỏi trên màn hình hội trường...</span>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            )}

            {/* Phase 3: Kết quả đặt Ngôi sao hy vọng (Sau 5s NSHV - CHƯA HIỆN CÂU HỎI & ĐÁP ÁN) */}
            {round1State === 'QUESTION_READING' && (
              <div className="py-6 animate-scaleUp max-w-5xl mx-auto">
                <div className="bg-white border-2 border-amber-300 rounded-3xl p-8 lg:p-10 shadow-2xl text-center">
                  <div className="inline-flex items-center gap-2 px-5 py-2 rounded-full bg-amber-100 text-amber-900 border border-amber-300 font-black text-xs sm:text-sm uppercase tracking-wider mb-4 shadow-sm">
                    <Star className="w-4 h-4 fill-amber-500 text-amber-600 animate-spin-slow" />
                    CÂU HỎI SỐ {session?.currentQuestionIndex} / 10 • KẾT QUẢ ĐẶT NGÔI SAO HY VỌNG
                  </div>

                  <h2 className="text-2xl sm:text-4xl font-black text-slate-900 uppercase tracking-tight">
                    DANH SÁCH THÍ SINH ĐẶT NGÔI SAO HY VỌNG
                  </h2>

                  {hopeStarPlayersThisQuestion.length > 0 ? (
                    <div className="mt-8 space-y-6">
                      <p className="text-sm sm:text-base font-semibold text-amber-950 bg-gradient-to-r from-amber-100 via-yellow-100 to-amber-100 py-3 px-6 rounded-2xl border border-amber-300 inline-block shadow-xs">
                        ⭐ Chúc thí sinh tự tin bứt phá điểm số với <strong className="font-black text-amber-950">Ngôi sao hy vọng</strong>! (Đúng: Nhân đôi điểm • Sai: Bị trừ 2 điểm)
                      </p>

                      {/* Highlight to những người chọn ngôi sao hy vọng */}
                      <div className="flex flex-wrap items-center justify-center gap-6 pt-2">
                        {hopeStarPlayersThisQuestion.map((p) => {
                          const lastWord = p.fullName.trim().split(/\s+/).slice(-1)[0] || '';
                          const initialChar = lastWord.charAt(0).toUpperCase();

                          return (
                            <div
                              key={p.id}
                              className="bg-gradient-to-b from-amber-400 via-yellow-300 to-amber-400 text-slate-950 p-6 rounded-3xl border-4 border-yellow-200 shadow-2xl flex flex-col items-center gap-3 min-w-[260px] max-w-xs scale-105 animate-bounce-short ring-4 ring-yellow-400/50"
                            >
                              <div className="relative">
                                {p.avatarUrl ? (
                                  <img
                                    src={p.avatarUrl}
                                    alt={p.fullName}
                                    className="w-24 h-24 rounded-2xl object-cover border-3 border-slate-950 shadow-md"
                                  />
                                ) : (
                                  <div className="w-24 h-24 rounded-2xl bg-slate-950 text-yellow-300 font-black text-3xl flex items-center justify-center border-3 border-yellow-400 shadow-md">
                                    {initialChar}
                                  </div>
                                )}
                                <div className="absolute -top-3 -right-3 w-10 h-10 rounded-full bg-slate-950 border-2 border-yellow-300 flex items-center justify-center shadow-lg">
                                  <Star className="w-6 h-6 fill-yellow-400 text-yellow-400 animate-spin-slow" />
                                </div>
                              </div>

                              <div className="text-center">
                                <h3 className="text-xl sm:text-2xl font-black text-slate-950 tracking-tight leading-tight">
                                  {p.fullName}
                                </h3>
                                <p className="text-xs sm:text-sm font-bold text-slate-800 mt-1 line-clamp-1">{p.unit}</p>
                                <div className="mt-3 inline-flex items-center gap-1.5 px-3.5 py-1 rounded-full bg-slate-950 text-yellow-300 text-xs font-black uppercase tracking-wider shadow-sm">
                                  <Star className="w-3.5 h-3.5 fill-yellow-400 text-yellow-400" />
                                  ĐÃ ĐẶT NGÔI SAO HY VỌNG
                                </div>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  ) : (
                    <div className="mt-8 py-10 px-6 bg-slate-50 rounded-3xl border-2 border-dashed border-slate-300 max-w-lg mx-auto">
                      <Star className="w-14 h-14 text-slate-400 mx-auto mb-3 opacity-40" />
                      <p className="text-base sm:text-lg font-bold text-slate-800">
                        Không có thí sinh nào đặt Ngôi sao hy vọng ở câu hỏi này
                      </p>
                      <p className="text-xs sm:text-sm text-slate-500 mt-1.5">
                        Các thí sinh sẽ thi đấu tính điểm theo thang điểm thời gian (+5, +3, +2 điểm)
                      </p>
                    </div>
                  )}

                  {/* Thông báo MC & Ban tổ chức */}
                  <div className="mt-8 pt-5 border-t border-slate-200 text-xs sm:text-sm text-slate-500 flex items-center justify-center gap-2">
                    <Clock className="w-4 h-4 text-blue-600" />
                    <span>Chờ Ban tổ chức phát lệnh bắt đầu câu hỏi...</span>
                  </div>
                </div>
              </div>
            )}

            {/* Phase 4: 40s Answering Phase (Hiện câu hỏi và các đáp án KHÔNG có A B C D) */}
            {round1State === 'QUESTION_40S' && (
              <div className="space-y-4 animate-fadeIn">
                {/* Stage Header with Centered Countdown Clock */}
                <div className="relative flex items-center justify-between min-h-[96px] px-2">
                  {/* Left: Question Order Badge */}
                  <div className="flex items-center gap-3">
                    <span className="px-4 py-2 rounded-2xl bg-red-600 text-yellow-300 font-black text-base uppercase shadow-md flex items-center gap-1.5">
                      CÂU {session?.currentQuestionIndex} / 10
                    </span>
                    <div className="hidden sm:block text-left">
                      <div className="text-xs font-black uppercase tracking-wider text-white drop-shadow-xs">
                        ĐANG ĐẾM NGƯỢC THỜI GIAN LÀM BÀI
                      </div>
                      <div className="text-[11px] text-sky-200 font-medium">
                        Thí sinh chọn 01 phương án trên thiết bị di động
                      </div>
                    </div>
                  </div>

                  {/* CENTER: Big Prominent Countdown Display (Chính giữa màn hình sân khấu) */}
                  <div className="absolute left-1/2 -translate-x-1/2 top-1/2 -translate-y-1/2 z-20">
                    <div
                      className={`relative transition-all duration-300 flex flex-col items-center justify-center rounded-full select-none ${
                        countdown <= 10
                          ? 'w-32 h-32 md:w-36 md:h-36 bg-red-600 border-4 border-yellow-300 text-yellow-300 shadow-2xl shadow-red-600/70 ring-8 ring-red-400/40 scale-110 animate-pulse'
                          : 'w-26 h-26 md:w-30 md:h-30 bg-white border-4 border-emerald-500 text-emerald-600 shadow-xl ring-4 ring-emerald-400/20'
                      }`}
                    >
                      {/* Animated Ping Ring in the final 10 seconds */}
                      {countdown <= 10 && (
                        <span className="absolute -inset-2 rounded-full border-2 border-red-500 animate-ping opacity-60 pointer-events-none" />
                      )}

                      <div className="flex items-baseline justify-center">
                        <span
                          className={`font-black font-mono tracking-tight leading-none ${
                            countdown <= 10
                              ? 'text-5xl md:text-6xl text-yellow-300 drop-shadow-[0_4px_6px_rgba(0,0,0,0.4)]'
                              : 'text-4xl md:text-5xl text-emerald-600'
                          }`}
                        >
                          {countdown}
                        </span>
                        <span
                          className={`text-xs font-bold uppercase ml-0.5 ${
                            countdown <= 10 ? 'text-white' : 'text-slate-500'
                          }`}
                        >
                          s
                        </span>
                      </div>

                      <div
                        className={`text-[9px] font-black uppercase tracking-wider mt-0.5 ${
                          countdown <= 10 ? 'text-white font-extrabold animate-bounce' : 'text-emerald-700'
                        }`}
                      >
                        {countdown <= 10 ? 'KHẨN TRƯƠNG!' : 'GIÂY'}
                      </div>
                    </div>
                  </div>

                  {/* Right: Submission Counter */}
                  <div className="flex items-center gap-2 bg-white border-2 border-slate-200 rounded-2xl px-4 py-2 shadow-xs">
                    <Users className="w-4 h-4 text-blue-600 shrink-0" />
                    <div className="text-right">
                      <div className="text-[10px] text-slate-500 font-bold uppercase">Tiến độ nộp bài</div>
                      <div className="text-sm font-black text-blue-700">
                        {answeredPlayers.size} / 10 <span className="text-[11px] font-semibold text-slate-600">thí sinh</span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Video Player if question has video clip */}
                {session?.currentQuestion?.videoUrl && (
                  <div className="max-w-2xl mx-auto aspect-video bg-black rounded-2xl overflow-hidden border border-white/20 shadow-xl">
                    {session.currentQuestion.videoUrl.includes('youtube') ? (
                      <iframe
                        src={session.currentQuestion.videoUrl.replace('watch?v=', 'embed/') + '?autoplay=1'}
                        className="w-full h-full"
                        allow="autoplay; encrypted-media"
                        title="Video câu hỏi"
                      />
                    ) : (
                      <video
                        src={session.currentQuestion.videoUrl}
                        controls
                        autoPlay
                        className="w-full h-full object-contain"
                      />
                    )}
                  </div>
                )}

                {/* Chip thông báo trong lúc 40s nếu có thí sinh đặt Ngôi sao hy vọng */}
                {hopeStarPlayersThisQuestion.length > 0 && (
                  <div className="bg-amber-500 text-slate-950 px-5 py-2.5 rounded-2xl border-2 border-yellow-200 shadow-lg flex items-center justify-between animate-pulse">
                    <div className="flex items-center gap-2 text-xs md:text-sm font-black uppercase">
                      <Star className="w-5 h-5 fill-slate-950 text-slate-950" />
                      <span>CÂU HỎI CÓ THÍ SINH ĐẶT NGÔI SAO HY VỌNG:</span>
                    </div>
                    <div className="flex items-center gap-2.5 flex-wrap">
                      {hopeStarPlayersThisQuestion.map((p) => {
                        const lastWord = p.fullName.trim().split(/\s+/).slice(-1)[0] || '';
                        const initialChar = lastWord.charAt(0).toUpperCase();
                        return (
                          <div key={p.id} className="bg-slate-950 text-white pl-2 pr-3.5 py-1.5 rounded-xl border border-yellow-300 flex items-center gap-2 shadow-xs">
                            {p.avatarUrl ? (
                              <img src={p.avatarUrl} alt="" className="w-7 h-7 rounded-lg object-cover border border-yellow-400/80" />
                            ) : (
                              <span className="w-7 h-7 rounded-lg bg-blue-700 text-yellow-300 font-black text-xs flex items-center justify-center border border-yellow-400/50">
                                {initialChar}
                              </span>
                            )}
                            <span className="text-yellow-300 text-xs font-black tracking-tight">
                              {p.fullName}
                            </span>
                            <Star className="w-3.5 h-3.5 fill-yellow-400 text-yellow-400" />
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}

                {/* Big Legible Question Card */}
                <div className="bg-white border-2 border-blue-200 rounded-3xl p-6 md:p-8 shadow-2xl">
                  <p className="text-xl md:text-2xl font-extrabold text-slate-900 leading-relaxed">
                    {session?.currentQuestion?.title || 'Đang cập nhật nội dung câu hỏi...'}
                  </p>
                </div>

                {/* 4 Clean Neutral Option Cards (CHỈ HIỆN NỘI DUNG ĐÁP ÁN, KHÔNG HIỆN A B C D) */}
                <div className="grid grid-cols-2 gap-4">
                  {[
                    session?.currentQuestion?.optionA,
                    session?.currentQuestion?.optionB,
                    session?.currentQuestion?.optionC,
                    session?.currentQuestion?.optionD,
                  ].filter(Boolean).map((text, idx) => (
                    <div
                      key={idx}
                      className="bg-white border-2 border-slate-200 hover:border-blue-400 rounded-2xl p-5 flex items-center shadow-lg transition-all"
                    >
                      <div className="text-lg lg:text-xl font-bold text-slate-800 leading-snug">
                        {text}
                      </div>
                    </div>
                  ))}
                </div>

                {/* Real-time Submissions Indicator for 10 Contestants */}
                <div className="pt-2 border-t border-white/20">
                  <div className="text-xs font-black text-white uppercase tracking-wider mb-2 flex items-center justify-between">
                    <span className="flex items-center gap-1.5"><Users className="w-3.5 h-3.5 text-yellow-300" /> TIẾN ĐỘ TRẢ LỜI CỦA 10 THÍ SINH:</span>
                    <span className="text-yellow-300 font-black">{answeredPlayers.size} / 10 ĐÃ NỘP BÀI</span>
                  </div>
                  <div className="grid grid-cols-10 gap-2">
                    {session?.players?.map((p) => {
                      const answered = answeredPlayers.has(p.id);
                      const isHopeStar = (p.hopeStarUsed && p.hopeStarQuestionIndex === session?.currentQuestionIndex) || hopeStarPlayers.has(p.id);
                      const lastWord = p.fullName.trim().split(' ').slice(-1)[0] || '';
                      const initialChar = lastWord.charAt(0).toUpperCase();

                      return (
                        <div
                          key={p.id}
                          className={`p-2 rounded-2xl border-2 text-center transition-all duration-300 shadow-sm relative flex flex-col items-center justify-between ${
                            isHopeStar
                              ? answered
                                ? 'bg-gradient-to-b from-amber-400 to-emerald-600 border-yellow-300 text-white font-black scale-105 shadow-amber-500/40 ring-4 ring-amber-300/60'
                                : 'bg-gradient-to-b from-amber-50 to-yellow-100 border-amber-400 text-amber-950 font-black scale-105 shadow-amber-500/30 ring-4 ring-amber-300/50 animate-pulse'
                              : answered
                              ? 'bg-gradient-to-b from-emerald-500 to-teal-600 border-emerald-400 text-white font-black scale-105 shadow-emerald-500/30'
                              : 'bg-white border-slate-200 text-slate-700 font-bold hover:border-slate-300'
                          }`}
                        >
                          {/* Floating Star Badge for Hope Star Contestant */}
                          {isHopeStar && (
                            <div className="absolute -top-1.5 -right-1.5 bg-amber-400 text-slate-950 rounded-full p-1 shadow-md border-2 border-white z-10 animate-bounce">
                              <Star className="w-3 h-3 fill-slate-950 text-slate-950" />
                            </div>
                          )}

                          {/* Contestant Avatar with letter fallback */}
                          <div className="relative mb-1">
                            <div
                              className={`w-10 h-10 rounded-xl overflow-hidden flex items-center justify-center font-black shadow-xs transition-all ${
                                answered
                                  ? 'border-2 border-white/80 ring-2 ring-emerald-300/50'
                                  : isHopeStar
                                  ? 'border-2 border-amber-400 ring-2 ring-yellow-400/50'
                                  : 'border border-slate-200 bg-slate-100'
                              }`}
                            >
                              {p.avatarUrl ? (
                                <img src={p.avatarUrl} alt={p.fullName} className="w-full h-full object-cover" />
                              ) : (
                                <span
                                  className={`text-sm font-black ${
                                    answered
                                      ? 'text-white'
                                      : isHopeStar
                                      ? 'text-amber-900 bg-amber-200 w-full h-full flex items-center justify-center'
                                      : 'text-blue-700 bg-blue-50 w-full h-full flex items-center justify-center'
                                  }`}
                                >
                                  {initialChar}
                                </span>
                              )}
                            </div>

                            {/* Small Status Badge Overlay on Avatar corner */}
                            {answered && (
                              <div className="absolute -bottom-1 -right-1 w-4 h-4 rounded-full bg-emerald-400 border-2 border-white flex items-center justify-center shadow-xs">
                                <CheckCircle2 className="w-3 h-3 text-emerald-950 fill-emerald-100" />
                              </div>
                            )}
                          </div>

                          {/* Contestant Name (No SBD) */}
                          <div
                            className={`text-xs font-black truncate max-w-full leading-tight ${
                              answered ? 'text-white drop-shadow-xs' : 'text-slate-900'
                            }`}
                            title={p.fullName}
                          >
                            {lastWord}
                          </div>

                          {/* Status indicator below */}
                          <div className="mt-1">
                            {answered ? (
                              <span className="text-[10px] font-black uppercase text-emerald-100 bg-emerald-900/40 px-1.5 py-0.5 rounded-full inline-block">
                                Đã nộp
                              </span>
                            ) : isHopeStar ? (
                              <span className="text-[9px] font-black uppercase text-amber-900 bg-amber-200/90 rounded px-1.5 py-0.5 inline-block">
                                ⭐ Ngôi sao hy vọng
                              </span>
                            ) : (
                              <div className="w-2.5 h-2.5 rounded-full bg-slate-300 mx-auto" />
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>
            )}

            {/* Phase 5: Answer Revealed + Choice Distribution Chart (Ghi rõ nội dung đáp án + Thanh biểu đồ kịch tính) */}
            {round1State === 'ANSWER_REVEALED' && (
              <div className="animate-fadeIn">

                {/* BIỂU ĐỒ PHÂN BỐ LỰA CHỌN CỦA 10 THÍ SINH (Thanh ngang trực quan ngay trên từng đáp án) */}
                <div className="bg-white border-2 border-slate-200 rounded-3xl p-4 lg:p-5 shadow-xl">
                  {/* Header: Hiển thị lại nội dung câu hỏi thay cho tiêu đề biểu đồ (Bỏ 2 pill đã nộp / đúng) */}
                  <div className="border-b border-slate-200 pb-2.5 mb-3">
                    <div className="flex items-start gap-2.5">
                      <span className="px-2.5 py-1 rounded-xl bg-blue-100 text-blue-900 font-black text-xs shrink-0 tracking-wide border border-blue-200 shadow-2xs mt-0.5">
                        CÂU HỎI SỐ {session?.currentQuestionIndex}
                      </span>
                      <h3 className="text-base sm:text-lg font-black text-slate-900 leading-snug">
                        {session?.currentQuestion?.title || `Câu hỏi số ${session?.currentQuestionIndex}`}
                      </h3>
                    </div>
                  </div>

                  {/* 4 PHƯƠNG ÁN A, B, C, D: ĐÁP ÁN ĐÚNG HIGHLIGHT, ĐÁP ÁN SAI MỜ */}
                  <div className="space-y-2">
                    {[
                      { key: 'A', text: session?.currentQuestion?.optionA, count: choiceStats.countA, percent: choiceStats.percentA, color: 'from-blue-500 to-indigo-600', badgeBg: 'bg-blue-600' },
                      { key: 'B', text: session?.currentQuestion?.optionB, count: choiceStats.countB, percent: choiceStats.percentB, color: 'from-amber-500 to-orange-600', badgeBg: 'bg-amber-600' },
                      { key: 'C', text: session?.currentQuestion?.optionC, count: choiceStats.countC, percent: choiceStats.percentC, color: 'from-purple-500 to-violet-600', badgeBg: 'bg-purple-600' },
                      { key: 'D', text: session?.currentQuestion?.optionD, count: choiceStats.countD, percent: choiceStats.percentD, color: 'from-rose-500 to-pink-600', badgeBg: 'bg-rose-600' },
                    ].map((opt) => {
                      const isCorrect = (currentRevealed?.correctOption === opt.key);

                      return (
                        <div
                          key={opt.key}
                          className={`p-2.5 px-3.5 rounded-xl border-2 transition-all relative overflow-hidden ${
                            isCorrect
                              ? 'bg-emerald-50/95 border-emerald-500 shadow-md ring-2 ring-emerald-400/20 opacity-100'
                              : 'bg-slate-50/70 border-slate-200 opacity-40 hover:opacity-75 transition-opacity'
                          }`}
                        >
                          {/* Background percentage fill bar */}
                          <div
                            className={`absolute top-0 bottom-0 left-0 transition-all duration-1000 ease-out pointer-events-none ${
                              isCorrect ? 'bg-emerald-400/25' : 'bg-slate-300/20'
                            }`}
                            style={{ width: `${Math.max(opt.percent, 0)}%` }}
                          />

                          <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-3">
                            {/* Left: Full Text of Option (Không hiện A B C D) */}
                            <div className="flex items-center gap-3 min-w-0 flex-1">
                              <div className="min-w-0 flex-1">
                                <div className="flex items-center gap-2.5 flex-wrap">
                                  <span className={`text-base lg:text-lg leading-snug ${
                                    isCorrect ? 'text-emerald-950 font-black' : 'text-slate-700 font-bold'
                                  }`}>
                                    {opt.text || ''}
                                  </span>
                                  {isCorrect && (
                                    <span className="inline-flex items-center gap-1.5 text-xs font-black uppercase tracking-wider text-emerald-950 bg-emerald-300 px-3 py-1 rounded-full border border-emerald-500 shrink-0 shadow-sm">
                                      <CheckCircle2 className="w-4 h-4 text-emerald-800" /> ĐÁP ÁN ĐÚNG
                                    </span>
                                  )}
                                </div>
                              </div>
                            </div>

                            {/* Right: Bar + Count & Percentage Badge */}
                            <div className="flex items-center gap-3 shrink-0 md:min-w-[260px] justify-between md:justify-end">
                              {/* Horizontal Progress Bar */}
                              <div className="w-36 lg:w-48 h-4 bg-slate-200/90 rounded-full overflow-hidden shrink-0 hidden sm:block p-0.5 border border-slate-300/60 shadow-inner">
                                <div
                                  className={`h-full rounded-full transition-all duration-1000 ease-out ${
                                    isCorrect
                                      ? 'bg-gradient-to-r from-emerald-500 to-teal-500 shadow-xs'
                                      : `bg-gradient-to-r ${opt.color}`
                                  }`}
                                  style={{ width: `${Math.max(opt.percent, 0)}%` }}
                                />
                              </div>

                              {/* Numbers */}
                              <div className="text-right min-w-[100px]">
                                <div className={`text-base lg:text-lg font-black font-mono leading-none ${
                                  isCorrect ? 'text-emerald-700' : 'text-slate-700'
                                }`}>
                                  {opt.count} <span className="text-[11px] font-semibold text-slate-500">thí sinh</span>
                                </div>
                                <div className={`text-[11px] font-bold mt-0.5 ${
                                  isCorrect ? 'text-emerald-600' : 'text-slate-400'
                                }`}>
                                  {opt.percent}% lựa chọn
                                </div>
                              </div>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>

                  {/* THÔNG TIN BỔ SUNG: Nền trung tính nhã nhặn, dịu mắt */}
                  {currentRevealed?.explanation && (
                    <div className="mt-2.5 p-2.5 px-3.5 rounded-xl bg-slate-50 border border-slate-200 text-slate-800 flex items-start gap-2 shadow-2xs">
                      <span className="font-black text-blue-900 shrink-0 uppercase tracking-wide text-xs flex items-center gap-1 mt-0.5">
                        <CheckCircle2 className="w-3.5 h-3.5 text-blue-600" />
                        Thông tin bổ sung:
                      </span>
                      <p className="font-medium text-slate-700 leading-relaxed text-xs sm:text-[13px]">
                        {currentRevealed.explanation}
                      </p>
                    </div>
                  )}

                  {/* CHI TIẾT KẾT QUẢ CÂU VỪA THI CỦA 10 THÍ SINH (Hiển thị ngay trong màn hình công bố đáp án & biểu đồ) */}
                  <div className="mt-3.5 pt-2.5 border-t border-slate-200">
                    <div className="text-xs font-black text-slate-800 uppercase tracking-wider mb-2 flex items-center justify-between">
                      <span className="flex items-center gap-1.5">
                        <Users className="w-3.5 h-3.5 text-blue-600" /> KẾT QUẢ CỦA {session?.players?.length ? `${session.players.length} THÍ SINH` : 'THÍ SINH'} CÂU SỐ {session?.currentQuestionIndex}:
                      </span>
                      <span className="text-xs font-bold text-slate-500">
                        Đúng: <strong className="text-emerald-700 font-black">{choiceStats.countCorrect}</strong> • Sai: <strong className="text-rose-600 font-black">{choiceStats.countIncorrect}</strong>
                      </span>
                    </div>

                    {/* 10 Thẻ thí sinh (Grid 2 cột x 5 hàng = 10 thẻ gọn gàng, vừa khít 1 màn hình) */}
                    <div className="grid grid-cols-2 gap-2">
                      {session?.players?.map((p) => {
                        const ans = currentRevealed?.answers?.find((a: any) => a.playerId === p.id);
                        const isCorrect = Boolean(ans?.isCorrect);
                        const hasHopeStar = Boolean(ans?.hasHopeStar);
                        const optInfo = getOptionDisplay(ans?.selectedOption, session?.currentQuestion);

                        return (
                          <div
                            key={p.id}
                            className={`py-1.5 px-2.5 rounded-xl border flex items-center justify-between transition-all shadow-2xs ${
                              ans
                                ? isCorrect
                                  ? 'bg-emerald-50/90 border-emerald-400 text-slate-900 shadow-emerald-500/5'
                                  : 'bg-rose-50/80 border-rose-300 text-slate-900 shadow-rose-500/5'
                                : 'bg-slate-50 border-slate-200 text-slate-500'
                            }`}
                          >
                            <div className="min-w-0 pr-1 flex-1">
                              <div className="flex items-center gap-2">
                                <div className="w-6 h-6 rounded-lg overflow-hidden shrink-0 bg-slate-200 border border-slate-300 flex items-center justify-center shadow-2xs">
                                  {p.avatarUrl ? (
                                    <img src={p.avatarUrl} alt="" className="w-full h-full object-cover" />
                                  ) : (
                                    <span className="text-[10px] font-black text-slate-700">
                                      {p.fullName.trim().split(' ').slice(-1)[0]?.charAt(0).toUpperCase()}
                                    </span>
                                  )}
                                </div>
                                <span className="text-xs lg:text-sm font-black text-slate-900 truncate">
                                  {p.fullName}
                                </span>
                                {hasHopeStar && (
                                  <span className="flex items-center gap-0.5 text-[10px] font-black bg-amber-400 text-slate-950 px-2 py-0.5 rounded-full shrink-0 shadow-xs animate-pulse">
                                    <Star className="w-2.5 h-2.5 fill-slate-950" /> Ngôi sao hy vọng
                                  </span>
                                )}
                              </div>
                              <div className="text-xs text-slate-600 flex items-center gap-1.5 mt-1 truncate">
                                <span>Chọn:</span>
                                {optInfo.text ? (
                                  <span className="truncate max-w-[200px] text-slate-800 font-bold">
                                    {optInfo.text}
                                  </span>
                                ) : (
                                  <span className="text-slate-400 italic">Chưa chọn</span>
                                )}
                              </div>
                            </div>

                            <div className="text-right shrink-0 ml-2 flex flex-col items-end gap-1">
                              {/* Điểm số của câu hỏi */}
                              <div className="flex items-center justify-end">
                                {ans ? (
                                  isCorrect ? (
                                    <span className="text-xs sm:text-sm font-black text-white flex items-center gap-1 bg-emerald-600 px-2.5 py-0.5 rounded-lg shadow-sm border border-emerald-500">
                                      <CheckCircle2 className="w-3.5 h-3.5 text-white" />
                                      +{formatScore(ans?.scoreAwarded)}đ
                                    </span>
                                  ) : (ans?.scoreAwarded ?? 0) < 0 ? (
                                    <span className="text-xs sm:text-sm font-black text-white flex items-center gap-1 bg-rose-600 px-2.5 py-0.5 rounded-lg shadow-sm border border-rose-500 animate-pulse">
                                      <XCircle className="w-3.5 h-3.5 text-white" />
                                      {formatScore(ans?.scoreAwarded)}đ
                                    </span>
                                  ) : (
                                    <span className="text-xs sm:text-sm font-black text-rose-700 flex items-center gap-1 bg-rose-100 px-2.5 py-0.5 rounded-lg border border-rose-300">
                                      <XCircle className="w-3.5 h-3.5 text-rose-600" />
                                      0đ
                                    </span>
                                  )
                                ) : (
                                  <span className="text-xs font-bold text-slate-400 bg-slate-100 px-2 py-0.5 rounded-lg border border-slate-200">
                                    0đ
                                  </span>
                                )}
                              </div>

                              {/* Thời gian chọn đáp án (Badge xanh dương sky nổi bật, tách biệt hoàn toàn với màu điểm) */}
                              <div className="flex items-center justify-end">
                                {ans?.responseTimeMs ? (
                                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-lg bg-sky-100 text-sky-900 border border-sky-300 font-mono font-black text-[11px] sm:text-xs shadow-2xs">
                                    <Timer className="w-3 h-3 text-sky-700 shrink-0" />
                                    {(ans.responseTimeMs / 1000).toFixed(1)}s
                                  </span>
                                ) : (
                                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-lg bg-slate-100 text-slate-400 border border-slate-200 font-mono text-[11px] sm:text-xs">
                                    <Timer className="w-3 h-3 text-slate-400 shrink-0" />
                                    —
                                  </span>
                                )}
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>

                  {/* Stage notice */}
                  <div className="mt-3 pt-2 border-t border-slate-200 flex items-center justify-between text-[11px] text-slate-500">
                    <span className="italic flex items-center gap-1.5 font-medium">
                      <Sparkles className="w-3.5 h-3.5 text-amber-500" />
                      Chuẩn bị chuyển sang màn hình Bảng xếp hạng Vòng 1.
                    </span>
                    <span className="font-bold text-slate-700 uppercase tracking-wide">
                      Chờ lệnh công bố từ Ban Tổ chức...
                    </span>
                  </div>
                </div>
              </div>
            )}

            {/* Phase 6: Bảng xếp hạng Vòng 1 toàn diện (Có chế độ Vinh danh chung cuộc Vòng 1 khi kết thúc câu 10) */}
            {round1State === 'LEADERBOARD' && (
              <div className="animate-fadeIn space-y-4">
                {/* BẢNG XẾP HẠNG TOÀN DIỆN VÒNG 1 (Hiển thị đầy đủ 10 thí sinh rõ ràng, to đẹp trên màn hình LED) */}
                <div className="bg-white border-2 border-slate-200 rounded-3xl p-4 lg:p-5 shadow-2xl">
                  {/* Header: Tiêu đề + Chú thích điểm */}
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 pb-3 mb-3">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 lg:w-11 lg:h-11 rounded-2xl bg-amber-400 text-slate-950 flex items-center justify-center font-black shadow-sm shrink-0">
                        <Trophy className="w-5 h-5 lg:w-6 lg:h-6 text-slate-950" />
                      </div>
                      <div>
                        <h3 className="text-xl lg:text-2xl font-black text-slate-900 uppercase tracking-wide flex items-center gap-2">
                          {session?.currentQuestionIndex === 10
                            ? 'BẢNG XẾP HẠNG CHUNG CUỘC VÒNG 1'
                            : 'BẢNG XẾP HẠNG VÒNG 1: THÔNG THÁI'}
                        </h3>
                        <p className="text-xs lg:text-sm text-slate-500 font-medium">
                          {session?.currentQuestionIndex === 10
                            ? 'Thứ tự xếp hạng chính thức của 10 thí sinh sau toàn bộ 10 câu hỏi Vòng 1'
                            : `Tự động sắp xếp theo tổng điểm tích lũy sau câu hỏi số ${session?.currentQuestionIndex}/10`}
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center gap-3 text-xs lg:text-sm font-bold text-slate-700 bg-slate-50 border border-slate-200 px-3.5 py-1.5 rounded-2xl shrink-0">
                      <span className="flex items-center gap-1.5">
                        <span className="w-3.5 h-3.5 rounded-full bg-emerald-500 inline-block shadow-xs" /> +Điểm (Đúng)
                      </span>
                      <span className="flex items-center gap-1.5">
                        <span className="w-3.5 h-3.5 rounded-full bg-rose-500 inline-block shadow-xs" /> 0 / -2 (Sai)
                      </span>
                      <span className="flex items-center gap-1.5">
                        <Star className="w-3.5 h-3.5 text-amber-500 fill-amber-400" /> Ngôi sao hy vọng
                      </span>
                    </div>
                  </div>

                  {/* 10 Hàng bảng xếp hạng với Framer Motion layout animation (Tự trượt đổi vị trí) */}
                  <div className="space-y-1.5 lg:space-y-2">
                    <AnimatePresence>
                      {sortedLeaderboard.map((p, idx) => {
                        const rank = idx + 1;
                        const delta = p.rankDelta ?? 0;
                        const qCurrent = session?.currentQuestionIndex || 0;
                        const lastWord = p.fullName.trim().split(' ').slice(-1)[0] || '';
                        const initialChar = lastWord.charAt(0).toUpperCase();

                        return (
                          <motion.div
                            key={p.id}
                            layout
                            layoutId={String(p.id)}
                            initial={{ opacity: 0, y: 12 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ type: 'spring', damping: 24, stiffness: 140 }}
                            className={`px-3.5 py-2 lg:py-2.5 rounded-2xl border transition-all flex items-center justify-between gap-3 relative overflow-hidden ${
                              rank === 1
                                ? 'bg-gradient-to-r from-amber-100 via-yellow-50 to-amber-50/90 border-2 border-amber-400 ring-4 ring-amber-300/50 shadow-lg shadow-amber-400/20'
                                : rank === 2
                                ? 'bg-gradient-to-r from-sky-50/90 via-blue-50/50 to-white border-2 border-sky-300 ring-2 ring-sky-200/70 shadow-md'
                                : rank === 3
                                ? 'bg-gradient-to-r from-amber-50/70 via-orange-50/40 to-white border-2 border-amber-500/40 ring-2 ring-amber-400/30 shadow-md'
                                : 'bg-white border-slate-200 text-slate-800 shadow-2xs hover:border-slate-300'
                            }`}
                          >
                            {/* Dải viền màu định danh bên trái cho Rank 1, 2, 3 */}
                            {rank === 1 && (
                              <div className="absolute left-0 top-0 bottom-0 w-2.5 bg-gradient-to-b from-amber-400 via-yellow-300 to-amber-500" />
                            )}
                            {rank === 2 && (
                              <div className="absolute left-0 top-0 bottom-0 w-2.5 bg-gradient-to-b from-sky-400 via-blue-400 to-indigo-500" />
                            )}
                            {rank === 3 && (
                              <div className="absolute left-0 top-0 bottom-0 w-2.5 bg-gradient-to-b from-amber-600 via-orange-500 to-amber-700" />
                            )}

                            {/* Cột trái: Hạng + Avatar + SBD + Họ tên + Đơn vị */}
                            <div className="flex items-center gap-3 min-w-0 flex-1 pl-1">
                              {/* Huy hiệu thứ hạng (Chỉ hiển thị icon huy chương độc lập cho Top 3, không có số bên cạnh) */}
                              <div
                                className={`rounded-xl flex items-center justify-center shrink-0 shadow-sm ${
                                  rank === 1
                                    ? 'w-10 h-10 lg:w-11 lg:h-11 bg-gradient-to-br from-amber-400 via-yellow-300 to-amber-500 ring-4 ring-yellow-200 text-2xl shadow-md animate-pulse'
                                    : rank === 2
                                    ? 'w-9 h-9 lg:w-10 lg:h-10 bg-gradient-to-br from-white via-sky-50 to-slate-100 border-2 border-sky-300 ring-2 ring-sky-200 text-2xl shadow-sm'
                                    : rank === 3
                                    ? 'w-9 h-9 lg:w-10 lg:h-10 bg-gradient-to-br from-amber-100 via-orange-50 to-amber-200 border-2 border-amber-400/80 ring-2 ring-amber-200 text-2xl shadow-sm'
                                    : 'w-8 h-8 lg:w-9 lg:h-9 bg-slate-100 text-slate-600 font-black text-sm border border-slate-200'
                                }`}
                              >
                                {rank === 1 ? '🥇' : rank === 2 ? '🥈' : rank === 3 ? '🥉' : rank}
                              </div>

                              {/* Avatar thí sinh hoặc Chữ cái đầu */}
                              <div
                                className={`rounded-xl bg-slate-100 overflow-hidden shrink-0 flex items-center justify-center shadow-xs ${
                                  rank === 1
                                    ? 'w-10 h-10 lg:w-11 lg:h-11 border-2 border-amber-400 ring-2 ring-yellow-300/60'
                                    : rank === 2
                                    ? 'w-9 h-9 lg:w-10 lg:h-10 border-2 border-sky-400 ring-2 ring-sky-200/60'
                                    : rank === 3
                                    ? 'w-9 h-9 lg:w-10 lg:h-10 border-2 border-amber-500 ring-2 ring-amber-200/60'
                                    : 'w-8 h-8 lg:w-9 lg:h-9 border border-slate-300'
                                }`}
                              >
                                {p.avatarUrl ? (
                                  <img src={p.avatarUrl} alt="" className="w-full h-full object-cover" />
                                ) : (
                                  <span
                                    className={`font-black text-slate-700 bg-slate-200 w-full h-full flex items-center justify-center ${
                                      rank === 1 ? 'text-sm lg:text-base' : 'text-xs lg:text-sm'
                                    }`}
                                  >
                                    {initialChar}
                                  </span>
                                )}
                              </div>

                              {/* Thông tin thí sinh: Họ tên + Đơn vị (hiển thị hết không bị cắt) */}
                              <div className="min-w-0 flex-1">
                                <div className="flex items-center gap-2 truncate">
                                  <span
                                    className={`truncate ${
                                      rank === 1
                                        ? 'text-base lg:text-lg font-black text-slate-950 tracking-tight'
                                        : rank === 2
                                        ? 'text-sm lg:text-base font-black text-slate-900'
                                        : 'text-sm lg:text-base font-extrabold text-slate-900'
                                    }`}
                                  >
                                    {p.fullName}
                                  </span>
                                  {rank === 1 && (
                                    <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-amber-400 text-slate-950 text-[10px] font-black uppercase tracking-wider shrink-0 shadow-2xs">
                                      👑 DẪN ĐẦU
                                    </span>
                                  )}
                                  {rank === 2 && (
                                    <span className="inline-flex items-center px-2.5 py-0.5 rounded-full bg-sky-100 text-sky-900 border border-sky-300 text-[10px] font-black uppercase tracking-wider shrink-0 shadow-2xs">
                                      Á QUÂN
                                    </span>
                                  )}
                                  {rank === 3 && (
                                    <span className="inline-flex items-center px-2.5 py-0.5 rounded-full bg-orange-100 text-amber-900 border border-orange-300 text-[10px] font-black uppercase tracking-wider shrink-0 shadow-2xs">
                                      HẠNG BA
                                    </span>
                                  )}
                                </div>
                                <div className="text-xs text-slate-600 font-medium truncate mt-0.5">
                                  {p.unit}
                                </div>
                              </div>
                            </div>

                            {/* Cột giữa: Dải 10 câu hỏi (Cỡ to hơn cho LED hội trường, +điểm rõ ràng) */}
                            <div className="flex items-center gap-1.5 shrink-0 px-2.5 py-1 bg-slate-50/80 rounded-xl border border-slate-200/80 shadow-inner">
                              {Array.from({ length: 10 }, (_, i) => i + 1).map((qNum) => {
                                const isCurrentQ = qNum === qCurrent;
                                const isPastQ = qNum < qCurrent;
                                const isCurrentRevealed = round1State === 'ANSWER_REVEALED' || round1State === 'LEADERBOARD';
                                const isFinishedQ = isPastQ || (isCurrentQ && isCurrentRevealed);

                                const currentAns = isCurrentQ
                                  ? currentRevealed?.answers?.find((a: any) => a.playerId === p.id)
                                  : null;

                                // Lấy kết quả từ round1History và round1ScoreHistory nếu có
                                const histVal = p.round1History ? p.round1History[qNum - 1] : null;
                                const histScore = p.round1ScoreHistory ? p.round1ScoreHistory[qNum - 1] : null;

                                let isAnswered = false;
                                let isCorrect = false;
                                let scoreVal: number | null = null;

                                if (histVal !== null && histVal !== undefined) {
                                  isAnswered = true;
                                  isCorrect = histVal;
                                  scoreVal = histScore !== null && histScore !== undefined ? Number(histScore) : (isCorrect ? 5 : 0);
                                } else if (currentAns !== null && currentAns !== undefined) {
                                  isAnswered = true;
                                  isCorrect = Boolean(currentAns.isCorrect);
                                  scoreVal = currentAns.scoreAwarded !== null && currentAns.scoreAwarded !== undefined
                                    ? Number(currentAns.scoreAwarded)
                                    : (isCorrect ? 5 : (Boolean(currentAns.hasHopeStar) ? -2 : 0));
                                } else if (p.isCheckedIn && isFinishedQ) {
                                  // Thí sinh đã tham gia (điểm danh) nhưng không nộp bài ở câu đã kết thúc -> tính là SAI (ĐỎ, 0đ)
                                  isAnswered = true;
                                  isCorrect = false;
                                  scoreVal = 0;
                                }

                                const isHopeStarQ = (p.hopeStarUsed && p.hopeStarQuestionIndex === qNum)
                                  || Boolean(currentAns?.hasHopeStar);

                                return (
                                  <div
                                    key={qNum}
                                    className={`relative min-w-8 h-8 lg:min-w-9 lg:h-9 px-0.5 rounded-lg text-xs lg:text-sm font-black font-mono flex items-center justify-center transition-all ${
                                      isAnswered
                                        ? isCorrect
                                          ? 'bg-emerald-500 text-white shadow-xs'
                                          : 'bg-rose-500 text-white shadow-xs'
                                        : isFinishedQ && p.isCheckedIn
                                        ? 'bg-rose-500 text-white shadow-xs'
                                        : qNum <= qCurrent
                                        ? 'bg-slate-200 text-slate-600'
                                        : 'bg-slate-100 text-slate-400 border border-slate-200'
                                    }`}
                                    title={`Câu ${qNum}: ${isAnswered ? (scoreVal !== null ? `${scoreVal > 0 ? `+${scoreVal}` : scoreVal} điểm` : (isCorrect ? 'Đúng' : 'Sai')) : (isFinishedQ && p.isCheckedIn ? '0 điểm (Không chọn)' : 'Chưa thi')}`}
                                  >
                                    {isAnswered ? (
                                      scoreVal !== null && scoreVal !== undefined ? (
                                        scoreVal > 0 ? `+${scoreVal}` : `${scoreVal}`
                                      ) : isCorrect ? '✓' : '✕'
                                    ) : (isFinishedQ && p.isCheckedIn) ? (
                                      '0'
                                    ) : (
                                      qNum
                                    )}

                                    {/* Ngôi sao hy vọng badge nhỏ trên đầu câu hỏi */}
                                    {isHopeStarQ && (
                                      <div className="absolute -top-1.5 -right-1.5 bg-amber-400 text-slate-950 rounded-full p-0.5 shadow-xs border border-white">
                                        <Star className="w-2.5 h-2.5 fill-slate-950" />
                                      </div>
                                    )}
                                  </div>
                                );
                              })}
                            </div>

                            {/* Cột phải: Biến động thứ hạng (+ / - / +0) + Tổng điểm số to rõ ràng */}
                            <div className="flex items-center gap-3 shrink-0 justify-end min-w-[140px]">
                              {/* Biến động thứ hạng (Bổ sung +0 nếu không thay đổi theo yêu cầu) */}
                              <div className="flex items-center min-w-[44px] justify-center">
                                {delta > 0 ? (
                                  <span className="inline-flex items-center gap-0.5 text-xs lg:text-[13px] font-black text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-300 animate-pulse shadow-xs">
                                    <ArrowUp className="w-3.5 h-3.5 text-emerald-600" /> +{delta}
                                  </span>
                                ) : delta < 0 ? (
                                  <span className="inline-flex items-center gap-0.5 text-xs lg:text-[13px] font-black text-rose-700 bg-rose-50 px-2 py-0.5 rounded-full border border-rose-300 shadow-xs">
                                    <ArrowDown className="w-3.5 h-3.5 text-rose-600" /> {delta}
                                  </span>
                                ) : (
                                  <span className="inline-flex items-center gap-0.5 text-xs lg:text-[13px] font-bold text-slate-500 bg-slate-100 px-2 py-0.5 rounded-full border border-slate-200 shadow-xs">
                                    +0
                                  </span>
                                )}
                              </div>

                              {/* Điểm tích lũy to rõ ràng cho màn hình LED lớn hội trường */}
                              {rank === 1 ? (
                                <span className="text-2xl lg:text-3xl font-black text-slate-950 bg-gradient-to-r from-amber-400 via-yellow-300 to-amber-400 px-4 py-1.5 rounded-2xl border-2 border-amber-500 font-mono min-w-[84px] text-center shadow-md ring-2 ring-yellow-200">
                                  {formatScore(p.totalScore ?? p.round1Score)}đ
                                </span>
                              ) : rank === 2 ? (
                                <span className="text-xl lg:text-2xl font-black text-sky-950 bg-gradient-to-r from-sky-100 to-blue-100 px-4 py-1.5 rounded-xl border-2 border-sky-300 font-mono min-w-[76px] text-center shadow-sm ring-1 ring-sky-200">
                                  {formatScore(p.totalScore ?? p.round1Score)}đ
                                </span>
                              ) : rank === 3 ? (
                                <span className="text-xl lg:text-2xl font-black text-amber-950 bg-gradient-to-r from-amber-100 to-orange-100 px-4 py-1.5 rounded-xl border-2 border-amber-400/80 font-mono min-w-[76px] text-center shadow-sm ring-1 ring-amber-200">
                                  {formatScore(p.totalScore ?? p.round1Score)}đ
                                </span>
                              ) : (
                                <span className="text-xl lg:text-2xl font-black text-amber-700 bg-amber-100/90 px-4 py-1 rounded-xl border border-amber-300/80 font-mono min-w-[70px] text-center shadow-xs">
                                  {formatScore(p.totalScore ?? p.round1Score)}đ
                                </span>
                              )}
                            </div>
                          </motion.div>
                        );
                      })}
                    </AnimatePresence>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        {/* 3. ROUND 2 VIEW: Nhạy bén (Mã đề, Block thi & Điểm 10 phút) */}
        {!isFinalView && session?.status === 'ROUND2' && (
          <div className="space-y-6 animate-fadeIn">
            {/* Header Stage Round 2 (Đồng bộ nổi bật & hoành tráng như Vòng 1 Thông thái) */}
            <div className="text-center max-w-4xl mx-auto mb-2">
              <div className="inline-flex items-center gap-3 px-7 py-3 rounded-full bg-gradient-to-r from-red-600 via-rose-600 to-amber-600 text-yellow-200 text-base sm:text-lg lg:text-xl font-black uppercase tracking-wider sm:tracking-widest shadow-2xl ring-4 ring-yellow-400/40 mb-3 animate-pulse">
                <Sparkles className="w-5 h-5 text-yellow-300 animate-spin" style={{ animationDuration: '4s' }} />
                VÒNG 2: BÍ THƯ ĐOÀN CƠ SỞ – NHẠY BÉN
              </div>
              <h2 className="text-2xl sm:text-3xl lg:text-4xl font-extrabold text-white tracking-tight uppercase drop-shadow-md">
                THỰC HÀNH NGHIỆP VỤ TRÊN PHẦN MỀM QUẢN LÝ ĐOÀN VIÊN (YUM)
              </h2>
              <p className="text-sm sm:text-base lg:text-lg font-bold text-amber-300 mt-2.5 max-w-3xl mx-auto flex items-center justify-center gap-2.5">
                <Timer className="w-5 h-5 text-amber-400 shrink-0" /> Thời gian làm bài: 10 phút • Mỗi bộ đề gồm 02 câu hỏi tình huống nghiệp vụ
              </p>
            </div>

            {/* CHẾ ĐỘ 1: CHỌN MÃ ĐỀ (SELECTING) */}
            {r2ViewMode === 'SELECTING' && (
              <div className="space-y-6 max-w-6xl mx-auto">
                {/* Spotlight Thí sinh đang chọn đề */}
                {(() => {
                  const rawCandidate = r2InspectingPlayer || r2CandidateSelecting || activePlayerRound2;
                  const candidateLive = rawCandidate ? session?.players?.find((p) => p.id === rawCandidate.id) || rawCandidate : null;
                  const candidate = candidateLive && (!candidateLive.round2Score || Number(candidateLive.round2Score) === 0) ? candidateLive : null;
                  const topicCode = candidate ? (r2CandidateTopicCode || candidate.round2DrawCode) : null;
                  const lastWord = candidate?.fullName ? candidate.fullName.trim().split(/\s+/).slice(-1)[0] : '';
                  const initialChar = lastWord.charAt(0).toUpperCase() || '?';

                  const currentTopic = topicCode ? getTopicForCode(topicCode) : null;
                  const s1 = currentTopic?.scenario1 || (candidate as any)?.scenario1;
                  const s2 = currentTopic?.scenario2 || (candidate as any)?.scenario2;

                  return (
                    <div className="space-y-5">
                      <div className="bg-gradient-to-r from-blue-900 via-indigo-900 to-slate-900 border-2 border-amber-400 rounded-3xl p-6 shadow-2xl text-white relative overflow-hidden">
                        <div className="absolute top-0 right-0 w-96 h-96 bg-amber-500/10 rounded-full blur-3xl pointer-events-none"></div>

                        <div className="flex flex-col md:flex-row items-center justify-between gap-6 relative z-10">
                          {/* Thông tin thí sinh: Định danh bằng Avatar + Tên đầy đủ */}
                          <div className="flex items-center gap-5">
                            <div className="w-24 h-24 md:w-28 md:h-28 rounded-2xl bg-white/10 border-2 border-amber-400 flex items-center justify-center text-4xl font-black text-amber-300 overflow-hidden shadow-lg shrink-0">
                              {candidate?.avatarUrl ? (
                                <img src={candidate.avatarUrl} alt={candidate.fullName} className="w-full h-full object-cover" />
                              ) : (
                                <span>{initialChar}</span>
                              )}
                            </div>
                            <div className="space-y-3">
                              <div className="text-xs sm:text-sm font-black text-amber-400 uppercase tracking-widest flex items-center gap-2">
                                <span className="w-2.5 h-2.5 rounded-full bg-amber-400 animate-ping"></span>
                                THÍ SINH BỐC THĂM MÃ ĐỀ:
                              </div>
                              <h3 className="text-2xl sm:text-3xl md:text-4xl lg:text-5xl font-black text-white tracking-wide leading-tight">
                                {candidate ? (
                                  candidate.fullName
                                ) : (
                                  <span className="text-slate-400 italic text-xl">MC đang mời thí sinh lên chọn đề...</span>
                                )}
                              </h3>
                            </div>
                          </div>

                          {/* Ô Mã Đề Thí Sinh Đã Chọn / Chờ Chọn */}
                          <div className="text-center shrink-0">
                            <div className="text-xs font-bold text-slate-300 uppercase tracking-wider mb-2">
                              MÃ ĐỀ ĐÃ CHỌN:
                            </div>
                            {topicCode ? (
                              <div className="px-8 py-4 rounded-2xl bg-gradient-to-r from-amber-500 to-yellow-400 text-slate-950 font-black text-3xl shadow-xl ring-4 ring-amber-300 animate-scaleUp border border-yellow-200 tracking-wider">
                                {topicCode}
                              </div>
                            ) : (
                              <div className="px-8 py-4 rounded-2xl bg-white/10 border-2 border-dashed border-amber-400/80 text-amber-300 font-black text-xl animate-pulse tracking-wide">
                                [ CHỜ CHỌN MÃ ĐỀ ❓ ]
                              </div>
                            )}
                          </div>
                        </div>
                      </div>

                      {/* Chi tiết câu hỏi của bộ đề khi thí sinh đã có mã đề */}
                      {topicCode && (
                        <div className="bg-white border-4 border-amber-400 rounded-3xl p-6 shadow-2xl space-y-4 animate-scaleUp">
                          <div className="flex flex-wrap items-center justify-between gap-3 border-b-2 border-slate-100 pb-3">
                            <div className="flex items-center gap-3">
                              <div className="w-10 h-10 rounded-xl bg-amber-500 text-slate-950 font-black flex items-center justify-center text-lg shadow">
                                <FileText className="w-5 h-5 text-slate-950" />
                              </div>
                              <div>
                                <h4 className="text-base sm:text-lg font-black text-slate-900 uppercase">
                                  CÂU HỎI {topicCode} {candidate?.fullName ? `— ${candidate.fullName}` : ''}
                                </h4>
                                <div className="text-xs text-slate-500 font-bold">
                                  SBD {candidate?.orderNumber ? String(candidate.orderNumber).padStart(2, '0') : '--'} • {candidate?.unit || 'Thí sinh dự thi'}
                                </div>
                              </div>
                            </div>
                            <span className="px-3 py-1 rounded-xl bg-amber-100 text-amber-900 border border-amber-300 text-xs font-black uppercase">
                              TỔNG ĐIỂM: 40 ĐIỂM
                            </span>
                          </div>

                          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            {/* Tình huống 1 */}
                            <div className="p-4 rounded-2xl bg-gradient-to-b from-blue-50/90 to-blue-100/40 border-2 border-blue-300 space-y-2 shadow-sm">
                              <div className="flex items-center justify-between border-b border-blue-200 pb-2">
                                <span className="text-xs font-black text-blue-900 uppercase tracking-wide flex items-center gap-1.5">
                                  <span className="w-5 h-5 rounded-full bg-blue-600 text-white flex items-center justify-center text-[10px]">1</span>
                                  TÌNH HUỐNG 01
                                </span>
                                <span className="text-xs font-black text-amber-700 bg-amber-100 px-2.5 py-0.5 rounded-lg border border-amber-300">
                                  Tối đa {currentTopic?.maxScore1 || 20} điểm
                                </span>
                              </div>
                              <p className="text-xs md:text-sm text-slate-800 leading-relaxed font-semibold whitespace-pre-line">
                                {s1 || 'Đang nạp dữ liệu tình huống 1...'}
                              </p>
                            </div>

                            {/* Tình huống 2 */}
                            <div className="p-4 rounded-2xl bg-gradient-to-b from-amber-50/90 to-amber-100/40 border-2 border-amber-300 space-y-2 shadow-sm">
                              <div className="flex items-center justify-between border-b border-amber-200 pb-2">
                                <span className="text-xs font-black text-amber-950 uppercase tracking-wide flex items-center gap-1.5">
                                  <span className="w-5 h-5 rounded-full bg-amber-600 text-white flex items-center justify-center text-[10px]">2</span>
                                  TÌNH HUỐNG 02
                                </span>
                                <span className="text-xs font-black text-amber-700 bg-amber-100 px-2.5 py-0.5 rounded-lg border border-amber-300">
                                  Tối đa {currentTopic?.maxScore2 || 20} điểm
                                </span>
                              </div>
                              <p className="text-xs md:text-sm text-slate-800 leading-relaxed font-semibold whitespace-pre-line">
                                {s2 || 'Đang nạp dữ liệu tình huống 2...'}
                              </p>
                            </div>
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })()}

                {/* Lưới 10 Mã Đề (Bộ đề 01 đến 10) */}
                <div className="bg-white border-2 border-slate-200 rounded-3xl p-6 shadow-xl space-y-4">
                  <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                    <div className="flex items-center gap-2">
                      <Trophy className="w-5 h-5 text-amber-500" />
                      <h4 className="text-base font-black text-slate-900 uppercase">
                        BẢNG 10 MÃ ĐỀ THỰC HÀNH CỦA HỘI THI
                      </h4>
                    </div>
                    <span className="text-xs font-bold text-slate-500">
                      * Mỗi mã đề chỉ được chọn 1 lần duy nhất trong Hội thi • Bấm vào để xem
                    </span>
                  </div>

                  <div className="grid grid-cols-2 sm:grid-cols-5 gap-3.5">
                    {(round2Topics && round2Topics.length > 0
                      ? round2Topics
                      : Array.from({ length: 10 }, (_, i) => ({
                          id: i + 1,
                          sessionId: session?.id || 0,
                          code: `BỘ ĐỀ ${String(i + 1).padStart(2, '0')}`,
                          scenario1: '',
                          scenario2: '',
                          maxScore1: 20,
                          maxScore2: 20,
                        }))
                    ).map((topic) => {
                      const code = topic.code;
                      const chosenPlayer = session?.players?.find((p) => p.round2DrawCode === code);
                      const isChosen = Boolean(chosenPlayer);
                      const isCurrentCandidateCode = (r2CandidateTopicCode === code) || (activePlayerRound2?.round2DrawCode === code);
                      const playerLastWord = chosenPlayer?.fullName ? chosenPlayer.fullName.trim().split(/\s+/).slice(-1)[0] : '';
                      const playerInitialChar = playerLastWord.charAt(0).toUpperCase() || '?';

                      return (
                        <div
                          key={code}
                          onClick={() => {
                            if (isChosen && chosenPlayer) {
                              setR2CandidateSelecting(chosenPlayer);
                              setR2CandidateTopicCode(code);
                              setR2InspectingPlayer(chosenPlayer);
                            } else {
                              setR2CandidateTopicCode(code);
                            }
                          }}
                          className={`p-3.5 rounded-2xl border-2 text-center transition-all flex flex-col justify-between min-h-[128px] relative cursor-pointer ${
                            isCurrentCandidateCode
                              ? 'bg-gradient-to-b from-amber-100 via-yellow-100 to-amber-200 border-amber-500 ring-4 ring-amber-400 shadow-xl scale-[1.03] animate-pulse'
                              : isChosen
                              ? 'bg-gradient-to-b from-blue-50/70 via-white to-indigo-50/50 border-blue-400 shadow-md ring-2 ring-blue-300/40'
                              : 'bg-gradient-to-b from-white to-slate-50 border-slate-200 hover:border-blue-400 hover:shadow-md shadow-2xs text-slate-900'
                          }`}
                        >
                          {/* Tên mã đề (Luôn nổi bật rõ ràng, không bị gạch ngang) */}
                          <div className="flex items-center justify-between gap-1 border-b border-black/5 pb-1.5">
                            <span className={`text-base font-black tracking-wide ${
                              isCurrentCandidateCode
                                ? 'text-amber-950 font-black'
                                : isChosen
                                ? 'text-blue-900 font-black'
                                : 'text-slate-800 font-black'
                            }`}>
                              {code}
                            </span>
                            {isChosen && (
                              <span className="px-1.5 py-0.5 rounded text-[10px] font-black uppercase bg-blue-100 text-blue-800 border border-blue-300">
                                ĐÃ CHỌN
                              </span>
                            )}
                          </div>

                          {/* Định danh Thí sinh sở hữu mã đề: Chỉ cần Ảnh và Tên đầy đủ không bị khuất */}
                          {isChosen && chosenPlayer ? (
                            <div className="mt-2 w-full p-2 rounded-xl bg-white/95 border border-blue-200/90 shadow-2xs flex items-center gap-2 text-left">
                              <div className="w-8 h-8 rounded-lg overflow-hidden bg-gradient-to-tr from-blue-600 to-indigo-700 text-white font-black text-xs flex items-center justify-center shrink-0 border border-blue-300 shadow-xs">
                                {chosenPlayer.avatarUrl ? (
                                  <img src={chosenPlayer.avatarUrl} alt={chosenPlayer.fullName} className="w-full h-full object-cover" />
                                ) : (
                                  playerInitialChar
                                )}
                              </div>
                              <div className="flex-1 min-w-0">
                                <div className="text-xs sm:text-[13px] font-black text-slate-900 leading-snug break-words" title={chosenPlayer.fullName}>
                                  {chosenPlayer.fullName}
                                </div>
                              </div>
                            </div>
                          ) : (
                            <div className="my-auto py-2">
                              <span className="inline-flex items-center gap-1.5 text-xs font-bold text-emerald-700 bg-emerald-50 px-3 py-1 rounded-full border border-emerald-200 shadow-2xs">
                                <span className="w-2 h-2 rounded-full bg-emerald-500 animate-ping"></span>
                                SẴN SÀNG
                              </span>
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* Danh sách các thí sinh đã chọn đề trong lượt này (chuẩn bị thi) */}
                {(() => {
                  const activeReadyBatchPlayers = r2CurrentBatchPlayers
                    .map((bp) => session?.players?.find((p) => p.id === bp.id) || bp)
                    .filter((p) => Boolean(p.round2DrawCode) && (!p.round2Score || Number(p.round2Score) === 0));

                  if (activeReadyBatchPlayers.length === 0) return null;

                  return (
                    <div className="bg-white border-2 border-emerald-400 rounded-3xl p-5 shadow-lg space-y-3 animate-fadeIn">
                      <div className="flex items-center justify-between border-b border-emerald-100 pb-2">
                        <span className="text-xs font-black text-emerald-800 uppercase tracking-wider flex items-center gap-2">
                          <Users className="w-4 h-4 text-emerald-600" /> CÁC THÍ SINH SẴN SÀNG THI TRONG ĐỢT NÀY ({activeReadyBatchPlayers.length} THÍ SINH):
                        </span>
                        <span className="text-[11px] font-bold text-emerald-600">
                          Chờ hiệu lệnh bắt đầu thi từ MC & Ban Tổ chức
                        </span>
                      </div>

                      <div className="flex flex-wrap items-center gap-3.5">
                        {activeReadyBatchPlayers.map((p) => {
                          const lastWord = p.fullName.trim().split(/\s+/).slice(-1)[0] || '';
                          const initialChar = lastWord.charAt(0).toUpperCase() || '?';

                          return (
                            <div
                              key={p.id}
                              className="p-3.5 px-4 rounded-2xl bg-emerald-50/70 border border-emerald-300 flex items-center justify-between shadow-xs gap-4 min-w-[280px]"
                            >
                              <div className="flex items-center gap-3">
                                <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-blue-600 to-indigo-600 border border-blue-400 flex items-center justify-center text-white font-black text-base shrink-0 overflow-hidden shadow-xs">
                                  {p.avatarUrl ? (
                                    <img src={p.avatarUrl} alt="" className="w-full h-full object-cover" />
                                  ) : (
                                    initialChar
                                  )}
                                </div>
                                <span className="text-sm sm:text-base font-black text-slate-900 whitespace-nowrap">
                                  {p.fullName}
                                </span>
                              </div>
                              <span className="px-3 py-1 rounded-xl bg-gradient-to-r from-amber-400 to-yellow-400 text-slate-950 font-black text-xs shrink-0 border border-amber-300 shadow-2xs">
                                {p.round2DrawCode}
                              </span>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  );
                })()}
              </div>
            )}

            {/* CHẾ ĐỘ 2: ĐANG THI 10 PHÚT (EXAM_RUNNING) - ĐỒNG HỒ NỔI TRÒN CỰC ĐẠI, VIỀN TRONG SUỐT (GIỐNG VÒNG 1 KHẨN TRƯƠNG) */}
            {r2ViewMode === 'EXAM_RUNNING' && (
              <div className="space-y-4 max-w-6xl mx-auto animate-fadeIn w-full pt-10 md:pt-14">
                {/* 2. KHUNG CÂU HỎI CỦA THÍ SINH ĐANG CHIẾU (ĐỒNG HỒ TRÒN TO NỔI BẬT LÊN PHÍA TRÊN, GỐI LÊN CARD) */}
                {(() => {
                  const r2DisplayPlayers = (r2CurrentBatchPlayers && r2CurrentBatchPlayers.length > 0)
                    ? r2CurrentBatchPlayers
                    : (session?.players || [])
                        .filter((p) => Boolean(p.round2DrawCode) && (!p.round2Score || Number(p.round2Score) === 0))
                        .sort((a, b) => (a.orderNumber ?? 0) - (b.orderNumber ?? 0));

                  const effectiveInspected = r2InspectingPlayer || (r2DisplayPlayers.length > 0 ? r2DisplayPlayers[0] : null);
                  if (!effectiveInspected) return null;

                  const currentTopic = getTopicForCode(effectiveInspected.round2DrawCode);
                  const s1 = currentTopic?.scenario1 || (effectiveInspected as any)?.scenario1;
                  const s2 = currentTopic?.scenario2 || (effectiveInspected as any)?.scenario2;

                  return (
                    <div className="bg-white border-4 border-amber-400 rounded-3xl p-5 pt-8 shadow-2xl space-y-3.5 relative animate-scaleUp">
                      {/* ĐỒNG HỒ ĐẾM GIỜ TO NỔI BẬT LÊN PHÍA TRÊN, VIỀN TRONG SUỐT GLASSMORPHISM (GIỐNG VÒNG 1 KHẨN TRƯƠNG) */}
                      <div className="absolute left-1/2 -translate-x-1/2 -top-16 md:-top-20 z-30 pointer-events-none">
                        <div
                          className={`relative transition-all duration-300 flex flex-col items-center justify-center rounded-full select-none ${
                            round2Timer <= 60
                              ? 'w-36 h-36 md:w-44 md:h-44 bg-red-600/90 backdrop-blur-md border-4 border-yellow-300 text-yellow-300 shadow-[0_0_60px_rgba(239,68,68,0.7)] ring-8 ring-red-400/50 scale-110 animate-pulse'
                              : 'w-32 h-32 md:w-40 md:h-40 bg-slate-950/80 backdrop-blur-md border-4 border-emerald-400 text-emerald-300 shadow-[0_0_50px_rgba(52,211,153,0.35)] ring-8 ring-emerald-400/25'
                          }`}
                        >
                          {/* Animated Ping Ring trong 60 giây cuối */}
                          {round2Timer <= 60 && (
                            <span className="absolute -inset-3 rounded-full border-2 border-red-500 animate-ping opacity-60 pointer-events-none" />
                          )}

                          <div className="flex items-baseline justify-center">
                            <span
                              className={`font-black font-mono tracking-tight leading-none ${
                                round2Timer <= 60
                                  ? 'text-5xl md:text-6xl text-yellow-300 drop-shadow-[0_4px_12px_rgba(0,0,0,0.6)]'
                                  : 'text-3xl md:text-4xl text-emerald-300 drop-shadow-[0_0_15px_rgba(52,211,153,0.8)]'
                              }`}
                            >
                              {round2Timer <= 60
                                ? round2Timer
                                : `${String(Math.floor(round2Timer / 60)).padStart(2, '0')}:${String(round2Timer % 60).padStart(2, '0')}`}
                            </span>
                            {round2Timer <= 60 && (
                              <span className="text-sm md:text-base font-bold text-white uppercase ml-0.5">
                                s
                              </span>
                            )}
                          </div>

                          <div
                            className={`text-[10px] md:text-xs font-black uppercase tracking-wider mt-1 text-center ${
                              round2Timer <= 60
                                ? 'text-white font-extrabold animate-bounce drop-shadow-md'
                                : 'text-emerald-400 font-bold'
                            }`}
                          >
                            {round2Timer <= 60 ? 'KHẨN TRƯƠNG!' : 'THỜI GIAN'}
                          </div>
                        </div>
                      </div>

                      <div className="flex flex-wrap items-center justify-between gap-3 border-b-2 border-slate-100 pb-2.5">
                        <div className="flex items-center gap-3">
                          <div className="w-12 h-12 rounded-2xl bg-amber-500 border-2 border-amber-600 text-white font-black flex items-center justify-center text-xl shadow-md overflow-hidden shrink-0">
                            {effectiveInspected.avatarUrl ? (
                              <img src={effectiveInspected.avatarUrl} alt="" className="w-full h-full object-cover" />
                            ) : (
                              effectiveInspected.fullName.trim().split(/\s+/).slice(-1)[0]?.charAt(0).toUpperCase() || '★'
                            )}
                          </div>
                          <div>
                            <div className="flex items-center gap-2 flex-wrap">
                              <span className="text-xl font-black text-slate-900 uppercase">
                                {effectiveInspected.fullName}
                              </span>
                              <span className="px-2.5 py-0.5 rounded-lg bg-blue-100 text-blue-900 border border-blue-300 font-black text-xs">
                                SBD {String(effectiveInspected.orderNumber).padStart(2, '0')}
                              </span>
                              <span className="text-xs text-slate-500 font-bold">• {effectiveInspected.unit}</span>
                            </div>
                            <div className="text-sm font-black text-amber-600 flex items-center gap-1.5 mt-0.5">
                              <FileText className="w-4 h-4" /> BỘ ĐỀ DỰ THI: {effectiveInspected.round2DrawCode || 'Chưa gán đề'}
                            </div>
                          </div>
                        </div>

                        <div className="flex items-center gap-2">
                          <div className="text-xs font-bold text-slate-600 bg-slate-100 px-2.5 py-1 rounded-lg border border-slate-200 flex items-center gap-1.5">
                            <Clock className="w-3.5 h-3.5 text-amber-500" />
                            <span className="hidden sm:inline">Đổi sau:</span>
                            <span className="font-mono text-amber-600 font-black">{r2AutoRotateSecondsLeft}s</span>
                            <button
                              type="button"
                              onClick={() => setR2AutoRotateEnabled(!r2AutoRotateEnabled)}
                              className="ml-1 p-0.5 hover:text-amber-700 transition-colors cursor-pointer"
                              title={r2AutoRotateEnabled ? 'Tạm dừng tự động' : 'Bật tự động'}
                            >
                              {r2AutoRotateEnabled ? <Pause className="w-3.5 h-3.5" /> : <Play className="w-3.5 h-3.5" />}
                            </button>
                          </div>

                          <button
                            type="button"
                            onClick={() => setR2InspectingPlayer(null)}
                            className="px-4 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-black text-xs flex items-center gap-1.5 transition-all shadow-xs hover:scale-105 active:scale-95 cursor-pointer"
                          >
                            <X className="w-4 h-4" /> Thu gọn câu hỏi
                          </button>
                        </div>
                      </div>


                      {/* Chi tiết 2 tình huống (Show toàn văn không có scroll) */}
                      {!currentTopic && !s1 && !s2 ? (
                        <div className="p-6 text-center text-slate-500 font-bold text-xs bg-slate-50 rounded-2xl border border-dashed border-slate-300">
                          Thí sinh này chưa được gán bộ đề thi hoặc chưa có dữ liệu câu hỏi.
                        </div>
                      ) : (
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
                          {/* Tình huống 1 */}
                          <div className="p-4 rounded-2xl bg-gradient-to-b from-blue-50/90 to-blue-100/40 border-2 border-blue-300 space-y-2 shadow-xs">
                            <div className="flex items-center justify-between border-b border-blue-200 pb-2">
                              <span className="text-xs font-black text-blue-900 uppercase tracking-wide flex items-center gap-1.5">
                                <span className="w-5 h-5 rounded-full bg-blue-600 text-white flex items-center justify-center text-[10px]">1</span>
                                TÌNH HUỐNG 01
                              </span>
                              <span className="text-xs font-black text-amber-700 bg-amber-100 px-2.5 py-0.5 rounded-lg border border-amber-300">
                                Tối đa {currentTopic?.maxScore1 || 20} điểm
                              </span>
                            </div>
                            <p className="text-xs md:text-sm text-slate-800 leading-relaxed font-semibold whitespace-pre-line">
                              {s1 || 'Đang cập nhật nội dung tình huống 1...'}
                            </p>
                          </div>

                          {/* Tình huống 2 */}
                          <div className="p-4 rounded-2xl bg-gradient-to-b from-amber-50/90 to-amber-100/40 border-2 border-amber-300 space-y-2 shadow-xs">
                            <div className="flex items-center justify-between border-b border-amber-200 pb-2">
                              <span className="text-xs font-black text-amber-950 uppercase tracking-wide flex items-center gap-1.5">
                                <span className="w-5 h-5 rounded-full bg-amber-600 text-white flex items-center justify-center text-[10px]">2</span>
                                TÌNH HUỐNG 02
                              </span>
                              <span className="text-xs font-black text-amber-700 bg-amber-100 px-2.5 py-0.5 rounded-lg border border-amber-300">
                                Tối đa {currentTopic?.maxScore2 || 20} điểm
                              </span>
                            </div>
                            <p className="text-xs md:text-sm text-slate-800 leading-relaxed font-semibold whitespace-pre-line">
                              {s2 || 'Đang cập nhật nội dung tình huống 2...'}
                            </p>
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })()}

                {/* 3. DANH SÁCH 10 THÍ SINH ĐANG THI (CHIA 2 HÀNG MỖI HÀNG 5 THÍ SINH Y HỆT ẢNH GỐC) */}
                {(() => {
                  const r2DisplayPlayers = (r2CurrentBatchPlayers && r2CurrentBatchPlayers.length > 0)
                    ? r2CurrentBatchPlayers
                    : (session?.players || [])
                        .filter((p) => Boolean(p.round2DrawCode) && (!p.round2Score || Number(p.round2Score) === 0))
                        .sort((a, b) => (a.orderNumber ?? 0) - (b.orderNumber ?? 0));
                  const effectiveInspected = r2InspectingPlayer || (r2DisplayPlayers.length > 0 ? r2DisplayPlayers[0] : null);

                  return (
                    <div className="bg-white border-2 border-slate-200 rounded-3xl p-5 shadow-xl space-y-3.5">
                      <div className="flex items-center justify-between flex-wrap gap-2">
                        <h4 className="text-sm font-black text-slate-800 uppercase tracking-wider">
                          CÁC THÍ SINH ĐANG THỰC HIỆN BÀI THI TRONG ĐỢT ({r2DisplayPlayers.length} THÍ SINH):
                        </h4>
                        <span className="text-xs font-bold text-slate-400 italic">
                          * Bấm vào thí sinh để chiếu câu hỏi lên màn hình LED
                        </span>
                      </div>

                      {/* Chia đúng 2 hàng, mỗi hàng 5 thí sinh */}
                      <div className="grid grid-cols-2 sm:grid-cols-5 gap-3.5">
                        {r2DisplayPlayers.map((p) => {
                          const isInspected = (effectiveInspected?.id === p.id);
                          const lastWord = p.fullName.trim().split(/\s+/).slice(-1)[0] || '';
                          const initialChar = lastWord.charAt(0).toUpperCase() || '?';
                          return (
                            <div
                              key={p.id}
                              onClick={() => {
                                setR2InspectingPlayer(p);
                                setR2AutoRotateSecondsLeft(30);
                              }}
                              className={`p-3 rounded-2xl border-2 flex items-center gap-3 transition-all duration-300 cursor-pointer select-none relative ${
                                isInspected
                                  ? 'bg-gradient-to-r from-amber-100 via-yellow-100 to-amber-200 border-amber-500 shadow-xl ring-4 ring-amber-400 scale-[1.03] animate-pulse'
                                  : 'bg-gradient-to-b from-slate-50 to-blue-50/40 border-blue-300 shadow-xs hover:border-amber-400 hover:shadow-md hover:scale-[1.02]'
                              }`}
                            >
                              <div className={`w-11 h-11 rounded-xl border-2 flex items-center justify-center text-lg font-black overflow-hidden shrink-0 shadow-xs ${
                                isInspected ? 'bg-amber-300 border-amber-600 text-amber-950' : 'bg-blue-100 border-blue-500 text-blue-800'
                              }`}>
                                {p.avatarUrl ? (
                                  <img src={p.avatarUrl} alt="" className="w-full h-full object-cover" />
                                ) : (
                                  initialChar
                                )}
                              </div>
                              <div className="flex-1 min-w-0">
                                <div className={`text-sm font-black truncate ${isInspected ? 'text-amber-950 font-black' : 'text-slate-900'}`}>{p.fullName}</div>
                                <div className="flex items-center gap-1.5 mt-0.5">
                                  <span className={`text-xs font-black ${isInspected ? 'text-amber-800' : 'text-blue-700'}`}>{p.round2DrawCode}</span>
                                  {isInspected && (
                                    <span className="px-1.5 py-0.2 rounded bg-amber-600 text-white text-[9px] font-black uppercase">
                                      CHIẾU ĐỀ
                                    </span>
                                  )}
                                </div>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  );
                })()}
              </div>
            )}

            {/* CHẾ ĐỘ 3: HẾT GIỜ (TIME_UP) */}
            {r2ViewMode === 'TIME_UP' && (
              <div className="max-w-4xl mx-auto text-center space-y-6 animate-scaleUp">
                <div className="bg-gradient-to-b from-rose-900 via-rose-950 to-slate-900 border-4 border-rose-500 rounded-3xl p-10 text-white shadow-2xl space-y-4">
                  <div className="w-20 h-20 rounded-full bg-rose-500/20 border-2 border-rose-400 flex items-center justify-center mx-auto text-rose-400 shadow-lg">
                    <XCircle className="w-12 h-12" />
                  </div>
                  <h3 className="text-4xl md:text-5xl font-black text-white uppercase tracking-tight">
                    HẾT GIỜ LÀM BÀI!
                  </h3>
                  <p className="text-base text-rose-200 max-w-lg mx-auto leading-relaxed">
                    Đã hết 10 phút thời gian làm bài. Kính mời các thí sinh dừng mọi thao tác. Ban Giám khảo tiến hành chấm điểm các phần thi thực hành.
                  </p>
                </div>
              </div>
            )}

            {/* CHẾ ĐỘ 4: BẢNG XẾP HẠNG ĐIỂM CHÍNH THỨC VÒNG 2 (LEADERBOARD) */}
            {r2ViewMode === 'LEADERBOARD' && (
              <div className="space-y-6 max-w-6xl mx-auto animate-fadeIn">
                <div className="bg-white border-2 border-amber-400 rounded-3xl p-6 shadow-2xl space-y-4">
                  <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 border-b border-slate-100 pb-3">
                    <div className="flex items-center gap-2.5">
                      <Trophy className="w-6 h-6 text-amber-500 shrink-0" />
                      <div>
                        <h4 className="text-base sm:text-lg font-black text-slate-900 uppercase">
                          BẢNG ĐIỂM CHÍNH THỨC VÒNG 2: NHẠY BÉN
                        </h4>
                        <div className="text-xs text-slate-500 font-medium">
                          Thực hành nghiệp vụ trên phần mềm QLĐV • TH1 (max 20đ) • TH2 (max 20đ) • Tổng V2 (max 40đ)
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* BẢNG ĐIỂM VÒNG 2 (MÃ ĐỀ, TH1, TH2, TỔNG V2) */}
                  <div className="overflow-x-auto animate-fadeIn">
                    <table className="w-full text-left text-sm">
                      <thead>
                        <tr className="border-b border-slate-200 text-slate-500 font-black text-xs uppercase tracking-wider bg-slate-50/70">
                          <th className="py-3 px-2 text-center w-16">Hạng</th>
                          <th className="py-3 px-2 w-16">SBD</th>
                          <th className="py-3 px-3">Họ và tên thí sinh</th>
                          <th className="py-3 px-3">Đơn vị</th>
                          <th className="py-3 px-3 text-center">Mã đề bốc thăm</th>
                          <th className="py-3 px-3 text-center font-bold text-blue-700">Tình huống 1 (TH1)</th>
                          <th className="py-3 px-3 text-center font-bold text-blue-700">Tình huống 2 (TH2)</th>
                          <th className="py-3 px-4 text-right font-black text-amber-700">Tổng điểm Vòng 2</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {[...(session?.players || [])]
                          .sort((a, b) => {
                            const scoreA = Number(a.round2Score ?? 0);
                            const scoreB = Number(b.round2Score ?? 0);
                            if (scoreB !== scoreA) return scoreB - scoreA;
                            const timeA = a.round1TotalTimeMs ?? 999999;
                            const timeB = b.round1TotalTimeMs ?? 999999;
                            if (timeA !== timeB) return timeA - timeB;
                            return (a.orderNumber ?? 0) - (b.orderNumber ?? 0);
                          })
                          .map((p, idx) => {
                            const initialChar = p.fullName.trim().split(' ').slice(-1)[0]?.charAt(0).toUpperCase() || '?';
                            const s1 = p.round2Scenario1Score ?? 0;
                            const s2 = p.round2Scenario2Score ?? 0;
                            const totalV2 = p.round2Score ?? (Number(s1) + Number(s2));

                            return (
                              <tr
                                key={p.id}
                                className={`transition-colors ${
                                  idx === 0
                                    ? 'bg-amber-50/80 font-bold'
                                    : idx === 1
                                    ? 'bg-slate-50/80'
                                    : idx === 2
                                    ? 'bg-amber-50/40'
                                    : 'hover:bg-slate-50/50'
                                }`}
                              >
                                <td className="py-3 px-2 text-center">
                                  <span
                                    className={`w-7 h-7 rounded-xl flex items-center justify-center mx-auto text-xs font-black ${
                                      idx === 0
                                        ? 'bg-amber-500 text-slate-950 shadow-md ring-2 ring-amber-300'
                                        : idx === 1
                                        ? 'bg-slate-300 text-slate-800'
                                        : idx === 2
                                        ? 'bg-amber-700 text-white'
                                        : 'text-slate-600 font-bold'
                                    }`}
                                  >
                                    {idx + 1}
                                  </span>
                                </td>
                                <td className="py-3 px-2 font-bold text-amber-600">
                                  {String(p.orderNumber).padStart(2, '0')}
                                </td>
                                <td className="py-3 px-3">
                                  <div className="flex items-center gap-2.5">
                                    <div className="w-8 h-8 rounded-lg overflow-hidden bg-blue-100 flex items-center justify-center font-black text-blue-700 text-xs shrink-0">
                                      {p.avatarUrl ? (
                                        <img src={p.avatarUrl} alt="" className="w-full h-full object-cover" />
                                      ) : (
                                        initialChar
                                      )}
                                    </div>
                                    <span className="font-black text-slate-900 text-sm sm:text-base">{p.fullName}</span>
                                  </div>
                                </td>
                                <td className="py-3 px-3 text-xs text-slate-600">{p.unit}</td>
                                <td className="py-3 px-3 text-center">
                                  {p.round2DrawCode ? (
                                    <span className="px-3 py-1 rounded-xl bg-gradient-to-r from-amber-400 to-yellow-400 text-slate-950 font-black text-xs shadow-2xs border border-amber-300">
                                      {p.round2DrawCode}
                                    </span>
                                  ) : (
                                    <span className="text-slate-400 text-xs italic">Chưa bốc đề</span>
                                  )}
                                </td>
                                <td className="py-3 px-3 text-center font-bold text-slate-800">
                                  <span className="px-2.5 py-1 rounded-lg bg-blue-50 border border-blue-200 text-blue-900 font-bold">
                                    {formatScore(s1)}đ
                                  </span>
                                </td>
                                <td className="py-3 px-3 text-center font-bold text-slate-800">
                                  <span className="px-2.5 py-1 rounded-lg bg-blue-50 border border-blue-200 text-blue-900 font-bold">
                                    {formatScore(s2)}đ
                                  </span>
                                </td>
                                <td className="py-3 px-4 text-right">
                                  <span className="inline-block px-3 py-1 rounded-xl bg-gradient-to-r from-emerald-100 to-green-100 border border-emerald-300 text-emerald-900 font-black text-base shadow-2xs">
                                    {formatScore(totalV2)}đ
                                  </span>
                                </td>
                              </tr>
                            );
                          })}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        {/* 4. ROUND 3 VIEW: Bản lĩnh (Tổng quan 5 cặp đấu & Tiêu điểm cặp đấu đang thi) */}
        {!isFinalView && session?.status === 'ROUND3' && (
          <div className="space-y-6 animate-fadeIn">
            {/* KIỂM TRA CHẾ ĐỘ: NẾU CÓ CẶP ĐANG ĐẤU THÌ HIỆN TIÊU ĐIỂM (DUEL FOCUS MODE) */}
            {session.round3DuelState && session.round3DuelState.pairNumber ? (() => {
              const duel = session.round3DuelState as any;
              const activeSpeakerId = Number(duel.activePlayerId || 0);
              const isP1Speaking = activeSpeakerId > 0 && activeSpeakerId === duel.player1?.id;
              const isP2Speaking = activeSpeakerId > 0 && activeSpeakerId === duel.player2?.id;
              const isPrepareStage = duel.stage === 'PREPARE';

              return (
                <div className="space-y-6 animate-scaleUp">
                  {/* Header Tiêu điểm Cặp đấu */}
                  <div className="text-center space-y-2">
                    <div className="inline-flex items-center gap-2 px-5 py-1.5 rounded-full bg-gradient-to-r from-amber-500 to-rose-500 text-white text-xs md:text-sm font-black uppercase tracking-wider shadow-lg animate-pulse">
                      <Swords className="w-4 h-4" />
                      <span>TRANH TÀI ĐỐI KHÁNG TRỰC TIẾP • CẶP ĐẤU 0{duel.pairNumber}</span>
                    </div>
                    <h2 className="text-2xl md:text-4xl font-black text-white uppercase drop-shadow-md">
                      {(() => {
                        const stage = duel.stage;
                        if (stage === 'STAGE_1_PREP') return 'CHUẨN BỊ PHƯƠNG ÁN';
                        if (stage === 'STAGE_1_PRESENT') return 'ĐỀ XUẤT PHƯƠNG ÁN';
                        if (stage === 'STAGE_2_QNA') return 'XỬ LÝ TÌNH HUỐNG';
                        if (stage === 'STAGE_3_DEBATE') return 'TRANH LUẬN & PHẢN BIỆN';
                        if (stage === 'PREPARE') return 'BAN GIÁM KHẢO CÔNG BỐ ĐỀ';
                        const t = String(duel.stageTitle || '').toLowerCase();
                        if (t.includes('chuẩn bị') || t.includes('prep')) return 'CHUẨN BỊ PHƯƠNG ÁN';
                        if (t.includes('trình bày') || t.includes('đề xuất') || t.includes('present')) return 'ĐỀ XUẤT PHƯƠNG ÁN';
                        if (t.includes('tình huống') || t.includes('qna')) return 'XỬ LÝ TÌNH HUỐNG';
                        if (t.includes('tranh luận') || t.includes('phản biện') || t.includes('debate')) return 'TRANH LUẬN & PHẢN BIỆN';
                        if (t.includes('công bố đề')) return 'BAN GIÁM KHẢO CÔNG BỐ ĐỀ';
                        return duel.stageTitle || 'VÒNG 3: BẢN LĨNH';
                      })()}
                    </h2>
                  </div>

                  {/* Sân khấu 2 đấu thủ & Đồng hồ đếm ngược chính giữa */}
                  <div className="bg-gradient-to-b from-slate-900/90 via-slate-950/95 to-slate-900/90 border-2 border-amber-400/50 rounded-3xl p-6 md:p-10 shadow-[0_0_60px_rgba(245,158,11,0.25)] relative overflow-hidden backdrop-blur-md">
                    {/* Background glowing light accents */}
                    <div className="absolute top-1/2 left-1/4 -translate-y-1/2 -translate-x-1/2 w-72 h-72 bg-amber-500/10 rounded-full blur-3xl pointer-events-none" />
                    <div className="absolute top-1/2 right-1/4 -translate-y-1/2 translate-x-1/2 w-72 h-72 bg-rose-500/10 rounded-full blur-3xl pointer-events-none" />

                    <div className="relative z-10 grid grid-cols-1 md:grid-cols-3 gap-6 items-center">
                      {/* Đấu thủ 1 (Bên trái) */}
                      <div className={`flex flex-col items-center text-center space-y-3 transition-all duration-300 ${
                        isP1Speaking
                          ? 'scale-105 z-10'
                          : isP2Speaking
                          ? 'opacity-70 scale-95'
                          : ''
                      }`}>
                        {/* Speaker Highlight Badge */}
                        {isP1Speaking && (
                          <div className="px-4 py-1.5 rounded-full bg-gradient-to-r from-amber-400 to-yellow-300 text-slate-950 font-black text-xs md:text-sm uppercase tracking-wider shadow-xl animate-bounce flex items-center gap-1.5 border border-amber-200">
                            <span>🎤 ĐANG TRÌNH BÀY</span>
                          </div>
                        )}
                        {isP2Speaking && (
                          <div className="px-3 py-1 rounded-full bg-slate-800 text-slate-400 font-bold text-[11px] uppercase tracking-wider border border-slate-700">
                            <span>LẮNG NGHE / PHẢN BIỆN</span>
                          </div>
                        )}

                        <div className="relative">
                          <div className={`rounded-full border-4 overflow-hidden bg-slate-800 flex items-center justify-center transition-all ${
                            isP1Speaking
                              ? 'w-36 h-36 md:w-52 md:h-52 border-yellow-300 ring-8 ring-amber-400 shadow-[0_0_60px_rgba(245,158,11,1),0_0_90px_rgba(234,179,8,0.8)] animate-pulse'
                              : 'w-32 h-32 md:w-44 md:h-44 border-amber-300 ring-4 md:ring-8 ring-amber-500 shadow-[0_0_40px_rgba(245,158,11,0.7)]'
                          }`}>
                            {duel.player1?.avatarUrl ? (
                              <img
                                src={duel.player1.avatarUrl}
                                alt=""
                                className="w-full h-full object-cover"
                              />
                            ) : (
                              <span className="text-4xl md:text-6xl font-black text-amber-300">
                                {duel.player1?.fullName?.trim().split(' ').slice(-1)[0]?.charAt(0).toUpperCase() || '1'}
                              </span>
                            )}
                          </div>
                          <span className="absolute -bottom-2 left-1/2 -translate-x-1/2 px-3 py-1 rounded-full bg-amber-500 text-slate-950 font-black text-xs shadow-md border border-amber-300">
                            SBD {String(duel.player1?.orderNumber || 1).padStart(2, '0')}
                          </span>
                        </div>

                        <div className="pt-2">
                          <h3 className={`text-xl md:text-2xl font-black tracking-tight ${
                            isP1Speaking ? 'text-yellow-300 scale-105' : 'text-amber-300'
                          }`}>
                            {duel.player1?.fullName || 'Thí sinh 1'}
                          </h3>
                          <p className="text-xs md:text-sm text-slate-300 mt-0.5">
                            {duel.player1?.unit || 'Đơn vị dự thi'}
                          </p>
                        </div>
                      </div>

                      {/* Trung tâm: Chữ VS nổi bật & Đồng hồ đếm ngược + Đồng hồ phụ quá giờ */}
                      <div className="flex flex-col items-center justify-center space-y-3 my-4 md:my-0">
                        <div className="flex items-center justify-center">
                          <div className="relative flex items-center justify-center my-1">
                            {/* Hào quang rực lửa phía sau */}
                            <div className="absolute inset-0 bg-gradient-to-r from-amber-500 via-yellow-400 to-orange-500 rounded-2xl blur-xl opacity-70 animate-pulse" />
                            {/* Huy hiệu VS được highlight sắc sảo */}
                            <div className="relative px-6 py-1.5 rounded-2xl bg-gradient-to-r from-amber-500/30 via-yellow-400/40 to-orange-500/30 border-2 border-yellow-300 shadow-[0_0_35px_rgba(245,158,11,0.95)] backdrop-blur-md">
                              <span className="text-3xl md:text-5xl font-black italic tracking-widest bg-gradient-to-b from-yellow-100 via-amber-300 to-orange-500 bg-clip-text text-transparent drop-shadow-[0_2px_15px_rgba(245,158,11,1)] select-none">
                                VS
                              </span>
                            </div>
                          </div>
                        </div>

                        {/* Bộ đếm thời gian tròn to nổi bật */}
                        <div
                          className={`relative transition-all duration-300 flex flex-col items-center justify-center rounded-full select-none shadow-2xl ${
                            round3DuelTimeUp
                              ? 'w-36 h-36 md:w-44 md:h-44 bg-rose-600 border-4 border-yellow-300 text-white ring-8 ring-rose-400/50 scale-105 animate-pulse'
                              : isPrepareStage
                              ? 'w-36 h-36 md:w-44 md:h-44 bg-slate-900 border-4 border-amber-400 text-amber-300 ring-8 ring-amber-400/20'
                              : round3DuelTimer <= 15
                              ? 'w-36 h-36 md:w-44 md:h-44 bg-red-600 border-4 border-yellow-300 text-yellow-300 ring-8 ring-red-400/40 scale-110 animate-pulse'
                              : 'w-32 h-32 md:w-40 md:h-40 bg-white/95 border-4 border-emerald-500 text-emerald-600 ring-4 ring-emerald-400/20'
                          }`}
                        >
                          {round3DuelTimeUp ? (
                            <div className="text-center">
                              <div className="text-2xl md:text-3xl font-black text-yellow-300 tracking-wider">
                                HẾT GIỜ!
                              </div>
                              <div className="text-[10px] font-bold text-white uppercase mt-0.5">
                                Dừng phần thi
                              </div>
                            </div>
                          ) : isPrepareStage ? (
                            <div className="text-center p-2">
                              <div className="text-xl md:text-2xl font-black text-amber-300 tracking-tight leading-tight">
                                CHUẨN BỊ
                              </div>
                              <div className="text-[10px] md:text-xs font-bold text-slate-300 uppercase mt-1">
                                BGK ĐỌC ĐỀ
                              </div>
                            </div>
                          ) : (
                            <>
                              <div className="text-3xl md:text-5xl font-mono font-black tracking-tight leading-none">
                                {String(Math.floor(round3DuelTimer / 60)).padStart(2, '0')}:
                                {String(round3DuelTimer % 60).padStart(2, '0')}
                              </div>
                              <div
                                className={`text-[10px] font-black uppercase tracking-widest mt-1 ${
                                  round3DuelTimer <= 15 ? 'text-yellow-300 animate-bounce' : 'text-slate-500'
                                }`}
                              >
                                {round3DuelTimer <= 15 ? 'KHẨN TRƯƠNG!' : 'THỜI GIAN'}
                              </div>
                            </>
                          )}
                        </div>

                        {/* BỘ ĐẾM THỜI GIAN PHỤ (QUÁ GIỜ) TRÊN MÀN HÌNH LED */}
                        {(round3OvertimeRunning || round3OvertimeSeconds > 0) && (
                          <div className="flex flex-col items-center animate-scaleUp pt-1">
                            <div className="px-4 py-2 rounded-2xl bg-rose-600 border-2 border-yellow-300 text-yellow-300 shadow-[0_0_30px_rgba(225,29,72,0.9)] flex items-center gap-2 font-mono font-black text-xl md:text-2xl animate-pulse">
                              <AlertTriangle className="w-5 h-5 text-yellow-300" />
                              <span>+{String(Math.floor(round3OvertimeSeconds / 60)).padStart(2, '0')}:{String(round3OvertimeSeconds % 60).padStart(2, '0')}</span>
                            </div>
                            <span className="text-[10px] md:text-xs font-black text-rose-300 uppercase tracking-widest mt-1">
                              {round3OvertimeRunning ? '⚠️ ĐANG TÍNH QUÁ GIỜ' : 'CHỐT THỜI GIAN QUÁ GIỜ'}
                            </span>
                          </div>
                        )}
                      </div>

                      {/* Đấu thủ 2 (Bên phải) */}
                      <div className={`flex flex-col items-center text-center space-y-3 transition-all duration-300 ${
                        isP2Speaking
                          ? 'scale-105 z-10'
                          : isP1Speaking
                          ? 'opacity-70 scale-95'
                          : ''
                      }`}>
                        {/* Speaker Highlight Badge */}
                        {isP2Speaking && (
                          <div className="px-4 py-1.5 rounded-full bg-gradient-to-r from-rose-500 to-pink-500 text-white font-black text-xs md:text-sm uppercase tracking-wider shadow-xl animate-bounce flex items-center gap-1.5 border border-rose-300">
                            <span>🎤 ĐANG TRÌNH BÀY</span>
                          </div>
                        )}
                        {isP1Speaking && (
                          <div className="px-3 py-1 rounded-full bg-slate-800 text-slate-400 font-bold text-[11px] uppercase tracking-wider border border-slate-700">
                            <span>LẮNG NGHE / PHẢN BIỆN</span>
                          </div>
                        )}

                        <div className="relative">
                          <div className={`rounded-full border-4 overflow-hidden bg-slate-800 flex items-center justify-center transition-all ${
                            isP2Speaking
                              ? 'w-36 h-36 md:w-52 md:h-52 border-yellow-300 ring-8 ring-rose-500 shadow-[0_0_60px_rgba(244,63,94,1),0_0_90px_rgba(225,29,72,0.8)] animate-pulse'
                              : 'w-32 h-32 md:w-44 md:h-44 border-rose-300 ring-4 md:ring-8 ring-rose-500 shadow-[0_0_40px_rgba(244,63,94,0.7)]'
                          }`}>
                            {duel.player2?.avatarUrl ? (
                              <img
                                src={duel.player2.avatarUrl}
                                alt=""
                                className="w-full h-full object-cover"
                              />
                            ) : (
                              <span className="text-4xl md:text-6xl font-black text-rose-300">
                                {duel.player2?.fullName?.trim().split(' ').slice(-1)[0]?.charAt(0).toUpperCase() || '2'}
                              </span>
                            )}
                          </div>
                          <span className="absolute -bottom-2 left-1/2 -translate-x-1/2 px-3 py-1 rounded-full bg-rose-500 text-white font-black text-xs shadow-md border border-rose-300">
                            SBD {String(duel.player2?.orderNumber || 2).padStart(2, '0')}
                          </span>
                        </div>

                        <div className="pt-2">
                          <h3 className={`text-xl md:text-2xl font-black tracking-tight ${
                            isP2Speaking ? 'text-rose-300 scale-105' : 'text-rose-300'
                          }`}>
                            {duel.player2?.fullName || 'Thí sinh 2'}
                          </h3>
                          <p className="text-xs md:text-sm text-slate-300 mt-0.5">
                            {duel.player2?.unit || 'Đơn vị dự thi'}
                          </p>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })() : round3ViewMode === 'RULES' ? (
              /* MÀN PHỔ BIẾN THỂ LỆ VÒNG 3: BẢN LĨNH (ĐỒNG BỘ VÒNG 1 VÀ VÒNG 2) */
              <div className="space-y-6 animate-fadeIn py-2 max-w-7xl mx-auto w-full">
                {/* Header Đồng bộ Vòng 1 & 2 */}
                <div className="text-center max-w-4xl mx-auto mb-2">
                  <div className="inline-flex items-center gap-3 px-7 py-3 rounded-full bg-gradient-to-r from-red-600 via-rose-600 to-amber-600 text-yellow-200 text-base sm:text-lg lg:text-xl font-black uppercase tracking-wider sm:tracking-widest shadow-2xl ring-4 ring-yellow-400/40 mb-3 animate-pulse">
                    <Sparkles className="w-5 h-5 text-yellow-300 animate-spin" style={{ animationDuration: '4s' }} />
                    VÒNG 3: BÍ THƯ ĐOÀN CƠ SỞ – BẢN LĨNH
                  </div>
                  <h2 className="text-2xl sm:text-3xl lg:text-5xl font-black text-white tracking-tight uppercase drop-shadow-md">
                    THỂ LỆ & QUY TẮC TRANH BIỆN ĐỐI KHÁNG
                  </h2>
                  <p className="text-sm sm:text-base lg:text-lg font-bold text-amber-300 mt-2.5 max-w-3xl mx-auto flex items-center justify-center gap-2.5">
                    <Swords className="w-5 h-5 text-amber-400 shrink-0" /> 10 Thí sinh bốc thăm 05 cặp đấu trực tiếp • 03 Giai đoạn tranh tài • Thang điểm tối đa 100 điểm
                  </p>
                </div>

                {/* 3 Thẻ thể lệ 3 giai đoạn đối kháng */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6 max-w-6xl mx-auto">
                  {/* Card 1: Giai đoạn 1 (07 Phút) */}
                  <div className="bg-white rounded-3xl p-6 lg:p-7 border-2 border-amber-300 shadow-2xl relative overflow-hidden flex flex-col justify-between hover:border-amber-500 transition-all">
                    <div className="absolute top-0 right-0 w-32 h-32 bg-amber-50 rounded-bl-full -mr-8 -mt-8 pointer-events-none" />
                    <div>
                      <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-amber-500 to-orange-600 text-white flex items-center justify-center font-black shadow-lg shadow-amber-500/30 mb-4">
                        <BookOpen className="w-7 h-7 text-white" />
                      </div>
                      <div className="text-xs font-black text-amber-700 uppercase tracking-wider mb-1">
                        PHẦN THI 1 • 07 PHÚT
                      </div>
                      <h3 className="text-xl lg:text-2xl font-black text-slate-900 uppercase">
                        Đề xuất phương án
                      </h3>
                      <div className="mt-4 space-y-3 text-xs lg:text-sm text-slate-700 leading-relaxed">
                        <div className="flex items-start gap-2.5 bg-amber-50/70 p-3 rounded-2xl border border-amber-200">
                          <Clock className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                          <span><strong className="text-slate-900 font-bold">Chuẩn bị phương án (02 phút):</strong> Cả 02 thí sinh cùng tiếp nhận tình huống từ BGK và có 02 phút chuẩn bị phương án.</span>
                        </div>
                        <div className="flex items-start gap-2.5 bg-slate-50 p-3 rounded-2xl border border-slate-100">
                          <Users className="w-4 h-4 text-blue-600 shrink-0 mt-0.5" />
                          <span><strong className="text-slate-900 font-bold">Trình bày phương án (05 phút/thí sinh):</strong> Từng thí sinh lần lượt bước lên trình bày giải pháp trước Ban Giám khảo.</span>
                        </div>
                        <div className="flex items-start gap-2.5 bg-rose-50 p-3 rounded-2xl border border-rose-200 text-rose-900">
                          <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
                          <span><strong className="font-bold">Trừ điểm quá giờ:</strong> Cứ vượt quá mỗi 15 giây trừ 05 điểm vào điểm tổng Vòng 3.</span>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Card 2: Giai đoạn 2 (03 Phút) */}
                  <div className="bg-white rounded-3xl p-6 lg:p-7 border-2 border-purple-300 shadow-2xl relative overflow-hidden flex flex-col justify-between hover:border-purple-500 transition-all">
                    <div className="absolute top-0 right-0 w-32 h-32 bg-purple-50 rounded-bl-full -mr-8 -mt-8 pointer-events-none" />
                    <div>
                      <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-purple-600 to-indigo-600 text-white flex items-center justify-center font-black shadow-lg shadow-purple-600/30 mb-4">
                        <MessageSquare className="w-7 h-7 text-white" />
                      </div>
                      <div className="text-xs font-black text-purple-700 uppercase tracking-wider mb-1">
                        PHẦN THI 2 • 03 PHÚT
                      </div>
                      <h3 className="text-xl lg:text-2xl font-black text-slate-900 uppercase">
                        Xử lý tình huống BGK
                      </h3>
                      <div className="mt-4 space-y-3 text-xs lg:text-sm text-slate-700 leading-relaxed">
                        <div className="flex items-start gap-2.5 bg-purple-50/70 p-3 rounded-2xl border border-purple-200">
                          <CheckCircle2 className="w-4 h-4 text-purple-600 shrink-0 mt-0.5" />
                          <span><strong className="text-slate-900 font-bold">Phản biện từ BGK:</strong> Ban Giám khảo đặt câu hỏi kiểm tra chuyên môn và tính khả thi của giải pháp.</span>
                        </div>
                        <div className="flex items-start gap-2.5 bg-slate-50 p-3 rounded-2xl border border-slate-100">
                          <Timer className="w-4 h-4 text-indigo-600 shrink-0 mt-0.5" />
                          <span><strong className="text-slate-900 font-bold">Thời gian:</strong> Mỗi thí sinh có tối đa <strong className="text-slate-900">03 phút (180 giây)</strong> độc lập để trả lời câu hỏi của BGK.</span>
                        </div>
                        <div className="flex items-start gap-2.5 bg-slate-50 p-3 rounded-2xl border border-slate-100">
                          <Lightbulb className="w-4 h-4 text-amber-500 shrink-0 mt-0.5" />
                          <span>Đánh giá tư duy nhạy bén, bản lĩnh xử lý tình huống thực tiễn và phong thái tự tin.</span>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Card 3: Giai đoạn 3 (01 Phút) */}
                  <div className="bg-white rounded-3xl p-6 lg:p-7 border-2 border-rose-300 shadow-2xl relative overflow-hidden flex flex-col justify-between hover:border-rose-500 transition-all">
                    <div className="absolute top-0 right-0 w-32 h-32 bg-rose-50 rounded-bl-full -mr-8 -mt-8 pointer-events-none" />
                    <div>
                      <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-rose-600 to-pink-600 text-white flex items-center justify-center font-black shadow-lg shadow-rose-600/30 mb-4">
                        <Swords className="w-7 h-7 text-white" />
                      </div>
                      <div className="text-xs font-black text-rose-700 uppercase tracking-wider mb-1">
                        PHẦN THI 3 • 01 PHÚT
                      </div>
                      <h3 className="text-xl lg:text-2xl font-black text-slate-900 uppercase">
                        Tranh biện đối chất
                      </h3>
                      <div className="mt-4 space-y-3 text-xs lg:text-sm text-slate-700 leading-relaxed">
                        <div className="flex items-start gap-2.5 bg-rose-50/70 p-3 rounded-2xl border border-rose-200">
                          <Zap className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
                          <span><strong className="text-slate-900 font-bold">Đối kháng trực tiếp:</strong> 02 thí sinh trong cặp chất vấn, phản biện lẫn nhau về phương án giải quyết.</span>
                        </div>
                        <div className="flex items-start gap-2.5 bg-slate-50 p-3 rounded-2xl border border-slate-100">
                          <Clock className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
                          <span><strong className="text-slate-900 font-bold">Thời gian:</strong> Mỗi thí sinh có tối đa <strong className="text-slate-900">01 phút (60 giây)</strong> để phản biện hoặc bảo vệ quan điểm.</span>
                        </div>
                        <div className="flex items-start gap-2.5 bg-slate-50 p-3 rounded-2xl border border-slate-100">
                          <Sparkles className="w-4 h-4 text-amber-500 shrink-0 mt-0.5" />
                          <span>Đánh giá lập luận sắc bén, kỹ năng thuyết phục, văn hóa phản biện văn minh và bản lĩnh.</span>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Banner tóm tắt thang điểm chân trang */}
                <div className="max-w-6xl mx-auto bg-gradient-to-r from-amber-500/20 via-slate-900/90 to-amber-500/20 border-2 border-amber-400/60 rounded-2xl p-4 text-center backdrop-blur-md shadow-xl flex flex-col sm:flex-row items-center justify-around gap-4 text-white">
                  <div className="flex items-center gap-2">
                    <Trophy className="w-5 h-5 text-yellow-300" />
                    <span className="text-xs sm:text-sm font-bold">Thang điểm BGK: <strong className="text-yellow-300 text-base">Tối đa 100 điểm</strong></span>
                  </div>
                  <div className="h-4 w-px bg-white/20 hidden sm:block" />
                  <div className="flex items-center gap-2">
                    <AlertTriangle className="w-5 h-5 text-rose-400" />
                    <span className="text-xs sm:text-sm font-bold">Trừ thời gian quá giờ: <strong className="text-rose-300 text-base">Cứ 15s trừ 5 điểm</strong></span>
                  </div>
                  <div className="h-4 w-px bg-white/20 hidden sm:block" />
                  <div className="flex items-center gap-2">
                    <CheckCircle2 className="w-5 h-5 text-emerald-400" />
                    <span className="text-xs sm:text-sm font-bold">Tổng điểm Vòng 3 = <strong className="text-emerald-300 text-base">Điểm BGK - Điểm trừ</strong></span>
                  </div>
                </div>
              </div>
            ) : (
              /* CHẾ ĐỘ TỔNG QUAN 5 CẶP ĐẤU (OVERVIEW MODE - VIỀN RỰC LỬA, CAO LỚN, CÂN ĐỐI) */
              <div className="space-y-6 max-w-[1720px] mx-auto w-full">
                {/* Header Đồng bộ Vòng 1 & Vòng 2 */}
                <div className="text-center max-w-4xl mx-auto mb-2">
                  <div className="inline-flex items-center gap-3 px-7 py-3 rounded-full bg-gradient-to-r from-red-600 via-rose-600 to-amber-600 text-yellow-200 text-base sm:text-lg lg:text-xl font-black uppercase tracking-wider sm:tracking-widest shadow-2xl ring-4 ring-yellow-400/40 mb-3 animate-pulse">
                    <Sparkles className="w-5 h-5 text-yellow-300 animate-spin" style={{ animationDuration: '4s' }} />
                    VÒNG 3: BÍ THƯ ĐOÀN CƠ SỞ – BẢN LĨNH
                  </div>
                  <h2 className="text-2xl sm:text-3xl lg:text-4xl font-extrabold text-white tracking-tight uppercase drop-shadow-md">
                    TRANH TÀI ĐỐI KHÁNG VÀ TRANH BIỆN TRỰC TIẾP TRÊN SÂN KHẤU
                  </h2>
                  <p className="text-sm sm:text-base lg:text-lg font-bold text-amber-300 mt-2.5 max-w-3xl mx-auto flex items-center justify-center gap-2.5">
                    <Swords className="w-5 h-5 text-amber-400 shrink-0" /> 05 Cặp đấu đối kháng bốc thăm trực tiếp • Thí sinh sẵn sàng bước vào đấu trường
                  </p>
                </div>

                {/* Shuffling animation vs Final Pairs */}
                {isShufflingPairs ? (
                  <div className="py-20 text-center animate-pulse">
                    <div className="w-28 h-28 rounded-full bg-amber-500/20 border-4 border-yellow-300 flex items-center justify-center mx-auto mb-4 animate-spin shadow-2xl">
                      <Swords className="w-14 h-14 text-yellow-300" />
                    </div>
                    <h3 className="text-3xl font-black text-yellow-300">ĐANG XÁO THẺ & GHÉP CẶP NGẪU NHIÊN...</h3>
                    <p className="text-base text-sky-100 mt-2">
                      Hội trường cùng chứng kiến kết quả bốc thăm trực tiếp trên sân khấu
                    </p>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-5 lg:gap-6 items-stretch">
                    {/* Render đủ 5 cặp (Mỗi cặp cao lớn, viền rực lửa, cân đối trên màn hình lớn) */}
                    {[1, 2, 3, 4, 5].map((pairNum) => {
                      const pair = round3DisplayPairs.find((p) => p.pairNumber === pairNum);
                      const p1 = pair?.player1;
                      const p2 = pair?.player2;
                      const isAssigned = Boolean(p1 && p2);

                      return (
                        <div
                          key={pairNum}
                          className={`relative rounded-3xl p-5 lg:p-6 flex flex-col justify-between transition-all duration-500 min-h-[520px] lg:min-h-[580px] overflow-hidden ${
                            isAssigned
                              ? 'bg-gradient-to-b from-slate-900/95 via-indigo-950/90 to-slate-950/95 border-2 border-amber-400 shadow-[0_0_35px_rgba(245,158,11,0.5),0_0_70px_rgba(234,179,8,0.25)] ring-4 ring-amber-400/30 scale-100 hover:scale-[1.02]'
                              : 'bg-gradient-to-b from-slate-900/80 via-slate-950/80 to-slate-900/80 border-2 border-dashed border-amber-500/40 shadow-xl ring-2 ring-amber-500/10'
                          }`}
                        >
                          {/* Dải viền lửa phát sáng trên đầu card */}
                          {isAssigned && (
                            <>
                              <div className="absolute top-0 inset-x-0 h-2 bg-gradient-to-r from-amber-500 via-rose-500 to-yellow-400 shadow-[0_0_15px_rgba(245,158,11,0.9)]" />
                              <div className="absolute -top-12 left-1/2 -translate-x-1/2 w-44 h-44 bg-amber-500/20 rounded-full blur-2xl pointer-events-none" />
                              <div className="absolute -bottom-12 left-1/2 -translate-x-1/2 w-44 h-44 bg-rose-500/20 rounded-full blur-2xl pointer-events-none" />
                            </>
                          )}

                          {/* Header Cặp Đấu */}
                          <div className="text-center pb-3 border-b border-white/10 flex items-center justify-center relative z-10">
                            <span
                              className={`px-4 py-1.5 rounded-full font-black text-xs lg:text-sm tracking-wider uppercase shadow-lg flex items-center gap-1.5 ${
                                isAssigned
                                  ? 'bg-gradient-to-r from-amber-500 via-orange-500 to-rose-600 text-white border border-yellow-300 ring-2 ring-amber-400/50 shadow-amber-500/40 animate-pulse'
                                  : 'bg-slate-800 text-amber-300 border border-amber-500/30'
                              }`}
                            >
                              <Flame className="w-4 h-4 text-yellow-300 fill-current" />
                              <span>CẶP ĐẤU 0{pairNum}</span>
                            </span>
                          </div>

                          {/* Thí sinh 1 (Bên trên - Màu vàng hổ phách) */}
                          <div className="py-2 text-center flex flex-col items-center relative z-10 flex-1 justify-center">
                            {p1 ? (
                              <>
                                <div className="w-20 h-20 lg:w-24 lg:h-24 rounded-3xl border-2 border-amber-400 ring-4 ring-amber-500/60 shadow-[0_0_25px_rgba(245,158,11,0.7)] overflow-hidden bg-slate-800 flex items-center justify-center mb-2.5 transition-all">
                                  {p1.avatarUrl ? (
                                    <img src={p1.avatarUrl} alt="" className="w-full h-full object-cover" />
                                  ) : (
                                    <span className="text-2xl lg:text-3xl font-black text-amber-300">
                                      {p1.fullName?.trim().split(' ').slice(-1)[0]?.charAt(0).toUpperCase() || '1'}
                                    </span>
                                  )}
                                </div>
                                <span className="text-[11px] lg:text-xs font-black text-slate-950 bg-gradient-to-r from-amber-400 to-yellow-300 px-3 py-0.5 rounded-full border border-yellow-200 shadow-md mb-1.5">
                                  SBD {String(p1.orderNumber).padStart(2, '0')}
                                </span>
                                <div className="text-sm lg:text-base font-black text-white line-clamp-1 drop-shadow-sm px-1">
                                  {p1.fullName}
                                </div>
                                <div className="text-[11px] lg:text-xs text-amber-200/80 line-clamp-1 mt-0.5 font-medium px-1">
                                  {p1.unit}
                                </div>
                              </>
                            ) : (
                              <>
                                <div className="w-20 h-20 lg:w-24 lg:h-24 rounded-3xl border-2 border-dashed border-amber-400/40 bg-slate-800/60 flex items-center justify-center text-amber-300/60 font-black text-3xl mb-2.5 shadow-inner">
                                  ?
                                </div>
                                <div className="text-xs font-bold text-slate-400 italic">Chờ bốc thăm</div>
                              </>
                            )}
                          </div>

                          {/* Biểu tượng VS song đấu ở giữa (Vòng lửa rực cháy) */}
                          <div className="py-2.5 flex items-center justify-center gap-2 relative z-10">
                            <div className="h-0.5 bg-gradient-to-r from-transparent via-amber-400/50 to-transparent flex-1" />
                            <div className="w-12 h-12 rounded-full bg-gradient-to-br from-amber-500 via-orange-500 to-rose-600 border-2 border-yellow-300 flex items-center justify-center shadow-[0_0_25px_rgba(245,158,11,0.85)] ring-2 ring-amber-400/50">
                              <span className="font-black italic text-yellow-200 text-lg drop-shadow-[0_0_8px_rgba(255,255,255,0.9)] select-none">VS</span>
                            </div>
                            <div className="h-0.5 bg-gradient-to-r from-transparent via-amber-400/50 to-transparent flex-1" />
                          </div>

                          {/* Thí sinh 2 (Bên dưới - Màu đỏ hồng rực rỡ) */}
                          <div className="py-2 text-center flex flex-col items-center relative z-10 flex-1 justify-center">
                            {p2 ? (
                              <>
                                <div className="w-20 h-20 lg:w-24 lg:h-24 rounded-3xl border-2 border-rose-400 ring-4 ring-rose-500/60 shadow-[0_0_25px_rgba(244,63,94,0.7)] overflow-hidden bg-slate-800 flex items-center justify-center mb-2.5 transition-all">
                                  {p2.avatarUrl ? (
                                    <img src={p2.avatarUrl} alt="" className="w-full h-full object-cover" />
                                  ) : (
                                    <span className="text-2xl lg:text-3xl font-black text-rose-300">
                                      {p2.fullName?.trim().split(' ').slice(-1)[0]?.charAt(0).toUpperCase() || '2'}
                                    </span>
                                  )}
                                </div>
                                <span className="text-[11px] lg:text-xs font-black text-white bg-gradient-to-r from-rose-500 to-pink-600 px-3 py-0.5 rounded-full border border-rose-300 shadow-md mb-1.5">
                                  SBD {String(p2.orderNumber).padStart(2, '0')}
                                </span>
                                <div className="text-sm lg:text-base font-black text-white line-clamp-1 drop-shadow-sm px-1">
                                  {p2.fullName}
                                </div>
                                <div className="text-[11px] lg:text-xs text-rose-200/80 line-clamp-1 mt-0.5 font-medium px-1">
                                  {p2.unit}
                                </div>
                              </>
                            ) : (
                              <>
                                <div className="w-20 h-20 lg:w-24 lg:h-24 rounded-3xl border-2 border-dashed border-rose-400/40 bg-slate-800/60 flex items-center justify-center text-rose-300/60 font-black text-3xl mb-2.5 shadow-inner">
                                  ?
                                </div>
                                <div className="text-xs font-bold text-slate-400 italic">Chờ bốc thăm</div>
                              </>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        {/* 5. FINISHED VIEW: Bảng tổng kết điểm 3 vòng thi & Bục vinh danh trao giải */}
        {isFinalView && (
          <div className="space-y-4 animate-fadeIn">
            {/* Unified Top Header & Mode Switcher Bar (Gộp gọn gàng, loại bỏ header thừa) */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white/95 backdrop-blur-md border-2 border-slate-200 rounded-2xl px-5 py-2.5 shadow-sm">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-amber-400 text-slate-950 flex items-center justify-center font-black shadow-xs shrink-0">
                  <Trophy className="w-5 h-5 text-slate-950" />
                </div>
                <div>
                  <h2 className="text-base lg:text-lg font-black text-slate-900 uppercase tracking-wide flex items-center gap-2">
                    {finishedViewMode === 'PODIUM'
                      ? 'LỄ TRAO GIẢI & VINH DANH CHUNG CUỘC NĂM 2026'
                      : 'BẢNG TỔNG ĐIỂM CHUNG CUỘC 3 VÒNG THI'}
                  </h2>
                  <p className="text-xs text-slate-500 font-medium">
                    {finishedViewMode === 'PODIUM'
                      ? 'Vinh danh: Quán quân • Giải Nhì • Giải Ba'
                      : 'Tổng điểm tích lũy: Vòng 1 (Thông thái) + Vòng 2 (Nhạy bén) + Vòng 3 (Bản lĩnh)'}
                  </p>
                </div>
              </div>

              {/* View Mode Toggle: Bảng điểm 3 vòng vs Bục vinh danh */}
              <div className="flex items-center gap-1.5 p-1 bg-slate-100 rounded-xl border border-slate-200 shadow-inner shrink-0">
                <button
                  onClick={() => setFinishedViewMode('BOARD')}
                  className={`px-3.5 py-1.5 rounded-lg text-xs font-black transition-all flex items-center gap-1.5 ${
                    finishedViewMode === 'BOARD'
                      ? 'bg-amber-400 text-slate-950 shadow-sm'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  <BarChart3 className="w-4 h-4" />
                  <span>BẢNG ĐIỂM 3 VÒNG</span>
                </button>
                <button
                  onClick={() => {
                    setFinishedViewMode('PODIUM');
                    if (soundEnabled) liveSound.playGrandFanfare();
                    try {
                      confetti({ particleCount: 160, spread: 100, origin: { y: 0.6 } });
                    } catch (e) {}
                  }}
                  className={`px-3.5 py-1.5 rounded-lg text-xs font-black transition-all flex items-center gap-1.5 ${
                    finishedViewMode === 'PODIUM'
                      ? 'bg-amber-400 text-slate-950 shadow-sm'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  <Crown className="w-4 h-4" />
                  <span>BỤC VINH DANH</span>
                </button>

                {(isPreviewFinished || isPreview3Rounds) && (
                  <button
                    onClick={() => {
                      setIsPreview3Rounds(false);
                      if (isPreviewFinished) setSearchParams({});
                    }}
                    className="px-3 py-1.5 rounded-lg text-xs font-bold bg-slate-200 hover:bg-slate-300 text-slate-700 transition-all flex items-center gap-1"
                    title="Đóng chế độ xem trước"
                  >
                    <RotateCcw className="w-3.5 h-3.5" />
                    <span>ĐÓNG XEM TRƯỚC</span>
                  </button>
                )}
              </div>
            </div>

            {/* Chế độ 1: BẢNG ĐIỂM CHI TIẾT 3 VÒNG THI (Đồng bộ thiết kế với Bảng xếp hạng Vòng 1, tối ưu màn hình LED lớn hội trường) */}
            {finishedViewMode === 'BOARD' && (
              <div className="bg-white border-2 border-slate-200 rounded-3xl p-4 lg:p-5 shadow-2xl">
                {/* Header: Tiêu đề + Chú thích 3 vòng */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-100 pb-3 mb-3">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-2xl bg-amber-400 text-slate-950 flex items-center justify-center font-black shadow-sm shrink-0">
                      <Trophy className="w-5 h-5 text-slate-950" />
                    </div>
                    <div>
                      <h3 className="text-xl lg:text-2xl font-black text-slate-900 uppercase tracking-wide flex items-center gap-2">
                        BẢNG TỔNG ĐIỂM CHUNG CUỘC 3 VÒNG
                      </h3>
                      <p className="text-xs text-slate-500 font-medium">
                        Sắp xếp theo Tổng điểm tích lũy (Vòng 1 + Vòng 2 + Vòng 3) của 10 thí sinh
                      </p>
                    </div>
                  </div>

                  {/* Legend 3 Vòng thi */}
                  <div className="flex items-center gap-3 text-xs font-bold text-slate-700 bg-slate-50 border border-slate-200 px-3.5 py-1.5 rounded-2xl shrink-0">
                    <span className="flex items-center gap-1.5">
                      <span className="w-3 h-3 rounded-md bg-blue-500 inline-block shadow-xs" /> V1: Thông thái
                    </span>
                    <span className="flex items-center gap-1.5">
                      <span className="w-3 h-3 rounded-md bg-emerald-500 inline-block shadow-xs" /> V2: Nhạy bén
                    </span>
                    <span className="flex items-center gap-1.5">
                      <span className="w-3 h-3 rounded-md bg-purple-500 inline-block shadow-xs" /> V3: Bản lĩnh
                    </span>
                  </div>
                </div>

                {/* 10 Hàng bảng xếp hạng chung cuộc - Đồng bộ style vinh danh Vòng 1 */}
                <div className="space-y-1.5 lg:space-y-2">
                  <AnimatePresence>
                    {sortedLeaderboard.map((p, idx) => {
                      const rank = idx + 1;
                      const lastWord = p.fullName.trim().split(' ').slice(-1)[0] || '';
                      const initialChar = lastWord.charAt(0).toUpperCase();

                      return (
                        <motion.div
                          key={p.id}
                          layout
                          layoutId={`final-${p.id}`}
                          initial={{ opacity: 0, y: 12 }}
                          animate={{ opacity: 1, y: 0 }}
                          transition={{ type: 'spring', damping: 24, stiffness: 140 }}
                          className={`px-3.5 py-2 lg:py-2.5 rounded-2xl border transition-all flex items-center justify-between gap-3 relative overflow-hidden ${
                            rank === 1
                              ? 'bg-gradient-to-r from-amber-100 via-yellow-50 to-amber-50/90 border-2 border-amber-400 ring-4 ring-amber-300/50 shadow-lg shadow-amber-400/20'
                              : rank === 2
                              ? 'bg-gradient-to-r from-sky-50/90 via-blue-50/50 to-white border-2 border-sky-300 ring-2 ring-sky-200/70 shadow-md'
                              : rank === 3
                              ? 'bg-gradient-to-r from-amber-50/70 via-orange-50/40 to-white border-2 border-amber-500/40 ring-2 ring-amber-400/30 shadow-md'
                              : 'bg-white border-slate-200 text-slate-800 shadow-2xs hover:border-slate-300'
                          }`}
                        >
                          {/* Dải viền màu định danh bên trái cho Rank 1, 2, 3 */}
                          {rank === 1 && (
                            <div className="absolute left-0 top-0 bottom-0 w-2.5 bg-gradient-to-b from-amber-400 via-yellow-300 to-amber-500" />
                          )}
                          {rank === 2 && (
                            <div className="absolute left-0 top-0 bottom-0 w-2.5 bg-gradient-to-b from-sky-400 via-blue-400 to-indigo-500" />
                          )}
                          {rank === 3 && (
                            <div className="absolute left-0 top-0 bottom-0 w-2.5 bg-gradient-to-b from-amber-600 via-orange-500 to-amber-700" />
                          )}

                          {/* Cột trái: Hạng + Avatar + SBD + Họ tên + Đơn vị */}
                          <div className="flex items-center gap-3 min-w-0 flex-1 pl-1">
                            {/* Huy hiệu thứ hạng (Chỉ icon huy chương, không có số bên cạnh) */}
                            <div
                              className={`rounded-xl flex items-center justify-center shrink-0 shadow-sm ${
                                rank === 1
                                  ? 'w-10 h-10 lg:w-11 lg:h-11 bg-gradient-to-br from-amber-400 via-yellow-300 to-amber-500 ring-4 ring-yellow-200 text-2xl shadow-md animate-pulse'
                                  : rank === 2
                                  ? 'w-9 h-9 lg:w-10 lg:h-10 bg-gradient-to-br from-white via-sky-50 to-slate-100 border-2 border-sky-300 ring-2 ring-sky-200 text-2xl shadow-sm'
                                  : rank === 3
                                  ? 'w-9 h-9 lg:w-10 lg:h-10 bg-gradient-to-br from-amber-100 via-orange-50 to-amber-200 border-2 border-amber-400/80 ring-2 ring-amber-200 text-2xl shadow-sm'
                                  : 'w-8 h-8 lg:w-9 lg:h-9 bg-slate-100 text-slate-600 font-black text-sm border border-slate-200'
                              }`}
                            >
                              {rank === 1 ? '🥇' : rank === 2 ? '🥈' : rank === 3 ? '🥉' : rank}
                            </div>

                            {/* Avatar thí sinh hoặc Chữ cái đầu */}
                            <div
                              className={`rounded-xl bg-slate-100 overflow-hidden shrink-0 flex items-center justify-center shadow-xs ${
                                rank === 1
                                  ? 'w-10 h-10 lg:w-11 lg:h-11 border-2 border-amber-400 ring-2 ring-yellow-300/60'
                                  : rank === 2
                                  ? 'w-9 h-9 lg:w-10 lg:h-10 border-2 border-sky-400 ring-2 ring-sky-200/60'
                                  : rank === 3
                                  ? 'w-9 h-9 lg:w-10 lg:h-10 border-2 border-amber-500 ring-2 ring-amber-200/60'
                                  : 'w-8 h-8 lg:w-9 lg:h-9 border border-slate-300'
                              }`}
                            >
                              {p.avatarUrl ? (
                                <img src={p.avatarUrl} alt="" className="w-full h-full object-cover" />
                              ) : (
                                <span
                                  className={`font-black text-slate-700 bg-slate-200 w-full h-full flex items-center justify-center ${
                                    rank === 1 ? 'text-sm lg:text-base' : 'text-xs lg:text-sm'
                                  }`}
                                >
                                  {initialChar}
                                </span>
                              )}
                            </div>

                              {/* Thông tin thí sinh: Họ tên + Danh hiệu + Đơn vị */}
                            <div className="min-w-0 flex-1">
                              <div className="flex items-center gap-2 truncate">
                                <span
                                  className={`truncate ${
                                    rank === 1
                                      ? 'text-base lg:text-lg font-black text-slate-950 tracking-tight'
                                      : rank === 2
                                      ? 'text-sm lg:text-base font-black text-slate-900'
                                      : 'text-sm lg:text-base font-extrabold text-slate-900'
                                  }`}
                                >
                                  {p.fullName}
                                </span>
                                {rank === 1 && (
                                  <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-amber-400 text-slate-950 text-[10px] font-black uppercase tracking-wider shrink-0 shadow-2xs">
                                    👑 QUÁN QUÂN
                                  </span>
                                )}
                              </div>
                              <div className="text-xs text-slate-600 font-medium truncate mt-0.5">
                                {p.unit}
                              </div>
                            </div>
                          </div>

                          {/* Cột giữa: 3 Cột điểm 3 Vòng thi thẳng hàng tăm tắp, chỉ hiện số, to rõ ràng */}
                          <div className="grid grid-cols-3 gap-2 shrink-0 p-1 bg-slate-100/90 rounded-2xl border border-slate-200 shadow-inner w-[200px] sm:w-[230px]">
                            {/* Vòng 1: Thông thái (Xanh dương) */}
                            <div className="flex items-center justify-center py-1 px-1 rounded-xl bg-blue-50 border border-blue-200 shadow-2xs">
                              <span className="font-mono font-black text-base lg:text-lg text-blue-700 tracking-tight leading-none">
                                {formatScore(p.round1Score)}
                              </span>
                            </div>

                            {/* Vòng 2: Nhạy bén (Xanh lá) */}
                            <div className="flex items-center justify-center py-1 px-1 rounded-xl bg-emerald-50 border border-emerald-200 shadow-2xs">
                              <span className="font-mono font-black text-base lg:text-lg text-emerald-700 tracking-tight leading-none">
                                {formatScore(p.round2Score)}
                              </span>
                            </div>

                            {/* Vòng 3: Bản lĩnh (Tím) */}
                            <div className="flex items-center justify-center py-1 px-1 rounded-xl bg-purple-50 border border-purple-200 shadow-2xs">
                              <span className="font-mono font-black text-base lg:text-lg text-purple-700 tracking-tight leading-none">
                                {formatScore(p.round3Score)}
                              </span>
                            </div>
                          </div>

                          {/* Cột phải: Tổng điểm chung cuộc to nổi bật cho màn hình LED hội trường */}
                          <div className="flex items-center gap-2 shrink-0 justify-end min-w-[125px]">
                            {rank === 1 ? (
                              <span className="text-2xl lg:text-3xl font-black text-slate-950 bg-gradient-to-r from-amber-400 via-yellow-300 to-amber-400 px-4 py-1.5 rounded-2xl border-2 border-amber-500 font-mono min-w-[84px] text-center shadow-md ring-2 ring-yellow-200">
                                {formatScore(p.totalScore)}đ
                              </span>
                            ) : rank === 2 ? (
                              <span className="text-xl lg:text-2xl font-black text-sky-950 bg-gradient-to-r from-sky-100 to-blue-100 px-4 py-1.5 rounded-xl border-2 border-sky-300 font-mono min-w-[76px] text-center shadow-sm ring-1 ring-sky-200">
                                {formatScore(p.totalScore)}đ
                              </span>
                            ) : rank === 3 ? (
                              <span className="text-xl lg:text-2xl font-black text-amber-950 bg-gradient-to-r from-amber-100 to-orange-100 px-4 py-1.5 rounded-xl border-2 border-amber-400/80 font-mono min-w-[76px] text-center shadow-sm ring-1 ring-amber-200">
                                {formatScore(p.totalScore)}đ
                              </span>
                            ) : (
                              <span className="text-xl lg:text-2xl font-black text-amber-700 bg-amber-100/90 px-4 py-1 rounded-xl border border-amber-300/80 font-mono min-w-[70px] text-center shadow-xs">
                                {formatScore(p.totalScore)}đ
                              </span>
                            )}
                          </div>
                        </motion.div>
                      );
                    })}
                  </AnimatePresence>
                </div>
              </div>
            )}

            {/* Chế độ 2: BỤC VINH DANH & TRAO GIẢI (Podium cân đối hoàn hảo 3 cột, hiển thị sắc nét) */}
            {finishedViewMode === 'PODIUM' && (
              <div className="space-y-4 text-center animate-fadeIn py-2 max-w-7xl mx-auto w-full">
                {/* Podium Grid: 3 Cột Cân Đối (Giải Nhì bên trái, Quán Quân ở giữa cao nhất, Giải Ba bên phải) */}
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-end pt-2 pb-4">
                  {/* GIẢI NHÌ: Cột 1 (Bên trái) */}
                  <div className="bg-gradient-to-b from-white via-sky-50/40 to-blue-50/50 border-2 border-sky-300 rounded-3xl p-5 text-center shadow-xl flex flex-col justify-between min-h-[500px] relative overflow-hidden order-2 lg:order-1">
                    <div className="absolute top-0 inset-x-0 h-2 bg-gradient-to-r from-sky-400 via-blue-400 to-indigo-500" />
                    
                    <div>
                      <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-white via-sky-50 to-slate-100 border-2 border-sky-300 ring-4 ring-sky-200 text-3xl flex items-center justify-center mx-auto mb-2 shadow-sm">
                        🥈
                      </div>
                      <div className="text-base font-black text-sky-950 uppercase tracking-wider mb-4">
                        GIẢI NHÌ
                      </div>

                      <div className="space-y-3 text-xs text-left">
                        {(winners.length > 0 ? winners : sortedLeaderboard.map((p, i) => ({ rank: i + 1, player: p })))
                          ?.filter((w) => w.rank >= 2 && w.rank <= 4)
                          .map((w) => {
                            const lastWord = w.player.fullName.trim().split(' ').slice(-1)[0] || '';
                            const initialChar = lastWord.charAt(0).toUpperCase();

                            return (
                              <div
                                key={w.player.id}
                                className="p-3 rounded-2xl bg-white border border-sky-200 hover:border-sky-300 flex items-center gap-3 shadow-xs transition-all"
                              >
                                {w.player.avatarUrl ? (
                                  <img
                                    src={w.player.avatarUrl}
                                    alt=""
                                    className="w-11 h-11 rounded-xl object-cover border-2 border-sky-300 shrink-0 shadow-2xs"
                                  />
                                ) : (
                                  <div className="w-11 h-11 rounded-xl bg-gradient-to-br from-sky-100 to-blue-200 text-sky-900 font-black text-base flex items-center justify-center shrink-0 shadow-2xs border border-sky-300">
                                    {initialChar}
                                  </div>
                                )}
                                <div className="flex-1 min-w-0">
                                  <div className="font-black text-slate-900 text-sm truncate">
                                    {w.player.fullName}
                                  </div>
                                  <div className="text-[11px] text-slate-500 truncate mt-0.5 font-medium">
                                    {w.player.unit}
                                  </div>
                                </div>
                                <div className="text-right shrink-0">
                                  <div className="font-black text-sky-950 text-base font-mono">{formatScore(w.player.totalScore)}đ</div>
                                  <div className="text-[9px] text-slate-500 font-mono mt-0.5">
                                    V1: {formatScore(w.player.round1Score)} • V2: {formatScore(w.player.round2Score)} • V3: {formatScore(w.player.round3Score)}
                                  </div>
                                </div>
                              </div>
                            );
                          })}
                      </div>
                    </div>
                  </div>

                  {/* QUÁN QUÂN: Cột 2 (Chính giữa, cao nhất, nổi bật nhất) */}
                  <div className="bg-gradient-to-b from-white via-amber-50/50 to-yellow-50/70 border-4 border-amber-400 rounded-3xl p-6 text-center shadow-2xl shadow-amber-500/25 ring-8 ring-amber-400/20 flex flex-col justify-between min-h-[560px] relative overflow-hidden scale-100 lg:scale-105 z-10 order-1 lg:order-2">
                    <div className="absolute top-0 inset-x-0 h-2 bg-gradient-to-r from-amber-400 via-yellow-300 to-amber-400" />
                    <div className="absolute top-0 right-0 w-44 h-44 bg-yellow-300/20 rounded-full blur-3xl pointer-events-none" />

                    <div>
                      {/* Đỉnh bục vinh danh */}
                      <div className="pt-2 pb-2 px-3 mb-3.5 rounded-2xl bg-gradient-to-r from-amber-400 via-yellow-300 to-amber-400 border border-amber-500 shadow-md">
                        <span className="text-[11px] sm:text-xs font-black text-slate-950 uppercase tracking-wide leading-relaxed block">
                          ⭐ ĐẠI DIỆN TUỔI TRẺ TỈNH NGHỆ AN THAM DỰ HỘI THI BÍ THƯ ĐOÀN CƠ SỞ GIỎI TOÀN QUỐC NĂM 2026 ⭐
                        </span>
                      </div>

                      <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-amber-400 via-yellow-300 to-amber-500 text-slate-950 font-black text-4xl flex items-center justify-center mx-auto mb-2 shadow-lg shadow-amber-500/30 ring-4 ring-yellow-200 animate-bounce">
                        👑
                      </div>
                      
                      <div className="inline-flex items-center gap-1.5 px-4 py-1.5 rounded-full bg-amber-400 text-slate-950 text-sm font-black uppercase tracking-wider mb-4 shadow-sm">
                        <Trophy className="w-4 h-4 fill-slate-950" />
                        QUÁN QUÂN
                      </div>

                      {(() => {
                        const first = winners.length > 0
                          ? winners.find((w) => w.rank === 1)?.player
                          : sortedLeaderboard[0];
                        if (!first) return null;

                        const lastWord = first.fullName.trim().split(' ').slice(-1)[0] || '';
                        const initialChar = lastWord.charAt(0).toUpperCase();

                        return (
                          <div className="space-y-3">
                            {/* Avatar to hoành tráng */}
                            <div className="w-32 h-32 rounded-3xl bg-amber-50 border-4 border-amber-400 mx-auto overflow-hidden shadow-2xl shadow-amber-500/30 ring-4 ring-yellow-300/40">
                              {first.avatarUrl ? (
                                <img src={first.avatarUrl} alt="" className="w-full h-full object-cover" />
                              ) : (
                                <div className="w-full h-full flex items-center justify-center font-black text-amber-700 text-5xl bg-gradient-to-br from-amber-100 to-yellow-200">
                                  {initialChar}
                                </div>
                              )}
                            </div>

                            <h3 className="text-2xl sm:text-3xl font-black text-slate-950 tracking-tight pt-1">
                              {first.fullName}
                            </h3>
                            <p className="text-xs sm:text-sm font-bold text-slate-600">{first.unit}</p>

                            <div className="pt-2">
                              <div className="text-6xl sm:text-7xl font-black text-amber-600 drop-shadow-sm font-mono tracking-tight">
                                {formatScore(first.totalScore)} <span className="text-2xl sm:text-3xl font-black text-amber-700">ĐIỂM</span>
                              </div>
                              <div className="mt-2 text-xs text-amber-900 bg-amber-100/90 py-1.5 px-4 rounded-xl border border-amber-300 inline-block font-mono font-bold shadow-2xs">
                                V1: {formatScore(first.round1Score)} • V2: {formatScore(first.round2Score)} • V3: {formatScore(first.round3Score)}
                              </div>
                            </div>
                          </div>
                        );
                      })()}
                    </div>
                  </div>

                  {/* GIẢI BA: Cột 3 (Bên phải, hiển thị 2 cột nhỏ cho 6 người) */}
                  <div className="bg-gradient-to-b from-white via-amber-50/30 to-orange-50/40 border-2 border-amber-600/40 rounded-3xl p-5 text-center shadow-xl flex flex-col justify-between min-h-[500px] relative overflow-hidden order-3">
                    <div className="absolute top-0 inset-x-0 h-2 bg-gradient-to-r from-amber-600 via-orange-500 to-amber-700" />

                    <div>
                      <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-amber-100 via-orange-50 to-amber-200 border-2 border-amber-400 ring-4 ring-amber-200 text-3xl flex items-center justify-center mx-auto mb-2 shadow-sm">
                        🥉
                      </div>
                      <div className="text-base font-black text-amber-950 uppercase tracking-wider mb-4">
                        GIẢI BA
                      </div>

                      {/* Lưới 2 cột cho 6 giải Ba cân đối, không chồng chữ */}
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs text-left">
                        {(winners.length > 0 ? winners : sortedLeaderboard.map((p, i) => ({ rank: i + 1, player: p })))
                          ?.filter((w) => w.rank >= 5)
                          .map((w) => {
                            const lastWord = w.player.fullName.trim().split(' ').slice(-1)[0] || '';
                            const initialChar = lastWord.charAt(0).toUpperCase();

                            return (
                              <div
                                key={w.player.id}
                                className="p-2.5 rounded-xl bg-white border border-amber-200/80 hover:border-amber-300 flex items-center gap-2 shadow-2xs transition-all"
                              >
                                {w.player.avatarUrl ? (
                                  <img
                                    src={w.player.avatarUrl}
                                    alt=""
                                    className="w-9 h-9 rounded-lg object-cover border border-amber-300 shrink-0"
                                  />
                                ) : (
                                  <div className="w-9 h-9 rounded-lg bg-gradient-to-br from-amber-100 to-orange-200 text-amber-900 font-black text-xs flex items-center justify-center shrink-0 border border-amber-300">
                                    {initialChar}
                                  </div>
                                )}
                                <div className="flex-1 min-w-0">
                                  <div className="font-bold text-slate-900 text-xs truncate">
                                    {w.player.fullName}
                                  </div>
                                  <div className="text-[10px] text-slate-500 truncate">{w.player.unit}</div>
                                  <div className="font-black text-amber-800 text-[11px] font-mono mt-0.5">
                                    {formatScore(w.player.totalScore)}đ
                                  </div>
                                </div>
                              </div>
                            );
                          })}
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}
      </main>

      {/* BOTTOM FOOTER BAR */}
      <footer className="relative z-10 px-8 py-3 border-t border-white/15 bg-[#10348c]/90 backdrop-blur-md flex items-center justify-between text-xs text-sky-100 shadow-md">
        <div className="flex items-center gap-3">
          <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-pulse" />
          <span className="text-white/90 font-medium">Hệ thống chấm điểm & điều hành sân khấu trực tiếp thời gian thực</span>
        </div>
        <div className="font-bold text-yellow-300 uppercase tracking-wider">
          BAN THƯỜNG VỤ TỈNH ĐOÀN NGHỆ AN
        </div>
      </footer>
    </div>
  );
}
