import { useEffect } from 'react';
import { useNavigate } from "react-router-dom";
import { useExamStore } from '../../store/examStore';
import { Trophy, Clock, BarChart3, Home, Star } from 'lucide-react';
import VietnamEmblem from "../components/VietnamEmblem";
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
        colors: ['#10b981', '#f59e0b', '#fbbf24', '#059669', '#34d399']
      });
    }
  }, [result, navigate]);

  if (!result) return null;

  const scorePercent = Math.round((result.totalScore / 20) * 100);

  return (
    <div className="flex flex-col min-h-[calc(100vh-48px)] bg-gradient-to-br from-teal-50 via-white to-lime-50 font-sans">
      {/* Navbar */}
      <header className="sticky top-12 z-50 bg-white/90 backdrop-blur border-b border-slate-200/60 shadow-sm">
        <div className="w-full flex items-center px-4 py-3 md:px-12 lg:px-20 md:py-4">
          <div className="flex items-center gap-3">
            <VietnamEmblem size={36} showBorder={false} onClick={() => navigate('/')} />
            <p className="text-base font-bold text-slate-800">Kết quả bài thi</p>
          </div>
        </div>
      </header>

      <div className="flex-1 flex items-center justify-center p-4 md:p-8 lg:p-12">
        <div className="w-full max-w-lg lg:max-w-xl">
          <div className="bg-white rounded-2xl lg:rounded-3xl border border-slate-200 shadow-xl overflow-hidden">
            {/* Green header */}
            <div className="bg-lime-300 px-6 py-6 lg:py-8 text-center">
              <Trophy className="w-12 h-12 lg:w-14 lg:h-14 text-teal-900 mx-auto mb-3" />
              <h1 className="text-teal-900 font-extrabold text-xl lg:text-2xl">Hoàn thành bài thi!</h1>
            </div>

            <div className="p-6 md:p-8 lg:p-10 text-center">
              {/* Score circle */}
              <div className="relative mx-auto w-32 h-32 lg:w-44 lg:h-44 mb-8">
                <div className="absolute inset-0 bg-green-400 rounded-full animate-ping opacity-20"></div>
                <div className="absolute inset-0 rounded-full border-[6px] lg:border-[8px] border-green-500 shadow-[0_0_30px_rgba(34,197,94,0.4)] flex flex-col items-center justify-center bg-white z-10">
                  <span className="text-4xl lg:text-6xl font-black text-green-700 leading-none">{result.totalScore}</span>
                  <span className="text-sm lg:text-base text-slate-500 font-bold mt-1">/20 điểm</span>
                </div>
                {result.totalScore >= 15 && (
                  <div className="absolute -top-3 -right-3 z-20 bg-yellow-400 text-green-900 rounded-full p-2 lg:p-2.5 shadow-lg border-2 border-white animate-bounce">
                    <Star className="w-5 h-5 lg:w-7 lg:h-7 fill-current" />
                  </div>
                )}
              </div>

              <div className="grid grid-cols-2 gap-3 lg:gap-4 mb-6 lg:mb-8">
                <div className="rounded-xl bg-teal-50 border border-teal-100 p-4 lg:p-5">
                  <BarChart3 className="w-5 h-5 lg:w-6 lg:h-6 text-teal-600 mx-auto mb-1.5" />
                  <p className="text-xs lg:text-sm text-slate-500 font-medium">Trắc nghiệm</p>
                  <p className="text-xl lg:text-2xl font-bold text-teal-800">{result.mcScore}/10</p>
                </div>
                <div className="rounded-xl bg-lime-50 border border-lime-200 p-4 lg:p-5">
                  <BarChart3 className="w-5 h-5 lg:w-6 lg:h-6 text-teal-600 mx-auto mb-1.5" />
                  <p className="text-xs lg:text-sm text-slate-500 font-medium">Tình huống</p>
                  <p className="text-xl lg:text-2xl font-bold text-teal-800">{result.scenarioScore}/10</p>
                </div>
              </div>

              <div className="rounded-xl bg-slate-50 border border-slate-100 p-4 lg:p-5 mb-6 lg:mb-8 flex items-center justify-center gap-2">
                <Clock className="w-4 h-4 lg:w-5 lg:h-5 text-slate-500" />
                <span className="text-sm lg:text-base text-slate-600 font-medium">Thời gian: <b className="text-slate-800">{formatDuration(result.durationSeconds)}</b></span>
              </div>

              <button
                onClick={() => { reset(); navigate('/'); }}
                className="w-full py-3.5 lg:py-4 rounded-xl bg-teal-700 hover:bg-teal-800 text-white font-bold text-base lg:text-lg shadow-sm transition-all flex items-center justify-center gap-2"
              >
                <Home className="w-5 h-5" /> Về trang chủ
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}