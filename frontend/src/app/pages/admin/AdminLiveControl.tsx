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
  LiveSessionDto,
} from '../../../types/live';

export default function AdminLiveControl() {
  const [session, setSession] = useState<LiveSessionDto | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [activeTab, setActiveTab] = useState<'lobby' | 'round1' | 'round2' | 'round3' | 'finish'>('lobby');
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

  // Round 2 Inputs
  const [r2PlayerId, setR2PlayerId] = useState<number | ''>('');
  const [r2TopicCode, setR2TopicCode] = useState<string>('ĐỀ 01');
  const [r2Score1, setR2Score1] = useState<number>(18);
  const [r2Score2, setR2Score2] = useState<number>(18);
  const [round2Topics, setRound2Topics] = useState<LiveRound2Topic[]>([]);

  // Round 3 Inputs
  const [r3PlayerId, setR3PlayerId] = useState<number | ''>('');
  const [r3Score, setR3Score] = useState<number>(85);
  const [round3Pairs, setRound3Pairs] = useState<LiveRound3Pair[]>([]);

  // Load session
  const fetchSession = useCallback(async () => {
    try {
      setLoading(true);
      const data = await liveApi.getActiveSession();
      setSession(data);
      if (data.currentQuestionIndex) {
        setCurrentQuestionOrder(data.currentQuestionIndex);
      }
      if (data.currentRound === 1 && data.status !== 'LOBBY') setActiveTab('round1');
      else if (data.status === 'LOBBY') setActiveTab('lobby');
      else if (data.currentRound === 2) setActiveTab('round2');
      else if (data.currentRound === 3) setActiveTab('round3');
      else if (data.status === 'FINISHED') setActiveTab('finish');

      if (data.id) {
        const topics = await adminLiveApi.getRound2Topics(data.id);
        setRound2Topics(topics);
        setSetupR2Topics(topics);
        const pairs = await adminLiveApi.getRound3Pairs(data.id);
        setRound3Pairs(pairs);
        const questions = await adminLiveApi.getQuestions(data.id);
        setSetupQuestions(questions);
        if (data.players) {
          setSetupPlayers(data.players);
        }
      }
    } catch (err) {
      console.error('Lỗi tải phiên thi:', err);
    } finally {
      setLoading(false);
    }
  }, []);

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
      if (
        event.eventType === 'PLAYERS_CONFIGURED' ||
        event.eventType === 'SESSION_STATUS_CHANGED' ||
        event.eventType === 'HOPE_STAR_ACTIVATED' ||
        event.eventType === 'PLAYER_ANSWERED' ||
        event.eventType === 'ANSWER_REVEALED' ||
        event.eventType === 'LEADERBOARD_UPDATED' ||
        event.eventType === 'ROUND2_TOPIC_ASSIGNED' ||
        event.eventType === 'ROUND2_SCORE_UPDATED' ||
        event.eventType === 'ROUND3_PAIR_DRAWN' ||
        event.eventType === 'ROUND3_SCORE_UPDATED' ||
        event.eventType === 'WINNERS_ANNOUNCED'
      ) {
        fetchSession();
      }
    },
    [fetchSession]
  );

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

  // Switch round
  const handleSetRound = async (round: number, status: string) => {
    if (!session) return;
    try {
      setActionLoading(true);
      await adminLiveApi.setRound(session.id, round, status);
      await fetchSession();
    } catch (err) {
      toast.error('Lỗi chuyển chặng thi');
    } finally {
      setActionLoading(false);
    }
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
    if (!session) return;
    setConfirmDialog({
      title: 'Hoàn thành Vòng 1 ➔ Chuyển sang Vòng 2: Nhạy bén',
      message:
        'Xác nhận hoàn thành Vòng 1: Thông thái và chuyển toàn bộ màn hình LED sân khấu cùng thiết bị di động của 10 thí sinh sang Vòng 2: Nhạy bén (Thao tác phần mềm Quản lý đoàn viên)?',
      confirmText: 'Chuyển sang Vòng 2 (Nhạy bén)',
      confirmType: 'primary',
      onConfirm: async () => {
        try {
          setActionLoading(true);
          await adminLiveApi.setRound(session.id, 2, 'ROUND2');
          setActiveTab('round2');
          await fetchSession();
          toast.success('Đã hoàn thành Vòng 1 và chuyển sang Vòng 2: Nhạy bén thành công!');
        } catch (err) {
          toast.error('Lỗi khi chuyển sang Vòng 2');
        } finally {
          setActionLoading(false);
        }
      },
    });
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
                toast.success(`Hết 5s NSHV! Đã hiển thị câu hỏi và video lên màn LED sân khấu cho MC đọc.`);
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
  const handleAssignTopic = async () => {
    if (!session || !r2PlayerId) {
      toast.error('Vui lòng chọn thí sinh!');
      return;
    }
    try {
      setActionLoading(true);
      await adminLiveApi.assignRound2Topic(session.id, Number(r2PlayerId), r2TopicCode);
      await fetchSession();
      toast.success('Đã gán mã đề thành công!');
    } catch (err) {
      toast.error('Lỗi gán mã đề');
    } finally {
      setActionLoading(false);
    }
  };

  const handleSaveRound2Score = async () => {
    if (!r2PlayerId) {
      toast.error('Vui lòng chọn thí sinh!');
      return;
    }
    try {
      setActionLoading(true);
      await adminLiveApi.updateRound2Score(Number(r2PlayerId), r2Score1, r2Score2);
      await fetchSession();
      toast.success('Đã cập nhật điểm Vòng 2 thành công!');
    } catch (err) {
      toast.error('Lỗi cập nhật điểm Vòng 2');
    } finally {
      setActionLoading(false);
    }
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
          await fetchSession();
          toast.success('Đã bốc thăm ghép cặp thành công!');
        } catch (err) {
          toast.error('Lỗi bốc thăm ghép cặp');
        } finally {
          setActionLoading(false);
        }
      },
    });
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
      title: 'Kết thúc Hội thi',
      message: 'Xác nhận hoàn tất cả 3 vòng thi, chốt bảng điểm và kích hoạt màn hình Vinh danh Trao giải trên màn LED?',
      confirmText: 'Tổng kết & Vinh danh',
      confirmType: 'primary',
      onConfirm: async () => {
        try {
          setActionLoading(true);
          await adminLiveApi.finishSession(session.id);
          await fetchSession();
          toast.success('Đã vinh danh và kết thúc hội thi thành công!');
        } catch (err) {
          toast.error('Lỗi kết thúc hội thi');
        } finally {
          setActionLoading(false);
        }
      },
    });
  };

  const handleResetSession = () => {
    setConfirmDialog({
      title: 'Làm sạch dữ liệu thi thử',
      message: 'Xác nhận xóa sạch toàn bộ lịch sử nộp bài, điểm số và kết quả thi thử của 10 thí sinh? Phiên thi sẽ được đưa về Sảnh chờ ban đầu để Ban Tổ chức có thể chạy thử nghiệm lại từ đầu.',
      confirmText: 'Làm sạch & Bắt đầu lại',
      confirmType: 'danger',
      onConfirm: async () => {
        try {
          setActionLoading(true);
          const active = await liveApi.getActiveSession().catch(() => null);
          const targetId = active?.id || session?.id;
          await adminLiveApi.resetSession(targetId);
          toast.success('Đã làm sạch toàn bộ dữ liệu thi thử thành công!');
          await fetchSession();
        } catch (err: any) {
          const errMsg = err?.response?.data?.message || err?.message || 'Lỗi khi làm sạch dữ liệu thi';
          toast.error(errMsg);
        } finally {
          setActionLoading(false);
        }
      },
    });
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
            onClick={handleResetSession}
            disabled={actionLoading}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-rose-50 hover:bg-rose-100 border border-rose-200 text-rose-700 font-bold text-xs transition-all active:scale-95"
            title="Làm sạch toàn bộ điểm số và kết quả thi thử để chạy thử lại"
          >
            <RotateCcw className="w-3.5 h-3.5 text-rose-600" /> Làm sạch dữ liệu test
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

          return (
            <div className="flex items-center gap-2 py-1.5 shrink-0 animate-fadeIn">
              <span className="text-[11px] text-slate-500 hidden md:inline">
                Sân khấu LED đang ở: <strong className="text-blue-700">{session?.status}</strong>
              </span>
              <button
                onClick={() => {
                  setConfirmDialog({
                    title: `Chuyển sân khấu sang ${tabMeta.label}`,
                    message: `Xác nhận chuyển toàn bộ màn hình LED sân khấu và thiết bị di động của 10 thí sinh sang "${tabMeta.label}"?`,
                    confirmText: `Chuyển sang ${tabMeta.label}`,
                    confirmType: 'warning',
                    onConfirm: () => handleSetRound(tabMeta.round, tabMeta.status),
                  });
                }}
                className="px-3 py-1.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-black text-xs shadow transition-all flex items-center gap-1.5 active:scale-95"
              >
                <Radio className="w-3.5 h-3.5 text-slate-950 animate-pulse" />
                <span>KÍCH HOẠT SÂN KHẤU SANG VÒNG NÀY</span>
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
                    {isHopeStar && `5S NSHV (${hopeStarCountdown}s)`}
                    {isReading && 'MC ĐANG ĐỌC & NSHV'}
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
                      {isReading && 'MC đang đọc câu hỏi. Bấm Bắt đầu tính giờ (40 giây) khi MC đọc xong.'}
                      {is40sRunning && 'Thí sinh đang trả lời trên thiết bị di động. Hết 40s hệ thống tự động hiện Đáp án & Biểu đồ.'}
                      {isAnswerRevealed && 'Màn hình LED đang hiện Đáp án & Biểu đồ phân bố. Bấm "Hiện kết quả 10 thí sinh & BXH" để công bố chi tiết!'}
                      {isLeaderboard && 'Màn hình LED đang hiện Bảng xếp hạng trượt thứ hạng. Bấm "Sang câu tiếp theo" để tiếp tục.'}
                      {!isReading && !is40sRunning && !isRevealed && 'Bấm "Sang câu tiếp theo" hoặc chọn số câu để bắt đầu.'}
                    </p>
                  </div>

                  {/* Đồng hồ đếm ngược */}
                  <div className="flex items-center gap-3">
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
                  {/* PHA 1 & 2: KHI MC ĐANG ĐỌC -> NÚT BẮT ĐẦU TÍNH GIỜ 40S */}
                  {isReading && (
                    <button
                      disabled={actionLoading}
                      onClick={handleStartQuestionCountdown}
                      className="p-5 rounded-2xl border-2 text-left flex items-center justify-between transition-all group bg-emerald-600 hover:bg-emerald-500 border-emerald-500 text-white shadow-md active:scale-[0.99] ring-4 ring-emerald-100"
                    >
                      <div>
                        <div className="flex items-center gap-2 font-bold text-xs uppercase tracking-wider text-emerald-100">
                          <span>BƯỚC TIẾP THEO: TÍNH GIỜ</span>
                          <span className="w-2.5 h-2.5 rounded-full bg-white animate-ping" />
                        </div>
                        <div className="font-black text-lg mt-1 text-white">
                          BẮT ĐẦU TÍNH GIỜ (40 GIÂY)
                        </div>
                        <div className="text-xs text-emerald-50 mt-1">
                          Phát lệnh tính giờ và mở danh sách phương án tới máy 10 thí sinh
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
                          Kích hoạt 5s Ngôi sao hy vọng ➔ Tự động mở câu hỏi & highlight NSHV cho MC đọc
                        </div>
                      </div>
                      <ChevronRight className="w-8 h-8 shrink-0 group-hover:translate-x-1 transition-transform" />
                    </button>
                  )}
                </div>

                {/* Các nút hỗ trợ & an toàn */}
                <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between flex-wrap gap-2 text-xs">
                  <div className="text-slate-500 text-xs">
                    * Quy trình chuẩn: Kích hoạt câu ➔ Hết 5s NSHV tự động mở câu hỏi ➔ Admin bấm 40s ➔ Hết giờ hiện Đáp án & Biểu đồ ➔ Bấm Hiện kết quả & BXH ➔ Sang câu tiếp theo.
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
                        <th className="pb-2.5 font-bold">SBD</th>
                        <th className="pb-2.5 font-bold">Họ và tên</th>
                        <th className="pb-2.5 font-bold">Đơn vị</th>
                        <th className="pb-2.5 font-bold text-center">Ngôi sao hy vọng</th>
                        <th className="pb-2.5 font-bold text-center">Trạng thái Câu {currentQuestionOrder}</th>
                        <th className="pb-2.5 font-bold text-right">Điểm Vòng 1</th>
                        <th className="pb-2.5 font-bold text-right">Tổng thời gian</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {session?.players?.map((p) => {
                        const ans = questionAnswers[p.id];
                        const rev = revealedAnswers?.find((r) => r.playerId === p.id);
                        const hasHopeStarThisQ = p.hopeStarUsed && p.hopeStarQuestionIndex === currentQuestionOrder;

                        return (
                          <tr key={p.id} className="hover:bg-slate-50 transition-colors">
                            <td className="py-3 font-black text-amber-600">
                              {String(p.orderNumber).padStart(2, '0')}
                            </td>
                            <td className="py-3">
                              <span className="font-bold text-slate-900">{p.fullName}</span>
                            </td>
                            <td className="py-3 text-slate-600 max-w-[180px] truncate">{p.unit}</td>
                            <td className="py-3 text-center">
                              {hasHopeStarThisQ ? (
                                <span className="inline-flex items-center gap-1 text-[11px] font-black text-amber-700 bg-amber-100 px-2.5 py-0.5 rounded-full border border-amber-300 animate-pulse">
                                  <Star className="w-3 h-3 fill-amber-500" /> ĐÃ ĐẶT NSHV
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
                                  {rev.selectedOption || '—'} {rev.isCorrect ? `(+ ${rev.scoreAwarded}đ)` : `(${rev.scoreAwarded}đ)`}
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
                                <span className="text-slate-400 text-xs">Đang chọn NSHV...</span>
                              ) : (
                                <span className="text-slate-400 text-xs">Chờ mở bài thi</span>
                              )}
                            </td>
                            <td className="py-3 text-right font-black text-amber-700 text-sm">
                              {p.round1Score}đ
                            </td>
                            <td className="py-3 text-right text-slate-500 font-mono text-xs">
                              {(p.round1TotalTimeMs / 1000).toFixed(1)}s
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

        {/* TAB 3: VÒNG 2 - NHẠY BÉN (MÃ ĐỀ & ĐIỂM) */}
        {/* ========================================================= */}
        {activeTab === 'round2' && (
          <div className="space-y-6 animate-fadeIn">
            <div className="grid grid-cols-2 gap-6">
              {/* Form 1: Assign Topic */}
              <div className="bg-white border border-slate-200 rounded-3xl p-5 shadow">
                <h3 className="text-sm font-black text-cyan-400 uppercase tracking-wide mb-3 flex items-center gap-2">
                  <Zap className="w-4 h-4" /> BƯỚC 1: GÁN MÃ ĐỀ BỐC THĂM CHO THÍ SINH
                </h3>
                <p className="text-xs text-slate-500 mb-4">
                  Khi thí sinh bốc thăm xong phong bì đề thi, admin chọn đúng mã đề để hiển thị lên màn hình LED lớn và máy thí sinh.
                </p>

                <div className="space-y-3">
                  <div>
                    <label className="text-xs text-slate-500 font-semibold block mb-1">Chọn thí sinh:</label>
                    <select
                      value={r2PlayerId}
                      onChange={(e) => setR2PlayerId(Number(e.target.value))}
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2.5 text-xs text-slate-900"
                    >
                      <option value="">-- Chọn thí sinh --</option>
                      {session?.players?.map((p) => (
                        <option key={p.id} value={p.id}>
                          SBD {String(p.orderNumber).padStart(2, '0')} - {p.fullName} ({p.unit})
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="text-xs text-slate-500 font-semibold block mb-1">Mã đề bốc thăm:</label>
                    <select
                      value={r2TopicCode}
                      onChange={(e) => setR2TopicCode(e.target.value)}
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2.5 text-xs text-slate-900 font-bold text-amber-600"
                    >
                      {round2Topics.map((t) => (
                        <option key={t.code} value={t.code}>
                          {t.code}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="flex flex-col sm:flex-row gap-2">
                    <button
                      onClick={handleAssignTopic}
                      className="flex-1 py-2.5 rounded-xl bg-cyan-600 hover:bg-cyan-500 text-slate-900 font-bold text-xs shadow transition-all active:scale-95"
                    >
                      1. GÁN MÃ ĐỀ (HIỆN TÊN + ĐỀ TRÊN LED)
                    </button>
                    <button
                      onClick={handleShowR2TopicQuestion}
                      className="flex-1 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-black text-xs shadow transition-all active:scale-95 flex items-center justify-center gap-1.5"
                      title="Hiển thị chi tiết 2 tình huống của mã đề lên màn hình lớn khi bắt đầu 10 phút thi"
                    >
                      <Eye className="w-4 h-4" />
                      <span>2. HIỂN THỊ CÂU HỎI MÃ ĐỀ (LED)</span>
                    </button>
                  </div>
                </div>
              </div>

              {/* Form 2: Enter Scores */}
              <div className="bg-white border border-slate-200 rounded-3xl p-5 shadow">
                <h3 className="text-sm font-black text-cyan-400 uppercase tracking-wide mb-3 flex items-center gap-2">
                  <Save className="w-4 h-4" /> BƯỚC 2: NHẬP ĐIỂM BAN GIÁM KHẢO (TỐI ĐA 40Đ)
                </h3>
                <p className="text-xs text-slate-500 mb-4">
                  Sau khi thí sinh hoàn thành 10 phút thao tác, nhập điểm trực tiếp của 2 tình huống.
                </p>

                <div className="space-y-3">
                  <div>
                    <label className="text-xs text-slate-500 font-semibold block mb-1">Chọn thí sinh:</label>
                    <select
                      value={r2PlayerId}
                      onChange={(e) => setR2PlayerId(Number(e.target.value))}
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2.5 text-xs text-slate-900"
                    >
                      <option value="">-- Chọn thí sinh --</option>
                      {session?.players?.map((p) => (
                        <option key={p.id} value={p.id}>
                          SBD {String(p.orderNumber).padStart(2, '0')} - {p.fullName} ({p.unit})
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="text-xs text-slate-500 font-semibold block mb-1">Tình huống 1 (max 20đ):</label>
                      <input
                        type="number"
                        step="0.5"
                        min="0"
                        max="20"
                        value={r2Score1}
                        onChange={(e) => setR2Score1(Number(e.target.value))}
                        className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2.5 text-xs text-slate-900 font-bold"
                      />
                    </div>
                    <div>
                      <label className="text-xs text-slate-500 font-semibold block mb-1">Tình huống 2 (max 20đ):</label>
                      <input
                        type="number"
                        step="0.5"
                        min="0"
                        max="20"
                        value={r2Score2}
                        onChange={(e) => setR2Score2(Number(e.target.value))}
                        className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2.5 text-xs text-slate-900 font-bold"
                      />
                    </div>
                  </div>

                  <button
                    onClick={handleSaveRound2Score}
                    className="w-full py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs shadow transition-all"
                  >
                    LƯU ĐIỂM & CẬP NHẬT BẢNG XẾP HẠNG
                  </button>
                </div>
              </div>
            </div>

            {/* Score Summary Table */}
            <div className="bg-white border border-slate-200 rounded-3xl p-5 shadow">
              <h3 className="text-xs font-black text-slate-600 uppercase tracking-wider mb-3">
                BẢNG TỔNG HỢP ĐIỂM VÒNG 2 CỦA 10 THÍ SINH:
              </h3>
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead>
                    <tr className="border-b border-slate-200 text-slate-500">
                      <th className="pb-2">SBD</th>
                      <th className="pb-2">Họ và tên</th>
                      <th className="pb-2">Mã đề</th>
                      <th className="pb-2 text-right">Tình huống 1</th>
                      <th className="pb-2 text-right">Tình huống 2</th>
                      <th className="pb-2 text-right">Tổng V2</th>
                      <th className="pb-2 text-right">Tổng điểm tích lũy</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800/60">
                    {session?.players?.map((p) => (
                      <tr key={p.id}>
                        <td className="py-2.5 font-bold text-amber-600">
                          {String(p.orderNumber).padStart(2, '0')}
                        </td>
                        <td className="py-2.5 font-bold text-slate-900">{p.fullName}</td>
                        <td className="py-2.5 font-semibold text-cyan-400">{p.round2DrawCode || '-'}</td>
                        <td className="py-2.5 text-right font-bold text-slate-600">{p.round2Scenario1Score ?? 0}đ</td>
                        <td className="py-2.5 text-right font-bold text-slate-600">{p.round2Scenario2Score ?? 0}đ</td>
                        <td className="py-2.5 text-right font-black text-cyan-400">{p.round2Score ?? 0}đ</td>
                        <td className="py-2.5 text-right font-black text-amber-600 text-sm">{p.totalScore}đ</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* ========================================================= */}
        {/* TAB 4: VÒNG 3 - BẢN LĨNH (BỐC THĂM & ĐIỂM ĐỐI KHÁNG) */}
        {/* ========================================================= */}
        {activeTab === 'round3' && (
          <div className="space-y-6 animate-fadeIn">
            {/* Draw pairs button */}
            <div className="bg-white border border-slate-200 rounded-3xl p-5 flex items-center justify-between shadow">
              <div>
                <h3 className="text-sm font-black text-indigo-400 uppercase tracking-wide">
                  BỐC THĂM GHÉP CẶP NGẪU NHIÊN TRỰC TIẾP
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  Nhấn nút để kích hoạt hiệu ứng quay số / xáo thẻ ngẫu nhiên trên màn hình lớn cho toàn bộ hội trường theo dõi.
                </p>
              </div>

              <button
                onClick={handleDrawPairs}
                className="px-6 py-3 rounded-2xl bg-gradient-to-r from-indigo-600 to-purple-600 hover:brightness-110 text-slate-900 font-black text-xs shadow-lg transition-all flex items-center gap-2"
              >
                <Shuffle className="w-4 h-4" /> BỐC THĂM GHÉP CẶP NGAY
              </button>
            </div>

            {/* Input Debate Scores */}
            <div className="bg-white border border-slate-200 rounded-3xl p-5 shadow">
              <h3 className="text-sm font-black text-indigo-400 uppercase tracking-wide mb-3 flex items-center gap-2">
                <Award className="w-4 h-4" /> NHẬP ĐIỂM TRANH BIỆN VÒNG 3 (TỐI ĐA 100Đ)
              </h3>

              <div className="grid grid-cols-3 gap-4 items-end">
                <div>
                  <label className="text-xs text-slate-500 font-semibold block mb-1">Chọn thí sinh:</label>
                  <select
                    value={r3PlayerId}
                    onChange={(e) => setR3PlayerId(Number(e.target.value))}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2.5 text-xs text-slate-900"
                  >
                    <option value="">-- Chọn thí sinh --</option>
                    {session?.players?.map((p) => (
                      <option key={p.id} value={p.id}>
                        SBD {String(p.orderNumber).padStart(2, '0')} - {p.fullName} ({p.unit})
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="text-xs text-slate-500 font-semibold block mb-1">Điểm BGK (max 100đ):</label>
                  <input
                    type="number"
                    step="0.5"
                    min="0"
                    max="100"
                    value={r3Score}
                    onChange={(e) => setR3Score(Number(e.target.value))}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2.5 text-xs text-slate-900 font-bold"
                  />
                </div>

                <button
                  onClick={handleSaveRound3Score}
                  className="py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-slate-900 font-bold text-xs shadow transition-all"
                >
                  LƯU ĐIỂM VÒNG 3
                </button>
              </div>
            </div>

            {/* Table of 10 Contestants with V3 scores */}
            <div className="bg-white border border-slate-200 rounded-3xl p-5 shadow">
              <h3 className="text-xs font-black text-slate-600 uppercase tracking-wider mb-3">
                KẾT QUẢ ĐỐI KHÁNG VÒNG 3:
              </h3>
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead>
                    <tr className="border-b border-slate-200 text-slate-500">
                      <th className="pb-2">SBD</th>
                      <th className="pb-2">Họ và tên</th>
                      <th className="pb-2">Cặp đấu</th>
                      <th className="pb-2 text-right">Điểm Vòng 3</th>
                      <th className="pb-2 text-right">TỔNG ĐIỂM CHUNG CUỘC</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800/60">
                    {session?.players?.map((p) => (
                      <tr key={p.id}>
                        <td className="py-2.5 font-bold text-amber-600">
                          {String(p.orderNumber).padStart(2, '0')}
                        </td>
                        <td className="py-2.5 font-bold text-slate-900">{p.fullName}</td>
                        <td className="py-2.5 font-semibold text-indigo-400">
                          {p.round3PairGroup ? `CẶP 0${p.round3PairGroup}` : '-'}
                        </td>
                        <td className="py-2.5 text-right font-black text-indigo-400">{p.round3Score ?? 0}đ</td>
                        <td className="py-2.5 text-right font-black text-amber-600 text-sm">{p.totalScore}đ</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
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

              <button
                onClick={handleFinishSession}
                className="px-6 py-3.5 rounded-2xl bg-gradient-to-r from-amber-500 via-yellow-400 to-amber-600 text-slate-950 font-black text-sm shadow-xl shadow-amber-500/30 hover:scale-105 active:scale-95 transition-all flex items-center gap-2"
              >
                <Trophy className="w-5 h-5 fill-slate-950" /> VINH DANH CHUNG CUỘC
              </button>
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
                    {session?.players?.map((p, idx) => {
                      const rank = idx + 1;
                      const prize = rank === 1 ? 'GIẢI NHẤT' : rank <= 4 ? 'GIẢI NHÌ' : 'GIẢI BA';
                      return (
                        <tr key={p.id} className="hover:bg-slate-200/40">
                          <td className="py-2.5 font-black text-amber-600">{rank}</td>
                          <td className="py-2.5 font-bold">
                            <span
                              className={`px-2 py-0.5 rounded text-[10px] font-black ${
                                rank === 1
                                  ? 'bg-amber-400 text-slate-950'
                                  : rank <= 4
                                  ? 'bg-slate-300 text-slate-950'
                                  : 'bg-amber-900/60 text-amber-200'
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
                          <td className="py-2.5 text-right font-semibold text-slate-600">{p.round1Score}đ</td>
                          <td className="py-2.5 text-right font-semibold text-slate-600">{p.round2Score}đ</td>
                          <td className="py-2.5 text-right font-semibold text-slate-600">{p.round3Score}đ</td>
                          <td className="py-2.5 text-right font-black text-amber-600 text-sm">{p.totalScore}đ</td>
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
          <div className="bg-white rounded-3xl shadow-2xl w-full max-w-md p-6 space-y-4 border border-slate-200 animate-scaleUp">
            <div className="flex items-start gap-3.5">
              <div className={`w-10 h-10 rounded-2xl flex items-center justify-center shrink-0 ${
                confirmDialog.confirmType === 'danger'
                  ? 'bg-rose-100 text-rose-600'
                  : 'bg-amber-100 text-amber-700'
              }`}>
                <AlertTriangle className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-base font-black text-slate-900">{confirmDialog.title}</h3>
                <p className="text-xs text-slate-600 mt-1 leading-relaxed">{confirmDialog.message}</p>
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
                className={`px-4 py-2 rounded-xl text-xs font-black text-white shadow transition-all active:scale-95 ${
                  confirmDialog.confirmType === 'danger'
                    ? 'bg-rose-600 hover:bg-rose-500'
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
      </div>
      </main>
    </div>
  );
}
