import { useEffect, useState } from 'react';
import { useParams, useNavigate } from "react-router-dom";
import { adminApi } from '../../../api/admin/adminApi';
import { AdminSidebar } from './AdminDashboard';
import { ArrowLeft, User, Building2, Phone, Clock, CheckCircle2, XCircle, Trophy, BookOpen, Video } from 'lucide-react';
import type { AdminExamDetail } from '../../../types';
 
const OPTION_KEYS = ['A', 'B', 'C', 'D', 'E'] as const;
 
function fmt(s: number | null | undefined) {
  if (s == null) return '—';
  return `${Math.floor(s / 60)} phút ${s % 60} giây`;
}
 
function parseDate(iso: string) {
  // If the ISO string does not have timezone info, treat it as ICT (Asia/Ho_Chi_Minh, +07:00).
  const normalized = iso.includes('Z') || /[+-]\d{2}(:\d{2})?$/.test(iso)
    ? iso
    : `${iso}+07:00`;
  return new Date(normalized);
}

function fmtExamPeriod(startIso?: string | null, endIso?: string | null) {
  if (!startIso) return '—';
  const dStart = parseDate(startIso);
  if (isNaN(dStart.getTime())) return startIso;

  const timeFormat: Intl.DateTimeFormatOptions = {
    timeZone: 'Asia/Ho_Chi_Minh',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false,
  };
  const dateFormat: Intl.DateTimeFormatOptions = {
    timeZone: 'Asia/Ho_Chi_Minh',
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  };

  const startTimeStr = dStart.toLocaleTimeString('vi-VN', timeFormat);
  const startDateStr = dStart.toLocaleDateString('vi-VN', dateFormat);

  if (!endIso) {
    return `${startTimeStr} ngày ${startDateStr}`;
  }

  const dEnd = parseDate(endIso);
  if (isNaN(dEnd.getTime())) {
    return `${startTimeStr} ngày ${startDateStr} → ${endIso}`;
  }

  const endTimeStr = dEnd.toLocaleTimeString('vi-VN', timeFormat);
  const endDateStr = dEnd.toLocaleDateString('vi-VN', dateFormat);

  if (startDateStr === endDateStr) {
    return `${startTimeStr} – ${endTimeStr} (${startDateStr})`;
  }
  return `${startTimeStr} ${startDateStr} – ${endTimeStr} ${endDateStr}`;
}

