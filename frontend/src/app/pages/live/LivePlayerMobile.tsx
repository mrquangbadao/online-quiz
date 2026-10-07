import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
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
  AlertCircle,
  Sparkles,
  RefreshCw,
  UserCheck,
  Shield,
  ChevronRight,
  LogOut,
} from 'lucide-react';
import { liveApi } from '../../../api/liveApi';
import { useLiveSocket } from '../../../hooks/useLiveSocket';
import { liveSound } from '../../../utils/liveSound';
import BrandMark from '../../components/BrandMark';
import DigitalTechBackground from '../../components/DigitalTechBackground';
import {
  LiveAnswerSubmissionDto,
  LiveEventMessage,
  LivePlayerDto,
  LiveQuestionDto,
  LiveSessionDto,
  ShuffledOption,
} from '../../../types/live';

// Helper to get or create a unique device ID per browser tab
function getTabDeviceId(): string {
  let id = sessionStorage.getItem('live_tab_device_id');
  if (!id) {
    id = 'dev_' + Math.random().toString(36).substring(2, 10) + '_' + Date.now().toString(36);
    sessionStorage.setItem('live_tab_device_id', id);
  }
  return id;
}

export default function LivePlayerMobile() {
  const [tabDeviceId] = useState<string>(() => getTabDeviceId());
  const [session, setSession] = useState<LiveSessionDto | null>(null);
  const [selectedPlayerId, setSelectedPlayerId] = useState<number | null>(() => {
    const saved = sessionStorage.getItem('live_player_id');
    return saved ? Number(saved) : null;
  });
  const [candidateId, setCandidateId] = useState<number | null>(() => {
    const saved = sessionStorage.getItem('live_player_id');
    return saved ? Number(saved) : null;
  });
  const [rescueRequested, setRescueRequested] = useState<boolean>(false);
  const [loading, setLoading] = useState<boolean>(true);
  const [currentQuestion, setCurrentQuestion] = useState<LiveQuestionDto | null>(null);
  const [selectedKey, setSelectedKey] = useState<string | null>(null);
  const [hasSubmitted, setHasSubmitted] = useState<boolean>(false);
  const [submitTimeMs, setSubmitTimeMs] = useState<number | null>(null);
  const [hopeStarActivatedThisQuestion, setHopeStarActivatedThisQuestion] = useState<boolean>(false);
  const [countdown, setCountdown] = useState<number>(0);
  const [timerRunning, setTimerRunning] = useState<boolean>(false);
  const [revealedData, setRevealedData] = useState<any | null>(null);

  const questionStartTimeRef = useRef<number>(0);
  const targetEndTimeRef = useRef<number | null>(null);
  const candidateIdRef = useRef<number | null>(candidateId);
  const selectedPlayerIdRef = useRef<number | null>(selectedPlayerId);
  const rescueRequestedRef = useRef<boolean>(rescueRequested);
  const tabDeviceIdRef = useRef<string>(tabDeviceId);

  useEffect(() => {
    candidateIdRef.current = candidateId;
  }, [candidateId]);

  useEffect(() => {
    selectedPlayerIdRef.current = selectedPlayerId;
  }, [selectedPlayerId]);

  useEffect(() => {
    rescueRequestedRef.current = rescueRequested;
  }, [rescueRequested]);

  // Load question with per-player randomized options
  const fetchPlayerQuestion = useCallback(
    async (qId: number, pId: number) => {
      try {
        const q = await liveApi.getShuffledQuestion(qId, pId);
        setCurrentQuestion(q);

        // Khôi phục trạng thái đã trả lời từ máy chủ hoặc từ sessionStorage cục bộ (chống F5)
        const storageKey = `live_ans_${q.sessionId}_${qId}_${pId}`;
        const localAnsRaw = sessionStorage.getItem(storageKey);
        let localAns: { key?: string; timeMs?: number } | null = null;
        if (localAnsRaw) {
          try {
            localAns = JSON.parse(localAnsRaw);
          } catch (e) {
            localAns = null;
          }
        }

        if (q.hasAnswered) {
          setHasSubmitted(true);
          setSelectedKey(q.playerSelectedOption || null);
          if (q.playerResponseTimeMs) setSubmitTimeMs(q.playerResponseTimeMs);
          sessionStorage.setItem(
            storageKey,
            JSON.stringify({
              key: q.playerSelectedOption,
              timeMs: q.playerResponseTimeMs,
            })
          );
        } else if (localAns && localAns.key) {
          setHasSubmitted(true);
          setSelectedKey(localAns.key);
          if (localAns.timeMs) setSubmitTimeMs(localAns.timeMs);
        }
      } catch (err) {
        console.error('Lỗi tải câu hỏi xáo trộn:', err);
      }
    },
    []
  );

  // Load session
  const fetchSession = useCallback(async () => {
    try {
      setLoading(true);
      const data = await liveApi.getActiveSession();
      setSession(data);

      // Hydrate revealedData from backend if in ANSWER_REVEALED or LEADERBOARD
      if (data?.revealedData) {
        setRevealedData(data.revealedData);
      }

      // Restore timer and question if contestant reloads page during countdown
      if (data && (data.round1State === 'QUESTION_40S' || data.round1State === 'HOPE_STAR_5S')) {
        const limit = data.round1State === 'HOPE_STAR_5S' ? 5 : (data.currentQuestion?.timeLimitSeconds || 40);
        const started = data.questionStartedAt || Date.now();
        const target = started + limit * 1000;
        const remaining = Math.max(0, Math.ceil((target - Date.now()) / 1000));
        if (remaining > 0) {
          targetEndTimeRef.current = target;
          setCountdown(remaining);
          setTimerRunning(true);
        } else {
          targetEndTimeRef.current = null;
          setCountdown(0);
          setTimerRunning(false);
        }
      }

      // Automatically fetch question options and check previous submission if we synced into a live question
      if (data && (data.round1State === 'QUESTION_READING' || data.round1State === 'QUESTION_40S')) {
        const activePId = selectedPlayerIdRef.current || (sessionStorage.getItem('live_player_id') ? Number(sessionStorage.getItem('live_player_id')) : null);
        if (data.currentQuestion?.id && activePId) {
          // Khôi phục tạm trước từ sessionStorage nếu có (giúp UI không bị giật nhấp nháy F5)
          const storageKey = `live_ans_${data.id}_${data.currentQuestion.id}_${activePId}`;
          const localAnsRaw = sessionStorage.getItem(storageKey);
          if (localAnsRaw) {
            try {
              const localAns = JSON.parse(localAnsRaw);
              if (localAns?.key) {
                setHasSubmitted(true);
                setSelectedKey(localAns.key);
                if (localAns.timeMs) setSubmitTimeMs(localAns.timeMs);
              }
            } catch (e) {}
          }
          fetchPlayerQuestion(data.currentQuestion.id, activePId);
        }
      }
    } catch (err) {
      console.error('Lỗi tải phiên thi:', err);
    } finally {
      setLoading(false);
    }
  }, [fetchPlayerQuestion]);

  useEffect(() => {
    fetchSession();
  }, [fetchSession]);

  // Auto-sync when mobile tab wakes up, regains visibility or window focus
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        fetchSession();
      }
    };
    window.addEventListener('focus', handleVisibilityChange);
    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => {
      window.removeEventListener('focus', handleVisibilityChange);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [fetchSession]);

  // Periodic fallback heartbeat sync (every 3s when not strictly ticking 40s) to guarantee zero out-of-sync
  useEffect(() => {
    const interval = setInterval(() => {
      if (!timerRunning) {
        fetchSession();
      }
    }, 3000);
    return () => clearInterval(interval);
  }, [timerRunning, fetchSession]);

  // Auto-sync candidate state into active player ONLY when this device requested rescue and is waiting for approval
  useEffect(() => {
    if (!session?.players) return;
    const currentCandId = candidateIdRef.current;
    const myDevice = tabDeviceIdRef.current;
    if (currentCandId && !selectedPlayerId && rescueRequested) {
      const me = session.players.find((p) => p.id === currentCandId);
      // Only enter if checked in AND matching this device (or device not set yet)
      if (me && me.isCheckedIn) {
        if (!me.deviceId || me.deviceId === myDevice) {
          setSelectedPlayerId(me.id);
          sessionStorage.setItem('live_player_id', String(me.id));
          setRescueRequested(false);
        } else {
          // Candidate checked in by another device!
          setRescueRequested(false);
          setOtpError('Thí sinh này đã được đăng nhập từ thiết bị khác.');
        }
      }
    }
  }, [session, selectedPlayerId, rescueRequested]);

  // Polling fallback when candidate is actively waiting for admin rescue approval
  useEffect(() => {
    if (selectedPlayerId || !rescueRequested) return;
    const interval = setInterval(() => {
      fetchSession();
    }, 2000);
    return () => clearInterval(interval);
  }, [selectedPlayerId, rescueRequested, fetchSession]);

  // Current active contestant
  const player = useMemo<LivePlayerDto | undefined>(() => {
    if (!session || !selectedPlayerId) return undefined;
    const found = session.players?.find((p) => p.id === selectedPlayerId);
    // If contestant was reset/kicked out on server (isCheckedIn is false), invalidate active player
    if (found && !found.isCheckedIn) {
      return undefined;
    }
    return found;
  }, [session, selectedPlayerId]);

  // If session sync detects this device's player is no longer checked in (e.g. admin reset session), kick out to check-in screen
  useEffect(() => {
    if (!session?.players || !selectedPlayerId) return;
    const found = session.players.find((p) => p.id === selectedPlayerId);
    if (!found || !found.isCheckedIn) {
      console.log('Thí sinh không còn ở trạng thái điểm danh -> Thoát ra màn hình chờ điểm danh');
      setSelectedPlayerId(null);
      sessionStorage.removeItem('live_player_id');
      try {
        Object.keys(sessionStorage).forEach((k) => {
          if (k.startsWith('live_ans_')) sessionStorage.removeItem(k);
        });
      } catch (e) {}
    }
  }, [session, selectedPlayerId]);

  // Realtime sorted leaderboard based on cumulative round 1 scores, check-in status, total response time & SBD
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

  // Auto-fetch question if session is in reading or 40s state
  useEffect(() => {
    if (
      (session?.round1State === 'QUESTION_40S' || session?.round1State === 'QUESTION_READING') &&
      selectedPlayerId
    ) {
      const qId = session.currentQuestion?.id;
      if (qId && (!currentQuestion || currentQuestion.id !== qId)) {
        fetchPlayerQuestion(qId, selectedPlayerId);
      }
    }
  }, [session?.round1State, session?.currentQuestion?.id, selectedPlayerId, currentQuestion, fetchPlayerQuestion]);

  // Fallback options list to ensure candidates always see answer options
  const optionsToRender: ShuffledOption[] = useMemo(() => {
    if (currentQuestion?.shuffledOptions && currentQuestion.shuffledOptions.length > 0) {
      return currentQuestion.shuffledOptions;
    }
    const sourceQ = currentQuestion || session?.currentQuestion;
    if (!sourceQ || !sourceQ.optionA) return [];
    return [
      { originalKey: 'A', content: sourceQ.optionA },
      { originalKey: 'B', content: sourceQ.optionB },
      { originalKey: 'C', content: sourceQ.optionC },
      { originalKey: 'D', content: sourceQ.optionD },
    ];
  }, [currentQuestion, session?.currentQuestion]);

  // WebSocket event handler
  const handleSocketMessage = useCallback(
    (event: LiveEventMessage) => {
      console.log('[LivePlayer WS]', event.eventType, event.payload);

      switch (event.eventType) {
        case 'SESSION_STATUS_CHANGED':
          setSession(event.payload);
          if (event.payload?.status === 'LOBBY') {
            setSelectedKey(null);
            setHasSubmitted(false);
            setSubmitTimeMs(null);
            try {
              Object.keys(sessionStorage).forEach((k) => {
                if (k.startsWith('live_ans_')) sessionStorage.removeItem(k);
              });
            } catch (e) {}
          }
          break;

        case 'PLAYER_CHECKED_IN': {
          const currentCandId = candidateIdRef.current;
          const currentSelId = selectedPlayerIdRef.current;
          const isRescuePending = rescueRequestedRef.current;
          const myDevice = tabDeviceIdRef.current;
          const p = event.payload;

          if (p?.id) {
            // Case 1: This player is currently logged in on this tab
            if (p.id === currentSelId) {
              if (!p.isCheckedIn || (p.deviceId && p.deviceId !== myDevice)) {
                // Admin kicked out or checked in on another device -> Kick out this tab
                setSelectedPlayerId(null);
                sessionStorage.removeItem('live_player_id');
                setRescueRequested(false);
                alert('Tài khoản đã đăng nhập từ thiết bị khác hoặc đã bị Ban Tổ chức đặt lại.');
              }
            }
            // Case 2: This tab is on check-in screen, has selected candidate and was requesting rescue
            else if (p.id === currentCandId && isRescuePending) {
              if (p.isCheckedIn) {
                if (!p.deviceId || p.deviceId === myDevice) {
                  // Approved for THIS device
                  setSelectedPlayerId(p.id);
                  sessionStorage.setItem('live_player_id', String(p.id));
                  setRescueRequested(false);
                } else {
                  // Approved for ANOTHER device -> Reject this tab
                  setRescueRequested(false);
                  setOtpError('Thí sinh này đã được đăng nhập từ thiết bị khác.');
                }
              }
            }
            // Case 3: Candidate was chosen in dropdown on this tab, but another device just logged in
            else if (p.id === currentCandId && p.isCheckedIn && p.deviceId && p.deviceId !== myDevice) {
              setOtpError('Thí sinh này vừa đăng nhập từ một thiết bị khác.');
            }
          }

          setSession((prev) => {
            if (!prev) return prev;
            const updated = prev.players?.map((item) => (item.id === p?.id ? { ...item, ...p } : item));
            return { ...prev, players: updated };
          });
          fetchSession();
          break;
        }

        case 'RESCUE_REQUESTED': {
          const currentCandId = candidateIdRef.current;
          if (event.payload?.id && event.payload.id === currentCandId) {
            setRescueRequested(true);
          }
          fetchSession();
          break;
        }

        case 'PLAYERS_CONFIGURED':
        case 'PLAYER_UPDATED':
          fetchSession();
          break;

        case 'HOPE_STAR_STARTED': {
          setRevealedData(null);
          setSelectedKey(null);
          setHasSubmitted(false);
          setSubmitTimeMs(null);
          setHopeStarActivatedThisQuestion(false);
          const limit = event.payload.timeLimitSeconds || 5;
          const started = event.payload.startedAt || Date.now();
          targetEndTimeRef.current = started + limit * 1000;
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
          liveSound.playHopeStarChime();
          break;
        }

        case 'HOPE_STAR_ACTIVATED': {
          const activePId = selectedPlayerIdRef.current || (sessionStorage.getItem('live_player_id') ? Number(sessionStorage.getItem('live_player_id')) : null);
          if (event.payload.playerId === activePId) {
            setHopeStarActivatedThisQuestion(true);
            liveSound.playHopeStarChime();
          }
          break;
        }

        case 'VIDEO_PLAYING':
          targetEndTimeRef.current = null;
          setTimerRunning(false);
          setCountdown(0);
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

        case 'QUESTION_READING': {
          targetEndTimeRef.current = null;
          setTimerRunning(false);
          setCountdown(0);
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
          const activePId = selectedPlayerIdRef.current || (sessionStorage.getItem('live_player_id') ? Number(sessionStorage.getItem('live_player_id')) : null);
          if (event.payload.question?.id && activePId) {
            fetchPlayerQuestion(event.payload.question.id, activePId);
          }
          break;
        }

        case 'QUESTION_STARTED': {
          questionStartTimeRef.current = performance.now();
          setRevealedData(null);
          const limit = event.payload.timeLimitSeconds || 40;
          const started = event.payload.startedAt || Date.now();
          targetEndTimeRef.current = started + limit * 1000;
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
          if (event.payload.question) {
            setCurrentQuestion(event.payload.question);
          }
          const targetQId = event.payload.questionId;
          const targetPId =
            selectedPlayerIdRef.current ||
            (sessionStorage.getItem('live_player_id')
              ? Number(sessionStorage.getItem('live_player_id'))
              : null);

          // Kiểm tra xem đã có câu trả lời lưu trong sessionStorage chưa
          const storageKey = targetQId && targetPId ? `live_ans_${event.payload.sessionId || session?.id}_${targetQId}_${targetPId}` : null;
          const localAnsRaw = storageKey ? sessionStorage.getItem(storageKey) : null;
          let localAns: any = null;
          if (localAnsRaw) {
            try {
              localAns = JSON.parse(localAnsRaw);
            } catch (e) {}
          }
          if (localAns && localAns.key) {
            setSelectedKey(localAns.key);
            setHasSubmitted(true);
            setSubmitTimeMs(localAns.timeMs || null);
          } else {
            setSelectedKey(null);
            setHasSubmitted(false);
            setSubmitTimeMs(null);
          }

          if (targetQId && targetPId) {
            fetchPlayerQuestion(targetQId, targetPId);
          }
          break;
        }

        case 'ANSWER_REVEALED': {
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
            };
          });
          const activePId = selectedPlayerIdRef.current || (sessionStorage.getItem('live_player_id') ? Number(sessionStorage.getItem('live_player_id')) : null);
          // Check if my answer was correct
          if (event.payload.answers && activePId) {
            const myAns = event.payload.answers.find((a: any) => a.playerId === activePId);
            if (myAns) {
              if (myAns.isCorrect) {
                liveSound.playCorrect();
              } else {
                liveSound.playBuzzer();
              }
            }
          }
          fetchSession();
          break;
        }

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
        case 'ROUND2_TOPIC_REVEALED':
        case 'ROUND2_SCORE_UPDATED':
        case 'ROUND3_PAIR_DRAWN':
        case 'ROUND3_SCORE_UPDATED':
        case 'WINNERS_ANNOUNCED':
          fetchSession();
          break;

        case 'SESSION_DELETED':
          sessionStorage.removeItem('live_player_id');
          setSelectedPlayerId(null);
          setSession(null);
          break;

        default:
          break;
      }
    },
    [fetchPlayerQuestion, fetchSession]
  );

  const { isConnected } = useLiveSocket({
    sessionId: session?.id,
    onMessage: handleSocketMessage,
  });

  // Local Countdown ticker synchronized with server epoch
  useEffect(() => {
    if (!timerRunning || !targetEndTimeRef.current) return;
    const interval = setInterval(() => {
      const remaining = Math.max(0, Math.ceil((targetEndTimeRef.current! - Date.now()) / 1000));
      setCountdown(remaining);
      if (remaining <= 0) {
        clearInterval(interval);
        setTimerRunning(false);
        targetEndTimeRef.current = null;
      } else if (remaining <= 6) {
        liveSound.playTick();
      }
    }, 250);
    return () => clearInterval(interval);
  }, [timerRunning]);

  // Handle Player Select & Check-in
  const handleSelectPlayer = async (p: LivePlayerDto) => {
    if (!session) return;
    try {
      setSelectedPlayerId(p.id);
      sessionStorage.setItem('live_player_id', String(p.id));
      await liveApi.checkInPlayer(session.id, p.id);
      await fetchSession();
    } catch (err) {
      console.error('Lỗi điểm danh:', err);
    }
  };

  // Switch contestant confirmation modal
  const [showSwitchConfirmModal, setShowSwitchConfirmModal] = useState<boolean>(false);
  const [switchingPlayer, setSwitchingPlayer] = useState<boolean>(false);

  // Switch contestant confirmed
  const handleConfirmSwitchPlayer = async () => {
    try {
      setSwitchingPlayer(true);
      if (selectedPlayerId) {
        try {
          await liveApi.releasePlayerCheckIn(selectedPlayerId, tabDeviceId);
        } catch (err) {
          console.error('Lỗi khi hủy điểm danh:', err);
        }
      }
      sessionStorage.removeItem('live_player_id');
      setSelectedPlayerId(null);
      setCandidateId(null);
      setShowSwitchConfirmModal(false);
      await fetchSession();
    } finally {
      setSwitchingPlayer(false);
    }
  };

  // Trigger Hope Star
  const handleActivateHopeStar = async () => {
    if (!session || !player) return;
    try {
      const success = await liveApi.activateHopeStar(
        session.id,
        player.id,
        session.currentQuestionIndex,
        tabDeviceId
      );
      if (success) {
        setHopeStarActivatedThisQuestion(true);
        liveSound.playHopeStarChime();
        await fetchSession();
      }
    } catch (err) {
      alert('Không thể kích hoạt Ngôi sao hi vọng!');
    }
  };

  // Submit Answer
  const handleSubmitOption = async (option: ShuffledOption) => {
    const activeQ = currentQuestion || session?.currentQuestion;
    if (!session || !player || !activeQ || hasSubmitted) return;

    const shuffledOrderStr = activeQ.shuffledOptions
      ? activeQ.shuffledOptions.map((o) => o.originalKey).join(',')
      : 'A,B,C,D';

    const submission: LiveAnswerSubmissionDto = {
      sessionId: session.id,
      questionId: activeQ.id,
      playerId: player.id,
      selectedOption: option.originalKey,
      shuffledOrder: shuffledOrderStr,
      clientTimestamp: Date.now(),
      deviceId: tabDeviceId,
    };

    const startTime = questionStartTimeRef.current || performance.now();
    const elapsedMs = Math.max(100, Math.round(performance.now() - startTime));
    setSelectedKey(option.originalKey);
    setHasSubmitted(true);
    setSubmitTimeMs(elapsedMs);

    // Lưu vào sessionStorage để ngay cả khi reload F5 vẫn giữ nguyên trạng thái đã chốt
    const storageKey = `live_ans_${session.id}_${activeQ.id}_${player.id}`;
    sessionStorage.setItem(
      storageKey,
      JSON.stringify({ key: option.originalKey, timeMs: elapsedMs })
    );

    try {
      await liveApi.submitAnswer(submission);
    } catch (err) {
      console.error('Lỗi gửi câu trả lời:', err);
    }
  };

  // OTP Login Handlers
  const [emailInput, setEmailInput] = useState<string>('');
  const [otpInput, setOtpInput] = useState<string>('');
  const [otpSent, setOtpSent] = useState<boolean>(false);
  const [otpLoading, setOtpLoading] = useState<boolean>(false);
  const [otpError, setOtpError] = useState<string | null>(null);
  const [showRescueModal, setShowRescueModal] = useState<boolean>(false);

  const handleRequestRescue = async () => {
    if (!candidateId) return;
    try {
      setOtpLoading(true);
      setOtpError(null);
      await liveApi.requestRescue(candidateId, tabDeviceId);
      setRescueRequested(true);
    } catch (err: any) {
      setOtpError(err.response?.data?.message || 'Không thể gửi yêu cầu cứu hộ!');
    } finally {
      setOtpLoading(false);
    }
  };

  const handleRequestOtp = async () => {
    if (!session || !emailInput.trim()) {
      setOtpError('Vui lòng nhập địa chỉ email của thí sinh!');
      return;
    }
    try {
      setOtpLoading(true);
      setOtpError(null);
      await liveApi.requestOtp(session.id, emailInput.trim(), candidateId || undefined);
      setOtpSent(true);
    } catch (err: any) {
      setOtpError(err.response?.data?.message || 'Không thể gửi mã OTP, vui lòng kiểm tra lại email hoặc liên hệ Ban Tổ chức!');
    } finally {
      setOtpLoading(false);
    }
  };

  const handleVerifyOtp = async () => {
    if (!session || !otpInput.trim()) {
      setOtpError('Vui lòng nhập mã OTP 6 chữ số!');
      return;
    }
    try {
      setOtpLoading(true);
      setOtpError(null);
      const verified = await liveApi.verifyOtp(session.id, emailInput.trim(), otpInput.trim(), candidateId || undefined, tabDeviceId);
      setSelectedPlayerId(verified.id);
      sessionStorage.setItem('live_player_id', String(verified.id));
      await fetchSession();
    } catch (err: any) {
      setOtpError(err.response?.data?.message || 'Mã OTP không chính xác hoặc đã hết hạn!');
    } finally {
      setOtpLoading(false);
    }
  };

  // If no player is selected, show check-in / OTP verification screen
  if (!selectedPlayerId || !player) {
    const availableCandidates = session?.players?.filter((p) => !p.isCheckedIn) || [];
    const candidate = session?.players?.find((p) => p.id === candidateId);

    return (
      <div
        className="min-h-screen bg-gradient-to-b from-[#134bc4] via-[#1d63ea] to-[#1448b8] text-white flex flex-col justify-between selection:bg-yellow-400 selection:text-blue-950 relative overflow-hidden"
        style={{ fontFamily: '"Be Vietnam Pro", sans-serif' }}
      >
        {/* Digital Transformation Background & Subtle Pattern */}
        <DigitalTechBackground />
        <div
          className="absolute inset-0 opacity-[0.05] pointer-events-none"
          style={{
            backgroundImage: 'radial-gradient(#ffffff 1.5px, transparent 1.5px)',
            backgroundSize: '20px 20px',
          }}
        />

        {/* Top Header Banner - Official Youth Union Identity */}
        <header className="relative z-10 w-full pt-6 pb-4 px-4 border-b border-white/15 bg-[#0d3b9e]/80 backdrop-blur-md">
          <div className="max-w-lg md:max-w-xl mx-auto flex flex-col items-center text-center">
            <div className="flex items-center gap-3 mb-2">
              <div className="p-1.5 rounded-2xl bg-white/15 ring-1 ring-white/30 shadow-md">
                <BrandMark size={42} />
              </div>
              <div className="text-left">
                <div className="text-[10px] sm:text-[11px] font-black uppercase tracking-wider text-yellow-300">
                  TỈNH ĐOÀN NGHỆ AN
                </div>
                <div className="text-xs sm:text-sm font-black uppercase tracking-wide text-white leading-tight">
                  HỘI THI BÍ THƯ ĐOÀN CƠ SỞ GIỎI 2026
                </div>
              </div>
            </div>

            <div className="inline-flex items-center gap-2 px-3.5 py-1 rounded-full bg-white/15 border border-white/25 text-white text-[11px] font-bold uppercase tracking-wider mt-1 shadow-xs">
              <Radio className="w-3 h-3 text-yellow-300 animate-pulse" />
              <span>Cổng dự thi trực tuyến của thí sinh</span>
            </div>
          </div>
        </header>

        {/* Main Content Area */}
        <main className="relative z-10 flex-1 w-full max-w-lg md:max-w-xl mx-auto px-4 sm:px-6 py-6 sm:py-8 flex flex-col justify-center space-y-4">
          {/* Card: Select Contestant */}
          <div className="bg-white text-slate-900 rounded-2xl p-4 sm:p-5 shadow-xl border border-blue-100 space-y-3">
            <div className="flex items-center justify-between">
              <label className="text-xs font-black uppercase tracking-wider text-blue-950 flex items-center gap-2">
                <span className="w-5 h-5 rounded-md bg-[#134bc4] text-white text-[11px] font-black flex items-center justify-center">
                  1
                </span>
                Chọn thí sinh dự thi
              </label>
              <span className="text-[11px] text-slate-500 font-medium">
                {availableCandidates.length} thí sinh sẵn sàng
              </span>
            </div>

            <div className="relative">
              <select
                value={candidateId || ''}
                onChange={(e) => {
                  const id = Number(e.target.value) || null;
                  setCandidateId(id);
                  candidateIdRef.current = id;
                  const found = session?.players?.find((p) => p.id === id);
                  if (found?.email) setEmailInput(found.email);
                  setOtpSent(false);
                  setRescueRequested(false);
                  setOtpError(null);
                }}
                className="w-full bg-slate-50 border-2 border-blue-200 focus:border-[#134bc4] focus:ring-2 focus:ring-blue-500/20 rounded-xl px-3.5 py-3 text-xs sm:text-sm text-slate-900 font-semibold outline-none transition-all appearance-none cursor-pointer"
              >
                <option value="" className="bg-white text-slate-700">
                  {availableCandidates.length > 0
                    ? '-- Nhấn vào đây để chọn số báo danh thí sinh --'
                    : '-- Tất cả thí sinh đã điểm danh vào phòng thi --'}
                </option>
                {availableCandidates.map((p) => (
                  <option key={p.id} value={p.id} className="bg-white text-slate-900 py-1">
                    SBD {String(p.orderNumber).padStart(2, '0')}: {p.fullName} - {p.unit}
                  </option>
                ))}
              </select>
              <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-3 text-blue-600">
                <ChevronRight className="w-4 h-4 rotate-90" />
              </div>
            </div>

            {availableCandidates.length === 0 && (
              <div className="p-3.5 rounded-xl bg-amber-50 border border-amber-300 text-amber-900 text-xs flex items-start gap-2.5">
                <AlertCircle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                <div className="leading-relaxed">
                  <strong>Tất cả thí sinh đã vào phòng thi.</strong> Mỗi thí sinh chỉ sử dụng duy nhất một thiết bị. Trường hợp bạn cần đổi thiết bị dự thi hoặc gặp sự cố kỹ thuật, vui lòng báo Ban Tổ chức để được hỗ trợ.
                </div>
              </div>
            )}
          </div>

          {/* Card: Verification when candidate selected */}
          {candidate && (
            <div className="bg-white text-slate-900 rounded-2xl p-4 sm:p-5 shadow-2xl border border-blue-100 space-y-4 animate-fadeIn">
              {/* Contestant Identity Preview */}
              <div className="flex items-center gap-3.5 p-3 rounded-xl bg-blue-50/80 border border-blue-200">
                {candidate.avatarUrl ? (
                  <img
                    src={candidate.avatarUrl}
                    alt={candidate.fullName}
                    className="w-13 h-13 rounded-xl object-cover border border-blue-300 shrink-0"
                  />
                ) : (
                  <div className="w-13 h-13 rounded-xl bg-gradient-to-br from-red-600 to-red-700 text-yellow-300 font-black text-lg flex items-center justify-center shrink-0 border border-red-500/40 shadow-sm">
                    {String(candidate.orderNumber).padStart(2, '0')}
                  </div>
                )}
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <span className="px-2 py-0.5 rounded bg-yellow-400 text-blue-950 font-black text-[11px] shrink-0 tracking-wide">
                      SBD {String(candidate.orderNumber).padStart(2, '0')}
                    </span>
                    <h3 className="font-black text-blue-950 text-sm sm:text-base truncate">
                      {candidate.fullName}
                    </h3>
                  </div>
                  <p className="text-xs text-blue-800 truncate mt-0.5 font-semibold">{candidate.unit}</p>
                  <p className="text-[11px] text-slate-500 truncate mt-0.5">
                    {candidate.position || 'Bí thư Đoàn cơ sở'}
                  </p>
                </div>
              </div>

              {otpError && (
                <div className="p-3 rounded-xl bg-rose-50 border border-rose-300 text-rose-800 text-xs flex items-start gap-2 animate-fadeIn">
                  <AlertCircle className="w-4 h-4 shrink-0 mt-0.5 text-rose-600" />
                  <span className="leading-relaxed font-medium">{otpError}</span>
                </div>
              )}

              {candidate.isCheckedIn ? (
                <div className="p-4 rounded-xl bg-rose-50 border border-rose-300 text-rose-800 text-xs text-center space-y-2">
                  <div className="font-bold flex items-center justify-center gap-1.5 text-rose-700 text-sm">
                    <XCircle className="w-4 h-4 text-rose-600" /> THÍ SINH ĐÃ ĐĂNG NHẬP TRÊN THIẾT BỊ KHÁC
                  </div>
                  <p className="leading-relaxed text-rose-700 text-[11px]">
                    Số báo danh này hiện đang hoạt động trên một thiết bị khác. Quy định Hội thi chỉ cho phép 01 thiết bị cho mỗi thí sinh. Vui lòng liên hệ Ban Tổ chức nếu bạn cần đổi máy thi đấu.
                  </p>
                </div>
              ) : rescueRequested ? (
                /* Waiting for Admin Direct Approval */
                <div className="p-5 rounded-2xl bg-amber-50 border border-amber-300 text-center space-y-3">
                  <div className="w-12 h-12 rounded-full bg-amber-100 text-amber-600 flex items-center justify-center mx-auto ring-1 ring-amber-400">
                    <Radio className="w-6 h-6 animate-spin" style={{ animationDuration: '3s' }} />
                  </div>
                  <div>
                    <h4 className="font-black text-amber-900 text-sm uppercase tracking-wide">
                      Đang chờ Ban Tổ chức xác nhận trực tiếp
                    </h4>
                    <p className="text-xs text-slate-600 mt-1.5 leading-relaxed">
                      Yêu cầu đã được gửi tới Bàn điều hành Hội thi. Khi Ban Tổ chức xác nhận, thiết bị của bạn sẽ tự động chuyển vào phòng thi.
                    </p>
                  </div>
                  <div className="pt-1">
                    <button
                      type="button"
                      onClick={() => setRescueRequested(false)}
                      className="px-4 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold border border-slate-300 transition-all active:scale-98"
                    >
                      Hủy, dùng phương thức nhận mã OTP
                    </button>
                  </div>
                </div>
              ) : (
                /* Verification Methods */
                <div className="space-y-4 pt-1">
                  {/* Method 1: Email OTP */}
                  <div className="space-y-3">
                    <div className="text-xs font-black uppercase tracking-wider text-blue-950 flex items-center gap-2">
                      <span className="w-5 h-5 rounded-md bg-[#134bc4] text-white text-[11px] font-black flex items-center justify-center">
                        2
                      </span>
                      Xác thực thiết bị thi đấu
                    </div>

                    {!otpSent ? (
                      <div className="space-y-2.5">
                        <div>
                          <label className="text-[11px] text-slate-600 font-semibold block mb-1">
                            Địa chỉ thư điện tử (Email) đăng ký:
                          </label>
                          <input
                            type="email"
                            value={emailInput}
                            onChange={(e) => setEmailInput(e.target.value)}
                            placeholder="Nhập email thí sinh..."
                            className="w-full bg-slate-50 border-2 border-slate-200 focus:border-[#134bc4] focus:ring-1 focus:ring-blue-500 rounded-xl px-3 py-2.5 text-xs sm:text-sm text-slate-900 font-mono outline-none transition-all"
                          />
                        </div>
                        <button
                          disabled={otpLoading}
                          onClick={handleRequestOtp}
                          className="w-full py-3 rounded-xl bg-yellow-400 hover:bg-yellow-300 text-blue-950 font-black text-xs sm:text-sm shadow-md transition-all flex items-center justify-center gap-2 active:scale-98 disabled:opacity-50 uppercase tracking-wider"
                        >
                          {otpLoading ? <RefreshCw className="w-4 h-4 animate-spin" /> : null}
                          GỬI MÃ XÁC THỰC OTP
                        </button>
                      </div>
                    ) : (
                      <div className="space-y-3 animate-fadeIn">
                        <div className="text-xs text-emerald-800 bg-emerald-50 p-3 rounded-xl border border-emerald-300">
                          Mã xác thực 6 chữ số đã được gửi tới hộp thư <strong>{emailInput}</strong>.
                        </div>
                        <div>
                          <label className="text-[11px] text-slate-600 font-semibold block mb-1">
                            Nhập mã xác thực gồm 6 chữ số:
                          </label>
                          <input
                            type="text"
                            maxLength={6}
                            value={otpInput}
                            onChange={(e) => setOtpInput(e.target.value)}
                            placeholder="------"
                            className="w-full bg-slate-50 border-2 border-blue-400 focus:border-[#134bc4] focus:ring-2 focus:ring-blue-500/20 rounded-xl py-2.5 text-center text-xl font-black tracking-widest text-[#134bc4] outline-none transition-all"
                          />
                        </div>
                        <div className="flex gap-2">
                          <button
                            disabled={otpLoading}
                            onClick={handleVerifyOtp}
                            className="flex-1 py-3 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-black text-xs sm:text-sm shadow-md transition-all flex items-center justify-center gap-2 active:scale-98 disabled:opacity-50 uppercase tracking-wider"
                          >
                            {otpLoading ? <RefreshCw className="w-4 h-4 animate-spin" /> : <UserCheck className="w-4 h-4" />}
                            XÁC THỰC VÀ VÀO PHÒNG
                          </button>
                          <button
                            type="button"
                            onClick={() => setOtpSent(false)}
                            className="px-3.5 py-3 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold border border-slate-300 transition-all"
                          >
                            Đổi email
                          </button>
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Divider */}
                  <div className="relative flex py-1 items-center">
                    <div className="flex-grow border-t border-slate-200"></div>
                    <span className="flex-shrink mx-3 text-slate-400 text-[10px] uppercase font-bold tracking-wider">
                      HOẶC
                    </span>
                    <div className="flex-grow border-t border-slate-200"></div>
                  </div>

                  {/* Method 2: Admin Direct Approval */}
                  <div className="space-y-2">
                    <button
                      disabled={otpLoading}
                      onClick={handleRequestRescue}
                      className="w-full py-3 rounded-xl bg-blue-50 hover:bg-blue-100 border border-blue-200 text-blue-900 font-bold text-xs shadow-xs transition-all flex items-center justify-center gap-2 active:scale-98 disabled:opacity-50"
                    >
                      <Shield className="w-4 h-4 text-blue-700" />
                      <span>Yêu cầu Ban Tổ chức xác nhận trực tiếp</span>
                    </button>
                    <p className="text-[11px] text-slate-500 text-center leading-normal">
                      Áp dụng khi thiết bị đổi đột xuất hoặc thí sinh không thể nhận thư điện tử trên sân khấu.
                    </p>
                  </div>
                </div>
              )}
            </div>
          )}
        </main>

        {/* Footer */}
        <footer className="relative z-10 text-center text-[11px] text-white/80 py-3 px-4 border-t border-white/15 bg-[#0d3b9e]/60 backdrop-blur-sm">
          BAN THƯỜNG VỤ TỈNH ĐOÀN NGHỆ AN • HỘI THI BÍ THƯ ĐOÀN CƠ SỞ GIỎI 2026
        </footer>
      </div>
    );
  }

  // Active Player View
  const round1State = session?.round1State || 'IDLE';
  const isHopeStarActiveThisRound = Boolean(
    hopeStarActivatedThisQuestion ||
      (player.hopeStarUsed && player.hopeStarQuestionIndex === session?.currentQuestionIndex)
  );

  return (
    <div
      className={`min-h-screen text-white flex flex-col select-none relative transition-all duration-500 overflow-x-hidden ${
        isHopeStarActiveThisRound
          ? 'bg-gradient-to-b from-amber-700 via-[#1b5ee3] to-[#1142a8] ring-4 ring-inset ring-amber-400/90'
          : 'bg-gradient-to-b from-[#134bc4] via-[#1d63ea] to-[#1448b8]'
      }`}
      style={{ fontFamily: '"Be Vietnam Pro", sans-serif' }}
    >
      {/* Digital Transformation Background & Subtle Pattern */}
      <DigitalTechBackground />
      <div
        className="absolute inset-0 opacity-[0.05] pointer-events-none"
        style={{
          backgroundImage: 'radial-gradient(#ffffff 1.5px, transparent 1.5px)',
          backgroundSize: '20px 20px',
        }}
      />

      {/* HOPE STAR ACTIVE GLOW BORDER / WATERMARK BANNER (Nếu thí sinh đặt NSHV) */}
      {isHopeStarActiveThisRound && (
        <div className="sticky top-0 z-40 bg-gradient-to-r from-amber-400 via-yellow-300 to-amber-400 text-blue-950 px-3 py-1.5 shadow-md flex items-center justify-between animate-pulse">
          <div className="flex items-center gap-1.5 text-xs font-black tracking-wide uppercase">
            <Star className="w-4 h-4 fill-blue-950" />
            <span>ĐANG ĐẶT NGÔI SAO HY VỌNG Ở CÂU NÀY</span>
          </div>
          <span className="text-[10px] font-black bg-blue-950 text-yellow-300 px-2 py-0.5 rounded-full uppercase tracking-wider">
            x2 ĐIỂM
          </span>
        </div>
      )}

      {/* Top Fixed Contestant Bar (Đồng bộ chuẩn Đoàn TNCS Hồ Chí Minh) */}
      <header className="bg-[#0d3b9e]/90 backdrop-blur-md border-b border-white/15 px-3.5 py-2.5 sticky top-0 z-30 shadow-md">
        <div className="max-w-4xl lg:max-w-5xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="p-1 rounded-xl bg-white/15 ring-1 ring-white/30 shadow-xs shrink-0">
              <BrandMark size={32} />
            </div>
            
            {/* Avatar with SBD Badge & Initial Fallback */}
            <div className="relative shrink-0">
              {player.avatarUrl ? (
                <img
                  src={player.avatarUrl}
                  alt={player.fullName}
                  className={`w-10 h-10 rounded-xl object-cover shadow-xs transition-all ${
                    isHopeStarActiveThisRound
                      ? 'border-2 border-yellow-300 ring-2 ring-yellow-400'
                      : 'border-2 border-white/60'
                  }`}
                />
              ) : (
                <div
                  className={`w-10 h-10 rounded-xl font-black text-base flex items-center justify-center shadow-xs transition-all ${
                    isHopeStarActiveThisRound
                      ? 'bg-gradient-to-br from-amber-500 to-yellow-500 text-blue-950 border-2 border-yellow-300 ring-2 ring-yellow-400'
                      : 'bg-gradient-to-br from-red-600 to-red-700 text-yellow-300 border border-white/60'
                  }`}
                >
                  {player.fullName.trim().split(' ').slice(-1)[0]?.charAt(0)?.toUpperCase() || String(player.orderNumber)}
                </div>
              )}
              <div className="absolute -bottom-1 -right-1 px-1 min-w-[18px] h-[16px] rounded bg-yellow-400 text-blue-950 font-black text-[9px] flex items-center justify-center border border-white shadow-xs">
                {String(player.orderNumber).padStart(2, '0')}
              </div>
            </div>

            <div className="min-w-0">
              <div className="text-xs sm:text-sm font-black text-white leading-tight truncate flex items-center gap-1.5">
                <span>{player.fullName}</span>
                {isHopeStarActiveThisRound && (
                  <span className="px-1.5 py-0.5 rounded-full bg-yellow-400 text-blue-950 text-[10px] font-black inline-flex items-center gap-0.5 shadow-xs animate-bounce-short">
                    <Star className="w-3 h-3 fill-blue-950" /> NSHV
                  </span>
                )}
              </div>
              <div className="text-[10px] sm:text-xs text-sky-200 font-medium leading-none truncate max-w-[150px] sm:max-w-[200px] mt-0.5">
                {player.unit}
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            {/* WS Status */}
            <div className="flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-white/15 border border-white/20 shadow-inner">
              <div
                className={`w-2 h-2 rounded-full ${
                  isConnected ? 'bg-emerald-400 animate-pulse' : 'bg-rose-400'
                }`}
              />
              <span className="text-[10px] text-white font-semibold hidden xs:inline">
                {isConnected ? 'Trực tuyến' : 'Mất kết nối'}
              </span>
            </div>

            <button
              type="button"
              onClick={() => setShowSwitchConfirmModal(true)}
              className="text-[11px] font-bold text-white hover:text-yellow-300 px-2.5 py-1 rounded-lg bg-white/15 hover:bg-white/25 border border-white/25 transition-all active:scale-95 flex items-center gap-1"
            >
              <LogOut className="w-3 h-3" />
              <span className="hidden xs:inline">Đổi SBD</span>
            </button>
          </div>
        </div>
      </header>

      {/* Mini Scoreboard Bar */}
      <div className="bg-[#0b338a]/90 border-b border-white/10 px-4 py-2 text-[11px] sm:text-xs text-sky-100 shadow-sm relative z-10 backdrop-blur-md">
        <div className="max-w-4xl lg:max-w-5xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-2.5 font-medium">
            <span>
              V1: <strong className="text-yellow-300 font-bold">{player.round1Score ?? 0}đ</strong>
            </span>
            <span className="text-white/30">|</span>
            <span>
              V2: <strong className="text-yellow-300 font-bold">{player.round2Score ?? 0}đ</strong>
            </span>
            <span className="text-white/30">|</span>
            <span>
              V3: <strong className="text-yellow-300 font-bold">{player.round3Score ?? 0}đ</strong>
            </span>
          </div>
          <div className="font-black text-blue-950 flex items-center gap-1.5 bg-yellow-400 px-2.5 py-1 rounded-lg shadow-xs">
            <Award className="w-3.5 h-3.5 text-blue-950" />
            <span>Tổng: {player.totalScore ?? 0}đ</span>
          </div>
        </div>
      </div>

      {/* Main Active Play Body */}
      <main className="flex-1 flex flex-col p-4 sm:p-6 md:p-8 max-w-xl md:max-w-3xl lg:max-w-4xl mx-auto w-full relative z-10 justify-center">
        {/* 0. LOBBY WAITING ROOM */}
        {session?.status === 'LOBBY' && (
          <div className="flex-1 flex flex-col justify-center py-2 animate-fadeIn space-y-4 w-full max-w-xl mx-auto">
            <div className="bg-white text-slate-900 border border-blue-100 rounded-3xl p-6 shadow-2xl text-center space-y-4 relative overflow-hidden">
              <div className="relative mx-auto w-24 h-24">
                <div className="w-24 h-24 rounded-2xl bg-gradient-to-br from-blue-700 to-indigo-800 border-2 border-blue-300 flex items-center justify-center overflow-hidden shadow-lg">
                  {player.avatarUrl ? (
                    <img src={player.avatarUrl} alt="" className="w-full h-full object-cover" />
                  ) : (
                    <span className="text-3xl font-black text-yellow-300">
                      {player.fullName.trim().split(' ').slice(-1)[0]?.charAt(0)?.toUpperCase() || player.fullName.charAt(0)}
                    </span>
                  )}
                </div>
                <div className="absolute -bottom-2 -right-2 px-2 py-0.5 rounded-lg bg-yellow-400 text-blue-950 font-black text-xs flex items-center justify-center shadow border-2 border-white">
                  SBD {String(player.orderNumber).padStart(2, '0')}
                </div>
              </div>

              <div>
                <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-100 border border-emerald-300 text-emerald-800 text-xs font-black uppercase mb-2 shadow-xs">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600" /> ĐÃ ĐIỂM DANH VÀO PHÒNG THI
                </div>
                <h2 className="text-lg sm:text-xl font-black text-blue-950 mt-1">{player.fullName}</h2>
                <p className="text-xs font-semibold text-blue-700 mt-0.5">{player.unit}</p>
                <div className="mt-2.5 inline-block px-3.5 py-1 rounded-lg bg-blue-50 border border-blue-200 text-blue-900 font-extrabold text-xs shadow-xs">
                  BÍ THƯ ĐOÀN CƠ SỞ GIỎI 2026
                </div>
              </div>

              <div className="p-4 bg-blue-50 border border-blue-200 rounded-2xl text-xs text-blue-900 leading-relaxed font-medium text-left">
                <div className="font-bold text-blue-950 mb-1 flex items-center gap-1.5">
                  <Radio className="w-3.5 h-3.5 text-blue-600 animate-pulse" />
                  Trạng thái: Đang trong phòng chờ thi đấu
                </div>
                Thí sinh vui lòng giữ nguyên màn hình và chú ý hiệu lệnh của Ban Tổ chức trên sân khấu. Khi phiên thi bắt đầu, hệ thống sẽ tự động kích hoạt câu hỏi.
              </div>
            </div>

            {/* Tiến độ thí sinh trong phòng */}
            <div className="bg-white text-slate-900 border border-blue-100 rounded-2xl p-4 shadow-md space-y-2.5">
              <div className="flex items-center justify-between text-xs font-bold text-slate-700">
                <span className="flex items-center gap-1.5">
                  <Users className="w-4 h-4 text-blue-600" />
                  Tiến độ thí sinh đã vào phòng:
                </span>
                <span className="text-[#134bc4] font-black">
                  {session?.players?.filter((p) => p.isCheckedIn).length || 0} / 10 thí sinh
                </span>
              </div>
              <div className="w-full bg-slate-100 h-2.5 rounded-full overflow-hidden p-0.5 border border-slate-200">
                <div
                  className="bg-gradient-to-r from-blue-600 to-emerald-500 h-full transition-all duration-500 rounded-full"
                  style={{
                    width: `${Math.min(
                      100,
                      (((session?.players?.filter((p) => p.isCheckedIn).length || 0) / 10) * 100)
                    )}%`,
                  }}
                />
              </div>
            </div>
          </div>
        )}

        {/* 1. ROUND 1 VIEW */}
        {session?.status === 'ROUND1' && (
          <div className="flex-1 flex flex-col justify-center w-full">
            {/* Round 1: Phase 1 - 5s Hope Star */}
            {round1State === 'HOPE_STAR_5S' && (
              <div className="flex-1 flex flex-col items-center justify-center text-center py-4 animate-fadeIn w-full">
                <div className="bg-white text-slate-900 border-2 border-amber-400 rounded-3xl p-6 sm:p-8 shadow-2xl w-full max-w-xl mx-auto text-center relative overflow-hidden">
                  <div className="w-24 h-24 rounded-full bg-amber-50 border-4 border-amber-400 flex items-center justify-center mx-auto mb-4 relative shadow-lg shadow-amber-500/20">
                    <Star className="w-12 h-12 text-amber-500 fill-amber-400 animate-spin-slow" />
                    <div className="absolute -top-1 -right-1 bg-red-600 text-yellow-300 font-black text-sm w-7 h-7 rounded-full flex items-center justify-center border-2 border-white shadow-md">
                      {countdown}s
                    </div>
                  </div>

                  <div className="inline-flex items-center gap-1 px-3 py-0.5 rounded-full bg-amber-100 border border-amber-300 text-amber-900 text-xs font-black uppercase mb-1.5">
                    CÂU HỎI {session?.currentQuestionIndex} / 10
                  </div>
                  <h2 className="text-xl sm:text-2xl font-black text-blue-950 uppercase tracking-wide">
                    ĐẶT NGÔI SAO HY VỌNG?
                  </h2>
                  <p className="text-xs sm:text-sm text-slate-600 mt-1 mb-5 px-2 leading-relaxed">
                    Đúng được nhân đôi số điểm (+10, +6, +4 điểm). Sai bị trừ 2 điểm. Mỗi thí sinh chỉ có duy nhất 1 cơ hội trong 10 câu!
                  </p>

                  {player.hopeStarUsed ? (
                    <div className="w-full bg-slate-50 border border-slate-200 rounded-2xl p-4 text-xs text-slate-700">
                      <p className="font-bold text-slate-900">
                        Thí sinh đã sử dụng quyền Ngôi sao hy vọng ở câu số{' '}
                        <span className="text-amber-600 font-black">
                          {player.hopeStarQuestionIndex}
                        </span>
                      </p>
                      <p className="mt-1 text-[11px] text-slate-500">
                        (Mỗi thí sinh chỉ được sử dụng duy nhất 01 lần trong 10 câu hỏi)
                      </p>
                    </div>
                  ) : hopeStarActivatedThisQuestion ? (
                    <div className="w-full bg-gradient-to-r from-amber-400 via-yellow-400 to-amber-400 border-2 border-yellow-300 rounded-2xl p-4 text-center shadow-lg animate-bounce-short">
                      <div className="text-blue-950 font-black text-sm sm:text-base flex items-center justify-center gap-1.5 uppercase">
                        <Star className="w-5 h-5 fill-blue-950 text-blue-950" /> ĐÃ ĐẶT NGÔI SAO HY VỌNG THÀNH CÔNG!
                      </div>
                      <p className="text-xs font-bold text-blue-900 mt-1">
                        Hãy tập trung cao độ khi MC đọc câu hỏi và mở cổng trả lời!
                      </p>
                    </div>
                  ) : (
                    <button
                      onClick={handleActivateHopeStar}
                      className="w-full py-4 px-6 rounded-2xl bg-gradient-to-r from-amber-400 via-yellow-400 to-amber-400 hover:from-amber-300 hover:to-yellow-300 text-blue-950 font-black text-sm sm:text-base shadow-xl shadow-amber-500/30 active:scale-95 transition-all flex items-center justify-center gap-2 border-2 border-yellow-200"
                    >
                      <Star className="w-5 h-5 fill-blue-950" />
                      XÁC NHẬN ĐẶT NGÔI SAO HY VỌNG ({countdown}s)
                    </button>
                  )}
                </div>
              </div>
            )}

            {/* Round 1: Phase 2 - Video Playing */}
            {round1State === 'VIDEO_PLAYING' && (
              <div className="flex-1 flex flex-col items-center justify-center text-center py-6 animate-fadeIn w-full">
                <div className="bg-white text-slate-900 border border-blue-100 rounded-3xl p-6 sm:p-8 shadow-2xl w-full max-w-xl mx-auto text-center relative overflow-hidden">
                  <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-blue-50 border border-blue-200 text-blue-900 text-xs font-black uppercase mb-4 shadow-xs">
                    <Radio className="w-3.5 h-3.5 text-red-500 animate-pulse" />
                    CÂU HỎI {session?.currentQuestionIndex} / 10 • TRÌNH CHIẾU VIDEO
                  </div>

                  <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-blue-600 to-indigo-700 text-white flex items-center justify-center mx-auto mb-4 shadow-lg shadow-blue-600/30 ring-4 ring-blue-100">
                    <Radio className="w-10 h-10 animate-pulse" />
                  </div>

                  <h3 className="text-lg sm:text-xl font-black text-blue-950 mb-2 uppercase tracking-wide">
                    Đang phát video tình huống
                  </h3>
                  <p className="text-xs sm:text-sm text-slate-600 max-w-xs sm:max-w-md mx-auto leading-relaxed">
                    Thí sinh chú ý quan sát video clip phóng sự trên màn hình LED lớn tại sân khấu...
                  </p>

                  <div className="mt-6 inline-flex items-center gap-2 text-xs sm:text-sm font-bold text-blue-900 bg-blue-50 px-4 py-2 rounded-xl border border-blue-200 shadow-xs">
                    <Clock className="w-4 h-4 text-blue-600" />
                    <span>Thời gian 40 giây sẽ bắt đầu sau khi kết thúc video</span>
                  </div>
                </div>
              </div>
            )}

            {/* Round 1: Phase 3 - MC Question Reading */}
            {round1State === 'QUESTION_READING' && (
              <div className="flex-1 flex flex-col items-center justify-center text-center py-6 animate-fadeIn space-y-4 w-full">
                {/* Hope Star Status Highlight if Contestant used Hope Star */}
                {isHopeStarActiveThisRound && (
                  <div className="w-full max-w-xl mx-auto bg-gradient-to-r from-amber-400 via-yellow-400 to-amber-500 text-blue-950 p-4 rounded-2xl border-2 border-yellow-200 shadow-lg shadow-amber-500/20 text-center animate-bounce-short">
                    <div className="flex items-center justify-center gap-1.5 font-black text-sm uppercase">
                      <Star className="w-4 h-4 fill-blue-950" />
                      BẠN ĐANG ĐẶT NGÔI SAO HY VỌNG CÂU HỎI NÀY!
                    </div>
                    <p className="text-xs font-bold text-blue-900 mt-0.5">
                      Đúng: Nhân đôi điểm số (+10, +6, +4đ) • Sai: Bị trừ 2 điểm (-2đ)
                    </p>
                  </div>
                )}

                <div className="bg-white text-slate-900 border border-blue-100 rounded-3xl p-6 sm:p-8 shadow-2xl w-full max-w-xl mx-auto text-center relative overflow-hidden">
                  <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-blue-50 border border-blue-200 text-blue-900 text-xs font-black uppercase mb-4 shadow-xs">
                    <Users className="w-3.5 h-3.5 text-blue-600" />
                    CÂU HỎI {session?.currentQuestionIndex} / 10 • BAN GIÁM KHẢO & MC
                  </div>

                  <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-blue-700 to-indigo-800 text-white flex items-center justify-center mx-auto mb-4 shadow-lg shadow-blue-700/30 ring-4 ring-blue-100">
                    <Users className="w-10 h-10" />
                  </div>

                  <h3 className="text-lg sm:text-xl font-black text-blue-950 mb-2 uppercase tracking-wide">
                    MC đang đọc câu hỏi & 4 phương án
                  </h3>
                  <p className="text-xs sm:text-sm text-slate-600 max-w-xs sm:max-w-md mx-auto leading-relaxed">
                    Thí sinh lắng nghe kỹ nội dung câu hỏi và 4 phương án trên sân khấu...
                  </p>

                  <div className="mt-6 inline-flex items-center gap-2 text-xs sm:text-sm font-bold text-emerald-800 bg-emerald-50 px-4 py-2 rounded-xl border border-emerald-300 shadow-xs">
                    <Timer className="w-4 h-4 text-emerald-600 animate-spin-slow" />
                    <span>Thời gian 40 giây sẽ bắt đầu sau hiệu lệnh của MC</span>
                  </div>
                </div>
              </div>
            )}

            {/* Round 1: Phase 4 - 40s Answering Phase */}
            {round1State === 'QUESTION_40S' && (
              <div className="flex-1 flex flex-col justify-center py-2 sm:py-4 md:py-6 animate-fadeIn w-full">
                {/* Timer & Question Info */}
                <div className="w-full mb-3 sm:mb-4">
                  <div className="flex items-center justify-between mb-2.5 sm:mb-3">
                    <div className="flex items-center gap-2">
                      <span className="px-3.5 py-1.5 rounded-xl bg-white/20 border border-white/30 text-yellow-300 font-black text-xs sm:text-sm uppercase shadow-xs">
                        CÂU HỎI {session?.currentQuestionIndex} / 10
                      </span>
                      {isHopeStarActiveThisRound && (
                        <span className="px-2.5 py-1 rounded-lg bg-yellow-400 text-blue-950 font-black text-[11px] sm:text-xs flex items-center gap-1 shadow-xs animate-pulse">
                          <Star className="w-3.5 h-3.5 fill-blue-950" /> NSHV
                        </span>
                      )}
                    </div>

                    <div
                      className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-full font-black text-xs sm:text-sm shadow-sm ${
                        countdown <= 10
                          ? 'bg-red-600 text-white animate-pulse'
                          : 'bg-white text-blue-950 border border-white'
                      }`}
                    >
                      <Timer className="w-4 h-4" />
                      {countdown}s
                    </div>
                  </div>

                  {/* THÔNG BÁO HIỂN THỊ LÊN PHÍA TRÊN (KHÔNG ĐỂ DƯỚI ĐỂ TRÁNH BỊ CUỘN TRANG) */}
                  {hasSubmitted ? (
                    <div className="p-3 sm:p-4 rounded-2xl bg-emerald-500 text-white border-2 border-white text-center shadow-lg animate-scaleUp">
                      <div className="inline-flex items-center gap-2 text-xs sm:text-base font-black uppercase tracking-wide">
                        <CheckCircle2 className="w-4 h-4 sm:w-5 sm:h-5 text-white shrink-0" />
                        <span>ĐÃ GỬI PHƯƠNG ÁN TRẢ LỜI THÀNH CÔNG!</span>
                      </div>
                      {submitTimeMs !== null && (
                        <p className="text-xs sm:text-sm text-emerald-100 font-mono mt-1">
                          Thời gian phản xạ: <strong className="text-yellow-300 font-black">{(submitTimeMs / 1000).toFixed(2)}s</strong>
                        </p>
                      )}
                    </div>
                  ) : (
                    <div className="p-3 rounded-2xl bg-white/15 backdrop-blur-sm border border-white/25 text-center text-xs sm:text-sm text-white shadow-xs">
                      <p className="font-semibold">
                        {isHopeStarActiveThisRound ? (
                          <span>⭐ <strong className="text-yellow-300 underline font-black">CÂU HỎI CÓ NGÔI SAO HY VỌNG</strong>: Chạm vào 01 phương án dưới đây để trả lời!</span>
                        ) : (
                          <span>Thí sinh theo dõi đề trên sân khấu & chọn 01 phương án dưới đây:</span>
                        )}
                      </p>
                    </div>
                  )}
                </div>

                {/* 4 Shuffled Options (Mobile: 1 cột; Tablet/PC: 2 cột cân đối 2x2) */}
                <div className="w-full grid grid-cols-1 md:grid-cols-2 gap-3 sm:gap-4 my-2 sm:my-3">
                  {optionsToRender.length === 0 ? (
                    <div className="md:col-span-2 text-center py-8 space-y-3 bg-white text-slate-900 border border-blue-100 rounded-2xl p-6 shadow-md">
                      <RefreshCw className="w-7 h-7 text-[#134bc4] animate-spin mx-auto" />
                      <p className="text-xs text-slate-600">Đang tải các phương án lựa chọn...</p>
                    </div>
                  ) : (
                    optionsToRender.map((opt, idx) => {
                      const isSelected = selectedKey === opt.originalKey;
                      return (
                        <button
                          key={opt.originalKey + '-' + idx}
                          disabled={hasSubmitted || countdown <= 0}
                          onClick={() => handleSubmitOption(opt)}
                          className={`w-full min-h-[64px] sm:min-h-[76px] p-3.5 sm:p-4 rounded-2xl text-left flex items-center justify-between transition-all duration-200 ${
                            isSelected
                              ? hasSubmitted
                                ? 'bg-emerald-50 border-3 border-emerald-600 text-emerald-950 font-black shadow-md'
                                : 'bg-blue-50 border-3 border-[#134bc4] text-blue-950 font-black shadow-xl ring-2 ring-blue-300/60 scale-[1.01]'
                              : hasSubmitted
                              ? 'bg-white/70 border-2 border-slate-200 text-slate-400 opacity-60 cursor-not-allowed'
                              : isHopeStarActiveThisRound
                              ? 'bg-white text-slate-900 border-2 border-amber-300 hover:border-amber-500 hover:shadow-lg active:scale-[0.98] shadow-md'
                              : 'bg-white text-slate-900 border-2 border-blue-200/90 hover:border-[#134bc4] hover:shadow-lg active:scale-[0.98] shadow-md'
                          }`}
                        >
                          <div className="flex items-center gap-3 min-w-0">
                            <span
                              className={`w-8 h-8 sm:w-9 sm:h-9 rounded-xl text-xs sm:text-sm font-black flex items-center justify-center shrink-0 shadow-xs transition-colors ${
                                isSelected
                                  ? hasSubmitted
                                    ? 'bg-emerald-600 text-white'
                                    : 'bg-yellow-400 text-blue-950 border border-white'
                                  : hasSubmitted
                                  ? 'bg-slate-200 text-slate-500 font-bold'
                                  : 'bg-[#134bc4] text-white'
                              }`}
                            >
                              {idx + 1}
                            </span>
                            <span
                              className={`text-xs sm:text-sm md:text-base leading-snug break-words ${
                                isSelected
                                  ? hasSubmitted
                                    ? 'font-black text-emerald-950'
                                    : 'font-black text-blue-950'
                                  : hasSubmitted
                                  ? 'font-medium text-slate-400'
                                  : 'font-bold text-slate-900'
                              }`}
                            >
                              {opt.content}
                            </span>
                          </div>
                          {isSelected && (
                            <CheckCircle2
                              className={`w-5 h-5 sm:w-6 sm:h-6 shrink-0 ml-2 animate-scaleUp ${
                                hasSubmitted ? 'text-emerald-600' : 'text-[#134bc4]'
                              }`}
                            />
                          )}
                        </button>
                      );
                    })
                  )}
                </div>
              </div>
            )}

            {/* Round 1: Phase 5 - Answer Revealed */}
            {round1State === 'ANSWER_REVEALED' && (() => {
              const myAns = revealedData?.answers?.find((a: any) => Number(a.playerId) === Number(selectedPlayerId));
              const isCorrect = myAns ? Boolean(myAns.isCorrect) : false;
              const myTimeMs = myAns?.responseTimeMs || submitTimeMs;
              const scoreAwarded = myAns?.scoreAwarded ?? 0;
              const q = currentQuestion || session?.currentQuestion;
              const corr = revealedData?.correctOption || q?.correctOption;
              let corrText = corr || '';
              if (q && corr) {
                if (corr === 'A') corrText = `A. ${q.optionA || 'A'}`;
                else if (corr === 'B') corrText = `B. ${q.optionB || 'B'}`;
                else if (corr === 'C') corrText = `C. ${q.optionC || 'C'}`;
                else if (corr === 'D') corrText = `D. ${q.optionD || 'D'}`;
                else if (corr === q.optionA) corrText = `A. ${q.optionA}`;
                else if (corr === q.optionB) corrText = `B. ${q.optionB}`;
                else if (corr === q.optionC) corrText = `C. ${q.optionC}`;
                else if (corr === q.optionD) corrText = `D. ${q.optionD}`;
              }
              const explanationText = revealedData?.explanation || q?.explanation;

              return (
                <div className="flex-1 flex flex-col justify-center py-4 animate-fadeIn w-full max-w-xl mx-auto">
                  <div className="text-center mb-4">
                    <div className="text-xs font-black text-yellow-300 uppercase tracking-wider mb-2">
                      KẾT QUẢ CÂU {session?.currentQuestionIndex} / 10
                    </div>

                    {isCorrect ? (
                      <div className="bg-white text-slate-900 border-3 border-emerald-500 rounded-3xl p-5 text-center shadow-xl">
                        <CheckCircle2 className="w-12 h-12 text-emerald-600 mx-auto mb-2" />
                        <h3 className="text-lg font-black text-emerald-800">TRẢ LỜI CHÍNH XÁC!</h3>
                        <p className="text-sm text-emerald-700 font-bold mt-1">
                          +{scoreAwarded} điểm
                        </p>
                      </div>
                    ) : (
                      <div className="bg-white text-slate-900 border-3 border-rose-500 rounded-3xl p-5 text-center shadow-xl">
                        <XCircle className="w-12 h-12 text-rose-600 mx-auto mb-2" />
                        <h3 className="text-lg font-black text-rose-800">CHƯA CHÍNH XÁC</h3>
                        <p className="text-sm text-rose-700 font-bold mt-1">
                          {myAns?.hasHopeStar ? '-2.0 điểm (Ngôi sao hy vọng)' : '0 điểm'}
                        </p>
                      </div>
                    )}

                    {/* Stats summary: Time & Current Total Score */}
                    <div className="grid grid-cols-2 gap-2.5 mt-3 max-w-xs mx-auto">
                      <div className="bg-white/15 border border-white/25 rounded-xl p-2.5 text-center shadow-xs">
                        <div className="text-[10px] text-sky-200 font-semibold uppercase">Thời gian làm bài</div>
                        <div className="text-sm font-black text-white font-mono mt-0.5">
                          {myTimeMs ? `${(myTimeMs / 1000).toFixed(2)}s` : '—'}
                        </div>
                      </div>
                      <div className="bg-white/15 border border-white/25 rounded-xl p-2.5 text-center shadow-xs">
                        <div className="text-[10px] text-sky-200 font-semibold uppercase">Tổng điểm tích lũy</div>
                        <div className="text-sm font-black text-yellow-300 mt-0.5">
                          {player?.round1Score ?? 0}đ
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="bg-white text-slate-900 border border-blue-200 rounded-2xl p-4 text-xs shadow-md">
                    <div className="text-slate-900 font-bold mb-1">
                      Đáp án đúng:{' '}
                      <span className="text-emerald-700 font-black">
                        {corrText || 'Đang cập nhật'}
                      </span>
                    </div>
                    {explanationText && (
                      <p className="text-slate-600 leading-relaxed text-[11px] mt-1">
                        {explanationText}
                      </p>
                    )}
                  </div>
                </div>
              );
            })()}

            {/* Round 1: Phase 6 - Leaderboard */}
            {round1State === 'LEADERBOARD' && (() => {
              const myRankIndex = sortedLeaderboard.findIndex((p) => p.id === selectedPlayerId);
              const myRank = myRankIndex !== -1 ? myRankIndex + 1 : null;

              return (
                <div className="flex-1 flex flex-col justify-center py-3 animate-fadeIn w-full max-w-2xl mx-auto">
                  <div className="text-center mb-3">
                    <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-white/20 border border-white/30 text-yellow-300 text-xs font-black uppercase mb-1 shadow-xs">
                      <Award className="w-4 h-4 text-yellow-300" />
                      BẢNG XẾP HẠNG VÒNG 1: THÔNG THÁI
                    </div>
                    <p className="text-[11px] text-sky-100 font-medium">
                      Xếp hạng theo tổng điểm tích lũy của 10 thí sinh
                    </p>
                  </div>

                  {/* HERO BANNER: FOCUS TRỰC DIỆN VÀO THỨ HẠNG CỦA CHÍNH THÍ SINH ĐÓ */}
                  {myRank && player && (
                    <div className="mb-4 bg-gradient-to-r from-yellow-400 via-amber-400 to-yellow-500 text-blue-950 rounded-2xl p-4 shadow-xl border-2 border-white relative overflow-hidden animate-scaleUp">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <div className="w-12 h-12 rounded-2xl bg-blue-950 text-yellow-300 font-black text-xl flex flex-col items-center justify-center shadow-lg ring-2 ring-white">
                            <span className="text-[10px] font-bold leading-none uppercase tracking-tighter">HẠNG</span>
                            <span className="leading-none mt-0.5">{myRank}</span>
                          </div>
                          <div>
                            <div className="flex items-center gap-1.5">
                              <span className="text-[10px] font-black uppercase bg-blue-950 text-yellow-300 px-1.5 py-0.2 rounded shadow-2xs">
                                BẠN
                              </span>
                              <h4 className="text-sm font-black text-blue-950 tracking-tight truncate max-w-[140px] sm:max-w-[180px]">
                                {player.fullName}
                              </h4>
                            </div>
                            <p className="text-[11px] text-blue-900 truncate mt-0.5 font-semibold">{player.unit}</p>
                          </div>
                        </div>

                        <div className="text-right shrink-0">
                          <div className="text-base sm:text-lg font-black text-blue-950">
                            {player.round1Score ?? 0}đ
                          </div>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* DANH SÁCH CHI TIẾT CÓ TỰ ĐỘNG CUỘN VÀ HIGHLIGHT VÀO CHÍNH THÍ SINH */}
                  <div className="space-y-2 overflow-y-auto max-h-[50vh] pr-1">
                    {sortedLeaderboard.map((p, idx) => {
                      const isMe = p.id === selectedPlayerId;
                      const rankNum = idx + 1;

                      return (
                        <div
                          key={p.id}
                          ref={(el) => {
                            if (isMe && el) {
                              el.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
                            }
                          }}
                          className={`p-3 rounded-2xl border-2 flex items-center justify-between text-xs transition-all duration-300 ${
                            isMe
                              ? 'bg-amber-50/95 border-yellow-400 text-blue-950 font-bold shadow-lg ring-2 ring-yellow-400/50 scale-[1.01]'
                              : 'bg-white text-slate-900 border-blue-100 shadow-xs'
                          }`}
                        >
                          <div className="flex items-center gap-2.5 min-w-0">
                            {/* Thứ hạng badge */}
                            <span
                              className={`w-7 h-7 rounded-xl font-black text-xs flex items-center justify-center shrink-0 shadow-xs ${
                                rankNum === 1
                                  ? 'bg-yellow-400 text-blue-950 border border-yellow-500'
                                  : rankNum === 2
                                  ? 'bg-slate-200 text-slate-800 border border-slate-300'
                                  : rankNum === 3
                                  ? 'bg-amber-600 text-white border border-amber-700'
                                  : 'bg-blue-50 border border-blue-200 text-blue-900'
                              }`}
                            >
                              {rankNum}
                            </span>

                            {/* Avatar or initial */}
                            {p.avatarUrl ? (
                              <img
                                src={p.avatarUrl}
                                alt=""
                                className={`w-8 h-8 rounded-lg object-cover shrink-0 ${
                                  isMe ? 'border-2 border-yellow-400' : 'border border-blue-200'
                                }`}
                              />
                            ) : (
                              <span
                                className={`w-8 h-8 rounded-lg font-black text-xs flex items-center justify-center shrink-0 ${
                                  isMe
                                    ? 'bg-yellow-400 text-blue-950'
                                    : 'bg-[#134bc4] text-white'
                                }`}
                              >
                                {p.fullName.trim().split(' ').slice(-1)[0]?.charAt(0)?.toUpperCase()}
                              </span>
                            )}

                            <div className="min-w-0">
                              <div className="flex items-center gap-1.5">
                                <span
                                  className={`truncate ${
                                    isMe ? 'text-blue-950 font-black' : 'text-slate-900 font-bold'
                                  }`}
                                >
                                  {p.fullName}
                                </span>
                                {isMe && (
                                  <span className="text-[9px] bg-red-600 text-yellow-300 px-1 py-0.2 rounded font-black shrink-0 shadow-2xs">
                                    BẠN
                                  </span>
                                )}
                              </div>
                              <div className="text-[10px] text-blue-800 truncate font-medium">{p.unit}</div>
                            </div>
                          </div>

                          <div className="text-right shrink-0 ml-2">
                            <div className={`font-black ${isMe ? 'text-amber-600 text-sm' : 'text-[#134bc4]'}`}>
                              {p.round1Score}đ
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              );
            })()}

            {/* Round 1: Idle state */}
            {round1State === 'IDLE' && (
              <div className="flex-1 flex flex-col items-center justify-center text-center py-10 w-full max-w-xl mx-auto">
                <div className="bg-white text-slate-900 border border-blue-100 rounded-3xl p-6 shadow-xl w-full">
                  <Zap className="w-12 h-12 text-amber-500 mx-auto mb-3" />
                  <h3 className="text-base font-black text-blue-950 mb-1">VÒNG 1: THÔNG THÁI</h3>
                  <p className="text-xs text-slate-600 max-w-xs mx-auto leading-relaxed">
                    Gồm 10 câu hỏi trắc nghiệm, mỗi câu 40 giây. Hãy chú ý lắng nghe hiệu lệnh của MC
                    trên sân khấu!
                  </p>
                </div>
              </div>
            )}
          </div>
        )}

        {/* 2. ROUND 2 VIEW */}
        {session?.status === 'ROUND2' && (
          <div className="flex-1 flex flex-col justify-center py-6 animate-fadeIn text-center w-full max-w-xl mx-auto">
            <div className="w-14 h-14 rounded-full bg-yellow-400/20 border border-yellow-300/60 flex items-center justify-center mx-auto mb-3">
              <Zap className="w-7 h-7 text-yellow-300" />
            </div>
            <h2 className="text-base font-black text-white uppercase">VÒNG 2: NHẠY BÉN</h2>
            <p className="text-xs text-sky-200 mt-1 mb-6">
              Xử lý tình huống trên phần mềm Quản lý đoàn viên (10 phút)
            </p>

            <div className="bg-white text-slate-900 border border-blue-100 rounded-2xl p-5 text-left space-y-3 shadow-xl">
              <div className="flex items-center justify-between border-b border-slate-100 pb-2">
                <span className="text-xs text-slate-500">Mã đề bốc thăm:</span>
                <span className="text-sm font-black text-[#134bc4]">
                  {player.round2DrawCode || 'Chưa bốc thăm'}
                </span>
              </div>
              <div className="flex items-center justify-between border-b border-slate-100 pb-2">
                <span className="text-xs text-slate-500">Điểm tình huống 1:</span>
                <span className="text-xs font-bold text-slate-900">
                  {player.round2Scenario1Score ?? 0} / 20đ
                </span>
              </div>
              <div className="flex items-center justify-between border-b border-slate-100 pb-2">
                <span className="text-xs text-slate-500">Điểm tình huống 2:</span>
                <span className="text-xs font-bold text-slate-900">
                  {player.round2Scenario2Score ?? 0} / 20đ
                </span>
              </div>
              <div className="flex items-center justify-between pt-1">
                <span className="text-xs font-bold text-slate-700">Tổng điểm Vòng 2:</span>
                <span className="text-sm font-black text-amber-600">{player.round2Score ?? 0}đ</span>
              </div>
            </div>
          </div>
        )}

        {/* 3. ROUND 3 VIEW */}
        {session?.status === 'ROUND3' && (
          <div className="flex-1 flex flex-col justify-center py-6 animate-fadeIn text-center w-full max-w-xl mx-auto">
            <div className="w-14 h-14 rounded-full bg-white/20 border border-white/40 flex items-center justify-center mx-auto mb-3">
              <Users className="w-7 h-7 text-white" />
            </div>
            <h2 className="text-base font-black text-white uppercase">VÒNG 3: BẢN LĨNH</h2>
            <p className="text-xs text-sky-200 mt-1 mb-6">Tranh biện đối kháng trực tiếp trên sân khấu</p>

            <div className="bg-white text-slate-900 border border-blue-100 rounded-2xl p-5 text-left space-y-3 shadow-xl">
              <div className="flex items-center justify-between border-b border-slate-100 pb-2">
                <span className="text-xs text-slate-500">Cặp đấu bốc thăm:</span>
                <span className="text-sm font-black text-[#134bc4]">
                  {player.round3PairGroup ? `CẶP 0${player.round3PairGroup}` : 'Chưa ghép cặp'}
                </span>
              </div>
              <div className="flex items-center justify-between pt-1">
                <span className="text-xs font-bold text-slate-700">Điểm đối kháng:</span>
                <span className="text-sm font-black text-[#134bc4]">
                  {player.round3Score ?? 0} / 100đ
                </span>
              </div>
            </div>
          </div>
        )}

        {/* FINISHED VIEW */}
        {session?.status === 'FINISHED' && (
          <div className="flex-1 flex flex-col items-center justify-center py-6 text-center animate-fadeIn w-full max-w-xl mx-auto">
            <Award className="w-16 h-16 text-yellow-300 mb-3 animate-bounce" />
            <h2 className="text-xl font-black text-white uppercase">HỘI THI HOÀN THÀNH</h2>
            <p className="text-xs text-sky-200 mt-1 mb-4">
              Thí sinh đã hoàn thành các phần thi.
            </p>

            <div className="bg-white text-slate-900 border border-blue-100 rounded-2xl p-5 w-full max-w-xs space-y-2 shadow-xl">
              <div className="text-xs text-slate-500">Thứ hạng chung cuộc:</div>
              <div className="text-2xl font-black text-amber-500">
                HẠNG {player.finalRank ?? '-'}
              </div>
              <div className="text-xs font-bold text-slate-900 pt-2 border-t border-slate-100">
                Tổng điểm: {player.totalScore}đ
              </div>
            </div>
          </div>
        )}
      </main>

      {/* CONFIRMATION & WARNING MODAL: ĐỔI SBD / RỜI PHÒNG THI */}
      {showSwitchConfirmModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-xs animate-fadeIn">
          <div className="bg-white rounded-3xl max-w-sm w-full p-6 shadow-2xl border-2 border-amber-400 space-y-4 animate-scaleUp text-slate-900">
            <div className="w-14 h-14 rounded-2xl bg-amber-50 border-2 border-amber-300 text-amber-600 flex items-center justify-center mx-auto shadow-inner">
              <AlertCircle className="w-8 h-8 text-amber-600" />
            </div>

            <div className="text-center space-y-2">
              <h3 className="text-base font-black text-blue-950 uppercase">
                XÁC NHẬN ĐỔI SỐ BÁO DANH?
              </h3>
              <p className="text-xs text-slate-600 leading-relaxed">
                Bạn đang đăng nhập với tư cách: <br />
                <strong className="text-[#134bc4] text-sm">
                  SBD {String(player.orderNumber).padStart(2, '0')}: {player.fullName}
                </strong>
              </p>
            </div>

            {/* Warning Box */}
            <div className="p-3.5 rounded-2xl bg-rose-50 border border-rose-300 text-rose-800 text-xs space-y-1.5">
              <div className="font-black flex items-center gap-1.5 text-rose-700 uppercase text-[11px]">
                <Shield className="w-3.5 h-3.5 text-rose-600" /> CẢNH BÁO QUAN TRỌNG:
              </div>
              <ul className="list-disc list-inside space-y-1 text-[11px] leading-relaxed text-rose-700">
                <li>Thiết bị của bạn sẽ bị <strong>đăng xuất</strong> khỏi phòng thi đấu ngay lập tức.</li>
                <li>SBD này sẽ được giải phóng để thiết bị khác có thể đăng nhập.</li>
                <li>Nếu phiên thi đang diễn ra, bạn có thể <strong>bị mất lượt trả lời câu hỏi</strong> hiện tại.</li>
              </ul>
            </div>

            {/* Actions */}
            <div className="flex gap-2.5 pt-1">
              <button
                type="button"
                disabled={switchingPlayer}
                onClick={() => setShowSwitchConfirmModal(false)}
                className="flex-1 py-3 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold transition-all border border-slate-300 active:scale-98"
              >
                HỦY BỎ
              </button>
              <button
                type="button"
                disabled={switchingPlayer}
                onClick={handleConfirmSwitchPlayer}
                className="flex-1 py-3 rounded-xl bg-rose-600 hover:bg-rose-500 text-white text-xs font-black shadow-md shadow-rose-600/20 transition-all flex items-center justify-center gap-1.5 active:scale-98"
              >
                {switchingPlayer ? <RefreshCw className="w-4 h-4 animate-spin" /> : <LogOut className="w-4 h-4" />}
                XÁC NHẬN ĐỔI SBD
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
