import { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ChevronLeft, Clock, ArrowRight, ArrowLeft, CheckCircle2, PlayCircle, Shield, BookOpen, Video, Scale, User, Phone, Building2, ChevronDown, AlertCircle } from 'lucide-react';
import { useNavigate } from "react-router-dom";
import { examApi } from '../../api/examApi';
import { unitApi, type UnitItem } from '../../api/unitApi';
import { useExamStore } from '../../store/examStore';
import BrandMark from '../components/BrandMark';
import VietnamEmblem from '../components/VietnamEmblem';
import { toast } from '../components/ui/Toast';
import type { MCQuestion, ScenarioQuestion, AnswerItem } from '../../types';

type Phase = 'info' | 'loading' | 'mc' | 'scenario' | 'prediction' | 'submitting';

export default function Quiz() {
  const navigate = useNavigate();
  const store = useExamStore();

  const [phase, setPhase] = useState<Phase>('info');
  const [error, setError] = useState('');

  // Info form
  const [form, setForm] = useState({ fullName: '', unit: '', phone: '' });
  const [formErrors, setFormErrors] = useState<{ fullName?: string; unit?: string; phone?: string }>({});
  const [unitsList, setUnitsList] = useState<UnitItem[]>([]);
  const [showUnitDropdown, setShowUnitDropdown] = useState(false);
  const [unitSearch, setUnitSearch] = useState('');
  const [unitOther, setUnitOther] = useState(''); // text when "Khác" is selected

  // Load units for dropdown
  useEffect(() => {
    unitApi.getActiveUnits().then((res) => setUnitsList(res.data.data)).catch(() => {});
  }, []);

  const filteredUnits = unitsList.filter((u) =>
    u.name.toLowerCase().includes((unitSearch || form.unit).toLowerCase())
  );

  // Exam data
  const [examId, setExamId] = useState<number | null>(null);
  const [mcQuestions, setMcQuestions] = useState<MCQuestion[]>([]);
  const [scenarioQuestions, setScenarioQuestions] = useState<ScenarioQuestion[]>([]);

  // Quiz state
  const [currentIdx, setCurrentIdx] = useState(0);
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [elapsed, setElapsed] = useState(0);
  const [timeLimitSecs, setTimeLimitSecs] = useState(0); // 0 = no limit
  const [autoSubmitTriggered, setAutoSubmitTriggered] = useState(false);
  const [activeCount, setActiveCount] = useState(0);
  const [prediction, setPrediction] = useState('');
  const [showSectionConfirm, setShowSectionConfirm] = useState(false);
  const [showSubmitWarning, setShowSubmitWarning] = useState<boolean>(false);
  const [isMobileGridOpen, setIsMobileGridOpen] = useState(false);

  // Timer — only runs during quiz phases
  useEffect(() => {
    if (phase !== 'mc' && phase !== 'scenario' && phase !== 'prediction') return;
    const t = setInterval(() => setElapsed((s) => s + 1), 1000);
    return () => clearInterval(t);
  }, [phase]);

  // Derived: remaining seconds
  const remaining = timeLimitSecs > 0 ? Math.max(0, timeLimitSecs - elapsed) : undefined;

  // Poll active count
  useEffect(() => {
    if (phase !== 'mc' && phase !== 'scenario') return;
    const fetchCount = () => {
      examApi.getActiveCount().then((res) => setActiveCount(res.data.count)).catch(() => {});
    };
    fetchCount();
    const t = setInterval(fetchCount, 15000);
    return () => clearInterval(t);
  }, [phase]);

  // Đóng gói handleSubmit vào useCallback để tránh stale closure khi gọi trong useEffect tự động nộp bài
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
        answers: answerItems,
        prediction: prediction ? parseInt(prediction, 10) : undefined,
      });

      store.setResult(res.data.data);
      navigate('/result', { replace: true });
    } catch (err: any) {
      toast.error(err.response?.data?.message ?? 'Nộp bài thất bại. Vui lòng thử lại.');
      setPhase('scenario');
    }
  }, [examId, mcQuestions, scenarioQuestions, answers, prediction, store, navigate]);

  // Auto-submit khi đếm ngược về 0
  useEffect(() => {
    if (remaining !== 0 || autoSubmitTriggered) return;
    if (phase !== 'mc' && phase !== 'scenario' && phase !== 'prediction') return;
    setAutoSubmitTriggered(true);

    if (phase === 'prediction') {
      handleSubmit();
    } else {
      setPhase('prediction');
      setTimeout(() => handleSubmit(), 100);
    }
  }, [remaining, autoSubmitTriggered, phase, handleSubmit]);

  const mins = String(Math.floor(elapsed / 60)).padStart(2, '0');
  const secs = String(elapsed % 60).padStart(2, '0');

  // Timer display
  const timerMins = remaining !== undefined ? String(Math.floor(remaining / 60)).padStart(2, '0') : mins;
  const timerSecs = remaining !== undefined ? String(remaining % 60).padStart(2, '0') : secs;
  const timerUrgent = remaining !== undefined && remaining <= 300; // < 5 min
  const timerCritical = remaining !== undefined && remaining <= 60;  // < 1 min

  // Validate fields
  const validateField = (name: keyof typeof form, value: string): string => {
    if (name === 'fullName') return value.trim() ? '' : 'Vui lòng nhập họ và tên';
    if (name === 'unit') return value.trim() ? '' : 'Vui lòng chọn hoặc nhập đơn vị công tác';
    if (name === 'phone') {
      const v = value.replace(/\s/g, '');
      if (!v) return 'Vui lòng nhập số điện thoại';
      if (!/^0\d{9}$/.test(v)) return 'Số điện thoại không hợp lệ (10 chữ số, bắt đầu bằng 0)';
    }
    return '';
  };

  const handleBlur = (name: keyof typeof form) => {
    setFormErrors((prev) => ({ ...prev, [name]: validateField(name, form[name]) }));
  };

  const handleStartExam = async (e: React.FormEvent) => {
    e.preventDefault();
    const errors = {
      fullName: validateField('fullName', form.fullName),
      unit: validateField('unit', form.unit),
      phone: validateField('phone', form.phone),
    };
    if (errors.fullName || errors.unit || errors.phone) {
      setFormErrors(errors);
      return;
    }
    setFormErrors({});
    setError('');
    setPhase('loading');
    try {
      const submittedUnit = form.unit === 'Khác' ? (unitOther.trim() || 'Khác') : form.unit;
      const regRes = await examApi.register({ ...form, unit: submittedUnit, email: '' });
      const contestantId = regRes.data.data.contestantId;
      store.setContestantId(contestantId);

      const examRes = await examApi.startExam({ contestantId });
      const data = examRes.data.data;
      setExamId(data.examId);
      setMcQuestions(data.multipleChoiceQuestions);
      setScenarioQuestions(data.scenarioQuestions);
      store.setExam(data);
      if (data.timeLimitMinutes > 0) setTimeLimitSecs(data.timeLimitMinutes * 60);

      setPhase('mc');
    } catch (err: any) {
      const msg = err.response?.data?.message;
      if (msg?.includes('ALREADY_PARTICIPATED') || err.response?.status === 409) {
        toast.error('Số điện thoại này đã tham gia thi trong đợt hiện tại.');
      } else if (msg?.includes('NO_ACTIVE_PHASE')) {
        toast.error('Cuộc thi chưa được mở. Vui lòng liên hệ ban tổ chức.');
      } else {
        toast.error(msg ?? 'Không thể bắt đầu bài thi. Vui lòng thử lại.');
      }
      setPhase('info');
    }
  };

  const currentQuestions: (MCQuestion | ScenarioQuestion)[] = phase === 'mc' ? mcQuestions : scenarioQuestions;
  const totalCurrentSection = currentQuestions.length;
  const q = currentQuestions[currentIdx];
  const totalAll = mcQuestions.length + scenarioQuestions.length;
  const globalIdx = phase === 'mc' ? currentIdx : mcQuestions.length + currentIdx;
  const progress = totalAll > 0 ? ((globalIdx + 1) / totalAll) * 100 : 0;

  // Sửa lỗi Syntax Template string tại đây
  const answerKey = q ? `${phase === 'mc' ? 'MC' : 'SC'}-${q.questionId}` : '';
  const selected = answers[answerKey];

  function selectAnswer(key: string) {
    if (!q) return;
    setAnswers((prev) => ({ ...prev, [answerKey]: key }));
  }

  const handleNext = () => {
    if (currentIdx < totalCurrentSection - 1) setCurrentIdx((prev) => prev + 1);
  };
  const handlePrev = () => {
    if (currentIdx > 0) setCurrentIdx((prev) => prev - 1);
  };

  const handleToScenario = () => {
    setShowSectionConfirm(true);
  };
  const confirmToScenario = () => {
    setShowSectionConfirm(false);
    setCurrentIdx(0);
    setPhase('scenario');
  };

  const handleToPrediction = () => {
    const unanswered = scenarioQuestions.filter((sq) => !answers[`SC-${sq.questionId}`]).length;
    if (unanswered > 0) { setShowSubmitWarning(true); } else { setPhase('prediction'); }
  };

  function isQuestionAnswered(idx: number, section: 'mc' | 'scenario') {
    const qs = section === 'mc' ? mcQuestions : scenarioQuestions;
    const prefix = section === 'mc' ? 'MC' : 'SC';
    const qItem = qs[idx];
    if (!qItem) return false;
    return !!answers[`${prefix}-${qItem.questionId}`];
  }

  const answeredCount = currentQuestions.filter((_, i) => isQuestionAnswered(i, phase as 'mc' | 'scenario')).length;

  // Render các Phase giao diện
  if (phase === 'info') {
    return (
      <div className="flex flex-col min-h-[calc(100vh-48px)] bg-white font-sans">
        <header className="sticky top-12 z-50 bg-white/90 backdrop-blur border-b border-slate-200/60 shadow-sm">
          <div className="w-full flex items-center px-4 py-3 md:px-12 lg:px-20 md:py-4">
            <button onClick={() => navigate('/')} className="w-10 h-10 rounded-full flex items-center justify-center hover:bg-green-50 transition-colors text-green-600">
              <ChevronLeft className="w-6 h-6" />
            </button>
            <div className="flex items-center gap-3 ml-2">
              <VietnamEmblem size={36} showBorder={false} onClick={() => navigate('/')} />
              <p className="text-base font-bold text-slate-800">Đăng ký dự thi</p>
            </div>
          </div>
        </header>

        <div className="flex-1 flex flex-col lg:flex-row">
          <div className="hidden lg:flex lg:w-[45%] xl:w-[42%] bg-green-800 flex-col justify-between p-12 xl:p-16 2xl:p-20 relative overflow-hidden">
            <div className="absolute -top-32 -right-32 w-80 h-80 bg-green-700 rounded-full blur-3xl opacity-50" />
            <div className="absolute -bottom-20 -left-20 w-60 h-60 bg-yellow-800 rounded-full blur-3xl opacity-40" />
            
            <div className="relative z-10">
              <h2 className="text-3xl xl:text-4xl 2xl:text-5xl font-black text-white leading-tight mb-4 uppercase">
                CUỘC THI TÌM HIỂU PHÁP LUẬT PHÒNG, CHỐNG MA TÚY NĂM 2025
              </h2>
              <p className="text-green-200 text-lg xl:text-xl leading-relaxed mb-10">
                Vui lòng nhập đầy đủ thông tin cá nhân để bắt đầu bài thi trắc nghiệm trực tuyến.
              </p>

              <div className="space-y-4">
                <div className="flex items-center gap-4 bg-green-700/50 rounded-2xl px-5 py-4">
                  <div className="w-11 h-11 rounded-xl bg-green-600/50 flex items-center justify-center shrink-0">
                    <BookOpen className="w-5 h-5 text-green-200" />
                  </div>
                  <div>
                    <span className="text-white text-base font-bold">10 câu trắc nghiệm</span>
                    <p className="text-green-300 text-sm">Kiến thức pháp luật phòng chống ma túy</p>
                  </div>
                </div>
                <div className="flex items-center gap-4 bg-green-700/50 rounded-2xl px-5 py-4">
                  <div className="w-11 h-11 rounded-xl bg-green-600/50 flex items-center justify-center shrink-0">
                    <Video className="w-5 h-5 text-green-200" />
                  </div>
                  <div>
                    <span className="text-white text-base font-bold">10 câu tình huống</span>
                    <p className="text-green-300 text-sm">Xử lý tình huống thực tế qua video</p>
                  </div>
                </div>
                <div className="flex items-center gap-4 bg-green-700/50 rounded-2xl px-5 py-4">
                  <div className="w-11 h-11 rounded-xl bg-green-600/50 flex items-center justify-center shrink-0">
                    <Scale className="w-5 h-5 text-green-200" />
                  </div>
                  <div>
                    <span className="text-white text-base font-bold">1 câu hỏi dự đoán</span>
                    <p className="text-green-300 text-sm">Dự đoán số người trả lời đúng hết</p>
                  </div>
                </div>
              </div>
            </div>

            <div className="relative z-10 mt-10 pt-6 border-t border-green-700/80">
              <p className="text-green-400 text-sm font-medium">Đơn vị tổ chức</p>
              <div className="mt-2 flex items-center gap-3">
                <BrandMark size={34} showBorder={false} />
                <p className="text-green-100 text-base font-bold">Công an tỉnh Nghệ An</p>
              </div>
            </div>
          </div>

          <div className="flex-1 flex flex-col">
            <div className="lg:hidden bg-yellow-400 px-6 py-5 md:px-8 md:py-6">
              <p className="text-green-800 text-sm mt-2">Vui lòng nhập đầy đủ thông tin bên dưới để bắt đầu bài thi.</p>
            </div>

            <div className="lg:hidden px-6 md:px-8 pt-5 pb-2 flex flex-wrap gap-2">
              <span className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-green-50 border border-green-100 rounded-full text-xs font-semibold text-green-700">
                <BookOpen className="w-3.5 h-3.5" /> 10 câu trắc nghiệm
              </span>
              <span className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-lime-50 border border-lime-200 rounded-full text-xs font-semibold text-green-700">
                <Video className="w-3.5 h-3.5" /> 10 câu tình huống
              </span>
              <span className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-lime-50 border border-lime-200 rounded-full text-xs font-semibold text-green-700">
                <Scale className="w-3.5 h-3.5" /> 1 câu dự đoán
              </span>
            </div>

            <div className="flex-1 flex items-center justify-center">
              <div className="w-full max-w-md lg:max-w-lg px-6 py-6 md:px-8 md:py-8 lg:px-12 lg:py-10 xl:px-16">
                <div className="hidden lg:block mb-8">
                  <h1 className="text-3xl xl:text-4xl font-black text-slate-800 mb-2">Đăng ký dự thi</h1>
                  <p className="text-slate-500 text-lg">Nhập thông tin cá nhân để bắt đầu làm bài</p>
                </div>

                {error && (
                  <p className="mb-6 rounded-xl bg-red-50 border border-red-100 p-4 text-base text-red-700 font-medium">{error}</p>
                )}
                <form onSubmit={handleStartExam} className="space-y-6">
                  <div>
                    <label className="flex items-center gap-2 text-base font-semibold text-slate-700 mb-2.5">
                      <User className="w-4.5 h-4.5 text-slate-400" />
                      Họ và tên <span className="text-red-400">*</span>
                    </label>
                    <input
                      className={`w-full rounded-xl border-2 px-5 py-4 text-lg bg-slate-50/50 focus:bg-white focus:ring-0 outline-none transition-all ${
                        formErrors.fullName ? 'border-red-400 focus:border-red-500' : 'border-slate-200 focus:border-green-500'
                      }`}
                      placeholder="Nguyễn Văn A"
                      value={form.fullName}
                      onChange={(e) => { setForm({ ...form, fullName: e.target.value }); if (formErrors.fullName) setFormErrors((p) => ({ ...p, fullName: '' })); }}
                      onBlur={() => handleBlur('fullName')}
                    />
                    {formErrors.fullName && <p className="mt-1.5 text-sm text-red-500 flex items-center gap-1"><AlertCircle className="w-3.5 h-3.5" />{formErrors.fullName}</p>}
                  </div>

                  <div>
                    <label className="flex items-center gap-2 text-base font-semibold text-slate-700 mb-2.5">
                      <Phone className="w-4.5 h-4.5 text-slate-400" />
                      Số điện thoại <span className="text-red-400">*</span>
                    </label>
                    <input
                      className={`w-full rounded-xl border-2 px-5 py-4 text-lg bg-slate-50/50 focus:bg-white focus:ring-0 outline-none transition-all ${
                        formErrors.phone ? 'border-red-400 focus:border-red-500' : 'border-slate-200 focus:border-green-500'
                      }`}
                      placeholder="0912 345 678"
                      type="tel"
                      value={form.phone}
                      onChange={(e) => { setForm({ ...form, phone: e.target.value }); if (formErrors.phone) setFormErrors((p) => ({ ...p, phone: '' })); }}
                      onBlur={() => handleBlur('phone')}
                    />
                    {formErrors.phone
                      ? <p className="mt-1.5 text-sm text-red-500 flex items-center gap-1"><AlertCircle className="w-3.5 h-3.5" />{formErrors.phone}</p>
                      : <p className="text-sm text-slate-400 mt-2.5">Mỗi số điện thoại chỉ được thi 1 lần trong mỗi đợt</p>
                    }
                  </div>

                  <div className="relative">
                    <label className="flex items-center gap-2 text-base font-semibold text-slate-700 mb-1">
                      <Building2 className="w-4.5 h-4.5 text-slate-400" />
                      Đơn vị công tác <span className="text-red-400">*</span>
                    </label>
                    <p className="text-sm text-slate-400 mb-2.5">Nếu không có đơn vị của bạn trong danh sách, hãy chọn <span className="font-semibold text-slate-500">Khác</span></p>
                    <div className="relative">
                      <input
                        className={`w-full rounded-xl border-2 px-5 py-4 text-lg bg-slate-50/50 focus:bg-white focus:ring-0 outline-none transition-all pr-12 ${
                          formErrors.unit ? 'border-red-400 focus:border-red-500' : 'border-slate-200 focus:border-green-500'
                        }`}
                        placeholder="Chọn đơn vị công tác"
                        value={form.unit}
                        onChange={(e) => {
                          setForm({ ...form, unit: e.target.value });
                          setUnitSearch(e.target.value);
                          setShowUnitDropdown(true);
                          if (e.target.value !== 'Khác') setUnitOther('');
                          if (formErrors.unit) setFormErrors((p) => ({ ...p, unit: '' }));
                        }}
                        onFocus={() => {
                          if (form.unit === 'Khác') {
                            setForm({ ...form, unit: '' });
                            setUnitOther('');
                          }
                          setShowUnitDropdown(true);
                        }}
                        onBlur={() => { setTimeout(() => setShowUnitDropdown(false), 200); handleBlur('unit'); }}
                      />
                      <ChevronDown className="absolute right-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
                    </div>
                    {formErrors.unit && <p className="mt-1.5 text-sm text-red-500 flex items-center gap-1"><AlertCircle className="w-3.5 h-3.5" />{formErrors.unit}</p>}

                    {showUnitDropdown && form.unit !== 'Khác' && (
                      <div className="absolute z-50 w-full mt-1 bg-white rounded-xl border border-slate-200 shadow-lg max-h-52 overflow-y-auto">
                        {filteredUnits.map((u) => (
                          <button
                            key={u.id}
                            type="button"
                            className="w-full text-left px-5 py-3.5 text-base hover:bg-green-50 hover:text-green-700 transition-colors"
                            onMouseDown={(e) => e.preventDefault()}
                            onClick={() => {
                              setForm({ ...form, unit: u.name });
                              setUnitOther('');
                              setFormErrors((p) => ({ ...p, unit: '' }));
                              setShowUnitDropdown(false);
                            }}
                          >
                            {u.name}
                          </button>
                        ))}
                        <button
                          type="button"
                          className="w-full text-left px-5 py-3.5 text-base hover:bg-amber-50 hover:text-amber-700 text-slate-500 border-t border-slate-100 transition-colors rounded-b-xl font-medium"
                          onMouseDown={(e) => e.preventDefault()}
                          onClick={() => {
                            setForm({ ...form, unit: 'Khác' });
                            setFormErrors((p) => ({ ...p, unit: '' }));
                            setShowUnitDropdown(false);
                          }}
                        >
                          Khác
                        </button>
                      </div>
                    )}

                    {form.unit === 'Khác' && (
                      <div className="mt-3">
                        <input
                          className="w-full rounded-xl border-2 border-slate-200 focus:border-green-500 px-5 py-3.5 text-base bg-slate-50/50 focus:bg-white focus:ring-0 outline-none transition-all"
                          placeholder="Nhập tên đơn vị cụ thể (không bắt buộc)"
                          value={unitOther}
                          onChange={(e) => setUnitOther(e.target.value)}
                          maxLength={200}
                        />
                      </div>
                    )}
                  </div>

                  <div className="pt-2">
                    <button type="submit" className="w-full py-4.5 rounded-xl bg-green-700 hover:bg-green-800 text-white font-bold text-lg shadow-lg hover:shadow-xl transition-all flex items-center justify-center gap-2.5 group">
                      Bắt đầu làm bài thi
                      <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
                    </button>
                  </div>
                </form>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (phase === 'loading' || phase === 'submitting') {
    return (
      <div className="flex min-h-[calc(100vh-48px)] items-center justify-center bg-white">
        <div className="text-center">
          <div className="w-12 h-12 border-4 border-green-200 border-t-green-700 rounded-full animate-spin mx-auto mb-4" />
          <p className="text-slate-600 font-medium">
            {phase === 'loading' ? 'Đang tải câu hỏi...' : 'Đang nộp bài...'}
          </p>
        </div>
      </div>
    );
  }

  if (phase === 'prediction') {
    return (
      <div className="flex flex-col min-h-[calc(100vh-48px)] bg-gradient-to-br from-green-50 via-green-100/50 to-yellow-50 font-sans">
        <header className="sticky top-12 z-50 bg-white/90 backdrop-blur border-b border-slate-200/60 shadow-sm px-4 py-3 md:px-8 md:py-4">
          <div className="max-w-5xl mx-auto flex items-center justify-between">
            <div className="flex items-center gap-3">
              <VietnamEmblem size={36} showBorder={false} onClick={() => navigate('/')} />
              <p className="text-base font-bold text-slate-800">Câu hỏi dự đoán</p>
            </div>
            <div className={`flex items-center gap-2 px-3.5 py-1.5 rounded-full border font-mono font-bold text-base tracking-wider ${
                timerCritical ? 'bg-red-50 border-red-300 text-red-700 animate-pulse shadow-sm shadow-red-200'
                : timerUrgent  ? 'bg-amber-50 border-amber-300 text-amber-700'
                : 'bg-white border-green-200 text-green-800 shadow-sm shadow-green-100'
              }`}>
              <Clock className={`w-4 h-4 ${timerCritical ? 'text-red-500' : timerUrgent ? 'text-amber-500' : 'text-green-600'}`} />
              {timerMins}:{timerSecs}
            </div>
          </div>
        </header>
        <div className="flex-1 flex items-center justify-center p-4 md:p-8 lg:p-12 relative overflow-hidden">
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-full max-w-3xl h-full max-h-[800px] bg-yellow-400/20 rounded-full blur-[120px] -z-10 pointer-events-none" />
          
          <div className="w-full max-w-lg relative z-10 transition-all duration-500 transform translate-y-0 opacity-100">
            <div className="bg-white rounded-[2rem] border border-green-100 shadow-2xl shadow-green-900/10 overflow-hidden">
              <div className="bg-gradient-to-r from-green-700 to-yellow-600 px-8 py-8 relative overflow-hidden text-center">
                <div className="absolute top-0 right-0 w-32 h-32 bg-white/10 rounded-full blur-2xl -translate-y-1/2 translate-x-1/2" />
                <div className="absolute bottom-0 left-0 w-24 h-24 bg-yellow-400/20 rounded-full blur-xl translate-y-1/2 -translate-x-1/2" />
                <VietnamEmblem size={56} className="mx-auto mb-4" />
                <h1 className="text-white font-black text-2xl lg:text-3xl mb-2 relative z-10 hidden md:block">Dự đoán kết quả</h1>
                <h1 className="text-white font-black text-xl mb-2 relative z-10 md:hidden">Dự đoán kết quả</h1>
                <p className="text-green-50 text-sm lg:text-base md:font-medium relative z-10">Bạn dự đoán có bao nhiêu người trả lời đúng hết tất cả 20 câu hỏi?</p>
              </div>
              <div className="p-8 lg:p-10 bg-white">
                {error && (
                  <div className="mb-6 rounded-xl bg-red-50 border border-red-100 p-4 text-sm lg:text-base text-red-700 font-medium flex gap-3 items-start">
                    <AlertCircle className="w-5 h-5 shrink-0 mt-0.5 text-red-500" />
                    <span>{error}</span>
                  </div>
                )}
                
                <div className="mb-8">
                  <label className="block text-center text-slate-600 font-semibold mb-3">Nhập con số dự đoán của bạn</label>
                  <input
                    type="number"
                    min="0"
                    className="w-full rounded-2xl border-2 border-slate-200 bg-slate-50 px-6 py-5 text-3xl lg:text-4xl text-center font-black text-green-900 focus:bg-white focus:border-green-500 focus:ring-4 focus:ring-green-500/10 outline-none transition-all placeholder:text-slate-300 placeholder:font-semibold"
                    placeholder="0"
                    value={prediction}
                    onChange={(e) => setPrediction(e.target.value)}
                  />
                </div>

                <button
                  onClick={handleSubmit}
                  className="w-full py-5 rounded-2xl bg-gradient-to-r from-green-600 to-yellow-500 hover:from-green-700 hover:to-yellow-600 text-white font-bold text-lg lg:text-xl shadow-lg hover:shadow-xl shadow-green-600/30 transition-all flex items-center justify-center gap-3 group"
                >
                  Hoàn thành bài thi
                  <CheckCircle2 className="w-6 h-6 group-hover:scale-110 transition-transform" />
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (!q) return null;

  const sectionLabel = phase === 'mc' ? 'PHẦN 1: TRẮC NGHIỆM' : 'PHẦN 2: TÌNH HUỐNG';
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
    <div className="flex flex-col h-[calc(100vh-48px)] bg-slate-50 font-sans overflow-hidden">
      <header className="shrink-0 bg-white/95 backdrop-blur-md border-b border-slate-200 z-50">
        <div className="px-5 py-3 md:px-8 xl:px-12 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <button
              onClick={() => navigate('/')}
              className="w-9 h-9 rounded-full flex items-center justify-center hover:bg-green-50 transition-colors text-green-600"
            >
              <ChevronLeft className="w-5 h-5" />
            </button>
            <div className="flex items-center gap-2.5">
              <VietnamEmblem size={32} showBorder={false} onClick={() => navigate('/')} />
              <div className="leading-tight">
                <p className="hidden md:block text-xs font-bold tracking-widest uppercase text-green-600">CUỘC THI TÌM HIỂU PHÁP LUẬT PHÒNG, CHỐNG MA TÚY NĂM 2025</p>
                <p className="text-sm lg:text-base font-extrabold text-slate-800">Câu {globalIdx + 1} / {totalAll}</p>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2 md:gap-3">
            <div className="hidden md:flex items-center gap-2 px-3 py-1.5 rounded-full bg-yellow-50 border border-yellow-100 text-yellow-700">
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-yellow-400 opacity-75" />
                <span className="relative inline-flex rounded-full h-2 w-2 bg-yellow-500" />
              </span>
              <span className="text-xs lg:text-sm font-bold">{activeCount} đang thi</span>
            </div>
            <div className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-full border font-mono font-bold text-sm text-green-800 tracking-wider ${
                timerCritical ? 'bg-red-50 border-red-300 text-red-700 animate-pulse'
                : timerUrgent  ? 'bg-amber-50 border-amber-300 text-amber-700'
                : 'bg-green-50 border-green-200 text-green-800'
              }`}>
              <Clock className={`w-3.5 h-3.5 ${timerCritical ? 'text-red-500' : timerUrgent ? 'text-amber-500' : 'text-green-600'}`} />
              {timerMins}:{timerSecs}
            </div>
          </div>
        </div>
        
        <div className="h-1.5 bg-slate-100">
          <div
            className="h-full bg-gradient-to-r from-green-600 to-lime-400 transition-all duration-300 ease-out"
            style={{ width: `${progress}%` }} // Sửa lỗi String syntax
          />
        </div>
      </header>

      <div className="flex flex-1 overflow-hidden">
        <aside className="hidden lg:flex flex-col w-72 xl:w-80 shrink-0 bg-white border-r border-slate-200 overflow-y-auto">
          <div className="px-5 py-4 border-b border-slate-100 shrink-0">
            <p className="text-xs font-bold tracking-widest uppercase text-green-600 mb-1">{sectionLabel}</p>
            <div className="flex items-center justify-between mb-2">
              <p className="text-sm lg:text-base font-bold text-slate-700">Tiến độ làm bài</p>
              <span className="text-sm font-black text-green-700">
                {answeredCount}<span className="text-slate-400 font-normal text-xs">/{totalCurrentSection}</span>
              </span>
            </div>
            <div className="h-1.5 bg-slate-100 rounded-full overflow-hidden">
              <div
                className="h-full bg-green-500 rounded-full transition-all duration-300"
                style={{ width: `${totalCurrentSection > 0 ? (answeredCount / totalCurrentSection) * 100 : 0}%` }} // Sửa lỗi String syntax
              />
            </div>
          </div>

          <div className="p-4 flex-1">
            <div className="grid grid-cols-5 gap-2">
              {currentQuestions.map((qItem, idx) => {
                const prefix = phase === 'mc' ? 'MC' : 'SC';
                const isAnswered = !!answers[`${prefix}-${qItem.questionId}`];
                const isCurrent = idx === currentIdx;
                return (
                  <button
                    key={qItem.questionId}
                    onClick={() => setCurrentIdx(idx)}
                    className={`aspect-square rounded-xl text-sm font-bold transition-all border-2 ${
                      isCurrent
                        ? 'bg-green-700 text-white border-green-700 shadow-md scale-105'
                        : isAnswered
                        ? 'bg-green-50 text-green-700 border-green-300 hover:bg-green-100'
                        : 'bg-white text-slate-400 border-slate-200 hover:border-green-200 hover:text-green-600'
                    }`}
                  >
                    {(phase === 'mc' ? idx : mcQuestions.length + idx) + 1}
                  </button>
                );
              })}
            </div>

            <div className="flex items-center gap-4 mt-4 pt-3.5 border-t border-slate-100 text-xs text-slate-500">
              <span className="flex items-center gap-1.5">
                <span className="w-3.5 h-3.5 rounded-md bg-green-50 border-2 border-green-300 shrink-0" />
                Đã trả lời
              </span>
              <span className="flex items-center gap-1.5">
                <span className="w-3.5 h-3.5 rounded-md bg-white border-2 border-slate-200 shrink-0" />
                Chưa trả lời
              </span>
            </div>
          </div>

          <div className="p-4 border-t border-slate-100 shrink-0">
            {phase === 'mc' ? (
              <button
                onClick={handleToScenario}
                className="w-full py-3 rounded-xl text-sm font-bold text-white bg-green-700 hover:bg-green-800 transition-colors flex items-center justify-center gap-2 shadow-sm"
              >
                <PlayCircle className="w-4 h-4" />
                Sang phần Tình huống →
              </button>
            ) : (
              <button
                onClick={handleToPrediction}
                className="w-full py-3 rounded-xl text-sm font-bold text-white bg-yellow-600 hover:bg-yellow-700 transition-colors flex items-center justify-center gap-2 shadow-sm"
              >
                <CheckCircle2 className="w-4 h-4" />
                Nộp bài thi
              </button>
            )}
          </div>
        </aside>

        <main className="flex-1 flex flex-col overflow-hidden bg-slate-50">
          <div className="flex-1 overflow-y-auto p-4 md:p-8 xl:p-10 space-y-4 md:space-y-5 relative">
            <div className="max-w-4xl mx-auto space-y-4 md:space-y-5">
              <div className="lg:hidden bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-sm">
                <button 
                  onClick={() => setIsMobileGridOpen(!isMobileGridOpen)}
                  className="w-full bg-yellow-400 px-4 py-3 flex items-center justify-between"
                >
                  <span className="text-green-900 text-xs font-bold uppercase tracking-wider">{sectionLabel}</span>
                  <div className="flex items-center gap-3">
                    <span className="text-green-800 text-xs font-semibold bg-yellow-300/50 px-2 py-0.5 rounded-md">{answeredCount}/{totalCurrentSection}</span>
                    <ChevronDown className={`w-4 h-4 text-green-900 transition-transform ${isMobileGridOpen ? 'rotate-180' : ''}`} />
                  </div>
                </button>
                <AnimatePresence>
                  {isMobileGridOpen && (
                    <motion.div
                      initial={{ height: 0 }}
                      animate={{ height: "auto" }}
                      exit={{ height: 0 }}
                      className="overflow-hidden"
                    >
                      <div className="p-3 border-t border-yellow-400/20">
                        <div className="grid grid-cols-5 gap-2">
                          {currentQuestions.map((qItem, idx) => {
                            const prefix = phase === 'mc' ? 'MC' : 'SC';
                            const isAnswered = !!answers[`${prefix}-${qItem.questionId}`];
                            const isCurrent = idx === currentIdx;
                            return (
                              <button
                                key={qItem.questionId}
                                onClick={() => setCurrentIdx(idx)}
                                className={`aspect-square rounded-lg text-sm font-bold transition-all border-2 ${
                                  isCurrent ? 'bg-green-700 text-white border-green-700 shadow-md scale-105'
                                  : isAnswered ? 'bg-green-100 text-green-800 border-green-300'
                                  : 'bg-white text-slate-400 border-slate-200'
                                }`}
                              >
                                {(phase === 'mc' ? idx : mcQuestions.length + idx) + 1}
                              </button>
                            );
                          })}
                        </div>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>

              {phase === 'scenario' && 'videoUrl' in q && (q as ScenarioQuestion).videoUrl && (
                <motion.div 
                  initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} 
                  className="bg-slate-900 rounded-2xl overflow-hidden shadow-xl border border-slate-800"
                >
                  <video key={q.questionId} controls className="w-full aspect-video" src={(q as ScenarioQuestion).videoUrl} />
                </motion.div>
              )}

              <AnimatePresence mode="wait">
                <motion.div
                  key={q.questionId}
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -20 }}
                  transition={{ duration: 0.2, ease: "easeOut" }}
                  className="bg-white rounded-3xl shadow-xl shadow-slate-200/50 border border-slate-200 overflow-hidden"
                >
                  <div className="px-6 py-6 xl:px-8 xl:py-8 border-b border-slate-100 bg-gradient-to-r from-green-50 to-white">
                    <h2 className="text-lg md:text-xl xl:text-2xl font-semibold text-slate-800 leading-relaxed">
                      <span className="text-green-700 font-black mr-2">Câu {globalIdx + 1}.</span>
                      {questionText}
                    </h2>
                    {phase === 'scenario' && 'description' in q && (q as ScenarioQuestion).description && (
                      <p className="text-base text-slate-600 mt-4 leading-relaxed font-medium bg-white/60 p-4 rounded-xl border border-slate-100">{(q as ScenarioQuestion).description}</p>
                    )}
                  </div>

                  <div className="p-5 xl:p-8 space-y-3">
                    {answerOptions.map((ans) => {
                      const isSelected = selected === ans.key;
                      return (
                        <button
                          key={ans.key}
                          onClick={() => selectAnswer(ans.key)}
                          className={`w-full text-left px-5 py-4 xl:py-5 rounded-2xl border-2 transition-all duration-200 flex items-center gap-4 group active:scale-[0.98] ${
                            isSelected
                              ? 'border-green-500 bg-green-50 shadow-[0_4px_12px_rgba(34,197,94,0.15)] scale-[1.01] z-10 relative'
                              : 'border-slate-200 bg-white hover:border-green-300 hover:shadow-md'
                          }`}
                        >
                          <div className={`w-10 h-10 xl:w-12 xl:h-12 shrink-0 rounded-xl flex items-center justify-center font-black text-base transition-colors shadow-inner ${
                            isSelected
                              ? 'bg-green-600 text-white'
                              : 'bg-slate-100 text-slate-500 group-hover:bg-green-100 group-hover:text-green-700'
                          }`}>
                            {ans.key}
                          </div>
                          <span className={`flex-1 text-base xl:text-lg leading-snug ${
                            isSelected ? 'font-bold text-green-900' : 'font-medium text-slate-700 group-hover:text-slate-900'
                          }`}>
                            {ans.text}
                          </span>
                          {isSelected && (
                            <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }}>
                              <CheckCircle2 className="w-6 h-6 text-green-600 shrink-0" />
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

          <div className="shrink-0 bg-white border-t border-slate-200 px-4 py-3 md:px-8 xl:px-10 z-10 flex items-center justify-between gap-3 shadow-sm">
            <button
              onClick={handlePrev}
              disabled={currentIdx === 0}
              className="flex items-center gap-2 px-5 py-2.5 md:py-3 rounded-xl font-semibold text-slate-600 bg-white border border-slate-200 hover:bg-slate-50 hover:text-slate-800 disabled:opacity-30 disabled:cursor-not-allowed transition-colors text-sm"
            >
              <ArrowLeft className="w-4 h-4 md:w-5 md:h-5" />
              <span className="hidden sm:inline">Câu trước</span>
            </button>

            {!isLastInSection ? (
              <button
                onClick={handleNext}
                className="flex items-center gap-2 px-6 py-2.5 md:py-3 rounded-xl font-bold text-white bg-green-700 hover:bg-green-800 shadow-sm hover:shadow-md transition-all text-sm md:text-base"
              >
                <span className="hidden sm:inline">Câu tiếp theo</span>
                <span className="sm:hidden">Tiếp</span>
                <ArrowRight className="w-4 h-4 md:w-5 md:h-5" />
              </button>
            ) : phase === 'mc' ? (
              <button
                onClick={handleToScenario}
                className="lg:hidden flex items-center gap-2 px-5 py-2.5 md:py-3 rounded-xl font-bold text-white bg-green-700 hover:bg-green-800 shadow-md transition-all text-sm md:text-base"
              >
                <PlayCircle className="w-4 h-4 md:w-5 md:h-5" />
                Sang Tình huống
              </button>
            ) : (
              <button
                onClick={handleToPrediction}
                className="lg:hidden flex items-center gap-2 px-5 py-2.5 md:py-3 rounded-xl font-bold text-white bg-yellow-600 hover:bg-yellow-700 shadow-md transition-all text-sm md:text-base"
              >
                <CheckCircle2 className="w-4 h-4 md:w-5 md:h-5" />
                Nộp bài
              </button>
            )}
          </div>
        </main>
      </div>

      <div className="lg:hidden shrink-0 bg-white border-t border-slate-200 px-4 py-2.5 flex justify-center">
        <div className="flex items-center gap-2 text-yellow-600">
          <span className="relative flex h-2 w-2">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-yellow-400 opacity-75" />
            <span className="relative inline-flex rounded-full h-2 w-2 bg-yellow-500" />
          </span>
          <span className="text-xs font-bold">{activeCount} người đang thi cùng lúc</span>
        </div>
      </div>

      {showSectionConfirm && (() => {
        const unansweredMc = mcQuestions.filter((mq) => !answers[`MC-${mq.questionId}`]).length;
        return (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
            <div className="bg-white rounded-2xl lg:rounded-3xl shadow-2xl w-full max-w-sm lg:max-w-md p-6 lg:p-8">
              <div className="w-14 h-14 lg:w-16 lg:h-16 rounded-2xl bg-amber-50 border border-amber-100 flex items-center justify-center mx-auto mb-5">
                <AlertCircle className="w-7 h-7 lg:w-8 lg:h-8 text-amber-500" />
              </div>
              <h3 className="text-lg lg:text-xl font-extrabold text-slate-800 text-center mb-3">
                Chuyển sang phần Tình huống?
              </h3>
              {unansweredMc > 0 && (
                <p className="text-sm lg:text-base text-slate-600 text-center mb-2">
                  Bạn còn{' '}
                  <strong className="text-red-600 text-base lg:text-lg">{unansweredMc}</strong>{' '}
                  câu hỏi trắc nghiệm chưa trả lời.
                </p>
              )}
              <p className="text-sm lg:text-base text-slate-500 text-center mb-6 lg:mb-8">
                Nếu chuyển qua sẽ <strong className="text-red-600">KHÔNG</strong> thể quay lại phần Trắc nghiệm. Các câu bỏ qua sẽ bị tính sai.
              </p>
              <div className="flex gap-3">
                <button
                  onClick={() => setShowSectionConfirm(false)}
                  className="flex-1 px-4 py-3 lg:py-3.5 rounded-xl border-2 border-slate-200 text-slate-700 font-bold text-sm lg:text-base hover:bg-slate-50 transition-colors"
                >
                  Ở lại
                </button>
                <button
                  onClick={confirmToScenario}
                  className="flex-1 px-4 py-3 lg:py-3.5 rounded-xl bg-green-700 hover:bg-green-800 text-white font-bold text-sm lg:text-base transition-colors"
                >
                  Chuyển tiếp
                </button>
              </div>
            </div>
          </div>
        );
      })()}

      {showSubmitWarning && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
          <div className="bg-white rounded-2xl lg:rounded-3xl shadow-2xl w-full max-w-sm lg:max-w-md p-6 lg:p-8">
            <div className="w-14 h-14 lg:w-16 lg:h-16 rounded-2xl bg-amber-50 border border-amber-100 flex items-center justify-center mx-auto mb-5">
              <AlertCircle className="w-7 h-7 lg:w-8 lg:h-8 text-amber-500" />
            </div>
            <h3 className="text-lg lg:text-xl font-extrabold text-slate-800 text-center mb-3">
              Còn câu chưa trả lời
            </h3>
            <p className="text-sm lg:text-base text-slate-600 text-center mb-2">
              Bạn còn{' '}
              <strong className="text-red-600 text-base lg:text-lg">
                {scenarioQuestions.filter((sq) => !answers[`SC-${sq.questionId}`]).length}
              </strong>{' '}
              câu chưa được trả lời.
            </p>
            <p className="text-xs lg:text-sm text-slate-400 text-center mb-6 lg:mb-8">
              Bạn vẫn có thể nộp bài, nhưng các câu bỏ qua sẽ bị tính sai.
            </p>
            <div className="flex gap-3">
              <button
                onClick={() => setShowSubmitWarning(false)}
                className="flex-1 px-4 py-3 lg:py-3.5 rounded-xl border-2 border-slate-200 text-slate-700 font-bold text-sm lg:text-base hover:bg-slate-50 transition-colors"
              >
                Trả lời tiếp
              </button>
              <button
                onClick={() => {
                  setShowSubmitWarning(false);
                  setPhase('prediction');
                }}
                className="flex-1 px-4 py-3 lg:py-3.5 rounded-xl bg-amber-500 hover:bg-amber-600 text-white font-bold text-sm lg:text-base transition-colors"
              >
                Nộp bài
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}