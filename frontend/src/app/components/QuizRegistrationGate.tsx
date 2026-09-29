import { useEffect, useMemo, useState, type ReactNode } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  AlertCircle,
  ArrowLeft,
  BookOpen,
  Building2,
  CheckCircle2,
  Clock,
  LoaderCircle,
  Mail,
  Phone,
  Scale,
  ShieldCheck,
  User,
  Video,
} from 'lucide-react';
import { authApi } from '../../api/authApi';
import { examApi } from '../../api/examApi';
import { eligibleApi } from '../../api/eligibleApi';
import { unitApi, type UnitItem } from '../../api/unitApi';
import { settingsApi } from '../../api/settingsApi';
import { toast } from './ui/Toast';
import type { ExamStartResponse, EligibleContestant } from '../../types';
import BrandMark from './BrandMark';
import TurnstileWidget from './TurnstileWidget';

type RegistrationForm = {
  fullName: string;
  unit: string;
  phone: string;
  email: string;
};

type FormErrors = Partial<Record<keyof RegistrationForm | 'otp', string>>;
type EntryStatus = 'idle' | 'otpRequested' | 'verifiedPreparing' | 'entering' | 'entryFailed';
type PendingStartSession = {
  contestantId: number;
  startExamToken: string;
};

type Props = {
  onExamStarted: (payload: { contestantId: number; exam: ExamStartResponse }) => void;
};

