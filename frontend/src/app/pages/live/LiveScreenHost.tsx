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
} from 'lucide-react';
import { liveApi } from '../../../api/liveApi';
import { adminLiveApi } from '../../../api/admin/adminLiveApi';
import BrandMark from '../../components/BrandMark';
import { useLiveSocket } from '../../../hooks/useLiveSocket';
import { liveSound } from '../../../utils/liveSound';
import {
  LiveEventMessage,
  LivePlayerDto,
  LiveQuestionDto,
  LiveRound2Topic,
  LiveRound3Pair,
  LiveSessionDto,
} from '../../../types/live';

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

  // Round 2 & 3 State
  const [round2Topics, setRound2Topics] = useState<LiveRound2Topic[]>([]);
  const [selectedTopic, setSelectedTopic] = useState<LiveRound2Topic | null>(null);
  const [isTopicQuestionRevealed, setIsTopicQuestionRevealed] = useState<boolean>(false);
  const [activePlayerRound2, setActivePlayerRound2] = useState<LivePlayerDto | null>(null);
  const [round2Timer, setRound2Timer] = useState<number>(600); // 10 minutes (600s)
  const [round2TimerRunning, setRound2TimerRunning] = useState<boolean>(false);

  // Round 3 Pairing State
  const [isShufflingPairs, setIsShufflingPairs] = useState<boolean>(false);
  const [round3Pairs, setRound3Pairs] = useState<any[]>([]);

  // Winners State
  const [winners, setWinners] = useState<any[]>([]);
  const [finishedViewMode, setFinishedViewMode] = useState<'BOARD' | 'PODIUM'>('BOARD');

  const [searchParams, setSearchParams] = useSearchParams();
  const isPreviewFinished = searchParams.get('preview') === 'final' || searchParams.get('view') === 'finished';

  const isFinalView = session?.status === 'FINISHED' || isPreviewFinished;

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

        case 'ROUND2_TOPIC_ASSIGNED':
          if (event.payload.topic) {
            setSelectedTopic(event.payload.topic);
          }
          setIsTopicQuestionRevealed(false);
          setRound2Timer(600);
          setRound2TimerRunning(false);
          if (session?.players) {
            const p = session.players.find((pl) => pl.id === event.payload.playerId);
            if (p) setActivePlayerRound2(p);
          }
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

        case 'ROUND2_SCORE_UPDATED':
        case 'ROUND3_SCORE_UPDATED':
          fetchSession();
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
          if (soundEnabled) liveSound.playGrandFanfare();
          try {
            confetti({
              particleCount: 150,
              spread: 100,
              origin: { y: 0.6 },
            });
          } catch (e) {}
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

  // Round 2 10-minute timer ticker
  useEffect(() => {
    if (!round2TimerRunning || round2Timer <= 0) return;
    const interval = setInterval(() => {
      setRound2Timer((prev) => (prev > 0 ? prev - 1 : 0));
    }, 1000);
    return () => clearInterval(interval);
  }, [round2TimerRunning, round2Timer]);

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
      className="min-h-screen bg-slate-100 text-slate-900 flex flex-col justify-between overflow-hidden relative select-none"
      style={{ fontFamily: '"Be Vietnam Pro", sans-serif' }}
    >
      {/* Background: Light subtle pattern, consistent with modern clean theme */}
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-blue-50/70 via-slate-100 to-slate-200 pointer-events-none" />
      <div className="absolute inset-0 bg-[linear-gradient(to_right,#00000008_1px,transparent_1px),linear-gradient(to_bottom,#00000008_1px,transparent_1px)] bg-[size:4rem_4rem] pointer-events-none" />

      {/* TOP BAR: Clean high-contrast white navbar with Đoàn TNCS brand */}
      <header className="relative z-10 px-8 py-3.5 border-b border-slate-200 flex items-center justify-between bg-white/95 backdrop-blur-md shadow-xs">
        <div className="flex items-center gap-4">
          <BrandMark size={52} showBorder={false} className="shrink-0" />
          <div>
            <p className="text-xs font-black tracking-wider uppercase text-red-600">
              TỈNH ĐOÀN NGHỆ AN
            </p>
            <h1 className="text-xl font-extrabold uppercase tracking-wide text-blue-900">
              HỘI THI BÍ THƯ ĐOÀN CƠ SỞ GIỎI NĂM 2026
            </h1>
            <div className="text-xs font-semibold text-slate-600 tracking-wide uppercase">
              Vòng Chung kết: Thông thái • Nhạy bén • Bản lĩnh
            </div>
          </div>
        </div>

        {/* Stage Status Pill */}
        <div className="flex items-center gap-4">
          <div className="px-4 py-1.5 rounded-full bg-blue-50 border border-blue-200 text-blue-800 text-xs font-bold uppercase tracking-wider flex items-center gap-2 shadow-xs">
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-ping" />
            {isPreviewFinished && '👁️ XEM TRƯỚC: TỔNG KẾT 3 VÒNG'}
            {!isPreviewFinished && session?.status === 'LOBBY' && 'SẢNH CHỜ • ĐIỂM DANH THÍ SINH'}
            {!isPreviewFinished && session?.status === 'ROUND1' && (round1State === 'IDLE' ? 'VÒNG 1: THÔNG THÁI • PHỔ BIẾN THỂ LỆ' : `VÒNG 1: THÔNG THÁI • CÂU ${session?.currentQuestionIndex || 1}/10`)}
            {!isPreviewFinished && session?.status === 'ROUND2' && 'VÒNG 2: NHẠY BÉN • 10 PHÚT'}
            {!isPreviewFinished && session?.status === 'ROUND3' && 'VÒNG 3: BẢN LĨNH • ĐỐI KHÁNG'}
            {!isPreviewFinished && session?.status === 'FINISHED' && 'LỄ TRAO GIẢI & VINH DANH'}
          </div>

          <div className="flex items-center gap-2 text-slate-600">
            {isPreviewFinished ? (
              <button
                onClick={() => {
                  searchParams.delete('preview');
                  searchParams.delete('view');
                  setSearchParams(searchParams);
                }}
                className="px-3 py-1.5 rounded-xl bg-amber-100 hover:bg-amber-200 text-amber-900 border border-amber-300 font-bold text-xs flex items-center gap-1 shadow-xs transition-colors"
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
                className="px-3 py-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 border border-slate-300 font-bold text-xs flex items-center gap-1 shadow-xs transition-colors"
                title="Bật xem trước màn hình tổng kết 3 vòng chung cuộc"
              >
                <Trophy className="w-3.5 h-3.5 text-amber-600" />
                <span>Xem trước Bảng 3 vòng</span>
              </button>
            )}
            <button
              onClick={() => setSoundEnabled(!soundEnabled)}
              className="p-2 rounded-xl bg-white border border-slate-200 hover:text-slate-900 hover:bg-slate-50 transition-colors shadow-xs"
              title={soundEnabled ? 'Tắt âm thanh' : 'Bật âm thanh'}
            >
              {soundEnabled ? <Volume2 className="w-4 h-4 text-emerald-600" /> : <VolumeX className="w-4 h-4 text-rose-500" />}
            </button>
            <button
              onClick={toggleFullscreen}
              className="p-2 rounded-xl bg-white border border-slate-200 hover:text-slate-900 hover:bg-slate-50 transition-colors shadow-xs"
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
              <div className="inline-flex items-center gap-2 px-4 py-1 rounded-full bg-amber-100 border border-amber-300 text-amber-800 text-xs font-bold uppercase tracking-wider mb-2 shadow-xs">
                <Sparkles className="w-3.5 h-3.5 text-amber-600" /> 10 GƯƠNG MẶT XUẤT SẮC NHẤT
              </div>
              <h2 className="text-3xl font-black text-slate-900">DANH SÁCH THÍ SINH VÒNG CHUNG KẾT</h2>
              <p className="text-sm text-slate-600 mt-1">
                Hiện có <strong className="text-emerald-600 font-bold">{checkedInCount} / 10</strong> thí sinh đã điểm danh
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
                  <div className="absolute top-3.5 left-3.5 w-8 h-8 rounded-xl bg-red-600 text-yellow-300 font-black text-xs flex items-center justify-center shadow-md">
                    {String(p.orderNumber).padStart(2, '0')}
                  </div>

                  <div className="w-24 h-24 rounded-2xl bg-slate-100 border-2 border-blue-500 flex items-center justify-center text-3xl font-black text-blue-700 mb-3 overflow-hidden shadow-md">
                    {p.avatarUrl ? (
                      <img src={p.avatarUrl} alt={p.fullName} className="w-full h-full object-cover" />
                    ) : (
                      <span className="text-2xl font-black text-blue-600">{p.fullName.charAt(0)}</span>
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
                  <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-gradient-to-r from-red-600 via-rose-600 to-amber-600 text-yellow-200 text-xs font-black uppercase tracking-widest shadow-md mb-2">
                    <Sparkles className="w-3.5 h-3.5 text-yellow-300 animate-spin" style={{ animationDuration: '4s' }} />
                    VÒNG 1: BÍ THƯ ĐOÀN CƠ SỞ - THÔNG THÁI
                  </div>
                  <h2 className="text-3xl lg:text-4xl font-black text-slate-900 tracking-tight uppercase">
                    THỂ LỆ & QUY TẮC THI ĐẤU
                  </h2>
                  <p className="text-sm font-medium text-slate-600 mt-1 max-w-2xl mx-auto">
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
                        QUYỀN TRỢ GIÚP ĐẶC BIỆT
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
                          <span>Thời gian suy nghĩ đặt NSHV: <strong className="text-slate-900 font-bold">05 giây</strong> trước khi bắt đầu câu hỏi.</span>
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
                          checkedInList.map((p) => (
                            <div
                              key={p.id}
                              className="flex items-center gap-1.5 px-2.5 py-1 rounded-xl bg-white/10 border border-white/20 text-xs font-bold text-white"
                              title={`SBD ${p.orderNumber}: ${p.fullName} - ${p.unit}`}
                            >
                              <span className="w-4 h-4 rounded-md bg-red-600 text-[10px] text-yellow-300 font-black flex items-center justify-center">
                                {p.orderNumber}
                              </span>
                              <span className="max-w-[80px] truncate">{p.fullName.split(' ').slice(-1)[0]}</span>
                            </div>
                          ))
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
                                ĐÃ ĐẶT NSHV
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

            {/* Phase 3 & 4: MC Reading & 40s Answering Phase */}
            {(round1State === 'QUESTION_READING' || round1State === 'QUESTION_40S') && (
              <div className="space-y-4 animate-fadeIn">
                {/* Stage Header with Centered Countdown Clock */}
                <div className="relative flex items-center justify-between min-h-[96px] px-2">
                  {/* Left: Question Order Badge */}
                  <div className="flex items-center gap-3">
                    <span className="px-4 py-2 rounded-2xl bg-red-600 text-yellow-300 font-black text-base uppercase shadow-md flex items-center gap-1.5">
                      CÂU {session?.currentQuestionIndex} / 10
                    </span>
                    <div className="hidden sm:block text-left">
                      <div className="text-xs font-black uppercase tracking-wider text-slate-800">
                        {round1State === 'QUESTION_READING'
                          ? 'MC ĐANG ĐỌC NỘI DUNG CÂU HỎI'
                          : 'ĐANG ĐẾM NGƯỢC THỜI GIAN LÀM BÀI'}
                      </div>
                      <div className="text-[11px] text-slate-500 font-medium">
                        {round1State === 'QUESTION_READING'
                          ? 'Thí sinh chú ý lắng nghe trên sân khấu'
                          : 'Thí sinh chọn 01 phương án trên thiết bị di động'}
                      </div>
                    </div>
                  </div>

                  {/* CENTER: Big Prominent Countdown Display (Chính giữa màn hình sân khấu) */}
                  <div className="absolute left-1/2 -translate-x-1/2 top-1/2 -translate-y-1/2 z-20">
                    <div
                      className={`relative transition-all duration-300 flex flex-col items-center justify-center rounded-full select-none ${
                        round1State === 'QUESTION_READING'
                          ? 'w-24 h-24 bg-white border-4 border-slate-300 text-slate-600 shadow-md'
                          : countdown <= 10
                          ? 'w-32 h-32 md:w-36 md:h-36 bg-red-600 border-4 border-yellow-300 text-yellow-300 shadow-2xl shadow-red-600/70 ring-8 ring-red-400/40 scale-110 animate-pulse'
                          : 'w-26 h-26 md:w-30 md:h-30 bg-white border-4 border-emerald-500 text-emerald-600 shadow-xl ring-4 ring-emerald-400/20'
                      }`}
                    >
                      {/* Animated Ping Ring in the final 10 seconds */}
                      {round1State === 'QUESTION_40S' && countdown <= 10 && (
                        <span className="absolute -inset-2 rounded-full border-2 border-red-500 animate-ping opacity-60 pointer-events-none" />
                      )}

                      <div className="flex items-baseline justify-center">
                        <span
                          className={`font-black font-mono tracking-tight leading-none ${
                            round1State === 'QUESTION_READING'
                              ? 'text-4xl text-slate-700'
                              : countdown <= 10
                              ? 'text-5xl md:text-6xl text-yellow-300 drop-shadow-[0_4px_6px_rgba(0,0,0,0.4)]'
                              : 'text-4xl md:text-5xl text-emerald-600'
                          }`}
                        >
                          {round1State === 'QUESTION_READING' ? 40 : countdown}
                        </span>
                        <span
                          className={`text-xs font-bold uppercase ml-0.5 ${
                            countdown <= 10 && round1State === 'QUESTION_40S'
                              ? 'text-white'
                              : 'text-slate-500'
                          }`}
                        >
                          s
                        </span>
                      </div>

                      <div
                        className={`text-[9px] font-black uppercase tracking-wider mt-0.5 ${
                          round1State === 'QUESTION_READING'
                            ? 'text-slate-500'
                            : countdown <= 10
                            ? 'text-white font-extrabold animate-bounce'
                            : 'text-emerald-700'
                        }`}
                      >
                        {round1State === 'QUESTION_READING'
                          ? 'CHỜ LỆNH'
                          : countdown <= 10
                          ? 'KHẨN TRƯƠNG!'
                          : 'GIÂY'}
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

                {/* HIGHLIGHT THÍ SINH ĐẶT NGÔI SAO HY VỌNG Ở CÂU NÀY (Sau 5s NSHV cho MC đọc) */}
                {round1State === 'QUESTION_READING' && (
                  <div className="animate-scaleUp">
                    {hopeStarPlayersThisQuestion.length > 0 ? (
                      <div className="bg-gradient-to-r from-amber-500 via-yellow-400 to-amber-500 text-slate-950 rounded-3xl p-5 shadow-2xl border-4 border-yellow-200 flex flex-col md:flex-row items-center justify-between gap-4">
                        <div className="flex items-center gap-4">
                          <div className="w-16 h-16 rounded-2xl bg-slate-950 text-yellow-400 flex items-center justify-center shrink-0 shadow-lg">
                            <Star className="w-9 h-9 fill-yellow-400 animate-spin" style={{ animationDuration: '6s' }} />
                          </div>
                          <div>
                            <div className="inline-flex items-center gap-1.5 px-3 py-0.5 rounded-full bg-slate-950 text-yellow-300 text-xs font-black uppercase tracking-wider mb-1">
                              ⭐ NGÔI SAO HY VỌNG ĐÃ ĐƯỢC KÍCH HOẠT!
                            </div>
                            <h3 className="text-xl md:text-2xl font-black uppercase text-slate-950 tracking-wide">
                              THÍ SINH ĐẶT CƯỢC NGÔI SAO HY VỌNG CÂU {session?.currentQuestionIndex}
                            </h3>
                            <p className="text-xs md:text-sm font-bold text-slate-900 mt-0.5">
                              Trả lời <span className="text-emerald-950 underline font-black">ĐÚNG: Nhân đôi điểm (+10, +6, +4 điểm tùy thời gian làm bài)</span> • Trả lời <span className="text-rose-950 underline font-black">SAI: Bị trừ 2 điểm (-2đ)</span>
                            </p>
                          </div>
                        </div>
                        <div className="flex flex-wrap items-center gap-3">
                          {hopeStarPlayersThisQuestion.map((p) => {
                            const lastWord = p.fullName.trim().split(' ').slice(-1)[0] || '';
                            const initialChar = lastWord.charAt(0).toUpperCase();
                            return (
                              <div
                                key={p.id}
                                className="bg-slate-950 text-white pl-2 pr-4 py-2 rounded-2xl border-2 border-yellow-300 shadow-2xl flex items-center gap-3 animate-bounce"
                              >
                                {p.avatarUrl ? (
                                  <img
                                    src={p.avatarUrl}
                                    alt={p.fullName}
                                    className="w-11 h-11 rounded-xl object-cover border border-yellow-400 shadow-xs"
                                  />
                                ) : (
                                  <div className="w-11 h-11 rounded-xl bg-gradient-to-br from-blue-700 to-indigo-800 text-yellow-300 font-black text-lg flex items-center justify-center border border-yellow-400/60 shadow-xs">
                                    {initialChar}
                                  </div>
                                )}
                                <div className="text-left">
                                  <div className="flex items-center gap-1.5">
                                    <span className="text-base font-black text-yellow-300 tracking-tight">{p.fullName}</span>
                                  </div>
                                  <div className="text-xs text-slate-300 font-semibold">{p.unit}</div>
                                </div>
                                <Star className="w-6 h-6 text-yellow-400 fill-yellow-400 ml-1 drop-shadow" />
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    ) : (
                      <div className="bg-white/80 border border-slate-200 rounded-2xl px-5 py-2.5 flex items-center justify-between text-xs text-slate-600 shadow-xs">
                        <span className="flex items-center gap-2 font-bold text-slate-700">
                          <Star className="w-4 h-4 text-amber-500 fill-amber-400" /> CÂU HỎI SỐ {session?.currentQuestionIndex} / 10
                        </span>
                        <span className="font-semibold text-slate-500">
                          Không có thí sinh nào đặt Ngôi sao hy vọng ở câu hỏi này
                        </span>
                      </div>
                    )}
                  </div>
                )}

                {/* Chip thông báo trong lúc 40s nếu có thí sinh đặt NSHV */}
                {round1State === 'QUESTION_40S' && hopeStarPlayersThisQuestion.length > 0 && (
                  <div className="bg-amber-500 text-slate-950 px-5 py-2.5 rounded-2xl border-2 border-yellow-200 shadow-lg flex items-center justify-between animate-pulse">
                    <div className="flex items-center gap-2 text-xs md:text-sm font-black uppercase">
                      <Star className="w-5 h-5 fill-slate-950 text-slate-950" />
                      <span>CÂU HỎI CÓ THÍ SINH ĐẶT NGÔI SAO HY VỌNG:</span>
                    </div>
                    <div className="flex items-center gap-2.5 flex-wrap">
                      {hopeStarPlayersThisQuestion.map((p) => {
                        const lastWord = p.fullName.trim().split(' ').slice(-1)[0] || '';
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

                {/* 4 Clean Neutral Option Cards (A, B, C, D) */}
                <div className="grid grid-cols-2 gap-4">
                  {[
                    { key: 'A', text: session?.currentQuestion?.optionA },
                    { key: 'B', text: session?.currentQuestion?.optionB },
                    { key: 'C', text: session?.currentQuestion?.optionC },
                    { key: 'D', text: session?.currentQuestion?.optionD },
                  ].map((opt) => (
                    <div
                      key={opt.key}
                      className="bg-white border-2 border-slate-200 hover:border-blue-400 rounded-2xl p-5 flex items-start gap-4 shadow-lg transition-all"
                    >
                      <div className="w-11 h-11 rounded-xl bg-blue-700 text-yellow-300 font-black text-lg flex items-center justify-center shrink-0 shadow-md">
                        {opt.key}
                      </div>
                      <div className="text-lg font-bold text-slate-800 pt-1.5 leading-snug">
                        {opt.text}
                      </div>
                    </div>
                  ))}
                </div>

                {/* Real-time Submissions Indicator for 10 Contestants */}
                <div className="pt-2 border-t border-slate-200">
                  <div className="text-xs font-bold text-slate-700 uppercase tracking-wider mb-2 flex items-center justify-between">
                    <span>TIẾN ĐỘ TRẢ LỜI CỦA 10 THÍ SINH:</span>
                    <span className="text-blue-700 font-black">{answeredPlayers.size} / 10 ĐÃ NỘP BÀI</span>
                  </div>
                  <div className="grid grid-cols-10 gap-2">
                    {session?.players?.map((p) => {
                      const answered = answeredPlayers.has(p.id);
                      const isHopeStar = (p.hopeStarUsed && p.hopeStarQuestionIndex === session?.currentQuestionIndex) || hopeStarPlayers.has(p.id);

                      return (
                        <div
                          key={p.id}
                          className={`p-2 rounded-xl border-2 text-center transition-all shadow-sm relative overflow-hidden ${
                            isHopeStar
                              ? answered
                                ? 'bg-gradient-to-b from-amber-400 to-emerald-600 border-yellow-300 text-white font-black scale-105 shadow-amber-500/40 ring-4 ring-amber-300/60'
                                : 'bg-gradient-to-b from-amber-50 to-yellow-100 border-amber-400 text-amber-950 font-black scale-105 shadow-amber-500/30 ring-4 ring-amber-300/50 animate-pulse'
                              : answered
                              ? 'bg-emerald-500 border-emerald-400 text-white font-black scale-105 shadow-emerald-500/30'
                              : 'bg-white border-slate-200 text-slate-700 font-bold'
                          }`}
                        >
                          {/* Floating Star Badge for Hope Star Contestant */}
                          {isHopeStar && (
                            <div className="absolute top-1 right-1 bg-amber-400 text-slate-950 rounded-full p-0.5 shadow-sm">
                              <Star className="w-2.5 h-2.5 fill-slate-950" />
                            </div>
                          )}

                          <div className="flex items-center justify-center gap-1">
                            <span className="text-xs font-black">SBD {String(p.orderNumber).padStart(2, '0')}</span>
                            {isHopeStar && <Star className="w-3 h-3 text-amber-500 fill-amber-400 inline" />}
                          </div>
                          <div className="text-[11px] truncate mt-0.5">{p.fullName.split(' ').pop()}</div>
                          {answered ? (
                            <CheckCircle2 className="w-4 h-4 text-white mx-auto mt-1" />
                          ) : isHopeStar ? (
                            <div className="text-[9px] font-black uppercase text-amber-900 bg-amber-200/90 rounded px-1.5 py-0.2 mt-1 inline-block">
                              ⭐ NSHV
                            </div>
                          ) : (
                            <div className="w-2.5 h-2.5 rounded-full bg-slate-300 mx-auto mt-1.5" />
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>
            )}

            {/* Phase 5: Answer Revealed + Choice Distribution Chart (Ghi rõ nội dung đáp án + Thanh biểu đồ kịch tính) */}
            {round1State === 'ANSWER_REVEALED' && (
              <div className="space-y-5 animate-fadeIn">
                {/* Top: Grand Answer Banner (Full Width, TV Show Aesthetics) */}
                <div className="bg-gradient-to-r from-emerald-600 via-teal-600 to-emerald-700 text-white rounded-3xl p-6 lg:p-7 shadow-2xl border-2 border-emerald-400/40 flex flex-col md:flex-row items-start md:items-center justify-between gap-5">
                  <div className="min-w-0 pr-6 flex-1">
                    <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-900/50 border border-emerald-400/40 text-xs font-black uppercase tracking-wider text-emerald-100 mb-2">
                      <CheckCircle2 className="w-4 h-4 text-emerald-300" />
                      ĐÁP ÁN ĐÚNG
                    </div>
                    <div className="text-2xl sm:text-3xl lg:text-4xl font-black text-white flex items-center gap-4 tracking-wide">
                      <span className="w-14 h-14 rounded-2xl bg-white text-emerald-700 flex items-center justify-center shadow-xl text-3xl font-black shrink-0 ring-4 ring-emerald-300/30">
                        {currentRevealed?.correctOption}
                      </span>
                      <span className="drop-shadow-sm font-extrabold line-clamp-2">
                        {currentRevealed?.correctOption === 'A' && session?.currentQuestion?.optionA}
                        {currentRevealed?.correctOption === 'B' && session?.currentQuestion?.optionB}
                        {currentRevealed?.correctOption === 'C' && session?.currentQuestion?.optionC}
                        {currentRevealed?.correctOption === 'D' && session?.currentQuestion?.optionD}
                      </span>
                    </div>
                    {currentRevealed?.explanation && (
                      <div className="mt-3.5 bg-emerald-950/35 border border-emerald-400/30 rounded-2xl p-4 backdrop-blur-xs">
                        <div className="text-xs font-black uppercase tracking-wider text-emerald-200 mb-1">
                          THÔNG TIN BỔ SUNG:
                        </div>
                        <p className="text-sm lg:text-base text-emerald-50 font-medium leading-relaxed">
                          {currentRevealed.explanation}
                        </p>
                      </div>
                    )}
                  </div>

                  {/* Summary badge */}
                  <div className="bg-white/15 backdrop-blur-md border border-white/25 rounded-2xl px-6 py-4 text-center min-w-[190px] shadow-inner text-white shrink-0 self-center">
                    <div className="text-4xl lg:text-5xl font-black tracking-tight text-amber-300 drop-shadow-sm">
                      {choiceStats.countCorrect} / {choiceStats.total}
                    </div>
                    <div className="text-xs font-bold uppercase tracking-wider text-emerald-100 mt-1">
                      Thí sinh trả lời đúng
                    </div>
                    <div className="text-[11px] font-semibold text-emerald-200 mt-0.5">
                      (Tỷ lệ: {choiceStats.percentCorrect}%)
                    </div>
                  </div>
                </div>

                {/* BIỂU ĐỒ PHÂN BỐ LỰA CHỌN CỦA 10 THÍ SINH (Thanh ngang trực quan ngay trên từng đáp án) */}
                <div className="bg-white border-2 border-slate-200 rounded-3xl p-6 lg:p-7 shadow-2xl">
                  {/* Header của biểu đồ */}
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-200 pb-4 mb-5">
                    <div className="flex items-center gap-3">
                      <div className="w-11 h-11 rounded-2xl bg-gradient-to-tr from-blue-600 to-indigo-600 text-white flex items-center justify-center shadow-md shadow-blue-500/20 shrink-0">
                        <BarChart3 className="w-6 h-6" />
                      </div>
                      <div>
                        <h3 className="text-xl lg:text-2xl font-black text-slate-900 tracking-tight">
                          BIỂU ĐỒ PHÂN BỐ LỰA CHỌN CỦA {session?.players?.length ? `${session.players.length} THÍ SINH` : 'THÍ SINH'}
                        </h3>
                        <p className="text-xs text-slate-500 mt-0.5">
                          Tỷ lệ và số lượng thí sinh chọn các phương án trong câu hỏi số {session?.currentQuestionIndex}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-3 self-start sm:self-center">
                      <div className="px-4 py-2 rounded-2xl bg-slate-100 border border-slate-200 text-slate-700 text-xs font-bold flex items-center gap-2 shadow-xs">
                        <Users className="w-4 h-4 text-blue-600" />
                        <span>Đã nộp bài: <strong className="text-blue-700 font-black text-sm">{choiceStats.total} / {session?.players?.length || 10}</strong></span>
                      </div>
                      <div className="px-4 py-2 rounded-2xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-bold flex items-center gap-2 shadow-xs">
                        <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                        <span>Đúng: <strong className="text-emerald-700 font-black text-sm">{choiceStats.countCorrect} / {choiceStats.total}</strong> ({choiceStats.percentCorrect}%)</span>
                      </div>
                    </div>
                  </div>

                  {/* 4 PHƯƠNG ÁN A, B, C, D KÈM BIỂU ĐỒ THANH PHÂN BỐ NGANG RÕ RÀNG */}
                  <div className="space-y-4">
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
                          className={`p-4 lg:p-5 rounded-2xl border-2 transition-all relative overflow-hidden ${
                            isCorrect
                              ? 'bg-emerald-50/95 border-emerald-500 shadow-lg shadow-emerald-500/10 ring-4 ring-emerald-400/20'
                              : 'bg-slate-50/80 border-slate-200 shadow-xs'
                          }`}
                        >
                          {/* Background percentage fill bar */}
                          <div
                            className={`absolute top-0 bottom-0 left-0 transition-all duration-1000 ease-out pointer-events-none opacity-25 ${
                              isCorrect ? 'bg-emerald-400' : 'bg-slate-300'
                            }`}
                            style={{ width: `${Math.max(opt.percent, 0)}%` }}
                          />

                          <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-4">
                            {/* Left: Key Badge + Full Text of Option */}
                            <div className="flex items-center gap-4 min-w-0 flex-1">
                              <span
                                className={`w-12 h-12 rounded-2xl flex items-center justify-center font-black text-2xl shrink-0 shadow-md ${
                                  isCorrect
                                    ? 'bg-emerald-600 text-white ring-2 ring-emerald-300'
                                    : `${opt.badgeBg} text-white`
                                }`}
                              >
                                {opt.key}
                              </span>

                              <div className="min-w-0 flex-1">
                                <div className="flex items-center gap-2.5 flex-wrap">
                                  <span className={`text-base lg:text-lg font-bold leading-snug ${
                                    isCorrect ? 'text-emerald-950 font-black' : 'text-slate-900'
                                  }`}>
                                    {opt.text || `Phương án ${opt.key}`}
                                  </span>
                                  {isCorrect && (
                                    <span className="inline-flex items-center gap-1.5 text-[11px] font-black uppercase tracking-wider text-emerald-900 bg-emerald-200 px-3 py-1 rounded-full border border-emerald-400 shrink-0 shadow-xs">
                                      <CheckCircle2 className="w-3.5 h-3.5 text-emerald-700" /> ĐÁP ÁN ĐÚNG
                                    </span>
                                  )}
                                </div>
                              </div>
                            </div>

                            {/* Right: Bar + Count & Percentage Badge */}
                            <div className="flex items-center gap-4 shrink-0 md:min-w-[300px] justify-between md:justify-end">
                              {/* Horizontal Progress Bar */}
                              <div className="w-40 lg:w-56 h-5 bg-slate-200/90 rounded-full overflow-hidden shrink-0 hidden sm:block p-0.5 border border-slate-300/60 shadow-inner">
                                <div
                                  className={`h-full rounded-full transition-all duration-1000 ease-out ${
                                    isCorrect
                                      ? 'bg-gradient-to-r from-emerald-500 to-teal-500 shadow-sm'
                                      : `bg-gradient-to-r ${opt.color}`
                                  }`}
                                  style={{ width: `${Math.max(opt.percent, 0)}%` }}
                                />
                              </div>

                              {/* Numbers */}
                              <div className="text-right min-w-[120px]">
                                <div className={`text-xl lg:text-2xl font-black font-mono leading-none ${
                                  isCorrect ? 'text-emerald-700' : 'text-slate-800'
                                }`}>
                                  {opt.count} <span className="text-xs font-semibold text-slate-500">thí sinh</span>
                                </div>
                                <div className={`text-xs font-extrabold mt-1 ${
                                  isCorrect ? 'text-emerald-600' : 'text-slate-500'
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

                  {/* CHI TIẾT KẾT QUẢ CÂU VỪA THI CỦA 10 THÍ SINH (Hiển thị ngay trong màn hình công bố đáp án & biểu đồ) */}
                  <div className="mt-6 pt-5 border-t border-slate-200">
                    <div className="text-xs lg:text-sm font-black text-slate-800 uppercase tracking-wider mb-3 flex items-center justify-between">
                      <span className="flex items-center gap-2">
                        <Users className="w-4 h-4 text-blue-600" /> KẾT QUẢ CỦA {session?.players?.length ? `${session.players.length} THÍ SINH` : 'THÍ SINH'} CÂU SỐ {session?.currentQuestionIndex}:
                      </span>
                      <span className="text-xs font-bold text-slate-500">
                        Đúng: <strong className="text-emerald-700 font-black">{choiceStats.countCorrect}</strong> • Sai: <strong className="text-rose-600 font-black">{choiceStats.countIncorrect}</strong>
                      </span>
                    </div>

                    {/* 10 Thẻ thí sinh (Grid 2 cột x 5 hàng = 10 thẻ cân đối, thông tin đầy đủ) */}
                    <div className="grid grid-cols-2 gap-2.5">
                      {session?.players?.map((p) => {
                        const ans = currentRevealed?.answers?.find((a: any) => a.playerId === p.id);
                        const isCorrect = Boolean(ans?.isCorrect);
                        const hasHopeStar = Boolean(ans?.hasHopeStar);
                        const optInfo = getOptionDisplay(ans?.selectedOption, session?.currentQuestion);

                        return (
                          <div
                            key={p.id}
                            className={`p-3 rounded-2xl border-2 flex items-center justify-between transition-all shadow-xs ${
                              ans
                                ? isCorrect
                                  ? 'bg-emerald-50/90 border-emerald-400 text-slate-900 shadow-emerald-500/5'
                                  : 'bg-rose-50/80 border-rose-300 text-slate-900 shadow-rose-500/5'
                                : 'bg-slate-50 border-slate-200 text-slate-500'
                            }`}
                          >
                            <div className="min-w-0 pr-1 flex-1">
                              <div className="flex items-center gap-2">
                                <span className={`px-2 py-0.5 rounded font-black text-xs shrink-0 text-white ${
                                  ans ? (isCorrect ? 'bg-emerald-600' : 'bg-slate-700') : 'bg-slate-400'
                                }`}>
                                  SBD {String(p.orderNumber).padStart(2, '0')}
                                </span>
                                <span className="text-xs lg:text-sm font-black text-slate-900 truncate">
                                  {p.fullName}
                                </span>
                                {hasHopeStar && (
                                  <span className="flex items-center gap-0.5 text-[10px] font-black bg-amber-400 text-slate-950 px-2 py-0.5 rounded-full shrink-0 shadow-xs animate-pulse">
                                    <Star className="w-2.5 h-2.5 fill-slate-950" /> NSHV
                                  </span>
                                )}
                              </div>
                              <div className="text-xs text-slate-600 flex items-center gap-1.5 mt-1 truncate">
                                <span>Chọn:</span>
                                {optInfo.key ? (
                                  <span className="inline-flex items-center gap-1.5 truncate">
                                    <span
                                      className={`w-5 h-5 rounded text-xs font-black inline-flex items-center justify-center shrink-0 font-mono ${
                                        isCorrect ? 'bg-emerald-200 text-emerald-950 font-bold' : 'bg-rose-200 text-rose-950 font-bold'
                                      }`}
                                    >
                                      {optInfo.key}
                                    </span>
                                    <span className="truncate max-w-[150px] text-slate-800 font-bold">
                                      {optInfo.text}
                                    </span>
                                  </span>
                                ) : (
                                  <span className="text-slate-400 italic">Chưa chọn</span>
                                )}
                              </div>
                            </div>

                            <div className="text-right shrink-0 ml-2">
                              <div className="flex items-center justify-end gap-1">
                                {ans ? (
                                  isCorrect ? (
                                    <span className="text-xs lg:text-sm font-black text-emerald-700 flex items-center gap-0.5 bg-emerald-100/90 px-2 py-0.5 rounded-lg border border-emerald-300">
                                      <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                                      +{ans?.scoreAwarded ?? 0}đ
                                    </span>
                                  ) : (
                                    <span className="text-xs lg:text-sm font-black text-rose-600 flex items-center gap-0.5 bg-rose-100/90 px-2 py-0.5 rounded-lg border border-rose-200">
                                      <XCircle className="w-3.5 h-3.5 text-rose-500" />
                                      {ans?.scoreAwarded ?? 0}đ
                                    </span>
                                  )
                                ) : (
                                  <span className="text-xs text-slate-400">0đ</span>
                                )}
                              </div>
                              <div className="text-xs text-slate-400 font-mono font-bold mt-1">
                                {ans?.responseTimeMs ? `${(ans.responseTimeMs / 1000).toFixed(1)}s` : '—'}
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>

                  {/* Stage notice */}
                  <div className="mt-6 pt-3.5 border-t border-slate-200 flex items-center justify-between text-xs text-slate-500">
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

                              {/* SBD */}
                              <span
                                className={`font-mono font-black text-xs px-2 py-1 rounded-lg shrink-0 ${
                                  rank === 1
                                    ? 'text-amber-950 bg-amber-200/90 border border-amber-400 shadow-2xs'
                                    : rank === 2
                                    ? 'text-sky-950 bg-sky-100/90 border border-sky-300/80 shadow-2xs'
                                    : rank === 3
                                    ? 'text-amber-950 bg-orange-100/90 border border-orange-300 shadow-2xs'
                                    : 'text-amber-900 bg-amber-100/90 px-2 py-1 border border-amber-300/70'
                                }`}
                              >
                                SBD {String(p.orderNumber).padStart(2, '0')}
                              </span>

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
                                  {p.totalScore ?? p.round1Score}đ
                                </span>
                              ) : rank === 2 ? (
                                <span className="text-xl lg:text-2xl font-black text-sky-950 bg-gradient-to-r from-sky-100 to-blue-100 px-4 py-1.5 rounded-xl border-2 border-sky-300 font-mono min-w-[76px] text-center shadow-sm ring-1 ring-sky-200">
                                  {p.totalScore ?? p.round1Score}đ
                                </span>
                              ) : rank === 3 ? (
                                <span className="text-xl lg:text-2xl font-black text-amber-950 bg-gradient-to-r from-amber-100 to-orange-100 px-4 py-1.5 rounded-xl border-2 border-amber-400/80 font-mono min-w-[76px] text-center shadow-sm ring-1 ring-amber-200">
                                  {p.totalScore ?? p.round1Score}đ
                                </span>
                              ) : (
                                <span className="text-xl lg:text-2xl font-black text-amber-700 bg-amber-100/90 px-4 py-1 rounded-xl border border-amber-300/80 font-mono min-w-[70px] text-center shadow-xs">
                                  {p.totalScore ?? p.round1Score}đ
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

        {/* 3. ROUND 2 VIEW: Nhạy bén (10 phút) */}
        {!isFinalView && session?.status === 'ROUND2' && (
          <div className="space-y-6 animate-fadeIn">
            <div className="text-center">
              <div className="inline-flex items-center gap-2 px-4 py-1 rounded-full bg-amber-100 border border-amber-300 text-amber-800 text-xs font-bold uppercase tracking-wider mb-1 shadow-xs">
                <Zap className="w-3.5 h-3.5 text-amber-600" /> THAO TÁC TRÊN PHẦN MỀM QUẢN LÝ ĐOÀN VIÊN
              </div>
              <h2 className="text-3xl font-black text-slate-900 uppercase">VÒNG 2: NHẠY BÉN (10 PHÚT)</h2>
            </div>

            <div className="grid grid-cols-3 gap-6 max-w-6xl mx-auto">
              {/* Contestant Card */}
              <div className="bg-white border-2 border-amber-400 rounded-3xl p-6 flex flex-col justify-between shadow-xl">
                <div>
                  <div className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-3">
                    THÍ SINH THỰC HIỆN BÀI THI:
                  </div>
                  <div className="w-24 h-24 rounded-2xl bg-slate-100 border-2 border-amber-400 flex items-center justify-center text-3xl font-black text-blue-700 mx-auto mb-4 overflow-hidden shadow-md">
                    {activePlayerRound2?.avatarUrl ? (
                      <img src={activePlayerRound2.avatarUrl} alt="" className="w-full h-full object-cover" />
                    ) : (
                      activePlayerRound2?.fullName?.charAt(0) || '?'
                    )}
                  </div>
                  <div className="text-center">
                    <h3 className="text-xl font-black text-slate-900">{activePlayerRound2?.fullName || 'Đang chọn thí sinh'}</h3>
                    <p className="text-xs font-semibold text-slate-600 mt-1">{activePlayerRound2?.unit}</p>
                  </div>
                </div>

                <div className="mt-6 pt-4 border-t border-slate-200 text-center">
                  <div className="text-xs text-slate-500 font-semibold">Mã đề bốc thăm:</div>
                  <div className="text-2xl font-black text-blue-700 mt-1">
                    {selectedTopic?.code || activePlayerRound2?.round2DrawCode || 'Chưa bốc thăm'}
                  </div>
                </div>
              </div>

              {/* Scenarios Content */}
              <div className="col-span-2 space-y-4">
                {/* 10:00 Timer Header */}
                <div className="bg-white border-2 border-amber-400 rounded-2xl p-4 flex items-center justify-between shadow-md">
                  <div className="flex items-center gap-3">
                    <Timer className="w-6 h-6 text-amber-500" />
                    <span className="text-sm font-bold text-slate-800">Thời gian làm bài 10 phút:</span>
                  </div>
                  <div className="text-2xl font-black text-amber-600 font-mono">
                    {String(Math.floor(round2Timer / 60)).padStart(2, '0')}:
                    {String(round2Timer % 60).padStart(2, '0')}
                  </div>
                </div>

                {!isTopicQuestionRevealed ? (
                  <div className="bg-white border-2 border-amber-300 rounded-3xl p-8 text-center space-y-4 shadow-xl">
                    <div className="w-16 h-16 rounded-2xl bg-amber-50 border-2 border-amber-400 flex items-center justify-center mx-auto text-amber-600 shadow-md">
                      <Zap className="w-8 h-8 animate-pulse" />
                    </div>
                    <div>
                      <div className="text-xs font-black text-amber-600 uppercase tracking-widest mb-1">
                        KẾT QUẢ BỐC THĂM ĐỀ THI
                      </div>
                      <h4 className="text-2xl font-black text-slate-900 uppercase">
                        THÍ SINH: <span className="text-blue-700">{activePlayerRound2?.fullName || 'CHƯA CHỌN'}</span> - {selectedTopic?.code || activePlayerRound2?.round2DrawCode || 'CHƯA BỐC ĐỀ'}
                      </h4>
                      <p className="text-xs text-slate-600 mt-3 max-w-lg mx-auto leading-relaxed">
                        Thí sinh chuẩn bị đăng nhập phần mềm Quản lý đoàn viên trên máy tính dự thi. Ban Tổ chức sẽ kích hoạt hiển thị 02 tình huống chi tiết khi phát lệnh bắt đầu 10 phút làm bài.
                      </p>
                    </div>
                  </div>
                ) : (
                  <>
                    {/* Scenario 1 */}
                    <div className="bg-white border-2 border-slate-200 rounded-2xl p-5 shadow-md animate-fadeIn">
                      <div className="text-xs font-black text-blue-700 uppercase tracking-wider mb-2 flex items-center justify-between">
                        <span>TÌNH HUỐNG 01</span>
                        <span className="text-amber-600 font-black">Tối đa {selectedTopic?.maxScore1 || 20} điểm</span>
                      </div>
                      <p className="text-sm text-slate-800 leading-relaxed whitespace-pre-line font-medium">
                        {selectedTopic?.scenario1 || 'Nội dung tình huống 1...'}
                      </p>
                    </div>

                    {/* Scenario 2 */}
                    <div className="bg-white border-2 border-slate-200 rounded-2xl p-5 shadow-md animate-fadeIn">
                      <div className="text-xs font-black text-blue-700 uppercase tracking-wider mb-2 flex items-center justify-between">
                        <span>TÌNH HUỐNG 02</span>
                        <span className="text-amber-600 font-black">Tối đa {selectedTopic?.maxScore2 || 20} điểm</span>
                      </div>
                      <p className="text-sm text-slate-800 leading-relaxed whitespace-pre-line font-medium">
                        {selectedTopic?.scenario2 || 'Nội dung tình huống 2...'}
                      </p>
                    </div>
                  </>
                )}
              </div>
            </div>
          </div>
        )}

        {/* 4. ROUND 3 VIEW: Bản lĩnh (Live Random Pairing Roulette & Debate) */}
        {!isFinalView && session?.status === 'ROUND3' && (
          <div className="space-y-6 animate-fadeIn">
            <div className="text-center">
              <div className="inline-flex items-center gap-2 px-4 py-1 rounded-full bg-blue-100 border border-blue-300 text-blue-800 text-xs font-bold uppercase tracking-wider mb-1 shadow-xs">
                <Users className="w-3.5 h-3.5 text-blue-600" /> BỐC THĂM GHÉP CẶP NGẪU NHIÊN TRỰC TIẾP
              </div>
              <h2 className="text-3xl font-black text-slate-900 uppercase">VÒNG 3: BẢN LĨNH (TRANH BIỆN ĐỐI KHÁNG)</h2>
            </div>

            {/* Shuffling animation vs Final Pairs */}
            {isShufflingPairs ? (
              <div className="py-16 text-center animate-pulse">
                <div className="w-24 h-24 rounded-full bg-blue-50 border-4 border-amber-400 flex items-center justify-center mx-auto mb-4 animate-spin shadow-lg">
                  <Users className="w-12 h-12 text-blue-600" />
                </div>
                <h3 className="text-2xl font-black text-amber-600">ĐANG XÁO THẺ & GHÉP CẶP NGẪU NHIÊN...</h3>
                <p className="text-sm text-slate-600 mt-2">Hội trường cùng chứng kiến kết quả bốc thăm trực tiếp trên sân khấu</p>
              </div>
            ) : (
              <div className="grid grid-cols-5 gap-4">
                {round3Pairs.length > 0 ? (
                  round3Pairs.map((pair) => (
                    <div
                      key={pair.pairNumber}
                      className="bg-white border-2 border-blue-200 rounded-2xl p-4 flex flex-col justify-between shadow-xl"
                    >
                      <div className="text-center pb-2 border-b border-slate-100">
                        <span className="px-3 py-1 rounded-full bg-blue-100 border border-blue-300 text-blue-800 font-black text-xs">
                          CẶP {pair.pairNumber}
                        </span>
                      </div>

                      {/* Player 1 */}
                      <div className="py-3 text-center">
                        <div className="w-14 h-14 rounded-xl bg-blue-50 border-2 border-blue-500 mx-auto flex items-center justify-center font-black text-blue-700 mb-1.5 text-base shadow">
                          {pair.player1?.orderNumber ? String(pair.player1.orderNumber).padStart(2, '0') : '01'}
                        </div>
                        <div className="text-xs font-bold text-slate-900 line-clamp-1">{pair.player1?.fullName}</div>
                        <div className="text-[10px] text-slate-500 line-clamp-1 mt-0.5">{pair.player1?.unit}</div>
                      </div>

                      <div className="text-center font-black text-red-600 text-xs italic">VS</div>

                      {/* Player 2 */}
                      <div className="py-3 text-center">
                        <div className="w-14 h-14 rounded-xl bg-red-50 border-2 border-red-500 mx-auto flex items-center justify-center font-black text-red-700 mb-1.5 text-base shadow">
                          {pair.player2?.orderNumber ? String(pair.player2.orderNumber).padStart(2, '0') : '02'}
                        </div>
                        <div className="text-xs font-bold text-slate-900 line-clamp-1">{pair.player2?.fullName}</div>
                        <div className="text-[10px] text-slate-500 line-clamp-1 mt-0.5">{pair.player2?.unit}</div>
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="col-span-5 text-center py-12 text-slate-500">
                    Chờ Ban Tổ chức nhấn nút kích hoạt bốc thăm ghép cặp ngẫu nhiên...
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
                      ? 'Vinh danh: 01 Quán quân • 03 Giải Nhì • 06 Giải Ba'
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

                            {/* SBD */}
                            <span
                              className={`font-mono font-black text-xs px-2 py-1 rounded-lg shrink-0 ${
                                rank === 1
                                  ? 'text-amber-950 bg-amber-200/90 border border-amber-400 shadow-2xs'
                                  : rank === 2
                                  ? 'text-sky-950 bg-sky-100/90 border border-sky-300/80 shadow-2xs'
                                  : rank === 3
                                  ? 'text-amber-950 bg-orange-100/90 border border-orange-300 shadow-2xs'
                                  : 'text-amber-900 bg-amber-100/90 px-2 py-1 border border-amber-300/70'
                              }`}
                            >
                              SBD {String(p.orderNumber).padStart(2, '0')}
                            </span>

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
                                {rank === 4 && (
                                  <span className="inline-flex items-center px-2 py-0.5 rounded-full bg-blue-50 text-blue-800 border border-blue-200 text-[10px] font-bold uppercase tracking-wider shrink-0">
                                    GIẢI NHÌ
                                  </span>
                                )}
                                {rank >= 5 && (
                                  <span className="inline-flex items-center px-2 py-0.5 rounded-full bg-slate-100 text-slate-600 border border-slate-200 text-[10px] font-medium uppercase tracking-wider shrink-0">
                                    GIẢI BA
                                  </span>
                                )}
                              </div>
                              <div className="text-xs text-slate-600 font-medium truncate mt-0.5">
                                {p.unit}
                              </div>
                            </div>
                          </div>

                          {/* Cột giữa: 3 Hộp điểm 3 Vòng thi riêng biệt rõ ràng */}
                          <div className="flex items-center gap-2 lg:gap-3 shrink-0 px-3 py-1 bg-slate-50/90 rounded-2xl border border-slate-200/90 shadow-inner">
                            {/* Vòng 1: Thông thái */}
                            <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-xl bg-blue-50 border border-blue-200">
                              <span className="text-[10px] font-bold text-blue-800 uppercase tracking-wider">V1</span>
                              <span className="font-mono font-black text-xs lg:text-sm text-blue-900">
                                {p.round1Score ?? 0}đ
                              </span>
                            </div>

                            {/* Vòng 2: Nhạy bén */}
                            <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-xl bg-emerald-50 border border-emerald-200">
                              <span className="text-[10px] font-bold text-emerald-800 uppercase tracking-wider">V2</span>
                              <span className="font-mono font-black text-xs lg:text-sm text-emerald-900">
                                {p.round2Score ?? 0}đ
                              </span>
                            </div>

                            {/* Vòng 3: Bản lĩnh */}
                            <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-xl bg-purple-50 border border-purple-200">
                              <span className="text-[10px] font-bold text-purple-800 uppercase tracking-wider">V3</span>
                              <span className="font-mono font-black text-xs lg:text-sm text-purple-900">
                                {p.round3Score ?? 0}đ
                              </span>
                            </div>
                          </div>

                          {/* Cột phải: Tổng điểm chung cuộc to nổi bật cho màn hình LED hội trường */}
                          <div className="flex items-center gap-2 shrink-0 justify-end min-w-[125px]">
                            {rank === 1 ? (
                              <span className="text-2xl lg:text-3xl font-black text-slate-950 bg-gradient-to-r from-amber-400 via-yellow-300 to-amber-400 px-4 py-1.5 rounded-2xl border-2 border-amber-500 font-mono min-w-[84px] text-center shadow-md ring-2 ring-yellow-200">
                                {p.totalScore}đ
                              </span>
                            ) : rank === 2 ? (
                              <span className="text-xl lg:text-2xl font-black text-sky-950 bg-gradient-to-r from-sky-100 to-blue-100 px-4 py-1.5 rounded-xl border-2 border-sky-300 font-mono min-w-[76px] text-center shadow-sm ring-1 ring-sky-200">
                                {p.totalScore}đ
                              </span>
                            ) : rank === 3 ? (
                              <span className="text-xl lg:text-2xl font-black text-amber-950 bg-gradient-to-r from-amber-100 to-orange-100 px-4 py-1.5 rounded-xl border-2 border-amber-400/80 font-mono min-w-[76px] text-center shadow-sm ring-1 ring-amber-200">
                                {p.totalScore}đ
                              </span>
                            ) : (
                              <span className="text-xl lg:text-2xl font-black text-amber-700 bg-amber-100/90 px-4 py-1 rounded-xl border border-amber-300/80 font-mono min-w-[70px] text-center shadow-xs">
                                {p.totalScore}đ
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
                      <div className="text-sm font-black text-sky-950 uppercase tracking-wider mb-3">
                        03 GIẢI NHÌ • Á QUÂN
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
                                  <div className="font-black text-sky-950 text-base font-mono">{w.player.totalScore}đ</div>
                                  <div className="text-[9px] text-slate-500 font-mono mt-0.5">
                                    V1:{w.player.round1Score} • V2:{w.player.round2Score} • V3:{w.player.round3Score}
                                  </div>
                                </div>
                              </div>
                            );
                          })}
                      </div>
                    </div>

                    <div className="mt-4 pt-3 border-t border-sky-200 text-center">
                      <span className="text-[11px] font-black text-sky-800 uppercase tracking-wider">
                        BẬC THỀM HẠNG 2 • BẠC
                      </span>
                    </div>
                  </div>

                  {/* GIẢI NHẤT QUÁN QUÂN: Cột 2 (Chính giữa, cao nhất, nổi bật nhất) */}
                  <div className="bg-gradient-to-b from-white via-amber-50/50 to-yellow-50/70 border-4 border-amber-400 rounded-3xl p-6 text-center shadow-2xl shadow-amber-500/25 ring-8 ring-amber-400/20 flex flex-col justify-between min-h-[550px] relative overflow-hidden scale-100 lg:scale-105 z-10 order-1 lg:order-2">
                    <div className="absolute top-0 inset-x-0 h-2 bg-gradient-to-r from-amber-400 via-yellow-300 to-amber-400" />
                    <div className="absolute top-0 right-0 w-44 h-44 bg-yellow-300/20 rounded-full blur-3xl pointer-events-none" />

                    <div>
                      <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-amber-400 via-yellow-300 to-amber-500 text-slate-950 font-black text-4xl flex items-center justify-center mx-auto mb-2 shadow-lg shadow-amber-500/30 ring-4 ring-yellow-200 animate-bounce">
                        👑
                      </div>
                      
                      <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-amber-400 text-slate-950 text-xs font-black uppercase tracking-wider mb-4 shadow-xs">
                        <Trophy className="w-4 h-4 fill-slate-950" />
                        QUÁN QUÂN • GIẢI NHẤT
                      </div>

                      {(() => {
                        const first = winners.length > 0
                          ? winners.find((w) => w.rank === 1)?.player
                          : sortedLeaderboard[0];
                        if (!first) return null;

                        const lastWord = first.fullName.trim().split(' ').slice(-1)[0] || '';
                        const initialChar = lastWord.charAt(0).toUpperCase();

                        return (
                          <div className="space-y-2">
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

                            <h3 className="text-2xl sm:text-3xl font-black text-slate-950 tracking-tight pt-2">
                              {first.fullName}
                            </h3>
                            <p className="text-xs sm:text-sm font-bold text-slate-600">{first.unit}</p>

                            <div className="pt-2">
                              <div className="text-4xl sm:text-5xl font-black text-amber-600 drop-shadow-xs font-mono">
                                {first.totalScore} <span className="text-2xl font-extrabold">ĐIỂM</span>
                              </div>
                              <div className="mt-2 text-xs text-amber-900 bg-amber-100/90 py-1.5 px-4 rounded-xl border border-amber-300 inline-block font-mono font-bold shadow-2xs">
                                V1: {first.round1Score}đ • V2: {first.round2Score}đ • V3: {first.round3Score}đ
                              </div>
                            </div>
                          </div>
                        );
                      })()}
                    </div>

                    <div className="mt-4 pt-3 border-t border-amber-200/80 text-center">
                      <span className="text-xs font-black text-amber-700 uppercase tracking-widest">
                        ⭐ ĐỈNH BỤC VINH QUANG 2026 ⭐
                      </span>
                    </div>
                  </div>

                  {/* GIẢI BA: Cột 3 (Bên phải, hiển thị 2 cột nhỏ cho 6 người) */}
                  <div className="bg-gradient-to-b from-white via-amber-50/30 to-orange-50/40 border-2 border-amber-600/40 rounded-3xl p-5 text-center shadow-xl flex flex-col justify-between min-h-[500px] relative overflow-hidden order-3">
                    <div className="absolute top-0 inset-x-0 h-2 bg-gradient-to-r from-amber-600 via-orange-500 to-amber-700" />

                    <div>
                      <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-amber-100 via-orange-50 to-amber-200 border-2 border-amber-400 ring-4 ring-amber-200 text-3xl flex items-center justify-center mx-auto mb-2 shadow-sm">
                        🥉
                      </div>
                      <div className="text-sm font-black text-amber-950 uppercase tracking-wider mb-3">
                        06 GIẢI BA • ĐỒNG
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
                                    {w.player.totalScore}đ
                                  </div>
                                </div>
                              </div>
                            );
                          })}
                      </div>
                    </div>

                    <div className="mt-4 pt-3 border-t border-amber-200/60 text-center">
                      <span className="text-[11px] font-black text-amber-800 uppercase tracking-wider">
                        BẬC THỀM HẠNG 3 • ĐỒNG
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}
      </main>

      {/* BOTTOM FOOTER BAR */}
      <footer className="relative z-10 px-8 py-3 border-t border-slate-200 bg-white/95 backdrop-blur-md flex items-center justify-between text-xs text-slate-600 shadow-xs">
        <div className="flex items-center gap-3">
          <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse" />
          <span>Hệ thống chấm điểm & điều hành sân khấu trực tiếp thời gian thực</span>
        </div>
        <div className="font-semibold text-slate-500">
          BAN THƯỜNG VỤ TỈNH ĐOÀN NGHỆ AN
        </div>
      </footer>
    </div>
  );
}
