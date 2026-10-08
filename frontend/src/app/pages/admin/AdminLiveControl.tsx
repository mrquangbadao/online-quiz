import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  Trophy,
  Star,
  Timer,
  Play,
  CheckCircle2,
  XCircle,
  Award,
  Zap,
  Users,
  Radio,
  ExternalLink,
  RefreshCw,
  Eye,
  Shuffle,
  Save,
  ChevronRight,
  ChevronLeft,
  Shield,
  Volume2,
  Search,
  UserPlus,
  Edit2,
  Trash2,
  X,
  RotateCcw,
  KeyRound,
  Siren,
  BarChart3,
  Lock,
  Unlock,
  Crown,
  Swords,
  BookOpen,
  Pause,
  StopCircle,
} from 'lucide-react';
import AdminSidebar from './AdminSidebar';
import { toast } from '../../components/ui/Toast';
import { AlertTriangle } from 'lucide-react';
import { liveSound } from '../../../utils/liveSound';
import { adminLiveApi } from '../../../api/admin/adminLiveApi';
import { liveApi } from '../../../api/liveApi';
import { useLiveSocket } from '../../../hooks/useLiveSocket';
import {
  LiveEventMessage,
  LivePlayerDto,
  LiveRound2Topic,
  LiveRound3Pair,
  LiveRound3DisplayPair,
  LiveSessionDto,
} from '../../../types/live';
import ResetLiveContestModal from '../../components/admin/ResetLiveContestModal';
import { formatScore } from '../../../utils/scoreFormatter';

const STAGE_ORDER: Record<string, number> = {
  LOBBY: 0,
  ROUND1: 1,
  ROUND2: 2,
  ROUND3: 3,
  FINISHED: 4,
};

const STAGE_CONFIG: Record<
  string,
  { name: string; shortName: string; round: number; tabKey: 'lobby' | 'round1' | 'round2' | 'round3' | 'finish' }
> = {
  LOBBY: { name: 'Sảnh Chờ & Điểm danh', shortName: 'Sảnh Chờ', round: 1, tabKey: 'lobby' },
  ROUND1: { name: 'Vòng 1: Thông thái', shortName: 'Vòng 1', round: 1, tabKey: 'round1' },
  ROUND2: { name: 'Vòng 2: Nhạy bén', shortName: 'Vòng 2', round: 2, tabKey: 'round2' },
  ROUND3: { name: 'Vòng 3: Bản lĩnh', shortName: 'Vòng 3', round: 3, tabKey: 'round3' },
  FINISHED: { name: 'Tổng kết & Vinh danh', shortName: 'Tổng kết', round: 3, tabKey: 'finish' },
};

