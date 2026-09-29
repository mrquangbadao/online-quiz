import { useEffect, useState } from 'react';
import { useParams, useNavigate } from "react-router-dom";
import { leaderboardApi } from '../../../api/leaderboardApi';
import { adminApi, type ContestPhase } from '../../../api/admin/adminApi';
import { AdminSidebar } from './AdminDashboard';
import { Trophy, ArrowLeft, Clock, Users, Download, AlertCircle, Award } from 'lucide-react';
import type { LeaderboardEntry } from '../../../types';
 
const MEDAL = ['🥇', '🥈', '🥉'];
 
const PODIUM: Record<number, { ring: string; bg: string; border: string; badge: string; label: string; color: string }> = {
  1: { ring: 'ring-4 ring-amber-400/60', bg: 'bg-gradient-to-br from-amber-50 to-yellow-100', border: 'border-amber-300', badge: 'bg-amber-400 text-white', label: 'Hạng Nhất', color: 'text-amber-700' },
  2: { ring: 'ring-4 ring-slate-400/60', bg: 'bg-gradient-to-br from-slate-50 to-slate-100', border: 'border-slate-300', badge: 'bg-slate-400 text-white', label: 'Hạng Nhì', color: 'text-slate-600' },
  3: { ring: 'ring-4 ring-orange-400/60', bg: 'bg-gradient-to-br from-orange-50 to-amber-100', border: 'border-orange-300', badge: 'bg-orange-400 text-white', label: 'Hạng Ba', color: 'text-orange-700' },
};
 
