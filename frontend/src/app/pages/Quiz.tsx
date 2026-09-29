import { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  ChevronLeft,
  Clock,
  ArrowRight,
  ArrowLeft,
  CheckCircle2,
  AlertCircle,
  LayoutGrid,
  X,
  Send,
  HelpCircle,
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { examApi } from '../../api/examApi';
import { useExamStore } from '../../store/examStore';
import QuizRegistrationGate from '../components/QuizRegistrationGate';
import { toast } from '../components/ui/Toast';
import type { MCQuestion, ScenarioQuestion, AnswerItem, ExamStartResponse } from '../../types';

type Phase = 'info' | 'loading' | 'mc' | 'scenario' | 'prediction' | 'submitting';

const ACTIVE_SESSION_STORAGE_KEY = 'quiz_live_exam_session';

interface StoredExamSession {
  examId: number;
  submitToken: string;
  clientStartedAtMs: number;
  timeLimitMinutes: number;
  multipleChoiceQuestions: MCQuestion[];
  scenarioQuestions: ScenarioQuestion[];
  contestantId: number;
  answers: Record<string, string>;
  currentIdx: number;
  currentPhase: Phase;
  lastElapsed: number;
}

function getInitialExamSession(): (StoredExamSession & { computedElapsed: number; limitSecs: number }) | null {
  try {
    const raw = localStorage.getItem(ACTIVE_SESSION_STORAGE_KEY);
    if (!raw) return null;
    const session: StoredExamSession = JSON.parse(raw);
    if (!session || !session.examId) return null;

    const limitSecs = session.timeLimitMinutes > 0 ? session.timeLimitMinutes * 60 : 20 * 60;
    
    let elapsedSecs = session.lastElapsed || 0;
    if (session.clientStartedAtMs && typeof session.clientStartedAtMs === 'number') {
      const calculated = Math.floor((Date.now() - session.clientStartedAtMs) / 1000);
      if (calculated > elapsedSecs) {
        elapsedSecs = calculated;
      }
    }

    if (elapsedSecs < limitSecs + 180) {
      return {
        ...session,
        computedElapsed: elapsedSecs,
        limitSecs,
      };
    } else {
      localStorage.removeItem(ACTIVE_SESSION_STORAGE_KEY);
      return null;
    }
  } catch {
    localStorage.removeItem(ACTIVE_SESSION_STORAGE_KEY);
    return null;
  }
}

export default function Quiz() {
  const navigate = useNavigate();
  const setContestantId = useExamStore((state) => state.setContestantId);
  const setExam = useExamStore((state) => state.setExam);
  const setResult = useExamStore((state) => state.setResult);

  const [initialSession] = useState(() => getInitialExamSession());

  const [phase, setPhase] = useState<Phase>(() => initialSession ? (initialSession.currentPhase || 'mc') : 'info');
  const [error, setError] = useState('');

  // Exam data
  const [examId, setExamId] = useState<number | null>(() => initialSession ? initialSession.examId : null);
  const [submitToken, setSubmitToken] = useState<string>(() => initialSession ? initialSession.submitToken : '');
  const [mcQuestions, setMcQuestions] = useState<MCQuestion[]>(() => initialSession ? (initialSession.multipleChoiceQuestions || []) : []);
  const [scenarioQuestions, setScenarioQuestions] = useState<ScenarioQuestion[]>(() => initialSession ? (initialSession.scenarioQuestions || []) : []);

  // Quiz state
  const [currentIdx, setCurrentIdx] = useState(() => initialSession ? (initialSession.currentIdx || 0) : 0);
  const [answers, setAnswers] = useState<Record<string, string>>(() => initialSession ? (initialSession.answers || {}) : {});
  const [elapsed, setElapsed] = useState(() => initialSession ? initialSession.computedElapsed : 0);
  const [timeLimitSecs, setTimeLimitSecs] = useState(() => initialSession ? initialSession.limitSecs : 0);
  const [autoSubmitTriggered, setAutoSubmitTriggered] = useState(false);
  const [activeCount, setActiveCount] = useState(0);
  const [prediction, setPrediction] = useState('');

  // Modals
  const [showExitConfirm, setShowExitConfirm] = useState(false);
  const [showSectionConfirm, setShowSectionConfirm] = useState(false);
  const [showSubmitWarning, setShowSubmitWarning] = useState(false);
  const [showFinalSubmitModal, setShowFinalSubmitModal] = useState(false);
  const [isMobileGridOpen, setIsMobileGridOpen] = useState(false);

  // Helper to persist partial session state to localStorage
  const syncSessionStorage = useCallback((patch: Record<string, any>) => {
    try {
      const raw = localStorage.getItem(ACTIVE_SESSION_STORAGE_KEY);
      if (raw) {
        const parsed = JSON.parse(raw);
        localStorage.setItem(ACTIVE_SESSION_STORAGE_KEY, JSON.stringify({ ...parsed, ...patch }));
      }
    } catch {}
  }, []);

  // On mount: sync restored contestantId to store and inform user
  useEffect(() => {
    if (initialSession?.contestantId) {
      setContestantId(initialSession.contestantId);
      toast.info('Hệ thống đã tự động khôi phục bài thi đang làm dở của bạn!');
    }
  }, [initialSession, setContestantId]);

  // Prevent accidental F5 / reload / tab close during active exam
  useEffect(() => {
    if (phase !== 'mc' && phase !== 'scenario' && phase !== 'prediction') return;

    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      e.preventDefault();
      e.returnValue = 'Bạn đang trong quá trình làm bài thi trực tuyến. Bạn có chắc chắn muốn rời khỏi hoặc tải lại trang?';
      return e.returnValue;
    };

    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, [phase]);

  // Timer — only runs during active quiz phases
  useEffect(() => {
    if (phase !== 'mc' && phase !== 'scenario' && phase !== 'prediction') return;
    const t = setInterval(() => {
      setElapsed((s) => {
        const next = s + 1;
        if (next % 5 === 0) {
          syncSessionStorage({ lastElapsed: next });
        }
        return next;
      });
    }, 1000);
    return () => clearInterval(t);
  }, [phase, syncSessionStorage]);

  // Derived: remaining seconds
  const remaining = timeLimitSecs > 0 ? Math.max(0, timeLimitSecs - elapsed) : undefined;

  // Poll active contestant count
  useEffect(() => {
    if (phase !== 'mc' && phase !== 'scenario') return;
    const fetchCount = () => {
      examApi
        .getActiveCount()
        .then((res) => setActiveCount(res.data.count))
        .catch(() => {});
    };
    fetchCount();
    const t = setInterval(fetchCount, 15000);
    return () => clearInterval(t);
  }, [phase]);

  // Submit logic memoized to prevent stale closures
  const handleSubmit = useCallback(async () => {
    if (!examId) return;
    setPhase('submitting');
    try {
      const answerItems: AnswerItem[] = [];
      for (const mcQ of mcQuestions) {
        answerItems.push({
          questionId: mcQ.questionId,
          questionType: 'MC',
          selectedAnswer: (answers[`MC-${mcQ.questionId}`] as AnswerItem['selectedAnswer']) ?? null,
        });
      }
      for (const scQ of scenarioQuestions) {
        answerItems.push({
          questionId: scQ.questionId,
          questionType: 'SC',
          selectedAnswer: (answers[`SC-${scQ.questionId}`] as AnswerItem['selectedAnswer']) ?? null,
        });
      }

      const res = await examApi.submitExam(examId, {
        submitToken,
        answers: answerItems,
        prediction: prediction ? parseInt(prediction, 10) : undefined,
      });

      try {
        localStorage.removeItem(ACTIVE_SESSION_STORAGE_KEY);
      } catch {}

      setResult(res.data.data);
      navigate('/ket-qua', { replace: true });
    } catch (err: any) {
      toast.error(err.response?.data?.message ?? 'Nộp bài thất bại. Vui lòng thử lại.');
      setPhase('mc');
    }
  }, [examId, submitToken, mcQuestions, scenarioQuestions, answers, prediction, setResult, navigate]);

  // Auto-submit when timer reaches 0
  useEffect(() => {
    if (remaining !== 0 || autoSubmitTriggered) return;
    if (phase !== 'mc' && phase !== 'scenario' && phase !== 'prediction') return;
    setAutoSubmitTriggered(true);

    if (scenarioQuestions.length === 0 || phase === 'prediction') {
      handleSubmit();
    } else {
      setPhase('prediction');
      setTimeout(() => handleSubmit(), 100);
    }
  }, [remaining, autoSubmitTriggered, phase, scenarioQuestions.length, handleSubmit]);

  const mins = String(Math.floor(elapsed / 60)).padStart(2, '0');
  const secs = String(elapsed % 60).padStart(2, '0');

  // Timer display formatting
  const timerMins = remaining !== undefined ? String(Math.floor(remaining / 60)).padStart(2, '0') : mins;
  const timerSecs = remaining !== undefined ? String(remaining % 60).padStart(2, '0') : secs;
  const timerUrgent = remaining !== undefined && remaining <= 300; // < 5 min
  const timerCritical = remaining !== undefined && remaining <= 60; // < 1 min

  const currentQuestions: (MCQuestion | ScenarioQuestion)[] = phase === 'mc' ? mcQuestions : scenarioQuestions;
  const totalCurrentSection = currentQuestions.length;
  const q = currentQuestions[currentIdx];
  const totalAll = mcQuestions.length + scenarioQuestions.length;
  const globalIdx = phase === 'mc' ? currentIdx : mcQuestions.length + currentIdx;
  const progress = totalAll > 0 ? ((globalIdx + 1) / totalAll) * 100 : 0;

  const answerKey = q ? `${phase === 'mc' ? 'MC' : 'SC'}-${q.questionId}` : '';
  const selected = answers[answerKey];

  function selectAnswer(key: string) {
    if (!q) return;
    setAnswers((prev) => {
      const next = { ...prev, [answerKey]: key };
      syncSessionStorage({ answers: next, currentIdx, currentPhase: phase });
      return next;
    });
    if (examId) {
      examApi.saveDraftAnswer(examId, {
        questionId: q.questionId,
        questionType: phase === 'mc' ? 'MC' : 'SC',
        selectedAnswer: key,
      }).catch(() => {});
    }
  }

  // Detect if Admin has ended the phase while candidate is taking the exam
  useEffect(() => {
    if (phase !== 'mc' && phase !== 'scenario' && phase !== 'prediction') return;
    const interval = setInterval(async () => {
      try {
        const res = await examApi.getCurrentPhase();
        if (!res.data.data || res.data.data.status === 'ENDED') {
          clearInterval(interval);
          toast.warning('Ban tổ chức đã kết thúc đợt thi! Hệ thống đang chuyển đến kết quả...');
          handleSubmit();
        }
      } catch {}
    }, 4000);
    return () => clearInterval(interval);
  }, [phase, handleSubmit]);

  const handleNext = () => {
    if (currentIdx < totalCurrentSection - 1) {
      const next = currentIdx + 1;
      setCurrentIdx(next);
      syncSessionStorage({ currentIdx: next });
    }
  };
  const handlePrev = () => {
    if (currentIdx > 0) {
      const prev = currentIdx - 1;
      setCurrentIdx(prev);
      syncSessionStorage({ currentIdx: prev });
    }
  };

  const handleToScenario = () => {
    setShowSectionConfirm(true);
  };
  const confirmToScenario = () => {
    setShowSectionConfirm(false);
    setCurrentIdx(0);
    setPhase('scenario');
    syncSessionStorage({ currentIdx: 0, currentPhase: 'scenario' });
  };

  const handleToPrediction = () => {
    const unanswered = scenarioQuestions.filter((sq) => !answers[`SC-${sq.questionId}`]).length;
    if (unanswered > 0) {
      setShowSubmitWarning(true);
    } else {
      setPhase('prediction');
      syncSessionStorage({ currentPhase: 'prediction' });
    }
  };

  function isQuestionAnswered(idx: number, section: 'mc' | 'scenario') {
    const qs = section === 'mc' ? mcQuestions : scenarioQuestions;
    const prefix = section === 'mc' ? 'MC' : 'SC';
    const qItem = qs[idx];
    if (!qItem) return false;
    return !!answers[`${prefix}-${qItem.questionId}`];
  }

  const answeredCount = currentQuestions.filter((_, i) =>
    isQuestionAnswered(i, phase as 'mc' | 'scenario')
  ).length;

  const handleExamStarted = useCallback(
    ({ contestantId, exam }: { contestantId: number; exam: ExamStartResponse }) => {
      setError('');
      setExamId(exam.examId);
      setSubmitToken(exam.submitToken);
      setMcQuestions(exam.multipleChoiceQuestions);
      setScenarioQuestions(exam.scenarioQuestions);
      setCurrentIdx(0);

      const limitSecs = exam.timeLimitMinutes > 0 ? exam.timeLimitMinutes * 60 : 20 * 60;
      setTimeLimitSecs(limitSecs);

      let initialElapsed = 0;
      let initialAnswers: Record<string, string> = {};
      if (exam.isResumed && exam.startTime) {
        const startMs = new Date(exam.startTime).getTime();
        initialElapsed = Math.max(0, Math.floor((Date.now() - startMs) / 1000));
        initialAnswers = exam.draftAnswers || {};
        toast.info('Hệ thống đã tự động kết nối lại phiên thi đang làm dở của bạn!');
      }

      setElapsed(initialElapsed);
      setAnswers(initialAnswers);
      setAutoSubmitTriggered(false);
      setPrediction('');
      setShowSectionConfirm(false);
      setShowSubmitWarning(false);
      setIsMobileGridOpen(false);
      setContestantId(contestantId);
      setExam(exam);
      setPhase('mc');

      const clientStartedAtMs = Date.now() - initialElapsed * 1000;

      try {
        localStorage.setItem(
          ACTIVE_SESSION_STORAGE_KEY,
          JSON.stringify({
            examId: exam.examId,
            submitToken: exam.submitToken,
            clientStartedAtMs,
            timeLimitMinutes: exam.timeLimitMinutes,
            multipleChoiceQuestions: exam.multipleChoiceQuestions,
            scenarioQuestions: exam.scenarioQuestions,
            contestantId,
            answers: initialAnswers,
            currentIdx: 0,
            currentPhase: 'mc',
            lastElapsed: initialElapsed,
          })
        );
      } catch {}
    },
    [setContestantId, setExam]
  );

  // Phase 1: Thí sinh đăng ký & chọn danh sách triệu tập
  if (phase === 'info') {
    return <QuizRegistrationGate onExamStarted={handleExamStarted} />;
  }

  // Phase 2: Đang tải hoặc đang nộp bài
  if (phase === 'loading' || phase === 'submitting') {
    return (
      <div className="flex min-h-[calc(100vh-48px)] items-center justify-center bg-slate-50 font-sans p-4">
        <div className="bg-white rounded-3xl p-8 max-w-sm w-full text-center shadow-xl border border-blue-100">
          <div className="relative w-16 h-16 mx-auto mb-5">
            <div className="w-16 h-16 border-4 border-blue-200 border-t-[#1746b8] rounded-full animate-spin" />
            <img
              src="/logo-doan.png"
              alt="Logo Đoàn"
              className="w-8 h-8 absolute inset-0 m-auto object-contain"
            />
          </div>
          <h3 className="text-lg font-bold text-slate-900 mb-1">
            {phase === 'loading' ? 'Đang khởi tạo đề thi...' : 'Đang ghi nhận kết quả...'}
          </h3>
          <p className="text-xs text-slate-500">
            Hội thi Bí thư Đoàn cơ sở giỏi tỉnh Nghệ An năm 2026
          </p>
        </div>
      </div>
    );
  }

  // Phase dự đoán (nếu có yêu cầu từ cấu hình đề thi cũ)
  if (phase === 'prediction') {
    return (
      <div className="flex flex-col min-h-[calc(100vh-48px)] bg-slate-50 font-sans">
        <header className="sticky top-12 z-50 bg-[#1746b8] text-white shadow-md px-4 py-3">
          <div className="max-w-4xl mx-auto flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <img src="/logo-doan.png" alt="Logo Đoàn" className="w-8 h-8 object-contain shrink-0 drop-shadow-xs" />
              <p className="text-sm font-bold">Câu hỏi dự đoán phụ</p>
            </div>
            <div className="flex items-center gap-2 px-3 py-1 bg-yellow-400 text-blue-950 font-black rounded-lg text-sm">
              <Clock className="w-4 h-4" />
              {timerMins}:{timerSecs}
            </div>
          </div>
        </header>

        <div className="flex-1 flex items-center justify-center p-4">
          <div className="w-full max-w-md bg-white rounded-3xl p-6 sm:p-8 shadow-xl border border-slate-200 text-center">
            <img src="/logo-doan.png" alt="Logo Đoàn" className="w-16 h-16 mx-auto mb-4 object-contain drop-shadow-sm" />
            <h2 className="text-xl font-black text-slate-900 mb-2">Dự đoán kết quả</h2>
            <p className="text-sm text-slate-600 mb-6">
              Bạn dự đoán có bao nhiêu thí sinh đạt điểm tối đa (30/30 điểm) trong vòng thi này?
            </p>

            {error && (
              <div className="mb-4 p-3 rounded-xl bg-red-50 text-red-700 text-xs font-semibold flex items-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{error}</span>
              </div>
            )}

            <div className="mb-6">
              <input
                type="number"
                min="0"
                className="w-full rounded-2xl border-2 border-slate-200 bg-slate-50 px-4 py-4 text-3xl text-center font-black text-[#1746b8] focus:bg-white focus:border-[#1746b8] outline-none transition-all"
                placeholder="0"
                value={prediction}
                onChange={(e) => setPrediction(e.target.value)}
              />
            </div>

            <button
              onClick={handleSubmit}
              className="w-full py-4 rounded-xl bg-[#1746b8] hover:bg-[#12389e] text-white font-bold text-base shadow-lg shadow-blue-900/20 transition-all flex items-center justify-center gap-2"
            >
              <CheckCircle2 className="w-5 h-5" />
              Hoàn thành & Nộp bài
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (!q) return null;

  const sectionLabel =
    scenarioQuestions.length === 0
      ? 'VÒNG LOẠI: PHẦN THI KIẾN THỨC'
      : phase === 'mc'
      ? 'PHẦN 1: TRẮC NGHIỆM'
      : 'PHẦN 2: TÌNH HUỐNG';
  const isLastInSection = currentIdx === totalCurrentSection - 1;

  const answerOptions = (
    [
      { key: 'A', text: q.optionA },
      { key: 'B', text: q.optionB },
      { key: 'C', text: q.optionC },
      { key: 'D', text: q.optionD },
      { key: 'E', text: q.optionE },
    ] as { key: string; text?: string | null }[]
  ).filter((o) => o.text);

  const questionText = 'content' in q ? (q as MCQuestion).content : (q as ScenarioQuestion).title;

  return (
    <div className="flex flex-col h-[calc(100vh-48px)] bg-slate-50 font-sans overflow-hidden select-none">
      {/* HEADER: Tone màu xanh truyền thống của Đoàn + Logo Đoàn */}
      <header className="shrink-0 bg-gradient-to-r from-[#10348c] via-[#1746b8] to-[#1e52d8] text-white shadow-md z-40">
        <div className="px-3 sm:px-6 py-2.5 sm:py-3 flex items-center justify-between gap-2">
          {/* Cụm Logo & Tiêu đề cuộc thi */}
          <div className="flex items-center gap-2 sm:gap-3 min-w-0">
            <button
              type="button"
              onClick={() => setShowExitConfirm(true)}
              className="w-8 h-8 sm:w-9 sm:h-9 rounded-lg flex items-center justify-center bg-white/10 hover:bg-white/20 transition-colors text-white shrink-0"
              title="Rời phòng thi"
            >
              <ChevronLeft className="w-5 h-5" />
            </button>

            <img
              src="/logo-doan.png"
              alt="Huy hiệu Đoàn"
              className="w-8 h-8 sm:w-9 sm:h-9 object-contain shrink-0 drop-shadow-xs select-none"
            />

            <div className="leading-tight min-w-0">
              <div className="flex items-center gap-1.5">
                <span className="text-[10px] sm:text-xs font-bold text-yellow-300 uppercase tracking-wide truncate">
                  Tỉnh đoàn Nghệ An
                </span>
                <span className="hidden md:inline-block text-[10px] px-2 py-0.5 rounded-full bg-yellow-400 text-blue-950 font-black">
                  Cấp tỉnh 2026
                </span>
              </div>
              <h1 className="text-xs sm:text-sm font-extrabold text-white truncate">
                Bí thư Đoàn cơ sở giỏi
              </h1>
            </div>
          </div>

          {/* Cụm Đồng hồ đếm ngược & Chỉ số thí sinh */}
          <div className="flex items-center gap-2 sm:gap-3 shrink-0">
            <div className="hidden md:flex items-center gap-1.5 px-3 py-1 rounded-full bg-white/10 text-yellow-300 text-xs font-semibold backdrop-blur-sm border border-white/10">
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-yellow-400 opacity-75" />
                <span className="relative inline-flex rounded-full h-2 w-2 bg-yellow-500" />
              </span>
              <span>{activeCount} đang thi</span>
            </div>

            {/* Đồng hồ đếm ngược (Mobile First, to rõ) */}
            <div
              className={`flex items-center gap-1.5 px-3 sm:px-3.5 py-1.5 rounded-xl font-mono font-black text-sm sm:text-base tracking-wider shadow-sm transition-all ${
                timerCritical
                  ? 'bg-red-500 text-white animate-bounce'
                  : timerUrgent
                  ? 'bg-amber-400 text-amber-950 animate-pulse'
                  : 'bg-yellow-400 text-blue-950'
              }`}
            >
              <Clock className="w-4 h-4 shrink-0" />
              <span>
                {timerMins}:{timerSecs}
              </span>
            </div>
          </div>
        </div>

        {/* Thanh tiến độ bài thi (Progress Bar) */}
        <div className="h-1 bg-blue-950/40 w-full overflow-hidden">
          <div
            className="h-full bg-gradient-to-r from-yellow-400 via-amber-300 to-yellow-200 transition-all duration-300 ease-out"
            style={{ width: `${progress}%` }}
          />
        </div>
      </header>

      {/* BODY CHÍNH */}
      <div className="flex flex-1 overflow-hidden relative">
        {/* DESKTOP SIDEBAR: Danh sách câu hỏi (chỉ hiện trên màn hình lớn) */}
        <aside className="hidden lg:flex flex-col w-80 shrink-0 bg-white border-r border-slate-200 overflow-y-auto">
          <div className="px-5 py-4 border-b border-slate-100 bg-blue-50/50">
            <p className="text-[11px] font-black tracking-wider uppercase text-[#1746b8] mb-1">
              {sectionLabel}
            </p>
            <div className="flex items-center justify-between mb-2">
              <p className="text-sm font-bold text-slate-800">Tiến độ làm bài</p>
              <span className="text-sm font-black text-[#1746b8]">
                {answeredCount}
                <span className="text-slate-400 font-normal text-xs">/{totalCurrentSection} câu</span>
              </span>
            </div>
            <div className="h-2 bg-slate-200 rounded-full overflow-hidden">
              <div
                className="h-full bg-[#1746b8] rounded-full transition-all duration-300"
                style={{
                  width: `${totalCurrentSection > 0 ? (answeredCount / totalCurrentSection) * 100 : 0}%`,
                }}
              />
            </div>
          </div>

          {/* Ma trận 30 câu hỏi */}
          <div className="p-4 flex-1 overflow-y-auto">
            <div className="grid grid-cols-5 gap-2">
              {currentQuestions.map((qItem, idx) => {
                const prefix = phase === 'mc' ? 'MC' : 'SC';
                const isAnswered = !!answers[`${prefix}-${qItem.questionId}`];
                const isCurrent = idx === currentIdx;
                return (
                  <button
                    key={qItem.questionId}
                    type="button"
                    onClick={() => setCurrentIdx(idx)}
                    className={`aspect-square rounded-xl text-sm font-black transition-all border-2 flex items-center justify-center ${
                      isCurrent
                        ? 'bg-[#1746b8] text-white border-[#1746b8] shadow-md scale-105 ring-2 ring-blue-300'
                        : isAnswered
                        ? 'bg-blue-50 text-[#1746b8] border-blue-300 hover:bg-blue-100 font-bold'
                        : 'bg-white text-slate-400 border-slate-200 hover:border-blue-300 hover:text-blue-600'
                    }`}
                  >
                    {(phase === 'mc' ? idx : mcQuestions.length + idx) + 1}
                  </button>
                );
              })}
            </div>

            {/* Chú thích màu sắc */}
            <div className="flex items-center justify-between mt-5 pt-3.5 border-t border-slate-100 text-xs text-slate-600">
              <span className="flex items-center gap-1.5">
                <span className="w-3 h-3 rounded bg-blue-50 border border-blue-400" />
                Đã trả lời
              </span>
              <span className="flex items-center gap-1.5">
                <span className="w-3 h-3 rounded bg-white border border-slate-300" />
                Chưa làm
              </span>
              <span className="flex items-center gap-1.5">
                <span className="w-3 h-3 rounded bg-[#1746b8]" />
                Đang xem
              </span>
            </div>
          </div>

          {/* Nút nộp bài Desktop */}
          <div className="p-4 border-t border-slate-100 bg-slate-50 shrink-0">
            {scenarioQuestions.length === 0 ? (
              <button
                type="button"
                onClick={() => setShowFinalSubmitModal(true)}
                className="w-full py-3.5 rounded-xl text-sm font-bold text-white bg-[#1746b8] hover:bg-[#12389e] transition-colors flex items-center justify-center gap-2 shadow-md shadow-blue-900/20"
              >
                <CheckCircle2 className="w-4 h-4" />
                Nộp bài thi chính thức
              </button>
            ) : phase === 'mc' ? (
              <button
                type="button"
                onClick={handleToScenario}
                className="w-full py-3.5 rounded-xl text-sm font-bold text-white bg-[#1746b8] hover:bg-[#12389e] transition-colors flex items-center justify-center gap-2 shadow-md"
              >
                Sang phần Tình huống →
              </button>
            ) : (
              <button
                type="button"
                onClick={handleToPrediction}
                className="w-full py-3.5 rounded-xl text-sm font-bold text-white bg-amber-600 hover:bg-amber-700 transition-colors flex items-center justify-center gap-2 shadow-md"
              >
                <CheckCircle2 className="w-4 h-4" />
                Nộp bài thi
              </button>
            )}
          </div>
        </aside>

        {/* KHU VỰC CÂU HỎI VÀ TRẢ LỜI (TỐI ƯU MOBILE FIRST) */}
        <main className="flex-1 flex flex-col overflow-hidden bg-slate-50">
          {/* Thanh phụ hiển thị trên Mobile: Câu số mấy & Nút mở ma trận 30 câu */}
          <div className="lg:hidden shrink-0 bg-white border-b border-slate-200 px-4 py-2 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="px-2.5 py-1 rounded-lg bg-blue-50 text-[#1746b8] text-xs font-black border border-blue-200">
                Câu {globalIdx + 1} / {totalAll}
              </span>
              <span className="text-xs text-slate-500 font-medium">
                {answeredCount}/{totalAll} đã làm
              </span>
            </div>
            <button
              type="button"
              onClick={() => setIsMobileGridOpen(true)}
              className="flex items-center gap-1.5 px-3 py-1 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold transition-colors"
            >
              <LayoutGrid className="w-3.5 h-3.5 text-[#1746b8]" />
              <span>30 câu hỏi</span>
            </button>
          </div>

          {/* Vùng cuộn nội dung câu hỏi */}
          <div className="flex-1 overflow-y-auto p-3.5 sm:p-6 lg:p-8 pb-24 lg:pb-8">
            <div className="max-w-3xl mx-auto space-y-4">
              {/* Thẻ câu hỏi chính */}
              <AnimatePresence mode="wait">
                <motion.div
                  key={q.questionId}
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -8 }}
                  transition={{ duration: 0.18 }}
                  className="bg-white rounded-2xl sm:rounded-3xl border border-slate-200/80 shadow-sm overflow-hidden"
                >
                  {/* Tiêu đề & Nội dung câu hỏi */}
                  <div className="p-4 sm:p-6 lg:p-7 border-b border-slate-100 bg-gradient-to-b from-blue-50/30 to-white">
                    <div className="flex items-start gap-3">
                      <span className="shrink-0 px-2.5 py-1 rounded-lg bg-[#1746b8] text-white text-xs sm:text-sm font-black mt-0.5 shadow-sm">
                        Câu {globalIdx + 1}
                      </span>
                      <h2 className="text-base sm:text-lg lg:text-xl font-bold text-slate-900 leading-snug">
                        {questionText}
                      </h2>
                    </div>

                    {phase === 'scenario' &&
                      'description' in q &&
                      (q as ScenarioQuestion).description && (
                        <p className="text-sm text-slate-600 mt-3 leading-relaxed bg-slate-50 p-3.5 rounded-xl border border-slate-200">
                          {(q as ScenarioQuestion).description}
                        </p>
                      )}
                  </div>

                  {/* Danh sách các lựa chọn A, B, C, D (Tap target lớn cho ngón cái) */}
                  <div className="p-3.5 sm:p-6 space-y-2.5 sm:space-y-3">
                    {answerOptions.map((ans) => {
                      const isSelected = selected === ans.key;
                      return (
                        <button
                          key={ans.key}
                          type="button"
                          onClick={() => selectAnswer(ans.key)}
                          className={`w-full text-left p-3.5 sm:p-4 rounded-xl sm:rounded-2xl border-2 transition-all flex items-center gap-3.5 cursor-pointer active:scale-[0.99] ${
                            isSelected
                              ? 'border-[#1746b8] bg-blue-50/80 text-blue-950 shadow-sm ring-1 ring-blue-500/30'
                              : 'border-slate-200 bg-white text-slate-700 hover:border-blue-300 hover:bg-slate-50/50'
                          }`}
                        >
                          {/* Chữ cái A, B, C, D */}
                          <div
                            className={`w-9 h-9 sm:w-11 sm:h-11 rounded-lg sm:rounded-xl shrink-0 flex items-center justify-center font-black text-sm sm:text-base transition-colors ${
                              isSelected
                                ? 'bg-[#1746b8] text-white shadow-sm'
                                : 'bg-slate-100 text-slate-600 border border-slate-200'
                            }`}
                          >
                            {ans.key}
                          </div>

                          {/* Nội dung câu trả lời */}
                          <span
                            className={`flex-1 text-sm sm:text-base leading-snug ${
                              isSelected ? 'font-bold text-[#10348c]' : 'font-medium text-slate-800'
                            }`}
                          >
                            {ans.text}
                          </span>

                          {/* Icon tích xanh khi được chọn */}
                          {isSelected && (
                            <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }}>
                              <CheckCircle2 className="w-5 h-5 sm:w-6 sm:h-6 text-[#1746b8] shrink-0" />
                            </motion.div>
                          )}
                        </button>
                      );
                    })}
                  </div>
                </motion.div>
              </AnimatePresence>
            </div>
          </div>

          {/* THANH ĐIỀU HƯỚNG DƯỚI ĐÁY (STICKY BOTTOM BAR - MOBILE FIRST) */}
          <div className="fixed lg:static bottom-0 left-0 right-0 bg-white border-t border-slate-200 px-4 py-2.5 sm:py-3 z-30 shadow-[0_-4px_12px_rgba(0,0,0,0.05)] lg:shadow-none flex items-center justify-between gap-2.5">
            {/* Nút Câu trước */}
            <button
              type="button"
              onClick={handlePrev}
              disabled={currentIdx === 0}
              className="flex items-center gap-1.5 px-4 sm:px-5 py-2.5 sm:py-2.5 rounded-xl font-bold text-slate-700 bg-slate-100 hover:bg-slate-200 disabled:opacity-40 disabled:cursor-not-allowed transition-colors text-xs sm:text-sm active:scale-95"
            >
              <ArrowLeft className="w-4 h-4" />
              <span>Câu trước</span>
            </button>

            {/* Nút Danh sách câu (Chỉ hiện trên Mobile để mở Drawer nhanh) */}
            <button
              type="button"
              onClick={() => setIsMobileGridOpen(true)}
              className="lg:hidden flex items-center gap-1.5 px-3.5 py-2.5 rounded-xl font-bold text-[#1746b8] bg-blue-50 border border-blue-200 text-xs"
            >
              <LayoutGrid className="w-4 h-4" />
              <span>{answeredCount}/{totalAll}</span>
            </button>

            {/* Nút Câu tiếp theo HOẶC Nộp bài */}
            {!isLastInSection ? (
              <button
                type="button"
                onClick={handleNext}
                className="flex items-center gap-1.5 px-4 sm:px-6 py-2.5 sm:py-2.5 rounded-xl font-bold text-white bg-[#1746b8] hover:bg-[#12389e] shadow-md shadow-blue-900/20 transition-all text-xs sm:text-sm active:scale-95"
              >
                <span>Câu tiếp theo</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            ) : scenarioQuestions.length === 0 ? (
              <button
                type="button"
                onClick={() => setShowFinalSubmitModal(true)}
                className="flex items-center gap-1.5 px-4 sm:px-6 py-2.5 sm:py-2.5 rounded-xl font-bold text-white bg-emerald-600 hover:bg-emerald-700 shadow-md shadow-emerald-900/20 transition-all text-xs sm:text-sm active:scale-95"
              >
                <CheckCircle2 className="w-4 h-4" />
                <span>Nộp bài thi</span>
              </button>
            ) : phase === 'mc' ? (
              <button
                type="button"
                onClick={handleToScenario}
                className="flex items-center gap-1.5 px-4 sm:px-6 py-2.5 sm:py-2.5 rounded-xl font-bold text-white bg-[#1746b8] hover:bg-[#12389e] shadow-md transition-all text-xs sm:text-sm"
              >
                <span>Sang Tình huống</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            ) : (
              <button
                type="button"
                onClick={handleToPrediction}
                className="flex items-center gap-1.5 px-4 sm:px-6 py-2.5 sm:py-2.5 rounded-xl font-bold text-white bg-amber-600 hover:bg-amber-700 shadow-md transition-all text-xs sm:text-sm"
              >
                <CheckCircle2 className="w-4 h-4" />
                <span>Nộp bài</span>
              </button>
            )}
          </div>
        </main>
      </div>

      {/* MOBILE DRAWER: Ma trận 30 câu hỏi dạng Bottom Sheet mượt mà */}
      <AnimatePresence>
        {isMobileGridOpen && (
          <div className="fixed inset-0 z-50 lg:hidden flex flex-col justify-end bg-black/50 backdrop-blur-xs">
            <motion.div
              initial={{ y: '100%' }}
              animate={{ y: 0 }}
              exit={{ y: '100%' }}
              transition={{ type: 'spring', damping: 25, stiffness: 300 }}
              className="bg-white rounded-t-3xl max-h-[80vh] flex flex-col overflow-hidden shadow-2xl"
            >
              {/* Header drawer */}
              <div className="px-5 py-3.5 border-b border-slate-100 flex items-center justify-between bg-slate-50">
                <div>
                  <h3 className="text-sm font-black text-slate-900">Danh sách câu hỏi</h3>
                  <p className="text-xs text-slate-500 font-medium">
                    Đã hoàn thành <strong className="text-[#1746b8]">{answeredCount}</strong> / {totalCurrentSection} câu
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setIsMobileGridOpen(false)}
                  className="w-8 h-8 rounded-full bg-slate-200/70 hover:bg-slate-300 flex items-center justify-center text-slate-700 transition-colors"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              {/* Grid 30 nút số */}
              <div className="p-4 overflow-y-auto">
                <div className="grid grid-cols-5 gap-2.5">
                  {currentQuestions.map((qItem, idx) => {
                    const prefix = phase === 'mc' ? 'MC' : 'SC';
                    const isAnswered = !!answers[`${prefix}-${qItem.questionId}`];
                    const isCurrent = idx === currentIdx;
                    return (
                      <button
                        key={qItem.questionId}
                        type="button"
                        onClick={() => {
                          setCurrentIdx(idx);
                          setIsMobileGridOpen(false);
                        }}
                        className={`h-11 rounded-xl text-sm font-black transition-all border-2 flex items-center justify-center ${
                          isCurrent
                            ? 'bg-[#1746b8] text-white border-[#1746b8] shadow-sm'
                            : isAnswered
                            ? 'bg-blue-50 text-[#1746b8] border-blue-300'
                            : 'bg-white text-slate-400 border-slate-200'
                        }`}
                      >
                        {idx + 1}
                      </button>
                    );
                  })}
                </div>

                {/* Chú thích màu */}
                <div className="flex items-center justify-around mt-4 pt-3 border-t border-slate-100 text-xs text-slate-600">
                  <span className="flex items-center gap-1.5">
                    <span className="w-3 h-3 rounded bg-blue-50 border border-blue-400" />
                    Đã chọn
                  </span>
                  <span className="flex items-center gap-1.5">
                    <span className="w-3 h-3 rounded bg-white border border-slate-300" />
                    Chưa làm
                  </span>
                  <span className="flex items-center gap-1.5">
                    <span className="w-3 h-3 rounded bg-[#1746b8]" />
                    Đang xem
                  </span>
                </div>
              </div>

              {/* Nút nộp bài trực tiếp từ drawer */}
              <div className="p-4 border-t border-slate-100 bg-slate-50">
                <button
                  type="button"
                  onClick={() => {
                    setIsMobileGridOpen(false);
                    setShowFinalSubmitModal(true);
                  }}
                  className="w-full py-3 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-sm flex items-center justify-center gap-2 shadow-md shadow-emerald-900/20"
                >
                  <Send className="w-4 h-4" />
                  Nộp bài thi ngay ({answeredCount}/{totalCurrentSection})
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* MODAL: Xác nhận thoát phòng thi */}
      {showExitConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-xs p-4">
          <div className="bg-white rounded-2xl sm:rounded-3xl shadow-2xl w-full max-w-sm p-6 text-center">
            <div className="w-12 h-12 rounded-2xl bg-amber-50 border border-amber-200 flex items-center justify-center mx-auto mb-3 text-amber-600">
              <AlertCircle className="w-6 h-6" />
            </div>
            <h3 className="text-base sm:text-lg font-bold text-slate-900 mb-2">
              Rời phòng thi và nộp bài?
            </h3>
            <p className="text-xs sm:text-sm text-slate-600 mb-5 leading-relaxed">
              Bài thi sẽ được nộp ngay với các đáp án đã chọn. Sau khi rời phòng, bạn không thể tiếp tục bài thi này.
            </p>
            <div className="flex gap-2.5">
              <button
                type="button"
                onClick={() => setShowExitConfirm(false)}
                className="flex-1 py-2.5 rounded-xl border border-slate-200 text-slate-700 font-bold text-xs sm:text-sm hover:bg-slate-50"
              >
                Ở lại làm bài
              </button>
              <button
                type="button"
                onClick={() => {
                  setShowExitConfirm(false);
                  handleSubmit();
                }}
                className="flex-1 py-2.5 rounded-xl bg-red-600 text-white font-bold text-xs sm:text-sm hover:bg-red-700"
              >
                Rời phòng thi
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL: Xác nhận chuyển qua phần tình huống (nếu có) */}
      {showSectionConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-xs p-4">
          <div className="bg-white rounded-2xl sm:rounded-3xl shadow-2xl w-full max-w-sm p-6 text-center">
            <div className="w-12 h-12 rounded-2xl bg-amber-50 border border-amber-200 flex items-center justify-center mx-auto mb-3 text-amber-600">
              <AlertCircle className="w-6 h-6" />
            </div>
            <h3 className="text-base sm:text-lg font-bold text-slate-900 mb-2">
              Chuyển sang phần tiếp theo?
            </h3>
            <p className="text-xs sm:text-sm text-slate-600 mb-5 leading-relaxed">
              Khi chuyển sang phần tiếp theo, bạn sẽ không thể quay lại chỉnh sửa các câu hỏi trước.
            </p>
            <div className="flex gap-2.5">
              <button
                type="button"
                onClick={() => setShowSectionConfirm(false)}
                className="flex-1 py-2.5 rounded-xl border border-slate-200 text-slate-700 font-bold text-xs sm:text-sm hover:bg-slate-50"
              >
                Ở lại kiểm tra
              </button>
              <button
                type="button"
                onClick={confirmToScenario}
                className="flex-1 py-2.5 rounded-xl bg-[#1746b8] text-white font-bold text-xs sm:text-sm hover:bg-[#12389e]"
              >
                Xác nhận chuyển
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL: Xác nhận nộp bài thi chính thức */}
      {showFinalSubmitModal && (() => {
        const unansweredCount = currentQuestions.length - answeredCount;
        return (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-xs p-4">
            <div className="bg-white rounded-2xl sm:rounded-3xl shadow-2xl w-full max-w-sm p-6 text-center">
              <div className="w-12 h-12 rounded-2xl bg-blue-50 border border-blue-200 flex items-center justify-center mx-auto mb-3 text-[#1746b8]">
                <CheckCircle2 className="w-7 h-7" />
              </div>
              <h3 className="text-base sm:text-lg font-black text-slate-900 mb-2">
                Xác nhận nộp bài thi?
              </h3>
              <p className="text-xs sm:text-sm text-slate-600 mb-2">
                Bạn đã hoàn thành{' '}
                <strong className="text-[#1746b8] font-bold">
                  {answeredCount}/{currentQuestions.length}
                </strong>{' '}
                câu hỏi.
              </p>
              {unansweredCount > 0 ? (
                <div className="p-2.5 rounded-xl bg-amber-50 border border-amber-200 text-amber-800 text-xs font-semibold mb-4">
                  ⚠️ Còn {unansweredCount} câu chưa chọn đáp án. Các câu chưa làm sẽ bị tính 0 điểm.
                </div>
              ) : (
                <div className="p-2.5 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-semibold mb-4">
                  ✅ Bạn đã trả lời đủ tất cả các câu hỏi!
                </div>
              )}
              <p className="text-[11px] text-slate-400 mb-5">
                Thời gian còn lại: <strong>{timerMins}:{timerSecs}</strong>. Kết quả sẽ được ghi nhận ngay sau khi nộp.
              </p>
              <div className="flex gap-2.5">
                <button
                  type="button"
                  onClick={() => setShowFinalSubmitModal(false)}
                  className="flex-1 py-2.5 rounded-xl border border-slate-200 text-slate-700 font-bold text-xs sm:text-sm hover:bg-slate-50 transition-colors"
                >
                  Xem lại bài
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setShowFinalSubmitModal(false);
                    handleSubmit();
                  }}
                  className="flex-1 py-2.5 rounded-xl bg-[#1746b8] hover:bg-[#12389e] text-white font-bold text-xs sm:text-sm transition-colors shadow-md shadow-blue-900/20"
                >
                  Xác nhận nộp bài
                </button>
              </div>
            </div>
          </div>
        );
      })()}
    </div>
  );
}