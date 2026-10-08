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
  Mail,
  Lock,
  Swords,
  Search,
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
import { formatScore } from '../../../utils/scoreFormatter';

// Helper to get or create a unique device ID per browser tab
function getTabDeviceId(): string {
  let id = sessionStorage.getItem('live_tab_device_id');
  if (!id) {
    id = 'dev_' + Math.random().toString(36).substring(2, 10) + '_' + Date.now().toString(36);
    sessionStorage.setItem('live_tab_device_id', id);
  }
  return id;
}

function maskEmail(email?: string): string {
  if (!email || !email.trim()) return '';
  const trimmed = email.trim();
  const atIdx = trimmed.indexOf('@');
  if (atIdx <= 0) return trimmed;
  const username = trimmed.substring(0, atIdx);
  const domain = trimmed.substring(atIdx);
  if (username.length <= 2) return username + domain;
  if (username.length <= 4) {
    const first = username.charAt(0);
    const last = username.charAt(username.length - 1);
    const stars = Math.max(1, username.length - 2);
    return first + '*'.repeat(stars) + last + domain;
  }
  const prefix = username.substring(0, 2);
  const suffix = username.substring(username.length - 2);
  const stars = username.length - 4;
  return prefix + '*'.repeat(stars) + suffix + domain;
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
  const [candidateSearch, setCandidateSearch] = useState<string>('');
  const [showCandidateDropdown, setShowCandidateDropdown] = useState<boolean>(false);
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

  // Round 2 states
  const [round2Topics, setRound2Topics] = useState<LiveRound2Topic[]>([]);
  const [r2BatchRunning, setR2BatchRunning] = useState<boolean>(false);
  const [r2Timer, setR2Timer] = useState<number>(600);
  const [r2TimerRunning, setR2TimerRunning] = useState<boolean>(false);
  const [r2TimeUp, setR2TimeUp] = useState<boolean>(false);

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

  const questionStartTimeRef = useRef<number>(0);
  const targetEndTimeRef = useRef<number | null>(null);
  const r2TargetEndTimeRef = useRef<number | null>(null);
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

      // Automatically fetch question options and check previous submission if we synced into active 40s question
      if (data && data.round1State === 'QUESTION_40S') {
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

      // Restore Round 2 10-minute timer if candidate reloads page during exam
      if (data && data.status === 'ROUND2' && data.round2BatchRunning && data.round2BatchEndAt) {
        const activePId = selectedPlayerIdRef.current || (sessionStorage.getItem('live_player_id') ? Number(sessionStorage.getItem('live_player_id')) : null);
        const inBatch = !data.round2BatchPlayerIds || data.round2BatchPlayerIds.length === 0 || (activePId && data.round2BatchPlayerIds.includes(activePId));
        if (inBatch) {
          const remainingR2 = Math.max(0, Math.ceil((data.round2BatchEndAt - Date.now()) / 1000));
          if (remainingR2 > 0) {
            r2TargetEndTimeRef.current = data.round2BatchEndAt;
            setR2Timer(remainingR2);
            setR2TimerRunning(true);
            setR2BatchRunning(true);
            setR2TimeUp(false);
          } else {
            r2TargetEndTimeRef.current = null;
            setR2Timer(0);
            setR2TimerRunning(false);
            setR2TimeUp(true);
          }
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

  // Round 2 Topics Fetching
  useEffect(() => {
    if (session?.id && (session.status === 'ROUND2' || round2Topics.length === 0)) {
      const pId = selectedPlayerId || (sessionStorage.getItem('live_player_id') ? Number(sessionStorage.getItem('live_player_id')) : undefined);
      liveApi
        .getRound2Topics(session.id, pId)
        .then((topics) => {
          if (topics && topics.length > 0) {
            setRound2Topics(topics);
          }
        })
        .catch(console.error);
    }
  }, [session?.id, session?.status, selectedPlayerId, player?.round2DrawCode]);

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
        liveSound.playBuzzer();
      }
    }, 250);
    return () => clearInterval(interval);
  }, [r2TimerRunning]);

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

        case 'SESSION_RESET':
          setSession(event.payload);
          setSelectedKey(null);
          setHasSubmitted(false);
          setSubmitTimeMs(null);
          setHopeStarActive(false);
          try {
            Object.keys(sessionStorage).forEach((k) => {
              if (k.startsWith('live_ans_')) sessionStorage.removeItem(k);
            });
          } catch (e) {}
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
          setCurrentQuestion(null);
          setSelectedKey(null);
          setHasSubmitted(false);
          setSubmitTimeMs(null);
          setSession((prev) => {
            if (!prev) return prev;
            return {
              ...prev,
              status: 'ROUND1',
              currentRound: 1,
              round1State: 'QUESTION_READING',
              currentQuestionIndex: event.payload.questionOrder ?? prev.currentQuestionIndex,
              currentQuestion: undefined,
            };
          });
          // Tải lại session để cập nhật danh sách thí sinh đã đặt Ngôi sao hy vọng trong câu hỏi này
          fetchSession();
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

        case 'ROUND2_TOPIC_ASSIGNED': {
          const myPId =
            selectedPlayerIdRef.current ||
            (sessionStorage.getItem('live_player_id')
              ? Number(sessionStorage.getItem('live_player_id'))
              : null);
          if (event.payload?.playerId === myPId && event.payload?.topic) {
            setRound2Topics((prev) => {
              const assignedTopic = event.payload.topic;
              if (!assignedTopic || !assignedTopic.code) return prev;
              const exists = prev.some((t) => t.code === assignedTopic.code);
              if (exists) {
                return prev.map((t) => (t.code === assignedTopic.code ? { ...t, ...assignedTopic } : t));
              }
              return [...prev, assignedTopic];
            });
          }
          fetchSession();
          break;
        }

        case 'ROUND2_TOPIC_UNASSIGNED':
        case 'ROUND2_PLAYER_RESET':
          fetchSession();
          break;

        case 'ROUND2_BATCH_STARTED': {
          const myPId =
            selectedPlayerIdRef.current ||
            (sessionStorage.getItem('live_player_id')
              ? Number(sessionStorage.getItem('live_player_id'))
              : null);
          const pIds = event.payload?.playerIds || [];
          if (myPId && pIds.includes(myPId)) {
            const endAt = event.payload?.endAt || (Date.now() + (event.payload?.durationSeconds || 600) * 1000);
            r2TargetEndTimeRef.current = endAt;
            const rem = Math.max(0, Math.ceil((endAt - Date.now()) / 1000));
            setR2BatchRunning(true);
            setR2Timer(rem);
            setR2TimerRunning(true);
            setR2TimeUp(false);
            liveSound.playFanfare();
          } else {
            setR2BatchRunning(false);
            setR2TimerRunning(false);
          }
          fetchSession();
          break;
        }

        case 'ROUND2_BATCH_ENDED': {
          r2TargetEndTimeRef.current = null;
          setR2TimerRunning(false);
          setR2Timer(0);
          if (r2BatchRunning) {
            setR2TimeUp(true);
            setR2BatchRunning(false);
            liveSound.playBuzzer();
          }
          fetchSession();
          break;
        }

        case 'ROUND2_BATCH_RESET': {
          r2TargetEndTimeRef.current = null;
          setR2BatchRunning(false);
          setR2TimerRunning(false);
          setR2TimeUp(false);
          setR2Timer(600);
          fetchSession();
          break;
        }

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

  // 1. Initial loading state: while fetching session from server, show sleek loading indicator
  if (loading && !session) {
    return (
      <div
        className="min-h-screen bg-gradient-to-b from-[#134bc4] via-[#1d63ea] to-[#1448b8] text-white flex flex-col items-center justify-center relative overflow-hidden"
        style={{ fontFamily: '"Be Vietnam Pro", sans-serif' }}
      >
        <DigitalTechBackground />
        <div className="relative z-10 flex flex-col items-center gap-4 px-4 text-center">
          <div className="p-3 rounded-2xl bg-white/15 ring-1 ring-white/35 shadow-xl backdrop-blur-md animate-pulse">
            <BrandMark size={52} />
          </div>
          <div className="flex items-center gap-2.5 text-white font-bold text-sm tracking-wide bg-[#0d3b9e]/80 backdrop-blur-md px-4 py-2 rounded-full border border-white/20 shadow-md">
            <RefreshCw className="w-4 h-4 animate-spin text-yellow-300" />
            <span>Đang tải thông tin phòng thi...</span>
          </div>
        </div>
      </div>
    );
  }

  // 2. If session is not available after loading (e.g. server error or no live session started)
  if (!session) {
    return (
      <div
        className="min-h-screen bg-gradient-to-b from-[#134bc4] via-[#1d63ea] to-[#1448b8] text-white flex flex-col justify-between relative overflow-hidden"
        style={{ fontFamily: '"Be Vietnam Pro", sans-serif' }}
      >
        <DigitalTechBackground />
        <header className="relative z-10 w-full bg-[#10348c]/90 border-b border-white/15 backdrop-blur-md shadow-md">
          <div className="w-full flex items-center justify-between px-3 sm:px-4 md:px-8 py-2.5 max-w-[1400px] mx-auto gap-2">
            <div className="flex items-center gap-2 sm:gap-3 text-white min-w-0">
              <BrandMark size={34} showBorder={false} className="shrink-0 sm:hidden" />
              <BrandMark size={40} showBorder={false} className="shrink-0 hidden sm:block" />
              <div className="leading-tight min-w-0">
                <p className="text-[9px] sm:text-xs font-black tracking-wider uppercase text-yellow-300 truncate">
                  TỈNH ĐOÀN NGHỆ AN
                </p>
                <p className="text-[11px] sm:text-sm font-extrabold uppercase tracking-tight sm:tracking-wide text-white drop-shadow-xs truncate">
                  CHUNG KẾT BÍ THƯ ĐOÀN CƠ SỞ GIỎI 2026
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2 shrink-0">
              <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-white/15 border border-white/20 text-white text-[10px] sm:text-xs font-bold uppercase tracking-wider shadow-xs">
                <Radio className="w-3 h-3 text-yellow-300 animate-pulse" />
                <span>Cổng thí sinh</span>
              </span>
            </div>
          </div>
        </header>

        <main className="relative z-10 flex-1 flex flex-col items-center justify-center px-4 py-8 text-center max-w-md mx-auto w-full">
          <div className="bg-white text-slate-900 rounded-2xl p-6 sm:p-7 shadow-2xl border border-blue-100 space-y-4 w-full">
            <div className="w-14 h-14 rounded-full bg-amber-50 border border-amber-200 flex items-center justify-center mx-auto text-amber-600">
              <AlertCircle className="w-7 h-7" />
            </div>
            <div className="space-y-1">
              <h3 className="text-base sm:text-lg font-black text-blue-950 uppercase">Chưa có phiên thi trực tiếp</h3>
              <p className="text-xs sm:text-sm text-slate-600 leading-relaxed">
                Hiện tại chưa có phiên thi chung kết nào đang mở hoặc máy chủ chưa sẵn sàng. Vui lòng liên hệ Ban Tổ chức hoặc thử lại.
              </p>
            </div>
            <button
              onClick={() => fetchSession()}
              className="w-full py-3 px-4 bg-[#134bc4] hover:bg-[#10348c] active:scale-95 text-white text-xs sm:text-sm font-bold rounded-xl transition-all shadow-md flex items-center justify-center gap-2"
            >
              <RefreshCw className="w-4 h-4" />
              <span>Tải lại phiên thi</span>
            </button>
          </div>
        </main>
      </div>
    );
  }

  // 3. If no player is selected, show check-in / OTP verification screen
  if (!selectedPlayerId || !player) {
    const totalPlayers = session.players?.length || 0;
    const availableCandidates = session.players?.filter((p) => !p.isCheckedIn) || [];
    const candidate = session.players?.find((p) => p.id === candidateId);
    const filteredCandidates = availableCandidates.filter((p) => {
      if (!candidateSearch.trim()) return true;
      const q = candidateSearch.trim().toLowerCase();
      return (
        p.fullName.toLowerCase().includes(q) ||
        p.unit.toLowerCase().includes(q) ||
        String(p.orderNumber).includes(q)
      );
    });

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

        {/* Top Header Navbar - Đồng bộ phong cách trang chủ */}
        <header className="relative z-10 w-full bg-[#10348c]/90 border-b border-white/15 backdrop-blur-md shadow-md">
          <div className="w-full flex items-center justify-between px-3 sm:px-4 md:px-8 py-2.5 max-w-[1400px] mx-auto gap-2">
            {/* Logo & Tiêu đề thanh Navbar */}
            <div className="flex items-center gap-2 sm:gap-3 text-white min-w-0">
              <BrandMark size={34} showBorder={false} className="shrink-0 sm:hidden" />
              <BrandMark size={40} showBorder={false} className="shrink-0 hidden sm:block" />
              <div className="leading-tight min-w-0">
                <p className="text-[9px] sm:text-xs font-black tracking-wider uppercase text-yellow-300 truncate">
                  TỈNH ĐOÀN NGHỆ AN
                </p>
                <p className="text-[11px] sm:text-sm font-extrabold uppercase tracking-tight sm:tracking-wide text-white drop-shadow-xs truncate">
                  CHUNG KẾT BÍ THƯ ĐOÀN CƠ SỞ GIỎI 2026
                </p>
              </div>
            </div>

            {/* Huy hiệu Cổng Thí Sinh */}
            <div className="flex items-center gap-2 shrink-0">
              <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-white/15 border border-white/20 text-white text-[10px] sm:text-xs font-bold uppercase tracking-wider shadow-xs">
                <Radio className="w-3 h-3 text-yellow-300 animate-pulse" />
                <span>Cổng thí sinh</span>
              </span>
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

            {candidate ? (
              /* Đã chọn thí sinh: Hiển thị card thông tin + nút Đổi giống Vòng Loại */
              <div className="rounded-2xl border-2 border-blue-200 bg-blue-50/70 p-3.5 flex items-center justify-between gap-3 shadow-xs animate-fadeIn">
                <div className="flex items-center gap-3 min-w-0">
                  {candidate.avatarUrl ? (
                    <img
                      src={candidate.avatarUrl}
                      alt={candidate.fullName}
                      className="w-12 h-12 rounded-xl object-cover border border-blue-300 shrink-0 shadow-xs"
                    />
                  ) : (
                    <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-blue-600 to-indigo-700 text-white font-black text-base flex items-center justify-center shrink-0 border border-blue-500/40 shadow-xs">
                      {candidate.fullName.trim().split(' ').slice(-1)[0]?.charAt(0).toUpperCase()}
                    </div>
                  )}
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-mono font-bold text-blue-700 bg-blue-100 px-1.5 py-0.5 rounded">
                        #{String(candidate.orderNumber).padStart(2, '0')}
                      </span>
                      <span className="font-bold text-slate-900 text-sm sm:text-base truncate">
                        {candidate.fullName}
                      </span>
                    </div>
                    <p className="text-xs text-slate-600 truncate mt-0.5 font-medium">{candidate.unit}</p>
                    <p className="text-[11px] text-slate-500 truncate mt-0.5">
                      {candidate.position || 'Bí thư Đoàn cơ sở'}
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    setCandidateId(null);
                    candidateIdRef.current = null;
                    setOtpSent(false);
                    setRescueRequested(false);
                    setOtpError(null);
                    setCandidateSearch('');
                    setShowCandidateDropdown(true);
                  }}
                  className="rounded-xl bg-blue-200/80 hover:bg-blue-300 text-blue-950 font-bold px-3 py-1.5 text-xs transition-colors shrink-0 shadow-xs active:scale-95"
                  title="Chọn lại thí sinh khác"
                >
                  Đổi
                </button>
              </div>
            ) : (
              /* Chưa chọn: Ô tìm kiếm họ tên, SBD hoặc đơn vị kèm menu dropdown nổi bật */
              <div className="relative">
                <div className="relative">
                  <input
                    type="text"
                    value={candidateSearch}
                    onChange={(e) => {
                      setCandidateSearch(e.target.value);
                      setShowCandidateDropdown(true);
                    }}
                    onFocus={() => setShowCandidateDropdown(true)}
                    onBlur={() => window.setTimeout(() => setShowCandidateDropdown(false), 200)}
                    placeholder="Gõ tìm kiếm họ tên hoặc đơn vị trong danh sách..."
                    className="w-full bg-slate-50 border-2 border-blue-200 focus:border-[#134bc4] focus:ring-2 focus:ring-blue-500/20 rounded-xl pl-10 pr-4 py-3 text-xs sm:text-sm text-slate-900 font-semibold outline-none transition-all placeholder:text-slate-400"
                  />
                  <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3.5 text-blue-600">
                    <Search className="w-4 h-4" />
                  </div>
                </div>

                {showCandidateDropdown && (
                  <div className="absolute z-30 mt-1.5 max-h-64 w-full overflow-y-auto rounded-2xl border border-slate-200 bg-white shadow-2xl">
                    <div className="sticky top-0 bg-slate-100 px-3.5 py-2 text-xs font-bold text-slate-500 uppercase tracking-wider border-b border-slate-200 flex justify-between items-center">
                      <span>Danh sách thí sinh đủ điều kiện ({filteredCandidates.length} kết quả)</span>
                    </div>
                    {filteredCandidates.length > 0 ? (
                      filteredCandidates.map((c) => (
                        <button
                          key={c.id}
                          type="button"
                          onMouseDown={(e) => e.preventDefault()}
                          onClick={() => {
                            setCandidateId(c.id);
                            candidateIdRef.current = c.id;
                            if (c.email) setEmailInput(c.email);
                            setOtpSent(false);
                            setRescueRequested(false);
                            setOtpError(null);
                            setShowCandidateDropdown(false);
                            setCandidateSearch('');
                          }}
                          className="w-full px-4 py-3 text-left text-sm transition-colors border-b border-slate-100 flex items-center justify-between gap-3 hover:bg-blue-50 hover:text-blue-950 text-slate-800"
                        >
                          <div className="flex items-center gap-3 min-w-0">
                            {c.avatarUrl ? (
                              <img
                                src={c.avatarUrl}
                                alt={c.fullName}
                                className="w-10 h-10 rounded-xl object-cover border border-blue-200 shrink-0"
                              />
                            ) : (
                              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-blue-600 to-indigo-700 text-white font-black text-sm flex items-center justify-center shrink-0 border border-blue-400/40">
                                {c.fullName.trim().split(' ').slice(-1)[0]?.charAt(0).toUpperCase()}
                              </div>
                            )}
                            <div className="min-w-0">
                              <div className="flex items-center gap-2">
                                <span className="text-xs font-mono font-bold text-blue-600 bg-blue-100/70 px-1.5 py-0.5 rounded">
                                  #{String(c.orderNumber).padStart(2, '0')}
                                </span>
                                <span className="font-bold text-slate-900 truncate">{c.fullName}</span>
                              </div>
                              <p className="text-xs text-slate-500 truncate mt-0.5">{c.unit}</p>
                            </div>
                          </div>
                          <ChevronRight className="w-4 h-4 text-slate-400 shrink-0" />
                        </button>
                      ))
                    ) : (
                      <div className="px-4 py-6 text-center text-xs text-slate-500">
                        <p className="italic">Không tìm thấy thí sinh nào phù hợp trong danh sách.</p>
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}

            {totalPlayers > 0 && availableCandidates.length === 0 && (
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
                      <div className="space-y-3">
                        <div>
                          <div className="flex items-center justify-between mb-1">
                            <label className="text-[11px] text-slate-600 font-bold flex items-center gap-1.5">
                              <Mail className="w-3.5 h-3.5 text-blue-600" />
                              Email nhận mã OTP xác thực:
                            </label>
                            <span className="inline-flex items-center gap-1 text-[10px] font-bold text-slate-600 bg-slate-100 px-2 py-0.5 rounded-md border border-slate-200">
                              <Lock className="w-3 h-3 text-slate-500" /> Cố định
                            </span>
                          </div>

                          <div className="relative">
                            <input
                              type="text"
                              readOnly
                              value={candidate?.maskedEmail || maskEmail(candidate?.email || emailInput)}
                              className="w-full bg-slate-100 border border-slate-300 rounded-xl px-3.5 py-2.5 text-xs sm:text-sm text-slate-800 font-mono font-bold cursor-not-allowed select-all"
                            />
                          </div>
                          <p className="text-[10px] text-slate-500 mt-1 italic">
                            * Mã xác thực 6 chữ số sẽ được gửi về địa chỉ thư điện tử đã đăng ký ở trên.
                          </p>
                        </div>

                        <button
                          disabled={otpLoading || !emailInput}
                          onClick={handleRequestOtp}
                          className="w-full py-3 rounded-xl bg-yellow-400 hover:bg-yellow-300 text-blue-950 font-black text-xs sm:text-sm shadow-md transition-all flex items-center justify-center gap-2 active:scale-98 disabled:opacity-50 uppercase tracking-wider cursor-pointer"
                        >
                          {otpLoading ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Mail className="w-4 h-4" />}
                          GỬI MÃ XÁC THỰC OTP
                        </button>
                      </div>
                    ) : (
                      <div className="space-y-3 animate-fadeIn">
                        <div className="text-xs text-emerald-900 bg-emerald-50 p-3 rounded-xl border border-emerald-300">
                          Mã xác thực 6 chữ số đã được gửi tới hộp thư <strong>{candidate?.maskedEmail || maskEmail(candidate?.email || emailInput)}</strong>.
                        </div>
                        <div>
                          <label className="text-[11px] text-slate-600 font-bold block mb-1">
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
                            onClick={() => {
                              setOtpSent(false);
                              setOtpInput('');
                            }}
                            className="px-3.5 py-3 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold border border-slate-300 transition-all"
                            title="Gửi lại mã OTP"
                          >
                            Gửi lại
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
          CHUNG KẾT HỘI THI BÍ THƯ ĐOÀN CƠ SỞ GIỎI TỈNH NGHỆ AN NĂM 2026 • “ĐỔI MỚI MẠNH MẼ PHƯƠNG THỨC HOẠT ĐỘNG CỦA ĐOÀN”
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

  // Danh sách thí sinh đặt Ngôi sao hy vọng ở câu hỏi hiện tại
  const hopeStarPlayersThisQuestion = useMemo(() => {
    const currentQ = session?.currentQuestionIndex;
    if (!currentQ || !session?.players) return [];
    return session.players.filter((p) => {
      return (
        (p.hopeStarUsed && p.hopeStarQuestionIndex === currentQ) ||
        (p.id === selectedPlayerId && hopeStarActivatedThisQuestion)
      );
    });
  }, [session, selectedPlayerId, hopeStarActivatedThisQuestion]);

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
                  {player.fullName.trim().split(' ').slice(-1)[0]?.charAt(0)?.toUpperCase() || player.fullName.charAt(0)}
                </div>
              )}
            </div>

            <div className="min-w-0">
              <div className="text-xs sm:text-sm font-black text-white leading-tight truncate flex items-center gap-1.5">
                <span>{player.fullName}</span>
                {isHopeStarActiveThisRound && (
                  <span className="px-2 py-0.5 rounded-full bg-yellow-400 text-blue-950 text-[10px] font-black inline-flex items-center gap-1 shadow-xs animate-bounce-short">
                    <Star className="w-3 h-3 fill-blue-950" /> Ngôi sao hy vọng
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
              V1: <strong className="text-yellow-300 font-bold">{formatScore(player.round1Score)}đ</strong>
            </span>
            <span className="text-white/30">|</span>
            <span>
              V2: <strong className="text-yellow-300 font-bold">{formatScore(player.round2Score)}đ</strong>
            </span>
            <span className="text-white/30">|</span>
            <span>
              V3: <strong className="text-yellow-300 font-bold">{formatScore(player.round3Score)}đ</strong>
            </span>
          </div>
          <div className="font-black text-blue-950 flex items-center gap-1.5 bg-yellow-400 px-2.5 py-1 rounded-lg shadow-xs">
            <Award className="w-3.5 h-3.5 text-blue-950" />
            <span>Tổng: {formatScore(player.totalScore)}đ</span>
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
        {session?.status === 'ROUND1' && (() => {
          const questionTitle = currentQuestion?.title || session?.currentQuestion?.title;
          return (
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

                <div className="bg-white text-slate-900 border border-blue-100 rounded-3xl p-5 sm:p-7 shadow-2xl w-full max-w-xl mx-auto text-center relative overflow-hidden">
                  <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-amber-50 border border-amber-200 text-amber-900 text-xs font-black uppercase mb-3 shadow-xs">
                    <Star className="w-3.5 h-3.5 fill-amber-500 text-amber-600 animate-spin-slow" />
                    CÂU HỎI {session?.currentQuestionIndex} / 10 • KẾT QUẢ ĐẶT NGÔI SAO HY VỌNG
                  </div>

                  <h3 className="text-base sm:text-lg font-black text-blue-950 uppercase tracking-tight mb-4">
                    DANH SÁCH THÍ SINH ĐẶT NGÔI SAO HY VỌNG
                  </h3>

                  {hopeStarPlayersThisQuestion.length > 0 ? (
                    <div className="space-y-3 mb-5">
                      <p className="text-xs sm:text-sm font-semibold text-amber-950 bg-amber-50 border border-amber-200 rounded-xl p-2.5">
                        ⭐ Thí sinh đặt Ngôi sao hy vọng ở câu hỏi này:
                      </p>
                      <div className="flex flex-wrap items-center justify-center gap-3">
                        {hopeStarPlayersThisQuestion.map((p) => {
                          const lastWord = p.fullName.trim().split(/\s+/).slice(-1)[0] || '';
                          const initialChar = lastWord.charAt(0).toUpperCase();
                          const isMe = p.id === selectedPlayerId;

                          return (
                            <div
                              key={p.id}
                              className={`flex items-center gap-2.5 px-3.5 py-2 rounded-2xl border-2 transition-all ${
                                isMe
                                  ? 'bg-amber-100 border-amber-400 text-blue-950 font-bold shadow-md ring-2 ring-amber-300'
                                  : 'bg-slate-50 border-amber-200 text-slate-800 shadow-xs'
                              }`}
                            >
                              <div className="relative">
                                {p.avatarUrl ? (
                                  <img
                                    src={p.avatarUrl}
                                    alt={p.fullName}
                                    className="w-8 h-8 rounded-xl object-cover border border-amber-400 shrink-0"
                                  />
                                ) : (
                                  <div className="w-8 h-8 rounded-xl bg-amber-500 text-blue-950 font-black text-xs flex items-center justify-center shrink-0 border border-amber-300">
                                    {initialChar}
                                  </div>
                                )}
                                <span className="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-yellow-400 flex items-center justify-center shadow-xs">
                                  <Star className="w-2.5 h-2.5 fill-blue-950 text-blue-950" />
                                </span>
                              </div>
                              <div className="text-left min-w-0">
                                <div className="text-xs font-black truncate flex items-center gap-1">
                                  <span>{p.fullName}</span>
                                  {isMe && <span className="text-[10px] text-amber-800 font-extrabold">(Bạn)</span>}
                                </div>
                                <div className="text-[10px] text-slate-500 truncate">{p.unit}</div>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  ) : (
                    <div className="py-4 text-center mb-4">
                      <div className="w-12 h-12 rounded-2xl bg-slate-100 border border-slate-200 text-slate-400 flex items-center justify-center mx-auto mb-2">
                        <Star className="w-6 h-6 text-slate-400" />
                      </div>
                      <p className="text-xs text-slate-500 italic">
                        Không có thí sinh nào đặt Ngôi sao hy vọng ở câu hỏi này.
                      </p>
                    </div>
                  )}

                  <div className="inline-flex items-center gap-2 text-xs sm:text-sm font-bold text-blue-900 bg-blue-50 px-4 py-2.5 rounded-xl border border-blue-200 shadow-xs">
                    <Timer className="w-4 h-4 text-blue-600 animate-spin-slow" />
                    <span>Nội dung câu hỏi và 4 phương án sẽ hiển thị khi Ban tổ chức bắt đầu đếm giờ 40 giây</span>
                  </div>
                </div>
              </div>
            )}

            {/* Round 1: Phase 4 - 40s Answering Phase */}
            {round1State === 'QUESTION_40S' && (
              <div className="flex-1 flex flex-col justify-center py-2 sm:py-4 md:py-6 animate-fadeIn w-full">
                {/* Timer & Question Info */}
                <div className="w-full mb-2 sm:mb-3">
                  <div className="flex items-center justify-between mb-2 sm:mb-2.5">
                    <div className="flex items-center gap-2">
                      <span className="px-3.5 py-1.5 rounded-xl bg-white/20 border border-white/30 text-yellow-300 font-black text-xs sm:text-sm uppercase shadow-xs">
                        CÂU HỎI {session?.currentQuestionIndex} / 10
                      </span>
                      {isHopeStarActiveThisRound && (
                        <span className="px-2.5 py-1 rounded-lg bg-yellow-400 text-blue-950 font-black text-[11px] sm:text-xs flex items-center gap-1 shadow-xs animate-pulse">
                          <Star className="w-3.5 h-3.5 fill-blue-950" /> Ngôi sao hy vọng
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

                  {/* Khung nội dung câu hỏi hiển thị trực tiếp cho thí sinh */}
                  {questionTitle && (
                    <div className="w-full p-3 sm:p-4 rounded-2xl bg-white text-slate-900 border-2 border-blue-200 shadow-md mb-2 sm:mb-2.5 text-left animate-fadeIn">
                      <p className="text-xs sm:text-sm md:text-base font-bold leading-relaxed text-slate-900 select-text">
                        {questionTitle}
                      </p>
                    </div>
                  )}

                  {/* Thông báo trạng thái đã nộp hoặc hướng dẫn chọn phương án */}
                  {hasSubmitted ? (
                    <div className="p-2 sm:p-2.5 rounded-2xl bg-emerald-600 text-white border-2 border-white text-center shadow-lg animate-scaleUp">
                      <div className="inline-flex items-center gap-2 text-xs sm:text-sm font-black uppercase tracking-wide">
                        <CheckCircle2 className="w-4 h-4 text-white shrink-0" />
                        <span>ĐÃ NỘP BÀI THÀNH CÔNG</span>
                      </div>
                      {submitTimeMs !== null && (
                        <p className="text-xs text-emerald-100 mt-0.5">
                          Thời gian: <strong className="text-yellow-300 font-black font-mono">{(submitTimeMs / 1000).toFixed(2)}s</strong>
                        </p>
                      )}
                    </div>
                  ) : (
                    <div className="py-1 px-3 rounded-xl bg-white/15 backdrop-blur-sm border border-white/25 text-center text-xs text-white shadow-xs">
                      <p className="font-semibold">
                        {isHopeStarActiveThisRound ? (
                          <span>⭐ <strong className="text-yellow-300 underline font-black">CÂU HỎI CÓ NGÔI SAO HY VỌNG</strong>: Chạm chọn 01 phương án dưới đây!</span>
                        ) : (
                          <span>Chạm chọn 01 phương án đúng nhất dưới đây:</span>
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
                              {String.fromCharCode(65 + idx)}
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
                        <div className="text-[10px] text-sky-200 font-semibold uppercase">Thời gian</div>
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
        );
      })()}

        {/* 2. ROUND 2 VIEW */}
        {session?.status === 'ROUND2' && (() => {
          const myTopic = round2Topics.find((t) => t.code === player.round2DrawCode);
          const hasScore = (player.round2Score ?? 0) > 0;

          return (
            <div className="flex-1 flex flex-col py-4 animate-fadeIn w-full max-w-xl mx-auto space-y-4">
              <div className="text-center">
                <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-amber-400/20 border border-amber-300/40 text-amber-300 text-[11px] font-black uppercase tracking-wider mb-1">
                  <Zap className="w-3.5 h-3.5 text-amber-300" /> THỰC HÀNH NGHIỆP VỤ YUM (10 PHÚT)
                </div>
                <h2 className="text-base font-black text-white uppercase">VÒNG 2: NHẠY BÉN</h2>
              </div>

              {/* TRƯỜNG HỢP 1: ĐANG THI 10 PHÚT */}
              {r2BatchRunning && !r2TimeUp && !hasScore && (
                <div className="space-y-4 animate-scaleUp">
                  {/* Đồng hồ 10 phút */}
                  <div className="bg-slate-900 border-2 border-amber-400 rounded-2xl p-4 text-center shadow-xl">
                    <div className="text-[10px] font-black text-amber-400 uppercase tracking-widest flex items-center justify-center gap-1.5 mb-1">
                      <Timer className="w-4 h-4 animate-spin text-amber-400" /> THỜI GIAN LÀM BÀI CÒN LẠI:
                    </div>
                    <div className={`text-5xl font-black font-mono tracking-tight ${r2Timer <= 60 ? 'text-rose-500 animate-pulse' : 'text-amber-400'}`}>
                      {String(Math.floor(r2Timer / 60)).padStart(2, '0')}:
                      {String(r2Timer % 60).padStart(2, '0')}
                    </div>
                  </div>

                  {/* Card Mã đề & 2 Câu hỏi tình huống */}
                  <div className="bg-white text-slate-900 border-2 border-blue-200 rounded-3xl p-5 shadow-2xl space-y-4">
                    <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                      <div>
                        <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">MÃ ĐỀ CỦA BẠN:</span>
                        <span className="text-xl font-black text-blue-700">{player.round2DrawCode || 'BỘ ĐỀ THI'}</span>
                      </div>
                      <span className="px-3 py-1 rounded-full bg-emerald-100 text-emerald-800 font-black text-xs border border-emerald-300">
                        Đang làm bài
                      </span>
                    </div>

                    {/* Câu 1 */}
                    <div className="p-4 rounded-2xl bg-blue-50/70 border border-blue-200 space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-black text-blue-800 uppercase tracking-wide">TÌNH HUỐNG 01</span>
                        <span className="text-xs font-black text-amber-600">Tối đa 20 điểm</span>
                      </div>
                      <p className="text-xs text-slate-800 leading-relaxed font-semibold whitespace-pre-line">
                        {myTopic?.scenario1 || 'Đang cập nhật câu hỏi 1...'}
                      </p>
                    </div>

                    {/* Câu 2 */}
                    <div className="p-4 rounded-2xl bg-amber-50/70 border border-amber-200 space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-black text-amber-900 uppercase tracking-wide">TÌNH HUỐNG 02</span>
                        <span className="text-xs font-black text-amber-600">Tối đa 20 điểm</span>
                      </div>
                      <p className="text-xs text-slate-800 leading-relaxed font-semibold whitespace-pre-line">
                        {myTopic?.scenario2 || 'Đang cập nhật câu hỏi 2...'}
                      </p>
                    </div>

                    <div className="p-3 rounded-xl bg-slate-50 border border-slate-200 text-center">
                      <p className="text-[11px] text-slate-600 font-medium">
                        💡 Thí sinh hãy thực hiện thao tác nghiệp vụ trên <strong>Phần mềm Quản lý đoàn viên (YUM)</strong> tại máy tính dự thi.
                      </p>
                    </div>
                  </div>
                </div>
              )}

              {/* TRƯỜNG HỢP 2: HẾT GIỜ LÀM BÀI */}
              {r2TimeUp && !hasScore && (
                <div className="bg-white text-slate-900 border-2 border-rose-400 rounded-3xl p-6 text-center space-y-3 shadow-2xl animate-scaleUp">
                  <div className="w-14 h-14 rounded-full bg-rose-100 border-2 border-rose-400 flex items-center justify-center mx-auto text-rose-600">
                    <Timer className="w-7 h-7" />
                  </div>
                  <h3 className="text-lg font-black text-rose-600 uppercase">HẾT GIỜ LÀM BÀI</h3>
                  <p className="text-xs text-slate-600 leading-relaxed max-w-sm mx-auto">
                    Đã hết 10 phút thời gian làm bài. Thí sinh vui lòng dừng mọi thao tác trên máy tính và chờ Ban Giám khảo chấm điểm.
                  </p>
                </div>
              )}

              {/* TRƯỜNG HỢP 3: CHƯA BẮT ĐẦU THI HOẶC CHỜ LƯỢT */}
              {!r2BatchRunning && !r2TimeUp && !hasScore && (
                <div className="bg-white text-slate-900 border border-blue-100 rounded-3xl p-6 text-center space-y-4 shadow-xl">
                  <div className="w-14 h-14 rounded-2xl bg-amber-50 border-2 border-amber-400 flex items-center justify-center mx-auto text-amber-600 shadow-sm">
                    <Zap className="w-7 h-7" />
                  </div>

                  <div>
                    <span className="text-[10px] font-black text-amber-600 uppercase tracking-widest block mb-1">
                      MÃ ĐỀ BỐC THĂM CỦA BẠN:
                    </span>
                    <div className="text-2xl font-black text-blue-700">
                      {player.round2DrawCode || 'CHƯA BỐC MÃ ĐỀ'}
                    </div>
                  </div>

                  <p className="text-xs text-slate-600 leading-relaxed max-w-xs mx-auto">
                    {player.round2DrawCode
                      ? 'Thí sinh đã bốc thăm mã đề thành công. Vui lòng chuẩn bị đăng nhập phần mềm Quản lý đoàn viên trên máy tính và chờ hiệu lệnh BẮT ĐẦU THI 10 PHÚT từ Ban Tổ chức!'
                      : 'Thí sinh vui lòng chú ý lắng nghe hiệu lệnh của MC trên sân khấu để tiến hành bốc thăm mã đề thi!'}
                  </p>
                </div>
              )}

              {/* TRƯỜNG HỢP 4: ĐÃ HOÀN THÀNH BÀI THI & CÓ ĐIỂM */}
              {hasScore && (
                <div className="bg-gradient-to-r from-emerald-500/10 via-teal-500/10 to-emerald-500/10 border-2 border-emerald-400 rounded-3xl p-5 text-center space-y-2 shadow-lg animate-fadeIn">
                  <div className="w-12 h-12 rounded-2xl bg-emerald-500/20 border border-emerald-400 flex items-center justify-center mx-auto text-emerald-400 shadow-sm">
                    <CheckCircle2 className="w-6 h-6" />
                  </div>
                  <h3 className="text-base font-black text-white uppercase">
                    ĐÃ HOÀN THÀNH PHẦN THI VÒNG 2
                  </h3>
                  <p className="text-xs text-emerald-200">
                    Điểm số phần thi thực hành của bạn đã được Ban Giám khảo chấm và ghi nhận thành công!
                  </p>
                </div>
              )}

              {/* BẢNG ĐIỂM CHI TIẾT (KHI ĐÃ ĐƯỢC CHẤM HOẶC CÓ KẾT QUẢ) */}
              <div className="bg-white text-slate-900 border border-blue-100 rounded-2xl p-5 text-left space-y-3 shadow-xl">
                <div className="flex items-center justify-between border-b border-slate-100 pb-2">
                  <span className="text-xs text-slate-500 font-bold">Mã đề bốc thăm:</span>
                  <span className="text-sm font-black text-blue-700">
                    {player.round2DrawCode || 'Chưa bốc thăm'}
                  </span>
                </div>
                <div className="flex items-center justify-between border-b border-slate-100 pb-2">
                  <span className="text-xs text-slate-500">Điểm tình huống 1:</span>
                  <span className="text-xs font-black text-slate-900">
                    {formatScore(player.round2Scenario1Score)} / 20đ
                  </span>
                </div>
                <div className="flex items-center justify-between border-b border-slate-100 pb-2">
                  <span className="text-xs text-slate-500">Điểm tình huống 2:</span>
                  <span className="text-xs font-black text-slate-900">
                    {formatScore(player.round2Scenario2Score)} / 20đ
                  </span>
                </div>
                <div className="flex items-center justify-between pt-1">
                  <span className="text-xs font-black text-slate-800">Tổng điểm Vòng 2:</span>
                  <span className="text-base font-black text-emerald-600">{formatScore(player.round2Score)}đ</span>
                </div>
                <div className="flex items-center justify-between pt-1 border-t border-slate-100">
                  <span className="text-xs font-black text-slate-800">Tổng điểm tích lũy:</span>
                  <span className="text-base font-black text-amber-600">{formatScore(player.totalScore)}đ</span>
                </div>
              </div>
            </div>
          );
        })()}

        {/* 3. ROUND 3 VIEW */}
        {session?.status === 'ROUND3' && (
          <div className="flex-1 flex flex-col items-center justify-center py-8 animate-fadeIn text-center w-full max-w-md mx-auto space-y-4">
            <div className="w-20 h-20 rounded-3xl bg-amber-400/20 border-2 border-amber-400 text-amber-300 flex items-center justify-center mx-auto shadow-xl">
              <Swords className="w-10 h-10 text-amber-400" />
            </div>
            <div>
              <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-amber-400/20 border border-amber-300/40 text-amber-300 text-xs font-black uppercase tracking-wider mb-2">
                TRANH TÀI ĐỐI KHÁNG TRỰC TIẾP
              </div>
              <h2 className="text-xl font-black text-white uppercase">VÒNG 3: BẢN LĨNH</h2>
              <p className="text-sm text-sky-200 font-semibold mt-2 max-w-xs mx-auto leading-relaxed">
                Đang diễn ra Vòng 3: Bản lĩnh
              </p>
            </div>

            <div className="bg-white text-slate-900 border border-blue-100 rounded-3xl p-5 w-full text-left space-y-3 shadow-2xl">
              <div className="flex items-center justify-between border-b border-slate-100 pb-2.5">
                <span className="text-xs text-slate-500 font-bold">Thí sinh:</span>
                <span className="text-sm font-black text-slate-900">
                  {player?.fullName || 'Thí sinh'} {player?.orderNumber ? `(SBD ${String(player.orderNumber).padStart(2, '0')})` : ''}
                </span>
              </div>
              <div className="flex items-center justify-between border-b border-slate-100 pb-2.5">
                <span className="text-xs text-slate-500 font-bold">Đơn vị:</span>
                <span className="text-xs font-bold text-slate-700">{player?.unit || '—'}</span>
              </div>
              <div className="flex items-center justify-between border-b border-slate-100 pb-2.5">
                <span className="text-xs text-slate-500 font-bold">Cặp thi đấu:</span>
                <span className="text-xs font-black px-2.5 py-1 rounded-lg bg-amber-500/10 text-amber-800 border border-amber-300">
                  {player?.round3PairGroup ? `CẶP 0${player.round3PairGroup}` : 'Chờ ghép cặp'}
                </span>
              </div>
              <div className="p-3 rounded-2xl bg-blue-50 border border-blue-200 text-center">
                <p className="text-xs text-blue-900 font-medium">
                  📢 Thí sinh chú ý theo dõi hiệu lệnh điều hành của Ban Tổ chức và Ban Giám khảo trên sân khấu chính.
                </p>
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
                Tổng điểm: {formatScore(player.totalScore)}đ
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