function PodiumCard({ entry, rank, showPrediction = true }: { entry: LeaderboardEntry; rank: 1 | 2 | 3; showPrediction?: boolean }) {
  const cfg = PODIUM[rank];
  const fmt = (s: number) => `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;
  return (
    <div className={`relative rounded-2xl border-2 p-6 text-center shadow-md ${cfg.bg} ${cfg.border} ${rank === 1 ? 'shadow-amber-100' : ''}`}>
      <div className="text-4xl leading-none mb-3">{MEDAL[rank - 1]}</div>
      <span className={`inline-flex items-center px-3 py-0.5 rounded-full text-[11px] font-black uppercase tracking-widest ${cfg.badge}`}>
        {cfg.label}
      </span>
      <h3 className={`font-extrabold text-slate-800 leading-tight mt-3 mb-0.5 ${rank === 1 ? 'text-xl' : 'text-lg'}`}>
        {entry.fullName}
      </h3>
      <p className="text-xs text-slate-500 truncate mb-4">{entry.unit || '—'}</p>
      <div className="flex items-center justify-center gap-4">
        <div className="text-center">
          <p className={`text-3xl font-black ${cfg.color}`}>{entry.totalScore}</p>
          <p className="text-[10px] text-slate-400 uppercase tracking-wider mt-0.5">điểm</p>
        </div>
        {showPrediction && (
          <>
            <div className="w-px h-8 bg-slate-200" />
            <div className="text-center">
              <p className={`text-xl font-bold ${cfg.color}`}>{entry.prediction != null ? entry.prediction : '—'}</p>
              <p className="text-[10px] text-slate-400 uppercase tracking-wider mt-0.5">dự đoán</p>
            </div>
          </>
        )}
        <div className="w-px h-8 bg-slate-200" />
        <div className="text-center">
          <p className={`text-lg font-bold ${cfg.color}`}>{fmt(entry.durationSeconds)}</p>
          <p className="text-[10px] text-slate-400 uppercase tracking-wider mt-0.5">thời gian</p>
        </div>
      </div>
    </div>
  );
}

export default function AdminPhaseLeaderboard() {
  const { phaseId } = useParams<{ phaseId: string }>();
  const navigate = useNavigate();
  const [phase, setPhase] = useState<ContestPhase | null>(null);
  const [entries, setEntries] = useState<LeaderboardEntry[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!phaseId) return;
    const id = Number(phaseId);
    setLoading(true);
    Promise.all([
      adminApi.getPhases().then((r) => setPhase(r.data.data.find((p) => p.id === id) ?? null)),
      leaderboardApi.getLeaderboard(id).then((r) => setEntries(r.data.data.entries)),
    ]).finally(() => setLoading(false));
  }, [phaseId]);

  const fmt = (s: number) => `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;
  const top3 = entries.slice(0, 3) as LeaderboardEntry[];
  const isTieAtSixth = entries.length >= 7 &&
    entries[5].totalScore === entries[6].totalScore &&
    entries[5].durationSeconds === entries[6].durationSeconds;
  const showPrediction = phase?.hasPrediction !== false;

  const handleExport = async () => {
    const res = await adminApi.exportExcel();
    const url = URL.createObjectURL(res.data as Blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `xep-hang-${phase?.name ?? phaseId}.xlsx`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="flex flex-col lg:flex-row min-h-screen bg-slate-50 font-sans">
      <AdminSidebar active="bang-diem" />
      <main className="flex-1 p-6 lg:p-8 space-y-8 min-w-0">

        {/* Header */}
        <div className="flex items-center justify-between gap-4 flex-wrap">
          <div className="flex items-center gap-4">
            <button
              onClick={() => navigate('/admin/bang-diem')}
              className="w-10 h-10 rounded-full bg-white border border-slate-200 flex items-center justify-center hover:bg-slate-50 transition-colors shadow-sm shrink-0"
            >
              <ArrowLeft className="w-5 h-5 text-slate-600" />
            </button>
            <div>
              <h1 className="text-2xl font-extrabold text-slate-800 flex items-center gap-2">
                <Trophy className="w-6 h-6 text-amber-500" />
                Bảng xếp hạng
              </h1>
              {phase && (
                <p className="text-sm text-slate-500 mt-0.5">
                  {phase.name}
                  {phase.status === 'ACTIVE' && (
                    <span className="ml-2 inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-700 text-xs font-bold">
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                      Đang mở
                    </span>
                  )}
                  {phase.requireWhitelist && (
                    <span className="ml-2 inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-blue-100 text-blue-700 text-xs font-bold">
                      Danh sách triệu tập
                    </span>
                  )}
                </p>
              )}
            </div>
          </div>
          <div className="flex items-center gap-3">
            {entries.length > 0 && (
              <div className="flex items-center gap-2 text-sm text-slate-600 bg-white border border-slate-200 rounded-xl px-4 py-2">
                <Users className="w-4 h-4 text-teal-600" />
                <span className="font-bold text-teal-700">{entries.length}</span> thí sinh
              </div>
            )}
            <button
              onClick={handleExport}
              className="flex items-center gap-2 px-4 py-2 rounded-xl bg-teal-700 text-white text-sm font-bold hover:bg-teal-800 shadow-sm transition-colors"
            >
              <Download className="w-4 h-4" /> Xuất Excel
            </button>
          </div>
        </div>

        {/* Tie-breaker Warning Banner */}
        {isTieAtSixth && (
          <div className="bg-amber-50 border border-amber-300 rounded-2xl p-4 text-amber-900 flex items-start gap-3 shadow-sm">
            <AlertCircle className="w-6 h-6 text-amber-600 shrink-0 mt-0.5" />
            <div>
              <h4 className="font-extrabold text-sm sm:text-base flex items-center gap-2 text-amber-900">
                Cảnh báo đồng hạng tại vị trí thứ 6 (Vòng Chung Kết)
              </h4>
              <p className="text-xs sm:text-sm text-amber-800 mt-1 leading-relaxed">
                Theo Thể lệ Hội thi Bí thư Đoàn cơ sở giỏi 2026, <strong>Top 06 thí sinh</strong> có điểm số cao nhất và thời gian thi ngắn nhất sẽ giành vé vào Vòng Chung Kết sân khấu. Hiện tại thí sinh xếp thứ 6 và thí sinh thứ 7 có <strong>cùng điểm số ({entries[5].totalScore} điểm) và cùng thời gian ({fmt(entries[5].durationSeconds)})</strong>. Ban Tổ chức cần tổ chức thi tiếp các <strong>câu hỏi phụ phân định</strong> để xác định thí sinh thứ 6 chính thức vào Chung kết.
              </p>
            </div>
          </div>
        )}

        {loading ? (
          <div className="flex justify-center py-20">
            <div className="w-10 h-10 border-4 border-teal-200 border-t-teal-700 rounded-full animate-spin" />
          </div>
        ) : entries.length === 0 ? (
          <div className="bg-white rounded-2xl border border-slate-200 p-20 text-center">
            <Trophy className="w-14 h-14 text-slate-200 mx-auto mb-4" />
            <p className="text-slate-500 font-medium text-lg">Chưa có kết quả thi nào</p>
          </div>
        ) : (
          <>
            {/* ── Podium top 3 ── */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 sm:gap-6">
              {/* 2nd — left, slightly lower */}
              <div className="sm:mt-8 order-2 sm:order-1">
                {top3[1] && <PodiumCard entry={top3[1]} rank={2} showPrediction={showPrediction} />}
              </div>
              {/* 1st — center, highest */}
              <div className="order-1 sm:order-2">
                {top3[0] && <PodiumCard entry={top3[0]} rank={1} showPrediction={showPrediction} />}
              </div>
              {/* 3rd — right, lowest */}
              <div className="sm:mt-14 order-3">
                {top3[2] && <PodiumCard entry={top3[2]} rank={3} showPrediction={showPrediction} />}
              </div>
            </div>

            {/* ── Top 4 - 6 Finalists Cards ── */}
            {entries.length >= 4 && (
              <div className="bg-white rounded-2xl border border-teal-200 p-5 shadow-sm space-y-3">
                <div className="flex items-center gap-2">
                  <Award className="w-5 h-5 text-teal-700" />
                  <h3 className="font-extrabold text-sm text-slate-800 uppercase tracking-wide">
                    03 Thí Sinh Tiếp Theo Giành Quyền Vào Vòng Chung Kết (Hạng 4 – Hạng 6)
                  </h3>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  {entries.slice(3, 6).map((e, idx) => {
                    const rank = idx + 4;
                    return (
                      <div
                        key={e.examId}
                        onClick={() => navigate(`/admin/bai-thi/${e.examId}`)}
                        className="rounded-xl border border-teal-200/80 bg-gradient-to-br from-teal-50/40 to-white p-3.5 flex items-center justify-between cursor-pointer hover:border-teal-400 hover:shadow-xs transition-all"
                      >
                        <div className="flex items-center gap-3 min-w-0">
                          <span className="w-8 h-8 rounded-lg bg-teal-100 text-teal-800 font-black text-sm flex items-center justify-center shrink-0">
                            #{rank}
                          </span>
                          <div className="min-w-0">
                            <h4 className="font-bold text-slate-800 text-xs truncate">{e.fullName}</h4>
                            <p className="text-[11px] text-slate-500 truncate">{e.unit || '—'}</p>
                          </div>
                        </div>
                        <div className="text-right shrink-0 pl-2">
                          <p className="font-black text-teal-700 text-base">{e.totalScore}đ</p>
                          <p className="text-[10px] text-slate-400 font-medium">{fmt(e.durationSeconds)}</p>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* ── Full ranking table ── */}
            {entries.length > 0 && (
              <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
                <div className="px-5 py-3 bg-slate-800 flex items-center justify-between gap-2 flex-wrap">
                  <div className="flex items-center gap-2">
                    <Users className="w-4 h-4 text-slate-300" />
                    <span className="text-white text-sm font-bold uppercase tracking-wider">Danh sách xếp hạng đầy đủ</span>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 text-xs font-semibold">
                      <Award className="w-3.5 h-3.5 text-emerald-400" />
                      Top 6 giành vé vào Vòng Chung Kết
                    </span>
                    <span className="text-slate-400 text-xs font-medium">{entries.length} thí sinh</span>
                  </div>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead className="bg-slate-50 border-b border-slate-200">
                      <tr>
                        <th className="p-3 text-left w-14 text-slate-500 font-semibold text-xs uppercase tracking-wide">Hạng</th>
                        <th className="p-3 text-left text-slate-500 font-semibold text-xs uppercase tracking-wide">Họ tên & Đơn vị</th>
                        <th className="p-3 text-left text-slate-500 font-semibold text-xs uppercase tracking-wide hidden lg:table-cell">SĐT</th>
                        <th className="p-3 text-center text-slate-500 font-semibold text-xs uppercase tracking-wide">Điểm</th>
                        {showPrediction && (
                          <th className="p-3 text-center text-slate-500 font-semibold text-xs uppercase tracking-wide">Dự đoán</th>
                        )}
                        <th className="p-3 text-center text-slate-500 font-semibold text-xs uppercase tracking-wide hidden sm:table-cell">
                          <div className="flex items-center justify-center gap-1"><Clock className="w-3.5 h-3.5" /> T.gian</div>
                        </th>
                        <th className="p-3 text-center text-slate-500 font-semibold text-xs uppercase tracking-wide">Trạng thái</th>
                      </tr>
                    </thead>
                    <tbody>
                      {entries.map((e, i) => (
                        <tr
                          key={e.examId}
                          onClick={() => navigate(`/admin/bai-thi/${e.examId}`)}
                          className={`border-t border-slate-100 transition-colors cursor-pointer ${
                            i < 3
                              ? i === 0 ? 'bg-amber-50/60 hover:bg-amber-50'
                              : i === 1 ? 'bg-slate-50/80 hover:bg-slate-50'
                              : 'bg-orange-50/60 hover:bg-orange-50'
                              : i < 6
                              ? 'bg-emerald-50/30 hover:bg-emerald-50/60'
                              : 'hover:bg-slate-50'
                          }`}
                        >
                          <td className="p-3 text-center">
                            {i < 3
                              ? <span className="text-xl leading-none">{MEDAL[i]}</span>
                              : <span className="text-slate-400 font-bold text-sm">{e.rank}</span>}
                          </td>
                          <td className="p-3">
                            <div className="flex items-center gap-2">
                              <span className="font-semibold text-slate-800">{e.fullName}</span>
                              {i < 6 && (
                                <span className="inline-flex items-center gap-1 text-[10px] font-black uppercase tracking-wider px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 border border-emerald-300">
                                  <Award className="w-3 h-3 text-emerald-600" />
                                  Top 6 Chung Kết
                                </span>
                              )}
                            </div>
                            <div className="text-slate-500 text-xs mt-0.5">{e.unit || '—'}</div>
                          </td>
                          <td className="p-3 text-slate-500 text-xs hidden lg:table-cell">{e.phone ?? '—'}</td>
                          <td className="p-3 text-center">
                            <span className="inline-flex items-center justify-center px-2.5 py-0.5 rounded-lg bg-teal-50 text-teal-700 font-extrabold text-base">
                              {e.totalScore}
                            </span>
                          </td>
                          {showPrediction && (
                            <td className="p-3 text-center font-bold text-slate-600">
                              {e.prediction != null ? e.prediction : '—'}
                            </td>
                          )}
                          <td className="p-3 text-center text-slate-500 font-medium text-xs hidden sm:table-cell">{fmt(e.durationSeconds)}</td>
                          <td className="p-3 text-center">
                            {i < 6 ? (
                              <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold bg-emerald-100 text-emerald-700">
                                Vào Chung kết
                              </span>
                            ) : (
                              <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium text-slate-400">
                                Hoàn thành
                              </span>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </>
        )}
      </main>
    </div>
  );
}
