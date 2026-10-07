import React, { useState, useEffect } from 'react';
import { AlertTriangle, CheckCircle2, XCircle, RotateCcw, ShieldAlert, Loader2 } from 'lucide-react';

interface ResetLiveContestModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => Promise<void>;
  sessionName?: string;
  loading?: boolean;
}

export default function ResetLiveContestModal({
  isOpen,
  onClose,
  onConfirm,
  sessionName,
  loading = false,
}: ResetLiveContestModalProps) {
  const [confirmedCheck, setConfirmedCheck] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setConfirmedCheck(false);
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleConfirm = async () => {
    if (!confirmedCheck || loading) return;
    await onConfirm();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/70 backdrop-blur-xs p-4 animate-in fade-in">
      <div className="bg-white rounded-3xl shadow-2xl w-full max-w-xl border-2 border-rose-500 ring-8 ring-rose-500/10 overflow-hidden animate-scaleUp">
        {/* Header Cảnh báo đỏ nổi bật */}
        <div className="bg-gradient-to-r from-rose-600 to-red-600 px-6 py-5 text-white flex items-center justify-between">
          <div className="flex items-center gap-3.5">
            <div className="w-12 h-12 rounded-2xl bg-white/20 backdrop-blur-md flex items-center justify-center shrink-0 shadow-inner">
              <ShieldAlert className="w-7 h-7 text-white animate-pulse" />
            </div>
            <div>
              <div className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-white/20 text-[10px] font-black uppercase tracking-wider text-rose-100 mb-1">
                <AlertTriangle className="w-3 h-3 text-amber-300" />
                Cảnh báo quan trọng cho Ban Tổ Chức
              </div>
              <h3 className="text-lg font-black tracking-tight leading-tight">
                RESET ĐỢT THI &bull; XÓA DỮ LIỆU TEST
              </h3>
            </div>
          </div>
        </div>

        {/* Thân cảnh báo chi tiết */}
        <div className="p-6 space-y-4 max-h-[80vh] overflow-y-auto">
          {sessionName && (
            <div className="text-xs bg-slate-100 px-3.5 py-2 rounded-xl text-slate-700 font-medium">
              Đợt thi mục tiêu: <strong className="text-slate-900 font-bold">{sessionName}</strong>
            </div>
          )}

          <p className="text-xs text-slate-600 leading-relaxed">
            Hành động này được dùng để <strong>làm sạch toàn bộ dữ liệu sau khi chạy thử nghiệm (test)</strong>, đưa phiên thi về trạng thái ban đầu để chuẩn bị bước vào cuộc thi chính thức.
          </p>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5 pt-1">
            {/* Box 1: Dữ liệu SẼ BỊ XÓA */}
            <div className="bg-rose-50/80 border border-rose-200 rounded-2xl p-4 space-y-2.5">
              <div className="flex items-center gap-2 text-rose-700 font-black text-xs uppercase tracking-wider">
                <XCircle className="w-4 h-4 text-rose-600 shrink-0" />
                Dữ liệu sẽ bị xóa hoàn toàn
              </div>
              <ul className="text-[11px] text-rose-950/80 space-y-2 font-medium leading-relaxed">
                <li className="flex items-start gap-1.5">
                  <span className="text-rose-500 font-bold shrink-0">&bull;</span>
                  <span><strong>Vòng 1 (Thông thái):</strong> Xóa sạch toàn bộ câu trả lời, thời gian phản hồi, điểm số và trạng thái Ngôi sao hy vọng.</span>
                </li>
                <li className="flex items-start gap-1.5">
                  <span className="text-rose-500 font-bold shrink-0">&bull;</span>
                  <span><strong>Vòng 2 (Bứt phá):</strong> Hủy mã đề đã chọn, xóa điểm tình huống 1 & 2 và dừng đợt thi 10 phút.</span>
                </li>
                <li className="flex items-start gap-1.5">
                  <span className="text-rose-500 font-bold shrink-0">&bull;</span>
                  <span><strong>Vòng 3 (Bản lĩnh):</strong> Xóa kết quả bốc thăm đối kháng và điểm số Vòng 3.</span>
                </li>
                <li className="flex items-start gap-1.5">
                  <span className="text-rose-500 font-bold shrink-0">&bull;</span>
                  <span><strong>Chung cuộc:</strong> Đưa điểm tổng về 0, hủy xếp hạng, xóa check-in thiết bị và đưa phòng thi về <strong>Sảnh chờ (Lobby)</strong>.</span>
                </li>
              </ul>
            </div>

            {/* Box 2: Dữ liệu ĐƯỢC GIỮ NGUYÊN (PRE-TEST) */}
            <div className="bg-emerald-50/80 border border-emerald-200 rounded-2xl p-4 space-y-2.5">
              <div className="flex items-center gap-2 text-emerald-800 font-black text-xs uppercase tracking-wider">
                <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                Dữ liệu được bảo lưu nguyên vẹn
              </div>
              <ul className="text-[11px] text-emerald-950/80 space-y-2 font-medium leading-relaxed">
                <li className="flex items-start gap-1.5">
                  <span className="text-emerald-600 font-bold shrink-0">&bull;</span>
                  <span><strong>Danh sách 10 thí sinh:</strong> Giữ nguyên họ tên, đơn vị, số báo danh, ảnh đại diện, SĐT đã thiết lập.</span>
                </li>
                <li className="flex items-start gap-1.5">
                  <span className="text-emerald-600 font-bold shrink-0">&bull;</span>
                  <span><strong>Bộ 10 câu hỏi Vòng 1:</strong> Toàn bộ nội dung câu hỏi, video, ảnh minh họa và đáp án đã nạp trong Pre-test.</span>
                </li>
                <li className="flex items-start gap-1.5">
                  <span className="text-emerald-600 font-bold shrink-0">&bull;</span>
                  <span><strong>Bộ 10 đề thi Vòng 2:</strong> Các tình huống nghiệp vụ và thang điểm đã chuẩn bị.</span>
                </li>
              </ul>
            </div>
          </div>

          {/* Hộp xác nhận chống bấm nhầm */}
          <div className="pt-2">
            <label className="flex items-start gap-3 p-3.5 rounded-2xl bg-amber-50/80 border border-amber-300 cursor-pointer select-none hover:bg-amber-50 transition-colors">
              <input
                type="checkbox"
                checked={confirmedCheck}
                onChange={(e) => setConfirmedCheck(e.target.checked)}
                disabled={loading}
                className="mt-0.5 w-4 h-4 text-rose-600 border-amber-400 rounded focus:ring-rose-500 shrink-0"
              />
              <span className="text-xs text-amber-950 font-bold leading-snug">
                Tôi xác nhận đã hiểu rõ: Toàn bộ kết quả thi test của cả 3 vòng sẽ bị xóa sạch để phòng thi bắt đầu lại từ đầu.
              </span>
            </label>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="bg-slate-50 px-6 py-4 border-t border-slate-200 flex items-center justify-end gap-3">
          <button
            type="button"
            onClick={onClose}
            disabled={loading}
            className="px-4 py-2.5 rounded-xl text-xs font-bold text-slate-700 bg-white border border-slate-300 hover:bg-slate-100 transition-colors"
          >
            Hủy bỏ (Giữ nguyên)
          </button>
          <button
            type="button"
            onClick={handleConfirm}
            disabled={!confirmedCheck || loading}
            className={`flex items-center gap-2 px-5 py-2.5 rounded-xl text-xs font-black text-white shadow-lg transition-all active:scale-95 ${
              !confirmedCheck || loading
                ? 'bg-rose-300 cursor-not-allowed shadow-none'
                : 'bg-gradient-to-r from-rose-600 to-red-600 hover:from-rose-700 hover:to-red-700 shadow-rose-600/30'
            }`}
          >
            {loading ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                Đang làm sạch dữ liệu...
              </>
            ) : (
              <>
                <RotateCcw className="w-4 h-4" />
                Xác nhận Reset đợt thi
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
