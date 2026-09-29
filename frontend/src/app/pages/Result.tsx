import { useEffect } from 'react';
import { useNavigate } from "react-router-dom";
import { useExamStore } from '../../store/examStore';
import { Trophy, Clock, BarChart3, Home, Star, ArrowRight } from 'lucide-react';
import confetti from 'canvas-confetti';

function formatDuration(seconds: number) {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${m} phút ${s} giây`;
}

export default function Result() {
  const navigate = useNavigate();
  const result = useExamStore((s) => s.result);
  const reset = useExamStore((s) => s.reset);

  useEffect(() => {
    if (!result) navigate('/');
    else {
      confetti({
        particleCount: 150,
        spread: 80,
        origin: { y: 0.5 },
        colors: ['#1d4ed8', '#38bdf8', '#facc15', '#dc2626', '#2563eb']
      });
    }
  }, [result, navigate]);

  if (!result) return null;

  return (
    <div className="flex flex-col min-h-[calc(100vh-44px)] bg-slate-50 font-sans">
      {/* Header */}
      <header className="sticky top-11 z-50 bg-[#1746b8] text-white border-b border-white/10 shadow-sm">
        <div className="w-full flex items-center px-4 py-3 md:px-8 max-w-5xl mx-auto">
          <div className="flex items-center gap-3">
            <img src="/logo-doan.png" alt="Huy hiệu Đoàn" className="w-10 h-10 object-contain shrink-0 drop-shadow-xs select-none" />
            <div>
              <p className="text-[10px] font-black uppercase tracking-widest text-yellow-300">TỈNH ĐOÀN NGHỆ AN</p>
              <h1 className="text-xs sm:text-sm font-extrabold uppercase tracking-wide text-white">
                BÍ THƯ ĐOÀN CƠ SỞ GIỎI 2026
              </h1>
            </div>
          </div>
        </div>
      </header>

      <div className="flex-1 flex items-center justify-center p-4 sm:p-6 md:p-8">
        <div className="w-full max-w-md md:max-w-lg">
          <div className="bg-white rounded-3xl border border-slate-200 shadow-xl overflow-hidden">
            {/* Banner */}
            <div className="bg-gradient-to-b from-[#1746b8] to-[#12389e] px-6 py-6 text-center text-white relative">
              <div className="w-14 h-14 mx-auto rounded-2xl bg-white/15 backdrop-blur-xs flex items-center justify-center mb-2.5 shadow-inner">
                <Trophy className="w-8 h-8 text-yellow-300" />
              </div>
              <h2 className="font-black text-lg sm:text-xl uppercase tracking-wide text-white">
                Hoàn thành bài thi Vòng loại
              </h2>
              <p className="text-blue-200 text-xs sm:text-sm mt-0.5 font-medium">
                Phần thi: Bí thư đoàn cơ sở – Kiến thức
              </p>
            </div>

            <div className="p-6 sm:p-8 text-center">
              {/* Score circle */}
              <div className="relative mx-auto w-36 h-36 mb-6">
                <div className="absolute inset-0 bg-blue-100 rounded-full animate-ping opacity-25" />
                <div className="absolute inset-0 rounded-full border-[6px] border-blue-600 shadow-md flex flex-col items-center justify-center bg-white z-10">
                  <span className="text-5xl font-black text-blue-700 leading-none">{result.totalScore}</span>
                  <span className="text-xs text-slate-400 font-bold uppercase tracking-wider mt-1">/ 30 điểm</span>
                </div>
                {result.totalScore >= 20 && (
                  <div className="absolute -top-2 -right-2 z-20 bg-yellow-400 text-blue-950 rounded-full p-2 shadow-md border-2 border-white animate-bounce">
                    <Star className="w-5 h-5 fill-current" />
                  </div>
                )}
              </div>

              {/* Stats card */}
              <div className="rounded-2xl bg-blue-50/70 border border-blue-200 p-4 mb-5 text-center">
                <div className="flex items-center justify-center gap-6">
                  <div>
                    <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Số câu đúng</p>
                    <p className="text-xl font-black text-blue-800 mt-0.5">{result.mcScore} / 30 câu</p>
                  </div>
                  <div className="w-px h-8 bg-blue-200" />
                  <div>
                    <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Thời gian</p>
                    <p className="text-xl font-black text-blue-800 mt-0.5">{formatDuration(result.durationSeconds)}</p>
                  </div>
                </div>
              </div>

              {/* Notice */}
              <div className="rounded-xl bg-slate-50 border border-slate-200/80 p-3.5 text-xs text-slate-600 leading-relaxed mb-6 text-left">
                <p className="font-semibold text-slate-700 mb-1">Quy chế xét chọn vào Chung kết:</p>
                Căn cứ tổng điểm và thời gian làm bài, Ban Tổ chức sẽ lựa chọn <strong>10 thí sinh có thành tích tốt nhất</strong> tham gia Vòng chung kết cấp Tỉnh đối kháng sân khấu ngày 09/10/2026 tại Nhà khách Nghệ An.
              </div>

              {/* Action buttons */}
              <div className="flex flex-col sm:flex-row gap-3">
                <button
                  onClick={() => {
                    reset();
                    navigate('/');
                  }}
                  className="flex-1 py-3.5 px-4 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-sm shadow-md transition-all flex items-center justify-center gap-2"
                >
                  <Home className="w-4 h-4" />
                  Về trang chủ
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}