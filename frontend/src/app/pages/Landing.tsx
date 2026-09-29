import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import "./Landing.css";
import {
  ArrowRight,
  Trophy,
  Medal,
  Award,
  MapPin,
  ChevronRight,
  Flag,
  FileCheck2,
  Sparkles,
  Building,
  Smartphone,
  Laptop,
  Flame,
  Globe2,
  CheckCircle2,
  Clock,
  Star,
} from "lucide-react";
import { examApi } from "../../api/examApi";
import BrandMark from "../components/BrandMark";
import StatsSection from "../components/StatsSection";
import DigitalTechBackground from "../components/DigitalTechBackground";
import { toast } from "../components/ui/Toast";

export default function Landing() {
  const navigate = useNavigate();
  const [activePhase, setActivePhase] = useState<{ id: number; name: string; status: string } | null>(null);
  const [checkingPhase, setCheckingPhase] = useState(false);
  const [scrolledPastTop, setScrolledPastTop] = useState(false);

  useEffect(() => {
    examApi
      .getCurrentPhase()
      .then((res) => {
        if (res.data.data) {
          setActivePhase(res.data.data);
        }
      })
      .catch((err) => {
        console.error("Failed to fetch active phase:", err);
      });

    const handleScroll = () => {
      setScrolledPastTop(window.scrollY > 40);
    };
    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  const handleEnterQuiz = async () => {
    setCheckingPhase(true);
    try {
      const res = await examApi.getCurrentPhase();
      const phase = res.data.data;
      if (!phase || phase.status !== "ACTIVE") {
        toast.error("Hội thi hiện chưa mở. Vui lòng chờ thông báo từ Ban Tổ chức Tỉnh đoàn.");
        return;
      }
      navigate("/thi");
    } catch {
      toast.error("Không thể kết nối máy chủ. Vui lòng thử lại.");
    } finally {
      setCheckingPhase(false);
    }
  };

  return (
    <div className="flex flex-col min-h-screen font-sans bg-white text-slate-800 w-full overflow-x-hidden">
      {/* ════════════ NAVBAR (Ghim bên dưới MarqueeBanner) ════════════ */}
      <header
        className={`fixed top-11 w-full z-50 transition-all duration-300 ${
          scrolledPastTop
            ? "bg-[#10348c]/95 backdrop-blur-md border-b border-white/15 shadow-md"
            : "bg-[#1746b8] border-b border-white/10"
        }`}
      >
        <div className="w-full flex items-center justify-between px-3 sm:px-4 md:px-8 py-2 sm:py-2.5 max-w-[1400px] mx-auto gap-2">
          {/* Logo & Tiêu đề thanh Navbar */}
          <div
            onClick={() => window.scrollTo({ top: 0, behavior: "smooth" })}
            className="flex items-center gap-2 sm:gap-3 group cursor-pointer text-white min-w-0"
          >
            <BrandMark size={34} showBorder={false} className="shrink-0 sm:hidden" />
            <BrandMark size={40} showBorder={false} className="shrink-0 hidden sm:block" />
            <div className="leading-tight min-w-0">
              <p className="text-[9px] sm:text-xs font-black tracking-wider uppercase text-yellow-300 truncate">
                TỈNH ĐOÀN NGHỆ AN
              </p>
              <p className="text-[11px] sm:text-sm font-extrabold uppercase tracking-tight sm:tracking-wide text-white drop-shadow-xs truncate">
                BÍ THƯ ĐOÀN CƠ SỞ GIỎI 2026
              </p>
            </div>
          </div>

          {/* Trạng thái đợt thi & Nút vào thi */}
          <div className="flex items-center gap-2 sm:gap-3 shrink-0">
            {activePhase && (
              <div className="hidden md:flex items-center gap-2.5 bg-black/25 backdrop-blur-md border border-white/15 rounded-full px-3.5 py-1.5 shrink min-w-0 max-w-sm lg:max-w-md xl:max-w-xl">
                <span className="text-xs font-bold text-white tracking-wide uppercase truncate" title={activePhase.name}>
                  {activePhase.name}
                </span>
                <ChevronRight className="w-3.5 h-3.5 text-white/50 shrink-0" />
                <span
                  className={`shrink-0 flex items-center gap-1.5 text-[10px] font-black uppercase tracking-wider ${
                    activePhase.status === "ACTIVE" ? "text-emerald-300" : "text-slate-300"
                  }`}
                >
                  <span
                    className={`w-2 h-2 rounded-full ${
                      activePhase.status === "ACTIVE" ? "bg-emerald-400 animate-pulse" : "bg-slate-400"
                    }`}
                  />
                  {activePhase.status === "ACTIVE" ? "Đang mở" : "Đã kết thúc"}
                </span>
              </div>
            )}
            <button
              onClick={handleEnterQuiz}
              disabled={checkingPhase}
              className="px-3.5 sm:px-6 py-1.5 sm:py-2 rounded-full bg-yellow-400 hover:bg-yellow-300 text-blue-950 text-xs sm:text-sm font-black shadow-md hover:shadow-lg transition-all disabled:opacity-50 uppercase tracking-wide shrink-0 active:scale-95"
            >
              {checkingPhase ? "Đang kiểm tra..." : "Vào thi"}
            </button>
          </div>
        </div>
      </header>

      {/* ════════════ SECTION 1: HERO (Tone xanh sáng hiện đại, bố cục cân đối chuẩn chỉnh) ════════════ */}
      <section className="relative bg-gradient-to-b from-[#134bc4] via-[#1d63ea] to-[#1448b8] text-white pt-24 sm:pt-28 md:pt-32 pb-10 sm:pb-16 md:pb-20 px-3 sm:px-4 overflow-hidden flex flex-col items-center justify-start w-full">
        {/* Digital Transformation Vector Graphic Background (Chạy 2 bên mép, không đè chữ) */}
        <DigitalTechBackground />

        {/* Subtle geometric dot matrix */}
        <div
          className="absolute inset-0 opacity-[0.04] pointer-events-none"
          style={{
            backgroundImage: "radial-gradient(#ffffff 1.5px, transparent 1.5px)",
            backgroundSize: "20px 20px",
          }}
        />

        <div className="relative z-10 w-full max-w-[1100px] mx-auto flex flex-col items-center text-center min-w-0">
          {/* Logo Đoàn TNCS Hồ Chí Minh to, cân đối ở giữa màn hình (chuẩn cả mobile và desktop) */}
          <div className="relative mb-2.5 sm:mb-4 flex items-center justify-center">
            <div className="absolute inset-0 bg-yellow-400/20 blur-2xl rounded-full scale-110 pointer-events-none" />
            <img
              src="/logo-doan.png"
              alt="Huy hiệu Đoàn TNCS Hồ Chí Minh"
              className="relative z-10 w-20 h-20 min-[375px]:w-24 min-[375px]:h-24 sm:w-32 sm:h-32 md:w-36 md:h-36 lg:w-40 lg:h-40 mx-auto object-contain drop-shadow-[0_10px_25px_rgba(0,0,0,0.35)] select-none hover:scale-105 transition-transform duration-300"
            />
          </div>

          {/* Subheading / Đơn vị tổ chức */}
          <div className="inline-flex items-center gap-1.5 sm:gap-2 bg-white/20 hover:bg-white/25 backdrop-blur-md border border-white/30 rounded-full px-3.5 sm:px-5 py-1 sm:py-1.5 mb-2.5 sm:mb-4 shadow-sm transition-colors">
            <Sparkles className="w-3 h-3 sm:w-3.5 sm:h-3.5 text-yellow-300 shrink-0" />
            <span className="text-[11px] sm:text-sm font-black uppercase tracking-wider text-yellow-300 drop-shadow-xs">
              TỈNH ĐOÀN NGHỆ AN
            </span>
          </div>

          {/* Tiêu đề chính chuẩn bố cục biểu ngữ Đoàn (3 dòng chuẩn, không ngắt vụn chữ) */}
          <div className="max-w-4xl mx-auto w-full px-2 min-w-0">
            <p className="text-[11px] sm:text-base md:text-lg text-sky-200 font-black uppercase tracking-[0.2em] mb-0.5 sm:mb-1 drop-shadow-xs">
              HỘI THI
            </p>
            <h1 className="text-[18px] min-[360px]:text-[20px] sm:text-3xl md:text-4xl lg:text-5xl font-black uppercase text-white leading-tight tracking-tight drop-shadow-md">
              BÍ THƯ ĐOÀN CƠ SỞ GIỎI
            </h1>
            <p className="text-[16px] min-[360px]:text-lg sm:text-2xl md:text-3xl lg:text-4xl font-black text-yellow-300 uppercase tracking-wide mt-1 sm:mt-2 drop-shadow-md">
              TỈNH NGHỆ AN NĂM 2026
            </p>
          </div>

          {/* Khẩu hiệu chính thức & Thông tin phụ (Ngắt nhịp chuẩn xác 3 vế cân đối trên mọi màn hình) */}
          <div className="mt-3 sm:mt-5 max-w-xl mx-auto px-2 min-w-0 w-full">
            <p className="text-[11px] min-[375px]:text-xs sm:text-sm md:text-base font-bold text-white italic tracking-wide drop-shadow-xs mb-1.5 sm:mb-2 leading-relaxed text-center">
              <span className="inline-block whitespace-nowrap">“Khát vọng cống hiến</span>
              <span className="text-yellow-300 font-bold mx-1">–</span>
              <span className="inline-block whitespace-nowrap">Rèn đức luyện tài</span>
              <span className="text-yellow-300 font-bold mx-1">–</span>
              <span className="inline-block whitespace-nowrap">Vững bước tương lai”</span>
            </p>
            <p className="text-[11px] sm:text-xs md:text-sm text-white/90 font-medium leading-relaxed max-w-lg mx-auto text-balance">
              Sân chơi rèn luyện bản lĩnh chính trị, chuyên môn nghiệp vụ và kỹ năng công tác cho đội ngũ cán bộ Đoàn cơ sở tỉnh Nghệ An.
            </p>
          </div>

          {/* Các nút hành động chính */}
          <div className="mt-5 sm:mt-7 flex flex-col sm:flex-row items-center justify-center gap-2.5 sm:gap-3.5 w-full max-w-xs sm:max-w-none mx-auto px-2">
            <button
              onClick={handleEnterQuiz}
              disabled={checkingPhase}
              className="w-full sm:w-auto px-6 sm:px-9 py-2.5 sm:py-3.5 rounded-full bg-yellow-400 hover:bg-yellow-300 text-blue-950 font-black text-xs sm:text-sm uppercase tracking-wider shadow-md hover:shadow-lg hover:scale-105 active:scale-95 transition-all flex items-center justify-center gap-2"
            >
              <span>Vào thi Vòng loại ngay</span>
              <ArrowRight className="w-4 h-4" />
            </button>
            <a
              href="#roadmap"
              className="w-full sm:w-auto px-5 sm:px-8 py-2.5 sm:py-3.5 rounded-full bg-white/15 hover:bg-white/25 border border-white/30 text-white font-bold text-xs sm:text-sm uppercase tracking-wider transition-all flex items-center justify-center"
            >
              Xem Toàn cảnh Hội thi
            </a>
          </div>
        </div>
      </section>

      {/* ════════════ SECTION 2: STATS & QUY CÁCH VÒNG LOẠI ════════════ */}
      <StatsSection />

      {/* ════════════ SECTION 3: TOÀN CẢNH LỘ TRÌNH 5 CHẶNG HỘI THI (ĐẸP MẮT & NỔI BẬT) ════════════ */}
      <section id="roadmap" className="relative py-14 sm:py-20 lg:py-24 bg-gradient-to-b from-white via-slate-50/80 to-white overflow-hidden border-b border-slate-200">
        {/* Soft background ambient lighting */}
        <div className="absolute top-1/4 left-1/2 -translate-x-1/2 w-[700px] h-[350px] bg-blue-100/40 rounded-full blur-[120px] pointer-events-none" />

        <div className="max-w-[1360px] mx-auto px-3.5 sm:px-6 lg:px-8 relative z-10 w-full min-w-0">
          {/* Section Header */}
          <div className="text-center mb-8 sm:mb-12 md:mb-16 px-2">
            <span className="text-[10px] sm:text-xs font-black tracking-widest text-[#1746b8] uppercase bg-blue-100/80 px-3.5 sm:px-4 py-1 sm:py-1.5 rounded-full inline-flex items-center gap-1.5 mb-2.5 sm:mb-3 border border-blue-200 shadow-2xs">
              <Flag className="w-3.5 h-3.5 text-[#1746b8]" /> TOÀN CẢNH CUỘC THI
            </span>
            <h2 className="text-lg min-[360px]:text-xl sm:text-3xl lg:text-4xl font-black text-slate-800 tracking-tight leading-snug">
              LỘ TRÌNH TỪ CƠ SỞ ĐẾN TOÀN QUỐC
            </h2>
            <div className="w-20 h-1.5 bg-gradient-to-r from-blue-600 via-sky-500 to-yellow-400 mx-auto mt-2.5 sm:mt-3 rounded-full" />
            <p className="text-xs sm:text-sm text-slate-500 mt-2.5 sm:mt-3 max-w-2xl mx-auto leading-relaxed">
              Chuỗi 05 chặng liên hoàn từ cơ sở xã, phường đến Vòng loại cấp tỉnh, Chung kết đối kháng sân khấu và Vòng chung kết toàn quốc tại Thủ đô Hà Nội
            </p>
          </div>

          {/* ── DESKTOP STEPPER CONNECTOR BAR (≥ lg) ── */}
          <div className="hidden lg:block mb-8 relative">
            <div className="grid grid-cols-5 gap-5 relative">
              {/* Connecting Track Line behind nodes */}
              <div className="absolute top-5 left-[10%] right-[10%] h-1 bg-slate-200 -z-0">
                {/* Active progress fill up to Step 3 */}
                <div className="h-full bg-gradient-to-r from-emerald-500 via-emerald-400 to-[#1746b8] w-[50%]" />
              </div>

              {/* Step 1 Node */}
              <div className="flex flex-col items-center relative z-10">
                <div className="w-10 h-10 rounded-full bg-emerald-500 text-white font-black text-xs flex items-center justify-center shadow-md border-4 border-white">
                  <CheckCircle2 className="w-5 h-5" />
                </div>
                <span className="text-[11px] font-bold text-emerald-700 mt-2">Chặng 1: Hoàn thành</span>
              </div>

              {/* Step 2 Node */}
              <div className="flex flex-col items-center relative z-10">
                <div className="w-10 h-10 rounded-full bg-emerald-500 text-white font-black text-xs flex items-center justify-center shadow-md border-4 border-white">
                  <CheckCircle2 className="w-5 h-5" />
                </div>
                <span className="text-[11px] font-bold text-emerald-700 mt-2">Chặng 2: Hoàn thành</span>
              </div>

              {/* Step 3 Node (Active Beacon) */}
              <div className="flex flex-col items-center relative z-10">
                <div className="relative">
                  <span className="absolute -inset-1 rounded-full bg-blue-500/40 animate-ping" />
                  <div className="w-11 h-11 rounded-full bg-gradient-to-tr from-[#10348c] via-[#1746b8] to-blue-500 text-yellow-300 font-black text-sm flex items-center justify-center shadow-lg border-4 border-white relative z-10">
                    03
                  </div>
                </div>
                <span className="text-[11px] font-black text-[#1746b8] mt-1.5 flex items-center gap-1 uppercase tracking-wide">
                  <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                  Đang diễn ra
                </span>
              </div>

              {/* Step 4 Node */}
              <div className="flex flex-col items-center relative z-10">
                <div className="w-10 h-10 rounded-full bg-white text-amber-700 font-black text-xs flex items-center justify-center shadow-sm border-2 border-amber-300">
                  04
                </div>
                <span className="text-[11px] font-bold text-slate-500 mt-2">Chặng 4: Sắp diễn ra</span>
              </div>

              {/* Step 5 Node */}
              <div className="flex flex-col items-center relative z-10">
                <div className="w-10 h-10 rounded-full bg-white text-purple-700 font-black text-xs flex items-center justify-center shadow-sm border-2 border-purple-300">
                  <Star className="w-4 h-4 text-purple-600 fill-purple-100" />
                </div>
                <span className="text-[11px] font-bold text-purple-700 mt-2">Chung kết Toàn quốc</span>
              </div>
            </div>
          </div>

          {/* ── CARDS GRID (Mobile-First Timeline & Desktop Cards) ── */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4 sm:gap-5 items-stretch">
            {/* ── CHẶNG 1: CẤP XÃ, PHƯỜNG ── */}
            <div className="group rounded-2xl sm:rounded-3xl border border-slate-200/90 p-5 sm:p-6 bg-white hover:bg-slate-50/80 shadow-2xs hover:shadow-md transition-all duration-300 flex flex-col justify-between relative overflow-hidden">
              <div className="absolute top-0 left-0 right-0 h-1 bg-emerald-500" />
              <div>
                <div className="flex items-center justify-between mb-3.5">
                  <span className="text-xs font-black text-emerald-700 uppercase tracking-wide">Chặng 01</span>
                  <span className="text-[10px] font-bold px-2.5 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200 flex items-center gap-1">
                    <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                    Đã xong
                  </span>
                </div>
                <div className="w-11 h-11 rounded-2xl bg-blue-50 text-[#1746b8] border border-blue-100 flex items-center justify-center mb-3.5 group-hover:scale-105 transition-transform">
                  <Building className="w-5 h-5" />
                </div>
                <h3 className="font-extrabold text-slate-900 text-base mb-1 tracking-tight">CẤP XÃ, PHƯỜNG</h3>
                <p className="text-xs text-blue-600 font-bold mb-2">100% Cơ sở Đoàn</p>
                <p className="text-xs text-slate-600 leading-relaxed">
                  Tổ chức tuyên truyền sâu rộng, phát động phong trào rèn luyện, thi đua sôi nổi tại từng chi đoàn và đoàn cơ sở.
                </p>
              </div>
              <div className="pt-4 mt-4 border-t border-slate-100 text-[11px] text-slate-400 font-medium">
                Khởi động tháng 7/2026
              </div>
            </div>

            {/* ── CHẶNG 2: VÒNG SƠ KHẢO ── */}
            <div className="group rounded-2xl sm:rounded-3xl border border-slate-200/90 p-5 sm:p-6 bg-white hover:bg-slate-50/80 shadow-2xs hover:shadow-md transition-all duration-300 flex flex-col justify-between relative overflow-hidden">
              <div className="absolute top-0 left-0 right-0 h-1 bg-emerald-500" />
              <div>
                <div className="flex items-center justify-between mb-3.5">
                  <span className="text-xs font-black text-emerald-700 uppercase tracking-wide">Chặng 02</span>
                  <span className="text-[10px] font-bold px-2.5 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200 flex items-center gap-1">
                    <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                    Đã xong
                  </span>
                </div>
                <div className="w-11 h-11 rounded-2xl bg-sky-50 text-sky-700 border border-sky-100 flex items-center justify-center mb-3.5 group-hover:scale-105 transition-transform">
                  <Smartphone className="w-5 h-5" />
                </div>
                <h3 className="font-extrabold text-slate-900 text-base mb-1 tracking-tight">VÒNG SƠ KHẢO</h3>
                <p className="text-xs text-sky-700 font-bold mb-2">03/8 – 29/8/2026</p>
                <p className="text-xs text-slate-600 leading-relaxed">
                  Thi 04 tuần trực tuyến trên App Thanh niên Việt Nam với 127 thí sinh và 876 lượt thi; chọn 70 thí sinh vào vòng tỉnh.
                </p>
              </div>
              <div className="pt-4 mt-4 border-t border-slate-100 text-[11px] text-slate-400 font-medium">
                Tuyển chọn 70 thí sinh
              </div>
            </div>

            {/* ── CHẶNG 3: VÒNG LOẠI TỈNH (TIÊU ĐIỂM CHÍNH - HERO CARD) ── */}
            <div className="group rounded-2xl sm:rounded-3xl bg-gradient-to-b from-[#0d348a] via-[#1243af] to-[#0b2b73] text-white p-5 sm:p-6 shadow-xl shadow-blue-900/25 border-2 border-yellow-400 ring-4 ring-blue-500/20 flex flex-col justify-between relative overflow-hidden lg:-translate-y-2 transition-all duration-300">
              {/* Highlight ribbon accent */}
              <div className="absolute top-0 right-0 w-28 h-28 bg-yellow-400/10 rounded-full blur-2xl pointer-events-none" />

              <div>
                <div className="flex items-center justify-between mb-3.5">
                  <span className="text-xs font-black uppercase tracking-wider text-yellow-300">
                    Chặng 03 · TIÊU ĐIỂM
                  </span>
                  <span className="text-[10px] font-black px-2.5 py-1 rounded-full bg-yellow-400 text-blue-950 uppercase tracking-wide flex items-center gap-1.5 shadow-sm">
                    <span className="w-2 h-2 rounded-full bg-red-600 animate-pulse" />
                    Đang diễn ra
                  </span>
                </div>

                <div className="w-11 h-11 rounded-2xl bg-white/15 backdrop-blur-xs text-yellow-300 border border-white/20 flex items-center justify-center mb-3.5 shadow-xs">
                  <Laptop className="w-5 h-5" />
                </div>

                <h3 className="font-black text-white text-lg mb-1 tracking-tight">
                  VÒNG LOẠI TỈNH
                </h3>
                <p className="text-xs text-yellow-300 font-bold mb-2.5 flex items-center gap-1.5">
                  <Clock className="w-3.5 h-3.5" /> Dự kiến 30/9/2026
                </p>
                <p className="text-xs text-blue-100/90 leading-relaxed">
                  Phần thi <strong>"Bí thư Đoàn cơ sở – Kiến thức"</strong>: 30 câu trắc nghiệm / 20 phút. Tuyển chọn <strong>Top 06 thí sinh</strong> vào Chung kết.
                </p>
              </div>

              <div className="pt-4 mt-4 border-t border-white/15">
                <button
                  onClick={handleEnterQuiz}
                  className="w-full py-2.5 rounded-xl bg-yellow-400 hover:bg-yellow-300 text-blue-950 text-xs font-black uppercase tracking-wider flex items-center justify-center gap-1.5 shadow-md active:scale-98 transition-all"
                >
                  <span>Vào thi vòng loại</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>

            {/* ── CHẶNG 4: CHUNG KẾT TỈNH ── */}
            <div className="group rounded-2xl sm:rounded-3xl border border-slate-200/90 p-5 sm:p-6 bg-white hover:bg-slate-50/80 shadow-2xs hover:shadow-md transition-all duration-300 flex flex-col justify-between relative overflow-hidden">
              <div className="absolute top-0 left-0 right-0 h-1 bg-amber-500" />
              <div>
                <div className="flex items-center justify-between mb-3.5">
                  <span className="text-xs font-black text-slate-500 uppercase tracking-wide">Chặng 04</span>
                  <span className="text-[10px] font-bold px-2.5 py-0.5 rounded-full bg-amber-50 text-amber-800 border border-amber-200">
                    Sắp diễn ra
                  </span>
                </div>
                <div className="w-11 h-11 rounded-2xl bg-amber-50 text-amber-700 border border-amber-100 flex items-center justify-center mb-3.5 group-hover:scale-105 transition-transform">
                  <Flame className="w-5 h-5" />
                </div>
                <h3 className="font-extrabold text-slate-900 text-base mb-1 tracking-tight">CHUNG KẾT TỈNH</h3>
                <p className="text-xs text-amber-700 font-bold mb-2">Dự kiến 09/10/2026</p>
                <p className="text-xs text-slate-600 leading-relaxed">
                  Tại Nhà khách Nghệ An với 03 phần thi đối kháng sân khấu: <strong>Thông thái</strong>, <strong>Nhạy bén</strong> và <strong>Bản lĩnh</strong>.
                </p>
              </div>
              <div className="pt-4 mt-4 border-t border-slate-100 text-[11px] text-slate-400 font-medium">
                Top 06 thí sinh xuất sắc
              </div>
            </div>

            {/* ── CHẶNG 5: CHUNG KẾT TOÀN QUỐC ── */}
            <div className="group rounded-2xl sm:rounded-3xl border border-slate-200/90 p-5 sm:p-6 bg-white hover:bg-slate-50/80 shadow-2xs hover:shadow-md transition-all duration-300 flex flex-col justify-between relative overflow-hidden">
              <div className="absolute top-0 left-0 right-0 h-1 bg-purple-600" />
              <div>
                <div className="flex items-center justify-between mb-3.5">
                  <span className="text-xs font-black text-purple-700 uppercase tracking-wide">Chặng 05</span>
                  <span className="text-[10px] font-bold px-2.5 py-0.5 rounded-full bg-purple-50 text-purple-700 border border-purple-200">
                    Toàn quốc
                  </span>
                </div>
                <div className="w-11 h-11 rounded-2xl bg-purple-50 text-purple-700 border border-purple-100 flex items-center justify-center mb-3.5 group-hover:scale-105 transition-transform">
                  <Globe2 className="w-5 h-5" />
                </div>
                <h3 className="font-extrabold text-slate-900 text-base mb-1 tracking-tight">TOÀN QUỐC</h3>
                <p className="text-xs text-purple-700 font-bold mb-2">Tháng 11/2026</p>
                <p className="text-xs text-slate-600 leading-relaxed">
                  01 thí sinh đạt Giải Nhất đại diện tuổi trẻ Nghệ An tham gia Hội thi Bí thư Đoàn cơ sở giỏi toàn quốc lần thứ II tại Hà Nội.
                </p>
              </div>
              <div className="pt-4 mt-4 border-t border-slate-100 text-[11px] text-purple-600 font-bold">
                Đại diện tỉnh Nghệ An
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ════════════ SECTION 4: CƠ CẤU GIẢI THƯỞNG VÒNG TỈNH ════════════ */}
      <section className="py-10 sm:py-14 md:py-20 bg-slate-50 border-t border-slate-200 w-full overflow-hidden">
        <div className="max-w-[1100px] mx-auto px-3.5 sm:px-4 md:px-8 w-full min-w-0">
          <div className="text-center mb-8 sm:mb-10 md:mb-12 px-2">
            <span className="text-[10px] sm:text-xs font-black tracking-widest text-[#1746b8] uppercase bg-blue-100 px-3.5 sm:px-4 py-1 sm:py-1.5 rounded-full inline-flex items-center gap-1.5 mb-2 sm:mb-2.5">
              <Trophy className="w-3.5 h-3.5 text-[#1746b8]" /> KHEN THƯỞNG
            </span>
            <h2 className="text-lg min-[360px]:text-xl sm:text-2xl md:text-4xl font-black text-slate-800 tracking-tight leading-snug">
              CƠ CẤU GIẢI THƯỞNG VÒNG THI CẤP TỈNH
            </h2>
            <div className="w-16 h-1 bg-yellow-400 mx-auto mt-2.5 sm:mt-3 rounded-full" />
            <p className="text-xs sm:text-sm text-slate-500 mt-2.5 sm:mt-3">
              Kèm theo Bằng khen của Ban Chấp hành Tỉnh đoàn và Giấy chứng nhận cho toàn bộ thí sinh
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 md:gap-6 items-stretch w-full min-w-0">
            {/* Giải Nhì */}
            <div className="bg-white rounded-2xl border border-slate-200 p-5 sm:p-6 text-center shadow-xs flex flex-col justify-between order-2 md:order-1">
              <div>
                <div className="w-12 h-12 sm:w-14 sm:h-14 mx-auto rounded-full bg-slate-100 text-slate-600 flex items-center justify-center mb-3">
                  <Medal className="w-6 h-6 sm:w-7 sm:h-7" />
                </div>
                <h3 className="text-base sm:text-lg font-black text-slate-800 uppercase">02 Giải Nhì</h3>
                <p className="text-xl sm:text-2xl font-black text-[#1746b8] mt-1.5 sm:mt-2">2.000.000 đ</p>
                <p className="text-xs text-slate-500 mt-1.5 sm:mt-2">Mỗi giải kèm Bằng khen BCH Tỉnh đoàn</p>
              </div>
            </div>

            {/* Giải Nhất */}
            <div className="bg-gradient-to-b from-blue-50 to-white rounded-2xl border-2 border-yellow-400 p-5 sm:p-7 text-center shadow-md relative flex flex-col justify-between order-1 md:order-2">
              <div className="absolute -top-3 left-1/2 -translate-x-1/2 bg-yellow-400 text-blue-950 text-[10px] font-black uppercase tracking-wider px-3 py-0.5 rounded-full shadow-xs">
                Giải Cao Nhất
              </div>
              <div>
                <div className="w-14 h-14 sm:w-16 sm:h-16 mx-auto rounded-full bg-yellow-100 text-yellow-700 flex items-center justify-center mb-3 mt-1">
                  <Trophy className="w-7 h-7 sm:w-8 sm:h-8" />
                </div>
                <h3 className="text-lg sm:text-xl font-black text-slate-900 uppercase">01 Giải Nhất</h3>
                <p className="text-2xl sm:text-3xl font-black text-[#1746b8] mt-1.5 sm:mt-2">3.000.000 đ</p>
                <p className="text-xs font-bold text-amber-800 mt-2 bg-amber-50 rounded-lg py-1 px-2 border border-amber-200 inline-block">
                  Đại diện tỉnh dự thi Chung kết toàn quốc tại Hà Nội
                </p>
                <p className="text-xs text-slate-500 mt-1">Bằng khen BCH Tỉnh đoàn + quà tặng</p>
              </div>
            </div>

            {/* Giải Ba */}
            <div className="bg-white rounded-2xl border border-slate-200 p-5 sm:p-6 text-center shadow-xs flex flex-col justify-between order-3">
              <div>
                <div className="w-12 h-12 sm:w-14 sm:h-14 mx-auto rounded-full bg-amber-50 text-amber-700 flex items-center justify-center mb-3">
                  <Award className="w-6 h-6 sm:w-7 sm:h-7" />
                </div>
                <h3 className="text-base sm:text-lg font-black text-slate-800 uppercase">03 Giải Ba</h3>
                <p className="text-xl sm:text-2xl font-black text-[#1746b8] mt-1.5 sm:mt-2">1.000.000 đ</p>
                <p className="text-xs text-slate-500 mt-1.5 sm:mt-2">Mỗi giải kèm Bằng khen BCH Tỉnh đoàn</p>
              </div>
            </div>
          </div>

          <div className="mt-6 p-4 rounded-xl bg-blue-50/70 border border-blue-200/80 text-center text-xs text-blue-900 font-medium max-w-xl mx-auto">
            Các cá nhân tham gia vòng thi cấp tỉnh (không lọt vào chung kết) được nhận <strong>Giấy chứng nhận tham gia</strong> của Ban Tổ chức Hội thi.
          </div>
        </div>
      </section>

      {/* ════════════ FOOTER CHÍNH THỨC ════════════ */}
      <footer className="bg-[#10348c] text-white pt-10 sm:pt-12 pb-8 border-t border-white/10 w-full overflow-hidden">
        <div className="max-w-[1300px] mx-auto px-3.5 sm:px-4 md:px-8 w-full min-w-0">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-8">
            <div className="flex flex-col gap-3">
              <div className="flex items-center gap-3">
                <img
                  src="/logo-doan.png"
                  alt="Huy hiệu Đoàn"
                  className="w-14 h-14 object-contain shrink-0 drop-shadow-md select-none"
                />
                <div>
                  <p className="text-yellow-300 text-[11px] font-black uppercase tracking-wider">
                    Ban Tổ chức Hội thi
                  </p>
                  <h3 className="text-base sm:text-lg font-black text-white uppercase">
                    Ban Thường vụ Tỉnh đoàn Nghệ An
                  </h3>
                </div>
              </div>
              <p className="text-blue-100/75 text-xs sm:text-sm leading-relaxed max-w-lg mt-1">
                Hội thi Bí thư Đoàn cơ sở giỏi tỉnh Nghệ An năm 2026. Nhằm phát hiện, tuyên dương những thủ lĩnh thanh niên tiêu biểu, có bản lĩnh chính trị vững vàng, nắm chắc nghiệp vụ và tiên phong trong kỷ nguyên vươn mình của dân tộc.
              </p>
            </div>

            <div className="flex flex-col gap-2.5">
              <h4 className="font-bold text-xs sm:text-sm text-yellow-300 uppercase tracking-wider mb-1">
                Thông tin Ban Tổ chức
              </h4>
              <div className="space-y-2 text-xs text-blue-100/90">
                <div className="flex items-start gap-2.5">
                  <MapPin className="w-4 h-4 text-yellow-300 shrink-0 mt-0.5" />
                  <span>Cơ quan Tỉnh đoàn: Số 22 đường Trường Thi, TP Vinh, Nghệ An</span>
                </div>
                <div className="flex items-start gap-2.5">
                  <Building className="w-4 h-4 text-yellow-300 shrink-0 mt-0.5" />
                  <span>Đơn vị thường trực: Ban Công tác Đoàn & Thanh thiếu nhi (CTĐ&TTN)</span>
                </div>
                <div className="flex items-center gap-2.5">
                  <FileCheck2 className="w-4 h-4 text-yellow-300 shrink-0" />
                  <span>Căn cứ Kế hoạch số 435-KH/TĐTN-CTĐ&TTN ngày 17/7/2026</span>
                </div>
              </div>
            </div>
          </div>

          <div className="pt-6 border-t border-white/10 flex flex-col sm:flex-row items-center justify-between gap-2 text-[11px] text-blue-200/60 text-center sm:text-left">
            <p>Bản quyền © 2026 Ban Thường vụ Tỉnh đoàn Nghệ An</p>
            <p>Hệ thống thi trực tuyến Vòng loại cấp tỉnh</p>
          </div>
        </div>
      </footer>
    </div>
  );
}