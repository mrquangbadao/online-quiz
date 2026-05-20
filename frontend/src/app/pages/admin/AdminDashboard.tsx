import { useEffect, useState } from 'react';
import { useNavigate } from "react-router-dom";
import { adminApi, type ContestPhase, type UnitStat } from '../../../api/admin/adminApi';
import { leaderboardApi } from '../../../api/leaderboardApi';
import { useAuthStore } from '../../../store/authStore';
import VietnamEmblem from '../../components/VietnamEmblem';
import { toast } from '../../components/ui/Toast';
import {
  LayoutDashboard, FileText, Building2, Download, LogOut,
  Users, Target, Zap, Activity, Settings,
  PlayCircle, StopCircle, Trophy, Trash2, KeyRound, UserPlus,
} from 'lucide-react';
import { extractApiError } from '../../../hooks/useApiError';
import type { LeaderboardEntry } from '../../../types';
 
interface Stats {
  totalParticipants: number;
  averageScore: number;
  perfectScores: number;
  inProgress: number;
}
 
function AdminSidebar({ active }: { active: string }) {
  const navigate = useNavigate();
  const logout = useAuthStore((s) => s.logout);
 
  const links = [
    { key: 'dashboard', label: 'Tổng quan', icon: LayoutDashboard, path: '/admin/dashboard' },
    { key: 'questions', label: 'Câu hỏi', icon: FileText, path: '/admin/questions' },
    { key: 'units', label: 'Đơn vị', icon: Building2, path: '/admin/units' },
    { key: 'settings', label: 'Cấu hình', icon: Settings, path: '/admin/settings' },
    { key: 'accounts', label: 'Tài khoản', icon: UserPlus, path: '/admin/accounts' },
    { key: 'change-password', label: 'Đổi mật khẩu', icon: KeyRound, path: '/admin/change-password' },
  ];
 
  return (
    <aside className="w-72 bg-gradient-to-b from-[#05311d] via-[#072519] to-[#03140e] flex flex-col min-h-screen shrink-0">
      <div className="p-5 border-b border-white/10 bg-white/5">
        <div className="flex items-center gap-3">
          <VietnamEmblem size={40} showBorder={false} />
          <div>
            <p className="text-xs font-bold tracking-widest uppercase text-teal-400">Admin</p>
            <p className="text-sm font-extrabold text-white">PC04 Nghệ An</p>
          </div>
        </div>
      </div>
      <nav className="flex-1 p-3 space-y-1">
        {links.map((link) => (
          <button
            key={link.key}
            onClick={() => navigate(link.path)}
            className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-semibold transition-all ${
              active === link.key
                ? 'bg-teal-600 text-white shadow-md'
                : 'text-slate-400 hover:bg-white/10 hover:text-white'
            }`}
          >
            <link.icon className="w-5 h-5" />
            {link.label}
          </button>
        ))}
      </nav>
      <div className="p-3 border-t border-white/10">
        <button
          onClick={() => { logout(); navigate('/admin/login'); }}
          className="w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-semibold text-red-400 hover:bg-red-400/10 transition-colors"
        >
          <LogOut className="w-5 h-5" />
          Đăng xuất
        </button>
      </div>
    </aside>
  );
}
 
export { AdminSidebar };
 
export default function AdminDashboard() {
  const navigate = useNavigate();
  const [stats, setStats] = useState<Stats | null>(null);
 
  // Contest phase state
  const [phases, setPhases] = useState<ContestPhase[]>([]);
  const [currentPhase, setCurrentPhase] = useState<ContestPhase | null>(null);
  const [phaseLoading, setPhaseLoading] = useState(false);
  const [showStartModal, setShowStartModal] = useState(false);
  const [newPhaseName, setNewPhaseName] = useState('');
 
  // Global phase filter — defaults to active phase, then most recent
  const [selectedPhaseId, setSelectedPhaseId] = useState<number | undefined>(undefined);
  const [phaseDefaultSet, setPhaseDefaultSet] = useState(false);
 
  // Delete phase confirm
  const [deletePhaseId, setDeletePhaseId] = useState<number | null>(null);
  const [deleteLoading, setDeleteLoading] = useState(false);
 
  // Unit stats
  const [unitStats, setUnitStats] = useState<UnitStat[]>([]);
 
  // Leaderboard
  const [lbEntries, setLbEntries] = useState<LeaderboardEntry[]>([]);
  const [lbLoading, setLbLoading] = useState(false);
  const [showAllLb, setShowAllLb] = useState(false);
 
  const loadPhases = async () => {
    const [phasesRes, currentRes] = await Promise.all([
      adminApi.getPhases(),
      adminApi.getCurrentPhase(),
    ]);
    setPhases(phasesRes.data.data);
    setCurrentPhase(currentRes.data.data);
    return { phases: phasesRes.data.data, currentPhase: currentRes.data.data };
  };
 
  useEffect(() => {
    loadPhases();
  }, []);
 
  // Auto-select default phase: active phase first, then most recent
  useEffect(() => {
    if (phaseDefaultSet || phases.length === 0) return;
    const active = phases.find((p) => p.status === 'ACTIVE');
    const defaultId = active ? active.id : phases[0].id;
    setSelectedPhaseId(defaultId);
    setPhaseDefaultSet(true);
  }, [phases, phaseDefaultSet]);
 
  // Reload stats + unit stats + leaderboard when phase filter changes
  useEffect(() => {
    setStats(null);
    setLbLoading(true);
    adminApi.getDashboard(selectedPhaseId).then((res) => setStats(res.data.data)).catch(() => {});
    adminApi.getUnitStats(selectedPhaseId)
      .then((r) => setUnitStats(r.data.data))
      .catch(() => setUnitStats([]));
    leaderboardApi.getLeaderboard(selectedPhaseId)
      .then((r) => setLbEntries(r.data.data.entries))
      .catch(() => setLbEntries([]))
      .finally(() => setLbLoading(false));
  }, [selectedPhaseId]);
 
  const handleStartPhase = async () => {
    if (!newPhaseName.trim()) return;
    setPhaseLoading(true);
    try {
      await adminApi.startPhase(newPhaseName.trim());
      setShowStartModal(false);
      setNewPhaseName('');
      const { currentPhase: newCurrent } = await loadPhases();
      // Auto-switch to the newly opened phase tab
      if (newCurrent) setSelectedPhaseId(newCurrent.id);
      toast.success(`Đã mở đợt thi "${newCurrent?.name ?? ''}" thành công`);
    } catch (err) {
      toast.error(extractApiError(err, 'Mở cuộc thi thất bại'));
    } finally {
      setPhaseLoading(false);
    }
  };
 
  const handleStopPhase = async (id: number) => {
    setPhaseLoading(true);
    try {
      await adminApi.stopPhase(id);
      await loadPhases();
      toast.success('Đã kết thúc đợt thi');
      // Navigate to leaderboard for the stopped phase
      navigate(`/admin/phase/${id}/leaderboard`);
    } catch (err) {
      toast.error(extractApiError(err, 'Dừng cuộc thi thất bại'));
    } finally {
      setPhaseLoading(false);
    }
  };
 
  const handleExport = async () => {
    const res = await adminApi.exportExcel();
    const url = URL.createObjectURL(res.data as Blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'results.xlsx';
    a.click();
    URL.revokeObjectURL(url);
  };
 
  const formatDate = (iso: string) =>
    new Date(iso).toLocaleString('vi-VN', { dateStyle: 'short', timeStyle: 'short' });
 
  const handleDeletePhase = async () => {
    if (deletePhaseId === null) return;
    setDeleteLoading(true);
    try {
      await adminApi.deletePhase(deletePhaseId);
      setDeletePhaseId(null);
      if (selectedPhaseId === deletePhaseId) setSelectedPhaseId(undefined);
      await loadPhases();
      toast.success('Đã xóa đợt thi và toàn bộ số liệu liên quan');
    } catch (err) {
      toast.error(extractApiError(err, 'Xóa đợt thi thất bại'));
    } finally {
      setDeleteLoading(false);
    }
  };
 
  const cards = [
    { label: 'Tổng thí sinh', value: stats?.totalParticipants ?? '—', icon: Users, color: 'bg-teal-50 text-teal-700 border-teal-200' },
    { label: 'Điểm trung bình', value: stats ? stats.averageScore.toFixed(1) : '—', icon: Target, color: 'bg-lime-50 text-lime-700 border-lime-200' },
    { label: 'Điểm tuyệt đối', value: stats?.perfectScores ?? '—', icon: Zap, color: 'bg-amber-50 text-amber-700 border-amber-200' },
    { label: 'Đang thi', value: stats?.inProgress ?? '—', icon: Activity, color: 'bg-emerald-50 text-emerald-700 border-emerald-200' },
  ];
 
  // Derived: perfect scorers
  const perfectEntries = lbEntries.filter((e) => e.totalScore === 20);
  // Actual answer = number of perfect scorers (auto-computed)
  const predictionAnswer = perfectEntries.length;
 
  // Derived: top 10 closest predictions
  const closestEntries = lbEntries.length > 0
    ? [...lbEntries]
        .filter((e) => e.prediction != null)
        .sort((a, b) => Math.abs((a.prediction ?? 0) - predictionAnswer) - Math.abs((b.prediction ?? 0) - predictionAnswer))
        .slice(0, 10)
    : [];
 
  return (
    <div className="flex min-h-screen bg-slate-50 font-sans">
      <AdminSidebar active="dashboard" />
      <main className="flex-1 p-6 lg:p-8 space-y-8">
 
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-extrabold text-slate-800">Tổng quan</h1>
            <p className="text-sm text-slate-500 mt-1">Tìm hiểu pháp luật Phòng, chống ma túy năm 2025</p>
          </div>
          <button
            onClick={handleExport}
            className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-teal-700 text-white text-sm font-bold hover:bg-teal-800 shadow-sm transition-colors"
          >
            <Download className="w-4 h-4" />
            Xuất Excel
          </button>
        </div>
 
        {/* Phase filter */}
        {phases.length > 0 && (
          <div className="space-y-3">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-xs font-bold text-slate-500 uppercase tracking-wide mr-1">Đợt thi:</span>
              <button
                onClick={() => setSelectedPhaseId(undefined)}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-colors ${
                  selectedPhaseId === undefined
                    ? 'bg-teal-700 text-white shadow-sm'
                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                }`}
              >
                Tất cả
              </button>
              {phases.map((p) => (
                <span
                  key={p.id}
                  className={`inline-flex items-center gap-1 rounded-xl text-xs font-bold transition-colors ${
                    selectedPhaseId === p.id
                      ? 'bg-teal-700 text-white shadow-sm'
                      : 'bg-slate-100 text-slate-600'
                  }`}
                >
                  <button
                    onClick={() => setSelectedPhaseId(p.id)}
                    className="px-3 py-1.5"
                    title={p.name}
                  >
                    {p.name}
                    {p.status === 'ACTIVE' && (
                      <span className="ml-1.5 inline-block w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse align-middle" />
                    )}
                  </button>
                  <button
                    onClick={() => setDeletePhaseId(p.id)}
                    title="Xóa đợt thi này"
                    className={`pr-2 transition-colors ${selectedPhaseId === p.id ? 'text-white/70 hover:text-red-300' : 'text-slate-400 hover:text-red-500'}`}
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </span>
              ))}
 
              {/* Leaderboard CTA — visible when a specific phase is selected */}
              {selectedPhaseId !== undefined && (
                <button
                  onClick={() => navigate(`/admin/phase/${selectedPhaseId}/leaderboard`)}
                  className="ml-2 flex items-center gap-2 px-4 py-1.5 rounded-xl bg-amber-400 hover:bg-amber-500 text-white text-xs font-bold shadow-sm transition-colors"
                >
                  <Trophy className="w-3.5 h-3.5" />
                  Xem bảng xếp hạng
                </button>
              )}
            </div>
          </div>
        )}
 
        {/* Stats cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {cards.map((card) => (
            <div key={card.label} className={`rounded-2xl border p-6 ${card.color}`}>
              <div className="flex items-center gap-3 mb-3">
                <div className="w-10 h-10 rounded-xl bg-white/60 flex items-center justify-center">
                  <card.icon className="w-5 h-5" />
                </div>
                <p className="text-sm font-semibold opacity-80">{card.label}</p>
              </div>
              <p className="text-4xl font-black">{card.value}</p>
            </div>
          ))}
        </div>
 
        {/* ── Contest Phase Control ── */}
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
          <div className={`px-5 py-3 flex items-center justify-between ${currentPhase ? 'bg-emerald-600' : 'bg-slate-700'}`}>
            <div className="flex items-center gap-2">
              {currentPhase
                ? <PlayCircle className="w-4 h-4 text-white animate-pulse" />
                : <StopCircle className="w-4 h-4 text-slate-300" />}
              <span className="text-white text-sm font-bold uppercase tracking-wider">Điều khiển cuộc thi</span>
              {currentPhase && (
                <span className="ml-2 px-2 py-0.5 rounded-full bg-white/20 text-white text-xs font-bold">ĐANG MỞ</span>
              )}
            </div>
            <div className="flex items-center gap-2">
              {currentPhase ? (
                <button
                  onClick={() => handleStopPhase(currentPhase.id)}
                  disabled={phaseLoading}
                  className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-red-500 hover:bg-red-600 text-white text-xs font-bold transition-colors disabled:opacity-50"
                >
                  <StopCircle className="w-3.5 h-3.5" />
                  Kết thúc
                </button>
              ) : (
                <button
                  onClick={() => setShowStartModal(true)}
                  disabled={phaseLoading}
                  className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-emerald-500 hover:bg-emerald-600 text-white text-xs font-bold transition-colors disabled:opacity-50"
                >
                  <PlayCircle className="w-3.5 h-3.5" />
                  Mở cuộc thi
                </button>
              )}
            </div>
          </div>
 
          <div className="p-5">
            {currentPhase ? (
              <div className="flex items-start gap-4">
                <div>
                  <p className="text-sm font-bold text-slate-800">{currentPhase.name}</p>
                  <p className="text-xs text-slate-500 mt-0.5">Bắt đầu: {formatDate(currentPhase.startTime)}</p>
                </div>
              </div>
            ) : (
              <p className="text-sm text-slate-500">Cuộc thi chưa được mở. Bấm "Mở cuộc thi" để bắt đầu giai đoạn thi mới.</p>
            )}
 
            {phases.length > 0 && (
              <div className="mt-4 border-t border-slate-100 pt-4">
                <p className="text-xs font-bold text-slate-400 uppercase tracking-wide mb-2">Lịch sử các giai đoạn</p>
                <div className="space-y-1.5">
                  {phases.map((p) => (
                    <div key={p.id} className="flex items-center justify-between text-sm">
                      <span className="font-medium text-slate-700">{p.name}</span>
                      <div className="flex items-center gap-3 text-xs text-slate-400">
                        <span>{formatDate(p.startTime)}{p.endTime ? ` -> ${formatDate(p.endTime)}` : ''}</span>
                        <span className={`px-2 py-0.5 rounded-full font-bold ${p.status === 'ACTIVE' ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-100 text-slate-500'}`}>
                          {p.status === 'ACTIVE' ? 'Đang mở' : 'Đã kết thúc'}
                        </span>
                        <button
                          onClick={() => navigate(`/admin/phase/${p.id}/leaderboard`)}
                          className="flex items-center gap-1 px-2.5 py-1 rounded-lg bg-amber-50 hover:bg-amber-100 text-amber-700 font-bold transition-colors border border-amber-200"
                        >
                          <Trophy className="w-3 h-3" />
                          Xếp hạng
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
 
        {/* ── Unit stats + Leaderboard side by side ── */}
        <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
 
          {/* Unit stats */}
          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden flex flex-col">
            <div className="bg-lime-300 px-5 py-3 flex items-center gap-2">
              <Building2 className="w-4 h-4 text-teal-900" />
              <span className="text-teal-900 text-sm font-bold uppercase tracking-wider">Số lượt thi theo đơn vị</span>
              {selectedPhaseId !== undefined && (
                <span className="ml-auto text-xs font-semibold text-teal-700 bg-white/60 px-2 py-0.5 rounded-lg">
                  {phases.find((p) => p.id === selectedPhaseId)?.name ?? ''}
                </span>
              )}
            </div>
            <div className="p-5 flex-1">
              {unitStats.length === 0 ? (
                <p className="text-center text-slate-400 text-sm py-8">Chưa có dữ liệu</p>
              ) : (() => {
                const sorted = [...unitStats].sort((a, b) => b.count - a.count);
                const max = sorted[0]?.count ?? 1;
                const total = sorted.reduce((s, x) => s + x.count, 0);
                const rankBadge = (i: number) => {
                  if (i === 0) return 'bg-amber-400 text-white';
                  if (i === 1) return 'bg-slate-400 text-white';
                  if (i === 2) return 'bg-orange-400 text-white';
                  return 'bg-slate-100 text-slate-500';
                };
                return (
                  <div>
                    <div className="flex items-center justify-between mb-4 px-1">
                      <span className="text-xs text-slate-500 font-medium uppercase tracking-wider">Xếp hạng đơn vị</span>
                      <span className="text-xs font-bold text-slate-600">
                        Tổng: <span className="text-teal-700 text-sm font-black">{total.toLocaleString('vi-VN')}</span> lượt
                      </span>
                    </div>
                    <div className="space-y-3">
                      {sorted.map((s, i) => (
                        <div key={s.unit}>
                          <div className="flex items-center gap-3 mb-1.5">
                            <span className={`w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-black shrink-0 ${rankBadge(i)}`}>
                              {i + 1}
                            </span>
                            <span className="flex-1 text-sm font-semibold text-slate-700 truncate" title={s.unit}>
                              {s.unit || '(Chưa rõ)'}
                            </span>
                            <div className="flex items-center gap-2 shrink-0">
                              <span className="text-sm font-black text-teal-700 tabular-nums">{s.count.toLocaleString('vi-VN')}</span>
                              <span className="text-[10px] font-semibold text-slate-400 w-9 text-right">{Math.round((s.count / total) * 100)}%</span>
                            </div>
                          </div>
                          <div className="ml-9 h-2 rounded-full bg-slate-100 overflow-hidden">
                            <div
                              className={`h-full rounded-full transition-all duration-500 ${i === 0 ? 'bg-gradient-to-r from-teal-600 to-teal-400' : i === 1 ? 'bg-gradient-to-r from-teal-500 to-teal-300' : 'bg-gradient-to-r from-teal-400 to-teal-200'}`}
                              style={{ width: `${(s.count / max) * 100}%` }}
                            />
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                );
              })()}
            </div>
          </div>
 
          {/* Leaderboard */}
          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden flex flex-col">
            <div className="bg-amber-400 px-5 py-3 flex items-center gap-2">
              <Trophy className="w-4 h-4 text-amber-900" />
              <span className="text-amber-900 text-sm font-bold uppercase tracking-wider">Bảng xếp hạng</span>
              {selectedPhaseId !== undefined && (
                <span className="ml-auto text-xs font-semibold text-amber-800 bg-white/50 px-2 py-0.5 rounded-lg">
                  {phases.find((p) => p.id === selectedPhaseId)?.name ?? ''}
                </span>
              )}
            </div>
            <div className="flex-1 overflow-x-auto">
              {lbLoading ? (
                <div className="flex justify-center py-10">
                  <div className="w-8 h-8 border-4 border-teal-200 border-t-teal-700 rounded-full animate-spin" />
                </div>
              ) : lbEntries.length === 0 ? (
                <p className="text-center text-slate-400 text-sm py-10">Chưa có kết quả</p>
              ) : (
                <>
                  <table className="w-full text-sm">
                    <thead className="bg-slate-50 border-b border-slate-200">
                      <tr>
                        <th className="p-3 text-left w-12 text-slate-500 font-semibold">Hạng</th>
                        <th className="p-3 text-left text-slate-500 font-semibold">Họ tên</th>
                        <th className="p-3 text-left text-slate-500 font-semibold hidden lg:table-cell">Đơn vị</th>
                        <th className="p-3 text-left text-slate-500 font-semibold hidden xl:table-cell">SĐT</th>
                        <th className="p-3 text-center text-slate-500 font-semibold">Điểm</th>
                        <th className="p-3 text-center text-slate-500 font-semibold">Dự đoán</th>
                        <th className="p-3 text-center text-slate-500 font-semibold hidden sm:table-cell">T.gian</th>
                      </tr>
                    </thead>
                    <tbody>
                      {(showAllLb ? lbEntries : lbEntries.slice(0, 10)).map((e, i) => (
                        <tr
                          key={e.examId}
                          className="border-t border-slate-100 hover:bg-amber-50/30 transition-colors cursor-pointer"
                          onClick={() => navigate(`/admin/exam/${e.examId}`)}
                        >
                          <td className="p-3 text-center">
                            {i < 3
                              ? <span className="text-xl leading-none">{['🥇', '🥈', '🥉'][i]}</span>
                              : <span className="text-slate-400 font-medium text-sm">{e.rank}</span>}
                          </td>
                          <td className="p-3 text-slate-800 font-semibold">{e.fullName}</td>
                          <td className="p-3 text-slate-500 text-xs hidden lg:table-cell">{e.unit}</td>
                          <td className="p-3 text-slate-500 text-xs hidden xl:table-cell">{e.phone ?? '—'}</td>
                          <td className="p-3 text-center">
                            <span className="inline-flex items-center justify-center px-2.5 py-0.5 rounded-lg bg-teal-50 text-teal-700 font-extrabold text-xs">{e.totalScore}</span>
                          </td>
                          <td className="p-3 text-center text-slate-600 font-bold text-xs">
                            {e.prediction != null ? e.prediction : '—'}
                          </td>
                          <td className="p-3 text-center text-slate-400 text-xs hidden sm:table-cell">
                            {Math.floor(e.durationSeconds / 60)}:{String(e.durationSeconds % 60).padStart(2, '0')}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                  {lbEntries.length > 10 && (
                    <div className="px-5 py-3 border-t border-slate-100 text-center">
                      <button onClick={() => setShowAllLb((v) => !v)} className="text-xs font-bold text-teal-700 hover:text-teal-900 transition-colors">
                        {showAllLb ? 'Thu gọn ▲' : `Xem tất cả ${lbEntries.length} thí sinh ▼`}
                      </button>
                    </div>
                  )}
                </>
              )}
            </div>
          </div>
 
        </div>
 
        {/* ── Perfect scores + Closest predictions ── */}
        <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
 
          {/* Perfect scorers */}
          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden flex flex-col">
            <div className="bg-emerald-500 px-5 py-3 flex items-center gap-2">
              <Zap className="w-4 h-4 text-white" />
              <span className="text-white text-sm font-bold uppercase tracking-wider">Sĩ tử võ - Điểm tuyệt đối</span>
              <span className="ml-auto bg-white/20 text-white text-xs font-bold px-2 py-0.5 rounded-full">{perfectEntries.length} người</span>
            </div>
            <div className="p-4 flex-1">
              {perfectEntries.length === 0 ? (
                <p className="text-center text-slate-400 text-sm py-8">Chưa có ai đạt điểm tuyệt đối</p>
              ) : (
                <div className="space-y-1.5">
                  {perfectEntries.map((e, i) => (
                    <div key={e.examId} className="flex items-center gap-3 px-2 py-2.5 rounded-xl hover:bg-emerald-50/50 transition-colors">
                      <span className="text-lg leading-none w-8 text-center">{['🥇', '🥈', '🥉'][i] ?? <span className="text-slate-400 text-sm font-bold">{i + 1}</span>}</span>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-semibold text-slate-800 truncate">{e.fullName}</p>
                        <p className="text-xs text-slate-400 truncate">{e.unit}</p>
                      </div>
                      <div className="text-right shrink-0">
                        <span className="text-sm font-black text-emerald-600">20 điểm</span>
                        <p className="text-[10px] text-slate-400">{Math.floor(e.durationSeconds / 60)}:{String(e.durationSeconds % 60).padStart(2, '0')}</p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
 
          {/* Closest predictions */}
          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden flex flex-col">
            <div className="bg-violet-500 px-5 py-3 flex items-center gap-2">
              <Target className="w-4 h-4 text-white" />
              <span className="text-white text-sm font-bold uppercase tracking-wider">Dự đoán gần nhất</span>
              <span className="ml-auto bg-white/20 text-white text-xs font-bold px-2 py-0.5 rounded-full">Đáp án: {predictionAnswer} người</span>
            </div>
            <div className="p-4 flex-1">
              {lbEntries.length === 0 ? (
                <p className="text-center text-slate-400 text-sm py-8">Chưa có dữ liệu</p>
              ) : closestEntries.length === 0 ? (
                <p className="text-center text-slate-400 text-sm py-8">Chưa có thí sinh nào nhập dự đoán</p>
              ) : (
                <div className="space-y-1.5">
                  {closestEntries.map((e, i) => {
                    const diff = Math.abs((e.prediction ?? 0) - predictionAnswer);
                    return (
                      <div key={e.examId} className="flex items-center gap-3 px-2 py-2.5 rounded-xl hover:bg-violet-50/50 transition-colors">
                        <span className="text-sm font-black text-slate-400 w-8 text-center">{i + 1}</span>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-semibold text-slate-800 truncate">{e.fullName}</p>
                          <p className="text-xs text-slate-400 truncate">{e.unit}</p>
                        </div>
                        <div className="text-right shrink-0">
                          <span className="text-sm font-black text-violet-600">{e.prediction ?? 0}</span>
                          <p className="text-[10px] text-slate-400">{diff === 0 ? '✅ chính xác' : `±${diff}`}</p>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
 
        </div>
 
      </main>
 
      {/* Delete Phase Confirm Modal */}
      {deletePhaseId !== null && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm p-6">
            <h2 className="text-base font-extrabold text-slate-800 mb-1">Xác nhận xóa đợt thi</h2>
            <p className="text-sm text-slate-500 mb-1">
              Đợt thi: <span className="font-bold text-slate-700">{phases.find((p) => p.id === deletePhaseId)?.name}</span>
            </p>
            <p className="text-xs text-red-600 bg-red-50 border border-red-200 rounded-xl px-3 py-2 mb-5">
              ⚠️ Hành động này sẽ xóa vĩnh viễn đợt thi cùng toàn bộ số liệu bài thi, điểm số và kết quả liên quan. Không thể hoàn tác.
            </p>
            <div className="flex gap-3">
              <button
                onClick={() => setDeletePhaseId(null)}
                className="flex-1 py-2.5 rounded-xl border-2 border-slate-200 text-slate-700 font-bold text-sm hover:bg-slate-50 transition-colors"
              >
                Hủy
              </button>
              <button
                onClick={handleDeletePhase}
                disabled={deleteLoading}
                className="flex-1 py-2.5 rounded-xl bg-red-600 hover:bg-red-700 text-white font-bold text-sm transition-colors disabled:opacity-50"
              >
                {deleteLoading ? 'Đang xóa...' : '🗑 Xóa vĩnh viễn'}
              </button>
            </div>
          </div>
        </div>
      )}
 
      {/* Start Phase Modal */}
      {showStartModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm p-6">
            <h2 className="text-base font-extrabold text-slate-800 mb-1">Mở giai đoạn thi mới</h2>
            <p className="text-xs text-slate-500 mb-4">Đặt tên để phân biệt các lần thi (vd: "Vòng 1 sáng 16/5")</p>
            <input
              autoFocus
              className="w-full rounded-xl border-2 border-slate-200 px-4 py-2.5 text-sm focus:border-teal-500 focus:ring-0 outline-none transition-all mb-4"
              placeholder="Tên giai đoạn..."
              value={newPhaseName}
              onChange={(e) => setNewPhaseName(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleStartPhase()}
            />
            <div className="flex gap-3">
              <button onClick={() => { setShowStartModal(false); setNewPhaseName(''); }} className="flex-1 py-2.5 rounded-xl border-2 border-slate-200 text-slate-700 font-bold text-sm hover:bg-slate-50 transition-colors">Hủy</button>
              <button onClick={handleStartPhase} disabled={!newPhaseName.trim() || phaseLoading} className="flex-1 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-sm transition-colors disabled:opacity-50">
                {phaseLoading ? 'Đang mở...' : '▶ Mở thi'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}