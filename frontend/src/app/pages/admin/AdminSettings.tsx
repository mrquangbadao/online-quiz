import { useEffect, useState } from 'react';
import { AdminSidebar } from './AdminDashboard';
import { settingsApi } from '../../../api/settingsApi';
import { adminApi } from '../../../api/admin/adminApi';
import { Timer, Megaphone, Check } from 'lucide-react';
import { extractApiError } from '../../../hooks/useApiError';
 
export default function AdminSettings() {
  // Slogan
  const [slogan, setSlogan] = useState('');
  const [sloganInput, setSloganInput] = useState('');
  const [sloganSaving, setSloganSaving] = useState(false);
  const [sloganMsg, setSloganMsg] = useState('');
 
  // Time limit
  const [timeLimitInput, setTimeLimitInput] = useState<string>('0');
  const [timeLimitSaving, setTimeLimitSaving] = useState(false);
  const [timeLimitMsg, setTimeLimitMsg] = useState('');
 
  useEffect(() => {
    settingsApi.getSlogan().then((res) => {
      setSlogan(res.data.data ?? '');
      setSloganInput(res.data.data ?? '');
    }).catch(() => {});
    settingsApi.getTimeLimitMinutes().then((res) => {
      setTimeLimitInput(String(res.data.data ?? 0));
    }).catch(() => {});
  }, []);
 
  const handleSaveSlogan = async () => {
    setSloganSaving(true);
    setSloganMsg('');
    try {
      await adminApi.updateSlogan(sloganInput.trim());
      setSlogan(sloganInput.trim());
      setSloganMsg('Đã lưu thành công');
      setTimeout(() => setSloganMsg(''), 3000);
    } catch (err) {
      setSloganMsg(extractApiError(err, 'Lưu thất bại'));
    } finally {
      setSloganSaving(false);
    }
  };
 
  const handleSaveTimeLimit = async () => {
    const minutes = parseInt(timeLimitInput, 10);
    if (isNaN(minutes) || minutes < 0) return;
    setTimeLimitSaving(true);
    setTimeLimitMsg('');
    try {
      await settingsApi.updateTimeLimitMinutes(minutes);
      setTimeLimitMsg(minutes === 0 ? 'Đã tắt giới hạn thời gian' : `Đã đặt giới hạn: ${minutes} phút`);
      setTimeout(() => setTimeLimitMsg(''), 3000);
    } catch (err) {
      setTimeLimitMsg(extractApiError(err, 'Lưu thất bại'));
    } finally {
      setTimeLimitSaving(false);
    }
  };
 
  return (
    <div className="flex min-h-screen bg-slate-50 font-sans">
      <AdminSidebar active="settings" />
      <main className="flex-1 p-6 lg:p-8 space-y-6 max-w-3xl">
 
        {/* Header */}
        <div>
          <h1 className="text-2xl font-extrabold text-slate-800">Cấu hình</h1>
          <p className="text-sm text-slate-500 mt-1">Thiết lập thông số cho cuộc thi</p>
        </div>
 
        {/* ── Time Limit ── */}
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
          <div className="bg-slate-800 px-5 py-4 flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-white/10 flex items-center justify-center">
              <Timer className="w-4 h-4 text-white" />
            </div>
            <div>
              <p className="text-white text-sm font-bold">Thời gian làm bài</p>
              <p className="text-slate-400 text-xs">Giới hạn tính từ lúc thí sinh bấm "Bắt đầu"</p>
            </div>
          </div>
          <div className="p-6">
            <p className="text-sm text-slate-500 mb-5">
              Nhập <strong className="text-slate-700">0</strong> để không giới hạn thời gian. Khi hết giờ, bài thi tự động nộp và bị đánh dấu <strong className="text-red-600">Hết hạn</strong> nếu thí sinh chưa nộp.
            </p>
            <div className="flex items-center gap-3">
              <div className="relative w-44">
                <input
                  type="number"
                  min="0"
                  max="300"
                  className="w-full rounded-xl border-2 border-slate-200 pl-4 pr-16 py-3 text-sm font-bold focus:border-teal-500 focus:ring-0 outline-none transition-all"
                  value={timeLimitInput}
                  onChange={(e) => setTimeLimitInput(e.target.value)}
                />
                <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-slate-400 font-medium pointer-events-none">phút</span>
              </div>
              <button
                onClick={handleSaveTimeLimit}
                disabled={timeLimitSaving || isNaN(parseInt(timeLimitInput, 10)) || parseInt(timeLimitInput, 10) < 0}
                className="flex items-center gap-2 px-5 py-3 rounded-xl bg-teal-700 hover:bg-teal-800 text-white text-sm font-bold transition-colors disabled:opacity-50"
              >
                <Check className="w-4 h-4" />
                {timeLimitSaving ? 'Đang lưu...' : 'Lưu'}
              </button>
              <span className="text-xs text-slate-400 font-medium">
                {parseInt(timeLimitInput, 10) === 0 ? '⏱ Không giới hạn' : `⏱ ${timeLimitInput} phút / bài`}
              </span>
            </div>
            {timeLimitMsg && (
              <p className="mt-3 text-sm font-semibold text-teal-700">{timeLimitMsg}</p>
            )}
          </div>
        </div>
 
        {/* ── Slogan ── */}
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
          <div className="bg-slate-800 px-5 py-4 flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-white/10 flex items-center justify-center">
              <Megaphone className="w-4 h-4 text-white" />
            </div>
            <div>
              <p className="text-white text-sm font-bold">Slogan chạy ngang</p>
              <p className="text-slate-400 text-xs">Ticker hiển thị liên tục trên tất cả các trang công khai</p>
            </div>
          </div>
          <div className="p-6">
            {slogan && (
              <div className="mb-4 bg-teal-800 rounded-xl overflow-hidden h-9 flex items-center">
                <div
                  className="whitespace-nowrap text-white/90 text-xs font-semibold tracking-wide px-4"
                  style={{ animation: 'marquee-scroll 30s linear infinite' }}
                >
                  {`${slogan}　·　${slogan}　·　${slogan}`}
                </div>
              </div>
            )}
            <div className="flex gap-3 items-start">
              <textarea
                rows={2}
                className="flex-1 rounded-xl border-2 border-slate-200 px-4 py-3 text-sm focus:border-teal-500 focus:ring-0 outline-none transition-all resize-none"
                placeholder="Nhập nội dung slogan cuộc thi..."
                value={sloganInput}
                onChange={(e) => setSloganInput(e.target.value)}
              />
              <button
                onClick={handleSaveSlogan}
                disabled={sloganSaving || !sloganInput.trim() || sloganInput.trim() === slogan}
                className="flex items-center gap-2 px-5 py-3 rounded-xl bg-teal-700 hover:bg-teal-800 text-white text-sm font-bold transition-colors disabled:opacity-50 shrink-0"
              >
                <Check className="w-4 h-4" />
                {sloganSaving ? 'Đang lưu...' : 'Lưu'}
              </button>
            </div>
            {sloganMsg && (
              <p className="mt-3 text-sm font-semibold text-teal-700">{sloganMsg}</p>
            )}
          </div>
        </div>
 
      </main>
    </div>
  );
}