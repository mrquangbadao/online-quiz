import { useEffect, useState, useCallback, useRef } from 'react';
import { useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from 'framer-motion';
import { adminApi, type ContestPhase } from '../../../api/admin/adminApi';
import { leaderboardApi } from '../../../api/leaderboardApi';
import { useAuthStore } from '../../../store/authStore';
import BrandMark from '../../components/BrandMark';
import { toast } from '../../components/ui/Toast';
import {
  FileText, Building2, Download, LogOut,
  Users, Target, Zap, Activity, Settings,
  PlayCircle, StopCircle, Trophy, Trash2, KeyRound, UserPlus, UserCheck,
  RefreshCw, Search, Award, AlertTriangle, CheckCircle2, Clock, RotateCcw, Undo2, Sparkles
} from 'lucide-react';
import { extractApiError } from '../../../hooks/useApiError';
import type { LeaderboardEntry } from '../../../types';

interface Stats {
  totalParticipants: number;
  averageScore: number;
  perfectScores: number;
  inProgress: number;
}

import AdminSidebar from './AdminSidebar';
export { AdminSidebar };

export default function AdminDashboard() {
  const navigate = useNavigate();
  const [stats, setStats] = useState<Stats | null>(null);

  // Phases
  const [phases, setPhases] = useState<ContestPhase[]>([]);
  const [currentPhase, setCurrentPhase] = useState<ContestPhase | null>(null);
  const [selectedPhaseId, setSelectedPhaseId] = useState<number | undefined>(undefined);
  const [phaseLoading, setPhaseLoading] = useState(false);

  // Leaderboard data
  const [lbEntries, setLbEntries] = useState<LeaderboardEntry[]>([]);
  const [lbLoading, setLbLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  // Live Auto-Refresh State
  const [autoRefresh, setAutoRefresh] = useState(true);
  const [lastRefreshedAt, setLastRefreshedAt] = useState<Date>(new Date());
  const [isRefreshing, setIsRefreshing] = useState(false);

  // Modals
  const [showEndPhaseModal, setShowEndPhaseModal] = useState(false);
  const [endPhaseLoading, setEndPhaseLoading] = useState(false);
  const [showStartModal, setShowStartModal] = useState(false);
  const [newPhaseName, setNewPhaseName] = useState('');
  const [newPhaseType, setNewPhaseType] = useState<'STANDARD' | 'LIVE_ARENA'>('STANDARD');
  const [newPhaseWhitelist, setNewPhaseWhitelist] = useState(true);
  const [newPhaseMcCount, setNewPhaseMcCount] = useState(30);
  const [newPhaseTimeLimit, setNewPhaseTimeLimit] = useState(20);
  const [deletePhaseId, setDeletePhaseId] = useState<number | null>(null);
  const [deleteLoading, setDeleteLoading] = useState(false);

  // Reactivate Phase Modal
  const [showReactivateModal, setShowReactivateModal] = useState(false);
  const [reactivatePhaseId, setReactivatePhaseId] = useState<number | null>(null);
  const [reactivateLoading, setReactivateLoading] = useState(false);

  // Exam Reset (Allow Retake) Modal
  const [resetExamEntry, setResetExamEntry] = useState<LeaderboardEntry | null>(null);
  const [resetLoading, setResetLoading] = useState(false);

  // Load phases
  const loadPhases = useCallback(async () => {
    try {
      const [phasesRes, currentRes] = await Promise.all([
        adminApi.getPhases(),
        adminApi.getCurrentPhase(),
      ]);
      const phaseList = phasesRes.data.data;
      const curr = currentRes.data.data;
      setPhases(phaseList);
      setCurrentPhase(curr);
      return { phases: phaseList, currentPhase: curr };
    } catch {
      return { phases: [], currentPhase: null };
    }
  }, []);

  // Live rank transitions tracking (Quizlet / Kahoot style)
  const prevRanksRef = useRef<Map<number, number>>(new Map());
  const [rankChanges, setRankChanges] = useState<Record<number, number>>({});

  // Fetch Stats and Leaderboard
  const fetchLiveData = useCallback(async (phaseId?: number, showSpinner = false) => {
    if (showSpinner) setIsRefreshing(true);
    try {
      const [statsRes, lbRes] = await Promise.all([
        adminApi.getDashboard(phaseId),
        leaderboardApi.getLeaderboard(phaseId),
      ]);
      setStats(statsRes.data.data);
      const newEntries: LeaderboardEntry[] = lbRes.data.data.entries;

      // Track rank movement across updates
      const changes: Record<number, number> = {};
      newEntries.forEach((entry, newIdx) => {
        const oldIdx = prevRanksRef.current.get(entry.examId);
        if (oldIdx !== undefined && oldIdx !== newIdx) {
          changes[entry.examId] = oldIdx - newIdx; // positive means moved UP!
        }
        prevRanksRef.current.set(entry.examId, newIdx);
      });

      if (Object.keys(changes).length > 0) {
        setRankChanges(changes);
        setTimeout(() => setRankChanges({}), 3500);
      }

      setLbEntries(newEntries);
      setLastRefreshedAt(new Date());
    } catch {
      // silently swallow in polling
    } finally {
      if (showSpinner) setIsRefreshing(false);
    }
  }, []);

  // Initial load
  useEffect(() => {
    loadPhases().then(({ phases: list }) => {
      if (list.length > 0) {
        const active = list.find((p) => p.status === 'ACTIVE');
        setSelectedPhaseId(active ? active.id : list[0].id);
      }
    });
  }, [loadPhases]);

  // When selectedPhaseId changes
  useEffect(() => {
    if (selectedPhaseId === undefined) return;
    setLbLoading(true);
    fetchLiveData(selectedPhaseId, false).finally(() => setLbLoading(false));
  }, [selectedPhaseId, fetchLiveData]);

  // Periodic Auto-refresh (every 3 seconds if active, or 8s otherwise)
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  useEffect(() => {
    if (!autoRefresh || selectedPhaseId === undefined) return;

    const intervalMs = currentPhase?.status === 'ACTIVE' ? 3000 : 8000;
    timerRef.current = setInterval(() => {
      fetchLiveData(selectedPhaseId, false);
      adminApi.getCurrentPhase().then((res) => setCurrentPhase(res.data.data)).catch(() => {});
    }, intervalMs);

    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [autoRefresh, selectedPhaseId, currentPhase?.status, fetchLiveData]);

  // Stop / End Phase with Auto-submit
  const handleConfirmEndPhase = async () => {
    if (!currentPhase) return;
    const endedPhaseId = currentPhase.id;
    setEndPhaseLoading(true);
    try {
      await adminApi.stopPhase(endedPhaseId);
      toast.success('Đã kết thúc đợt thi! Toàn bộ bài thi đã nộp tự động. Đang chuyển sang trang vinh danh Top 10...');
      setShowEndPhaseModal(false);
      // Navigate to dedicated results & award podium page
      navigate(`/admin/dot-thi/${endedPhaseId}/vinh-danh`);
    } catch (err) {
      toast.error(extractApiError(err, 'Kết thúc đợt thi thất bại'));
    } finally {
      setEndPhaseLoading(false);
    }
  };

  // Start new phase
  const handleStartPhase = async () => {
    if (!newPhaseName.trim()) return;
    setPhaseLoading(true);
    const isLiveArena = newPhaseType === 'LIVE_ARENA';
    try {
      await adminApi.startPhase({
        name: newPhaseName.trim(),
        requireWhitelist: isLiveArena ? true : newPhaseWhitelist,
        mcQuestionCount: isLiveArena ? 10 : newPhaseMcCount,
        timeLimitMinutes: isLiveArena ? 40 : newPhaseTimeLimit,
        hasScenarios: false,
        phaseType: newPhaseType,
      });
      setShowStartModal(false);
      setNewPhaseName('');
      setNewPhaseWhitelist(true);
      setNewPhaseMcCount(30);
      setNewPhaseTimeLimit(20);
      setNewPhaseType('STANDARD');
      const { currentPhase: newCurrent } = await loadPhases();
      if (newCurrent) {
        setSelectedPhaseId(newCurrent.id);
        fetchLiveData(newCurrent.id, true);
      }
      toast.success(`Đã mở đợt thi "${newPhaseName.trim()}" thành công!`);
      if (isLiveArena) {
        navigate('/admin/chung-ket-config');
      }
    } catch (err) {
      toast.error(extractApiError(err, 'Mở đợt thi thất bại'));
    } finally {
      setPhaseLoading(false);
    }
  };

  // Delete phase
  const handleDeletePhase = async () => {
    if (deletePhaseId === null) return;
    setDeleteLoading(true);
    try {
      await adminApi.deletePhase(deletePhaseId);
      setDeletePhaseId(null);
      const { phases: remaining } = await loadPhases();
      if (selectedPhaseId === deletePhaseId) {
        setSelectedPhaseId(remaining.length > 0 ? remaining[0].id : undefined);
      }
      toast.success('Đã xóa đợt thi thành công');
    } catch (err) {
      toast.error(extractApiError(err, 'Xóa đợt thi thất bại'));
    } finally {
      setDeleteLoading(false);
    }
  };

  // Export Excel
  const handleExport = async () => {
    try {
      const res = await adminApi.exportExcel();
      const url = URL.createObjectURL(res.data as Blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `ket-qua-thi-${selectedPhase?.name ?? 'tat-ca'}.xlsx`;
      a.click();
      URL.revokeObjectURL(url);
    } catch {
      toast.error('Xuất file Excel thất bại');
    }
  };

  // Reactivate a phase that was ended (e.g. admin accidentally stopped it)
  const handleReactivatePhase = async () => {
    if (reactivatePhaseId === null) return;
    setReactivateLoading(true);
    try {
      await adminApi.reactivatePhase(reactivatePhaseId);
      toast.success('Đã mở lại đợt thi thành công! Thí sinh có thể tiếp tục thi.');
      setShowReactivateModal(false);
      setReactivatePhaseId(null);
      await loadPhases();
      await fetchLiveData(reactivatePhaseId, true);
    } catch (err) {
      toast.error(extractApiError(err, 'Mở lại đợt thi thất bại'));
    } finally {
      setReactivateLoading(false);
    }
  };

  // Reset an exam to allow a contestant to retake
  const handleResetExam = async () => {
    if (!resetExamEntry) return;
    setResetLoading(true);
    try {
      await adminApi.resetExam(resetExamEntry.examId);
      toast.success(`Đã xóa bài thi của "${resetExamEntry.fullName}". Thí sinh có thể thi lại.`);
      setResetExamEntry(null);
      await fetchLiveData(selectedPhaseId, true);
    } catch (err) {
      toast.error(extractApiError(err, 'Xóa bài thi thất bại'));
    } finally {
      setResetLoading(false);
    }
  };

  const selectedPhase = phases.find((p) => p.id === selectedPhaseId);
  const isCurrentActive = currentPhase && currentPhase.status === 'ACTIVE' && currentPhase.id === selectedPhaseId;
  // Check if selected phase is ENDED (for reactivate button)
  const isSelectedEnded = selectedPhase && selectedPhase.status === 'ENDED';
  // Check if all joined participants have submitted
  const isAllSubmitted = !!(stats && stats.totalParticipants > 0 && stats.inProgress === 0);

  // Filtered leaderboard entries
  const filteredEntries = lbEntries.filter((e) => {
    if (!searchQuery.trim()) return true;
    const q = searchQuery.toLowerCase();
    return e.fullName.toLowerCase().includes(q) || (e.unit && e.unit.toLowerCase().includes(q));
  });

  // Check tie at 10th position (10 finalists rule)
  const isTieAtTenth = lbEntries.length >= 11 &&
    lbEntries[9].totalScore === lbEntries[10].totalScore &&
    lbEntries[9].durationSeconds === lbEntries[10].durationSeconds;

  const fmtDuration = (sec: number) => `${Math.floor(sec / 60)}:${String(sec % 60).padStart(2, '0')}`;

  return (
    <div className="flex flex-col lg:flex-row min-h-screen bg-slate-100 font-sans">
      <AdminSidebar active="bang-diem" />
      <main className="flex-1 p-6 lg:p-8 space-y-6 min-w-0">

        {/* ── Top Header & Live Control Bar ── */}
        <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-3">
              <h1 className="text-2xl font-black text-slate-800 tracking-tight">
                Bảng Điểm Trực Tiếp
              </h1>
              {isCurrentActive ? (
                <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-black bg-red-500 text-white shadow-sm animate-pulse">
                  <span className="w-2 h-2 rounded-full bg-white animate-ping" />
                  ĐANG THI TRỰC TIẾP
                </span>
              ) : (
                <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-bold bg-slate-200 text-slate-700">
                  <CheckCircle2 className="w-3.5 h-3.5 text-slate-500" />
                  ĐÃ ĐÓNG / TỔNG KẾT
                </span>
              )}
            </div>
            <p className="text-xs text-slate-500 mt-1">
              Hội thi Bí thư Đoàn cơ sở giỏi tỉnh Nghệ An năm 2026 • Cập nhật lần cuối: {lastRefreshedAt.toLocaleTimeString('vi-VN')}
            </p>
          </div>

          <div className="flex items-center gap-3 flex-wrap">
            {/* Auto refresh toggle */}
            <button
              onClick={() => setAutoRefresh(!autoRefresh)}
              className={`flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold border transition-colors ${
                autoRefresh
                  ? 'bg-emerald-50 border-emerald-300 text-emerald-800'
                  : 'bg-slate-50 border-slate-200 text-slate-500 hover:bg-slate-100'
              }`}
              title={autoRefresh ? 'Tự động cập nhật đang bật (3s)' : 'Tự động cập nhật đang tắt'}
            >
              <RefreshCw className={`w-3.5 h-3.5 ${autoRefresh ? 'animate-spin text-emerald-600' : ''}`} style={{ animationDuration: '4s' }} />
              Tự động cập nhật: {autoRefresh ? 'Bật (3s)' : 'Tắt'}
            </button>

            {/* Manual refresh button */}
            <button
              onClick={() => fetchLiveData(selectedPhaseId, true)}
              disabled={isRefreshing}
              className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold transition-colors disabled:opacity-50"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isRefreshing ? 'animate-spin' : ''}`} />
              Làm mới
            </button>

            {/* End Phase / Stop Button */}
            {isCurrentActive && (
              isAllSubmitted ? (
                <button
                  onClick={() => setShowEndPhaseModal(true)}
                  className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-gradient-to-r from-red-600 via-rose-600 to-red-600 hover:from-red-700 hover:to-rose-700 text-white text-xs sm:text-sm font-black shadow-lg shadow-red-500/30 ring-4 ring-red-400/40 animate-pulse transition-all active:scale-95"
                  title="Tất cả thí sinh đã nộp bài xong! Bấm để kết thúc đợt thi và tổng kết kết quả."
                >
                  <StopCircle className="w-4 h-4 text-yellow-300 shrink-0" />
                  <span>KẾT THÚC ĐỢT THI (TẤT CẢ ĐÃ NỘP BÀI)</span>
                </button>
              ) : (
                <button
                  onClick={() => setShowEndPhaseModal(true)}
                  className="flex items-center gap-2 px-3.5 py-2 rounded-xl bg-slate-100 hover:bg-red-50 border border-slate-300 hover:border-red-400 text-slate-700 hover:text-red-700 text-xs font-bold transition-all active:scale-95"
                  title={`Hiện còn ${stats?.inProgress ?? 0} thí sinh đang làm bài dở.`}
                >
                  <StopCircle className="w-4 h-4 text-red-500 shrink-0" />
                  <span>Kết thúc đợt thi (còn {stats?.inProgress ?? 0} đang thi)</span>
                </button>
              )
            )}

            {/* Start Phase Button */}
            {!currentPhase && (
              <button
                onClick={() => setShowStartModal(true)}
                className="flex items-center gap-2 px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-black shadow-md transition-all"
              >
                <PlayCircle className="w-4 h-4" />
                MỞ ĐỢT THI MỚI
              </button>
            )}

            {/* Reactivate Ended Phase Button */}
            {isSelectedEnded && !currentPhase && (
              <button
                onClick={() => {
                  if (selectedPhase) {
                    setReactivatePhaseId(selectedPhase.id);
                    setShowReactivateModal(true);
                  }
                }}
                className="flex items-center gap-2 px-4 py-2 rounded-xl bg-amber-600 hover:bg-amber-700 text-white text-xs font-black shadow-md shadow-amber-200 transition-all active:scale-95"
                title="Mở lại đợt thi này cho thí sinh tiếp tục thi (trong trường hợp bấm nhầm kết thúc)"
              >
                <RotateCcw className="w-4 h-4" />
                MỞ LẠI ĐỢT THI NÀY
              </button>
            )}

            {/* Export Excel Button */}
            <button
              onClick={handleExport}
              className="flex items-center gap-2 px-4 py-2 rounded-xl bg-teal-700 hover:bg-teal-800 text-white text-xs font-bold shadow-sm transition-colors"
            >
              <Download className="w-4 h-4" />
              Xuất Excel
            </button>

            {/* Delete Phase Button (Tạm thời hiện lại cho Admin) */}
            {selectedPhase && (
              <button
                onClick={() => setDeletePhaseId(selectedPhase.id)}
                className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-red-50 hover:bg-red-100 border border-red-200 text-red-700 text-xs font-bold transition-all active:scale-95 shadow-sm"
                title={`Xóa đợt thi "${selectedPhase.name}"`}
              >
                <Trash2 className="w-4 h-4 text-red-600" />
                <span>XÓA ĐỢT THI</span>
              </button>
            )}
          </div>
        </div>

        {/* ── Banner Vòng Chung kết (Live Arena) nếu đang diễn ra ── */}
        {currentPhase?.phaseType === 'LIVE_ARENA' && currentPhase.status === 'ACTIVE' && (
          <div className="bg-gradient-to-r from-blue-900 via-indigo-950 to-blue-900 border-2 border-amber-400/40 rounded-2xl p-4 sm:p-5 text-white shadow-xl flex flex-col md:flex-row items-center justify-between gap-4">
            <div className="flex items-center gap-3.5">
              <div className="w-12 h-12 rounded-xl bg-amber-400 text-blue-950 flex items-center justify-center font-black text-2xl shadow-lg shadow-amber-400/20 shrink-0">
                🏆
              </div>
              <div>
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="px-2 py-0.5 rounded-full bg-red-600 text-white font-black text-[10px] tracking-wider animate-pulse">
                    ĐANG DIỄN RA
                  </span>
                  <h3 className="font-black text-sm sm:text-base text-amber-300 uppercase tracking-wide">
                    {currentPhase.name}
                  </h3>
                </div>
                <p className="text-xs text-blue-100 mt-1">
                  Sàn đấu Sân khấu Live 3 Vòng: <b>Thông thái</b> (10 câu) • <b>Nhạy bén</b> (Nghiệp vụ) • <b>Bản lĩnh</b> (Tranh biện).
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2.5 shrink-0 w-full md:w-auto">
              <button
                onClick={() => navigate('/admin/live-control')}
                className="flex-1 md:flex-initial px-4 py-2.5 rounded-xl bg-amber-400 hover:bg-amber-300 text-blue-950 font-black text-xs shadow-lg shadow-amber-400/20 transition-all active:scale-95 flex items-center justify-center gap-1.5"
              >
                <Sparkles className="w-4 h-4 text-blue-950" />
                <span>BÀN ĐIỀU HÀNH SÂN KHẤU</span>
              </button>
              <a
                href="/live/screen"
                target="_blank"
                rel="noreferrer"
                className="px-4 py-2.5 rounded-xl bg-white/10 hover:bg-white/20 border border-white/20 text-white font-bold text-xs transition-all flex items-center justify-center gap-1.5"
              >
                <span>MÀN HÌNH LED</span>
              </a>
            </div>
          </div>
        )}

        {/* ── Phase Selector Tabs ── */}
        {phases.length > 0 && (
          <div className="flex items-center gap-2 flex-wrap bg-white p-3 rounded-2xl border border-slate-200 shadow-sm">
            <span className="text-xs font-bold text-slate-500 uppercase tracking-wide px-2">Đợt thi:</span>
            {phases.map((p) => {
              const isSelected = selectedPhaseId === p.id;
              const isActive = p.status === 'ACTIVE';
              return (
                <div key={p.id} className="inline-flex items-center">
                  <button
                    onClick={() => setSelectedPhaseId(p.id)}
                    className={`px-3.5 py-2 rounded-xl text-xs font-bold transition-all border flex items-center gap-2 ${
                      isSelected
                        ? 'bg-teal-700 text-white shadow-sm border-teal-700'
                        : 'bg-slate-100 text-slate-700 border-slate-200 hover:bg-slate-200'
                    }`}
                  >
                    <span>{p.name}</span>
                    {isActive && (
                      <span className="w-2 h-2 rounded-full bg-red-400 animate-ping" />
                    )}
                    {p.requireWhitelist && (
                      <span className={`px-1.5 py-0.5 rounded text-[10px] uppercase font-semibold ${isSelected ? 'bg-white/20 text-white' : 'bg-blue-100 text-blue-700'}`}>
                        Vòng cấp tỉnh
                      </span>
                    )}
                  </button>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      setDeletePhaseId(p.id);
                    }}
                    title={`Xóa đợt thi "${p.name}"`}
                    className="ml-1 p-1.5 rounded-lg text-slate-400 hover:text-red-600 hover:bg-red-50 transition-colors"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              );
            })}
            <button
              onClick={() => setShowStartModal(true)}
              className="px-3 py-1.5 rounded-xl text-xs font-bold border border-dashed border-teal-300 bg-teal-50/50 hover:bg-teal-100 text-teal-800 flex items-center gap-1.5 transition-colors"
            >
              <PlayCircle className="w-3.5 h-3.5" />
              <span>+ Mở đợt thi mới</span>
            </button>
          </div>
        )}

        {/* ── Real-time KPI Stats Cards ── */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="bg-white rounded-2xl border border-teal-200 p-5 shadow-sm flex items-center gap-4">
            <div className="w-12 h-12 rounded-2xl bg-teal-50 flex items-center justify-center text-teal-700 shrink-0">
              <Users className="w-6 h-6" />
            </div>
            <div>
              <p className="text-xs font-bold uppercase tracking-wider text-slate-500">Tổng thí sinh đăng ký</p>
              <p className="text-3xl font-black text-slate-800 mt-0.5">{stats?.totalParticipants ?? '—'}</p>
            </div>
          </div>

          <div className="bg-white rounded-2xl border border-blue-200 p-5 shadow-sm flex items-center gap-4">
            <div className="w-12 h-12 rounded-2xl bg-blue-50 flex items-center justify-center text-blue-700 shrink-0">
              <Trophy className="w-6 h-6" />
            </div>
            <div>
              <p className="text-xs font-bold uppercase tracking-wider text-slate-500">Đã nộp bài / Hoàn thành</p>
              <p className="text-3xl font-black text-blue-700 mt-0.5">{lbEntries.length}</p>
            </div>
          </div>

          <div className={`bg-white rounded-2xl border p-5 shadow-sm flex items-center gap-4 ${
            (stats?.inProgress ?? 0) > 0 ? 'border-amber-300 bg-amber-50/30' : 'border-slate-200'
          }`}>
            <div className="w-12 h-12 rounded-2xl bg-amber-100 flex items-center justify-center text-amber-700 shrink-0">
              <Activity className={`w-6 h-6 ${(stats?.inProgress ?? 0) > 0 ? 'animate-pulse text-amber-600' : ''}`} />
            </div>
            <div>
              <p className="text-xs font-bold uppercase tracking-wider text-slate-500">Đang thi</p>
              <div className="flex items-center gap-2 mt-0.5">
                <p className="text-3xl font-black text-amber-700">{stats?.inProgress ?? 0}</p>
                {(stats?.inProgress ?? 0) > 0 && (
                  <span className="text-[11px] font-bold text-amber-800 bg-amber-200 px-2 py-0.5 rounded-full">
                    Chưa nộp
                  </span>
                )}
              </div>
            </div>
          </div>

          <div className="bg-white rounded-2xl border border-emerald-200 p-5 shadow-sm flex items-center gap-4">
            <div className="w-12 h-12 rounded-2xl bg-emerald-50 flex items-center justify-center text-emerald-700 shrink-0">
              <Target className="w-6 h-6" />
            </div>
            <div>
              <p className="text-xs font-bold uppercase tracking-wider text-slate-500">Điểm trung bình</p>
              <p className="text-3xl font-black text-emerald-700 mt-0.5">
                {stats ? stats.averageScore.toFixed(1) : '—'} <span className="text-sm font-semibold text-slate-400">/ 30</span>
              </p>
            </div>
          </div>
        </div>

        {/* ── Banner dẫn sang Trang Vinh Danh Top 10 khi Đợt thi đã kết thúc ── */}
        {selectedPhase?.status === 'ENDED' && (
          <div className="bg-gradient-to-r from-amber-50 via-amber-100/40 to-teal-50 border-2 border-amber-300 rounded-2xl p-5 flex flex-col sm:flex-row items-center justify-between gap-4 shadow-sm">
            <div className="flex items-center gap-3.5">
              <div className="w-12 h-12 rounded-2xl bg-amber-500 text-white flex items-center justify-center shrink-0 shadow-md shadow-amber-200">
                <Trophy className="w-6 h-6" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="text-base font-black text-slate-900 uppercase">
                    Đợt thi đã kết thúc — Đã có kết quả chính thức
                  </h3>
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-black uppercase bg-amber-200 text-amber-900">
                    Top 10 Đã Xác Định
                  </span>
                </div>
                <p className="text-xs text-slate-600 mt-1">
                  Đợt thi <strong className="text-slate-800 font-bold">{selectedPhase.name}</strong> đã hoàn tất đóng. Mở trang vinh danh riêng biệt để xem Bục giải Nhất / Nhì / Ba và danh sách 10 thí sinh giành vé vào Vòng Chung Kết.
                </p>
              </div>
            </div>
            <button
              onClick={() => navigate(`/admin/dot-thi/${selectedPhase.id}/vinh-danh`)}
              className="px-5 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-600 text-slate-950 font-black text-xs shadow-lg shadow-amber-300/50 transition-all flex items-center gap-2 shrink-0 active:scale-95"
            >
              <Award className="w-4 h-4 text-slate-950" />
              MỞ TRANG VINH DANH TOP 10 →
            </button>
          </div>
        )}

        {/* ── Tie warning at 10th position ── */}
        {isTieAtTenth && (
          <div className="bg-amber-50 border-2 border-amber-300 rounded-2xl p-4 flex items-start gap-3 text-amber-900 shadow-sm">
            <AlertTriangle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
            <div>
              <p className="text-sm font-black uppercase tracking-wide">
                Lưu ý Thể lệ: Có thí sinh đồng hạng ở vị trí số 10!
              </p>
              <p className="text-xs mt-1 text-amber-800">
                Theo Thể lệ Hội thi của Tỉnh đoàn, Ban Tổ chức chọn 10 thí sinh xuất sắc nhất vào Vòng chung kết. Hiện vị trí số 10 và số 11 đang bằng điểm và bằng thời gian thi ({lbEntries[9].totalScore} điểm - {fmtDuration(lbEntries[9].durationSeconds)}). Cần tổ chức thi câu hỏi phụ theo quyết định của Ban Tổ chức.
              </p>
            </div>
          </div>
        )}

        {/* ── Main Live Leaderboard Table ── */}
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden flex flex-col">
          <div className="p-5 border-b border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <div className="flex items-center gap-2.5">
                <h2 className="text-base font-black text-slate-800 uppercase tracking-wide flex items-center gap-2">
                  <Trophy className="w-4 h-4 text-teal-700" />
                  Bảng Xếp Hạng Trực Tiếp
                </h2>
                {isCurrentActive ? (
                  <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-red-100 text-red-700 border border-red-200 animate-pulse">
                    <span className="w-2 h-2 rounded-full bg-red-600" />
                    Trực tiếp (3s)
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-slate-100 text-slate-600">
                    <CheckCircle2 className="w-3 h-3 text-slate-500" />
                    Bảng điểm đợt thi
                  </span>
                )}
              </div>
              <p className="text-xs text-slate-500 mt-1">
                {isCurrentActive
                  ? (stats && stats.inProgress > 0
                      ? `Đang có ${stats.inProgress} thí sinh làm bài. Vị trí các dòng tự động trượt lên / xuống theo thời gian thực khi có bài nộp mới.`
                      : isAllSubmitted
                      ? '🎉 Toàn bộ thí sinh đã nộp bài xong! Bấm "KẾT THÚC ĐỢT THI" bên trên để chốt kết quả và chuyển sang trang vinh danh.'
                      : 'Cập nhật trực tiếp theo thời gian thực khi thí sinh nộp bài • Top 10 thí sinh đầu bảng giành quyền vào Vòng chung kết.')
                  : 'Bảng điểm chính thức đã chốt sau khi kết thúc đợt thi.'}
              </p>
            </div>

            {/* Search bar */}
            <div className="relative w-full sm:w-72">
              <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Tìm thí sinh hoặc đơn vị..."
                className="w-full pl-9 pr-4 py-2 rounded-xl text-xs border border-slate-200 focus:outline-none focus:border-teal-500 transition-colors"
              />
            </div>
          </div>

          <div className="overflow-x-auto">
            {lbLoading ? (
              <div className="flex flex-col items-center justify-center py-16 gap-3">
                <div className="w-8 h-8 border-4 border-teal-200 border-t-teal-700 rounded-full animate-spin" />
                <p className="text-xs font-bold text-slate-400">Đang tải bảng điểm trực tiếp...</p>
              </div>
            ) : filteredEntries.length === 0 ? (
              <div className="text-center py-16 text-slate-400">
                <Clock className="w-10 h-10 mx-auto text-slate-300 mb-2" />
                <p className="text-sm font-bold">Chưa có thí sinh nào nộp bài</p>
                <p className="text-xs text-slate-400 mt-1">Khi thí sinh nộp bài hoặc Ban Tổ chức bấm "Kết thúc đợt thi", điểm số sẽ lập tức hiển thị tại đây.</p>
              </div>
            ) : (
              <table className="w-full text-sm">
                <thead className="bg-slate-50 border-b border-slate-200 text-xs font-bold text-slate-500 uppercase tracking-wider">
                  <tr>
                    <th className="p-3 text-center w-16">Hạng</th>
                    <th className="p-3 text-left">Họ và tên</th>
                    <th className="p-3 text-left">Đơn vị</th>
                    <th className="p-3 text-center w-28">Số điện thoại</th>
                    <th className="p-3 text-center w-24">Điểm số</th>
                    <th className="p-3 text-center w-28">Thời gian thi</th>
                    <th className="p-3 text-center w-36">Vòng chung kết</th>
                    <th className="p-3 text-center w-36">Thao tác</th>
                  </tr>
                </thead>
                <motion.tbody className="divide-y divide-slate-100">
                  {filteredEntries.map((e) => {
                    const isTop10 = e.rank <= 10;
                    const rankDiff = rankChanges[e.examId];
                    return (
                      <motion.tr
                        layout
                        key={e.examId}
                        initial={{ opacity: 0, y: 15 }}
                        animate={{
                          opacity: 1,
                          y: 0,
                        }}
                        transition={{
                          layout: { type: 'spring', stiffness: 350, damping: 28 },
                          duration: 0.3,
                        }}
                        className={`transition-colors duration-300 ${
                          rankDiff && rankDiff > 0
                            ? 'bg-emerald-50/90 ring-2 ring-emerald-400'
                            : isTop10
                            ? 'bg-amber-50/20 hover:bg-amber-50/50'
                            : 'hover:bg-slate-50/80 bg-white'
                        }`}
                      >
                        <td className="p-3 text-center">
                          <div className="flex items-center justify-center gap-1.5">
                            {e.rank <= 3 ? (
                              <span className="text-xl leading-none">{['🥇', '🥈', '🥉'][e.rank - 1]}</span>
                            ) : (
                              <span className={`inline-flex items-center justify-center w-6 h-6 rounded-full text-xs font-black ${
                                isTop10 ? 'bg-amber-100 text-amber-800' : 'bg-slate-100 text-slate-600'
                              }`}>
                                {e.rank}
                              </span>
                            )}
                            {rankDiff && rankDiff > 0 && (
                              <span
                                className="text-[10px] font-black text-emerald-700 bg-emerald-100 border border-emerald-300 px-1 py-0.5 rounded flex items-center gap-0.5 animate-bounce shadow-2xs"
                                title={`Đã leo lên ${rankDiff} bậc!`}
                              >
                                ▲+{rankDiff}
                              </span>
                            )}
                            {rankDiff && rankDiff < 0 && (
                              <span
                                className="text-[10px] font-bold text-slate-400 bg-slate-100 px-1 py-0.5 rounded flex items-center"
                                title={`Tụt ${Math.abs(rankDiff)} bậc`}
                              >
                                ▼{rankDiff}
                              </span>
                            )}
                          </div>
                        </td>
                        <td className="p-3 font-bold text-slate-800">
                          <div className="flex items-center gap-2">
                            <span>{e.fullName}</span>
                            {rankDiff && rankDiff > 0 && (
                              <span className="text-[9px] font-black px-1.5 py-0.5 rounded bg-emerald-500 text-white animate-pulse">
                                MỚI LEO HẠNG
                              </span>
                            )}
                          </div>
                        </td>
                        <td className="p-3 text-slate-600 text-xs truncate max-w-xs">
                          {e.unit || '—'}
                        </td>
                        <td className="p-3 text-center text-slate-500 text-xs tabular-nums">
                          {e.phone ?? '—'}
                        </td>
                        <td className="p-3 text-center">
                          <span className={`inline-flex items-center justify-center px-2.5 py-1 rounded-lg text-xs font-black ${
                            e.totalScore >= 25 ? 'bg-emerald-100 text-emerald-800' :
                            e.totalScore >= 15 ? 'bg-teal-100 text-teal-800' : 'bg-slate-100 text-slate-700'
                          }`}>
                            {e.totalScore} / 30
                          </span>
                        </td>
                        <td className="p-3 text-center text-slate-600 text-xs font-semibold tabular-nums">
                          {fmtDuration(e.durationSeconds)}
                        </td>
                        <td className="p-3 text-center">
                          {isTop10 ? (
                            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-black bg-amber-400 text-amber-950 shadow-sm animate-pulse">
                              ⭐ VÀO CHUNG KẾT
                            </span>
                          ) : (
                            <span className="text-[11px] font-semibold text-slate-400">
                              Hoàn thành
                            </span>
                          )}
                        </td>
                        <td className="p-3 text-center">
                          <div className="flex items-center justify-center gap-1.5">
                            <button
                              onClick={() => navigate(`/admin/bai-thi/${e.examId}`)}
                              className="px-2 py-1 rounded-lg text-xs font-bold text-slate-600 bg-slate-100 hover:bg-teal-50 hover:text-teal-700 transition-colors"
                              title="Xem chi tiết câu trả lời"
                            >
                              Chi tiết
                            </button>
                            <button
                              onClick={(ev) => {
                                ev.stopPropagation();
                                setResetExamEntry(e);
                              }}
                              className="px-2 py-1 rounded-lg text-xs font-bold text-amber-700 bg-amber-50 hover:bg-amber-100 transition-colors flex items-center gap-1"
                              title="Xóa kết quả này để thí sinh thi lại (dùng khi bấm nhầm hoặc gặp sự cố kỹ thuật)"
                            >
                              <RotateCcw className="w-3 h-3" />
                              Cho thi lại
                            </button>
                          </div>
                        </td>
                      </motion.tr>
                    );
                  })}
                </motion.tbody>
              </table>
            )}
          </div>
        </div>

      </main>

      {/* ── Modal Xác Nhận Kết Thúc Đợt Thi & Thu Bài Tự Động ── */}
      {showEndPhaseModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-in fade-in duration-200">
          <div className="bg-white rounded-3xl shadow-2xl w-full max-w-md p-6 space-y-4 border border-slate-200">
            {isAllSubmitted ? (
              <>
                <div className="w-14 h-14 rounded-2xl bg-emerald-100 text-emerald-600 flex items-center justify-center mx-auto shadow-inner">
                  <Trophy className="w-7 h-7" />
                </div>

                <div className="text-center">
                  <span className="inline-block px-3 py-1 rounded-full text-[11px] font-black tracking-wide uppercase bg-emerald-100 text-emerald-800 mb-2">
                    ✓ 100% Đã nộp bài
                  </span>
                  <h2 className="text-lg font-black text-slate-900 uppercase">
                    Kết Thúc Đợt Thi & Công Bố Top 10
                  </h2>
                  <p className="text-xs text-slate-500 mt-1">
                    Đợt thi: <span className="font-bold text-slate-800">{currentPhase?.name}</span>
                  </p>
                </div>

                <div className="bg-emerald-50 border border-emerald-200 rounded-2xl p-4 text-xs text-emerald-900 space-y-2">
                  <p className="font-black text-emerald-800 uppercase tracking-wide">Sẵn sàng tổng kết:</p>
                  <ul className="list-disc pl-4 space-y-1 font-medium">
                    <li>
                      Tất cả <strong className="text-emerald-950 font-bold">{lbEntries.length} thí sinh</strong> đã hoàn tất nộp bài thi thành công.
                    </li>
                    <li>
                      Không còn bài thi nào đang làm dở dang.
                    </li>
                    <li>
                      Sau khi bấm kết thúc, hệ thống sẽ <strong>chốt điểm chính thức</strong> và <strong>mở giao diện vinh danh Top 10 xuất sắc</strong>.
                    </li>
                  </ul>
                </div>

                <div className="flex gap-3 pt-2">
                  <button
                    type="button"
                    onClick={() => setShowEndPhaseModal(false)}
                    disabled={endPhaseLoading}
                    className="flex-1 py-3 rounded-xl border-2 border-slate-200 text-slate-700 font-bold text-xs hover:bg-slate-50 transition-colors"
                  >
                    ĐÓNG
                  </button>
                  <button
                    type="button"
                    onClick={handleConfirmEndPhase}
                    disabled={endPhaseLoading}
                    className="flex-1 py-3 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-black text-xs shadow-lg shadow-emerald-200 transition-all disabled:opacity-50 flex items-center justify-center gap-1.5 active:scale-95"
                  >
                    {endPhaseLoading ? (
                      <>
                        <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                        Đang xử lý...
                      </>
                    ) : (
                      'KẾT THÚC & MỞ TOP 10'
                    )}
                  </button>
                </div>
              </>
            ) : (
              <>
                <div className="w-14 h-14 rounded-2xl bg-amber-100 text-amber-600 flex items-center justify-center mx-auto shadow-inner">
                  <AlertTriangle className="w-7 h-7" />
                </div>

                <div className="text-center">
                  <span className="inline-block px-3 py-1 rounded-full text-[11px] font-black tracking-wide uppercase bg-amber-100 text-amber-800 mb-2">
                    ⚠️ Còn bài thi đang làm
                  </span>
                  <h2 className="text-lg font-black text-slate-900 uppercase">
                    Xác nhận kết thúc đợt thi
                  </h2>
                  <p className="text-xs text-slate-500 mt-1">
                    Đợt thi: <span className="font-bold text-slate-800">{currentPhase?.name}</span>
                  </p>
                </div>

                <div className="bg-amber-50 border border-amber-200 rounded-2xl p-4 text-xs text-amber-950 space-y-2">
                  <p className="font-black text-amber-900 uppercase tracking-wide">Cơ chế thu bài tự động:</p>
                  <ul className="list-disc pl-4 space-y-1.5 font-medium">
                    <li>
                      Hiện vẫn còn <strong className="text-red-700 font-black underline">{stats?.inProgress ?? 0} thí sinh</strong> đang trong thời gian làm bài thi.
                    </li>
                    <li>
                      <strong className="text-slate-900">Khi bạn bấm xác nhận:</strong> Hệ thống sẽ <strong>tự động thu bài và chấm điểm ngay lập tức</strong> cho toàn bộ thí sinh này dựa trên những câu trả lời đã lưu tạm.
                    </li>
                    <li>
                      Đợt thi sẽ được đóng hoàn toàn và chuyển sang trang kết quả Top 10.
                    </li>
                  </ul>
                </div>

                <div className="flex gap-3 pt-2">
                  <button
                    type="button"
                    onClick={() => setShowEndPhaseModal(false)}
                    disabled={endPhaseLoading}
                    className="flex-1 py-3 rounded-xl border-2 border-slate-200 text-slate-700 font-bold text-xs hover:bg-slate-50 transition-colors"
                  >
                    QUAY LẠI CHỜ THÍ SINH
                  </button>
                  <button
                    type="button"
                    onClick={handleConfirmEndPhase}
                    disabled={endPhaseLoading}
                    className="flex-1 py-3 rounded-xl bg-red-600 hover:bg-red-700 text-white font-black text-xs shadow-lg shadow-red-200 transition-all disabled:opacity-50 flex items-center justify-center gap-1.5"
                  >
                    {endPhaseLoading ? (
                      <>
                        <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                        Đang thu bài...
                      </>
                    ) : (
                      'VẪN KẾT THÚC & THU BÀI'
                    )}
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      )}

      {/* ── Start Phase Modal ── */}
      {showStartModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-in fade-in duration-200">
          <div className="bg-white rounded-3xl shadow-2xl w-full max-w-md p-6 space-y-4 border border-slate-200">
            {currentPhase && currentPhase.status === 'ACTIVE' ? (
              <div className="space-y-4">
                <div className="w-12 h-12 rounded-2xl bg-amber-100 text-amber-700 flex items-center justify-center mx-auto">
                  <AlertTriangle className="w-6 h-6" />
                </div>
                <div className="text-center">
                  <h2 className="text-base font-black text-slate-900 uppercase">
                    Đã có đợt thi đang diễn ra
                  </h2>
                  <p className="text-xs text-slate-500 mt-1">
                    Đợt thi hiện tại: <span className="font-bold text-teal-800">{currentPhase.name}</span>
                  </p>
                </div>
                <div className="bg-amber-50 border border-amber-200 rounded-xl p-3 text-xs text-amber-900 space-y-1">
                  <p className="font-bold">⚠️ Quy tắc hệ thống:</p>
                  <p>Mỗi thời điểm chỉ được phép có <strong>duy nhất 1 đợt thi</strong> ở trạng thái đang diễn ra (ACTIVE).</p>
                  <p>Vui lòng bấm <strong>Kết thúc đợt thi</strong> hiện tại trước khi tạo hoặc mở một đợt thi mới.</p>
                </div>
                <button
                  onClick={() => setShowStartModal(false)}
                  className="w-full py-2.5 rounded-xl bg-slate-800 hover:bg-slate-900 text-white font-bold text-xs transition-colors"
                >
                  ĐÃ HIỂU
                </button>
              </div>
            ) : (
              <>
                <h2 className="text-base font-black text-slate-800">Mở đợt thi mới</h2>
                <p className="text-xs text-slate-500">
                  Cấu hình đợt thi cho cuộc thi Bí thư Đoàn cơ sở giỏi. Đợt thi sẽ được kích hoạt ngay khi tạo.
                </p>
                {/* Thể thức đợt thi selector */}
                <div className="space-y-1.5">
                  <label className="text-[10px] font-black uppercase tracking-wider text-slate-500">Thể thức đợt thi</label>
                  <div className="grid grid-cols-2 gap-2 p-1 bg-slate-100 rounded-xl">
                    <button
                      type="button"
                      onClick={() => {
                        setNewPhaseType('STANDARD');
                        if (newPhaseName === 'VÒNG CHUNG KẾT CẤP TỈNH NĂM 2026') setNewPhaseName('');
                      }}
                      className={`py-2 px-3 rounded-lg text-xs font-bold transition-all ${
                        newPhaseType === 'STANDARD'
                          ? 'bg-white text-teal-800 shadow-sm'
                          : 'text-slate-600 hover:text-slate-900'
                      }`}
                    >
                      Đợt thi Tiêu chuẩn
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setNewPhaseType('LIVE_ARENA');
                        setNewPhaseName('VÒNG CHUNG KẾT CẤP TỈNH NĂM 2026');
                      }}
                      className={`py-2 px-3 rounded-lg text-xs font-bold transition-all flex items-center justify-center gap-1 ${
                        newPhaseType === 'LIVE_ARENA'
                          ? 'bg-blue-600 text-white shadow-sm'
                          : 'text-slate-600 hover:text-slate-900'
                      }`}
                    >
                      <span>🏆 Sân khấu Chung kết</span>
                    </button>
                  </div>
                </div>

                <div>
                  <label className="text-[10px] font-black uppercase tracking-wider text-slate-500 mb-1 block">Tên đợt thi</label>
                  <input
                    autoFocus
                    className="w-full rounded-xl border-2 border-slate-200 px-4 py-2.5 text-xs focus:border-teal-500 focus:ring-0 outline-none transition-all font-semibold"
                    placeholder="Tên đợt thi (VD: Vòng thi cấp tỉnh)..."
                    value={newPhaseName}
                    onChange={(e) => setNewPhaseName(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && handleStartPhase()}
                  />
                </div>

                {newPhaseType === 'LIVE_ARENA' ? (
                  <div className="p-3.5 bg-blue-50 border border-blue-200 rounded-xl space-y-2 text-xs">
                    <div className="flex items-center gap-2 font-bold text-blue-900">
                      <Sparkles className="w-4 h-4 text-amber-500 shrink-0" />
                      <span>Thể thức Sân khấu Sống động (Live Arena)</span>
                    </div>
                    <ul className="text-[11px] text-blue-800 space-y-1 list-disc list-inside">
                      <li>Dành riêng cho 10 thí sinh xuất sắc bước vào Vòng Chung kết.</li>
                      <li>3 chặng thi sân khấu: <b>Thông thái</b> (10 câu hỏi), <b>Nhạy bén</b> (Nghiệp vụ), <b>Bản lĩnh</b> (Tranh biện).</li>
                      <li>Tự động kích hoạt Bàn điều hành Sân khấu, Màn hình LED và Sàn đấu di động.</li>
                    </ul>
                  </div>
                ) : (
                  /* Phase config options */
                  <div className="space-y-3 rounded-xl border border-slate-200 bg-slate-50 p-3">
                    <p className="text-[10px] font-black uppercase tracking-wider text-slate-500">Cấu hình đợt thi</p>

                    {/* Require Whitelist */}
                    <label className="flex items-center gap-2.5 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={newPhaseWhitelist}
                        onChange={(e) => setNewPhaseWhitelist(e.target.checked)}
                        className="w-4 h-4 rounded border-slate-300 text-teal-600 focus:ring-teal-500"
                      />
                      <div>
                        <span className="text-xs font-bold text-slate-700">Chọn thí sinh từ danh sách (Whitelist)</span>
                        <p className="text-[10px] text-slate-500">Thí sinh phải chọn tên từ danh sách 70 thí sinh đủ điều kiện thay vì tự nhập.</p>
                      </div>
                    </label>

                    {/* MC Question Count */}
                    <div className="flex items-center gap-3">
                      <label className="text-xs font-bold text-slate-700 shrink-0">Số câu trắc nghiệm:</label>
                      <input
                        type="number"
                        min={1}
                        max={100}
                        className="w-20 rounded-lg border-2 border-slate-200 px-3 py-1.5 text-xs text-center focus:border-teal-500 focus:ring-0 outline-none"
                        value={newPhaseMcCount}
                        onChange={(e) => setNewPhaseMcCount(Number(e.target.value) || 30)}
                      />
                      <span className="text-[10px] text-slate-400">câu</span>
                    </div>

                    {/* Time Limit */}
                    <div className="flex items-center gap-3">
                      <label className="text-xs font-bold text-slate-700 shrink-0">Thời gian làm bài:</label>
                      <input
                        type="number"
                        min={1}
                        max={120}
                        className="w-20 rounded-lg border-2 border-slate-200 px-3 py-1.5 text-xs text-center focus:border-teal-500 focus:ring-0 outline-none"
                        value={newPhaseTimeLimit}
                        onChange={(e) => setNewPhaseTimeLimit(Number(e.target.value) || 20)}
                      />
                      <span className="text-[10px] text-slate-400">phút</span>
                    </div>
                  </div>
                )}

                <div className="flex gap-3">
                  <button
                    onClick={() => { setShowStartModal(false); setNewPhaseName(''); }}
                    className="flex-1 py-2.5 rounded-xl border-2 border-slate-200 text-slate-700 font-bold text-xs hover:bg-slate-50 transition-colors"
                  >
                    Hủy
                  </button>
                  <button
                    onClick={handleStartPhase}
                    disabled={!newPhaseName.trim() || phaseLoading}
                    className="flex-1 py-2.5 rounded-xl bg-teal-700 hover:bg-teal-800 text-white font-bold text-xs transition-colors disabled:opacity-50"
                  >
                    {phaseLoading ? 'Đang mở...' : 'Mở đợt thi'}
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      )}

      {/* ── Delete Phase Confirm Modal ── */}
      {deletePhaseId !== null && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-in fade-in duration-200">
          <div className="bg-white rounded-3xl shadow-2xl w-full max-w-md p-6 space-y-4 border border-red-200">
            <div className="w-12 h-12 rounded-2xl bg-red-100 text-red-700 flex items-center justify-center mx-auto">
              <Trash2 className="w-6 h-6" />
            </div>

            <div className="text-center">
              <h2 className="text-lg font-black text-slate-900 uppercase">
                Xác nhận xóa đợt thi
              </h2>
              <p className="text-xs text-slate-500 mt-1">
                Đợt thi: <span className="font-bold text-slate-800">{phases.find((p) => p.id === deletePhaseId)?.name}</span>
              </p>
            </div>

            <div className="bg-red-50 border border-red-200 rounded-2xl p-4 text-xs text-red-900 space-y-2">
              <p className="font-black text-red-800 uppercase tracking-wide">⚠️ Cảnh báo hành động nguy hiểm:</p>
              <ul className="list-disc pl-4 space-y-1 font-medium text-red-900">
                <li>
                  Hành động này sẽ <strong>xóa vĩnh viễn</strong> đợt thi này khỏi hệ thống.
                </li>
                <li>
                  Toàn bộ <strong>cấu hình 10 thí sinh, câu hỏi, phiên thi sàn đấu, bài thi và điểm số</strong> liên quan sẽ được xóa sạch 100% để làm sạch hoàn toàn dữ liệu test.
                </li>
                <li>
                  Trạng thái của các thí sinh trong danh sách nguồn sơ loại sẽ được <strong>đặt lại ban đầu</strong> để sẵn sàng cho các đợt thi mới.
                </li>
                <li>
                  Hành động này <strong>không thể hoàn tác</strong>.
                </li>
              </ul>
            </div>

            <div className="flex gap-3 pt-2">
              <button
                type="button"
                onClick={() => setDeletePhaseId(null)}
                disabled={deleteLoading}
                className="flex-1 py-3 rounded-xl border-2 border-slate-200 text-slate-700 font-bold text-xs hover:bg-slate-50 transition-colors"
              >
                HỦY
              </button>
              <button
                type="button"
                onClick={handleDeletePhase}
                disabled={deleteLoading}
                className="flex-1 py-3 rounded-xl bg-red-600 hover:bg-red-700 text-white font-black text-xs shadow-lg shadow-red-200 transition-all disabled:opacity-50 flex items-center justify-center gap-1.5"
              >
                {deleteLoading ? (
                  <>
                    <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                    Đang xóa...
                  </>
                ) : (
                  'XÁC NHẬN XÓA'
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Reactivate Phase Modal ── */}
      {showReactivateModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-in fade-in duration-200">
          <div className="bg-white rounded-3xl shadow-2xl w-full max-w-md p-6 space-y-4 border border-amber-200">
            <div className="w-12 h-12 rounded-2xl bg-amber-100 text-amber-700 flex items-center justify-center mx-auto">
              <RotateCcw className="w-6 h-6" />
            </div>

            <div className="text-center">
              <h2 className="text-lg font-black text-slate-900 uppercase">
                Mở lại đợt thi
              </h2>
              <p className="text-xs text-slate-500 mt-1">
                Đợt thi: <span className="font-bold text-slate-800">{selectedPhase?.name}</span>
              </p>
            </div>

            <div className="bg-amber-50 border border-amber-200 rounded-2xl p-4 text-xs text-amber-900 space-y-2">
              <p className="font-black text-amber-800 uppercase tracking-wide">Lưu ý khi mở lại đợt thi:</p>
              <ul className="list-disc pl-4 space-y-1 font-medium text-amber-900">
                <li>
                  Đợt thi sẽ chuyển từ trạng thái <strong>ĐÃ ĐÓNG</strong> sang <strong>ĐANG HOẠT ĐỘNG</strong>.
                </li>
                <li>
                  Các thí sinh chưa nộp bài hoặc được cấp quyền thi lại sẽ có thể tiếp tục vào làm bài.
                </li>
                <li>
                  Tính năng này dùng để <strong>khắc phục sự cố khi Ban Tổ chức vô tình bấm nhầm</strong> "Kết thúc đợt thi".
                </li>
              </ul>
            </div>

            <div className="flex gap-3 pt-2">
              <button
                type="button"
                onClick={() => {
                  setShowReactivateModal(false);
                  setReactivatePhaseId(null);
                }}
                disabled={reactivateLoading}
                className="flex-1 py-3 rounded-xl border-2 border-slate-200 text-slate-700 font-bold text-xs hover:bg-slate-50 transition-colors"
              >
                HỦY
              </button>
              <button
                type="button"
                onClick={handleReactivatePhase}
                disabled={reactivateLoading}
                className="flex-1 py-3 rounded-xl bg-amber-600 hover:bg-amber-700 text-white font-black text-xs shadow-lg shadow-amber-200 transition-all disabled:opacity-50 flex items-center justify-center gap-1.5"
              >
                {reactivateLoading ? (
                  <>
                    <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                    Đang mở lại...
                  </>
                ) : (
                  'XÁC NHẬN MỞ LẠI'
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Reset Exam (Cho thi lại) Modal ── */}
      {resetExamEntry && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-in fade-in duration-200">
          <div className="bg-white rounded-3xl shadow-2xl w-full max-w-md p-6 space-y-4 border border-red-200">
            <div className="w-12 h-12 rounded-2xl bg-amber-100 text-amber-700 flex items-center justify-center mx-auto">
              <RotateCcw className="w-6 h-6" />
            </div>

            <div className="text-center">
              <h2 className="text-lg font-black text-slate-900 uppercase">
                Cho Thí Sinh Thi Lại
              </h2>
              <p className="text-sm font-bold text-slate-800 mt-1">
                {resetExamEntry.fullName}
              </p>
              <p className="text-xs text-slate-500">
                {resetExamEntry.unit} • Điểm hiện tại: <strong className="text-teal-700">{resetExamEntry.totalScore}/30 đ</strong> ({fmtDuration(resetExamEntry.durationSeconds)})
              </p>
            </div>

            <div className="bg-red-50 border border-red-200 rounded-2xl p-4 text-xs text-red-900 space-y-2">
              <p className="font-black text-red-800 uppercase tracking-wide">⚠️ Cảnh báo hành động:</p>
              <ul className="list-disc pl-4 space-y-1 font-medium text-red-900">
                <li>
                  Toàn bộ kết quả bài thi này ({resetExamEntry.totalScore} điểm) sẽ bị <strong>xóa hoàn toàn</strong> khỏi hệ thống.
                </li>
                <li>
                  Thí sinh sẽ được <strong>mở quyền làm bài mới</strong> từ đầu trong đợt thi hiện tại.
                </li>
                <li>
                  Đề thi mới sẽ được <strong>ngẫu nhiên hóa lại</strong> từ ngân hàng câu hỏi.
                </li>
              </ul>
            </div>

            <div className="flex gap-3 pt-2">
              <button
                type="button"
                onClick={() => setResetExamEntry(null)}
                disabled={resetLoading}
                className="flex-1 py-3 rounded-xl border-2 border-slate-200 text-slate-700 font-bold text-xs hover:bg-slate-50 transition-colors"
              >
                HỦY
              </button>
              <button
                type="button"
                onClick={handleResetExam}
                disabled={resetLoading}
                className="flex-1 py-3 rounded-xl bg-red-600 hover:bg-red-700 text-white font-black text-xs shadow-lg shadow-red-200 transition-all disabled:opacity-50 flex items-center justify-center gap-1.5"
              >
                {resetLoading ? (
                  <>
                    <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                    Đang xóa bài thi...
                  </>
                ) : (
                  'XÁC NHẬN CHO THI LẠI'
                )}
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}