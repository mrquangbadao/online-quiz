import { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import "./Landing.css";
import {
  BookOpen,
  Users,
  ArrowRight,
  Scale,
  ShieldCheck,
  Trophy,
  Sparkles,
  Target,
  Zap,
  Facebook,
  Award,
  Medal,
  Gift,
  Clock,
  MapPin,
  Phone,
  Mail,
  ChevronRight
} from "lucide-react";
import { examApi } from "../../api/examApi";
import BrandMark from "../components/BrandMark";
import VietnamEmblem from "../components/VietnamEmblem";
import MarqueeBanner from "../components/MarqueeBanner";
import StatsSection from "../components/StatsSection";
import { toast } from "../components/ui/Toast";


/* ── SVG: Hình quyển luật màu sắc thực tế làm background ── */
function RealisticBookBackground({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 720 880"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      aria-hidden
    >
      <defs>
        <linearGradient id="bgBook" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="#5c0505" />
          <stop offset="100%" stopColor="#1e0101" />
        </linearGradient>
        <linearGradient id="orangeTop" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#fb923c" />
          <stop offset="100%" stopColor="#c2410c" />
        </linearGradient>
        <linearGradient id="shine" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="white" stopOpacity="0.22" />
          <stop offset="55%" stopColor="white" stopOpacity="0" />
        </linearGradient>
        <linearGradient id="spineGrad" x1="0" y1="0" x2="1" y2="0">
          <stop offset="0%" stopColor="black" stopOpacity="0.4" />
          <stop offset="100%" stopColor="black" stopOpacity="0" />
        </linearGradient>
        <radialGradient id="emblemGlow" cx="50%" cy="50%" r="50%">
          <stop offset="0%" stopColor="#fde047" stopOpacity="0.5" />
          <stop offset="100%" stopColor="#fde047" stopOpacity="0" />
        </radialGradient>
      </defs>
      {/* Khung sách */}
      <rect x="0" y="0" width="720" height="880" rx="6" fill="url(#bgBook)" />

      {/* Nửa trên màu cam */}
      <rect x="0" y="0" width="720" height="370" rx="6" fill="url(#orangeTop)" />

      {/* Glossy shine */}
      <rect x="0" y="0" width="720" height="370" fill="url(#shine)" rx="6" />

      {/* Outer decorative frame */}
      <rect x="8" y="8" width="704" height="864" rx="4" stroke="#fde047" strokeWidth="1.5" strokeOpacity="0.18" fill="none" />

      {/* Top accent line */}
      <rect x="60" y="36" width="600" height="1.5" fill="#fde047" fillOpacity="0.25" rx="1" />

      {/* Quốc huy */}
      <circle cx="360" cy="150" r="105" fill="url(#emblemGlow)" />
      <foreignObject x="288" y="78" width="144" height="144" style={{ pointerEvents: "none" }}>
        <img
          src="/Emblem_of_Vietnam.svg"
          alt=""
          style={{ width: "100%", height: "100%", objectFit: "contain" }}
        />
      </foreignObject>

      {/* Khung chữ LUẬT */}
      <rect x="240" y="283" width="240" height="60" rx="30" fill="#fef08a" />
      <rect
        x="248"
        y="289"
        width="224"
        height="48"
        rx="24"
        fill="#fef08a"
        stroke="#ef4444"
        strokeWidth="2"
      />
      {/* Decorative stars flanking badge */}
      <path d="M230 313 L234 301 L238 313 L225 305 L243 305 Z" fill="#ef4444" fillOpacity="0.75" />
      <path d="M490 313 L486 301 L482 313 L495 305 L477 305 Z" fill="#ef4444" fillOpacity="0.75" />
      <text
        x="360"
        y="326"
        textAnchor="middle"
        fill="#dc2626"
        fontSize="36"
        fontWeight="900"
        letterSpacing="6"
        stroke="#dc2626"
        strokeWidth="1"
      >
        LUẬT
      </text>

      {/* Đường vạch ngang sát dòng chuyển màu */}
      <rect x="0" y="370" width="720" height="8" fill="#fde047" />
      <circle cx="340" cy="374" r="4" fill="#c2410c" />
      <circle cx="360" cy="374" r="4" fill="#c2410c" />
      <circle cx="380" cy="374" r="4" fill="#c2410c" />

      {/* Text phòng chống ma túy */}
      <text
        x="360"
        y="480"
        textAnchor="middle"
        textLength="680"
        lengthAdjust="spacingAndGlyphs"
        fill="#ffffff"
        fontSize="54"
        fontWeight="900"
        style={{ filter: "drop-shadow(0px 6px 12px rgba(0,0,0,0.9))" }}
        stroke="#ffffff"
        strokeWidth="1"
      >
        PHÒNG, CHỐNG MA TÚY
      </text>

      {/* Accent line under main title */}
      <rect x="160" y="498" width="400" height="2" fill="#fde047" fillOpacity="0.55" rx="1" />

      <text
        x="360"
        y="572"
        textAnchor="middle"
        fill="#fde047"
        fontSize="68"
        fontWeight="900"
        letterSpacing="4"
        style={{ filter: "drop-shadow(0px 8px 20px rgba(0,0,0,1))" }}
        stroke="#fde047"
        strokeWidth="0.5"
      >
        NĂM 2025
      </text>

      {/* Logo ST dưới góc */}
      <text
        x="140"
        y="800"
        textAnchor="middle"
        fill="#ef4444"
        fontSize="42"
        fontWeight="900"
      >
        ST
      </text>
      <text
        x="410"
        y="798"
        textAnchor="middle"
        fill="#ffffff"
        fontSize="18"
        fontWeight="600"
        letterSpacing="1"
      >
        NHÀ XUẤT BẢN CHÍNH TRỊ QUỐC GIA SỰ THẬT
      </text>

      {/* Shadow gáy sách */}
      {/* Publisher separator */}
      <rect x="60" y="730" width="600" height="1" fill="white" fillOpacity="0.12" />

      {/* Spine shadow gradient */}
      <rect x="0" y="0" width="60" height="880" fill="url(#spineGrad)" />
    </svg>
  );
}

export default function Landing() {
  const navigate = useNavigate();
  const [checkingPhase, setCheckingPhase] = useState(false);
  const [activePhase, setActivePhase] = useState<{
    id: number;
    name: string;
    status: string;
  } | null>(null);
  const [scrolledPastTop, setScrolledPastTop] = useState(false);

  useEffect(() => {
    examApi
      .getCurrentPhase()
      .then((res) => setActivePhase(res.data.data ?? null))
      .catch(() => { });

    let ticking = false;
    const handleScroll = () => {
      if (!ticking) {
        ticking = true;
        requestAnimationFrame(() => {
          setScrolledPastTop(window.scrollY > 50);
          ticking = false;
        });
      }
    };
    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  // IntersectionObserver for .landing-reveal elements
  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            entry.target.classList.add("is-visible");
            observer.unobserve(entry.target);
          }
        });
      },
      { threshold: 0.1, rootMargin: "0px 0px -60px 0px" }
    );
    document.querySelectorAll(".landing-reveal").forEach((el) => observer.observe(el));
    return () => observer.disconnect();
  }, []);

  const handleEnterQuiz = async () => {
    setCheckingPhase(true);
    try {
      const res = await examApi.getCurrentPhase();
      const phase = res.data.data;
      if (!phase || phase.status !== "ACTIVE") {
        toast.error(
          "Cuộc thi hiện chưa được mở. Vui lòng chờ thông báo từ ban tổ chức.",
        );
        return;
      }
      navigate("/quiz");
    } catch {
      toast.error("Không thể kết nối máy chủ. Vui lòng thử lại.");
    } finally {
      setCheckingPhase(false);
    }
  };

  return (
    <div className="flex flex-col min-h-screen font-sans">
      {/* ════════════ NAVBAR ════════════ */}
      <header
        className={`fixed top-12 w-full z-50 transition-all duration-300 ${scrolledPastTop ? "bg-[#004d1a]/95 border-b border-white/10 shadow-lg" : "bg-transparent"}`}
      >
        <div className="w-full flex items-center justify-between px-4 py-3 md:px-10 lg:px-16 max-w-[1600px] mx-auto">
          <div
            onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
            className="flex items-center gap-4 md:gap-6 group cursor-pointer text-white"
          >
            <VietnamEmblem size={48} className="flex-shrink-0 group-hover:scale-105 transition-transform duration-300" />
            <div className="hidden sm:block leading-tight drop-shadow-md">
              <p className="text-[10px] md:text-xs font-bold tracking-[0.2em] uppercase text-yellow-300 mb-0.5 flex gap-1.5 items-center">
                <Sparkles className="w-3 h-3" />
                CUỘC THI
              </p>
              <p className="text-sm md:text-base font-black tracking-wide uppercase">
                TÌM HIỂU PHÁP LUẬT PHÒNG, CHỐNG MA TÚY NĂM 2025
              </p>
            </div>
          </div>
          <div className="flex items-center gap-3 md:gap-5">
            {activePhase && (
              <div className="hidden md:flex items-center gap-1.5 bg-black/30 backdrop-blur-md border border-white/10 rounded-full px-3 py-1.5 shadow-sm">
                <span className="text-[11px] font-bold text-white tracking-wide uppercase">
                  {activePhase.name}
                </span>
                <ChevronRight className="w-3 h-3 text-white/50" />
                <span className={`flex items-center gap-1.5 text-[10px] font-black uppercase tracking-wider ${activePhase.status === 'ACTIVE' ? 'text-emerald-400' : (activePhase.status === 'UPCOMING' ? 'text-yellow-400' : 'text-slate-300')}`}>
                  <span className="relative flex h-2 w-2">
                    {activePhase.status === 'ACTIVE' && (
                      <span className="animate-ping absolute inline-flex h-full w-full rounded-full opacity-75 bg-emerald-400"></span>
                    )}
                    <span className={`relative inline-flex rounded-full h-2 w-2 ${activePhase.status === 'ACTIVE' ? 'bg-emerald-500' : (activePhase.status === 'UPCOMING' ? 'bg-yellow-500' : 'bg-slate-400')}`}></span>
                  </span>
                  {activePhase.status === 'ACTIVE' ? 'ĐANG MỞ' : (activePhase.status === 'UPCOMING' ? 'SẮP DIỄN RA' : 'ĐÃ KẾT THÚC')}
                </span>
              </div>
            )}
            <button
              onClick={handleEnterQuiz}
              disabled={checkingPhase}
              className="relative overflow-hidden px-6 md:px-8 py-2 md:py-3 rounded-full bg-yellow-400 text-green-900 border-2 border-yellow-300 text-sm md:text-base font-black shadow-[0_0_20px_rgba(250,204,21,0.4)] hover:bg-yellow-300 hover:scale-105 transition-all disabled:opacity-50 group uppercase tracking-widest"
            >
              {checkingPhase ? "Đang tải..." : "Vào thi ngay"}
            </button>
          </div>
        </div>
      </header>

      {/* ════════════ SECTION 1: HERO (Bg: Xanh lá tươi sáng) ════════════ */}
      <section className="relative min-h-screen flex items-center justify-center bg-gradient-to-br from-[#005a20] via-[#004d1a] to-[#002b0c] overflow-hidden pt-20">
        {/* Background Họa tiết mạng nhện / sọc chéo */}
        <div
          className="absolute inset-0 opacity-[0.05]"
          style={{
            backgroundImage:
              "repeating-linear-gradient(45deg, #fff 0, #fff 1px, transparent 0, transparent 50%)",
            backgroundSize: "20px 20px",
          }}
        ></div>

        {/* Cụm ánh sáng để text nổi bật */}
        <div className="absolute inset-0 flex justify-center items-center pointer-events-none">
          <div className="w-[800px] h-[800px] bg-emerald-500/20 rounded-full blur-[100px]"></div>
        </div>

        {/* BOOK COVER - bottom-right corner, fully visible */}
        <div className="absolute bottom-[-6%] right-[-5%] md:right-[-3%] opacity-[0.25] md:opacity-[0.35] pointer-events-none origin-bottom-right rotate-[-10deg] z-0">
          <RealisticBookBackground className="w-[340px] md:w-[520px] lg:w-[640px] drop-shadow-2xl mix-blend-screen" />
        </div>

        {/* BOOK COVER 2 - top-left corner, optimized for performance */}
        {/* Ẩn trên mobile (hidden md:block) và bỏ các filter nặng để tránh giảm fps trên máy yếu */}
        <div className="hidden md:block absolute -top-[10%] -left-[5%] lg:-left-[2%] opacity-[0.12] pointer-events-none origin-center rotate-[30deg] z-0 hover:rotate-[35deg] transition-transform duration-1000">
          <RealisticBookBackground className="w-[350px] lg:w-[480px]" />
        </div>



        {/* Floating Icons Background — CSS-only animation */}
        <div className="absolute inset-0 overflow-hidden pointer-events-none z-0">
          <div className="landing-float-1 absolute top-[20%] left-[10%] opacity-20 text-yellow-400">
            <Scale className="w-16 h-16 md:w-24 md:h-24" />
          </div>
          <div className="landing-float-2 absolute top-[60%] left-[15%] opacity-10 text-white">
            <ShieldCheck className="w-20 h-20 md:w-32 md:h-32" />
          </div>
          <div className="landing-float-3 absolute top-[30%] right-[12%] opacity-15 text-yellow-200">
            <BookOpen className="w-12 h-12 md:w-20 md:h-20" />
          </div>
        </div>

        <div className="relative z-10 w-full px-4 py-10 md:py-20 max-w-[1400px] mx-auto flex flex-col items-center gap-6 md:gap-12 text-center">
          <div className="flex flex-col items-center landing-hero-fadein">
            <div className="flex flex-col sm:flex-row items-center justify-center gap-3 mb-4 md:mb-8 landing-hero-item" style={{ animationDelay: '0.1s' }}>
              <div
                className="inline-flex items-center gap-2 md:gap-3 bg-gradient-to-r from-green-900/80 to-green-800/80 border border-yellow-400/30 rounded-full px-4 py-2 md:px-6 md:py-2.5 shadow-xl"
              >
                <Award className="w-4 h-4 md:w-5 md:h-5 text-yellow-400" />
                <span className="text-xs md:text-base font-black text-yellow-300 tracking-[0.15em] uppercase">
                  CUỘC THI TRỰC TUYẾN
                </span>
              </div>


            </div>

            <h1 className="flex flex-col gap-1 items-center max-w-5xl">
              <span
                className="text-lg md:text-3xl lg:text-4xl font-bold tracking-widest text-emerald-200 uppercase text-center landing-hero-item" style={{ animationDelay: '0.2s' }}
              >
                Tìm hiểu pháp luật
              </span>
              <span
                className="text-4xl sm:text-5xl md:text-7xl lg:text-[4.5rem] xl:text-[5.5rem] font-black tracking-tight text-white drop-shadow-[0_4px_10px_rgba(0,0,0,0.5)] text-center mt-1 md:mt-2 leading-tight lg:whitespace-nowrap landing-hero-item" style={{ animationDelay: '0.35s' }}
              >
                PHÒNG, CHỐNG MA TÚY
              </span>
              <span
                className="text-2xl md:text-4xl lg:text-5xl font-black mt-2 md:mt-4 text-yellow-400 drop-shadow-[0_4px_10px_rgba(0,0,0,0.5)] text-center landing-hero-item" style={{ animationDelay: '0.5s' }}
              >
                NĂM 2025
              </span>
            </h1>

            <p
              className="mt-4 md:mt-8 text-base md:text-xl text-green-50 max-w-4xl text-center leading-relaxed font-medium flex flex-col items-center gap-1 md:gap-2 landing-hero-item" style={{ animationDelay: '0.6s' }}
            >
              <strong className="text-yellow-400 font-black text-xl md:text-3xl lg:text-4xl tracking-wide px-2 md:px-4 lg:whitespace-nowrap text-balance">
                "CHUNG TAY XÂY DỰNG CỘNG ĐỒNG KHÔNG MA TÚY"
              </strong>
              <span className="mt-1 md:mt-2 block px-2 md:px-4 lg:whitespace-nowrap text-balance">Hãy trang bị kiến thức pháp luật vững vàng để bảo vệ bản thân và xã hội trước tệ nạn ma túy</span>
            </p>

            <div
              className="mt-8 md:mt-10 flex flex-col sm:flex-row justify-center items-center gap-4 md:gap-6 w-full px-4 sm:px-0 landing-hero-item" style={{ animationDelay: '0.75s' }}
            >
              <button
                onClick={handleEnterQuiz}
                disabled={checkingPhase}
                className="group w-full sm:w-auto overflow-hidden rounded-full font-black uppercase tracking-wider text-green-900 bg-yellow-400 hover:bg-yellow-300 transition-all shadow-[0_10px_30px_rgba(250,204,21,0.4)] hover:shadow-[0_10px_40px_rgba(250,204,21,0.6)] hover:-translate-y-1 px-6 py-4 md:px-10 md:py-5 flex items-center justify-center gap-2 md:gap-3"
              >
                {checkingPhase ? "ĐANG TẢI..." : "THAM GIA THI NGAY"}
                <ArrowRight className="w-5 h-5 md:w-6 md:h-6 group-hover:translate-x-2 transition-transform" />
              </button>
              <a
                href="#rules"
                className="w-full sm:w-auto px-6 py-4 md:px-10 md:py-5 rounded-full border-2 border-white/80 bg-black/20 text-white font-bold text-sm md:text-lg hover:bg-black/40 hover:border-white transition-all uppercase tracking-wider text-center backdrop-blur-sm"
              >
                THỂ LỆ CUỘC THI
              </a>
            </div>
          </div>
        </div>
      </section>

      {/* ════════════ SECTION 2: STATS ════════════ */}
      <StatsSection />

      {/* ════════════ SECTION 3: GIỚI THIỆU ════════════ */}
      <section className="relative py-32 bg-[#021f0e] overflow-hidden">
        <div
          className="absolute inset-0 opacity-[0.08]"
          style={{
            backgroundImage: "radial-gradient(#4ade80 2px, transparent 2px)",
            backgroundSize: "32px 32px",
          }}
        ></div>
        <div className="absolute top-20 right-[15%] text-green-300 opacity-40">
          <Sparkles className="w-10 h-10" />
        </div>
        <div className="absolute bottom-20 left-[15%] text-green-400 opacity-40">
          <Sparkles className="w-12 h-12" />
        </div>

        <div className="max-w-[1400px] mx-auto px-4 md:px-10 lg:px-16 relative z-10">
          <div className="text-center mb-20 landing-reveal">
            <span className="text-sm font-bold tracking-[0.2em] text-yellow-400 uppercase bg-yellow-400/10 px-5 py-2 rounded-full inline-flex items-center gap-2 mb-4 border border-yellow-400/20 backdrop-blur-sm">
              <ShieldCheck className="w-4 h-4" /> VỀ CUỘC THI
            </span>
            <h2 className="text-4xl md:text-5xl lg:text-6xl font-black text-white drop-shadow-sm">
              MỤC ĐÍCH & Ý NGHĨA
            </h2>
            <div className="w-24 h-1.5 bg-yellow-500 mx-auto mt-6 rounded-full"></div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {[
              {
                title: "LAN TỎA HIỂU BIẾT",
                desc: "Tuyên truyền, phổ biến sâu rộng chủ trương của Đảng, chính sách, pháp luật của Nhà nước về phòng, chống ma túy; nâng cao nhận thức của cộng đồng.",
                icon: <Zap className="w-8 h-8" />,
                num: "01",
                accentColor: "from-emerald-400 to-green-500",
                delay: 0,
              },
              {
                title: "ĐỔI MỚI HÌNH THỨC",
                desc: "Tạo sân chơi bổ ích, lành mạnh, thiết thực; đổi mới hình thức tuyên truyền pháp luật theo hướng trực quan, sinh động, dễ tiếp cận.",
                icon: <Target className="w-8 h-8" />,
                num: "02",
                accentColor: "from-yellow-400 to-amber-500",
                delay: 0.15,
              },
              {
                title: "PHÁT HUY XUNG KÍCH",
                desc: "Phát huy vai trò xung kích của tuổi trẻ trong tuyên truyền, vận động nhân dân tích cực tham gia xây dựng môi trường sống an toàn, không ma túy.",
                icon: <ShieldCheck className="w-8 h-8" />,
                num: "03",
                accentColor: "from-sky-400 to-blue-500",
                delay: 0.3,
              },
            ].map((item, idx) => (
              <div
                key={idx}
                className="landing-reveal bg-white/5 p-10 py-12 rounded-[2rem] border border-white/10 hover:bg-white/10 hover:border-yellow-400/30 transform hover:-translate-y-2 transition-all group relative overflow-hidden shadow-2xl h-full flex flex-col"
                style={{ animationDelay: `${item.delay}s` }}
              >
                {/* Gradient number background */}
                <div className="absolute -top-4 -right-4 text-[8rem] font-black leading-none opacity-[0.04] group-hover:opacity-[0.08] transition-opacity pointer-events-none select-none z-0">
                  {item.num}
                </div>
                {/* Top accent line */}
                <div className={`absolute top-0 left-0 w-full h-1 bg-gradient-to-r ${item.accentColor} opacity-60 group-hover:opacity-100 transition-opacity`}></div>

                <div className="w-20 h-20 rounded-2xl bg-green-900/50 text-green-400 flex items-center justify-center mb-8 relative z-10 group-hover:bg-yellow-400 group-hover:text-green-900 transition-colors duration-300 shadow-sm border border-green-800/50">
                  {item.icon}
                </div>
                <h3 className="text-2xl font-black text-white mb-4 relative z-10 group-hover:text-yellow-400 transition-colors">
                  {item.title}
                </h3>
                <p className="text-green-100/70 font-medium leading-relaxed relative z-10 flex-1">
                  {item.desc}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ════════════ SECTION 3.5: CƠ CẤU GIẢI THƯỞNG ════════════ */}
      <section className="relative py-32 bg-white overflow-hidden border-t border-green-50">
        <div className="absolute top-0 right-0 w-96 h-96 bg-yellow-50 rounded-full blur-[100px] -translate-y-1/2 translate-x-1/3 z-0"></div>
        <div className="absolute bottom-0 left-0 w-96 h-96 bg-green-50 rounded-full blur-[100px] translate-y-1/3 -translate-x-1/3 z-0"></div>

        <div className="max-w-[1400px] mx-auto px-4 md:px-10 lg:px-16 relative z-10">
          <div className="text-center mb-20 landing-reveal">
            <span className="text-sm font-bold tracking-[0.2em] text-yellow-600 uppercase bg-yellow-100 px-5 py-2 rounded-full inline-flex items-center gap-2 mb-4 border border-yellow-200">
              <Gift className="w-4 h-4" /> Phần thưởng hấp dẫn
            </span>
            <h2 className="text-4xl md:text-5xl lg:text-6xl font-black text-slate-800 drop-shadow-sm">
              CƠ CẤU GIẢI THƯỞNG
            </h2>
            <div className="w-24 h-1.5 bg-yellow-400 mx-auto mt-6 rounded-full"></div>
          </div>

          {/* ════ GIẢI CÁ NHÂN ════ */}
          <div className="mb-24">
            <div className="text-center mb-12">
              <h3 className="text-3xl font-black text-slate-800 inline-block relative">
                Giải Cá Nhân
                <div className="absolute -bottom-3 left-1/2 -translate-x-1/2 w-16 h-1.5 bg-yellow-400 rounded-full"></div>
              </h3>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-8 items-end mb-8">
              {/* Giải Nhì */}
              <div className="landing-reveal bg-gradient-to-b from-slate-50 to-white p-8 rounded-[2rem] border-2 border-slate-200 shadow-xl text-center relative group hover:-translate-y-4 transition-transform duration-300 md:order-1 order-2" style={{ animationDelay: '0.1s' }}>
                <div className="w-24 h-24 mx-auto bg-slate-200 rounded-full flex items-center justify-center mb-6 shadow-inner border-4 border-white relative">
                  <Medal className="w-12 h-12 text-slate-500" />
                </div>
                <h3 className="text-3xl font-black text-slate-700 mb-2">01 Giải Nhì</h3>
                <p className="text-slate-500 font-medium mb-6">Giấy chứng nhận + Tiền thưởng</p>
              </div>

              {/* Giải Nhất */}
              <div className="landing-reveal bg-gradient-to-b from-yellow-50 to-white p-10 rounded-[2rem] border-2 border-yellow-400 shadow-[0_20px_50px_rgba(250,204,21,0.2)] text-center relative group hover:-translate-y-4 transition-transform duration-300 transform md:-translate-y-8 md:order-2 order-1 z-10">
                <div className="absolute -top-3 right-6 bg-yellow-400 text-yellow-900 text-[10px] font-black uppercase tracking-wider px-3 py-1 rounded-full shadow-sm">Xuất sắc nhất</div>
                <div className="w-32 h-32 mx-auto bg-yellow-100 rounded-full flex items-center justify-center mb-8 shadow-inner border-4 border-white relative mt-4">
                  <Trophy className="w-16 h-16 text-yellow-600" />
                </div>
                <h3 className="text-4xl font-black text-yellow-600 mb-2">01 Giải Nhất</h3>
                <p className="text-yellow-600 font-bold mb-6">Giấy chứng nhận + Tiền thưởng</p>
              </div>

              {/* Giải Ba */}
              <div className="landing-reveal bg-gradient-to-b from-orange-50 to-white p-8 rounded-[2rem] border-2 border-orange-200 shadow-xl text-center relative group hover:-translate-y-4 transition-transform duration-300 md:order-3 order-3" style={{ animationDelay: '0.2s' }}>
                <div className="w-24 h-24 mx-auto bg-orange-100 rounded-full flex items-center justify-center mb-6 shadow-inner border-4 border-white relative">
                  <Award className="w-12 h-12 text-orange-500" />
                </div>
                <h3 className="text-3xl font-black text-orange-700 mb-2">01 Giải Ba</h3>
                <p className="text-orange-500 font-medium mb-6">Giấy chứng nhận + Tiền thưởng</p>
              </div>
            </div>

            <div className="landing-reveal bg-slate-50 rounded-2xl p-6 border border-slate-200 text-center flex flex-col sm:flex-row items-center justify-center gap-4 hover:shadow-md transition-shadow max-w-3xl mx-auto">
              <div className="w-12 h-12 bg-slate-200 rounded-full flex items-center justify-center shrink-0">
                <Gift className="w-6 h-6 text-slate-600" />
              </div>
              <div className="text-center sm:text-left">
                <h4 className="text-xl font-bold text-slate-700">Giải Khuyến Khích</h4>
                <p className="text-slate-500 font-medium">Dành cho các cá nhân có thành tích tốt.</p>
              </div>
            </div>
          </div>

          {/* ════ GIẢI TẬP THỂ ════ */}
          <div>
            <div className="text-center mb-12">
              <h3 className="text-3xl font-black text-slate-800 inline-block relative">
                Giải Tập Thể
                <div className="absolute -bottom-3 left-1/2 -translate-x-1/2 w-16 h-1.5 bg-green-500 rounded-full"></div>
              </h3>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
              <div className="landing-reveal bg-white p-6 rounded-2xl border-2 border-slate-200 flex items-center gap-5 hover:-translate-y-1 transition-transform shadow-lg md:order-1 order-2" style={{ animationDelay: '0.1s' }}>
                <div className="w-16 h-16 bg-slate-100 rounded-full flex items-center justify-center shrink-0 border-2 border-white shadow-inner">
                  <Medal className="w-8 h-8 text-slate-500" />
                </div>
                <div className="text-left">
                  <h4 className="text-2xl font-bold text-slate-700">01 Giải Nhì</h4>
                  <p className="text-slate-500 text-sm font-medium">Tập thể xuất sắc</p>
                </div>
              </div>

              <div className="landing-reveal bg-yellow-50 p-6 rounded-2xl border-2 border-yellow-400 flex items-center gap-5 shadow-xl hover:-translate-y-1 transition-transform transform md:-translate-y-2 z-10 relative md:order-2 order-1">
                <div className="absolute -top-3 right-6 bg-yellow-400 text-yellow-900 text-[10px] font-black uppercase tracking-wider px-3 py-1 rounded-full shadow-sm">Cao Nhất</div>
                <div className="w-16 h-16 bg-yellow-200 rounded-full flex items-center justify-center shrink-0 border-2 border-white shadow-inner">
                  <Trophy className="w-8 h-8 text-yellow-600" />
                </div>
                <div className="text-left">
                  <h4 className="text-2xl font-black text-yellow-700">01 Giải Nhất</h4>
                  <p className="text-yellow-600 font-bold text-sm">Tập thể xuất sắc nhất</p>
                </div>
              </div>

              <div className="landing-reveal bg-white p-6 rounded-2xl border-2 border-orange-200 flex items-center gap-5 hover:-translate-y-1 transition-transform shadow-lg md:order-3 order-3" style={{ animationDelay: '0.2s' }}>
                <div className="w-16 h-16 bg-orange-50 rounded-full flex items-center justify-center shrink-0 border-2 border-white shadow-inner">
                  <Award className="w-8 h-8 text-orange-500" />
                </div>
                <div className="text-left">
                  <h4 className="text-2xl font-bold text-orange-700">01 Giải Ba</h4>
                  <p className="text-orange-500 text-sm font-medium">Tập thể triển vọng</p>
                </div>
              </div>
            </div>

            <div className="landing-reveal bg-green-50 rounded-2xl p-6 border border-green-200 text-center flex flex-col sm:flex-row items-center justify-center gap-4 hover:shadow-md transition-shadow mb-8 max-w-3xl mx-auto">
              <div className="w-12 h-12 bg-green-200 rounded-full flex items-center justify-center shrink-0">
                <Users className="w-6 h-6 text-green-700" />
              </div>
              <div className="text-center sm:text-left">
                <h4 className="text-xl font-bold text-green-800">Giải Khuyến Khích Tập Thể</h4>
                <p className="text-green-600 font-medium">Dành cho các đơn vị có tinh thần tham gia và tuyên truyền tốt.</p>
              </div>
            </div>

            <div className="text-center text-sm font-medium text-slate-500 italic max-w-4xl mx-auto px-4 bg-slate-50 p-4 rounded-xl border border-slate-100">
              * Giải tập thể được xét trên cơ sở tổng điểm phần thi của các thành viên trong đội, tinh thần tham gia, ý thức chấp hành thể lệ và hiệu quả tuyên truyền của đơn vị.
            </div>
          </div>
        </div>
      </section>

      {/* ════════════ SECTION 4: THỂ LỆ TIMELINE (Lộ Trình Thi) ════════════ */}
      <section
        id="rules"
        className="relative py-32 bg-gradient-to-b from-[#002b0c] to-[#001708] border-t border-green-900/50 overflow-hidden"
      >
        {/* Glow effect */}
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[500px] bg-green-600/10 rounded-full blur-[150px] pointer-events-none" />
        <div className="absolute inset-0 opacity-[0.06]" style={{ backgroundImage: "repeating-linear-gradient(0deg, transparent, transparent 35px, rgba(255,255,255,0.03) 35px, rgba(255,255,255,0.03) 36px), repeating-linear-gradient(90deg, transparent, transparent 35px, rgba(255,255,255,0.03) 35px, rgba(255,255,255,0.03) 36px)", backgroundSize: "36px 36px" }}></div>

        <div className="max-w-[1400px] mx-auto px-4 md:px-10 lg:px-16 relative z-10">
          <div className="text-center mb-24 landing-reveal">
            <h2 className="text-5xl font-black text-white mb-4">
              LỘ TRÌNH THI
            </h2>
            <div className="h-1.5 w-24 bg-yellow-400 mx-auto rounded-full mb-6"></div>
            <p className="text-xl text-yellow-400 font-medium tracking-wide">
              3 Bước Chinh Phục Giải Thưởng
            </p>
          </div>

          <div className="relative">
            {/* Timeline line: centered on all sizes */}
            <div
              className="absolute left-8 lg:left-1/2 top-0 h-full w-1.5 bg-gradient-to-b from-yellow-400/10 via-yellow-400/70 to-yellow-400/10 -translate-x-1/2 rounded-full z-0"
            />

            <div className="space-y-16 lg:space-y-24 relative z-10">
              {[
                {
                  step: "01",
                  title: "Đăng Ký Tham Gia",
                  desc: "Dành cho Đoàn viên, thanh niên các Chi đoàn, Cơ sở Đoàn trực thuộc Công an tỉnh và nhân dân trên địa bàn toàn tỉnh Nghệ An.",
                  icon: <Users className="w-7 h-7" />,
                  color: "bg-blue-500",
                  borderColor: "border-blue-500",
                },
                {
                  step: "02",
                  title: "Hoàn Thành Các Phần Thi",
                  desc: "Bao gồm phần thi Lý thuyết (Trắc nghiệm), Tình huống, và Dự đoán số lượng người trả lời đúng toàn bộ câu hỏi.",
                  icon: <BookOpen className="w-7 h-7" />,
                  color: "bg-green-500",
                  borderColor: "border-green-500",
                },
                {
                  step: "03",
                  title: "Công Bố Kết Quả",
                  desc: "Hệ thống tự động chấm điểm. Xét thưởng dựa trên điểm số, dự đoán chính xác và thời gian hoàn thành.",
                  icon: <Trophy className="w-7 h-7" />,
                  color: "bg-yellow-500",
                  borderColor: "border-yellow-500",
                },
              ].map((act, idx) => (
                <div
                  key={idx}
                  className={`landing-reveal relative flex items-center justify-between lg:justify-center ${idx % 2 === 0 ? "lg:flex-row-reverse" : ""}`}
                  style={{ animationDelay: `${idx * 0.15}s` }}
                >
                  {/* Timeline dot */}
                  <div className="absolute left-8 lg:left-1/2 w-10 h-10 md:w-14 md:h-14 bg-[#001708] border-4 border-yellow-400 rounded-full flex items-center justify-center -translate-x-1/2 z-10 shadow-[0_0_20px_rgba(250,204,21,0.4)]">
                    <div className={`w-3 h-3 md:w-5 md:h-5 rounded-full ${act.color}`}></div>
                  </div>

                  {/* Card Content */}
                  <div className={`w-full ml-16 lg:ml-0 lg:w-5/12 ${idx % 2 === 0 ? "lg:text-right lg:pr-32" : "lg:text-left lg:pl-32"}`}>
                    <div className={`bg-[#001407] rounded-[2.5rem] p-8 md:p-10 border border-green-900/40 hover:border-yellow-400/60 hover:-translate-y-2 transition-all duration-300 group relative overflow-hidden shadow-2xl hover:shadow-[0_15px_40px_rgba(250,204,21,0.15)] text-left ${idx % 2 === 0 ? "lg:text-right" : ""}`}>
                      <div className={`absolute top-0 left-0 w-full h-1.5 ${act.color}`}></div>

                      <div className={`flex items-center gap-5 mb-6 ${idx % 2 === 0 ? "lg:flex-row-reverse" : ""}`}>
                        <div className={`w-16 h-16 shrink-0 rounded-full border-2 ${act.borderColor} bg-black/50 text-white flex items-center justify-center font-black text-2xl shadow-inner group-hover:scale-110 transition-transform duration-300`}>
                          {act.step}
                        </div>
                        <div className={`p-4 rounded-2xl bg-green-900/20 text-white group-hover:bg-yellow-400/20 group-hover:text-yellow-400 transition-colors duration-300`}>
                          {act.icon}
                        </div>
                      </div>

                      <h3 className="text-2xl md:text-3xl font-bold text-white mb-4 tracking-wide group-hover:text-yellow-400 transition-colors duration-300">
                        {act.title}
                      </h3>
                      <p className="text-green-100/70 font-medium leading-relaxed md:text-lg">
                        {act.desc}
                      </p>

                      {/* Line connector to dot on PC */}
                      <div className={`hidden lg:block absolute top-1/2 w-32 h-0.5 bg-yellow-400/30 -translate-y-1/2 ${idx % 2 === 0 ? "-right-32" : "-left-32"}`}></div>
                    </div>
                  </div>

                  {/* Empty space for the other side on PC */}
                  <div className="hidden lg:block w-5/12"></div>
                </div>
              ))}
            </div>
          </div>

          <div className="mt-20 flex justify-center">
            <button
              onClick={handleEnterQuiz}
              disabled={checkingPhase}
              className="bg-yellow-400 text-green-900 px-12 py-5 rounded-full font-black text-lg shadow-[0_10px_30px_rgba(250,204,21,0.3)] hover:bg-yellow-300 hover:shadow-[0_15px_40px_rgba(250,204,21,0.5)] transform hover:-translate-y-1 transition-all uppercase tracking-widest"
            >
              Vào Phòng Thi
            </button>
          </div>
        </div>
      </section>

      {/* ════════════ FOOTER ════════════ */}
      <footer className="relative bg-[#001105] border-t border-green-900/50 pt-20 pb-8 overflow-hidden z-20 mt-[-1px]">
        {/* Glow effect matched with timeline section */}
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full h-[300px] bg-green-500/5 blur-[120px] pointer-events-none"></div>

        <div className="max-w-[1400px] mx-auto px-4 md:px-10 lg:px-16 relative z-10">
          <div className="grid grid-cols-1 md:grid-cols-12 gap-12 mb-12">
            <div className="md:col-span-5 flex flex-col gap-6">
              <div className="flex items-center gap-5">
                <div className="w-16 h-16 shrink-0 bg-[#001a08] border border-yellow-400/30 rounded-2xl flex items-center justify-center p-2 shadow-[0_0_15px_rgba(250,204,21,0.15)]">
                  <BrandMark size={48} />
                </div>
                <div>
                  <p className="text-yellow-400 text-[10px] sm:text-xs font-black tracking-[0.2em] uppercase mb-1">
                    Ban tổ chức cuộc thi
                  </p>
                  <h3 className="text-xl md:text-2xl font-black text-white tracking-wide uppercase drop-shadow-md">
                    Công an tỉnh Nghệ An
                  </h3>
                </div>
              </div>
              <p className="text-green-100/60 text-sm md:text-base leading-relaxed max-w-lg font-medium">
                Cuộc thi trực tuyến Tìm hiểu pháp luật Phòng, chống ma túy năm 2025. Phát huy sức mạnh toàn dân, chung tay xây dựng cộng đồng an toàn, không ma túy.
              </p>
            </div>

            <div className="md:col-span-4 flex flex-col gap-4">
              <h4 className="text-white font-bold text-lg inline-block relative border-b-2 border-green-500 pb-2 w-fit">
                Liên Hệ
              </h4>
              <div className="flex flex-col gap-3 mt-2 text-green-100/80">
                <div className="flex items-center gap-3 hover:text-yellow-400 transition-colors">
                  <div className="w-8 h-8 rounded-full bg-green-900/40 border border-green-800/50 flex items-center justify-center shrink-0">
                    <Mail className="w-4 h-4 text-emerald-400" />
                  </div>
                  <span className="text-sm font-medium">contact@pc04.vn</span>
                </div>
                <div className="flex items-center gap-3 hover:text-yellow-400 transition-colors">
                  <div className="w-8 h-8 rounded-full bg-green-900/40 border border-green-800/50 flex items-center justify-center shrink-0">
                    <Phone className="w-4 h-4 text-emerald-400" />
                  </div>
                  <span className="text-sm font-medium">0912 345 678</span>
                </div>
                <div className="flex items-start gap-3 hover:text-yellow-400 transition-colors">
                  <div className="w-8 h-8 rounded-full bg-green-900/40 border border-green-800/50 flex items-center justify-center shrink-0 mt-0.5">
                    <MapPin className="w-4 h-4 text-emerald-400" />
                  </div>
                  <span className="text-sm font-medium leading-relaxed">
                    Số 7, đường Trường Thi, phường Trường Vinh, <br />
                    tỉnh Nghệ An
                  </span>
                </div>
              </div>
            </div>

            <div className="md:col-span-3 flex flex-col gap-4">
              <h4 className="text-white font-bold text-lg inline-block relative border-b-2 border-yellow-400 pb-2 w-fit">
                Mạng Xã Hội
              </h4>
              <div className="mt-2">
                <a
                  href="https://facebook.com"
                  target="_blank"
                  rel="noreferrer"
                  aria-label="Facebook"
                  className="group flex items-center justify-center w-12 h-12 rounded-2xl bg-[#001f0b] border border-green-900/40 hover:bg-green-900/40 hover:border-yellow-400/50 transition-all duration-300"
                >
                  <Facebook className="h-5 w-5 text-blue-400 group-hover:scale-110 transition-transform" />
                </a>
              </div>
            </div>
          </div>

          <div className="pt-8 border-t border-green-900/50 flex flex-col md:flex-row items-center justify-between gap-4">
            <p className="text-green-500/60 font-medium text-xs md:text-sm text-center md:text-left">
              Bản quyền © 2026 Công an tỉnh Nghệ An
            </p>
            <div className="flex gap-6 text-xs md:text-sm font-medium text-green-500/60">
              <a href="#" className="hover:text-yellow-400 transition-colors">Điều khoản sử dụng</a>
              <a href="#" className="hover:text-yellow-400 transition-colors">Bảo mật thông tin</a>
            </div>
          </div>
        </div>
      </footer>
    </div >
  );
}