export default function QuizRegistrationGate({ onExamStarted }: Props) {
  const navigate = useNavigate();
  const [form, setForm] = useState<RegistrationForm>({
    fullName: '',
    unit: '',
    phone: '',
    email: '',
  });
  const [formErrors, setFormErrors] = useState<FormErrors>({});
  const [otp, setOtp] = useState('');
  const [verificationToken, setVerificationToken] = useState<string | null>(null);
  const [pendingStartSession, setPendingStartSession] = useState<PendingStartSession | null>(null);
  const [entryStatus, setEntryStatus] = useState<EntryStatus>('idle');
  const [submitting, setSubmitting] = useState(false);
  const [requestingOtp, setRequestingOtp] = useState(false);
  const [verifyingOtp, setVerifyingOtp] = useState(false);
  const [resendCountdown, setResendCountdown] = useState<number>(0);
  const [unitsList, setUnitsList] = useState<UnitItem[]>([]);
  const [unitOther, setUnitOther] = useState('');
  const [showUnitDropdown, setShowUnitDropdown] = useState(false);
  const [unitSearch, setUnitSearch] = useState('');
  const [captchaToken, setCaptchaToken] = useState('');
  const [captchaResetKey, setCaptchaResetKey] = useState(0);
  const [remoteCaptchaConfig, setRemoteCaptchaConfig] = useState<{ enabled: boolean; siteKey: string } | null>(null);
  const [currentPhase, setCurrentPhase] = useState<{
    id: number;
    name: string;
    status: string;
    startTime?: string;
    endTime?: string;
    phaseType?: string;
    mcQuestionCount?: number;
    timeLimitMinutes?: number;
    hasScenarios?: boolean;
    hasPrediction?: boolean;
    requireWhitelist?: boolean;
  } | null>(null);
  const [timeLimit, setTimeLimit] = useState<number | null>(null);
  const [eligibleList, setEligibleList] = useState<EligibleContestant[]>([]);
  const [selectedEligible, setSelectedEligible] = useState<EligibleContestant | null>(null);
  const [eligibleSearch, setEligibleSearch] = useState('');
  const [showEligibleDropdown, setShowEligibleDropdown] = useState(false);

  const formatDateTime = (isoString?: string) => {
    if (!isoString) return '';
    try {
      const date = new Date(isoString);
      const hours = String(date.getHours()).padStart(2, '0');
      const minutes = String(date.getMinutes()).padStart(2, '0');
      const day = String(date.getDate()).padStart(2, '0');
      const month = String(date.getMonth() + 1).padStart(2, '0');
      const year = date.getFullYear();
      return `${hours}:${minutes} ngày ${day}/${month}/${year}`;
    } catch {
      return isoString;
    }
  };

  useEffect(() => {
    window.scrollTo(0, 0);
  }, []);

  useEffect(() => {
    examApi
      .getCurrentPhase()
      .then((res) => {
        if (res.data?.data) {
          setCurrentPhase(res.data.data);
          if (res.data.data.timeLimitMinutes) {
            setTimeLimit(res.data.data.timeLimitMinutes);
          }
        }
      })
      .catch(() => {});

    eligibleApi
      .getPublicList()
      .then((res) => {
        if (res.data?.data) {
          setEligibleList(res.data.data);
        }
      })
      .catch(() => {});

    settingsApi
      .getTimeLimitMinutes()
      .then((res) => {
        if (typeof res.data?.data === 'number') {
          setTimeLimit((prev) => prev ?? res.data.data);
        }
      })
      .catch(() => {});

    settingsApi
      .getCaptchaConfig()
      .then((res) => {
        if (res.data?.data) {
          setRemoteCaptchaConfig(res.data.data);
        }
      })
      .catch(() => {});
  }, []);

  useEffect(() => {
    unitApi.getActiveUnits().then((res) => setUnitsList(res.data.data)).catch(() => {});
  }, []);

  useEffect(() => {
    if (resendCountdown <= 0) {
      return;
    }

    const timer = window.setInterval(() => {
      setResendCountdown((current) => current - 1);
    }, 1000);

    return () => window.clearInterval(timer);
  }, [resendCountdown]);

  const filteredUnits = useMemo(
    () => unitsList.filter((u) => u.name.toLowerCase().includes((unitSearch || form.unit).toLowerCase())),
    [unitsList, unitSearch, form.unit]
  );

  const filteredEligible = useMemo(() => {
    if (!eligibleSearch) return eligibleList;
    const q = eligibleSearch.toLowerCase();
    return eligibleList.filter(
      (c) =>
        c.fullName.toLowerCase().includes(q) ||
        c.unit.toLowerCase().includes(q) ||
        String(c.orderNumber).includes(q)
    );
  }, [eligibleList, eligibleSearch]);

  const handleSelectEligible = (c: EligibleContestant) => {
    if (c.isRegistered) {
      toast.error('Thí sinh này đã được đăng ký tài khoản thi.');
      return;
    }
    setSelectedEligible(c);
    setForm((prev) => ({
      ...prev,
      fullName: c.fullName,
      unit: c.unit,
    }));
    setShowEligibleDropdown(false);
    setEligibleSearch('');
    setFormErrors((prev) => ({ ...prev, fullName: undefined, unit: undefined }));
  };



  const canRetryAutoStart = !!pendingStartSession && entryStatus === 'entryFailed' && !submitting;
  const isProgressState = entryStatus === 'verifiedPreparing' || entryStatus === 'entering';
  const isFormLocked = requestingOtp || verifyingOtp || submitting || isProgressState;
  const envSiteKey = (import.meta.env.VITE_TURNSTILE_SITE_KEY as string | undefined)?.trim();
  const turnstileSiteKey = (remoteCaptchaConfig?.siteKey || envSiteKey) ?? '';
  const captchaEnabled = remoteCaptchaConfig != null ? remoteCaptchaConfig.enabled : !!turnstileSiteKey;

  const validateField = (name: keyof RegistrationForm, value: string): string => {
    if (name === 'fullName') {
      return value.trim() ? '' : 'Vui lòng nhập họ và tên';
    }
    if (name === 'unit') {
      return value.trim() ? '' : 'Vui lòng chọn hoặc nhập đơn vị công tác';
    }
    if (name === 'phone') {
      const normalized = value.replace(/\s/g, '');
      if (!normalized) return 'Vui lòng nhập số điện thoại';
      if (!/^0\d{9}$/.test(normalized)) {
        return 'Số điện thoại không hợp lệ (10 chữ số, bắt đầu bằng 0)';
      }
      return '';
    }
    if (name === 'email') {
      const normalized = value.trim();
      if (!normalized) return 'Vui lòng nhập email';
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalized)) {
        return 'Email không hợp lệ';
      }
    }
    return '';
  };

  const validateOtp = (value: string): string => {
    if (!value.trim()) return 'Vui lòng nhập mã OTP';
    if (!/^\d{6}$/.test(value.trim())) return 'Mã OTP phải gồm đúng 6 chữ số';
    return '';
  };

  const [regMode, setRegMode] = useState<'eligible' | 'manual'>('eligible');

  const isStrictWhitelist = currentPhase?.requireWhitelist === true;
  const isEligibleMode = isStrictWhitelist || (regMode === 'eligible' && eligibleList.length > 0);

  const validateForm = (): boolean => {
    if (isEligibleMode && !selectedEligible) {
      setFormErrors((prev) => ({
        ...prev,
        fullName: 'Vui lòng chọn tên thí sinh trong danh sách hoặc chuyển sang Tự nhập thông tin',
      }));
      return false;
    }

    const submittedUnit = form.unit === 'Khác' ? (unitOther.trim() || 'Khác') : form.unit;
    const nextErrors: FormErrors = {
      fullName: validateField('fullName', form.fullName),
      unit: validateField('unit', submittedUnit),
      phone: validateField('phone', form.phone),
      email: validateField('email', form.email),
    };
    setFormErrors(nextErrors);
    return !Object.values(nextErrors).some(Boolean);
  };

  const requestOtp = async () => {
    if (!validateForm()) {
      return;
    }

    if (captchaEnabled && !captchaToken) {
      toast.error('Vui lòng hoàn tất xác minh bảo mật trước khi nhận OTP.');
      return;
    }

    setRequestingOtp(true);
    try {
      const response = await authApi.requestOtp({
        email: form.email.trim(),
        captchaToken: captchaToken || undefined,
      });
      setEntryStatus('otpRequested');
      setVerificationToken(null);
      setPendingStartSession(null);
      setOtp('');
      setFormErrors((prev) => ({ ...prev, otp: undefined }));
      setResendCountdown(response.data.data.resendAvailableInSeconds);
      setCaptchaToken('');
      setCaptchaResetKey((current) => current + 1);
      toast.success('Mã OTP đã được gửi tới email của bạn.');
    } catch (err: any) {
      setCaptchaToken('');
      setCaptchaResetKey((current) => current + 1);
      toast.error(err.response?.data?.message ?? 'Không thể gửi OTP. Vui lòng thử lại.');
    } finally {
      setRequestingOtp(false);
    }
  };

  const handleVerifyAndStartExam = async () => {
    const otpError = validateOtp(otp);
    if (otpError) {
      setFormErrors((prev) => ({ ...prev, otp: otpError }));
      return;
    }

    setVerifyingOtp(true);
    setEntryStatus('entering');
    try {
      // 1. Verify OTP
      const verifyResponse = await authApi.verifyOtp({
        email: form.email.trim(),
        otp: otp.trim(),
      });
      const token = verifyResponse.data.data.verificationToken;
      setVerificationToken(token);

      // 2. Register Contestant
      const submittedUnit = form.unit === 'Khác' ? (unitOther.trim() || 'Khác') : form.unit;
      const registerResponse = await examApi.register({
        fullName: form.fullName.trim(),
        unit: submittedUnit,
        phone: form.phone.replace(/\s/g, ''),
        email: form.email.trim(),
        verificationToken: token,
        eligibleContestantId: selectedEligible?.id,
      });

      const contestant = registerResponse.data.data;
      const startSession = {
        contestantId: contestant.contestantId,
        startExamToken: contestant.startExamToken,
      };
      setPendingStartSession(startSession);

      // 3. Start Exam
      const examResponse = await examApi.startExam({
        contestantId: startSession.contestantId,
        startExamToken: startSession.startExamToken,
      });

      toast.success('Xác thực thành công! Đang chuyển vào phòng thi.');
      onExamStarted({
        contestantId: startSession.contestantId,
        exam: examResponse.data.data,
      });
    } catch (err: any) {
      setEntryStatus('entryFailed');
      toast.error(err.response?.data?.message ?? 'Không thể khởi tạo phiên làm bài. Vui lòng thử lại.');
    } finally {
      setVerifyingOtp(false);
    }
  };

  const startExam = async () => {
    if (!verificationToken && !pendingStartSession) {
      toast.error('Vui lòng xác thực OTP trước khi vào thi.');
      return;
    }

    setEntryStatus('entering');
    setSubmitting(true);
    try {
      let startSession = pendingStartSession;

      if (!startSession) {
        const submittedUnit = form.unit === 'Khác' ? (unitOther.trim() || 'Khác') : form.unit;
        const registerResponse = await examApi.register({
          fullName: form.fullName.trim(),
          unit: submittedUnit,
          phone: form.phone.replace(/\s/g, ''),
          email: form.email.trim(),
          verificationToken: verificationToken!,
          eligibleContestantId: isEligibleMode ? selectedEligible?.id : undefined,
        });

        const contestant = registerResponse.data.data;
        startSession = {
          contestantId: contestant.contestantId,
          startExamToken: contestant.startExamToken,
        };
        setPendingStartSession(startSession);
      }

      const examResponse = await examApi.startExam({
        contestantId: startSession.contestantId,
        startExamToken: startSession.startExamToken,
      });

      setPendingStartSession(null);
      onExamStarted({
        contestantId: startSession.contestantId,
        exam: examResponse.data.data,
      });
    } catch (err: any) {
      setEntryStatus('entryFailed');
      toast.error(err.response?.data?.message ?? 'Không thể bắt đầu bài thi. Vui lòng thử lại.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="flex min-h-[calc(100vh-44px)] lg:h-[calc(100vh-44px)] flex-col overflow-hidden bg-slate-50 font-sans lg:flex-row">
      <div className="w-full shrink-0 border-b border-blue-900/40 bg-gradient-to-b from-[#143da8] via-[#1d52d4] to-[#12389e] p-5 sm:p-6 text-white lg:w-[40%] lg:border-b-0 lg:border-r lg:p-10 xl:w-[35%]">
        <div className="relative z-10 space-y-5">
          <button
            type="button"
            onClick={() => navigate('/')}
            className="inline-flex items-center gap-2 rounded-full bg-white/10 px-3.5 py-1.5 text-xs font-semibold text-blue-100 transition-all hover:bg-white/20 hover:text-white"
          >
            <ArrowLeft className="h-4 w-4" />
            Về trang chủ
          </button>

          <div className="flex items-center gap-3">
            <img src="/logo-doan.png" alt="Huy hiệu Đoàn" className="w-12 h-12 object-contain shrink-0 drop-shadow-md select-none" />
            <div>
              <p className="text-[10px] sm:text-[11px] font-black uppercase tracking-[0.2em] text-yellow-300">
                TỈNH ĐOÀN NGHỆ AN
              </p>
              <p className="text-sm sm:text-base font-black leading-snug text-white">
                BÍ THƯ ĐOÀN CƠ SỞ GIỎI 2026
              </p>
            </div>
          </div>

          <div className="pt-1">
            <p className="text-xs sm:text-sm leading-relaxed text-blue-100/90">
              Phần thi: <strong className="text-yellow-300 font-bold">Bí thư đoàn cơ sở – Kiến thức</strong> (Vòng loại cấp tỉnh). Dành cho các thí sinh tham gia Hội thi Bí thư Đoàn cơ sở giỏi năm 2026 do Ban Thường vụ Tỉnh đoàn tổ chức.
            </p>
          </div>

          {currentPhase && (
            <div className="rounded-2xl border border-white/15 bg-white/10 p-3.5 backdrop-blur-xs">
              <p className="text-[10px] font-black uppercase tracking-widest text-yellow-300">Giai đoạn thi</p>
              <p className="mt-1 text-base font-bold text-white">{currentPhase.name}</p>
              {currentPhase.startTime && <p className="mt-0.5 text-xs text-blue-100/80">Bắt đầu: {formatDateTime(currentPhase.startTime)}</p>}
            </div>
          )}

          <div className="hidden space-y-3 pt-1 lg:block">
            <p className="text-[11px] font-black uppercase tracking-widest text-yellow-300">Quy cách bài thi</p>
            <InfoCard
              icon={<BookOpen className="h-5 w-5 text-yellow-300" />}
              title={`${currentPhase?.mcQuestionCount ?? 30} câu trắc nghiệm`}
              description="Nội dung: Công tác Đoàn, chủ trương Đảng, KT-XH và chuyển đổi số"
            />
            {timeLimit !== null && (
              <InfoCard
                icon={<Clock className="h-5 w-5 text-yellow-300" />}
                title={`${timeLimit} phút làm bài`}
                description="Đồng hồ đếm ngược trực tuyến, tự động nộp bài khi hết giờ"
              />
            )}
            <InfoCard
              icon={<Scale className="h-5 w-5 text-yellow-300" />}
              title="Tuyển chọn TOP 10"
              description="10 thí sinh xuất sắc nhất giành vé vào Vòng Chung Kết đối kháng sân khấu"
            />
          </div>

          <div className="flex flex-wrap gap-2 pt-1 lg:hidden">
            <InfoChip icon={<BookOpen className="h-3.5 w-3.5" />} label={`${currentPhase?.mcQuestionCount ?? 30} câu trắc nghiệm`} />
            {timeLimit !== null && <InfoChip icon={<Clock className="h-3.5 w-3.5" />} label={`${timeLimit} phút`} />}
            <InfoChip icon={<Scale className="h-3.5 w-3.5" />} label="Top 10 vào Chung kết" />
          </div>
        </div>

        <div className="relative z-10 mt-8 hidden items-center justify-between border-t border-white/10 pt-4 text-xs text-green-200/50 lg:flex">
          <div className="flex items-center gap-2">
            <BrandMark size={24} showBorder={false} />
            <span className="font-semibold text-green-100/70">Ban Thường vụ Tỉnh đoàn Nghệ An</span>
          </div>
          <span>Bảo mật qua OTP</span>
        </div>
      </div>

      <div className="flex flex-1 items-center justify-center overflow-y-auto bg-slate-50 p-4 md:p-8 lg:p-12">
        <div className="w-full max-w-lg">
          <div className="space-y-6 rounded-3xl border border-slate-200/60 bg-white p-6 shadow-xl md:p-8">
            {entryStatus === 'idle' ? (
              <div className="space-y-6">
                <div>
                  <span className="rounded-full bg-green-100/60 px-3 py-1 text-[10px] font-black uppercase tracking-wider text-green-700">Bước 1/2</span>
                  <h2 className="mt-2 text-xl font-black text-slate-800 md:text-2xl">
                    {isEligibleMode ? 'Xác nhận thông tin dự thi' : 'Thông tin thí sinh'}
                  </h2>
                  <p className="mt-1 text-xs text-slate-500 md:text-sm">
                    {isEligibleMode
                      ? 'Chọn tên bạn trong danh sách thí sinh và cung cấp SĐT, Email để nhận mã OTP.'
                      : 'Vui lòng cung cấp chính xác thông tin để lưu trữ kết quả thi.'}
                  </p>
                </div>

                {!isStrictWhitelist && eligibleList.length > 0 && (
                  <div className="flex rounded-xl bg-slate-100 p-1 border border-slate-200">
                    <button
                      type="button"
                      disabled={isFormLocked}
                      onClick={() => {
                        setRegMode('eligible');
                        setFormErrors((prev) => ({ ...prev, fullName: undefined, unit: undefined }));
                      }}
                      className={`flex-1 py-2 px-3 rounded-lg text-xs font-bold transition-all ${
                        regMode === 'eligible'
                          ? 'bg-white text-blue-900 shadow-xs'
                          : 'text-slate-600 hover:text-slate-900'
                      }`}
                    >
                      Chọn từ danh sách có sẵn
                    </button>
                    <button
                      type="button"
                      disabled={isFormLocked}
                      onClick={() => {
                        setRegMode('manual');
                        setSelectedEligible(null);
                        setForm((prev) => ({ ...prev, fullName: '', unit: '' }));
                        setFormErrors((prev) => ({ ...prev, fullName: undefined, unit: undefined }));
                      }}
                      className={`flex-1 py-2 px-3 rounded-lg text-xs font-bold transition-all ${
                        regMode === 'manual'
                          ? 'bg-white text-blue-900 shadow-xs'
                          : 'text-slate-600 hover:text-slate-900'
                      }`}
                    >
                      Tự nhập thông tin mới
                    </button>
                  </div>
                )}

                <div className="space-y-4">
                  {isEligibleMode ? (
                    <div className="relative">
                      <Field
                        label="Thí sinh (thuộc danh sách thí sinh đủ điều kiện)"
                        required
                        icon={<User className="h-4 w-4 text-slate-400" />}
                        error={formErrors.fullName}
                      >
                        {selectedEligible ? (
                          <div className="rounded-2xl border-2 border-blue-500/80 bg-blue-50/70 p-4 transition-all">
                            <div className="flex items-start justify-between gap-3">
                              <div>
                                <div className="flex items-center gap-2">
                                  <span className="inline-flex items-center justify-center rounded-md bg-blue-700 px-2 py-0.5 text-xs font-black text-white">
                                    SBD #{selectedEligible.orderNumber}
                                  </span>
                                  <span className="text-base font-extrabold text-blue-950">{selectedEligible.fullName}</span>
                                </div>
                                <p className="mt-1 text-xs font-semibold text-blue-800">{selectedEligible.unit}</p>
                                {selectedEligible.totalScorePreliminary != null && (
                                  <div className="mt-2.5 flex items-center">
                                    <span className="rounded-md bg-blue-700 px-2.5 py-0.5 text-xs font-bold text-white shadow-xs">
                                      Tổng điểm sơ loại: {selectedEligible.totalScorePreliminary}đ
                                    </span>
                                  </div>
                                )}
                              </div>
                              {!isFormLocked && (
                                <button
                                  type="button"
                                  onClick={() => {
                                    setSelectedEligible(null);
                                    setForm((prev) => ({ ...prev, fullName: '', unit: '' }));
                                  }}
                                  className="rounded-lg bg-blue-200/70 px-2.5 py-1 text-xs font-bold text-blue-900 hover:bg-blue-300 transition-colors"
                                  title="Chọn lại thí sinh khác"
                                >
                                  Đổi
                                </button>
                              )}
                            </div>
                          </div>
                        ) : (
                          <div className="relative">
                            <input
                              className={inputClass(formErrors.fullName)}
                              value={eligibleSearch}
                              disabled={isFormLocked}
                              onChange={(e) => {
                                setEligibleSearch(e.target.value);
                                setShowEligibleDropdown(true);
                              }}
                              onFocus={() => setShowEligibleDropdown(true)}
                              onBlur={() => window.setTimeout(() => setShowEligibleDropdown(false), 200)}
                              placeholder="Gõ tìm kiếm họ tên hoặc đơn vị trong danh sách..."
                            />
                            {showEligibleDropdown && !isFormLocked && (
                              <div className="absolute z-30 mt-1.5 max-h-60 w-full overflow-y-auto rounded-2xl border border-slate-200 bg-white shadow-2xl">
                                <div className="sticky top-0 bg-slate-100 px-3.5 py-2 text-xs font-bold text-slate-500 uppercase tracking-wider border-b border-slate-200">
                                  Danh sách thí sinh đủ điều kiện ({filteredEligible.length} kết quả)
                                </div>
                                {filteredEligible.length > 0 ? (
                                  filteredEligible.map((candidate) => (
                                    <button
                                      key={candidate.id}
                                      type="button"
                                      disabled={candidate.isRegistered}
                                      className={`w-full px-4 py-3 text-left text-sm transition-colors border-b border-slate-100 flex items-center justify-between gap-3 ${
                                        candidate.isRegistered
                                          ? 'bg-slate-50 text-slate-400 cursor-not-allowed opacity-60'
                                          : 'hover:bg-emerald-50 hover:text-emerald-950 text-slate-800'
                                      }`}
                                      onMouseDown={(e) => e.preventDefault()}
                                      onClick={() => handleSelectEligible(candidate)}
                                    >
                                      <div>
                                        <div className="flex items-center gap-2">
                                          <span className="text-xs font-mono font-bold text-slate-400">#{candidate.orderNumber}</span>
                                          <span className="font-bold">{candidate.fullName}</span>
                                        </div>
                                        <p className="text-xs text-slate-500 mt-0.5">{candidate.unit}</p>
                                      </div>
                                      <div className="text-right shrink-0">
                                        {candidate.isRegistered ? (
                                          <span className="text-[11px] font-semibold text-amber-700 bg-amber-100 px-2 py-0.5 rounded-full">
                                            Đã đăng ký
                                          </span>
                                        ) : (
                                          candidate.totalScorePreliminary != null && (
                                            <span className="text-xs font-black text-emerald-700 bg-emerald-100/70 px-2 py-0.5 rounded-md">
                                              {candidate.totalScorePreliminary}đ
                                            </span>
                                          )
                                        )}
                                      </div>
                                    </button>
                                  ))
                                ) : (
                                  <div className="px-4 py-6 text-center text-xs text-slate-500">
                                    <p className="italic">Không tìm thấy thí sinh nào phù hợp trong danh sách.</p>
                                    {!isStrictWhitelist && (
                                      <button
                                        type="button"
                                        onMouseDown={(e) => {
                                          e.preventDefault();
                                          setShowEligibleDropdown(false);
                                          setSelectedEligible(null);
                                          setForm((prev) => ({ ...prev, fullName: '', unit: '' }));
                                          setRegMode('manual');
                                        }}
                                        className="mt-2 inline-flex items-center gap-1 font-bold text-blue-600 hover:underline"
                                      >
                                        Bấm vào đây để tự nhập thông tin thí sinh →
                                      </button>
                                    )}
                                  </div>
                                )}
                              </div>
                            )}
                            {!isStrictWhitelist && !selectedEligible && (
                              <div className="mt-1.5 text-right">
                                <button
                                  type="button"
                                  onClick={() => {
                                    setSelectedEligible(null);
                                    setForm((prev) => ({ ...prev, fullName: '', unit: '' }));
                                    setRegMode('manual');
                                  }}
                                  className="text-[11px] font-semibold text-blue-600 hover:text-blue-800 hover:underline"
                                >
                                  Không có tên bạn trong danh sách? Tự nhập thông tin tại đây
                                </button>
                              </div>
                            )}
                          </div>
                        )}
                      </Field>
                    </div>
                  ) : (
                    <>
                      <Field label="Họ và tên" required icon={<User className="h-4 w-4 text-slate-400" />} error={formErrors.fullName}>
                        <input
                          className={inputClass(formErrors.fullName)}
                          value={form.fullName}
                          disabled={isFormLocked}
                          onChange={(e) => {
                            setForm((prev) => ({ ...prev, fullName: e.target.value }));
                            if (formErrors.fullName) setFormErrors((prev) => ({ ...prev, fullName: undefined }));
                          }}
                          onBlur={() => setFormErrors((prev) => ({ ...prev, fullName: validateField('fullName', form.fullName) }))}
                          placeholder="Nguyễn Văn A"
                        />
                      </Field>

                      <div className="relative">
                        <Field label="Đơn vị công tác" required icon={<Building2 className="h-4 w-4 text-slate-400" />} error={formErrors.unit}>
                          <input
                            className={inputClass(formErrors.unit)}
                            value={form.unit}
                            disabled={isFormLocked}
                            onChange={(e) => {
                              setForm((prev) => ({ ...prev, unit: e.target.value }));
                              setUnitSearch(e.target.value);
                              setShowUnitDropdown(true);
                              if (e.target.value !== 'Khác') {
                                setUnitOther('');
                              }
                              if (formErrors.unit) setFormErrors((prev) => ({ ...prev, unit: undefined }));
                            }}
                            onFocus={() => !isFormLocked && setShowUnitDropdown(true)}
                            onBlur={() => {
                              window.setTimeout(() => setShowUnitDropdown(false), 200);
                              const submittedUnit = form.unit === 'Khác' ? (unitOther.trim() || 'Khác') : form.unit;
                              setFormErrors((prev) => ({ ...prev, unit: validateField('unit', submittedUnit) }));
                            }}
                            placeholder="Chọn đơn vị công tác"
                          />
                        </Field>

                        {showUnitDropdown && form.unit !== 'Khác' && !isFormLocked && (
                          <div className="absolute z-20 mt-1.5 max-h-52 w-full overflow-y-auto rounded-2xl border border-slate-200 bg-white shadow-xl">
                            {filteredUnits.length > 0 ? (
                              filteredUnits.map((unit) => (
                                <button
                                  key={unit.id}
                                  type="button"
                                  className="w-full px-4 py-3 text-left text-sm text-slate-700 transition-colors hover:bg-green-50 hover:text-green-800"
                                  onMouseDown={(e) => e.preventDefault()}
                                  onClick={() => {
                                    setForm((prev) => ({ ...prev, unit: unit.name }));
                                    setUnitSearch('');
                                    setShowUnitDropdown(false);
                                  }}
                                >
                                  {unit.name}
                                </button>
                              ))
                            ) : (
                              <div className="px-4 py-3 text-xs italic text-slate-400">Không tìm thấy kết quả phù hợp</div>
                            )}
                            <button
                              type="button"
                              className="w-full rounded-b-2xl border-t border-slate-100 px-4 py-3.5 text-left text-sm font-semibold text-slate-700 transition-colors hover:bg-amber-50 hover:text-amber-800"
                              onMouseDown={(e) => e.preventDefault()}
                              onClick={() => {
                                setForm((prev) => ({ ...prev, unit: 'Khác' }));
                                setShowUnitDropdown(false);
                              }}
                            >
                              Khác (Nhập đơn vị mới)
                            </button>
                          </div>
                        )}

                        {form.unit === 'Khác' && (
                          <input
                            className={`${inputClass(undefined)} mt-2.5`}
                            value={unitOther}
                            disabled={isFormLocked}
                            onChange={(e) => setUnitOther(e.target.value)}
                            placeholder="Nhập tên đơn vị công tác cụ thể"
                          />
                        )}
                      </div>
                    </>
                  )}

                  <Field label="Số điện thoại cá nhân" required icon={<Phone className="h-4 w-4 text-slate-400" />} error={formErrors.phone}>
                    <input
                      className={inputClass(formErrors.phone)}
                      value={form.phone}
                      disabled={isFormLocked}
                      onChange={(e) => {
                        setForm((prev) => ({ ...prev, phone: e.target.value }));
                        if (formErrors.phone) setFormErrors((prev) => ({ ...prev, phone: undefined }));
                      }}
                      onBlur={() => setFormErrors((prev) => ({ ...prev, phone: validateField('phone', form.phone) }))}
                      placeholder="0912 345 678"
                    />
                  </Field>

                  <Field label="Email xác thực" required icon={<Mail className="h-4 w-4 text-slate-400" />} error={formErrors.email}>
                    <input
                      className={inputClass(formErrors.email)}
                      value={form.email}
                      disabled={isFormLocked}
                      onChange={(e) => {
                        setForm((prev) => ({ ...prev, email: e.target.value }));
                        if (formErrors.email) setFormErrors((prev) => ({ ...prev, email: undefined }));
                      }}
                      onBlur={() => setFormErrors((prev) => ({ ...prev, email: validateField('email', form.email) }))}
                      placeholder="your-email@gmail.com"
                    />
                  </Field>
                </div>

                <div className="rounded-2xl bg-amber-50/50 border border-amber-200/50 p-4 text-xs text-amber-800 leading-relaxed flex gap-2.5">
                  <AlertCircle className="h-4.5 w-4.5 text-amber-600 shrink-0 mt-0.5" />
                  <span>
                    <strong>Lưu ý:</strong> Mỗi số điện thoại chỉ được tham gia thi <strong>01 lần duy nhất</strong> trong mỗi đợt thi. Một địa chỉ email có thể hỗ trợ xác thực tối đa cho 10 thí sinh.
                  </span>
                </div>

                {captchaEnabled && turnstileSiteKey ? (
                  <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3">
                    <TurnstileWidget
                      siteKey={turnstileSiteKey}
                      resetKey={captchaResetKey}
                      onToken={setCaptchaToken}
                      onExpire={() => setCaptchaToken('')}
                    />
                  </div>
                ) : captchaEnabled && !turnstileSiteKey ? (
                  <div className="rounded-2xl border border-amber-300 bg-amber-50 px-4 py-3 text-xs text-amber-800 leading-relaxed">
                    ⚠️ Tính năng xác thực bot đang bật nhưng chưa có Turnstile Site Key. Vui lòng cấu hình VITE_TURNSTILE_SITE_KEY trong file .env.
                  </div>
                ) : null}

                <div className="pt-2">
                  <button
                    type="button"
                    onClick={requestOtp}
                    disabled={requestingOtp || (captchaEnabled && !captchaToken)}
                    className="flex w-full items-center justify-center gap-2 rounded-2xl bg-blue-600 py-3.5 font-bold text-white shadow-lg shadow-blue-600/25 transition-all active:scale-[0.98] hover:bg-blue-700 disabled:opacity-50"
                  >
                    {requestingOtp ? (
                      <>
                        <LoaderCircle className="h-5 w-5 animate-spin" />
                        Đang gửi mã...
                      </>
                    ) : (
                      'Vào thi'
                    )}
                  </button>
                </div>
              </div>
            ) : (
              <div className="space-y-6">
                <div className="flex items-center gap-3">
                  <button
                    type="button"
                    onClick={() => {
                      if (!isProgressState) {
                        setEntryStatus('idle');
                      }
                    }}
                    disabled={isProgressState}
                    className="inline-flex h-9 w-9 items-center justify-center rounded-full text-slate-500 transition-colors hover:bg-slate-100 disabled:opacity-30"
                    aria-label="Quay lại bước trước"
                  >
                    <ArrowLeft className="h-4 w-4" />
                  </button>
                  <div>
                    <span className="rounded-full bg-green-100/60 px-3 py-1 text-[10px] font-black uppercase tracking-wider text-green-700">Bước 2/2</span>
                    <h2 className="mt-2 text-xl font-black text-slate-800 md:text-2xl">Xác thực mã OTP</h2>
                  </div>
                </div>

                <div className="flex flex-col gap-1 rounded-2xl border border-green-100 bg-green-50/70 p-4 text-xs text-green-950 shadow-sm md:text-sm">
                  <span className="font-semibold text-green-800">Một mã OTP 6 chữ số đã được gửi đến email:</span>
                  <span className="mt-1 truncate font-mono text-base font-bold text-green-900">{form.email}</span>
                </div>

                <div className="space-y-4">
                  <Field label="Nhập mã OTP" required icon={<ShieldCheck className="h-4 w-4 text-slate-400" />} error={formErrors.otp}>
                    <input
                      className="w-full rounded-2xl border-2 border-slate-200 bg-white px-5 py-3.5 text-center text-xl font-black tracking-[0.4em] outline-none transition-all placeholder:font-normal placeholder:tracking-normal placeholder:text-slate-300 focus:border-green-600 focus:shadow-[0_0_0_4px_rgba(21,128,61,0.1)] disabled:cursor-not-allowed disabled:bg-slate-100 disabled:text-slate-500"
                      value={otp}
                      disabled={verifyingOtp || isProgressState}
                      onChange={(e) => {
                        const val = e.target.value.replace(/\D/g, '');
                        setOtp(val);
                        if (formErrors.otp) setFormErrors((prev) => ({ ...prev, otp: undefined }));
                      }}
                      placeholder="------"
                      maxLength={6}
                    />
                  </Field>

                  {captchaEnabled && turnstileSiteKey ? (
                    <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3">
                      <TurnstileWidget
                        siteKey={turnstileSiteKey}
                        resetKey={captchaResetKey}
                        onToken={setCaptchaToken}
                        onExpire={() => setCaptchaToken('')}
                      />
                    </div>
                  ) : captchaEnabled && !turnstileSiteKey ? (
                    <div className="rounded-2xl border border-amber-300 bg-amber-50 px-4 py-3 text-xs text-amber-800 leading-relaxed">
                      ⚠️ Tính năng xác thực bot đang bật nhưng chưa có Turnstile Site Key. Vui lòng cấu hình VITE_TURNSTILE_SITE_KEY trong file .env.
                    </div>
                  ) : null}

                  <div className="flex justify-center pt-2">
                    <button
                      type="button"
                      onClick={requestOtp}
                      disabled={requestingOtp || resendCountdown > 0 || isProgressState || (captchaEnabled && !captchaToken)}
                      className="text-xs font-semibold text-blue-700 transition-colors hover:text-blue-800 disabled:text-slate-400 disabled:opacity-75"
                    >
                      {requestingOtp
                        ? 'Đang gửi...'
                        : resendCountdown > 0
                        ? `Thử lại sau ${resendCountdown} giây`
                        : 'Không nhận được mã? Gửi lại'}
                    </button>
                  </div>

                  <div className="rounded-2xl bg-slate-50 border border-slate-200/60 p-4 text-xs text-slate-500 leading-relaxed flex gap-2.5">
                    <AlertCircle className="h-4.5 w-4.5 text-slate-400 shrink-0 mt-0.5" />
                    <span>
                      Nếu không nhận được mã OTP, vui lòng kiểm tra hộp thư rác (Spam) hoặc thử lại sau khi hết thời gian đếm ngược. Nếu vẫn gặp sự cố, xin vui lòng liên hệ Ban tổ chức để được hỗ trợ.
                    </span>
                  </div>

                  <div className="pt-2">
                    <button
                      type="button"
                      onClick={handleVerifyAndStartExam}
                      disabled={otp.length !== 6 || verifyingOtp || submitting || isProgressState}
                      className="flex w-full items-center justify-center gap-2 rounded-2xl bg-blue-600 py-3.5 font-bold text-white shadow-lg shadow-blue-600/25 transition-all active:scale-[0.98] hover:bg-blue-700 disabled:opacity-50"
                    >
                      {verifyingOtp || submitting ? (
                        <>
                          <LoaderCircle className="h-5 w-5 animate-spin" />
                          Đang xác thực...
                        </>
                      ) : (
                        'Vào thi'
                      )}
                    </button>
                  </div>
                </div>

                {entryStatus === 'entryFailed' && (
                  <div className="space-y-3.5 rounded-2xl border border-amber-200 bg-amber-50/70 p-4 shadow-sm">
                    <div className="flex items-start gap-2.5 text-amber-900">
                      <AlertCircle className="mt-0.5 h-5 w-5 shrink-0" />
                      <div>
                        <p className="text-sm font-bold">Không thể truy cập bài thi</p>
                        <p className="text-xs leading-relaxed text-amber-800">
                          Hệ thống gặp sự cố kết nối khi tạo phiên thi của bạn. Tuy nhiên, email đã được xác minh thành công. Bạn có thể nhấn nút dưới để vào lại.
                        </p>
                      </div>
                    </div>
                    {canRetryAutoStart && (
                      <button
                        type="button"
                        onClick={() => void startExam()}
                        className="w-full rounded-2xl bg-amber-500 py-3 font-bold text-white shadow-md shadow-amber-500/25 transition-all active:scale-[0.98] hover:bg-amber-600"
                      >
                        Thử vào thi lại
                      </button>
                    )}
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

function InfoCard({ icon, title, description }: { icon: ReactNode; title: string; description: string }) {
  return (
    <div className="flex items-start gap-4 rounded-2xl border border-white/10 bg-white/5 p-4 backdrop-blur-sm">
      <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-white/10">
        {icon}
      </div>
      <div>
        <p className="text-base font-extrabold leading-normal text-white">{title}</p>
        <p className="mt-1 text-sm leading-relaxed text-green-200/70">{description}</p>
      </div>
    </div>
  );
}

function InfoChip({ icon, label }: { icon: ReactNode; label: string }) {
  return (
    <span className="inline-flex items-center gap-1.5 rounded-full border border-white/10 bg-white/5 px-3 py-1.5 text-xs font-semibold text-green-100">
      {icon}
      {label}
    </span>
  );
}

function Field({
  label,
  required,
  icon,
  error,
  children,
}: {
  label: string;
  required?: boolean;
  icon: ReactNode;
  error?: string;
  children: ReactNode;
}) {
  return (
    <div className="space-y-2">
      <label className="flex items-center gap-2 text-sm font-bold text-slate-700">
        {icon}
        <span>{label}</span>
        {required && <span className="text-red-500">*</span>}
      </label>
      {children}
      {error && (
        <p className="flex items-center gap-1.5 text-xs font-medium text-red-500">
          <AlertCircle className="h-3.5 w-3.5 shrink-0" />
          <span>{error}</span>
        </p>
      )}
    </div>
  );
}

function inputClass(error?: string) {
  return `w-full rounded-2xl border-2 bg-white px-4 py-3 text-sm outline-none transition-all disabled:cursor-not-allowed disabled:bg-slate-100 disabled:text-slate-500 md:text-base ${
    error
      ? 'border-red-400 focus:border-red-500 focus:shadow-[0_0_0_4px_rgba(239,68,68,0.1)]'
      : 'border-slate-200 focus:border-blue-600 focus:shadow-[0_0_0_4px_rgba(37,99,235,0.15)]'
  }`;
}