export default function AdminLiveControl() {
  const [session, setSession] = useState<LiveSessionDto | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [activeTab, setActiveTab] = useState<'lobby' | 'round1' | 'round2' | 'round3' | 'finish'>('lobby');
  const hasInitialTabSyncedRef = React.useRef<boolean>(false);
  const [setupSubTab, setSetupSubTab] = useState<'players' | 'questions' | 'r2topics'>('players');
  const [currentQuestionOrder, setCurrentQuestionOrder] = useState<number>(1);
  const [actionLoading, setActionLoading] = useState<boolean>(false);

  // Setup state
  const [setupPlayers, setSetupPlayers] = useState<LivePlayerDto[]>([]);
  const [playerSearchTerm, setPlayerSearchTerm] = useState<string>('');
  const [playerModalOpen, setPlayerModalOpen] = useState<boolean>(false);
  const [editingPlayerIndex, setEditingPlayerIndex] = useState<number | null>(null);
  const [playerFormData, setPlayerFormData] = useState({
    orderNumber: 1,
    fullName: '',
    unit: '',
    email: '',
    phone: '',
    avatarUrl: '',
  });
  const [setupQuestions, setSetupQuestions] = useState<any[]>([]);
  const [setupR2Topics, setSetupR2Topics] = useState<LiveRound2Topic[]>([]);

  // Realtime Round 1 Answers tracker & timers
  const [questionAnswers, setQuestionAnswers] = useState<
    Record<number, { hasAnswered: boolean; responseTimeMs: number }>
  >({});
  const [revealedAnswers, setRevealedAnswers] = useState<any[]>([]);
  const [hopeStarCountdown, setHopeStarCountdown] = useState<number>(0);
  const [questionCountdown, setQuestionCountdown] = useState<number>(0);
  const hopeStarTimerRef = React.useRef<any>(null);
  const questionTimerRef = React.useRef<any>(null);

  // Lobby warning modal & Avatar Modal
  const [showLobbyWarningModal, setShowLobbyWarningModal] = useState<boolean>(false);
  const [supportOtpDialog, setSupportOtpDialog] = useState<{
    player: LivePlayerDto;
    otpCode: string;
  } | null>(null);
  const [confirmDialog, setConfirmDialog] = useState<{
    title: string;
    message: string;
    confirmText?: string;
    confirmType?: 'danger' | 'warning' | 'primary';
    onConfirm: () => void;
  } | null>(null);
  const [avatarModalPlayer, setAvatarModalPlayer] = useState<LivePlayerDto | null>(null);
  const [avatarUrlInput, setAvatarUrlInput] = useState<string>('');

  // Round 2 Inputs & Batch State
  const [r2PlayerId, setR2PlayerId] = useState<number | ''>('');
  const [r2TopicCode, setR2TopicCode] = useState<string>('BỘ ĐỀ 01');
  const [r2Score1, setR2Score1] = useState<number>(18);
  const [r2Score2, setR2Score2] = useState<number>(18);
  const [round2Topics, setRound2Topics] = useState<LiveRound2Topic[]>([]);
  const [r2BatchPlayerIds, setR2BatchPlayerIds] = useState<number[]>([]);
  const [r2Timer, setR2Timer] = useState<number>(600);
  const [r2TimerRunning, setR2TimerRunning] = useState<boolean>(false);
  const [r2TimeUp, setR2TimeUp] = useState<boolean>(false);
  const r2TargetEndTimeRef = React.useRef<number | null>(null);
  const [r2ShowAllPlayers, setR2ShowAllPlayers] = useState<boolean>(false);
  const [r2ScoresMap, setR2ScoresMap] = useState<Record<number, { s1: number; s2: number }>>({});
  const [adminInspectingPlayerId, setAdminInspectingPlayerId] = useState<number | null>(null);

  // Round 3 Inputs & Pairing State
  const [r3PlayerId, setR3PlayerId] = useState<number | ''>('');
  const [r3Score, setR3Score] = useState<number>(0);
  const [round3Pairs, setRound3Pairs] = useState<LiveRound3Pair[]>([]);
  const [round3DisplayPairs, setRound3DisplayPairs] = useState<LiveRound3DisplayPair[]>([
    { pairNumber: 1, player1: null, player2: null },
    { pairNumber: 2, player1: null, player2: null },
    { pairNumber: 3, player1: null, player2: null },
    { pairNumber: 4, player1: null, player2: null },
    { pairNumber: 5, player1: null, player2: null },
  ]);
  const [pairSelections, setPairSelections] = useState<Record<number, { p1: number | ''; p2: number | '' }>>({
    1: { p1: '', p2: '' },
    2: { p1: '', p2: '' },
    3: { p1: '', p2: '' },
    4: { p1: '', p2: '' },
    5: { p1: '', p2: '' },
  });
  const [activeDuelPairNumber, setActiveDuelPairNumber] = useState<number | null>(null);
  const [r3DuelStage, setR3DuelStage] = useState<string>('STAGE_1_PREP');
  const [r3DuelStageTitle, setR3DuelStageTitle] = useState<string>('Giai đoạn 1: Chuẩn bị đề xuất phương án (02 phút)');
  const [r3DuelDuration, setR3DuelDuration] = useState<number>(120);
  const [r3ActiveSpeakerId, setR3ActiveSpeakerId] = useState<number | null>(null);
  const [r3Timer, setR3Timer] = useState<number>(120);
  const [r3TimerRunning, setR3TimerRunning] = useState<boolean>(false);
  const [r3TimeUp, setR3TimeUp] = useState<boolean>(false);
  const [r3TimerPaused, setR3TimerPaused] = useState<boolean>(false);
  const [r3TimerEnded, setR3TimerEnded] = useState<boolean>(false);
  const r3TargetEndTimeRef = React.useRef<number | null>(null);
  const [r3ScoresMap, setR3ScoresMap] = useState<Record<number, number>>({});
  const [r3PenaltyMap, setR3PenaltyMap] = useState<Record<number, number>>({});
  const [r3OvertimeRunning, setR3OvertimeRunning] = useState<boolean>(false);
  const [r3OvertimeSeconds, setR3OvertimeSeconds] = useState<number>(0);
  const [r3OvertimePlayerId, setR3OvertimePlayerId] = useState<number | null>(null);
  const r3OvertimeTargetStartRef = React.useRef<number | null>(null);
  const pairSelectionsInitializedRef = React.useRef<boolean>(false);

  // Load session
  const fetchSession = useCallback(async () => {
    try {
      setLoading(true);
      const data = await liveApi.getActiveSession();
      setSession(data);
      if (data.currentQuestionIndex) {
        setCurrentQuestionOrder(data.currentQuestionIndex);
      }
      if (!hasInitialTabSyncedRef.current) {
        hasInitialTabSyncedRef.current = true;
        if (data.currentRound === 1 && data.status !== 'LOBBY') setActiveTab('round1');
        else if (data.status === 'LOBBY') setActiveTab('lobby');
        else if (data.currentRound === 2) setActiveTab('round2');
        else if (data.currentRound === 3) setActiveTab('round3');
        else if (data.status === 'FINISHED') setActiveTab('finish');
      }

      if (data.id) {
        const topics = await adminLiveApi.getRound2Topics(data.id);
        setRound2Topics(topics);
        setSetupR2Topics(topics);
        const pairs = await adminLiveApi.getRound3Pairs(data.id);
        setRound3Pairs(pairs);

        try {
          const displayPairs = await adminLiveApi.getRound3DisplayPairs(data.id);
          if (displayPairs && displayPairs.length > 0) {
            setRound3DisplayPairs(displayPairs);
            // Chỉ nạp dữ liệu vào form pairSelections 1 lần duy nhất khi khởi tạo trang,
            // không ghi đè định kỳ khi polling để tránh mất lựa chọn đang chọn dở của Admin
            if (!pairSelectionsInitializedRef.current) {
              pairSelectionsInitializedRef.current = true;
              setPairSelections((prev) => {
                const updated = { ...prev };
                displayPairs.forEach((dp) => {
                  if (dp.pairNumber) {
                    updated[dp.pairNumber] = {
                      p1: dp.player1Id ?? dp.player1?.id ?? '',
                      p2: dp.player2Id ?? dp.player2?.id ?? '',
                    };
                  }
                });
                return updated;
              });
            }
          }
        } catch (e) {
          console.error('Lỗi tải danh sách cặp đấu V3:', e);
        }

        const questions = await adminLiveApi.getQuestions(data.id);
        setSetupQuestions(questions);
        if (data.players) {
          setSetupPlayers(data.players);
          setR2ScoresMap((prev) => {
            const next = { ...prev };
            data.players.forEach((p) => {
              if (!next[p.id]) {
                next[p.id] = {
                  s1: p.round2Scenario1Score ?? 18,
                  s2: p.round2Scenario2Score ?? 18,
                };
              }
            });
            return next;
          });

          setR3ScoresMap((prev) => {
            const nextR3 = { ...prev };
            data.players.forEach((p) => {
              if (p.round3Score !== undefined && p.round3Score !== null) {
                nextR3[p.id] = Number(p.round3Score);
              }
            });
            return nextR3;
          });

          setR3PenaltyMap((prev) => {
            const nextPen = { ...prev };
            data.players.forEach((p) => {
              if (nextPen[p.id] === undefined && p.round3SuggestedPenalty !== undefined && p.round3SuggestedPenalty !== null) {
                nextPen[p.id] = p.round3SuggestedPenalty;
              }
            });
            return nextPen;
          });

          // Loại bỏ các thí sinh đã có điểm khỏi danh sách đợt thi hiện tại
          setR2BatchPlayerIds((prev) =>
            prev.filter((id) => {
              const p = data.players.find((item) => item.id === id);
              return p && (!p.round2Score || Number(p.round2Score) === 0);
            })
          );
          if (r2PlayerId) {
            const selPlayer = data.players.find((item) => item.id === Number(r2PlayerId));
            if (selPlayer && Number(selPlayer.round2Score ?? 0) > 0) {
              setR2PlayerId('');
              setR2TopicCode('');
            }
          }
        }
      }

      // Khôi phục đồng hồ Vòng 2 10 phút từ server timestamp
      if (data && data.status === 'ROUND2' && data.round2BatchRunning && data.round2BatchEndAt) {
        const remainingR2 = Math.max(0, Math.ceil((data.round2BatchEndAt - Date.now()) / 1000));
        if (remainingR2 > 0) {
          r2TargetEndTimeRef.current = data.round2BatchEndAt;
          setR2Timer(remainingR2);
          setR2TimerRunning(true);
          setR2TimeUp(false);
          if (data.round2BatchPlayerIds && data.round2BatchPlayerIds.length > 0) {
            const activeIds = data.round2BatchPlayerIds.filter((id) => {
              const p = data.players?.find((item) => item.id === id);
              return !p || !p.round2Score || Number(p.round2Score) === 0;
            });
            setR2BatchPlayerIds(activeIds);
          }
        } else {
          r2TargetEndTimeRef.current = null;
          setR2Timer(0);
          setR2TimerRunning(false);
          setR2TimeUp(true);
        }
      }

      // Khôi phục đồng hồ Vòng 3 nếu reload trang trong lúc đang tranh tài
      if (data && data.status === 'ROUND3' && data.round3DuelState) {
        const duel = data.round3DuelState as any;
        if (duel.pairNumber) {
          setActiveDuelPairNumber(Number(duel.pairNumber));
        }
        if (duel.stage) setR3DuelStage(String(duel.stage));
        if (duel.stageTitle) setR3DuelStageTitle(String(duel.stageTitle));
        if (duel.activePlayerId && Number(duel.activePlayerId) > 0) {
          setR3ActiveSpeakerId(Number(duel.activePlayerId));
        }
        if (duel.isTimerPaused) {
          setR3TimerRunning(false);
          setR3TimerPaused(true);
          setR3Timer(duel.pausedRemainingSeconds !== undefined ? Number(duel.pausedRemainingSeconds) : 0);
          r3TargetEndTimeRef.current = null;
        } else if (duel.isEnded) {
          r3TargetEndTimeRef.current = null;
          setR3Timer(0);
          setR3TimerRunning(false);
          setR3TimerPaused(false);
          setR3TimeUp(true);
          setR3TimerEnded(true);
        } else if (duel.isTimerRunning && duel.endAt) {
          const rem = Math.max(0, Math.ceil((duel.endAt - Date.now()) / 1000));
          if (rem > 0) {
            r3TargetEndTimeRef.current = duel.endAt;
            setR3Timer(rem);
            setR3TimerRunning(true);
            setR3TimerPaused(false);
            setR3TimerEnded(false);
            setR3TimeUp(false);
          } else {
            r3TargetEndTimeRef.current = null;
            setR3Timer(0);
            setR3TimerRunning(false);
            setR3TimeUp(true);
          }
        } else if (duel.isTimeUp) {
          r3TargetEndTimeRef.current = null;
          setR3Timer(0);
          setR3TimerRunning(false);
          setR3TimeUp(true);
        }

        if (duel.isOvertimeRunning) {
          const startEpoch = duel.overtimeStartedAt ? Number(duel.overtimeStartedAt) : Date.now();
          r3OvertimeTargetStartRef.current = startEpoch;
          const elapsed = Math.max(0, Math.floor((Date.now() - startEpoch) / 1000));
          setR3OvertimeSeconds(elapsed);
          setR3OvertimeRunning(true);
          setR3OvertimePlayerId(duel.activePlayerId ? Number(duel.activePlayerId) : null);
        } else if (duel.overtimeSeconds) {
          setR3OvertimeSeconds(Number(duel.overtimeSeconds));
          setR3OvertimeRunning(false);
        } else {
          setR3OvertimeRunning(false);
        }
      }
    } catch (err) {
      console.error('Lỗi tải phiên thi:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  // Round 3 Overtime timer ticker
  useEffect(() => {
    if (!r3OvertimeRunning || !r3OvertimeTargetStartRef.current) return;
    const interval = setInterval(() => {
      const elapsed = Math.max(0, Math.floor((Date.now() - r3OvertimeTargetStartRef.current!) / 1000));
      setR3OvertimeSeconds(elapsed);
    }, 500);
    return () => clearInterval(interval);
  }, [r3OvertimeRunning]);

  useEffect(() => {
    fetchSession();
  }, [fetchSession]);

  // Periodic sync to ensure admin always sees latest session status and candidate check-in
  useEffect(() => {
    const delay = activeTab === 'lobby' ? 3000 : 5000;
    const interval = setInterval(() => {
      fetchSession();
    }, delay);
    return () => clearInterval(interval);
  }, [activeTab, fetchSession]);

  // Xếp hạng chung cuộc chuẩn theo điểm tích lũy:
  // 1. Tổng điểm giảm dần
  // 2. Thí sinh điểm danh xếp trước
  // 3. Thời gian trả lời tích lũy V1 nhanh hơn (nhỏ hơn) xếp trước
  // 4. Số báo danh (SBD) nhỏ hơn
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

  // WebSocket Event Listener
  const handleSocketMessage = useCallback(
    (event: LiveEventMessage) => {
      console.log('[AdminLiveControl WS]', event.eventType, event.payload);
      if (event.eventType === 'PLAYER_ANSWERED') {
        const { playerId, responseTimeMs } = event.payload;
        setQuestionAnswers((prev) => ({
          ...prev,
          [playerId]: { hasAnswered: true, responseTimeMs },
        }));
      }
      if (event.eventType === 'ANSWER_REVEALED') {
        if (event.payload.answers) {
          setRevealedAnswers(event.payload.answers);
        }
        setQuestionCountdown(0);
        if (questionTimerRef.current) {
          clearInterval(questionTimerRef.current);
          questionTimerRef.current = null;
        }
        setSession((prev) => {
          if (!prev) return prev;
          return {
            ...prev,
            round1State: 'ANSWER_REVEALED',
            players: event.payload.leaderboard || prev.players,
            revealedData: event.payload,
          };
        });
      }
      if (event.eventType === 'LEADERBOARD_UPDATED') {
        setSession((prev) => {
          if (!prev) return prev;
          return {
            ...prev,
            round1State: 'LEADERBOARD',
            players: event.payload.leaderboard || prev.players,
          };
        });
      }
      if (event.eventType === 'QUESTION_READING') {
        setQuestionAnswers({});
        setRevealedAnswers([]);
      }
      if (event.eventType === 'QUESTION_STARTED') {
        setQuestionAnswers({});
        setRevealedAnswers([]);
        fetchSession();
      }
      if (event.eventType === 'RESCUE_REQUESTED') {
        const p: LivePlayerDto = event.payload;
        setSession((prev) => {
          if (!prev) return prev;
          const updatedPlayers = prev.players?.map((item) =>
            item.id === p.id ? { ...item, ...p, isRescueRequested: true } : item
          );
          return { ...prev, players: updatedPlayers };
        });
        toast.warning(
          `🚨 CỨU HỘ OTP: Thí sinh ${p?.fullName || ''} (SBD ${p?.orderNumber != null ? String(p.orderNumber).padStart(2, '0') : ''}) yêu cầu Ban Tổ chức hỗ trợ duyệt vào phòng!`,
          { duration: 8000 }
        );
        liveSound.playUrgentCountdown(2);
        fetchSession();
      }
      if (event.eventType === 'PLAYER_CHECKED_IN') {
        const p: LivePlayerDto = event.payload;
        setSession((prev) => {
          if (!prev) return prev;
          const updatedPlayers = prev.players?.map((item) =>
            item.id === p.id ? { ...item, ...p } : item
          );
          return { ...prev, players: updatedPlayers };
        });
        fetchSession();
      }
      if (event.eventType === 'ROUND2_CANDIDATE_SELECTED') {
        if (event.payload?.playerId) {
          setR2PlayerId(event.payload.playerId);
        }
      }
      if (event.eventType === 'ROUND2_TOPIC_ASSIGNED') {
        const pId = event.payload?.playerId;
        if (pId) {
          setR2BatchPlayerIds((prev) => (prev.includes(pId) ? prev : [...prev, pId]));
        }
        fetchSession();
      }
      if (event.eventType === 'ROUND2_TOPIC_UNASSIGNED') {
        const pId = event.payload?.playerId;
        if (pId) {
          setR2BatchPlayerIds((prev) => prev.filter((id) => id !== pId));
          if (r2PlayerId === pId) {
            setR2PlayerId('');
          }
        }
        fetchSession();
      }
      if (event.eventType === 'ROUND2_PLAYER_RESET') {
        const pId = event.payload?.playerId;
        if (pId) {
          setR2BatchPlayerIds((prev) => prev.filter((id) => id !== pId));
        }
        fetchSession();
      }
      if (event.eventType === 'ROUND2_BATCH_STARTED') {
        const pIds = event.payload?.playerIds || [];
        setR2BatchPlayerIds(pIds);
        const duration = Number(event.payload?.durationSeconds || 600);
        r2TargetEndTimeRef.current = Date.now() + duration * 1000;
        setR2Timer(duration);
        setR2TimerRunning(true);
        setR2TimeUp(false);
      }
      if (event.eventType === 'ROUND2_BATCH_ENDED') {
        r2TargetEndTimeRef.current = null;
        setR2TimerRunning(false);
        setR2Timer(0);
        setR2TimeUp(true);
      }
      if (event.eventType === 'ROUND2_BATCH_RESET') {
        r2TargetEndTimeRef.current = null;
        setR2BatchPlayerIds([]);
        setR2TimerRunning(false);
        setR2Timer(600);
        setR2TimeUp(false);
        fetchSession();
      }
      if (event.eventType === 'SESSION_STATUS_CHANGED') {
        const newStatus = event.payload?.status;
        if (newStatus && STAGE_CONFIG[newStatus]) {
          setActiveTab(STAGE_CONFIG[newStatus].tabKey);
        }
        fetchSession();
      }
      if (event.eventType === 'ROUND2_SCORE_UPDATED') {
        const scoredId = event.payload?.playerId;
        if (scoredId) {
          setR2BatchPlayerIds((prev) => prev.filter((id) => id !== scoredId));
          if (Number(r2PlayerId) === Number(scoredId)) {
            setR2PlayerId('');
            setR2TopicCode('');
          }
        }
        fetchSession();
      }
      if (event.eventType === 'ROUND3_PAIRS_UPDATED') {
        if (event.payload?.pairs) {
          setRound3DisplayPairs(event.payload.pairs);
          // Chỉ đồng bộ vào form các cặp đã được lưu đủ 2 thí sinh trên server,
          // tránh xóa đè các cặp đang được Admin thao tác dở
          setPairSelections((prev) => {
            const updated = { ...prev };
            event.payload.pairs.forEach((dp: LiveRound3DisplayPair) => {
              if (dp.pairNumber && dp.player1Id && dp.player2Id) {
                updated[dp.pairNumber] = {
                  p1: dp.player1Id,
                  p2: dp.player2Id,
                };
              }
            });
            return updated;
          });
        }
      }
      if (event.eventType === 'ROUND3_DUEL_STARTED') {
        const duel = event.payload;
        if (duel.pairNumber) setActiveDuelPairNumber(duel.pairNumber);
        const duration = Number(duel.durationSeconds || 120);
        r3TargetEndTimeRef.current = Date.now() + duration * 1000;
        setR3Timer(duration);
        setR3TimerRunning(true);
        setR3TimerPaused(false);
        setR3TimeUp(false);
        setR3TimerEnded(false);
        setR3OvertimeRunning(false);
        setR3OvertimeSeconds(0);
        fetchSession();
      }
      if (event.eventType === 'ROUND3_TIMER_PAUSED') {
        setR3TimerRunning(false);
        setR3TimerPaused(true);
        r3TargetEndTimeRef.current = null;
        if (event.payload?.pausedRemainingSeconds !== undefined) {
          setR3Timer(Number(event.payload.pausedRemainingSeconds));
        }
      }
      if (event.eventType === 'ROUND3_TIMER_RESUMED') {
        setR3TimerRunning(true);
        setR3TimerPaused(false);
        const endAt = event.payload?.endAt || (Date.now() + r3Timer * 1000);
        r3TargetEndTimeRef.current = endAt;
      }
      if (event.eventType === 'ROUND3_TIMER_RESET') {
        setR3TimerRunning(false);
        setR3TimerPaused(false);
        setR3TimeUp(false);
        setR3TimerEnded(false);
        setR3OvertimeRunning(false);
        setR3OvertimeSeconds(0);
        r3TargetEndTimeRef.current = null;
        r3OvertimeTargetStartRef.current = null;
        setR3Timer(Number(event.payload?.durationSeconds || r3DuelDuration || 120));
      }
      if (event.eventType === 'ROUND3_TIMER_ENDED' || event.eventType === 'ROUND3_DUEL_TIME_UP') {
        r3TargetEndTimeRef.current = null;
        r3OvertimeTargetStartRef.current = null;
        setR3TimerRunning(false);
        setR3TimerPaused(false);
        setR3TimeUp(true);
        setR3TimerEnded(true);
        setR3OvertimeRunning(false);
        if (event.payload?.overtimeSeconds !== undefined) {
          setR3OvertimeSeconds(Number(event.payload.overtimeSeconds));
        }
        fetchSession();
      }
      if (event.eventType === 'ROUND3_OVERTIME_STARTED') {
        setR3TimerRunning(false);
        setR3TimerPaused(false);
        setR3TimeUp(true);
        setR3OvertimeRunning(true);
        r3OvertimeTargetStartRef.current = event.payload?.overtimeStartedAt || Date.now();
        setR3OvertimeSeconds(0);
      }
      if (event.eventType === 'ROUND3_OVERTIME_STOPPED') {
        setR3OvertimeRunning(false);
        r3OvertimeTargetStartRef.current = null;
        if (event.payload?.overtimeSeconds !== undefined) {
          setR3OvertimeSeconds(Number(event.payload.overtimeSeconds));
        }
        fetchSession();
      }
      if (event.eventType === 'ROUND3_SHOW_ALL_PAIRS') {
        setActiveDuelPairNumber(null);
        r3TargetEndTimeRef.current = null;
        setR3TimerRunning(false);
        setR3TimerPaused(false);
        setR3TimeUp(false);
        setR3TimerEnded(false);
        setR3OvertimeRunning(false);
        setR3OvertimeSeconds(0);
        fetchSession();
      }
      if (
        event.eventType === 'PLAYERS_CONFIGURED' ||
        event.eventType === 'HOPE_STAR_ACTIVATED' ||
        event.eventType === 'PLAYER_ANSWERED' ||
        event.eventType === 'ANSWER_REVEALED' ||
        event.eventType === 'LEADERBOARD_UPDATED' ||
        event.eventType === 'ROUND3_PAIR_DRAWN' ||
        event.eventType === 'ROUND3_SCORE_UPDATED' ||
        event.eventType === 'WINNERS_ANNOUNCED'
      ) {
        fetchSession();
      }
    },
    [fetchSession, r2PlayerId]
  );

  // Round 2 10-Minute Timer Ticker synchronized with server epoch
  useEffect(() => {
    if (!r2TimerRunning || !r2TargetEndTimeRef.current) return;
    const interval = setInterval(() => {
      const remaining = Math.max(0, Math.ceil((r2TargetEndTimeRef.current! - Date.now()) / 1000));
      setR2Timer(remaining);
      if (remaining <= 0) {
        clearInterval(interval);
        setR2TimerRunning(false);
        setR2TimeUp(true);
        r2TargetEndTimeRef.current = null;
      }
    }, 250);
    return () => clearInterval(interval);
  }, [r2TimerRunning]);

  // Round 3 Duel Timer Ticker synchronized with server epoch
  useEffect(() => {
    if (!r3TimerRunning || !r3TargetEndTimeRef.current) return;
    const interval = setInterval(() => {
      const remaining = Math.max(0, Math.ceil((r3TargetEndTimeRef.current! - Date.now()) / 1000));
      setR3Timer(remaining);
      if (remaining <= 0) {
        clearInterval(interval);
        setR3TimerRunning(false);
        setR3TimeUp(true);
        r3TargetEndTimeRef.current = null;
        // TỰ ĐỘNG KÍCH HOẠT TÍNH QUÁ GIỜ NẾU CHƯA BẤM KẾT THÚC
        if (session?.id) {
          adminLiveApi.startRound3Overtime(session.id, r3ActiveSpeakerId ?? undefined).catch(console.error);
        }
        r3OvertimeTargetStartRef.current = Date.now();
        setR3OvertimeRunning(true);
        setR3OvertimeSeconds(0);
        setR3OvertimePlayerId(r3ActiveSpeakerId ?? null);
      }
    }, 250);
    return () => clearInterval(interval);
  }, [r3TimerRunning, session?.id, r3ActiveSpeakerId]);

  // Round 3 Overtime Ticker counting seconds
  useEffect(() => {
    if (!r3OvertimeRunning || !r3OvertimeTargetStartRef.current) return;
    const interval = setInterval(() => {
      const elapsed = Math.max(0, Math.floor((Date.now() - r3OvertimeTargetStartRef.current!) / 1000));
      setR3OvertimeSeconds(elapsed);
    }, 500);
    return () => clearInterval(interval);
  }, [r3OvertimeRunning]);

  const { isConnected } = useLiveSocket({
    sessionId: session?.id,
    onMessage: handleSocketMessage,
  });

  // Tự động đồng bộ đếm ngược 40s và tự động chốt kết quả khi về 0s
  useEffect(() => {
    if (session?.round1State === 'QUESTION_40S' && session.currentQuestionIndex && session.id) {
      const qLimit = session.currentQuestion?.timeLimitSeconds || 40;
      const started = session.questionStartedAt || Date.now();
      const targetEnd = started + qLimit * 1000;

      const tick = async () => {
        const rem = Math.max(0, Math.ceil((targetEnd - Date.now()) / 1000));
        setQuestionCountdown(rem);
        if (rem <= 0) {
          if (questionTimerRef.current) {
            clearInterval(questionTimerRef.current);
            questionTimerRef.current = null;
          }
          try {
            await adminLiveApi.revealAnswer(session.id, session.currentQuestionIndex);
            toast.success('Hết 40 giây! Hệ thống đã tự động chốt bài thi và công bố đáp án!');
            await fetchSession();
          } catch (e) {
            // Đã được tự động reveal bởi backend scheduler hoặc màn host
          }
        }
      };

      tick();
      if (questionTimerRef.current) clearInterval(questionTimerRef.current);
      questionTimerRef.current = setInterval(tick, 300);

      return () => {
        if (questionTimerRef.current) {
          clearInterval(questionTimerRef.current);
          questionTimerRef.current = null;
        }
      };
    } else {
      if (questionTimerRef.current) {
        clearInterval(questionTimerRef.current);
        questionTimerRef.current = null;
      }
      setQuestionCountdown(0);
    }
  }, [session?.id, session?.round1State, session?.questionStartedAt, session?.currentQuestionIndex, fetchSession]);

  // Switch round & stage with backward transition warning
  const handleRequestStageChange = (
    targetStatus: string,
    targetRound: number,
    targetTabKey?: 'lobby' | 'round1' | 'round2' | 'round3' | 'finish'
  ) => {
    if (!session) return;
    const currentStatus = session.status || 'LOBBY';
    const currentOrder = STAGE_ORDER[currentStatus] ?? 0;
    const targetOrder = STAGE_ORDER[targetStatus] ?? 0;

    const currentCfg = STAGE_CONFIG[currentStatus] || {
      name: currentStatus,
      shortName: currentStatus,
      round: 1,
      tabKey: 'lobby',
    };
    const targetCfg = STAGE_CONFIG[targetStatus] || {
      name: targetStatus,
      shortName: targetStatus,
      round: targetRound,
      tabKey: targetTabKey || 'lobby',
    };

    // Nếu sân khấu đã ở trạng thái này rồi, chỉ cần mở tab tương ứng
    if (currentStatus === targetStatus) {
      if (targetTabKey) setActiveTab(targetTabKey);
      return;
    }

    // Helper to stop running round 2 batch if leaving ROUND2
    const cleanupRound2IfActive = async () => {
      if (currentStatus === 'ROUND2' && (r2TimerRunning || r2BatchPlayerIds.length > 0)) {
        try {
          await adminLiveApi.endRound2Batch(session.id);
          r2TargetEndTimeRef.current = null;
          setR2TimerRunning(false);
          setR2Timer(0);
        } catch (e) {
          console.error('Error stopping running round 2 batch', e);
        }
      }
    };

    // CHUYỂN NGƯỢC: từ vòng sau về vòng trước -> BẮT BUỘC POPUP CONFIRM CẢNH BÁO ADMIN (DANGER)
    if (targetOrder < currentOrder) {
      setConfirmDialog({
        title: '⚠️ CẢNH BÁO: CHUYỂN NGƯỢC VỀ VÒNG THI TRƯỚC',
        message: `Hệ thống sân khấu đang ở [${currentCfg.name}].\nBạn đang yêu cầu CHUYỂN NGƯỢC VỀ [${targetCfg.name}].\n\n` +
          `• Toàn bộ Màn hình LED Sân khấu và Thiết bị di động của 10 thí sinh sẽ được chuyển ngược về giao diện [${targetCfg.name}].\n` +
          `• Dữ liệu bài thi và điểm số đã tích lũy của các vòng trước đó vẫn được lưu trữ an toàn trong hệ thống.\n` +
          `• Lưu ý: Việc chuyển ngược vòng có thể ảnh hưởng đến tiết tấu sân khấu trực tiếp.\n\n` +
          `Bạn có chắc chắn muốn quay lại vòng thi trước không?`,
        confirmText: `XÁC NHẬN CHUYỂN NGƯỢC VỀ ${targetCfg.shortName.toUpperCase()}`,
        confirmType: 'danger',
        onConfirm: async () => {
          try {
            setActionLoading(true);
            await cleanupRound2IfActive();
            await adminLiveApi.setRound(session.id, targetRound, targetStatus);
            if (targetTabKey) setActiveTab(targetTabKey);
            await fetchSession();
            toast.warning(`Đã chuyển ngược sân khấu về ${targetCfg.name}!`);
          } catch (err) {
            toast.error(`Lỗi chuyển về ${targetCfg.name}`);
          } finally {
            setActionLoading(false);
          }
        },
      });
      return;
    }

    // CHUYỂN XUÔI: từ vòng trước sang vòng sau -> Xác nhận thông thường
    setConfirmDialog({
      title: `Chuyển sân khấu sang ${targetCfg.name}`,
      message: `Xác nhận chuyển toàn bộ Màn hình LED sân khấu và thiết bị di động của 10 thí sinh sang "${targetCfg.name}"?`,
      confirmText: `Chuyển sang ${targetCfg.name}`,
      confirmType: 'primary',
      onConfirm: async () => {
        try {
          setActionLoading(true);
          await cleanupRound2IfActive();
          await adminLiveApi.setRound(session.id, targetRound, targetStatus);
          if (targetTabKey) setActiveTab(targetTabKey);
          await fetchSession();
          toast.success(`Đã chuyển sân khấu sang ${targetCfg.name} thành công!`);
        } catch (err) {
          toast.error(`Lỗi chuyển sang ${targetCfg.name}`);
        } finally {
          setActionLoading(false);
        }
      },
    });
  };

  const handleSetRound = async (round: number, status: string) => {
    handleRequestStageChange(status, round);
  };

  // LOBBY ACTIONS
  const handleBypassCheckIn = async (playerId: number) => {
    try {
      setActionLoading(true);
      await adminLiveApi.bypassCheckIn(playerId);
      await fetchSession();
      toast.success('Đã duyệt cứu hộ thành công! Thí sinh đã được vào phòng thi.');
    } catch (err) {
      toast.error('Lỗi duyệt thí sinh vào phòng');
    } finally {
      setActionLoading(false);
    }
  };

  const handleGenerateSupportOtp = async (player: LivePlayerDto) => {
    try {
      setActionLoading(true);
      const res = await adminLiveApi.generateSupportOtp(player.id);
      setSupportOtpDialog({
        player,
        otpCode: res.otpCode,
      });
      toast.success(`Đã tạo mã OTP cứu hộ cho SBD ${String(player.orderNumber).padStart(2, '0')} - ${player.fullName}!`);
    } catch (err) {
      toast.error('Lỗi tạo mã OTP cứu hộ');
    } finally {
      setActionLoading(false);
    }
  };

  const handleResetCheckIn = async (playerId: number) => {
    setConfirmDialog({
      title: 'Mời thí sinh ra khỏi phòng',
      message: 'Mời thí sinh này ra khỏi phòng chờ và đưa về trạng thái chưa điểm danh?',
      confirmText: 'Mời ra khỏi phòng',
      confirmType: 'warning',
      onConfirm: async () => {
        try {
          setActionLoading(true);
          await adminLiveApi.resetPlayerCheckIn(playerId);
          await fetchSession();
          toast.success('Đã đưa thí sinh về trạng thái chưa điểm danh');
        } catch (err) {
          toast.error('Lỗi mời thí sinh ra khỏi phòng');
        } finally {
          setActionLoading(false);
        }
      },
    });
  };

  const handleSaveAvatar = async () => {
    if (!avatarModalPlayer) return;
    try {
      setActionLoading(true);
      await adminLiveApi.updateAvatar(avatarModalPlayer.id, avatarUrlInput);
      setAvatarModalPlayer(null);
      await fetchSession();
    } catch (err) {
      toast.error('Lỗi cập nhật ảnh đại diện');
    } finally {
      setActionLoading(false);
    }
  };

  const handleShowR2TopicQuestion = async () => {
    if (!session || !r2TopicCode) return;
    try {
      setActionLoading(true);
      await adminLiveApi.showRound2TopicQuestion(session.id, r2TopicCode);
      toast.success(`Đã hiển thị nội dung đề thi ${r2TopicCode} trên Màn hình LED Sân khấu!`);
    } catch (err) {
      toast.error('Lỗi hiển thị câu hỏi đề thi');
    } finally {
      setActionLoading(false);
    }
  };

  // Chuyển sang Vòng 2 sau khi hoàn thành Vòng 1
  const handleTransitionToRound2 = () => {
    handleRequestStageChange('ROUND2', 2, 'round2');
  };

  // VÒNG 1 ACTIONS - QUY TRÌNH 2 NÚT THÔNG MINH
  const handleTransitionQuestion = (targetOrder: number) => {
    if (!session) return;
    setConfirmDialog({
      title: `Chuyển sang Câu hỏi số ${targetOrder}`,
      message: `Xác nhận chuyển sang Câu hỏi số ${targetOrder}? Hệ thống sẽ kích hoạt 5 giây chọn Ngôi sao hy vọng cho thí sinh, sau đó tự động hiển thị câu hỏi và video lên màn hình sân khấu cho MC đọc.`,
      confirmText: `Bắt đầu Câu số ${targetOrder}`,
      confirmType: 'primary',
      onConfirm: async () => {
        try {
          setActionLoading(true);
          setCurrentQuestionOrder(targetOrder);
          setQuestionAnswers({});
          setRevealedAnswers([]);
          if (hopeStarTimerRef.current) clearInterval(hopeStarTimerRef.current);
          if (questionTimerRef.current) clearInterval(questionTimerRef.current);

          // 1. Kích hoạt 5s Ngôi sao hy vọng
          await adminLiveApi.startHopeStar(session.id, targetOrder);
          toast.info(`Đang mở 5s chọn Ngôi sao hy vọng cho Câu ${targetOrder}...`);
          await fetchSession();

          const targetEnd = Date.now() + 5000;
          setHopeStarCountdown(5);
          hopeStarTimerRef.current = setInterval(async () => {
            const rem = Math.max(0, Math.ceil((targetEnd - Date.now()) / 1000));
            setHopeStarCountdown(rem);
            if (rem <= 0) {
              if (hopeStarTimerRef.current) clearInterval(hopeStarTimerRef.current);
              // 2. Hết 5s: Tự động chuyển sang đọc câu hỏi & video
              try {
                await adminLiveApi.readQuestion(session.id, targetOrder);
                toast.success(`Hết 5s Ngôi sao hy vọng! Đã hiển thị kết quả Ngôi sao hy vọng lên màn LED.`);
                await fetchSession();
              } catch (e: any) {
                console.error(e);
                toast.error('Lỗi hiển thị câu hỏi: ' + (e.response?.data?.message || e.message));
              }
            }
          }, 250);
        } catch (err: any) {
          toast.error('Lỗi bắt đầu câu hỏi: ' + (err.response?.data?.message || err.message));
        } finally {
          setActionLoading(false);
        }
      },
    });
  };

  const handleStartQuestionCountdown = async () => {
    if (!session) return;
    try {
      setActionLoading(true);
      await adminLiveApi.startQuestion(session.id, currentQuestionOrder);
      toast.success('Đã mở bài thi cho thí sinh! Đồng hồ 40s bắt đầu đếm ngược.');
      await fetchSession();

      const targetEnd = Date.now() + 40000;
      setQuestionCountdown(40);
      if (questionTimerRef.current) clearInterval(questionTimerRef.current);
      questionTimerRef.current = setInterval(async () => {
        const rem = Math.max(0, Math.ceil((targetEnd - Date.now()) / 1000));
        setQuestionCountdown(rem);
        if (rem <= 0) {
          if (questionTimerRef.current) clearInterval(questionTimerRef.current);
          // Hết 40s tự động chốt đáp án & kết quả & BXH
          try {
            await adminLiveApi.revealAnswer(session.id, currentQuestionOrder);
            toast.success('Hết 40 giây! Đã tự động chốt bài thi, công bố đáp án và cập nhật bảng xếp hạng!');
            await fetchSession();
          } catch (e: any) {
            console.error(e);
          }
        }
      }, 250);
    } catch (err: any) {
      toast.error('Lỗi bắt đầu 40s đếm ngược: ' + (err.response?.data?.message || err.message));
    } finally {
      setActionLoading(false);
    }
  };

  const handleManualRevealAnswer = async () => {
    if (!session) return;
    if (questionTimerRef.current) clearInterval(questionTimerRef.current);
    setQuestionCountdown(0);
    try {
      setActionLoading(true);
      await adminLiveApi.revealAnswer(session.id, currentQuestionOrder);
      toast.success('Đã công bố đáp án và cập nhật bảng xếp hạng!');
      await fetchSession();
    } catch (err) {
      toast.error('Lỗi công bố đáp án');
    } finally {
      setActionLoading(false);
    }
  };

  const handleStartHopeStar = async () => {
    if (!session) return;
    try {
      setActionLoading(true);
      await adminLiveApi.startHopeStar(session.id, currentQuestionOrder);
      await fetchSession();
    } catch (err) {
      toast.error('Lỗi kích hoạt 5s Ngôi sao hy vọng');
    } finally {
      setActionLoading(false);
    }
  };

  const handlePlayVideo = async () => {
    if (!session) return;
    try {
      setActionLoading(true);
      await adminLiveApi.playVideo(session.id, currentQuestionOrder);
      await fetchSession();
    } catch (err) {
      toast.error('Lỗi bật video tình huống');
    } finally {
      setActionLoading(false);
    }
  };

  const handleReadQuestion = async () => {
    if (!session) return;
    try {
      setActionLoading(true);
      await adminLiveApi.readQuestion(session.id, currentQuestionOrder);
      await fetchSession();
    } catch (err) {
      toast.error('Lỗi hiển thị câu hỏi cho MC');
    } finally {
      setActionLoading(false);
    }
  };

  const handleStartQuestion = async () => {
    if (!session) return;
    try {
      setActionLoading(true);
      await adminLiveApi.startQuestion(session.id, currentQuestionOrder);
      await fetchSession();
    } catch (err) {
      toast.error('Lỗi bắt đầu 40s đếm ngược');
    } finally {
      setActionLoading(false);
    }
  };

  const handleRevealAnswer = async () => {
    if (!session) return;
    try {
      setActionLoading(true);
      await adminLiveApi.revealAnswer(session.id, currentQuestionOrder);
      await fetchSession();
    } catch (err) {
      toast.error('Lỗi công bố đáp án');
    } finally {
      setActionLoading(false);
    }
  };

  const handleShowLeaderboard = async () => {
    if (!session) return;
    try {
      setActionLoading(true);
      await adminLiveApi.showLeaderboard(session.id);
      await fetchSession();
    } catch (err) {
      toast.error('Lỗi cập nhật bảng xếp hạng');
    } finally {
      setActionLoading(false);
    }
  };

  // VÒNG 2 ACTIONS
  const handleSelectCandidate = async (playerId: number) => {
    if (!session || !playerId) return;
    try {
      setActionLoading(true);
      setR2PlayerId(playerId);
      await adminLiveApi.selectRound2Candidate(session.id, playerId);
      const p = session.players?.find((pl) => pl.id === playerId);
      toast.success(`Đã chọn thí sinh ${p?.fullName || ''} lên bốc đề! Màn hình LED đang hiển thị.`);
    } catch (err) {
      toast.error('Lỗi khi chọn thí sinh lên bốc đề');
    } finally {
      setActionLoading(false);
    }
  };

  const handleAssignTopic = async (topicCodeParam?: string) => {
    if (!session || !r2PlayerId) {
      toast.error('Vui lòng chọn thí sinh trước!');
      return;
    }
    const targetCode = topicCodeParam || r2TopicCode;
    if (!targetCode) {
      toast.error('Vui lòng chọn mã đề!');
      return;
    }
    try {
      setActionLoading(true);
      await adminLiveApi.assignRound2Topic(session.id, Number(r2PlayerId), targetCode);
      setR2BatchPlayerIds((prev) => (prev.includes(Number(r2PlayerId)) ? prev : [...prev, Number(r2PlayerId)]));
      await fetchSession();
      toast.success(`Đã gán ${targetCode} cho thí sinh thành công!`);
    } catch (err) {
      toast.error('Lỗi gán mã đề');
    } finally {
      setActionLoading(false);
    }
  };

  const handleUnassignTopic = async (playerId: number) => {
    if (!session || !playerId) return;
    try {
      setActionLoading(true);
      await adminLiveApi.unassignRound2Topic(session.id, playerId);
      setR2BatchPlayerIds((prev) => prev.filter((id) => id !== playerId));
      if (r2PlayerId === playerId) {
        setR2PlayerId('');
      }
      await fetchSession();
      toast.success('Đã mở khóa / hủy chọn mã đề cho thí sinh thành công!');
    } catch (err: any) {
      toast.error('Lỗi mở khóa mã đề: ' + (err.response?.data?.message || err.message));
    } finally {
      setActionLoading(false);
    }
  };

  const handleResetPlayerRound2 = async (playerId: number, playerName: string) => {
    if (!session || !playerId) return;
    setConfirmDialog({
      title: `Cho thi lại Vòng 2: ${playerName}`,
      message: `Xác nhận reset trạng thái và điểm Vòng 2 của thí sinh "${playerName}" để thí sinh được chọn lại mã đề và tham gia đợt thi mới?`,
      confirmText: 'Reset cho thi lại',
      confirmType: 'warning',
      onConfirm: async () => {
        try {
          setActionLoading(true);
          await adminLiveApi.resetPlayerRound2(session.id, playerId);
          setR2BatchPlayerIds((prev) => prev.filter((id) => id !== playerId));
          await fetchSession();
          toast.success(`Đã reset Vòng 2 cho thí sinh ${playerName}. Thí sinh có thể chọn lại đề ở Bước 1!`);
        } catch (err: any) {
          toast.error('Lỗi reset thí sinh: ' + (err.response?.data?.message || err.message));
        } finally {
          setActionLoading(false);
        }
      },
    });
  };

  const handleStartRound2Batch = async () => {
    if (!session) return;
    let targetIds = [...r2BatchPlayerIds];
    if (session.players) {
      targetIds = targetIds.filter((id) => {
        const p = session.players?.find((pl) => pl.id === id);
        return p && (!p.round2Score || Number(p.round2Score) === 0);
      });
    }
    if (targetIds.length === 0 && session.players) {
      targetIds = session.players
        .filter((p) => p.round2DrawCode && (!p.round2Score || Number(p.round2Score) === 0))
        .map((p) => p.id);
    }
    if (targetIds.length === 0) {
      toast.error('Chưa có thí sinh nào được gán mã đề trong đợt thi này!');
      return;
    }

    setConfirmDialog({
      title: 'Bắt đầu đợt thi Vòng 2 (10 phút)',
      message: `Phát lệnh bắt đầu thi 10 phút cho ${targetIds.length} thí sinh trong đợt này? Câu hỏi sẽ hiện lên máy thí sinh và đồng hồ đếm ngược sẽ chạy trên màn hình LED.`,
      confirmText: 'Bắt đầu 10 phút',
      confirmType: 'primary',
      onConfirm: async () => {
        try {
          setActionLoading(true);
          await adminLiveApi.startRound2Batch(session.id, targetIds, 600);
          const endAt = Date.now() + 600000;
          r2TargetEndTimeRef.current = endAt;
          setR2BatchPlayerIds(targetIds);
          setR2Timer(600);
          setR2TimerRunning(true);
          setR2TimeUp(false);
          toast.success('Đã bắt đầu đợt thi 10 phút thành công!');
        } catch (err) {
          toast.error('Lỗi khi bắt đầu đợt thi');
        } finally {
          setActionLoading(false);
        }
      },
    });
  };

  const handleEndRound2Batch = async () => {
    if (!session) return;
    setConfirmDialog({
      title: 'Dừng thời gian đợt thi',
      message: 'Bạn có chắc chắn muốn kết thúc thời gian làm bài đợt thi này ngay bây giờ?',
      confirmText: 'Kết thúc đợt thi',
      confirmType: 'warning',
      onConfirm: async () => {
        try {
          setActionLoading(true);
          await adminLiveApi.endRound2Batch(session.id);
          r2TargetEndTimeRef.current = null;
          setR2TimerRunning(false);
          setR2Timer(0);
          setR2TimeUp(true);
          toast.success('Đã kết thúc thời gian làm bài đợt thi!');
        } catch (err) {
          toast.error('Lỗi kết thúc đợt thi');
        } finally {
          setActionLoading(false);
        }
      },
    });
  };

  const handleSaveRound2Score = async (targetPlayerId?: number, s1?: number, s2?: number) => {
    const pId = targetPlayerId || r2PlayerId;
    if (!pId) {
      toast.error('Vui lòng chọn thí sinh!');
      return;
    }
    const currentScore = r2ScoresMap[Number(pId)] || { s1: 18, s2: 18 };
    const score1 = s1 !== undefined ? s1 : (r2Score1 ?? currentScore.s1);
    const score2 = s2 !== undefined ? s2 : (r2Score2 ?? currentScore.s2);
    try {
      setActionLoading(true);
      await adminLiveApi.updateRound2Score(Number(pId), score1, score2);
      setR2BatchPlayerIds((prev) => prev.filter((id) => id !== Number(pId)));
      if (Number(r2PlayerId) === Number(pId)) {
        setR2PlayerId('');
        setR2TopicCode('');
      }
      await fetchSession();
      toast.success('Đã cập nhật điểm Vòng 2 thành công!');
    } catch (err) {
      toast.error('Lỗi cập nhật điểm Vòng 2');
    } finally {
      setActionLoading(false);
    }
  };

  const handleSaveAllBatchScores = async (playerIdsToSave: number[]) => {
    if (!playerIdsToSave || playerIdsToSave.length === 0) return;
    try {
      setActionLoading(true);
      for (const pId of playerIdsToSave) {
        const sc = r2ScoresMap[pId] || { s1: 18, s2: 18 };
        await adminLiveApi.updateRound2Score(pId, sc.s1, sc.s2);
      }
      setR2BatchPlayerIds((prev) => prev.filter((id) => !playerIdsToSave.includes(id)));
      if (playerIdsToSave.includes(Number(r2PlayerId))) {
        setR2PlayerId('');
        setR2TopicCode('');
      }
      await fetchSession();
      toast.success(`Đã lưu điểm Vòng 2 cho ${playerIdsToSave.length} thí sinh thành công!`);
    } catch (err: any) {
      toast.error('Lỗi khi lưu điểm hàng loạt: ' + (err.response?.data?.message || err.message));
    } finally {
      setActionLoading(false);
    }
  };

  const handleShowRound2Leaderboard = async (viewType: 'ROUND2_ONLY' | 'CUMULATIVE' | 'PREVIEW_3_ROUNDS' = 'ROUND2_ONLY') => {
    if (!session) return;
    try {
      setActionLoading(true);
      await adminLiveApi.showRound2Leaderboard(session.id, viewType);
      await fetchSession();
      if (viewType === 'ROUND2_ONLY') {
        toast.success('Đã công bố Bảng điểm Vòng 2 (Mã đề, TH1, TH2, Tổng V2) lên màn hình LED!');
      } else if (viewType === 'PREVIEW_3_ROUNDS') {
        toast.success('Đã hiển thị Xem trước Bảng tổng sắp 3 vòng lên màn hình LED!');
      } else {
        toast.success('Đã công bố Bảng tổng hợp điểm tích lũy lên màn hình LED!');
      }
    } catch (err) {
      toast.error('Lỗi công bố bảng điểm');
    } finally {
      setActionLoading(false);
    }
  };

  const handleShowRound2Selecting = async () => {
    if (!session) return;
    try {
      setActionLoading(true);
      await adminLiveApi.showRound2Selecting(session.id);
      await fetchSession();
      toast.success('Đã chuyển màn hình LED về Bảng bốc thăm mã đề!');
    } catch (err) {
      toast.error('Lỗi chuyển màn hình chọn mã đề');
    } finally {
      setActionLoading(false);
    }
  };

  const handleResetRound2Batch = async () => {
    if (!session) return;
    try {
      setActionLoading(true);
      await adminLiveApi.resetRound2Batch(session.id);
      r2TargetEndTimeRef.current = null;
      setR2BatchPlayerIds([]);
      setR2PlayerId('');
      setR2TimerRunning(false);
      setR2Timer(600);
      setR2TimeUp(false);
      await fetchSession();
      toast.success('Đã chuẩn bị sân khấu cho đợt thi tiếp theo!');
    } catch (err) {
      toast.error('Lỗi làm mới đợt thi');
    } finally {
      setActionLoading(false);
    }
  };

  const handleResetRound2Topics = async () => {
    if (!session) return;
    setConfirmDialog({
      title: 'Nạp lại 10 Bộ đề chuẩn BTC',
      message: 'Bạn có chắc chắn muốn nạp lại 10 Bộ đề thực hành chuẩn theo quy chế Hội thi từ Ban Tổ chức?',
      confirmText: 'Nạp lại 10 bộ đề',
      confirmType: 'primary',
      onConfirm: async () => {
        try {
          setActionLoading(true);
          const topics = await adminLiveApi.resetRound2Topics(session.id);
          setRound2Topics(topics);
          toast.success('Đã nạp lại 10 bộ đề thi chuẩn thành công!');
        } catch (err) {
          toast.error('Lỗi nạp lại bộ đề');
        } finally {
          setActionLoading(false);
        }
      },
    });
  };

  // VÒNG 3 ACTIONS
  const handleDrawPairs = async () => {
    if (!session) return;
    setConfirmDialog({
      title: 'Bốc thăm Vòng 3 (Bản lĩnh)',
      message: 'Kích hoạt bốc thăm ghép cặp ngẫu nhiên trực tiếp trên màn hình LED?',
      confirmText: 'Bắt đầu bốc thăm',
      confirmType: 'primary',
      onConfirm: async () => {
        try {
          setActionLoading(true);
          await adminLiveApi.drawRandomPairs(session.id);
          const pairs = await adminLiveApi.getRound3DisplayPairs(session.id);
          if (pairs && pairs.length > 0) {
            setRound3DisplayPairs(pairs);
            setPairSelections(() => {
              const updated: Record<number, { p1: number | ''; p2: number | '' }> = {
                1: { p1: '', p2: '' },
                2: { p1: '', p2: '' },
                3: { p1: '', p2: '' },
                4: { p1: '', p2: '' },
                5: { p1: '', p2: '' },
              };
              pairs.forEach((dp) => {
                if (dp.pairNumber) {
                  updated[dp.pairNumber] = {
                    p1: dp.player1Id ?? dp.player1?.id ?? '',
                    p2: dp.player2Id ?? dp.player2?.id ?? '',
                  };
                }
              });
              return updated;
            });
          }
          await fetchSession();
          toast.success('Đã bốc thăm ghép cặp ngẫu nhiên thành công!');
        } catch (err) {
          toast.error('Lỗi bốc thăm ghép cặp');
        } finally {
          setActionLoading(false);
        }
      },
    });
  };

  const handleAssignRound3Pair = async (pairNumber: number) => {
    if (!session) return;
    const sel = pairSelections[pairNumber];
    if (!sel || !sel.p1 || !sel.p2) {
      toast.error(`Vui lòng chọn đủ 2 thí sinh cho Cặp 0${pairNumber}!`);
      return;
    }
    if (Number(sel.p1) === Number(sel.p2)) {
      toast.error('Không thể chọn cùng 1 thí sinh đối đầu với chính mình!');
      return;
    }
    try {
      setActionLoading(true);
      await adminLiveApi.assignRound3Pair(session.id, pairNumber, Number(sel.p1), Number(sel.p2));
      await fetchSession();
      toast.success(`Đã lưu Cặp 0${pairNumber} thành công! Màn hình LED đã cập nhật.`);
    } catch (err: any) {
      toast.error(err?.response?.data?.message || `Lỗi lưu Cặp 0${pairNumber}`);
    } finally {
      setActionLoading(false);
    }
  };

  const handleDeleteRound3Pair = async (pairNumber: number) => {
    if (!session) return;
    try {
      setActionLoading(true);
      await adminLiveApi.deleteRound3Pair(session.id, pairNumber);
      setPairSelections((prev) => ({
        ...prev,
        [pairNumber]: { p1: '', p2: '' },
      }));
      if (activeDuelPairNumber === pairNumber) {
        setActiveDuelPairNumber(null);
        r3TargetEndTimeRef.current = null;
        setR3TimerRunning(false);
        setR3Timer(0);
        setR3TimeUp(false);
        setR3OvertimeRunning(false);
        setR3OvertimeSeconds(0);
      }
      await fetchSession();
      toast.success(`Đã xóa Cặp 0${pairNumber}! Màn hình LED đã reset về 5 cặp.`);
    } catch (err: any) {
      toast.error(err?.response?.data?.message || `Lỗi xóa Cặp 0${pairNumber}`);
    } finally {
      setActionLoading(false);
    }
  };

  const handleResetAllRound3Pairs = async () => {
    if (!session) return;
    setConfirmDialog({
      title: 'Làm mới toàn bộ 5 Cặp đấu',
      message: 'Bạn có chắc chắn muốn làm mới và xóa toàn bộ 5 cặp đấu Vòng 3 để bốc thăm lại từ đầu?',
      confirmText: 'Làm mới toàn bộ',
      confirmType: 'danger',
      onConfirm: async () => {
        try {
          setActionLoading(true);
          await adminLiveApi.resetAllRound3Pairs(session.id);
          setPairSelections({
            1: { p1: '', p2: '' },
            2: { p1: '', p2: '' },
            3: { p1: '', p2: '' },
            4: { p1: '', p2: '' },
            5: { p1: '', p2: '' },
          });
          setActiveDuelPairNumber(null);
          r3TargetEndTimeRef.current = null;
          setR3TimerRunning(false);
          setR3Timer(0);
          setR3TimeUp(false);
          setR3OvertimeRunning(false);
          setR3OvertimeSeconds(0);
          await fetchSession();
          toast.success('Đã làm mới toàn bộ 5 cặp đấu Vòng 3 thành công! Màn hình LED đã reset về 5 cặp.');
        } catch (err: any) {
          toast.error(err?.response?.data?.message || 'Lỗi làm mới cặp đấu');
        } finally {
          setActionLoading(false);
        }
      },
    });
  };

  // Hiển thị cặp đấu lên màn hình LED ngay khi chọn (dù chưa chọn giai đoạn, chờ BGK đọc đề)
  const handleDisplayRound3Duel = async (pairNumber: number) => {
    if (!session) return;
    try {
      setActionLoading(true);
      setActiveDuelPairNumber(pairNumber);
      setR3DuelStage('PREPARE');
      setR3DuelStageTitle('BAN GIÁM KHẢO CÔNG BỐ ĐỀ');
      setR3DuelDuration(0);
      setR3ActiveSpeakerId(null);
      setR3Timer(0);
      setR3TimerRunning(false);
      setR3TimerPaused(false);
      setR3TimerEnded(false);
      setR3TimeUp(false);
      setR3OvertimeRunning(false);
      setR3OvertimeSeconds(0);
      r3OvertimeTargetStartRef.current = null;
      r3TargetEndTimeRef.current = null;

      const currentPair = round3DisplayPairs.find((p) => p.pairNumber === pairNumber);
      const p1 = currentPair?.player1;
      const p2 = currentPair?.player2;
      if (p1 && p2) {
        setR3ScoresMap((prev) => ({
          ...prev,
          [p1.id]: prev[p1.id] ?? (p1.round3Score !== undefined && p1.round3Score !== null ? Number(p1.round3Score) : 0),
          [p2.id]: prev[p2.id] ?? (p2.round3Score !== undefined && p2.round3Score !== null ? Number(p2.round3Score) : 0),
        }));
        setR3PenaltyMap((prev) => ({
          ...prev,
          [p1.id]: prev[p1.id] ?? 0,
          [p2.id]: prev[p2.id] ?? 0,
        }));
      }

      await adminLiveApi.displayRound3Duel(session.id, pairNumber);
      await fetchSession();
      toast.success(`Đã hiển thị Cặp 0${pairNumber} lên màn hình LED! Ban Giám khảo có thể đọc đề.`);
    } catch (err: any) {
      toast.error(err?.response?.data?.message || 'Lỗi hiển thị cặp đấu lên màn hình LED');
    } finally {
      setActionLoading(false);
    }
  };

  const handleStartRound3Duel = async (
    pairNumber: number,
    stage: string,
    stageTitle: string,
    durationSeconds: number,
    speakerPlayerId?: number
  ) => {
    if (!session) return;
    try {
      setActionLoading(true);
      setR3DuelStage(stage);
      setR3DuelStageTitle(stageTitle);
      setR3DuelDuration(durationSeconds);
      setR3ActiveSpeakerId(speakerPlayerId ?? null);
      setR3OvertimeRunning(false);
      setR3OvertimeSeconds(0);
      r3OvertimeTargetStartRef.current = null;

      await adminLiveApi.startRound3Duel(session.id, pairNumber, stage, stageTitle, durationSeconds, speakerPlayerId);
      const endAt = Date.now() + durationSeconds * 1000;
      r3TargetEndTimeRef.current = endAt;
      setR3Timer(durationSeconds);
      setR3TimerRunning(true);
      setR3TimerPaused(false);
      setR3TimerEnded(false);
      setR3TimeUp(false);
      await fetchSession();
      toast.success(`Đã phát lệnh thi đấu Cặp 0${pairNumber}: ${stageTitle}!`);
    } catch (err: any) {
      toast.error(err?.response?.data?.message || 'Lỗi bắt đầu phần thi');
    } finally {
      setActionLoading(false);
    }
  };

  const handlePauseRound3DuelTimer = async () => {
    if (!session) return;
    try {
      setActionLoading(true);
      await adminLiveApi.pauseRound3Timer(session.id);
      setR3TimerRunning(false);
      setR3TimerPaused(true);
      toast.info('Đã tạm dừng đồng hồ Vòng 3.');
    } catch (err: any) {
      toast.error(err?.response?.data?.message || 'Lỗi tạm dừng');
    } finally {
      setActionLoading(false);
    }
  };

  const handleResumeRound3DuelTimer = async () => {
    if (!session) return;
    try {
      setActionLoading(true);
      await adminLiveApi.resumeRound3Timer(session.id);
      r3TargetEndTimeRef.current = Date.now() + r3Timer * 1000;
      setR3TimerRunning(true);
      setR3TimerPaused(false);
      toast.success('Đã tiếp tục đếm ngược thời gian.');
    } catch (err: any) {
      toast.error(err?.response?.data?.message || 'Lỗi tiếp tục');
    } finally {
      setActionLoading(false);
    }
  };

  const handleResetRound3DuelTimer = async () => {
    if (!session) return;
    try {
      setActionLoading(true);
      await adminLiveApi.resetRound3Timer(session.id);
      r3TargetEndTimeRef.current = null;
      r3OvertimeTargetStartRef.current = null;
      setR3Timer(r3DuelDuration || 120);
      setR3TimerRunning(false);
      setR3TimerPaused(false);
      setR3TimeUp(false);
      setR3TimerEnded(false);
      setR3OvertimeRunning(false);
      setR3OvertimeSeconds(0);
      toast.success('Đã thiết lập lại đồng hồ về thời gian ban đầu.');
    } catch (err: any) {
      toast.error(err?.response?.data?.message || 'Lỗi làm mới đồng hồ');
    } finally {
      setActionLoading(false);
    }
  };

  const handleEndRound3DuelTimer = async () => {
    if (!session) return;
    if (r3TimerEnded && !r3TimerRunning && !r3OvertimeRunning) {
      toast.info('Phần thi đã được chốt kết thúc.');
      return;
    }
    try {
      setActionLoading(true);
      const finalSec = Math.max(0, Number(r3OvertimeSeconds || 0));
      await adminLiveApi.endRound3Timer(session.id, finalSec);
      r3TargetEndTimeRef.current = null;
      r3OvertimeTargetStartRef.current = null;
      setR3TimerRunning(false);
      setR3TimerPaused(false);
      setR3TimeUp(true);
      setR3TimerEnded(true);
      setR3OvertimeRunning(false);

      const suggestedPenalty = finalSec >= 15 ? Math.floor(finalSec / 15) * 5 : 0;
      const targetPlayerId = r3OvertimePlayerId ?? r3ActiveSpeakerId;
      if (targetPlayerId) {
        setR3PenaltyMap((prev) => ({
          ...prev,
          [targetPlayerId]: (prev[targetPlayerId] || 0) + suggestedPenalty,
        }));
      }

      try {
        await fetchSession();
      } catch (fetchErr) {
        console.warn('Lỗi fetchSession sau khi end timer:', fetchErr);
      }

      if (finalSec > 0) {
        toast.warning(`Đã chốt kết thúc phần thi! Quá giờ: ${finalSec}s (Gợi ý trừ: ${suggestedPenalty}đ).`);
      } else {
        toast.success('Đã chốt kết thúc phần thi đúng thời gian!');
      }
    } catch (err: any) {
      toast.error(err?.response?.data?.message || 'Lỗi kết thúc đếm giờ');
    } finally {
      setActionLoading(false);
    }
  };

  const handleStopRound3DuelTimer = async () => {
    await handleEndRound3DuelTimer();
  };

  const handleSaveAllR3Scores = async () => {
    if (!session?.players) return;
    try {
      setActionLoading(true);
      const promises = session.players.map((p) => {
        const raw = Number(r3ScoresMap[p.id] ?? (p.round3Score ? Number(p.round3Score) : 0));
        const pen = Number(r3PenaltyMap[p.id] ?? p.round3SuggestedPenalty ?? 0);
        const finalScore = Math.max(0, raw - pen);
        return adminLiveApi.updateRound3Score(p.id, finalScore);
      });
      await Promise.all(promises);
      await fetchSession();
      toast.success('Đã lưu toàn bộ điểm Vòng 3 cho 10 thí sinh thành công!');
    } catch (err: any) {
      toast.error(err?.response?.data?.message || 'Lỗi lưu điểm');
    } finally {
      setActionLoading(false);
    }
  };

  const handleStartRound3Overtime = async (playerId?: number) => {
    if (!session) return;
    try {
      setActionLoading(true);
      const targetId = playerId ?? r3ActiveSpeakerId ?? undefined;
      await adminLiveApi.startRound3Overtime(session.id, targetId);
      r3OvertimeTargetStartRef.current = Date.now();
      setR3OvertimeRunning(true);
      setR3OvertimeSeconds(0);
      setR3OvertimePlayerId(targetId ?? null);
      await fetchSession();
      toast.success('Đang tính thời gian quá giờ (+)!');
    } catch (err: any) {
      toast.error(err?.response?.data?.message || 'Lỗi bắt đầu tính quá giờ');
    } finally {
      setActionLoading(false);
    }
  };

  const handleStopRound3Overtime = async () => {
    if (!session) return;
    try {
      setActionLoading(true);
      const finalSec = r3OvertimeSeconds;
      await adminLiveApi.stopRound3Overtime(session.id, finalSec);
      setR3OvertimeRunning(false);
      r3OvertimeTargetStartRef.current = null;

      // Công thức thể lệ: Cứ quá 15s trừ 5 điểm (15-29s: 5đ, 30-44s: 10đ...)
      const suggestedPenalty = finalSec >= 15 ? Math.floor(finalSec / 15) * 5 : 0;
      const targetPlayerId = r3OvertimePlayerId ?? r3ActiveSpeakerId;
      if (targetPlayerId) {
        setR3PenaltyMap((prev) => ({
          ...prev,
          [targetPlayerId]: suggestedPenalty,
        }));
      }

      await fetchSession();
      toast.success(`Đã dừng đếm quá giờ: ${finalSec}s. Tự động gợi ý trừ: ${suggestedPenalty} điểm.`);
    } catch (err: any) {
      toast.error(err?.response?.data?.message || 'Lỗi dừng tính quá giờ');
    } finally {
      setActionLoading(false);
    }
  };

  const handleShowAllRound3Pairs = async () => {
    if (!session) return;
    try {
      setActionLoading(true);
      await adminLiveApi.showAllRound3Pairs(session.id);
      setActiveDuelPairNumber(null);
      r3TargetEndTimeRef.current = null;
      setR3TimerRunning(false);
      setR3TimeUp(false);
      setR3OvertimeRunning(false);
      setR3OvertimeSeconds(0);
      await fetchSession();
      toast.success('Đã chuyển màn hình LED về Tổng quan 5 Cặp đấu!');
    } catch (err: any) {
      toast.error(err?.response?.data?.message || 'Lỗi chuyển màn hình tổng quan');
    } finally {
      setActionLoading(false);
    }
  };

  const handleShowRound3Rules = async () => {
    if (!session) return;
    try {
      setActionLoading(true);
      await adminLiveApi.showRound3Rules(session.id);
      setActiveDuelPairNumber(null);
      r3TargetEndTimeRef.current = null;
      setR3TimerRunning(false);
      setR3TimeUp(false);
      setR3OvertimeRunning(false);
      setR3OvertimeSeconds(0);
      await fetchSession();
      toast.success('Đã chuyển màn hình LED sang phổ biến Thể lệ Vòng 3!');
    } catch (err: any) {
      toast.error(err?.response?.data?.message || 'Lỗi hiển thị thể lệ Vòng 3');
    } finally {
      setActionLoading(false);
    }
  };

  const handleSaveDuelScores = async (p1Id: number, p2Id: number) => {
    const rawSc1 = Number(r3ScoresMap[p1Id] ?? 0);
    const rawSc2 = Number(r3ScoresMap[p2Id] ?? 0);
    const pen1 = Number(r3PenaltyMap[p1Id] ?? 0);
    const pen2 = Number(r3PenaltyMap[p2Id] ?? 0);
    const finalSc1 = Math.max(0, rawSc1 - pen1);
    const finalSc2 = Math.max(0, rawSc2 - pen2);

    try {
      setActionLoading(true);
      await Promise.all([
        adminLiveApi.updateRound3Score(p1Id, finalSc1),
        adminLiveApi.updateRound3Score(p2Id, finalSc2),
      ]);
      await fetchSession();
      toast.success(`Đã lưu điểm Cặp 0${activeDuelPairNumber}: TS1 = ${finalSc1}đ, TS2 = ${finalSc2}đ thành công!`);
    } catch (err: any) {
      toast.error(err?.response?.data?.message || 'Lỗi lưu điểm cặp đấu');
    } finally {
      setActionLoading(false);
    }
  };

  const handleSaveSingleR3Score = async (playerId: number, rawScore?: number, penScore?: number) => {
    try {
      setActionLoading(true);
      const raw = rawScore !== undefined ? rawScore : Number(r3ScoresMap[playerId] ?? 0);
      const pen = penScore !== undefined ? penScore : Number(r3PenaltyMap[playerId] ?? 0);
      const finalScore = Math.max(0, raw - pen);
      await adminLiveApi.updateRound3Score(playerId, finalScore);
      await fetchSession();
      toast.success(`Đã cập nhật điểm Vòng 3: ${finalScore}đ (${raw}đ - trừ ${pen}đ quá giờ)!`);
    } catch (err: any) {
      toast.error(err?.response?.data?.message || 'Lỗi cập nhật điểm Vòng 3');
    } finally {
      setActionLoading(false);
    }
  };

  const handleSaveRound3Score = async () => {
    if (!r3PlayerId) {
      toast.error('Vui lòng chọn thí sinh!');
      return;
    }
    try {
      setActionLoading(true);
      await adminLiveApi.updateRound3Score(Number(r3PlayerId), r3Score);
      await fetchSession();
      toast.success('Đã cập nhật điểm Vòng 3 thành công!');
    } catch (err) {
      toast.error('Lỗi cập nhật điểm Vòng 3');
    } finally {
      setActionLoading(false);
    }
  };

  // FINISH & AWARDS
  const handleFinishSession = async () => {
    if (!session) return;
    setConfirmDialog({
      title: 'Hoàn tất & Vinh danh Chung cuộc',
      message: 'Xác nhận hoàn tất cả 3 vòng thi, chốt bảng điểm và kích hoạt Bục vinh danh trao giải trên màn hình LED?',
      confirmText: 'Kích hoạt Bục vinh danh',
      confirmType: 'primary',
      onConfirm: async () => {
        try {
          setActionLoading(true);
          await adminLiveApi.finishSession(session.id);
          try {
            await adminLiveApi.switchFinishViewMode(session.id, 'PODIUM');
          } catch (e) {}
          setActiveTab('finish');
          await fetchSession();
          toast.success('Đã kích hoạt Bục vinh danh và hoàn tất hội thi thành công!');
        } catch (err: any) {
          toast.error(err?.response?.data?.message || 'Lỗi kết thúc hội thi');
        } finally {
          setActionLoading(false);
        }
      },
    });
  };

  const handleSwitchFinishViewMode = async (mode: 'BOARD' | 'PODIUM') => {
    if (!session) return;
    try {
      setActionLoading(true);
      await adminLiveApi.switchFinishViewMode(session.id, mode);
      await fetchSession();
      toast.success(
        mode === 'PODIUM'
          ? 'Đã chuyển màn hình LED sang BỤC VINH DANH!'
          : 'Đã chuyển màn hình LED sang BẢNG ĐIỂM 3 VÒNG!'
      );
    } catch (err) {
      toast.error('Lỗi chuyển chế độ hiển thị');
    } finally {
      setActionLoading(false);
    }
  };

  const [resetContestModalOpen, setResetContestModalOpen] = useState(false);

  const handleConfirmResetContest = async () => {
    try {
      setActionLoading(true);
      const active = await liveApi.getActiveSession().catch(() => null);
      const targetId = active?.id || session?.id;
      await adminLiveApi.resetSession(targetId);
      toast.success('Đã reset đợt thi và làm sạch toàn bộ dữ liệu thi test của 3 vòng thành công!');
      setResetContestModalOpen(false);
      await fetchSession();
    } catch (err: any) {
      const errMsg = err?.response?.data?.message || err?.message || 'Lỗi khi reset đợt thi';
      toast.error(errMsg);
    } finally {
      setActionLoading(false);
    }
  };

  const round1State = session?.round1State || 'IDLE';

  return (
    <div className="flex flex-col lg:flex-row min-h-screen bg-slate-50 font-sans">
      <AdminSidebar active="live-control" />
      <main className="flex-1 p-4 sm:p-6 lg:p-8 space-y-6 min-w-0 max-w-full overflow-x-hidden">
      {/* Top Cockpit Header */}
      <header className="bg-white border-b border-slate-200 px-6 py-3 flex items-center justify-between sticky top-0 z-40">
        <div className="flex items-center gap-4">
          <div className="w-10 h-10 rounded-xl bg-red-600 flex items-center justify-center font-black text-amber-700 shadow">
            MC
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-base font-black text-slate-900 uppercase tracking-wide">
                BÀN ĐIỀU HÀNH SÂN KHẤU VÒNG CHUNG KẾT
              </h1>
              <span
                className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold ${
                  isConnected
                    ? 'bg-emerald-950 text-emerald-600 border border-emerald-700'
                    : 'bg-rose-950 text-rose-400 border border-rose-700'
                }`}
              >
                <span className={`w-2 h-2 rounded-full ${isConnected ? 'bg-emerald-400 animate-pulse' : 'bg-rose-400'}`} />
                {isConnected ? 'Realtime Kết nối' : 'Mất kết nối'}
              </span>
            </div>
            <p className="text-xs text-slate-500">
              Phiên thi: <strong className="text-slate-700">{session?.name}</strong> • Trạng thái: <strong className="text-amber-600">{session?.status}</strong>
            </p>
          </div>
        </div>

        {/* Quick Screen Links */}
        <div className="flex items-center gap-2">
          <button
            type="button"
            disabled={actionLoading}
            onClick={() => handleSwitchFinishViewMode('BOARD')}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-blue-50 hover:bg-blue-100 border border-blue-300 text-blue-800 font-bold text-xs shadow-xs transition-all active:scale-95"
            title="Chiếu Bảng tổng điểm tích lũy 3 vòng lên màn LED ở bất kỳ vòng nào (không kết thúc hội thi)"
          >
            <BarChart3 className="w-3.5 h-3.5 text-blue-700" />
            <span>Chiếu Bảng điểm 3 vòng (LED)</span>
          </button>
          <button
            onClick={() => setResetContestModalOpen(true)}
            disabled={actionLoading}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-gradient-to-r from-rose-50 to-red-50 hover:from-rose-100 hover:to-red-100 border border-rose-300 text-rose-700 font-bold text-xs shadow-xs transition-all active:scale-95"
            title="Xóa toàn bộ dữ liệu kết quả thi test của 3 vòng, đưa phòng thi về trạng thái ban đầu"
          >
            <RotateCcw className="w-3.5 h-3.5 text-rose-600" />
            <span>Reset đợt thi (Xóa dữ liệu test)</span>
          </button>
          <a
            href="/live/screen"
            target="_blank"
            rel="noreferrer"
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs shadow transition-all"
          >
            <Eye className="w-4 h-4" /> Mở màn LED sân khấu
          </a>
          <a
            href="/live/play"
            target="_blank"
            rel="noreferrer"
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-200 hover:bg-slate-300 border border-slate-300 text-slate-700 font-bold text-xs transition-all"
          >
            <ExternalLink className="w-4 h-4" /> Xem màn di động thí sinh
          </a>
          <button
            onClick={fetchSession}
            className="p-1.5 rounded-xl bg-slate-200 border border-slate-300 text-slate-500 hover:text-slate-900"
            title="Đồng bộ lại"
          >
            <RefreshCw className={`w-4 h-4 ${actionLoading ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </header>

      {/* Navigation Tabs */}
      <div className="bg-white/60 border-b border-slate-200 px-6 flex items-center justify-between overflow-x-auto gap-4">
        <div className="flex items-center gap-1">
          {[
            { key: 'lobby', label: '1. Sảnh Chờ & Điểm danh', round: 1, status: 'LOBBY' },
            { key: 'round1', label: '2. Vòng 1: Thông thái (10 câu)', round: 1, status: 'ROUND1' },
            { key: 'round2', label: '3. Vòng 2: Nhạy bén (10p)', round: 2, status: 'ROUND2' },
            { key: 'round3', label: '4. Vòng 3: Bản lĩnh (Đối kháng)', round: 3, status: 'ROUND3' },
            { key: 'finish', label: '5. Tổng kết & Vinh danh', round: 3, status: 'FINISHED' },
          ].map((tab) => {
            const isStageActive = session?.status === tab.status;
            return (
              <button
                key={tab.key}
                onClick={() => setActiveTab(tab.key as any)}
                className={`py-3 px-4 text-xs font-bold border-b-2 transition-all flex items-center gap-2 whitespace-nowrap ${
                  activeTab === tab.key
                    ? 'border-amber-400 text-amber-600 bg-amber-500/10'
                    : 'border-transparent text-slate-500 hover:text-slate-700 hover:bg-slate-200/40'
                }`}
              >
                <span>{tab.label}</span>
                {isStageActive && (
                  <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" title="Sân khấu đang ở vòng này" />
                )}
              </button>
            );
          })}
        </div>

        {/* Stage Status Sync Indicator & Quick Trigger Button */}
        {(() => {
          const tabMeta = [
            { key: 'lobby', label: 'Sảnh Chờ & Điểm danh', round: 1, status: 'LOBBY' },
            { key: 'round1', label: 'Vòng 1: Thông thái', round: 1, status: 'ROUND1' },
            { key: 'round2', label: 'Vòng 2: Nhạy bén', round: 2, status: 'ROUND2' },
            { key: 'round3', label: 'Vòng 3: Bản lĩnh', round: 3, status: 'ROUND3' },
            { key: 'finish', label: 'Tổng kết & Vinh danh', round: 3, status: 'FINISHED' },
          ].find((t) => t.key === activeTab);

          if (!tabMeta || session?.status === tabMeta.status) return null;

          const currentOrder = STAGE_ORDER[session?.status || 'LOBBY'] ?? 0;
          const targetOrder = STAGE_ORDER[tabMeta.status] ?? 0;
          const isBackward = targetOrder < currentOrder;

          return (
            <div className="flex items-center gap-2 py-1.5 shrink-0 animate-fadeIn">
              <span className="text-[11px] text-slate-500 hidden md:inline">
                Sân khấu LED đang ở:{' '}
                <strong className="text-blue-700">
                  {STAGE_CONFIG[session?.status || 'LOBBY']?.shortName || session?.status}
                </strong>
              </span>
              <button
                onClick={() => handleRequestStageChange(tabMeta.status, tabMeta.round, tabMeta.key as any)}
                className={`px-3 py-1.5 rounded-xl font-black text-xs shadow transition-all flex items-center gap-1.5 active:scale-95 ${
                  isBackward
                    ? 'bg-rose-600 hover:bg-rose-500 text-white ring-2 ring-rose-300'
                    : 'bg-amber-500 hover:bg-amber-400 text-slate-950 ring-2 ring-amber-300'
                }`}
              >
                {isBackward ? (
                  <AlertTriangle className="w-3.5 h-3.5 text-white animate-pulse" />
                ) : (
                  <Radio className="w-3.5 h-3.5 text-slate-950 animate-pulse" />
                )}
                <span>
                  {isBackward
                    ? `⚠️ CHUYỂN NGƯỢC SÂN KHẤU VỀ ${tabMeta.label.toUpperCase()}`
                    : `KÍCH HOẠT SÂN KHẤU SANG ${tabMeta.label.toUpperCase()}`}
                </span>
              </button>
            </div>
          );
        })()}
      </div>

      {/* Main Cockpit Body */}
      <div className="w-full space-y-6">
        {/* ========================================================= */}
        {activeTab === 'lobby' && (() => {
          const checkedInCount = session?.players?.filter((p) => p.isCheckedIn).length || 0;
          const missingPlayers = session?.players?.filter((p) => !p.isCheckedIn) || [];
          const rescueRequestedPlayers = session?.players?.filter((p) => !p.isCheckedIn && p.isRescueRequested) || [];
          return (
            <div className="space-y-4 animate-fadeIn">
              {/* Rescue Alert Banner if any player requested help */}
              {rescueRequestedPlayers.length > 0 && (
                <div className="bg-gradient-to-r from-amber-500/15 via-rose-500/15 to-amber-500/15 border-2 border-amber-500 rounded-2xl p-4 shadow-lg flex items-center justify-between flex-wrap gap-3 animate-pulse">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-amber-500 text-slate-950 flex items-center justify-center font-black">
                      <Siren className="w-6 h-6 animate-bounce" />
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-black uppercase text-amber-700 bg-amber-100 px-2 py-0.5 rounded-full border border-amber-300">
                          Yêu cầu khẩn cấp
                        </span>
                        <h3 className="text-sm font-black text-slate-900">
                          Có {rescueRequestedPlayers.length} thí sinh đang yêu cầu Ban Tổ chức cứu hộ duyệt vào phòng!
                        </h3>
                      </div>
                      <p className="text-xs text-slate-600 mt-0.5">
                        Thí sinh không nhận được mã OTP trên điện thoại hoặc đổi thiết bị đột xuất. Vui lòng kiểm tra danh sách và bấm [Duyệt vào phòng] hoặc [Cấp mã OTP].
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    {rescueRequestedPlayers.map((rp) => (
                      <button
                        key={rp.id}
                        onClick={() => handleBypassCheckIn(rp.id)}
                        className="px-3 py-1.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 text-xs font-black shadow-md flex items-center gap-1.5 transition-all active:scale-95"
                      >
                        <CheckCircle2 className="w-3.5 h-3.5" />
                        <span>Duyệt SBD {String(rp.orderNumber).padStart(2, '0')} ({rp.fullName})</span>
                      </button>
                    ))}
                  </div>
                </div>
              )}

              <div className="flex items-center justify-between bg-white border border-slate-200 p-4 rounded-2xl flex-wrap gap-4">
                <div>
                  <div className="flex items-center gap-2">
                    <h2 className="text-base font-black text-slate-900">ĐIỂM DANH 10 THÍ SINH VÀO PHÒNG CHỜ</h2>
                    <span className={`px-2.5 py-0.5 rounded-full text-xs font-black ${
                      checkedInCount === 10
                        ? 'bg-emerald-500/20 text-emerald-600 border border-emerald-500/40'
                        : 'bg-amber-500/20 text-amber-600 border border-amber-500/40'
                    }`}>
                      {checkedInCount}/10 thí sinh đã vào
                    </span>
                  </div>
                  <p className="text-xs text-slate-500 mt-1">
                    Thí sinh tự nhập mã OTP trên điện thoại để vào phòng. Nút duyệt trực tiếp chỉ hiển thị khi thí sinh bấm Yêu cầu cứu hộ do không nhận được OTP.
                  </p>
                </div>

                <button
                  onClick={() => {
                    if (checkedInCount < 10) {
                      setShowLobbyWarningModal(true);
                    } else {
                      handleSetRound(1, 'ROUND1');
                    }
                  }}
                  className={`px-5 py-2.5 rounded-xl font-black text-xs shadow-lg transition-all flex items-center gap-2 active:scale-95 ${
                    checkedInCount === 10
                      ? 'bg-gradient-to-r from-emerald-500 to-green-600 hover:from-emerald-400 hover:to-green-500 text-slate-950 ring-4 ring-emerald-500/40 animate-pulse'
                      : 'bg-gradient-to-r from-amber-600 to-orange-600 text-slate-900 hover:brightness-110'
                  }`}
                >
                  <span>BẮT ĐẦU VÒNG 1 (THÔNG THÁI)</span>
                  <span className="px-2 py-0.5 rounded-full bg-black/20 text-[10px]">
                    {checkedInCount}/10
                  </span>
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3">
                {session?.players?.map((p) => (
                  <div
                    key={p.id}
                    className={`p-4 rounded-2xl border flex flex-col justify-between transition-all relative ${
                      p.isRescueRequested
                        ? 'bg-amber-50 border-amber-500 ring-2 ring-amber-500/50 shadow-lg shadow-amber-500/10'
                        : p.isCheckedIn
                        ? 'bg-emerald-50/50 border-emerald-400/60'
                        : 'bg-white border-slate-200'
                    }`}
                  >
                    <div>
                      {/* Top Header */}
                      <div className="flex items-center justify-between mb-3">
                        <span className={`w-7 h-7 rounded-lg font-black text-xs flex items-center justify-center ${
                          p.isRescueRequested
                            ? 'bg-amber-500 text-slate-950 animate-bounce'
                            : p.isCheckedIn
                            ? 'bg-emerald-600 text-white'
                            : 'bg-slate-200 text-slate-700'
                        }`}>
                          {String(p.orderNumber).padStart(2, '0')}
                        </span>
                        {p.isCheckedIn ? (
                          <span className="text-[10px] font-bold text-emerald-700 bg-emerald-100 px-2 py-0.5 rounded-full border border-emerald-300">
                            ✓ Đã vào phòng
                          </span>
                        ) : p.isRescueRequested ? (
                          <span className="text-[10px] font-black text-amber-900 bg-amber-200 px-2.5 py-0.5 rounded-full border border-amber-500 animate-pulse flex items-center gap-1">
                            <Siren className="w-3 h-3 text-amber-700" /> Cần cứu hộ OTP
                          </span>
                        ) : (
                          <span className="text-[10px] text-slate-500 bg-slate-100 px-2 py-0.5 rounded-full border border-slate-200">
                            Chờ nhập OTP...
                          </span>
                        )}
                      </div>

                      {/* Avatar & Info */}
                      <div className="flex items-center gap-2.5 mb-2.5">
                        <div className="relative group">
                          {p.avatarUrl ? (
                            <img
                              src={p.avatarUrl}
                              alt=""
                              className="w-10 h-10 rounded-xl object-cover border border-slate-300 shrink-0"
                            />
                          ) : (
                            <div className="w-10 h-10 rounded-xl bg-slate-200 text-slate-600 flex items-center justify-center font-bold text-sm shrink-0 border border-slate-300">
                              {p.fullName.slice(0, 1)}
                            </div>
                          )}
                          <button
                            onClick={() => {
                              setAvatarModalPlayer(p);
                              setAvatarUrlInput(p.avatarUrl || '');
                            }}
                            className="absolute -bottom-1 -right-1 w-5 h-5 rounded-full bg-blue-600 hover:bg-blue-500 text-white flex items-center justify-center text-[9px] shadow"
                            title="Đổi ảnh đại diện"
                          >
                            ✎
                          </button>
                        </div>
                        <div className="min-w-0 flex-1">
                          <div className="font-bold text-slate-900 text-xs truncate" title={p.fullName}>
                            {p.fullName}
                          </div>
                          <div className="text-[11px] text-slate-500 truncate" title={p.unit}>
                            {p.unit}
                          </div>
                        </div>
                      </div>

                      <div className="text-[10px] text-slate-500 truncate font-mono">
                        {p.email || 'Chưa cập nhật email'}
                      </div>
                    </div>

                    {/* Actions Area */}
                    <div className="mt-3 pt-2.5 border-t border-slate-200/80 space-y-1.5">
                      {p.isCheckedIn ? (
                        /* Player already checked in -> Option to reset if needed */
                        <button
                          onClick={() => handleResetCheckIn(p.id)}
                          className="w-full py-1.5 rounded-xl bg-slate-100 hover:bg-red-50 hover:text-red-700 hover:border-red-300 border border-slate-200 text-[10px] text-slate-500 font-semibold transition-all flex items-center justify-center gap-1"
                        >
                          <XCircle className="w-3 h-3 text-red-500" />
                          <span>Mời ra khỏi phòng</span>
                        </button>
                      ) : p.isRescueRequested ? (
                        /* Player REQUESTED RESCUE -> Highlighted buttons for Admin */
                        <div className="space-y-1.5">
                          <button
                            onClick={() => handleBypassCheckIn(p.id)}
                            className="w-full py-2 rounded-xl font-black text-xs transition-all flex items-center justify-center gap-1.5 bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-400 hover:to-orange-400 text-slate-950 shadow-md shadow-amber-500/30 active:scale-95 ring-2 ring-amber-400"
                          >
                            <CheckCircle2 className="w-4 h-4 text-slate-950" />
                            <span>DUYỆT VÀO PHÒNG NGAY</span>
                          </button>
                          <button
                            onClick={() => handleGenerateSupportOtp(p)}
                            className="w-full py-1.5 rounded-xl bg-white hover:bg-slate-50 text-slate-700 border border-slate-300 text-[10px] font-bold transition-all flex items-center justify-center gap-1"
                          >
                            <KeyRound className="w-3 h-3 text-amber-600" />
                            <span>Cấp mã OTP cứu hộ</span>
                          </button>
                        </div>
                      ) : (
                        /* Normal waiting state -> No approval button */
                        <div className="py-2 px-2 rounded-xl bg-slate-50 border border-dashed border-slate-200 text-center">
                          <p className="text-[10px] text-slate-400 font-medium">
                            Chờ thí sinh nhập mã OTP...
                          </p>
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>

              {/* Warning Modal if checkedIn < 10 */}
              {showLobbyWarningModal && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4 animate-fadeIn">
                  <div className="bg-white border-2 border-amber-500 rounded-3xl p-6 max-w-lg w-full space-y-4 shadow-2xl text-slate-900">
                    <div className="flex items-center gap-3 text-amber-600">
                      <Shield className="w-8 h-8 shrink-0 text-amber-600" />
                      <div>
                        <h3 className="text-base font-black uppercase">CẢNH BÁO KỸ THUẬT ĐIỂM DANH</h3>
                        <p className="text-xs text-slate-600">Hiện chỉ có {checkedInCount}/10 thí sinh đã vào phòng chờ!</p>
                      </div>
                    </div>

                    <div className="p-3.5 bg-slate-50/80 border border-slate-200 rounded-2xl space-y-2">
                      <p className="text-[11px] font-bold uppercase text-slate-500">Danh sách thí sinh chưa vào:</p>
                      <div className="space-y-1.5 max-h-40 overflow-y-auto pr-1">
                        {missingPlayers.map((p) => (
                          <div
                            key={p.id}
                            className="text-xs text-rose-300 flex items-center justify-between py-1 border-b border-slate-200/60 last:border-none"
                          >
                            <span>SBD {String(p.orderNumber).padStart(2, '0')}: {p.fullName}</span>
                            <span className="text-[10px] text-slate-500">{p.unit}</span>
                          </div>
                        ))}
                      </div>
                    </div>

                    <p className="text-xs text-amber-200/90 italic">
                      Lưu ý: Chỉ bắt đầu khi có chỉ đạo đặc biệt từ Ban Tổ chức hoặc đang chạy kịch bản thử nghiệm tổng duyệt.
                    </p>

                    <div className="flex gap-3 pt-2">
                      <button
                        onClick={() => setShowLobbyWarningModal(false)}
                        className="flex-1 py-2.5 rounded-xl border border-slate-300 bg-slate-200 hover:bg-slate-300 text-slate-600 font-bold text-xs"
                      >
                        HỦY, TIẾP TỤC CHỜ
                      </button>
                      <button
                        onClick={() => {
                          setShowLobbyWarningModal(false);
                          handleSetRound(1, 'ROUND1');
                        }}
                        className="flex-1 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-black text-xs shadow-lg"
                      >
                        XÁC NHẬN VẪN BẮT ĐẦU
                      </button>
                    </div>
                  </div>
                </div>
              )}

              {/* Avatar Update Modal */}
              {avatarModalPlayer && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4 animate-fadeIn">
                  <div className="bg-white border border-slate-200 rounded-3xl p-5 max-w-sm w-full space-y-4 text-slate-900">
                    <h3 className="text-sm font-black text-slate-900">
                      Cập nhật Avatar: {avatarModalPlayer.fullName}
                    </h3>
                    <input
                      type="text"
                      placeholder="Dán URL ảnh đại diện..."
                      value={avatarUrlInput}
                      onChange={(e) => setAvatarUrlInput(e.target.value)}
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2.5 text-xs text-slate-900"
                    />
                    {avatarUrlInput && (
                      <div className="flex justify-center">
                        <img
                          src={avatarUrlInput}
                          alt="preview"
                          className="w-20 h-20 rounded-2xl object-cover border border-slate-300"
                        />
                      </div>
                    )}
                    <div className="flex gap-2">
                      <button
                        onClick={() => setAvatarModalPlayer(null)}
                        className="flex-1 py-2 rounded-xl bg-slate-200 text-slate-600 text-xs font-bold"
                      >
                        Hủy
                      </button>
                      <button
                        onClick={handleSaveAvatar}
                        className="flex-1 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold"
                      >
                        Lưu ảnh
                      </button>
                    </div>
                  </div>
                </div>
              )}
            </div>
          );
        })()}

        {/* ========================================================= */}
        {/* TAB 2: VÒNG 1 - THÔNG THÁI (QUY TRÌNH 2 NÚT THÔNG MINH) */}
        {activeTab === 'round1' && (() => {
          const answeredCount = Object.keys(questionAnswers).length;
          const totalPlayers = session?.players?.length || 10;
          const answeredPercent = Math.min(100, Math.round((answeredCount / totalPlayers) * 100));
          const is40sRunning = round1State === 'QUESTION_40S';
          const isReading = round1State === 'QUESTION_READING';
          const isHopeStar = round1State === 'HOPE_STAR_5S';
          const isAnswerRevealed = round1State === 'ANSWER_REVEALED';
          const isLeaderboard = round1State === 'LEADERBOARD';
          const isRevealed = isAnswerRevealed || isLeaderboard;

          return (
            <div className="space-y-6 animate-fadeIn">
              {/* Question Selector Strip */}
              <div className="bg-white border border-slate-200 rounded-2xl p-3 flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-xs">
                <div className="flex items-center gap-1.5 overflow-x-auto">
                  <span className="text-xs font-black text-slate-500 uppercase mr-2 shrink-0">CÂU HỎI:</span>
                  {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((order) => (
                    <button
                      key={order}
                      disabled={is40sRunning}
                      onClick={() => handleTransitionQuestion(order)}
                      className={`w-9 h-9 rounded-xl font-black text-xs transition-all flex items-center justify-center shrink-0 ${
                        currentQuestionOrder === order
                          ? 'bg-amber-500 text-slate-950 shadow-md ring-2 ring-amber-300 scale-105'
                          : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                      } ${is40sRunning ? 'opacity-50 cursor-not-allowed' : ''}`}
                      title={is40sRunning ? 'Đang trong 40s tính giờ, không thể đổi câu' : `Chuyển sang Câu ${order}`}
                    >
                      {order}
                    </button>
                  ))}
                </div>

                <div className="flex items-center gap-2 shrink-0">
                  <span className="text-xs font-bold text-slate-500">Trạng thái:</span>
                  <span className={`px-3 py-1 rounded-full text-xs font-black uppercase ${
                    isHopeStar
                      ? 'bg-amber-100 text-amber-800 border border-amber-300 animate-pulse'
                      : isReading
                      ? 'bg-blue-100 text-blue-800 border border-blue-300'
                      : is40sRunning
                      ? 'bg-emerald-100 text-emerald-800 border border-emerald-300 animate-pulse'
                      : isAnswerRevealed
                      ? 'bg-purple-100 text-purple-800 border border-purple-300 animate-pulse'
                      : isLeaderboard
                      ? 'bg-amber-100 text-amber-800 border border-amber-300'
                      : 'bg-slate-100 text-slate-700'
                  }`}>
                    {isHopeStar && `5S CHỌN NGÔI SAO HY VỌNG (${hopeStarCountdown}s)`}
                    {isReading && 'KẾT QUẢ NGÔI SAO HY VỌNG'}
                    {is40sRunning && `ĐANG TÍNH GIỜ 40S (${questionCountdown}s)`}
                    {isAnswerRevealed && 'ĐÃ HIỆN ĐÁP ÁN & BIỂU ĐỒ'}
                    {isLeaderboard && 'ĐÃ HIỆN KẾT QUẢ 10 THÍ SINH & BXH'}
                    {!isHopeStar && !isReading && !is40sRunning && !isRevealed && 'CHƯA BẮT ĐẦU'}
                  </span>
                </div>
              </div>

              {/* BẢNG ĐIỀU HÀNH VÒNG 1 */}
              <div className="bg-white border border-slate-200 rounded-3xl p-6 shadow-sm">
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-5 border-b border-slate-100 pb-4">
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="px-3 py-1 rounded-full bg-blue-600 text-white font-bold text-xs uppercase tracking-wide">
                        CÂU HỎI {currentQuestionOrder} / 10
                      </span>
                      <h2 className="text-base sm:text-lg font-bold text-slate-900 tracking-tight">
                        Điều hành Vòng 1 — Câu hỏi số {currentQuestionOrder}
                      </h2>
                    </div>
                    <p className="text-xs text-slate-500 mt-1">
                      {isReading && 'Đã hết 5s Ngôi sao hy vọng. Bấm "Bắt đầu câu hỏi" để hiện nội dung câu hỏi lên màn hình LED, mở 4 đáp án A-B-C-D cho thí sinh và đếm ngược 40 giây.'}
                      {is40sRunning && 'Thí sinh đang trả lời trên thiết bị di động. Hết 40s hệ thống tự động hiện Đáp án & Biểu đồ.'}
                      {isAnswerRevealed && 'Màn hình LED đang hiện Đáp án & Biểu đồ phân bố. Bấm "Hiện kết quả 10 thí sinh & BXH" để công bố chi tiết!'}
                      {isLeaderboard && 'Màn hình LED đang hiện Bảng xếp hạng trượt thứ hạng. Bấm "Sang câu tiếp theo" để tiếp tục.'}
                      {!isReading && !is40sRunning && !isRevealed && 'Bấm "Sang câu tiếp theo" hoặc chọn số câu để bắt đầu.'}
                    </p>
                  </div>

                  {/* Đồng hồ đếm ngược & Điều hướng vòng thi */}
                  <div className="flex flex-wrap items-center gap-2">
                    {/* Nút Quay lại Sảnh chờ */}
                    <button
                      type="button"
                      disabled={actionLoading || is40sRunning}
                      onClick={() => handleRequestStageChange('LOBBY', 1, 'lobby')}
                      className="px-3 py-1.5 rounded-xl border border-slate-200 bg-slate-100 hover:bg-slate-200 text-slate-600 font-bold text-xs transition-all flex items-center gap-1 active:scale-95"
                      title="Quay lại Sảnh chờ & Điểm danh (Hiển thị cảnh báo xác nhận)"
                    >
                      <RotateCcw className="w-3.5 h-3.5 text-slate-500" />
                      <span>Sảnh chờ</span>
                    </button>

                    {/* Nút Chuyển nhanh sang Vòng 2 bất cứ lúc nào */}
                    <button
                      type="button"
                      disabled={actionLoading || is40sRunning}
                      onClick={() => handleRequestStageChange('ROUND2', 2, 'round2')}
                      className="px-3.5 py-1.5 rounded-xl bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-slate-950 font-black text-xs shadow transition-all flex items-center gap-1.5 active:scale-95"
                      title="Chuyển ngay sang Vòng 2: Nhạy bén bất kỳ lúc nào mà không cần đợi hết 10 câu"
                    >
                      <Zap className="w-3.5 h-3.5 fill-slate-950" />
                      <span>Chuyển sang Vòng 2</span>
                      <ChevronRight className="w-3.5 h-3.5" />
                    </button>

                    {isHopeStar && (
                      <div className="px-4 py-2 rounded-2xl bg-amber-500 text-white font-black text-sm flex items-center gap-2 shadow-sm animate-pulse">
                        <Star className="w-4 h-4 fill-white" />
                        <span>Ngôi sao hy vọng: {hopeStarCountdown}s</span>
                      </div>
                    )}
                    {is40sRunning && (
                      <div className="px-4 py-2 rounded-2xl bg-emerald-600 text-white font-black text-sm flex items-center gap-2 shadow-sm animate-pulse">
                        <Timer className="w-4 h-4" />
                        <span>Đang tính giờ: {questionCountdown}s</span>
                      </div>
                    )}
                  </div>
                </div>

                {/* CÁC NÚT THAO TÁC THEO TỪNG PHA CỦA TRẬN ĐẤU */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {/* PHA 1 & 2: KHI ĐÃ CÔNG BỐ KẾT QUẢ NSHV -> NÚT BẮT ĐẦU CÂU HỎI */}
                  {isReading && (
                    <button
                      disabled={actionLoading}
                      onClick={handleStartQuestionCountdown}
                      className="p-5 rounded-2xl border-2 text-left flex items-center justify-between transition-all group bg-emerald-600 hover:bg-emerald-500 border-emerald-500 text-white shadow-xl active:scale-[0.99] ring-4 ring-emerald-200"
                    >
                      <div>
                        <div className="flex items-center gap-2 font-bold text-xs uppercase tracking-wider text-emerald-100">
                          <span>BƯỚC TIẾP THEO: PHÁT LỆNH THI</span>
                          <span className="w-2.5 h-2.5 rounded-full bg-white animate-ping" />
                        </div>
                        <div className="font-black text-xl mt-1 text-white flex items-center gap-2">
                          <Play className="w-5 h-5 fill-white" /> BẮT ĐẦU CÂU HỎI (40 GIÂY)
                        </div>
                        <div className="text-xs text-emerald-50 mt-1">
                          Hiện câu hỏi lên màn LED, mở 4 đáp án A-B-C-D trên máy thí sinh và đếm ngược 40s
                        </div>
                      </div>
                      <Timer className="w-9 h-9 shrink-0 group-hover:rotate-12 transition-transform text-white" />
                    </button>
                  )}

                  {/* PHA 3: KHI ĐANG ĐẾM NGƯỢC 40S */}
                  {is40sRunning && questionCountdown > 0 && (
                    <div className="p-5 rounded-2xl border-2 text-left flex items-center justify-between bg-emerald-700 border-emerald-600 text-white shadow-md">
                      <div>
                        <div className="flex items-center gap-2 font-bold text-xs uppercase tracking-wider text-emerald-200">
                          <span className="w-2 h-2 rounded-full bg-emerald-300 animate-ping" />
                          <span>ĐANG TRONG THỜI GIAN LÀM BÀI</span>
                        </div>
                        <div className="font-black text-xl mt-1 text-yellow-300 font-mono">
                          Đang đếm ngược: {questionCountdown} giây
                        </div>
                        <div className="text-xs text-emerald-100 mt-1">
                          Hết 40s hệ thống sẽ tự động chốt đáp án & hiển thị Biểu đồ lựa chọn!
                        </div>
                      </div>
                      <button
                        onClick={handleManualRevealAnswer}
                        className="px-3.5 py-2 rounded-xl bg-amber-400 hover:bg-amber-300 text-slate-950 font-black text-xs shadow-md transition-all shrink-0 flex items-center gap-1.5"
                      >
                        <CheckCircle2 className="w-4 h-4" /> Chốt ngay
                      </button>
                    </div>
                  )}

                  {/* PHA 4: KHI ĐÃ HẾT GIỜ (HOẶC ĐÃ CÔNG BỐ ĐÁP ÁN) -> NÚT HIỆN KẾT QUẢ 10 THÍ SINH & BXH */}
                  {(isAnswerRevealed || (is40sRunning && questionCountdown <= 0)) && (
                    <button
                      disabled={actionLoading}
                      onClick={async () => {
                        if (is40sRunning && questionCountdown <= 0 && !isAnswerRevealed) {
                          await handleManualRevealAnswer();
                        }
                        handleShowLeaderboard();
                      }}
                      className="p-5 rounded-2xl border-2 text-left flex items-center justify-between transition-all group bg-gradient-to-r from-purple-600 via-indigo-600 to-purple-700 hover:from-purple-500 hover:to-indigo-600 border-purple-400 text-white shadow-xl active:scale-[0.99] ring-4 ring-purple-200"
                    >
                      <div>
                        <div className="flex items-center gap-2 font-bold text-xs uppercase tracking-wider text-purple-200">
                          <span>
                            {currentQuestionOrder === 10
                              ? 'BƯỚC 1/2: TỔNG KẾT VÒNG 1'
                              : 'BƯỚC TIẾP THEO: CÔNG BỐ CHI TIẾT'}
                          </span>
                          <span className="w-2.5 h-2.5 rounded-full bg-amber-400 animate-ping" />
                        </div>
                        <div className="font-black text-lg mt-1 text-yellow-300 flex items-center gap-2">
                          {currentQuestionOrder === 10
                            ? '🏆 CÔNG BỐ BẢNG XẾP HẠNG & VINH DANH VÒNG 1'
                            : 'HIỆN KẾT QUẢ 10 THÍ SINH & BẢNG XẾP HẠNG'}
                        </div>
                        <div className="text-xs text-purple-100 mt-1">
                          {currentQuestionOrder === 10
                            ? 'Chuyển màn hình LED sang màn vinh danh kết quả chính thức & thứ hạng của 10 thí sinh sau Vòng 1 trước khi sang Vòng 2'
                            : 'Chuyển màn hình LED sang xem 10 thí sinh (đúng/sai, thời gian, điểm) & Bảng xếp hạng trượt thứ hạng'}
                        </div>
                      </div>
                      <Trophy className="w-9 h-9 shrink-0 group-hover:scale-110 transition-transform text-amber-300" />
                    </button>
                  )}

                  {/* PHA 5: KHI ĐÃ HIỆN BXH -> NÚT SANG CÂU TIẾP THEO HOẶC NÚT RIÊNG ĐỂ ADMIN CHUYỂN SANG VÒNG 2 */}
                  {currentQuestionOrder === 10 ? (
                    isLeaderboard ? (
                      <button
                        disabled={actionLoading || is40sRunning}
                        onClick={handleTransitionToRound2}
                        className="p-5 rounded-2xl border-2 text-left flex items-center justify-between transition-all group bg-gradient-to-r from-emerald-600 via-teal-600 to-emerald-700 hover:from-emerald-500 hover:to-teal-600 border-emerald-400 text-white shadow-2xl active:scale-[0.99] ring-4 ring-emerald-300 animate-scaleUp"
                      >
                        <div>
                          <div className="flex items-center gap-2 font-bold text-xs uppercase tracking-wider text-emerald-100">
                            <span>BƯỚC 2/2: CHUYỂN SANG VÒNG 2</span>
                            <span className="w-2.5 h-2.5 rounded-full bg-amber-300 animate-ping" />
                          </div>
                          <div className="font-black text-base sm:text-lg mt-1 text-yellow-300 flex items-center gap-2">
                            <ChevronRight className="w-6 h-6 text-yellow-300 shrink-0" />
                            CHÍNH THỨC CHUYỂN SANG VÒNG 2: NHẠY BÉN
                          </div>
                          <div className="text-xs text-emerald-100 mt-1">
                            Bấm khi MC đã công bố xong kết quả Vòng 1 để chuyển toàn bộ hệ thống sang Vòng 2 (Thao tác phần mềm QLĐV)
                          </div>
                        </div>
                        <ChevronRight className="w-8 h-8 shrink-0 group-hover:translate-x-1.5 transition-transform text-yellow-300" />
                      </button>
                    ) : (
                      <div className="p-4 rounded-2xl border-2 border-dashed border-slate-300 bg-slate-50 text-slate-500 text-xs flex items-center gap-3">
                        <Trophy className="w-6 h-6 text-slate-400 shrink-0" />
                        <span>
                          <strong>Lưu ý:</strong> Vui lòng bấm <em>"Công bố Bảng xếp hạng & Vinh danh Vòng 1"</em> trước để màn hình LED và thí sinh xem tổng kết Vòng 1. Sau đó nút chuyển Vòng 2 sẽ hiển thị.
                        </span>
                      </div>
                    )
                  ) : (
                    <button
                      disabled={actionLoading || is40sRunning}
                      onClick={() => {
                        const nextQ = isRevealed && currentQuestionOrder < 10 ? currentQuestionOrder + 1 : currentQuestionOrder;
                        handleTransitionQuestion(nextQ);
                      }}
                      className={`p-5 rounded-2xl border-2 text-left flex items-center justify-between transition-all group ${
                        !is40sRunning && (isLeaderboard || round1State === 'IDLE' || (!isAnswerRevealed && !isReading))
                          ? 'bg-blue-600 hover:bg-blue-500 border-blue-500 text-white shadow-lg active:scale-[0.99] ring-4 ring-blue-100'
                          : isAnswerRevealed
                          ? 'bg-white hover:bg-slate-50 border-slate-300 text-slate-800'
                          : 'bg-slate-50 border-slate-200 text-slate-400'
                      } ${is40sRunning ? 'opacity-40 cursor-not-allowed' : ''}`}
                    >
                      <div>
                        <div className="flex items-center gap-2 font-bold text-xs uppercase tracking-wider">
                          <span>{isLeaderboard ? 'CHUYỂN TIẾP TRẬN ĐẤU' : 'SANG CÂU TIẾP THEO'}</span>
                          {!is40sRunning && isLeaderboard && (
                            <span className="w-2 h-2 rounded-full bg-amber-400 animate-ping" />
                          )}
                        </div>
                        <div className="font-black text-base sm:text-lg mt-1">
                          {isRevealed && currentQuestionOrder < 10
                            ? `Chuyển sang Câu số ${currentQuestionOrder + 1}`
                            : `Bắt đầu Câu số ${currentQuestionOrder}`}
                        </div>
                        <div className="text-xs opacity-90 mt-1">
                          Kích hoạt 5s Ngôi sao hy vọng ➔ Hiện kết quả Ngôi sao hy vọng ➔ Bấm Bắt đầu câu hỏi (40s)
                        </div>
                      </div>
                      <ChevronRight className="w-8 h-8 shrink-0 group-hover:translate-x-1 transition-transform" />
                    </button>
                  )}
                </div>

                {/* Các nút hỗ trợ & an toàn */}
                <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between flex-wrap gap-2 text-xs">
                  <div className="text-slate-500 text-xs">
                    * Quy trình chuẩn: Bắt đầu câu ➔ 5s Ngôi sao hy vọng ➔ Hiện kết quả Ngôi sao hy vọng ➔ Bấm Bắt đầu câu hỏi (40s) ➔ Hết giờ hiện Đáp án & Biểu đồ ➔ Bấm Hiện kết quả & BXH ➔ Sang câu tiếp theo.
                  </div>

                  <div className="flex items-center gap-2">
                    {isLeaderboard && (
                      <button
                        onClick={handleManualRevealAnswer}
                        className="px-3.5 py-1.5 rounded-xl bg-purple-50 hover:bg-purple-100 text-purple-800 font-bold text-xs border border-purple-200 shadow-xs transition-all flex items-center gap-1.5"
                      >
                        <BarChart3 className="w-3.5 h-3.5" /> Xem lại Đáp án & Biểu đồ câu {currentQuestionOrder}
                      </button>
                    )}
                    {isReading && (
                      <div className="flex items-center gap-2">
                        <button
                          onClick={handleManualRevealAnswer}
                          className="px-3.5 py-1.5 rounded-xl bg-purple-50 hover:bg-purple-100 text-purple-900 font-bold text-xs border border-purple-200 shadow-xs transition-all flex items-center gap-1.5"
                          title="Bỏ qua 40s đếm ngược, chuyển thẳng sang hiện Đáp án & Biểu đồ phân bố"
                        >
                          <BarChart3 className="w-3.5 h-3.5 text-purple-600" /> Hiện Đáp án & Biểu đồ ngay (Bỏ qua 40s)
                        </button>
                        <button
                          onClick={() => handleTransitionQuestion(currentQuestionOrder)}
                          className="px-3 py-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold"
                          title="Tải lại câu hỏi hiện tại nếu có sự cố"
                        >
                          Tải lại câu hỏi số {currentQuestionOrder}
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* REALTIME CONTESTANT PROGRESS TABLE */}
              <div className="bg-white border border-slate-200 rounded-3xl p-5 shadow">
                {/* Progress bar header */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4 pb-3 border-b border-slate-100">
                  <div>
                    <h3 className="text-sm font-black text-slate-900 uppercase tracking-wide flex items-center gap-2">
                      <Users className="w-4 h-4 text-blue-600" /> TIẾN ĐỘ THÍ SINH CÂU SỐ {currentQuestionOrder}:
                    </h3>
                    <p className="text-xs text-slate-500 mt-0.5">
                      Cập nhật trực tiếp trạng thái nộp bài của từng thí sinh theo thời gian thực.
                    </p>
                  </div>

                  {/* Submission Progress bar */}
                  <div className="flex items-center gap-3 min-w-[240px]">
                    <div className="flex-1">
                      <div className="flex justify-between text-xs font-bold mb-1">
                        <span className="text-slate-700">Đã nộp bài:</span>
                        <span className="text-blue-600 font-black">{answeredCount} / {totalPlayers} ({answeredPercent}%)</span>
                      </div>
                      <div className="w-full bg-slate-200 h-2 rounded-full overflow-hidden">
                        <div
                          className="bg-emerald-500 h-full transition-all duration-300 rounded-full"
                          style={{ width: `${answeredPercent}%` }}
                        />
                      </div>
                    </div>
                  </div>
                </div>

                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs">
                    <thead>
                      <tr className="border-b border-slate-200 text-slate-500">
                        <th className="pb-2.5 font-bold">Thí sinh</th>
                        <th className="pb-2.5 font-bold">Đơn vị</th>
                        <th className="pb-2.5 font-bold text-center">Ngôi sao hy vọng</th>
                        <th className="pb-2.5 font-bold text-center">Trạng thái Câu {currentQuestionOrder}</th>
                        <th className="pb-2.5 font-bold text-right">Điểm Vòng 1</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {session?.players?.map((p) => {
                        const ans = questionAnswers[p.id];
                        const rev = revealedAnswers?.find((r) => r.playerId === p.id);
                        const hasHopeStarThisQ = p.hopeStarUsed && p.hopeStarQuestionIndex === currentQuestionOrder;
                        const initialChar = p.fullName.trim().split(' ').slice(-1)[0]?.charAt(0).toUpperCase();

                        return (
                          <tr key={p.id} className="hover:bg-slate-50 transition-colors">
                            <td className="py-3">
                              <div className="flex items-center gap-2.5">
                                <div className="w-8 h-8 rounded-lg overflow-hidden shrink-0 bg-slate-100 border border-slate-200 flex items-center justify-center shadow-2xs">
                                  {p.avatarUrl ? (
                                    <img src={p.avatarUrl} alt="" className="w-full h-full object-cover" />
                                  ) : (
                                    <span className="text-xs font-black text-blue-600">
                                      {initialChar}
                                    </span>
                                  )}
                                </div>
                                <span className="font-bold text-slate-900">{p.fullName}</span>
                              </div>
                            </td>
                            <td className="py-3 text-slate-600 max-w-[180px] truncate">{p.unit}</td>
                            <td className="py-3 text-center">
                              {hasHopeStarThisQ ? (
                                <span className="inline-flex items-center gap-1 text-[11px] font-black text-amber-700 bg-amber-100 px-2.5 py-0.5 rounded-full border border-amber-300 animate-pulse">
                                  <Star className="w-3 h-3 fill-amber-500" /> ĐÃ ĐẶT NGÔI SAO HY VỌNG
                                </span>
                              ) : p.hopeStarUsed ? (
                                <span className="text-slate-400 text-[11px]">Đã dùng ở Câu {p.hopeStarQuestionIndex}</span>
                              ) : (
                                <span className="text-slate-400 text-[11px]">Chưa dùng</span>
                              )}
                            </td>
                            <td className="py-3 text-center">
                              {/* If answer is revealed */}
                              {isRevealed && rev ? (
                                <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-black ${
                                  rev.isCorrect
                                    ? 'bg-emerald-100 text-emerald-800 border border-emerald-300'
                                    : 'bg-rose-100 text-rose-800 border border-rose-300'
                                }`}>
                                  {rev.isCorrect ? <CheckCircle2 className="w-3.5 h-3.5" /> : <XCircle className="w-3.5 h-3.5" />}
                                  {rev.selectedOption || '—'} {rev.isCorrect ? `(+ ${formatScore(rev.scoreAwarded)}đ)` : `(${formatScore(rev.scoreAwarded)}đ)`}
                                </span>
                              ) : isRevealed ? (
                                p.isCheckedIn ? (
                                  <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-black bg-rose-100 text-rose-800 border border-rose-300">
                                    <XCircle className="w-3.5 h-3.5 text-rose-600" /> Không chọn (0đ)
                                  </span>
                                ) : (
                                  <span className="text-slate-400 text-xs">Chưa tham gia</span>
                                )
                              ) : is40sRunning ? (
                                ans?.hasAnswered ? (
                                  <span className="inline-flex items-center gap-1 text-xs font-bold text-emerald-700 bg-emerald-100 px-2.5 py-1 rounded-full border border-emerald-300">
                                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                                    Đã nộp bài ({ans.responseTimeMs ? `${(ans.responseTimeMs / 1000).toFixed(1)}s` : ''})
                                  </span>
                                ) : (
                                  <span className="inline-flex items-center gap-1 text-xs font-bold text-amber-700 bg-amber-100 px-2.5 py-1 rounded-full border border-amber-300 animate-pulse">
                                    <Timer className="w-3.5 h-3.5 text-amber-600" /> Đang suy nghĩ...
                                  </span>
                                )
                              ) : isHopeStar ? (
                                <span className="text-slate-400 text-xs">Đang chọn Ngôi sao hy vọng...</span>
                              ) : (
                                <span className="text-slate-400 text-xs">Chờ mở bài thi</span>
                              )}
                            </td>
                            <td className="py-3 text-right font-black text-amber-700 text-sm">
                              {formatScore(p.round1Score)}đ
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          );
        })()}

        {/* TAB 3: VÒNG 2 - NHẠY BÉN (MÃ ĐỀ, BLOCK THI & ĐIỂM 10 PHÚT) */}
        {/* ========================================================= */}
        {activeTab === 'round2' && (
          <div className="space-y-6 animate-fadeIn">
            {/* Header Stats & Reset Topics */}
            <div className="bg-white border border-slate-200 rounded-3xl p-5 shadow flex flex-col md:flex-row items-center justify-between gap-4">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 rounded-2xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-center text-amber-600">
                  <Zap className="w-6 h-6" />
                </div>
                <div>
                  <h3 className="text-base font-black text-slate-900 uppercase">
                    ĐIỀU HÀNH VÒNG 2: NHẠY BÉN (THỰC HÀNH YUM - 10 PHÚT)
                  </h3>
                  <div className="flex flex-wrap items-center gap-3 text-xs text-slate-500 mt-1">
                    <span>
                      Đã chọn đề:{' '}
                      <strong className="text-blue-700 font-bold">
                        {session?.players?.filter((p) => p.round2DrawCode).length || 0}/10
                      </strong>
                    </span>
                    <span>•</span>
                    <span>
                      Đã có điểm:{' '}
                      <strong className="text-emerald-600 font-bold">
                        {session?.players?.filter((p) => (p.round2Score ?? 0) > 0).length || 0}/10
                      </strong>
                    </span>
                    <span>•</span>
                    <span>
                      Mã đề còn trống:{' '}
                      <strong className="text-amber-600 font-bold">
                        {10 - (session?.players?.filter((p) => p.round2DrawCode).length || 0)}/10
                      </strong>
                    </span>
                  </div>
                </div>
              </div>

              <div className="flex flex-wrap items-center gap-2">
                <button
                  type="button"
                  disabled={actionLoading}
                  onClick={() => handleRequestStageChange('ROUND1', 1, 'round1')}
                  className="px-3.5 py-2 rounded-xl border border-rose-300 bg-rose-50 hover:bg-rose-100 text-rose-700 font-bold text-xs transition-all flex items-center gap-1.5 shadow-2xs active:scale-95"
                  title="Quay lại Vòng 1: Thông thái (Hiển thị cảnh báo xác nhận)"
                >
                  <ChevronLeft className="w-4 h-4" />
                  <span>Quay lại Vòng 1</span>
                </button>

                <button
                  type="button"
                  disabled={actionLoading}
                  onClick={() => handleRequestStageChange('ROUND3', 3, 'round3')}
                  className="px-3.5 py-2 rounded-xl bg-gradient-to-r from-indigo-600 to-purple-600 hover:brightness-110 text-white font-black text-xs shadow transition-all flex items-center gap-1.5 active:scale-95"
                  title="Chuyển sang Vòng 3: Bản lĩnh (Đối kháng tranh biện)"
                >
                  <span>Chuyển sang Vòng 3</span>
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* BƯỚC 1: MC MỜI THÍ SINH & CHỌN MÃ ĐỀ */}
            {(() => {
              const pendingCandidates = (session?.players || []).filter((p) => !p.round2Score || Number(p.round2Score) === 0);
              const completedCandidates = (session?.players || []).filter((p) => Number(p.round2Score ?? 0) > 0);

              return (
                <div className="bg-white border border-slate-200 rounded-3xl p-6 shadow space-y-5">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between border-b border-slate-100 pb-3 gap-2">
                    <div className="flex items-center gap-2">
                      <span className="w-6 h-6 rounded-full bg-blue-700 text-white text-xs font-black flex items-center justify-center">1</span>
                      <h4 className="text-sm font-black text-slate-900 uppercase">
                        BƯỚC 1: MC MỜI THÍ SINH LÊN CHỌN MÃ ĐỀ
                      </h4>
                    </div>
                    <span className="text-xs text-slate-500 italic">
                      * MC đọc tên thí sinh nào, Admin bấm chọn thí sinh đó để hiển thị lên màn hình LED hội trường
                    </span>
                  </div>

                  {/* Cảnh báo khi đợt thi đang diễn ra -> Khóa Bước 1 */}
                  {r2TimerRunning && (
                    <div className="p-4 rounded-2xl bg-amber-500/10 border-2 border-amber-500/30 flex items-center gap-3 text-amber-900 font-bold text-xs animate-pulse">
                      <Lock className="w-5 h-5 text-amber-600 shrink-0" />
                      <div>
                        <span className="font-black uppercase tracking-wider block">
                          BƯỚC 1 TẠM KHÓA: ĐỢT THI 10 PHÚT ĐANG DIỄN RA
                        </span>
                        <span className="font-normal text-slate-600">
                          Thí sinh đang trong thời gian làm bài thực hành. Thao tác chọn thí sinh và bốc mã đề sẽ tự động mở lại khi hết giờ hoặc bấm "Dừng đợt thi" ở Bước 2.
                        </span>
                      </div>
                    </div>
                  )}

                  <div className={`grid grid-cols-1 md:grid-cols-3 gap-6 transition-opacity ${r2TimerRunning ? 'opacity-40 pointer-events-none select-none' : ''}`}>
                    {/* Chọn thí sinh */}
                    <div className="space-y-3">
                      <div className="flex items-center justify-between">
                        <label className="text-xs font-bold text-slate-700 block">
                          1.1 Chọn thí sinh bốc đề ({pendingCandidates.length} chưa thi):
                        </label>
                      </div>

                      {pendingCandidates.length === 0 ? (
                        <div className="p-4 rounded-2xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-bold text-center">
                          🎉 Tất cả 10 thí sinh đều đã hoàn thành bài thi Vòng 2!
                        </div>
                      ) : (
                        <div className="space-y-2 max-h-64 overflow-y-auto pr-1">
                          {pendingCandidates.map((p) => {
                            const isSelected = r2PlayerId === p.id;
                            const hasTopic = Boolean(p.round2DrawCode);
                            return (
                              <div
                                key={p.id}
                                onClick={() => handleSelectCandidate(p.id)}
                                className={`w-full text-left p-2.5 rounded-xl border text-xs transition-all flex items-center justify-between cursor-pointer ${
                                  isSelected
                                    ? 'bg-blue-50 border-blue-600 ring-2 ring-blue-300 shadow-sm'
                                    : hasTopic
                                    ? 'bg-slate-50 border-slate-200 text-slate-600'
                                    : 'bg-white border-slate-200 hover:border-blue-400 text-slate-800'
                                }`}
                              >
                                <div className="flex items-center gap-2 min-w-0">
                                  <span className="font-black text-blue-700 shrink-0">SBD {String(p.orderNumber).padStart(2, '0')}</span>
                                  <span className="font-bold text-slate-900 truncate max-w-[130px]">{p.fullName}</span>
                                </div>
                                {hasTopic ? (
                                  <div className="flex items-center gap-1.5 shrink-0">
                                    <span className="px-2 py-0.5 rounded-md bg-emerald-100 text-emerald-800 font-black text-[10px]">
                                      {p.round2DrawCode}
                                    </span>
                                    <button
                                      type="button"
                                      disabled={actionLoading || r2TimerRunning}
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        handleUnassignTopic(p.id);
                                      }}
                                      className="p-1 rounded-md bg-rose-50 hover:bg-rose-100 text-rose-600 border border-rose-200 text-[10px] font-bold flex items-center gap-1 transition-all"
                                      title="Mở khóa để chọn lại mã đề khác"
                                    >
                                      <Unlock className="w-3 h-3 text-rose-600" />
                                      <span className="hidden sm:inline">Mở khóa</span>
                                    </button>
                                  </div>
                                ) : (
                                  <span className="text-[10px] text-amber-600 font-semibold shrink-0">Chưa chọn đề</span>
                                )}
                              </div>
                            );
                          })}
                        </div>
                      )}

                      {r2PlayerId && (
                        <button
                          onClick={() => handleSelectCandidate(Number(r2PlayerId))}
                          disabled={actionLoading || r2TimerRunning}
                          className="w-full py-2.5 rounded-xl bg-blue-700 hover:bg-blue-800 text-white font-bold text-xs shadow-md transition-all active:scale-95 flex items-center justify-center gap-1.5"
                        >
                          <Eye className="w-4 h-4" />
                          <span>HIỂN THỊ THÍ SINH NÀY LÊN MÀN LED</span>
                        </button>
                      )}
                    </div>

                    {/* Chọn mã đề trong 10 mã đề */}
                    <div className="md:col-span-2 space-y-3">
                      <div className="flex items-center justify-between">
                        <label className="text-xs font-bold text-slate-700 block">
                          1.2 Chọn Mã đề thí sinh đọc (Bấm vào mã đề):
                        </label>
                        <span className="text-[11px] font-semibold text-amber-700 bg-amber-50 px-2 py-0.5 rounded border border-amber-200">
                          Mã đề đã chọn sẽ bị khoá, thí sinh sau không chọn trùng
                        </span>
                      </div>

                      <div className="grid grid-cols-2 sm:grid-cols-5 gap-2.5">
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
                          const chosenByPlayer = session?.players?.find((p) => p.round2DrawCode === code);
                          const isChosen = Boolean(chosenByPlayer);
                          const isCurrentSelect = r2TopicCode === code;

                          return (
                            <button
                              key={code}
                              type="button"
                              disabled={isChosen || actionLoading || r2TimerRunning}
                              onClick={() => setR2TopicCode(code)}
                              className={`p-3 rounded-2xl border text-center transition-all relative flex flex-col items-center justify-center min-h-[76px] ${
                                isChosen
                                  ? 'bg-slate-100 border-slate-200 text-slate-400 cursor-not-allowed opacity-60'
                                  : isCurrentSelect
                                  ? 'bg-gradient-to-b from-amber-50 to-amber-100 border-amber-500 ring-2 ring-amber-400 shadow-md text-amber-950 font-black scale-102'
                                  : 'bg-white border-slate-200 hover:border-amber-400 hover:bg-amber-50/50 text-slate-800 font-bold shadow-2xs'
                              }`}
                            >
                              <span className="text-xs font-black tracking-wide">{code}</span>
                              {isChosen ? (
                                <span className="text-[9px] text-slate-500 font-semibold mt-1 truncate max-w-full">
                                  SBD {String(chosenByPlayer?.orderNumber).padStart(2, '0')}
                                </span>
                              ) : (
                                <span className="text-[9px] text-emerald-600 font-bold mt-1">Còn trống</span>
                              )}
                            </button>
                          );
                        })}
                      </div>

                      <div className="pt-2 flex flex-col sm:flex-row items-center gap-3">
                        <div className="flex-1 text-xs text-slate-600">
                          Mã đề đang chọn:{' '}
                          <strong className="text-amber-600 text-sm font-black">{r2TopicCode}</strong>
                          {r2PlayerId && (
                            <span>
                              {' '}
                              cho thí sinh{' '}
                              <strong className="text-blue-700">
                                {session?.players?.find((p) => p.id === r2PlayerId)?.fullName}
                              </strong>
                            </span>
                          )}
                        </div>
                        <button
                          onClick={() => handleAssignTopic()}
                          disabled={!r2PlayerId || actionLoading || r2TimerRunning}
                          className="w-full sm:w-auto px-6 py-2.5 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-black text-xs shadow-md transition-all active:scale-95 flex items-center justify-center gap-2 disabled:opacity-50"
                        >
                          <CheckCircle2 className="w-4 h-4" />
                          <span>XÁC NHẬN GÁN MÃ ĐỀ (HIỆN TRÊN LED)</span>
                        </button>
                      </div>
                    </div>
                  </div>

                  {/* Danh sách thí sinh đã hoàn thành Vòng 2 (kèm nút Cho thi lại / Reset) */}
                  {completedCandidates.length > 0 && (
                    <div className="pt-4 border-t border-slate-100">
                      <div className="flex items-center justify-between mb-2.5">
                        <span className="text-xs font-black text-slate-600 uppercase flex items-center gap-1.5">
                          <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                          Thí sinh đã hoàn thành Vòng 2 ({completedCandidates.length}/10):
                        </span>
                        <span className="text-[11px] text-slate-400 italic">
                          (Thí sinh đã hoàn thành sẽ không hiện ở danh sách bốc đề trừ khi bấm Reset cho thi lại)
                        </span>
                      </div>
                      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-2.5">
                        {completedCandidates.map((cp) => (
                          <div
                            key={cp.id}
                            className="p-2.5 rounded-xl bg-slate-50 border border-slate-200 flex flex-col justify-between gap-2 shadow-2xs"
                          >
                            <div className="flex items-center justify-between gap-2">
                              <span className="font-black text-xs text-blue-700">SBD {String(cp.orderNumber).padStart(2, '0')}</span>
                              <span className="px-1.5 py-0.5 rounded bg-emerald-100 text-emerald-800 font-black text-[10px]">
                                {cp.round2DrawCode || 'Đã thi'}
                              </span>
                            </div>
                            <div className="font-bold text-xs text-slate-900 truncate" title={cp.fullName}>
                              {cp.fullName}
                            </div>
                            <div className="flex items-center justify-between gap-1 pt-1 border-t border-slate-200/60">
                              <span className="text-[11px] font-black text-emerald-600">
                                Điểm: {formatScore(cp.round2Score)}đ
                              </span>
                              <button
                                type="button"
                                disabled={actionLoading || r2TimerRunning}
                                onClick={() => handleResetPlayerRound2(cp.id, cp.fullName)}
                                className="px-2 py-0.5 rounded-lg bg-amber-50 hover:bg-amber-100 text-amber-800 border border-amber-300 font-bold text-[10px] flex items-center gap-1 transition-all"
                                title="Cho phép thí sinh này thi lại Vòng 2"
                              >
                                <RotateCcw className="w-2.5 h-2.5" />
                                <span>Thi lại</span>
                              </button>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              );
            })()}

            {/* BƯỚC 2: QUẢN LÝ ĐỢT THI & ĐỒNG HỒ 10 PHÚT */}
            <div className="bg-white border border-slate-200 rounded-3xl p-6 shadow space-y-5">
              <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                <div className="flex items-center gap-2">
                  <span className="w-6 h-6 rounded-full bg-emerald-600 text-white text-xs font-black flex items-center justify-center">2</span>
                  <h4 className="text-sm font-black text-slate-900 uppercase">
                    BƯỚC 2: ĐỢT THI HIỆN TẠI & ĐỒNG HỒ 10 PHÚT
                  </h4>
                </div>
                <span className="text-xs font-bold text-slate-500">
                  {r2TimerRunning ? (
                    <span className="text-emerald-600 animate-pulse flex items-center gap-1 font-bold">
                      <span className="w-2 h-2 rounded-full bg-emerald-600"></span> ĐANG TRONG 10 PHÚT LÀM BÀI
                    </span>
                  ) : r2TimeUp ? (
                    <span className="text-rose-600 font-black">HẾT GIỜ LÀM BÀI</span>
                  ) : (
                    'CHƯA BẮT ĐẦU'
                  )}
                </span>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-6 items-center">
                {/* Danh sách thí sinh trong đợt thi */}
                <div className="md:col-span-2 space-y-3">
                  {(() => {
                    const currentBatchPlayers = r2BatchPlayerIds
                      .map((pId) => session?.players?.find((item) => item.id === pId))
                      .filter((p): p is LivePlayerDto => Boolean(p && (!p.round2Score || Number(p.round2Score) === 0)));

                    return (
                      <>
                        <div className="flex items-center justify-between">
                          <span className="text-xs font-bold text-slate-700">
                            Các thí sinh trong đợt thi này ({currentBatchPlayers.length} thí sinh):
                          </span>
                          <span className="text-[11px] text-slate-400 italic">
                            (Tự động bao gồm các thí sinh đã chọn đề trong đợt)
                          </span>
                        </div>

                        {currentBatchPlayers.length === 0 ? (
                          <div className="p-6 rounded-2xl bg-slate-50 border border-dashed border-slate-300 text-center text-xs text-slate-500">
                            Chưa có thí sinh nào trong đợt thi này. Vui lòng chọn thí sinh và gán mã đề ở Bước 1.
                          </div>
                        ) : (
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                            {currentBatchPlayers.map((p) => {
                              const isShowingOnLed = adminInspectingPlayerId === p.id;
                              return (
                                <div
                                  key={p.id}
                                  onClick={async () => {
                                    if (!session) return;
                                    try {
                                      if (isShowingOnLed) {
                                        setAdminInspectingPlayerId(null);
                                        await adminLiveApi.selectRound2Candidate(session.id, 0);
                                        toast.info(`Đã tắt chiếu đề của ${p.fullName} trên LED`);
                                      } else {
                                        setAdminInspectingPlayerId(p.id);
                                        await adminLiveApi.selectRound2Candidate(session.id, p.id);
                                        toast.success(`Đã chiếu câu hỏi của ${p.fullName} (${p.round2DrawCode}) lên màn hình LED!`);
                                      }
                                    } catch (e) {
                                      toast.error('Lỗi khi phát lệnh chiếu đề');
                                    }
                                  }}
                                  className={`p-3 rounded-2xl border flex items-center justify-between shadow-2xs transition-all cursor-pointer ${
                                    isShowingOnLed
                                      ? 'bg-amber-50 border-amber-500 ring-2 ring-amber-300'
                                      : 'bg-slate-50 border-slate-200 hover:border-amber-300 hover:bg-amber-50/40'
                                  }`}
                                >
                                  <div className="flex items-center gap-2.5">
                                    <div className={`w-9 h-9 rounded-xl overflow-hidden flex items-center justify-center font-black text-xs shrink-0 ${
                                      isShowingOnLed ? 'bg-amber-200 text-amber-900 border border-amber-400' : 'bg-blue-100 text-blue-700'
                                    }`}>
                                      {p.avatarUrl ? (
                                        <img src={p.avatarUrl} alt="" className="w-full h-full object-cover" />
                                      ) : (
                                        p.fullName.charAt(0)
                                      )}
                                    </div>
                                    <div>
                                      <div className="text-xs font-black text-slate-900">{p.fullName}</div>
                                      <div className="text-[10px] text-slate-500">SBD {String(p.orderNumber).padStart(2, '0')} • {p.unit}</div>
                                    </div>
                                  </div>

                                  <div className="flex items-center gap-1.5">
                                    <span className="px-2.5 py-1 rounded-lg bg-amber-500/10 border border-amber-400 text-amber-700 text-xs font-black">
                                      {p.round2DrawCode || 'Chưa có đề'}
                                    </span>

                                    <button
                                      type="button"
                                      onClick={async (e) => {
                                        e.stopPropagation();
                                        if (!session) return;
                                        try {
                                          if (isShowingOnLed) {
                                            setAdminInspectingPlayerId(null);
                                            await adminLiveApi.selectRound2Candidate(session.id, 0);
                                            toast.info(`Đã tắt chiếu đề của ${p.fullName} trên LED`);
                                          } else {
                                            setAdminInspectingPlayerId(p.id);
                                            await adminLiveApi.selectRound2Candidate(session.id, p.id);
                                            toast.success(`Đã chiếu câu hỏi của ${p.fullName} (${p.round2DrawCode}) lên màn hình LED!`);
                                          }
                                        } catch (e) {
                                          toast.error('Lỗi khi phát lệnh chiếu đề');
                                        }
                                      }}
                                      className={`px-2.5 py-1 rounded-lg text-[10px] font-black flex items-center gap-1 transition-all cursor-pointer shadow-2xs ${
                                        isShowingOnLed
                                          ? 'bg-amber-500 text-white shadow-amber-500/40 ring-2 ring-amber-400 animate-pulse'
                                          : 'bg-white text-blue-700 border border-blue-300 hover:bg-blue-50'
                                      }`}
                                      title="Chiếu toàn văn câu hỏi của thí sinh này lên màn hình LED hội trường"
                                    >
                                      <Eye className="w-3 h-3" />
                                      <span>{isShowingOnLed ? 'Đang chiếu LED' : 'Chiếu LED'}</span>
                                    </button>
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                        )}
                      </>
                    );
                  })()}
                </div>

                {/* Đồng hồ 10 phút & Nút điều khiển */}
                <div className="bg-slate-50 border border-slate-200 rounded-3xl p-5 text-center space-y-4">
                  <div className="text-xs font-black text-slate-500 uppercase tracking-widest">
                    THỜI GIAN LÀM BÀI 10 PHÚT
                  </div>
                  <div className={`text-4xl font-mono font-black ${r2TimerRunning ? 'text-emerald-600 animate-pulse' : r2TimeUp ? 'text-rose-600' : 'text-slate-800'}`}>
                    {String(Math.floor(r2Timer / 60)).padStart(2, '0')}:
                    {String(r2Timer % 60).padStart(2, '0')}
                  </div>

                  <div className="flex flex-col gap-2">
                    {!r2TimerRunning ? (
                      <button
                        onClick={handleStartRound2Batch}
                        disabled={
                          actionLoading ||
                          r2BatchPlayerIds.filter((pId) => {
                            const p = session?.players?.find((pl) => pl.id === pId);
                            return p && (!p.round2Score || Number(p.round2Score) === 0);
                          }).length === 0
                        }
                        className="w-full py-3 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:brightness-110 text-white font-black text-xs shadow-lg transition-all active:scale-95 flex items-center justify-center gap-2 disabled:opacity-50"
                      >
                        <Play className="w-4 h-4 fill-white" />
                        <span>BẮT ĐẦU THI 10 PHÚT</span>
                      </button>
                    ) : (
                      <button
                        onClick={handleEndRound2Batch}
                        disabled={actionLoading}
                        className="w-full py-3 rounded-xl bg-rose-600 hover:bg-rose-500 text-white font-black text-xs shadow-lg transition-all active:scale-95 flex items-center justify-center gap-2"
                      >
                        <XCircle className="w-4 h-4" />
                        <span>DỪNG / HẾT GIỜ ĐỢT THI NÀY</span>
                      </button>
                    )}
                  </div>
                </div>
              </div>
            </div>

            {/* BƯỚC 3: NHẬP ĐIỂM BAN GIÁM KHẢO & CÔNG BỐ KẾT QUẢ (INLINE TABLE THÔNG MINH) */}
            {(() => {
              const currentBatchCandidates = r2ShowAllPlayers
                ? (session?.players || [])
                : r2BatchPlayerIds.length > 0
                ? (session?.players || []).filter((p) => r2BatchPlayerIds.includes(p.id))
                : (session?.players || []).filter((p) => p.round2DrawCode);

              return (
                <div className="bg-white border border-slate-200 rounded-3xl p-6 shadow space-y-5">
                  <div className="flex flex-col md:flex-row md:items-center justify-between border-b border-slate-100 pb-3 gap-3">
                    <div className="flex items-center gap-2">
                      <span className="w-6 h-6 rounded-full bg-amber-500 text-slate-950 text-xs font-black flex items-center justify-center">3</span>
                      <div>
                        <h4 className="text-sm font-black text-slate-900 uppercase">
                          BƯỚC 3: NHẬP ĐIỂM BAN GIÁM KHẢO (BẢNG TRỰC TIẾP)
                        </h4>
                        <p className="text-xs text-slate-500 mt-0.5">
                          {r2ShowAllPlayers
                            ? `Đang hiển thị toàn bộ 10 thí sinh trong hội thi.`
                            : `Mặc định hiển thị ${currentBatchCandidates.length} thí sinh vừa thi trong đợt này.`}
                        </p>
                      </div>
                    </div>

                    <div className="flex flex-wrap items-center gap-2.5">
                      {/* Nút Toggle xem thí sinh đợt này vs tất cả 10 người */}
                      <button
                        type="button"
                        onClick={() => setR2ShowAllPlayers(!r2ShowAllPlayers)}
                        className="px-3.5 py-2 rounded-xl border border-slate-300 hover:border-blue-400 bg-slate-50 hover:bg-blue-50 text-slate-700 hover:text-blue-800 text-xs font-bold transition-all flex items-center gap-1.5"
                      >
                        <Users className="w-3.5 h-3.5" />
                        <span>{r2ShowAllPlayers ? '🎯 Chỉ xem thí sinh đợt này' : '👁️ Xem/Sửa tất cả 10 thí sinh'}</span>
                      </button>

                      {/* Nút lưu tất cả điểm */}
                      {currentBatchCandidates.length > 0 && (
                        <button
                          type="button"
                          disabled={actionLoading}
                          onClick={() => handleSaveAllBatchScores(currentBatchCandidates.map((p) => p.id))}
                          className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs shadow-sm transition-all active:scale-95 flex items-center gap-1.5"
                        >
                          <Save className="w-3.5 h-3.5" />
                          <span>LƯU ĐIỂM ({currentBatchCandidates.length} THÍ SINH)</span>
                        </button>
                      )}

                      {/* Nút 1: Công bố Bảng điểm Vòng 2 trước (Mã đề, TH1, TH2, Tổng V2) */}
                      <button
                        onClick={() => handleShowRound2Leaderboard('ROUND2_ONLY')}
                        disabled={actionLoading}
                        className="px-4 py-2 rounded-xl bg-gradient-to-r from-amber-500 via-yellow-400 to-amber-500 hover:brightness-110 text-slate-950 font-black text-xs shadow-md transition-all active:scale-95 flex items-center gap-1.5 ring-2 ring-amber-300"
                        title="Công bố Bảng điểm Vòng 2 gồm các cột: Mã đề, Tình huống 1, Tình huống 2, Tổng điểm Vòng 2"
                      >
                        <Zap className="w-4 h-4 fill-slate-950" />
                        <span>CÔNG BỐ BẢNG ĐIỂM VÒNG 2 (LED)</span>
                      </button>

                      {/* Nút 2: Xem trước Bảng tổng sắp 3 vòng (lấy màn kết quả 3 vòng) */}
                      <button
                        onClick={() => handleShowRound2Leaderboard('PREVIEW_3_ROUNDS')}
                        disabled={actionLoading}
                        className="px-4 py-2 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 hover:brightness-110 text-white font-black text-xs shadow-md transition-all active:scale-95 flex items-center gap-1.5"
                        title="Xem trước Bảng tổng sắp chung cuộc 3 vòng trên Màn hình LED"
                      >
                        <Trophy className="w-4 h-4" />
                        <span>XEM TRƯỚC BẢNG TỔNG SẮP 3 VÒNG (LED)</span>
                      </button>

                      {/* Nút 3: Tiếp tục cho thí sinh bốc thăm đợt tiếp theo */}
                      <button
                        onClick={handleShowRound2Selecting}
                        disabled={actionLoading}
                        className="px-3.5 py-2 rounded-xl border border-slate-300 hover:border-amber-400 bg-slate-100 hover:bg-amber-50 text-slate-700 hover:text-amber-900 font-bold text-xs transition-all flex items-center gap-1.5 active:scale-95"
                        title="Đưa màn hình LED về chế độ chọn mã đề để tiếp tục bốc thăm cho thí sinh đợt sau"
                      >
                        <RotateCcw className="w-3.5 h-3.5 text-slate-600" />
                        <span>CHỌN ĐỀ ĐỢT TIẾP</span>
                      </button>
                    </div>
                  </div>

                  {/* Bảng nhập điểm trực tiếp Inline Table */}
                  <div className="overflow-x-auto">
                    <table className="w-full text-left text-xs">
                      <thead>
                        <tr className="border-b border-slate-200 text-slate-500 font-bold bg-slate-50/50">
                          <th className="py-3 px-3">SBD</th>
                          <th className="py-3 px-3">Thí sinh</th>
                          <th className="py-3 px-3">Đơn vị</th>
                          <th className="py-3 px-3">Mã đề</th>
                          <th className="py-3 px-3 text-center min-w-[120px]">Tình huống 1 (max 20)</th>
                          <th className="py-3 px-3 text-center min-w-[120px]">Tình huống 2 (max 20)</th>
                          <th className="py-3 px-3 text-center">Tổng V2</th>
                          <th className="py-3 px-3 text-right">Tổng tích lũy</th>
                          <th className="py-3 px-3 text-center">Hành động</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {currentBatchCandidates.length === 0 ? (
                          <tr>
                            <td colSpan={9} className="py-8 text-center text-slate-400 italic">
                              Chưa có thí sinh nào trong đợt thi này. Bấm "Xem/Sửa tất cả 10 thí sinh" để xem danh sách đầy đủ.
                            </td>
                          </tr>
                        ) : (
                          currentBatchCandidates.map((p) => {
                            const sc = r2ScoresMap[p.id] || {
                              s1: p.round2Scenario1Score ?? 18,
                              s2: p.round2Scenario2Score ?? 18,
                            };
                            const totalV2 = Number(sc.s1 || 0) + Number(sc.s2 || 0);
                            const cumulative = Number(p.round1Score || 0) + totalV2 + Number(p.round3Score || 0);

                            return (
                              <tr key={p.id} className="hover:bg-slate-50/80 transition-colors">
                                <td className="py-3 px-3 font-black text-amber-600">
                                  {String(p.orderNumber).padStart(2, '0')}
                                </td>
                                <td className="py-3 px-3">
                                  <div className="flex items-center gap-2">
                                    <div className="w-7 h-7 rounded-lg overflow-hidden bg-blue-100 flex items-center justify-center font-bold text-blue-700 text-xs shrink-0">
                                      {p.avatarUrl ? (
                                        <img src={p.avatarUrl} alt="" className="w-full h-full object-cover" />
                                      ) : (
                                        p.fullName.charAt(0)
                                      )}
                                    </div>
                                    <span className="font-bold text-slate-900 truncate max-w-[150px]">{p.fullName}</span>
                                  </div>
                                </td>
                                <td className="py-3 px-3 text-slate-500 truncate max-w-[140px]">{p.unit}</td>
                                <td className="py-3 px-3">
                                  <span className="px-2 py-0.5 rounded-md bg-blue-50 text-blue-700 border border-blue-200 font-black text-xs">
                                    {p.round2DrawCode || '—'}
                                  </span>
                                </td>
                                <td className="py-3 px-3 text-center">
                                  <input
                                    type="number"
                                    step="1"
                                    min="0"
                                    max="20"
                                    value={sc.s1}
                                    onChange={(e) => {
                                      const val = Number(e.target.value);
                                      setR2ScoresMap((prev) => ({
                                        ...prev,
                                        [p.id]: { ...sc, s1: val },
                                      }));
                                    }}
                                    className="w-20 text-center bg-white border border-slate-300 focus:border-blue-500 rounded-lg py-1.5 px-2 text-xs font-black text-slate-900 shadow-2xs"
                                  />
                                </td>
                                <td className="py-3 px-3 text-center">
                                  <input
                                    type="number"
                                    step="1"
                                    min="0"
                                    max="20"
                                    value={sc.s2}
                                    onChange={(e) => {
                                      const val = Number(e.target.value);
                                      setR2ScoresMap((prev) => ({
                                        ...prev,
                                        [p.id]: { ...sc, s2: val },
                                      }));
                                    }}
                                    className="w-20 text-center bg-white border border-slate-300 focus:border-blue-500 rounded-lg py-1.5 px-2 text-xs font-black text-slate-900 shadow-2xs"
                                  />
                                </td>
                                <td className="py-3 px-3 text-center">
                                  <span className="px-2.5 py-1 rounded-lg bg-emerald-100 text-emerald-800 font-black text-xs">
                                    {formatScore(totalV2)}đ
                                  </span>
                                </td>
                                <td className="py-3 px-3 text-right font-black text-amber-600 text-sm">
                                  {formatScore(cumulative)}đ
                                </td>
                                <td className="py-3 px-3 text-center">
                                  <button
                                    type="button"
                                    disabled={actionLoading}
                                    onClick={() => handleSaveRound2Score(p.id, sc.s1, sc.s2)}
                                    className="px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs shadow-2xs transition-all active:scale-95 inline-flex items-center gap-1"
                                    title="Lưu điểm thí sinh này"
                                  >
                                    <Save className="w-3.5 h-3.5" />
                                    <span>Lưu</span>
                                  </button>
                                </td>
                              </tr>
                            );
                          })
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>
              );
            })()}
          </div>
        )}

        {/* ========================================================= */}
        {/* TAB 4: VÒNG 3 - BẢN LĨNH (BỐC THĂM & ĐIỂM ĐỐI KHÁNG) */}
        {/* ========================================================= */}
        {activeTab === 'round3' && (
          <div className="space-y-6 animate-fadeIn">
            {/* Top Action & Navigation Bar */}
            <div className="bg-white border border-slate-200 rounded-3xl p-5 flex flex-col md:flex-row md:items-center justify-between gap-4 shadow">
              <div>
                <div className="flex items-center gap-2">
                  <span className="w-6 h-6 rounded-full bg-indigo-600 text-white text-xs font-black flex items-center justify-center">
                    3
                  </span>
                  <h3 className="text-base font-black text-slate-900 uppercase tracking-wide">
                    VÒNG 3: BẢN LĨNH • TRANH BIỆN ĐỐI KHÁNG SÂN KHẤU
                  </h3>
                </div>
                <p className="text-xs text-slate-500 mt-1">
                  Thí sinh bốc thăm theo cặp ngoài thực tế → Admin gán cặp (LED cập nhật tức thì) → Bấm thi đấu từng cặp với 3 giai đoạn nhỏ.
                </p>
              </div>

              <div className="flex flex-wrap items-center gap-2">
                <button
                  type="button"
                  disabled={actionLoading || r3TimerRunning}
                  onClick={() => handleRequestStageChange('ROUND2', 2, 'round2')}
                  className="px-3.5 py-2 rounded-2xl border border-rose-300 bg-rose-50 hover:bg-rose-100 text-rose-700 font-bold text-xs transition-all flex items-center gap-1.5 shadow-2xs active:scale-95 disabled:opacity-40"
                  title="Quay lại Vòng 2: Nhạy bén"
                >
                  <ChevronLeft className="w-4 h-4" />
                  <span>Quay lại Vòng 2</span>
                </button>

                <button
                  type="button"
                  disabled={actionLoading || r3TimerRunning}
                  onClick={handleResetAllRound3Pairs}
                  className="px-3 py-2 rounded-2xl border border-slate-300 bg-slate-50 hover:bg-rose-50 text-slate-700 hover:text-rose-700 font-bold text-xs transition-all flex items-center gap-1 shadow-2xs active:scale-95 disabled:opacity-40"
                  title="Làm mới lại toàn bộ 5 cặp đấu"
                >
                  <RotateCcw className="w-3.5 h-3.5" />
                  <span>Làm mới 5 cặp</span>
                </button>

                <button
                  type="button"
                  disabled={actionLoading || r3TimerRunning}
                  onClick={handleDrawPairs}
                  className="px-3 py-2 rounded-2xl border border-indigo-300 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 font-bold text-xs transition-all flex items-center gap-1 shadow-2xs active:scale-95 disabled:opacity-40"
                  title="Bốc thăm ngẫu nhiên tự động (Dự phòng)"
                >
                  <Shuffle className="w-3.5 h-3.5" />
                  <span>Bốc thăm ngẫu nhiên</span>
                </button>

                <button
                  type="button"
                  disabled={actionLoading || r3TimerRunning}
                  onClick={handleShowRound3Rules}
                  className="px-3.5 py-2 rounded-2xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-black text-xs shadow transition-all flex items-center gap-1.5 active:scale-95 disabled:opacity-40"
                  title="Chiếu Thể lệ & Quy tắc thi đấu Vòng 3 lên màn hình LED"
                >
                  <BookOpen className="w-4 h-4 text-slate-950" />
                  <span>Chiếu Thể lệ V3 (LED)</span>
                </button>

                <button
                  type="button"
                  disabled={actionLoading || r3TimerRunning}
                  onClick={handleShowAllRound3Pairs}
                  className="px-3.5 py-2 rounded-2xl bg-blue-600 hover:bg-blue-500 text-white font-black text-xs shadow transition-all flex items-center gap-1.5 active:scale-95 disabled:opacity-40"
                  title="Chuyển màn hình LED về hiển thị đủ 5 cặp đấu trên sân khấu"
                >
                  <Eye className="w-4 h-4" />
                  <span>Hiện 5 Cặp (LED)</span>
                </button>

                <button
                  type="button"
                  disabled={actionLoading || r3TimerRunning}
                  onClick={() => handleRequestStageChange('FINISHED', 3, 'finish')}
                  className="px-4 py-2 rounded-2xl bg-gradient-to-r from-amber-500 to-yellow-500 hover:brightness-110 text-slate-950 font-black text-xs shadow transition-all flex items-center gap-1.5 active:scale-95 disabled:opacity-40"
                  title="Chuyển sang Tổng kết & Vinh danh"
                >
                  <Trophy className="w-4 h-4 fill-slate-950" />
                  <span>Chuyển sang Tổng kết</span>
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* BƯỚC 1: BỐC THĂM & GÁN 5 CẶP ĐẤU THỦ CÔNG */}
            <div className="bg-white border border-slate-200 rounded-3xl p-6 shadow space-y-4">
              <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                <div className="flex items-center gap-2">
                  <span className="w-6 h-6 rounded-full bg-amber-500 text-slate-950 text-xs font-black flex items-center justify-center">
                    1
                  </span>
                  <div>
                    <h4 className="text-sm font-black text-slate-900 uppercase">
                      BƯỚC 1: KẾT QUẢ BỐC THĂM 5 CẶP ĐẤU ĐỐI KHÁNG
                    </h4>
                    <p className="text-xs text-slate-500 mt-0.5">
                      Chọn 2 thí sinh cho mỗi cặp đấu và bấm "Lưu cặp". Màn hình LED sân khấu sẽ cập nhật tức thì.
                    </p>
                  </div>
                </div>

                <div className="text-xs font-bold text-slate-500">
                  Đã ghép:{' '}
                  <span className="text-indigo-600 font-black">
                    {round3DisplayPairs.filter((p) => p.player1 && p.player2).length} / 5 cặp
                  </span>
                </div>
              </div>

              {/* Grid 5 Cặp đấu */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
                {[1, 2, 3, 4, 5].map((pairNum) => {
                  const sel = pairSelections[pairNum] || { p1: '', p2: '' };
                  const displayPair = round3DisplayPairs.find((p) => p.pairNumber === pairNum);
                  const isAssigned = Boolean(displayPair?.player1 && displayPair?.player2);
                  const isActiveDuel = activeDuelPairNumber === pairNum;

                  // Lấy danh sách ID đã chọn ở cặp khác để đánh dấu
                  const usedOtherPlayerIds = new Set<number>();
                  Object.entries(pairSelections).forEach(([pNumStr, s]) => {
                    if (Number(pNumStr) !== pairNum) {
                      if (s.p1) usedOtherPlayerIds.add(Number(s.p1));
                      if (s.p2) usedOtherPlayerIds.add(Number(s.p2));
                    }
                  });
                  round3DisplayPairs.forEach((dp) => {
                    if (dp.pairNumber !== pairNum) {
                      const p1Id = dp.player1Id ?? dp.player1?.id;
                      const p2Id = dp.player2Id ?? dp.player2?.id;
                      if (p1Id) usedOtherPlayerIds.add(p1Id);
                      if (p2Id) usedOtherPlayerIds.add(p2Id);
                    }
                  });

                  return (
                    <div
                      key={pairNum}
                      className={`rounded-2xl p-4 flex flex-col justify-between border-2 transition-all space-y-3 ${
                        isActiveDuel
                          ? 'bg-indigo-50/70 border-indigo-500 shadow-lg ring-2 ring-indigo-400/30'
                          : isAssigned
                          ? 'bg-slate-50 border-blue-300 shadow-sm'
                          : 'bg-white border-dashed border-slate-300'
                      }`}
                    >
                      {/* Header Cặp */}
                      <div className="flex items-center justify-between pb-2 border-b border-slate-200">
                        <span className="px-2.5 py-0.5 rounded-full bg-blue-100 text-blue-800 font-black text-xs">
                          CẶP 0{pairNum}
                        </span>
                        <span
                          className={`text-[10px] font-bold px-2 py-0.5 rounded-md ${
                            isAssigned
                              ? 'bg-emerald-100 text-emerald-800'
                              : 'bg-slate-100 text-slate-500'
                          }`}
                        >
                          {isAssigned ? '✓ Đã gán' : 'Chờ gán'}
                        </span>
                      </div>

                      {/* Thí sinh 1 */}
                      <div className="space-y-1">
                        <label className="text-[10px] font-bold text-slate-500 block uppercase">
                          Thí sinh 1 (Bên trái):
                        </label>
                        <select
                          disabled={actionLoading || r3TimerRunning}
                          value={sel.p1}
                          onChange={(e) =>
                            setPairSelections((prev) => ({
                              ...prev,
                              [pairNum]: { ...prev[pairNum], p1: e.target.value ? Number(e.target.value) : '' },
                            }))
                          }
                          className="w-full bg-white border border-slate-300 rounded-xl p-2 text-xs font-bold text-slate-900 shadow-2xs focus:border-blue-500 disabled:opacity-50"
                        >
                          <option value="">-- Chọn thí sinh 1 --</option>
                          {session?.players?.map((p) => {
                            const isUsed = usedOtherPlayerIds.has(p.id);
                            const isSelectedAsP2 = Boolean(sel.p2) && Number(sel.p2) === p.id;
                            const isDisabled = isUsed || isSelectedAsP2;
                            return (
                              <option key={p.id} value={p.id} disabled={isDisabled}>
                                SBD {String(p.orderNumber).padStart(2, '0')} - {p.fullName} {isUsed ? '(Cặp khác)' : isSelectedAsP2 ? '(Đã chọn bên phải)' : ''}
                              </option>
                            );
                          })}
                        </select>
                      </div>

                      {/* Icon kiếm chéo VS */}
                      <div className="flex items-center justify-center py-0.5">
                        <div className="w-7 h-7 rounded-full bg-amber-50 border border-amber-300 flex items-center justify-center shadow-xs">
                          <Swords className="w-3.5 h-3.5 text-amber-600" />
                        </div>
                      </div>

                      {/* Thí sinh 2 */}
                      <div className="space-y-1">
                        <label className="text-[10px] font-bold text-slate-500 block uppercase">
                          Thí sinh 2 (Bên phải):
                        </label>
                        <select
                          disabled={actionLoading || r3TimerRunning}
                          value={sel.p2}
                          onChange={(e) =>
                            setPairSelections((prev) => ({
                              ...prev,
                              [pairNum]: { ...prev[pairNum], p2: e.target.value ? Number(e.target.value) : '' },
                            }))
                          }
                          className="w-full bg-white border border-slate-300 rounded-xl p-2 text-xs font-bold text-slate-900 shadow-2xs focus:border-rose-500 disabled:opacity-50"
                        >
                          <option value="">-- Chọn thí sinh 2 --</option>
                          {session?.players?.map((p) => {
                            const isUsed = usedOtherPlayerIds.has(p.id);
                            const isSelectedAsP1 = Boolean(sel.p1) && Number(sel.p1) === p.id;
                            const isDisabled = isUsed || isSelectedAsP1;
                            return (
                              <option key={p.id} value={p.id} disabled={isDisabled}>
                                SBD {String(p.orderNumber).padStart(2, '0')} - {p.fullName} {isUsed ? '(Cặp khác)' : isSelectedAsP1 ? '(Đã chọn bên trái)' : ''}
                              </option>
                            );
                          })}
                        </select>
                      </div>

                      {/* Nút hành động */}
                      <div className="pt-2 border-t border-slate-200 flex flex-col gap-1.5">
                        <div className="flex items-center gap-1.5">
                          <button
                            type="button"
                            disabled={actionLoading || r3TimerRunning || !sel.p1 || !sel.p2}
                            onClick={() => handleAssignRound3Pair(pairNum)}
                            className="flex-1 py-1.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-bold text-[11px] shadow-2xs transition-all flex items-center justify-center gap-1 disabled:opacity-40"
                          >
                            <Save className="w-3 h-3" />
                            <span>Lưu cặp</span>
                          </button>

                          {isAssigned && (
                            <button
                              type="button"
                              disabled={actionLoading || r3TimerRunning}
                              onClick={() => handleDeleteRound3Pair(pairNum)}
                              className="p-1.5 rounded-xl border border-slate-300 hover:bg-rose-50 text-slate-500 hover:text-rose-600 transition-all disabled:opacity-40"
                              title="Xóa cặp này (Màn hình LED sẽ reset về 5 cặp)"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          )}
                        </div>

                        {/* Nút Bắt đầu thi đấu cặp này (Hiển thị cặp lên LED ngay) */}
                        {isAssigned && (
                          <button
                            type="button"
                            disabled={actionLoading || (r3TimerRunning && !isActiveDuel)}
                            onClick={() => handleDisplayRound3Duel(pairNum)}
                            className={`w-full py-1.5 rounded-xl font-black text-[11px] shadow-xs transition-all flex items-center justify-center gap-1.5 ${
                              isActiveDuel
                                ? 'bg-amber-500 text-slate-950 ring-2 ring-amber-300'
                                : 'bg-gradient-to-r from-indigo-600 to-purple-600 hover:brightness-110 text-white'
                            } disabled:opacity-40`}
                            title="Bấm để đưa cặp này lên màn hình LED ngay lập tức (Chờ BGK đọc đề)"
                          >
                            <Play className="w-3 h-3 fill-current" />
                            <span>{isActiveDuel ? 'Đang chiếu LED' : 'Bắt đầu thi đấu cặp (LED)'}</span>
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* BƯỚC 2: BẢNG ĐIỀU HÀNH THI ĐẤU CẶP & 3 GIAI ĐOẠN NHỎ */}
            {activeDuelPairNumber && (() => {
              const currentPair = round3DisplayPairs.find((p) => p.pairNumber === activeDuelPairNumber);
              const p1 = currentPair?.player1;
              const p2 = currentPair?.player2;

              if (!p1 || !p2) {
                return (
                  <div className="bg-amber-50 border border-amber-200 rounded-3xl p-6 text-center text-xs text-amber-800">
                    Cặp 0{activeDuelPairNumber} chưa được gán đủ 2 thí sinh. Vui lòng chọn và lưu cặp ở Bước 1.
                  </div>
                );
              }

              const p1Raw = r3ScoresMap[p1.id] ?? (p1.round3Score ? Number(p1.round3Score) : 0);
              const p2Raw = r3ScoresMap[p2.id] ?? (p2.round3Score ? Number(p2.round3Score) : 0);
              const p1Pen = r3PenaltyMap[p1.id] ?? 0;
              const p2Pen = r3PenaltyMap[p2.id] ?? 0;
              const p1Final = Math.max(0, p1Raw - p1Pen);
              const p2Final = Math.max(0, p2Raw - p2Pen);

              return (
                <div className="bg-gradient-to-b from-slate-900 via-slate-950 to-slate-900 border-2 border-indigo-400 text-white rounded-3xl p-6 shadow-2xl space-y-6">
                  {/* Header Điều hành */}
                  <div className="flex flex-col md:flex-row md:items-center justify-between border-b border-slate-800 pb-4 gap-4">
                    <div className="flex items-center gap-3">
                      <div className="w-12 h-12 rounded-2xl bg-amber-400 text-slate-950 flex items-center justify-center font-black shadow-lg">
                        <Swords className="w-6 h-6" />
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="px-3 py-0.5 rounded-full bg-amber-400 text-slate-950 text-xs font-black">
                            CẶP ĐẤU 0{activeDuelPairNumber}
                          </span>
                          <span className="text-xs text-indigo-300 font-bold uppercase tracking-wider">
                            Đang hiển thị trên màn hình LED sân khấu
                          </span>
                        </div>
                        <h3 className="text-lg font-black text-white mt-1">
                          {p1.fullName} (SBD {String(p1.orderNumber).padStart(2, '0')}) ⚔️ {p2.fullName} (SBD {String(p2.orderNumber).padStart(2, '0')})
                        </h3>
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        disabled={actionLoading || r3TimerRunning}
                        onClick={handleShowAllRound3Pairs}
                        className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white text-xs font-bold transition-all border border-slate-700 flex items-center gap-1.5 disabled:opacity-40"
                      >
                        <Eye className="w-3.5 h-3.5" />
                        <span>Quay về 5 cặp (LED)</span>
                      </button>
                    </div>
                  </div>

                  {/* 3 Giai đoạn nhỏ theo thể lệ - Chọn giai đoạn & Thí sinh trình bày */}
                  <div className="space-y-3">
                    <div className="text-xs font-black text-indigo-300 uppercase tracking-wider flex items-center justify-between">
                      <span>CHỌN GIAI ĐOẠN & THÍ SINH TRÌNH BÀY (ĐỒNG BỘ HIGHLIGHT MÀN LED):</span>
                      <span className="text-[11px] text-amber-400 font-normal italic">
                        * Chuẩn bị tính chung cho cả 2 • Các phần thi khác chọn từng thí sinh
                      </span>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                      {/* Giai đoạn Chuẩn bị: 2 phút chuẩn bị (Cả 2 thí sinh) */}
                      <div className={`p-4 rounded-2xl border flex flex-col justify-between transition-all ${
                        r3DuelStage === 'STAGE_1_PREP'
                          ? 'bg-emerald-950/40 border-emerald-400 ring-2 ring-emerald-400/30'
                          : 'bg-slate-800/80 border-slate-700'
                      }`}>
                        <div>
                          <div className="text-[10px] font-black text-amber-400 uppercase tracking-wider">
                            CHUẨN BỊ (02 PHÚT)
                          </div>
                          <div className="text-sm font-black text-white mt-1">Chuẩn bị phương án</div>
                          <p className="text-[11px] text-slate-400 mt-1">Cả 2 thí sinh cùng có 120 giây chuẩn bị.</p>
                        </div>
                        <div className="pt-3">
                          <button
                            type="button"
                            disabled={actionLoading || r3TimerRunning}
                            onClick={() =>
                              handleStartRound3Duel(
                                activeDuelPairNumber,
                                'STAGE_1_PREP',
                                'CHUẨN BỊ PHƯƠNG ÁN',
                                120,
                                undefined
                              )
                            }
                            className={`w-full py-2.5 rounded-xl font-black text-xs transition-all flex items-center justify-center gap-1.5 shadow-md ${
                              r3DuelStage === 'STAGE_1_PREP' && r3TimerRunning
                                ? 'bg-emerald-500 text-white animate-pulse'
                                : 'bg-emerald-600 hover:bg-emerald-500 text-white'
                            } disabled:opacity-40`}
                          >
                            <Play className="w-3.5 h-3.5 fill-current" />
                            <span>BẮT ĐẦU 02 PHÚT (CẢ 2)</span>
                          </button>
                        </div>
                      </div>

                      {/* Giai đoạn Đề xuất phương án: 5 phút trình bày (Chọn từng thí sinh) */}
                      <div className={`p-4 rounded-2xl border flex flex-col justify-between transition-all ${
                        r3DuelStage === 'STAGE_1_PRESENT'
                          ? 'bg-indigo-950/40 border-indigo-400 ring-2 ring-indigo-400/30'
                          : 'bg-slate-800/80 border-slate-700'
                      }`}>
                        <div>
                          <div className="text-[10px] font-black text-amber-400 uppercase tracking-wider">
                            TRÌNH BÀY (05 PHÚT)
                          </div>
                          <div className="text-sm font-black text-white mt-1">Đề xuất phương án</div>
                          <p className="text-[11px] text-slate-400 mt-1">300s / thí sinh (quá 15s trừ 5đ).</p>
                        </div>
                        <div className="pt-3 space-y-2">
                          <button
                            type="button"
                            disabled={actionLoading || r3TimerRunning}
                            onClick={() =>
                              handleStartRound3Duel(
                                activeDuelPairNumber,
                                'STAGE_1_PRESENT',
                                'ĐỀ XUẤT PHƯƠNG ÁN',
                                300,
                                p1.id
                              )
                            }
                            className={`w-full py-1.5 px-2 rounded-xl font-bold text-xs transition-all flex items-center justify-between shadow-xs ${
                              r3DuelStage === 'STAGE_1_PRESENT' && r3ActiveSpeakerId === p1.id && r3TimerRunning
                                ? 'bg-amber-400 text-slate-950 ring-2 ring-amber-300'
                                : 'bg-slate-700 hover:bg-slate-600 text-amber-300'
                            } disabled:opacity-40`}
                          >
                            <span className="truncate">🎤 {p1.fullName}</span>
                            <span className="text-[10px] font-mono shrink-0">5p</span>
                          </button>
                          <button
                            type="button"
                            disabled={actionLoading || r3TimerRunning}
                            onClick={() =>
                              handleStartRound3Duel(
                                activeDuelPairNumber,
                                'STAGE_1_PRESENT',
                                'ĐỀ XUẤT PHƯƠNG ÁN',
                                300,
                                p2.id
                              )
                            }
                            className={`w-full py-1.5 px-2 rounded-xl font-bold text-xs transition-all flex items-center justify-between shadow-xs ${
                              r3DuelStage === 'STAGE_1_PRESENT' && r3ActiveSpeakerId === p2.id && r3TimerRunning
                                ? 'bg-rose-400 text-slate-950 ring-2 ring-rose-300'
                                : 'bg-slate-700 hover:bg-slate-600 text-rose-300'
                            } disabled:opacity-40`}
                          >
                            <span className="truncate">🎤 {p2.fullName}</span>
                            <span className="text-[10px] font-mono shrink-0">5p</span>
                          </button>
                        </div>
                      </div>

                      {/* Giai đoạn Xử lý tình huống: 3 phút trả lời tình huống BGK (Chọn từng thí sinh) */}
                      <div className={`p-4 rounded-2xl border flex flex-col justify-between transition-all ${
                        r3DuelStage === 'STAGE_2_QNA'
                          ? 'bg-purple-950/40 border-purple-400 ring-2 ring-purple-400/30'
                          : 'bg-slate-800/80 border-slate-700'
                      }`}>
                        <div>
                          <div className="text-[10px] font-black text-amber-400 uppercase tracking-wider">
                            TÌNH HUỐNG (03 PHÚT)
                          </div>
                          <div className="text-sm font-black text-white mt-1">Xử lý tình huống</div>
                          <p className="text-[11px] text-slate-400 mt-1">180s / thí sinh xử lý tình huống.</p>
                        </div>
                        <div className="pt-3 space-y-2">
                          <button
                            type="button"
                            disabled={actionLoading || r3TimerRunning}
                            onClick={() =>
                              handleStartRound3Duel(
                                activeDuelPairNumber,
                                'STAGE_2_QNA',
                                'XỬ LÝ TÌNH HUỐNG',
                                180,
                                p1.id
                              )
                            }
                            className={`w-full py-1.5 px-2 rounded-xl font-bold text-xs transition-all flex items-center justify-between shadow-xs ${
                              r3DuelStage === 'STAGE_2_QNA' && r3ActiveSpeakerId === p1.id && r3TimerRunning
                                ? 'bg-amber-400 text-slate-950 ring-2 ring-amber-300'
                                : 'bg-slate-700 hover:bg-slate-600 text-amber-300'
                            } disabled:opacity-40`}
                          >
                            <span className="truncate">🎤 {p1.fullName}</span>
                            <span className="text-[10px] font-mono shrink-0">3p</span>
                          </button>
                          <button
                            type="button"
                            disabled={actionLoading || r3TimerRunning}
                            onClick={() =>
                              handleStartRound3Duel(
                                activeDuelPairNumber,
                                'STAGE_2_QNA',
                                'XỬ LÝ TÌNH HUỐNG',
                                180,
                                p2.id
                              )
                            }
                            className={`w-full py-1.5 px-2 rounded-xl font-bold text-xs transition-all flex items-center justify-between shadow-xs ${
                              r3DuelStage === 'STAGE_2_QNA' && r3ActiveSpeakerId === p2.id && r3TimerRunning
                                ? 'bg-rose-400 text-slate-950 ring-2 ring-rose-300'
                                : 'bg-slate-700 hover:bg-slate-600 text-rose-300'
                            } disabled:opacity-40`}
                          >
                            <span className="truncate">🎤 {p2.fullName}</span>
                            <span className="text-[10px] font-mono shrink-0">3p</span>
                          </button>
                        </div>
                      </div>

                      {/* Giai đoạn Tranh luận: 1 phút tranh luận (Chọn từng thí sinh) */}
                      <div className={`p-4 rounded-2xl border flex flex-col justify-between transition-all ${
                        r3DuelStage === 'STAGE_3_DEBATE'
                          ? 'bg-blue-950/40 border-blue-400 ring-2 ring-blue-400/30'
                          : 'bg-slate-800/80 border-slate-700'
                      }`}>
                        <div>
                          <div className="text-[10px] font-black text-amber-400 uppercase tracking-wider">
                            TRANH BIỆN (01 PHÚT)
                          </div>
                          <div className="text-sm font-black text-white mt-1">Tranh luận & Phản biện</div>
                          <p className="text-[11px] text-slate-400 mt-1">60s / thí sinh phản biện đối thủ.</p>
                        </div>
                        <div className="pt-3 space-y-2">
                          <button
                            type="button"
                            disabled={actionLoading || r3TimerRunning}
                            onClick={() =>
                              handleStartRound3Duel(
                                activeDuelPairNumber,
                                'STAGE_3_DEBATE',
                                'TRANH LUẬN & PHẢN BIỆN',
                                60,
                                p1.id
                              )
                            }
                            className={`w-full py-1.5 px-2 rounded-xl font-bold text-xs transition-all flex items-center justify-between shadow-xs ${
                              r3DuelStage === 'STAGE_3_DEBATE' && r3ActiveSpeakerId === p1.id && r3TimerRunning
                                ? 'bg-amber-400 text-slate-950 ring-2 ring-amber-300'
                                : 'bg-slate-700 hover:bg-slate-600 text-amber-300'
                            } disabled:opacity-40`}
                          >
                            <span className="truncate">🎤 {p1.fullName}</span>
                            <span className="text-[10px] font-mono shrink-0">1p</span>
                          </button>
                          <button
                            type="button"
                            disabled={actionLoading || r3TimerRunning}
                            onClick={() =>
                              handleStartRound3Duel(
                                activeDuelPairNumber,
                                'STAGE_3_DEBATE',
                                'TRANH LUẬN & PHẢN BIỆN',
                                60,
                                p2.id
                              )
                            }
                            className={`w-full py-1.5 px-2 rounded-xl font-bold text-xs transition-all flex items-center justify-between shadow-xs ${
                              r3DuelStage === 'STAGE_3_DEBATE' && r3ActiveSpeakerId === p2.id && r3TimerRunning
                                ? 'bg-rose-400 text-slate-950 ring-2 ring-rose-300'
                                : 'bg-slate-700 hover:bg-slate-600 text-rose-300'
                            } disabled:opacity-40`}
                          >
                            <span className="truncate">🎤 {p2.fullName}</span>
                            <span className="text-[10px] font-mono shrink-0">1p</span>
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* BẢNG ĐIỀU KHIỂN ĐỒNG HỒ THI ĐẤU (PAUSE, RESUME, RESET, END & TỰ ĐỘNG QUÁ GIỜ) */}
                  <div className="bg-slate-950/90 border border-slate-800 rounded-3xl p-6 shadow-inner space-y-6">
                    <div className="flex flex-col lg:flex-row items-center justify-between gap-6">
                      {/* Trạng thái giai đoạn & Thí sinh */}
                      <div className="space-y-1.5 text-center lg:text-left">
                        <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                          GIAI ĐOẠN ĐANG ĐIỀU HÀNH:
                        </div>
                        <div className="text-base font-black text-amber-300">
                          {r3DuelStageTitle || 'Chưa chọn giai đoạn'}
                        </div>
                        {r3ActiveSpeakerId ? (
                          <div className="text-xs font-bold text-emerald-400 flex items-center justify-center lg:justify-start gap-1.5 mt-1">
                            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                            <span>
                              Thí sinh phát biểu:{' '}
                              <strong className="text-white">
                                {r3ActiveSpeakerId === p1.id ? p1.fullName : p2.fullName}
                              </strong>
                            </span>
                          </div>
                        ) : (
                          <div className="text-xs text-slate-400">
                            Cả 2 thí sinh cùng chuẩn bị
                          </div>
                        )}
                      </div>

                      {/* Đồng hồ số trung tâm */}
                      <div className="flex flex-col items-center justify-center">
                        {r3OvertimeRunning ? (
                          <div className="text-center animate-scaleUp">
                            <div className="text-4xl sm:text-6xl font-mono font-black text-rose-500 animate-pulse drop-shadow-[0_0_20px_rgba(244,63,94,0.6)]">
                              {String(Math.floor(r3OvertimeSeconds / 60)).padStart(2, '0')}:
                              {String(r3OvertimeSeconds % 60).padStart(2, '0')}
                            </div>
                            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-rose-500/20 border border-rose-500/50 text-rose-300 text-[10px] font-black uppercase tracking-wider mt-2 animate-bounce">
                              <AlertTriangle className="w-3.5 h-3.5" />
                              <span>ĐANG QUÁ GIỜ (CỨ 15S TRỪ 5Đ)</span>
                            </div>
                          </div>
                        ) : (
                          <div className="text-center">
                            <div className={`text-4xl sm:text-6xl font-mono font-black tracking-tight ${
                              r3TimerRunning
                                ? 'text-emerald-400 animate-pulse drop-shadow-[0_0_20px_rgba(52,211,153,0.5)]'
                                : r3TimerPaused
                                ? 'text-amber-400 drop-shadow-[0_0_20px_rgba(251,191,36,0.5)]'
                                : r3TimerEnded || r3TimeUp
                                ? 'text-rose-500'
                                : 'text-slate-300'
                            }`}>
                              {String(Math.floor(r3Timer / 60)).padStart(2, '0')}:
                              {String(r3Timer % 60).padStart(2, '0')}
                            </div>
                            <div className="mt-2">
                              {r3TimerPaused ? (
                                <span className="inline-flex items-center gap-1 px-3 py-0.5 rounded-full bg-amber-500/20 border border-amber-400 text-amber-300 text-[10px] font-black uppercase tracking-wider animate-pulse">
                                  <Pause className="w-3 h-3 fill-current" /> ĐANG TẠM DỪNG
                                </span>
                              ) : r3TimerRunning ? (
                                <span className="inline-flex items-center gap-1 px-3 py-0.5 rounded-full bg-emerald-500/20 border border-emerald-400 text-emerald-300 text-[10px] font-black uppercase tracking-wider">
                                  <Timer className="w-3 h-3" /> ĐANG ĐẾM GIỜ
                                </span>
                              ) : r3TimerEnded ? (
                                <span className="inline-flex items-center gap-1 px-3 py-0.5 rounded-full bg-slate-800 border border-slate-700 text-slate-400 text-[10px] font-black uppercase tracking-wider">
                                  <CheckCircle2 className="w-3 h-3" /> ĐÃ KẾT THÚC PHẦN THI
                                </span>
                              ) : r3TimeUp ? (
                                <span className="inline-flex items-center gap-1 px-3 py-0.5 rounded-full bg-rose-500/20 border border-rose-400 text-rose-300 text-[10px] font-black uppercase tracking-wider">
                                  HẾT GIỜ
                                </span>
                              ) : (
                                <span className="text-[10px] font-black uppercase text-slate-500 tracking-wider">
                                  CHỜ PHÁT LỆNH
                                </span>
                              )}
                            </div>
                          </div>
                        )}
                      </div>

                      {/* Hiển thị số giây quá giờ đã chốt nếu có */}
                      {!r3OvertimeRunning && r3OvertimeSeconds > 0 && (
                        <div className="text-center p-3 rounded-2xl bg-slate-900 border border-slate-800">
                          <div className="text-xs text-slate-400 font-bold">Quá giờ đã ghi nhận:</div>
                          <div className="text-xl font-mono font-black text-rose-400 mt-0.5">
                            {r3OvertimeSeconds}s
                          </div>
                          <div className="text-[10px] text-amber-400 font-bold">
                            Gợi ý trừ: -{Math.floor(r3OvertimeSeconds / 15) * 5}đ
                          </div>
                        </div>
                      )}
                    </div>

                    {/* 4 NÚT ĐIỀU KHIỂN CHÍNH */}
                    <div className="pt-4 border-t border-slate-800 flex flex-wrap items-center justify-center gap-3">
                      {/* Nút 1: Tiếp tục (khi đang tạm dừng) */}
                      {r3TimerPaused && (
                        <button
                          type="button"
                          disabled={actionLoading}
                          onClick={handleResumeRound3DuelTimer}
                          className="px-5 py-3 rounded-2xl bg-emerald-600 hover:bg-emerald-500 text-white font-black text-xs shadow-lg transition-all active:scale-95 flex items-center gap-2 animate-pulse"
                        >
                          <Play className="w-4 h-4 fill-current" />
                          <span>TIẾP TỤC ĐẾM GIỜ</span>
                        </button>
                      )}

                      {/* Nút 2: Tạm dừng (khi đang chạy) */}
                      {(r3TimerRunning || r3OvertimeRunning) && !r3TimerPaused && (
                        <button
                          type="button"
                          disabled={actionLoading}
                          onClick={handlePauseRound3DuelTimer}
                          className="px-5 py-3 rounded-2xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-black text-xs shadow-lg transition-all active:scale-95 flex items-center gap-2"
                        >
                          <Pause className="w-4 h-4 fill-current" />
                          <span>TẠM DỪNG</span>
                        </button>
                      )}

                      {/* Nút 3: Reset đồng hồ */}
                      <button
                        type="button"
                        disabled={actionLoading}
                        onClick={handleResetRound3DuelTimer}
                        className="px-5 py-3 rounded-2xl bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 font-bold text-xs shadow-md transition-all active:scale-95 flex items-center gap-2 disabled:opacity-40"
                      >
                        <RotateCcw className="w-4 h-4" />
                        <span>RESET ĐẾM GIỜ</span>
                      </button>

                      {/* Nút 4: Kết thúc phần đếm giờ (Chốt giờ) */}
                      <button
                        type="button"
                        disabled={actionLoading || (r3TimerEnded && !r3TimerRunning && !r3OvertimeRunning)}
                        onClick={handleEndRound3DuelTimer}
                        className={`px-6 py-3 rounded-2xl text-white font-black text-xs shadow-lg transition-all active:scale-95 flex items-center gap-2 ${
                          r3TimerEnded && !r3TimerRunning && !r3OvertimeRunning
                            ? 'bg-slate-700 text-slate-400 cursor-not-allowed border border-slate-600 opacity-80'
                            : 'bg-rose-600 hover:bg-rose-500'
                        }`}
                        title="Dừng đếm giờ, kết thúc phần thi và tự động ghi nhận số giây quá giờ để gợi ý điểm trừ"
                      >
                        <StopCircle className="w-4 h-4" />
                        <span>{r3TimerEnded && !r3TimerRunning && !r3OvertimeRunning ? 'ĐÃ CHỐT KẾT THÚC' : 'KẾT THÚC PHẦN THI (CHỐT GIỜ)'}</span>
                      </button>
                    </div>
                  </div>

                  {/* THÔNG BÁO CHUYỂN CHẤM ĐIỂM SANG BƯỚC 3 */}
                  <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-4 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs">
                    <div className="flex items-center gap-3">
                      <div className="w-9 h-9 rounded-xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-center text-amber-400 shrink-0">
                        <Award className="w-5 h-5" />
                      </div>
                      <div>
                        <div className="font-bold text-slate-200">
                          Chấm điểm tập trung một lần ở Bước 3
                        </div>
                        <div className="text-slate-400 text-[11px] mt-0.5">
                          Ban Giám khảo chỉ cần tập trung điều phối timer trong khi thi. Điểm số sẽ được nhập và chốt tại <strong className="text-amber-300">Bảng tổng hợp điểm (Bước 3)</strong> bên dưới. Hệ thống tự động ghi nhận số giây quá giờ để tính sẵn điểm trừ gợi ý (có thể chỉnh sửa).
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })()}

            {/* BƯỚC 3: BẢNG KẾT QUẢ ĐỐI KHÁNG VÒNG 3 & TỔNG ĐIỂM CHUNG CUỘC */}
            <div className="bg-white border border-slate-200 rounded-3xl p-6 shadow space-y-4">
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between border-b border-slate-100 pb-4 gap-3">
                <div className="flex items-center gap-2">
                  <span className="w-6 h-6 rounded-full bg-amber-500 text-slate-950 text-xs font-black flex items-center justify-center">
                    3
                  </span>
                  <div>
                    <h4 className="text-sm font-black text-slate-900 uppercase">
                      BẢNG TỔNG HỢP ĐIỂM VÒNG 3 & TỔNG ĐIỂM CHUNG CUỘC
                    </h4>
                    <p className="text-xs text-slate-500 mt-0.5">
                      Toàn bộ 10 thí sinh xếp theo Số báo danh. Điểm chốt V3 = Điểm BGK chấm - Điểm trừ quá giờ.
                    </p>
                  </div>
                </div>

                <button
                  type="button"
                  disabled={actionLoading}
                  onClick={handleSaveAllR3Scores}
                  className="px-4 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-black text-xs shadow-md transition-all active:scale-95 flex items-center gap-2 shrink-0"
                >
                  <Save className="w-4 h-4" />
                  <span>LƯU TẤT CẢ 10 THÍ SINH</span>
                </button>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead>
                    <tr className="border-b border-slate-200 text-slate-500 font-bold bg-slate-50/50">
                      <th className="py-3 px-3">SBD</th>
                      <th className="py-3 px-3">Thí sinh</th>
                      <th className="py-3 px-3">Đơn vị</th>
                      <th className="py-3 px-3">Cặp đấu</th>
                      <th className="py-3 px-3 text-center">Điểm V1</th>
                      <th className="py-3 px-3 text-center">Điểm V2</th>
                      <th className="py-3 px-3 text-center min-w-[120px]">Điểm BGK (max 100)</th>
                      <th className="py-3 px-3 text-center min-w-[140px]">Trừ quá giờ (Gợi ý)</th>
                      <th className="py-3 px-3 text-center font-black text-slate-900">Điểm chốt V3</th>
                      <th className="py-3 px-3 text-right">Tổng tích lũy</th>
                      <th className="py-3 px-3 text-center">Hành động</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {session?.players?.map((p) => {
                      const rawScore = r3ScoresMap[p.id] ?? (p.round3Score ? Number(p.round3Score) : 0);
                      const penScore = r3PenaltyMap[p.id] ?? (p.round3SuggestedPenalty ?? 0);
                      const finalV3 = Math.max(0, rawScore - penScore);
                      const totalCumulative =
                        Number(p.round1Score || 0) +
                        Number(p.round2Score || 0) +
                        Number(finalV3 || 0);
                      const otSec = p.round3OvertimeSeconds || 0;

                      return (
                        <tr key={p.id} className="hover:bg-slate-50/80 transition-colors">
                          <td className="py-3 px-3 font-black text-amber-600">
                            {String(p.orderNumber).padStart(2, '0')}
                          </td>
                          <td className="py-3 px-3">
                            <div className="flex items-center gap-2">
                              <div className="w-7 h-7 rounded-lg overflow-hidden bg-blue-100 flex items-center justify-center font-bold text-blue-700 text-xs shrink-0">
                                {p.avatarUrl ? (
                                  <img src={p.avatarUrl} alt="" className="w-full h-full object-cover" />
                                ) : (
                                  p.fullName.charAt(0)
                                )}
                              </div>
                              <span className="font-bold text-slate-900 truncate max-w-[150px]">
                                {p.fullName}
                              </span>
                            </div>
                          </td>
                          <td className="py-3 px-3 text-slate-500 truncate max-w-[140px]">{p.unit}</td>
                          <td className="py-3 px-3">
                            <span className="px-2 py-0.5 rounded-md bg-indigo-50 text-indigo-700 border border-indigo-200 font-black text-xs">
                              {p.round3PairGroup ? `CẶP 0${p.round3PairGroup}` : '—'}
                            </span>
                          </td>
                          <td className="py-3 px-3 text-center font-bold text-slate-700">
                            {formatScore(p.round1Score)}đ
                          </td>
                          <td className="py-3 px-3 text-center font-bold text-slate-700">
                            {formatScore(p.round2Score)}đ
                          </td>
                          <td className="py-3 px-3 text-center">
                            <input
                              type="number"
                              min="0"
                              max="100"
                              step="1"
                              value={rawScore}
                              onChange={(e) => {
                                const val = Number(e.target.value);
                                setR3ScoresMap((prev) => ({ ...prev, [p.id]: val }));
                              }}
                              className="w-20 text-center bg-white border border-slate-300 focus:border-indigo-500 rounded-lg py-1.5 px-2 text-xs font-black text-slate-900 shadow-2xs"
                            />
                          </td>
                          <td className="py-3 px-3 text-center">
                            <div className="flex flex-col items-center gap-1">
                              <input
                                type="number"
                                min="0"
                                max="50"
                                step="1"
                                value={penScore}
                                onChange={(e) => {
                                  const val = Number(e.target.value);
                                  setR3PenaltyMap((prev) => ({ ...prev, [p.id]: val }));
                                }}
                                className="w-20 text-center bg-rose-50/60 border border-rose-300 focus:border-rose-500 rounded-lg py-1.5 px-2 text-xs font-black text-rose-600 shadow-2xs"
                              />
                              {otSec > 0 && (
                                <span className="text-[10px] font-bold text-rose-500 bg-rose-100/80 px-1.5 py-0.5 rounded">
                                  {otSec}s quá giờ
                                </span>
                              )}
                            </div>
                          </td>
                          <td className="py-3 px-3 text-center font-black text-sm text-indigo-700">
                            {formatScore(finalV3)}đ
                          </td>
                          <td className="py-3 px-3 text-right font-black text-amber-600 text-sm">
                            {formatScore(totalCumulative)}đ
                          </td>
                          <td className="py-3 px-3 text-center">
                            <button
                              type="button"
                              disabled={actionLoading}
                              onClick={() => handleSaveSingleR3Score(p.id, rawScore, penScore)}
                              className="px-3 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs shadow-2xs transition-all active:scale-95 inline-flex items-center gap-1"
                              title="Lưu điểm Vòng 3 thí sinh này"
                            >
                              <Save className="w-3.5 h-3.5" />
                              <span>Lưu</span>
                            </button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>

              {/* Hàng nút điều phối cuối Vòng 3 */}
              <div className="flex flex-wrap items-center justify-between gap-3 pt-4 border-t border-slate-100">
                <div className="flex flex-wrap items-center gap-2">
                  <button
                    type="button"
                    disabled={actionLoading}
                    onClick={handleShowRound3Rules}
                    className="px-4 py-2.5 rounded-2xl border border-amber-400 bg-amber-50 hover:bg-amber-100 text-amber-900 font-bold text-xs transition-all flex items-center gap-1.5 shadow-2xs active:scale-95"
                    title="Chiếu lại màn hình Thể lệ Vòng 3 lên sân khấu LED"
                  >
                    <BookOpen className="w-4 h-4 text-amber-600" />
                    <span>Chiếu Thể lệ V3 (LED)</span>
                  </button>

                  <button
                    type="button"
                    disabled={actionLoading}
                    onClick={handleShowAllRound3Pairs}
                    className="px-4 py-2.5 rounded-2xl border border-slate-300 bg-slate-50 hover:bg-slate-100 text-slate-700 font-bold text-xs transition-all flex items-center gap-1.5 shadow-2xs active:scale-95"
                    title="Chiếu lại màn hình tổng quan 5 cặp đấu đối kháng"
                  >
                    <Users className="w-4 h-4" />
                    <span>Chiếu Tổng quan 5 Cặp (LED)</span>
                  </button>
                </div>

                <div className="flex flex-wrap items-center gap-2">
                  <button
                    type="button"
                    disabled={actionLoading}
                    onClick={() => {
                      handleSwitchFinishViewMode('BOARD');
                    }}
                    className="px-4 py-2.5 rounded-2xl border border-blue-300 bg-blue-50 hover:bg-blue-100 text-blue-800 font-black text-xs transition-all flex items-center gap-1.5 shadow-2xs active:scale-95"
                    title="Chiếu Bảng điểm tổng hợp 3 vòng lên màn LED (không kết thúc phiên thi)"
                  >
                    <BarChart3 className="w-4 h-4" />
                    <span>Chiếu Bảng điểm 3 vòng</span>
                  </button>

                  <button
                    type="button"
                    disabled={actionLoading}
                    onClick={handleFinishSession}
                    className="px-5 py-2.5 rounded-2xl bg-gradient-to-r from-amber-500 via-yellow-400 to-amber-600 text-slate-950 font-black text-xs shadow-xl shadow-amber-500/30 hover:scale-105 active:scale-95 transition-all flex items-center gap-2"
                    title="Kích hoạt Bục vinh danh trao giải trên màn hình LED và chuyển sang màn hình vinh danh"
                  >
                    <Trophy className="w-4 h-4 fill-slate-950" />
                    <span>HOÀN TẤT & VINH DANH CHUNG CUỘC</span>
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ========================================================= */}
        {/* TAB 5: FINISH & AWARDS */}
        {/* ========================================================= */}
        {activeTab === 'finish' && (
          <div className="space-y-6 animate-fadeIn">
            <div className="bg-gradient-to-r from-amber-500/20 via-slate-900 to-amber-500/20 border-2 border-amber-400/60 rounded-3xl p-6 flex items-center justify-between shadow-2xl">
              <div>
                <h3 className="text-base font-black text-amber-700 uppercase tracking-wide">
                  TỔNG KẾT & KÍCH HOẠT VINH DANH SÂN KHẤU
                </h3>
                <p className="text-xs text-slate-600 mt-1 max-w-xl">
                  Hệ thống tự động xếp hạng 10 thí sinh theo quy chế: 01 Giải Nhất, 03 Giải Nhì, 06 Giải Ba. Nhấn nút bên cạnh để bắn pháo hoa và chiếu bục vinh danh lên màn hình LED.
                </p>
              </div>

              <div className="flex flex-wrap items-center gap-2.5">
                <button
                  type="button"
                  disabled={actionLoading}
                  onClick={() => handleRequestStageChange('ROUND3', 3, 'round3')}
                  className="px-3.5 py-2.5 rounded-2xl border border-rose-300 bg-rose-50 hover:bg-rose-100 text-rose-700 font-bold text-xs transition-all flex items-center gap-1.5 shadow-2xs active:scale-95"
                  title="Quay lại Vòng 3: Bản lĩnh (Hiển thị cảnh báo xác nhận)"
                >
                  <ChevronLeft className="w-4 h-4" />
                  <span>Quay lại Vòng 3</span>
                </button>

                <button
                  type="button"
                  disabled={actionLoading}
                  onClick={() => handleSwitchFinishViewMode('BOARD')}
                  className="px-3.5 py-2.5 rounded-2xl border border-blue-300 bg-blue-50 hover:bg-blue-100 text-blue-800 font-black text-xs transition-all flex items-center gap-1.5 shadow-2xs active:scale-95"
                  title="Chiếu Bảng điểm tổng hợp 3 vòng lên màn hình LED"
                >
                  <BarChart3 className="w-4 h-4" />
                  <span>Chiếu Bảng điểm 3 vòng</span>
                </button>

                <button
                  type="button"
                  disabled={actionLoading}
                  onClick={() => handleSwitchFinishViewMode('PODIUM')}
                  className="px-3.5 py-2.5 rounded-2xl border border-amber-300 bg-amber-50 hover:bg-amber-100 text-amber-900 font-black text-xs transition-all flex items-center gap-1.5 shadow-2xs active:scale-95"
                  title="Chiếu Bục vinh danh trao giải lên màn hình LED"
                >
                  <Crown className="w-4 h-4" />
                  <span>Chiếu Bục vinh danh</span>
                </button>

                <button
                  onClick={handleFinishSession}
                  className="px-5 py-2.5 rounded-2xl bg-gradient-to-r from-amber-500 via-yellow-400 to-amber-600 text-slate-950 font-black text-xs shadow-xl shadow-amber-500/30 hover:scale-105 active:scale-95 transition-all flex items-center gap-2"
                >
                  <Trophy className="w-4 h-4 fill-slate-950" /> VINH DANH CHUNG CUỘC
                </button>
              </div>
            </div>

            {/* Standings Table */}
            <div className="bg-white border border-slate-200 rounded-3xl p-5 shadow">
              <h3 className="text-xs font-black text-slate-600 uppercase tracking-wider mb-3">
                BẢNG TỔNG HỢP XẾP HẠNG CHUNG CUỘC:
              </h3>
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead>
                    <tr className="border-b border-slate-200 text-slate-500">
                      <th className="pb-2">Hạng</th>
                      <th className="pb-2">Giải thưởng</th>
                      <th className="pb-2">SBD</th>
                      <th className="pb-2">Họ và tên</th>
                      <th className="pb-2">Đơn vị</th>
                      <th className="pb-2 text-right">V1</th>
                      <th className="pb-2 text-right">V2</th>
                      <th className="pb-2 text-right">V3</th>
                      <th className="pb-2 text-right">TỔNG ĐIỂM</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800/60">
                    {sortedLeaderboard.map((p, idx) => {
                      const rank = p.finalRank || (idx + 1);
                      const prize = rank === 1 ? 'QUÁN QUÂN' : rank <= 4 ? 'GIẢI NHÌ' : 'GIẢI BA';
                      return (
                        <tr key={p.id} className="hover:bg-slate-200/40">
                          <td className="py-2.5 font-black text-amber-600">
                            <span className="flex items-center gap-1">
                              <span>{rank === 1 ? '🥇' : rank <= 4 ? '🥈' : '🥉'}</span>
                              <span>{rank}</span>
                            </span>
                          </td>
                          <td className="py-2.5 font-bold">
                            <span
                              className={`px-2 py-0.5 rounded text-[10px] font-black inline-flex items-center gap-1 ${
                                rank === 1
                                  ? 'bg-amber-400 text-slate-950 shadow-xs'
                                  : rank <= 4
                                  ? 'bg-sky-100 text-sky-900 border border-sky-300'
                                  : 'bg-amber-100 text-amber-900 border border-amber-300'
                              }`}
                            >
                              {prize}
                            </span>
                          </td>
                          <td className="py-2.5 font-bold text-slate-500">
                            {String(p.orderNumber).padStart(2, '0')}
                          </td>
                          <td className="py-2.5 font-bold text-slate-900">{p.fullName}</td>
                          <td className="py-2.5 text-slate-500">{p.unit}</td>
                          <td className="py-2.5 text-right font-semibold text-slate-600">{formatScore(p.round1Score)}đ</td>
                          <td className="py-2.5 text-right font-semibold text-slate-600">{formatScore(p.round2Score)}đ</td>
                          <td className="py-2.5 text-right font-semibold text-slate-600">{formatScore(p.round3Score)}đ</td>
                          <td className="py-2.5 text-right font-black text-amber-600 text-sm">{formatScore(p.totalScore)}đ</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}
      {/* Modal Thêm / Sửa Thí sinh */}
      {playerModalOpen && (
        <div className="fixed inset-0 bg-slate-50/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white border border-slate-200 rounded-3xl p-6 max-w-lg w-full shadow-2xl space-y-4 animate-scaleUp">
            <div className="flex items-center justify-between border-b border-slate-200 pb-3">
              <h3 className="text-base font-black text-slate-900 uppercase flex items-center gap-2">
                <Users className="w-5 h-5 text-blue-400" />
                {editingPlayerIndex !== null ? 'CHỈNH SỬA THÔNG TIN THÍ SINH' : 'THÊM MỚI THÍ SINH VÒNG CHUNG KẾT'}
              </h3>
              <button
                onClick={() => setPlayerModalOpen(false)}
                className="p-1 rounded-lg text-slate-500 hover:text-slate-900 hover:bg-slate-200"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-3 text-xs">
              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="text-slate-500 font-bold block mb-1">Số báo danh (SBD):</label>
                  <input
                    type="number"
                    min="1"
                    max="99"
                    value={playerFormData.orderNumber}
                    onChange={(e) => setPlayerFormData({ ...playerFormData, orderNumber: Number(e.target.value) })}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2.5 text-slate-900 font-black text-amber-600 text-center"
                  />
                </div>
                <div className="col-span-2">
                  <label className="text-slate-500 font-bold block mb-1">Họ và tên thí sinh (*):</label>
                  <input
                    type="text"
                    placeholder="Nguyễn Văn A..."
                    value={playerFormData.fullName}
                    onChange={(e) => setPlayerFormData({ ...playerFormData, fullName: e.target.value })}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2.5 text-slate-900 font-bold"
                  />
                </div>
              </div>

              <div>
                <label className="text-slate-500 font-bold block mb-1">Đơn vị trực thuộc (*):</label>
                <input
                  type="text"
                  placeholder="Huyện đoàn ..., Thị đoàn ..., Đoàn Khối..."
                  value={playerFormData.unit}
                  onChange={(e) => setPlayerFormData({ ...playerFormData, unit: e.target.value })}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2.5 text-slate-900"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-slate-500 font-bold block mb-1">Email nhận mã OTP:</label>
                  <input
                    type="email"
                    placeholder="email@gmail.com..."
                    value={playerFormData.email}
                    onChange={(e) => setPlayerFormData({ ...playerFormData, email: e.target.value })}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2.5 text-amber-700 font-mono text-xs"
                  />
                </div>
                <div>
                  <label className="text-slate-500 font-bold block mb-1">Số điện thoại liên hệ:</label>
                  <input
                    type="text"
                    placeholder="0912..."
                    value={playerFormData.phone}
                    onChange={(e) => setPlayerFormData({ ...playerFormData, phone: e.target.value })}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2.5 text-slate-900 font-mono text-xs"
                  />
                </div>
              </div>

              <div>
                <label className="text-slate-500 font-bold block mb-1">Link ảnh đại diện (Avatar URL):</label>
                <div className="flex gap-2">
                  <input
                    type="text"
                    placeholder="https://example.com/avatar.jpg"
                    value={playerFormData.avatarUrl}
                    onChange={(e) => setPlayerFormData({ ...playerFormData, avatarUrl: e.target.value })}
                    className="flex-1 bg-slate-50 border border-slate-200 rounded-xl p-2.5 text-slate-600 text-xs"
                  />
                  {playerFormData.avatarUrl && (
                    <img
                      src={playerFormData.avatarUrl}
                      alt=""
                      className="w-9 h-9 rounded-xl object-cover border border-slate-300"
                    />
                  )}
                </div>
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-200">
              <button
                onClick={() => setPlayerModalOpen(false)}
                className="px-4 py-2 rounded-xl bg-slate-200 hover:bg-slate-300 text-slate-600 font-bold text-xs"
              >
                Hủy bỏ
              </button>
              <button
                onClick={handleSavePlayerForm}
                className="px-5 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs shadow active:scale-95"
              >
                {editingPlayerIndex !== null ? 'Cập nhật thí sinh' : 'Thêm vào danh sách'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal Xác nhận Chuẩn Hệ thống */}
      {confirmDialog && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 animate-in fade-in">
          <div className={`bg-white rounded-3xl shadow-2xl w-full max-w-lg p-6 space-y-4 animate-scaleUp ${
            confirmDialog.confirmType === 'danger'
              ? 'border-2 border-rose-400 ring-4 ring-rose-100'
              : 'border border-slate-200'
          }`}>
            <div className="flex items-start gap-3.5">
              <div className={`w-11 h-11 rounded-2xl flex items-center justify-center shrink-0 ${
                confirmDialog.confirmType === 'danger'
                  ? 'bg-rose-100 text-rose-600 ring-2 ring-rose-200'
                  : 'bg-amber-100 text-amber-700'
              }`}>
                <AlertTriangle className="w-6 h-6" />
              </div>
              <div className="flex-1">
                <h3 className={`text-base font-black ${
                  confirmDialog.confirmType === 'danger' ? 'text-rose-950' : 'text-slate-900'
                }`}>
                  {confirmDialog.title}
                </h3>
                <p className="text-xs text-slate-600 mt-2 leading-relaxed whitespace-pre-line">
                  {confirmDialog.message}
                </p>
              </div>
            </div>
            <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setConfirmDialog(null)}
                className="px-4 py-2 rounded-xl text-xs font-bold text-slate-600 hover:bg-slate-100 transition-colors"
              >
                Hủy bỏ
              </button>
              <button
                type="button"
                onClick={() => {
                  const fn = confirmDialog.onConfirm;
                  setConfirmDialog(null);
                  fn();
                }}
                className={`px-5 py-2.5 rounded-xl text-xs font-black text-white shadow-md transition-all active:scale-95 ${
                  confirmDialog.confirmType === 'danger'
                    ? 'bg-rose-600 hover:bg-rose-700 ring-2 ring-rose-300'
                    : 'bg-blue-600 hover:bg-blue-500'
                }`}
              >
                {confirmDialog.confirmText || 'Xác nhận'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal Cấp mã OTP cứu hộ cho Admin đọc cho thí sinh */}
      {supportOtpDialog && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 animate-in fade-in">
          <div className="bg-white rounded-3xl shadow-2xl w-full max-w-sm p-6 space-y-4 border-2 border-amber-500 animate-scaleUp text-center">
            <div className="w-14 h-14 rounded-2xl bg-amber-100 text-amber-700 mx-auto flex items-center justify-center shadow-inner">
              <KeyRound className="w-7 h-7" />
            </div>
            <div>
              <h3 className="text-base font-black text-slate-900 uppercase">MÃ OTP CỨU HỘ KHẨN CẤP</h3>
              <p className="text-xs text-slate-500 mt-1">
                Thí sinh: <strong>{supportOtpDialog.player.fullName}</strong> (SBD {String(supportOtpDialog.player.orderNumber).padStart(2, '0')})
              </p>
            </div>
            <div className="bg-amber-50 border border-amber-300 rounded-2xl p-4">
              <span className="text-3xl font-black tracking-widest text-amber-900 font-mono select-all">
                {supportOtpDialog.otpCode}
              </span>
              <p className="text-[11px] text-amber-700 mt-1.5 font-medium">
                Cung cấp mã này cho thí sinh nhập trực tiếp vào điện thoại.
              </p>
            </div>
            <div className="flex gap-2 pt-2">
              <button
                type="button"
                onClick={() => setSupportOtpDialog(null)}
                className="flex-1 py-2 rounded-xl text-xs font-bold bg-slate-100 hover:bg-slate-200 text-slate-700"
              >
                Đóng
              </button>
              <button
                type="button"
                onClick={() => {
                  const pId = supportOtpDialog.player.id;
                  setSupportOtpDialog(null);
                  handleBypassCheckIn(pId);
                }}
                className="flex-1 py-2 rounded-xl text-xs font-black bg-emerald-600 hover:bg-emerald-500 text-white shadow"
              >
                Duyệt vào thẳng
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal Cảnh báo Đỏ Quan Trọng: Reset đợt thi */}
      <ResetLiveContestModal
        isOpen={resetContestModalOpen}
        onClose={() => setResetContestModalOpen(false)}
        onConfirm={handleConfirmResetContest}
        sessionName={session?.name}
        loading={actionLoading}
      />
      </div>
      </main>
    </div>
  );
}