export default function AdminExamDetail() {
  const { examId } = useParams<{ examId: string }>();
  const navigate = useNavigate();
  const [detail, setDetail] = useState<AdminExamDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!examId) return;
    setLoading(true);
    adminApi
      .getExamDetail(Number(examId))
      .then((res) => setDetail(res.data.data))
      .catch(() => setError('Không thể tải thông tin bài thi.'))
      .finally(() => setLoading(false));
  }, [examId]);

  const mcAnswers = detail?.answers.filter((a) => a.questionType === 'MC') ?? [];
  const scAnswers = detail?.answers.filter((a) => a.questionType === 'SC') ?? [];
  const hasScenarios = Boolean(detail?.hasScenarios || scAnswers.length > 0);
  const totalQuestions = mcAnswers.length + (hasScenarios ? scAnswers.length : 0);
  const maxScore = totalQuestions > 0 ? totalQuestions : (detail?.hasScenarios ? 20 : 30);
 
  return (
    <div className="flex flex-col lg:flex-row min-h-screen bg-slate-50 font-sans">
      <AdminSidebar active="dashboard" />
      <main className="flex-1 p-6 lg:p-8 space-y-6 min-w-0">
        {/* Header */}
        <div className="flex items-center gap-4">
          <button
            onClick={() => navigate(-1)}
            className="w-10 h-10 rounded-full bg-white border border-slate-200 flex items-center justify-center hover:bg-slate-50 transition-colors shadow-sm shrink-0"
          >
            <ArrowLeft className="w-5 h-5 text-slate-600" />
          </button>
          <div>
            <h1 className="text-2xl font-extrabold text-slate-800">Chi tiết bài thi</h1>
            {detail && (
              <p className="text-sm text-slate-500 mt-0.5">
                {detail.fullName} · {detail.phaseName ?? 'Không rõ đợt thi'}
              </p>
            )}
          </div>
        </div>
 
        {loading ? (
          <div className="flex justify-center py-20">
            <div className="w-10 h-10 border-4 border-teal-200 border-t-teal-700 rounded-full animate-spin" />
          </div>
        ) : error ? (
          <div className="bg-red-50 border border-red-200 rounded-2xl p-8 text-center text-red-600 font-semibold">
            {error}
          </div>
        ) : detail ? (
          <>
            {/* Personal info + score summary */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
              {/* Personal info */}
              <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
                <div className="bg-teal-700 px-5 py-3 flex items-center gap-2">
                  <User className="w-4 h-4 text-white" />
                  <span className="text-white text-sm font-bold uppercase tracking-wider">Thông tin thí sinh</span>
                </div>
                <div className="p-5 space-y-3">
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-xl bg-teal-50 border border-teal-200 flex items-center justify-center shrink-0">
                      <User className="w-4 h-4 text-teal-600" />
                    </div>
                    <div>
                      <p className="text-xs text-slate-400 font-medium">Họ và tên</p>
                      <p className="text-sm font-bold text-slate-800">{detail.fullName}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-xl bg-teal-50 border border-teal-200 flex items-center justify-center shrink-0">
                      <Building2 className="w-4 h-4 text-teal-600" />
                    </div>
                    <div>
                      <p className="text-xs text-slate-400 font-medium">Đơn vị công tác</p>
                      <p className="text-sm font-bold text-slate-800">{detail.unit}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-xl bg-teal-50 border border-teal-200 flex items-center justify-center shrink-0">
                      <Phone className="w-4 h-4 text-teal-600" />
                    </div>
                    <div>
                      <p className="text-xs text-slate-400 font-medium">Số điện thoại</p>
                      <p className="text-sm font-bold text-slate-800">{detail.phone}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-xl bg-teal-50 border border-teal-200 flex items-center justify-center shrink-0">
                      <Clock className="w-4 h-4 text-teal-600" />
                    </div>
                    <div>
                      <p className="text-xs text-slate-400 font-medium">Thời gian thi</p>
                      <p className="text-sm font-semibold text-slate-700">
                        {fmtExamPeriod(detail.startTime, detail.endTime)}
                      </p>
                    </div>
                  </div>
                </div>
              </div>

              {/* Score summary */}
              <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
                <div className="bg-amber-500 px-5 py-3 flex items-center gap-2">
                  <Trophy className="w-4 h-4 text-white" />
                  <span className="text-white text-sm font-bold uppercase tracking-wider">Kết quả bài thi</span>
                </div>
                <div className="p-5">
                  {/* Total score big display */}
                  <div className="flex items-center justify-center mb-5">
                    <div className="w-24 h-24 rounded-full border-4 border-teal-600 flex flex-col items-center justify-center">
                      <span className="text-3xl font-black text-teal-700">{detail.totalScore}</span>
                      <span className="text-xs text-slate-400 font-medium">/{maxScore} điểm</span>
                    </div>
                  </div>
                  {hasScenarios ? (
                    <div className="grid grid-cols-2 gap-3 mb-4">
                      <div className="bg-teal-50 border border-teal-100 rounded-xl p-3 text-center">
                        <p className="text-xs text-slate-500 font-medium mb-1">Trắc nghiệm</p>
                        <p className="text-xl font-black text-teal-700">
                          {detail.mcScore}
                          <span className="text-slate-400 font-normal text-xs">/{mcAnswers.length || 10}</span>
                        </p>
                      </div>
                      <div className="bg-lime-50 border border-lime-200 rounded-xl p-3 text-center">
                        <p className="text-xs text-slate-500 font-medium mb-1">Tình huống</p>
                        <p className="text-xl font-black text-teal-700">
                          {detail.scenarioScore}
                          <span className="text-slate-400 font-normal text-xs">/{scAnswers.length || 10}</span>
                        </p>
                      </div>
                    </div>
                  ) : (
                    <div className="bg-teal-50 border border-teal-100 rounded-xl p-3 text-center mb-4">
                      <p className="text-xs text-slate-500 font-medium mb-1">Số câu đúng</p>
                      <p className="text-xl font-black text-teal-700">
                        {detail.mcScore}
                        <span className="text-slate-400 font-normal text-sm"> / {mcAnswers.length || 30} câu</span>
                      </p>
                    </div>
                  )}
                  <div className="flex items-center justify-between text-sm bg-slate-50 rounded-xl px-4 py-2.5">
                    <span className="text-slate-500 font-medium flex items-center gap-1.5">
                      <Clock className="w-3.5 h-3.5" /> Thời gian làm bài
                    </span>
                    <span className="font-bold text-slate-700">{fmt(detail.durationSeconds)}</span>
                  </div>
                  {detail.prediction != null && (
                    <div className="flex items-center justify-between text-sm bg-slate-50 rounded-xl px-4 py-2.5 mt-2">
                      <span className="text-slate-500 font-medium">Dự đoán</span>
                      <span className="font-bold text-violet-700">{detail.prediction} người</span>
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* MC Answers */}
            {mcAnswers.length > 0 && (
              <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
                <div className="bg-slate-800 px-5 py-3 flex items-center gap-2">
                  <BookOpen className="w-4 h-4 text-slate-300" />
                  <span className="text-white text-sm font-bold uppercase tracking-wider">
                    {hasScenarios ? 'Phần 1 — Trắc nghiệm' : 'Câu hỏi trắc nghiệm'}
                  </span>
                  <span className="ml-auto text-slate-400 text-xs">
                    {mcAnswers.filter((a) => a.isCorrect).length}/{mcAnswers.length} câu đúng
                  </span>
                </div>
                <div className="divide-y divide-slate-100">
                  {mcAnswers.map((a, i) => (
                    <div key={a.questionId} className="p-5">
                      <div className="flex items-start gap-3 mb-3">
                        <span className={`shrink-0 w-7 h-7 rounded-full flex items-center justify-center text-xs font-black ${
                          a.isCorrect ? 'bg-emerald-100 text-emerald-700' : 'bg-red-100 text-red-600'
                        }`}>
                          {i + 1}
                        </span>
                        <p className="text-sm font-semibold text-slate-800 leading-relaxed">{a.questionContent}</p>
                        <span className="shrink-0 ml-auto">
                          {a.isCorrect
                            ? <CheckCircle2 className="w-5 h-5 text-emerald-500" />
                            : <XCircle className="w-5 h-5 text-red-400" />}
                        </span>
                      </div>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 ml-10">
                        {OPTION_KEYS.filter((k) => a[`option${k}` as keyof typeof a]).map((k) => {
                          const isSelected = a.selectedAnswer === k;
                          const isCorrect = a.correctAnswer === k;
                          return (
                            <div
                              key={k}
                              className={`flex items-start gap-2 px-3 py-2.5 rounded-xl border text-xs ${
                                isCorrect
                                  ? 'bg-emerald-50 border-emerald-300 text-emerald-800'
                                  : isSelected
                                  ? 'bg-red-50 border-red-300 text-red-700'
                                  : 'bg-slate-50 border-slate-200 text-slate-600'
                              }`}
                            >
                              <span className="font-extrabold shrink-0">{k}.</span>
                              <span className="leading-snug">{a[`option${k}` as 'optionA']}</span>
                              {isSelected && !isCorrect && (
                                <span className="ml-auto shrink-0 text-red-500 font-bold">✗ Chọn</span>
                              )}
                              {isCorrect && (
                                <span className="ml-auto shrink-0 text-emerald-600 font-bold">✓</span>
                              )}
                            </div>
                          );
                        })}
                      </div>
                      {!a.selectedAnswer && (
                        <p className="ml-10 mt-2 text-xs text-slate-400 italic">Bỏ qua câu này</p>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}
 
            {/* SC Answers */}
            {hasScenarios && scAnswers.length > 0 && (
              <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
                <div className="bg-slate-800 px-5 py-3 flex items-center gap-2">
                  <Video className="w-4 h-4 text-slate-300" />
                  <span className="text-white text-sm font-bold uppercase tracking-wider">Phần 2 — Tình huống</span>
                  <span className="ml-auto text-slate-400 text-xs">
                    {scAnswers.filter((a) => a.isCorrect).length}/{scAnswers.length} câu đúng
                  </span>
                </div>
                <div className="divide-y divide-slate-100">
                  {scAnswers.map((a, i) => (
                    <div key={a.questionId} className="p-5">
                      <div className="flex items-start gap-3 mb-3">
                        <span className={`shrink-0 w-7 h-7 rounded-full flex items-center justify-center text-xs font-black ${
                          a.isCorrect ? 'bg-emerald-100 text-emerald-700' : 'bg-red-100 text-red-600'
                        }`}>
                          {i + 1}
                        </span>
                        <p className="text-sm font-semibold text-slate-800 leading-relaxed">{a.questionContent}</p>
                        <span className="shrink-0 ml-auto">
                          {a.isCorrect
                            ? <CheckCircle2 className="w-5 h-5 text-emerald-500" />
                            : <XCircle className="w-5 h-5 text-red-400" />}
                        </span>
                      </div>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 ml-10">
                        {OPTION_KEYS.filter((k) => a[`option${k}` as keyof typeof a]).map((k) => {
                          const isSelected = a.selectedAnswer === k;
                          const isCorrect = a.correctAnswer === k;
                          return (
                            <div
                              key={k}
                              className={`flex items-start gap-2 px-3 py-2.5 rounded-xl border text-xs ${
                                isCorrect
                                  ? 'bg-emerald-50 border-emerald-300 text-emerald-800'
                                  : isSelected
                                  ? 'bg-red-50 border-red-300 text-red-700'
                                  : 'bg-slate-50 border-slate-200 text-slate-600'
                              }`}
                            >
                              <span className="font-extrabold shrink-0">{k}.</span>
                              <span className="leading-snug">{a[`option${k}` as 'optionA']}</span>
                              {isSelected && !isCorrect && (
                                <span className="ml-auto shrink-0 text-red-500 font-bold">✗ Chọn</span>
                              )}
                              {isCorrect && (
                                <span className="ml-auto shrink-0 text-emerald-600 font-bold">✓</span>
                              )}
                            </div>
                          );
                        })}
                      </div>
                      {!a.selectedAnswer && (
                        <p className="ml-10 mt-2 text-xs text-slate-400 italic">Bỏ qua câu này</p>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}
          </>
        ) : null}
      </main>
    </div>
  );
}
