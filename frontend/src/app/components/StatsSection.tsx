import { useState, useEffect, useRef } from "react";
import { BookOpen, Clock, Users, Trophy, Calendar, MapPin } from "lucide-react";

function AnimatedCounter({ end, suffix = "" }: { end: number; suffix?: string }) {
  const [count, setCount] = useState(0);
  const ref = useRef<HTMLDivElement>(null);
  const triggered = useRef(false);

  useEffect(() => {
    if (!ref.current || triggered.current) return;
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting && !triggered.current) {
          triggered.current = true;
          observer.disconnect();
          let start = 0;
          const duration = 1200;
          const step = end / (duration / 16);
          const timer = setInterval(() => {
            start += step;
            if (start >= end) {
              setCount(end);
              clearInterval(timer);
            } else {
              setCount(Math.floor(start));
            }
          }, 16);
        }
      },
      { threshold: 0.3 }
    );
    observer.observe(ref.current);
    return () => observer.disconnect();
  }, [end]);

  return <div ref={ref}>{count}{suffix}</div>;
}

const stats = [
  {
    label: "CÂU TRẮC NGHIỆM",
    sublabel: "Vòng loại cấp tỉnh",
    value: 30,
    suffix: "",
    icon: <BookOpen className="w-5 h-5 sm:w-6 sm:h-6 md:w-8 md:h-8" />,
    iconBg: "bg-blue-50 text-blue-600 border border-blue-200",
    hoverBg: "hover:border-blue-500",
    valueFmt: "text-blue-700",
  },
  {
    label: "PHÚT LÀM BÀI",
    sublabel: "Đếm ngược trực tuyến",
    value: 20,
    suffix: "",
    icon: <Clock className="w-5 h-5 sm:w-6 sm:h-6 md:w-8 md:h-8" />,
    iconBg: "bg-sky-50 text-sky-600 border border-sky-200",
    hoverBg: "hover:border-sky-500",
    valueFmt: "text-sky-700",
  },
  {
    label: "THÍ SINH DỰ THI",
    sublabel: "70 thí sinh xuất sắc",
    value: 70,
    suffix: "",
    icon: <Users className="w-5 h-5 sm:w-6 sm:h-6 md:w-8 md:h-8" />,
    iconBg: "bg-indigo-50 text-indigo-600 border border-indigo-200",
    hoverBg: "hover:border-indigo-500",
    valueFmt: "text-indigo-700",
  },
  {
    label: "VÉ VÀO CHUNG KẾT",
    sublabel: "Top 10 đối kháng sân khấu",
    value: 10,
    suffix: "",
    icon: <Trophy className="w-5 h-5 sm:w-6 sm:h-6 md:w-8 md:h-8" />,
    iconBg: "bg-amber-50 text-amber-600 border border-amber-200",
    hoverBg: "hover:border-amber-500",
    valueFmt: "text-amber-600",
  },
];

export default function StatsSection() {
  const sectionRef = useRef<HTMLElement>(null);

  useEffect(() => {
    if (!sectionRef.current) return;
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          sectionRef.current?.querySelectorAll(".stats-reveal").forEach((el) => {
            el.classList.add("is-visible");
          });
          observer.disconnect();
        }
      },
      { threshold: 0.1 }
    );
    observer.observe(sectionRef.current);
    return () => observer.disconnect();
  }, []);

  return (
    <section ref={sectionRef} className="relative py-10 sm:py-14 md:py-20 bg-gradient-to-b from-slate-50 via-white to-slate-50 border-b border-slate-200 z-20 overflow-hidden w-full">
      {/* Soft ambient glows (no CSS blur – lightweight for low-end devices) */}
      <div className="absolute top-0 right-0 w-80 h-80 rounded-full pointer-events-none" style={{ background: 'radial-gradient(circle, rgba(191,219,254,0.35) 0%, transparent 70%)' }} />
      <div className="absolute bottom-0 left-0 w-80 h-80 rounded-full pointer-events-none" style={{ background: 'radial-gradient(circle, rgba(199,210,254,0.3) 0%, transparent 70%)' }} />

      <div className="max-w-[1300px] mx-auto px-3.5 sm:px-4 md:px-8 relative z-10 w-full min-w-0">
        <div
          className="text-center mb-7 sm:mb-10 md:mb-14 stats-reveal px-2"
          style={{ opacity: 0, transform: 'translateY(16px)', transition: 'opacity 0.5s ease-out, transform 0.5s ease-out' }}
        >
          <span className="text-[10px] sm:text-[11px] md:text-xs font-black tracking-widest text-blue-700 uppercase bg-blue-100/70 px-3.5 sm:px-4 py-1 sm:py-1.5 rounded-full inline-flex items-center gap-1.5 mb-2 sm:mb-2.5 border border-blue-200">
            📊 THÔNG TIN VÒNG LOẠI
          </span>
          <h2 className="text-lg min-[360px]:text-xl sm:text-2xl md:text-4xl font-black text-slate-800 tracking-tight leading-snug">
            THỂ LỆ VÒNG LOẠI CẤP TỈNH
          </h2>
          <div className="w-16 h-1 bg-blue-600 mx-auto mt-2.5 sm:mt-3 rounded-full" />
        </div>

        {/* 4 Cards Grid - Responsive: 2 cols on mobile, 4 on desktop */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-2 sm:gap-4 md:gap-6 w-full min-w-0">
          {stats.map((stat, idx) => (
            <div
              key={idx}
              className={`stats-reveal group p-2.5 sm:p-4 md:p-6 rounded-xl sm:rounded-2xl md:rounded-3xl bg-white border border-slate-200/90 shadow-xs hover:shadow-md transition-all duration-200 text-center flex flex-col items-center justify-between min-w-0 ${stat.hoverBg}`}
              style={{
                opacity: 0,
                transform: 'translateY(20px)',
                transition: `opacity 0.4s ease-out ${idx * 0.08}s, transform 0.4s ease-out ${idx * 0.08}s`,
              }}
            >
              <div className={`w-8 h-8 sm:w-11 sm:h-11 md:w-14 md:h-14 ${stat.iconBg} rounded-lg sm:rounded-xl md:rounded-2xl flex justify-center items-center mb-1.5 sm:mb-2.5 shadow-xs shrink-0`}>
                {stat.icon}
              </div>
              <div className={`text-xl min-[360px]:text-2xl sm:text-4xl md:text-5xl font-black ${stat.valueFmt} tabular-nums tracking-tight leading-none`}>
                <AnimatedCounter end={stat.value} suffix={stat.suffix} />
              </div>
              <div className="text-[10px] sm:text-xs md:text-sm font-black text-slate-800 mt-1 sm:mt-1.5 tracking-wide uppercase leading-tight">
                {stat.label}
              </div>
              <div className="text-[9px] sm:text-xs text-slate-500 mt-0.5 leading-tight">
                {stat.sublabel}
              </div>
            </div>
          ))}
        </div>

        {/* ════════════ THỜI GIAN & ĐỊA ĐIỂM BANNER (MOBILE FIRST) ════════════ */}
        <div
          className="stats-reveal mt-4 sm:mt-8 md:mt-12 bg-white rounded-xl sm:rounded-2xl md:rounded-3xl border border-slate-200 shadow-xs p-3.5 sm:p-6 md:p-8 grid grid-cols-1 md:grid-cols-2 gap-3.5 sm:gap-6 md:gap-8 items-center w-full min-w-0"
          style={{
            opacity: 0,
            transform: 'translateY(20px)',
            transition: 'opacity 0.5s ease-out 0.3s, transform 0.5s ease-out 0.3s',
          }}
        >
          <div className="flex items-center gap-3.5 sm:gap-4">
            <div className="w-11 h-11 sm:w-12 sm:h-12 md:w-14 md:h-14 shrink-0 rounded-xl md:rounded-2xl bg-blue-50 text-blue-600 border border-blue-200 flex items-center justify-center">
              <Calendar className="w-5 h-5 sm:w-6 sm:h-6 md:w-7 md:h-7" />
            </div>
            <div>
              <p className="text-[10px] sm:text-xs font-bold text-slate-400 uppercase tracking-wider">Thời Gian Tổ Chức</p>
              <p className="text-slate-900 font-extrabold text-sm sm:text-base md:text-lg leading-snug mt-0.5">
                Vòng loại: 30/9/2026
              </p>
              <p className="text-slate-500 font-medium text-xs sm:text-sm mt-0.5">
                Vòng Chung kết: 09/10/2026
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3.5 sm:gap-4 pt-3.5 border-t border-slate-100 md:pt-0 md:border-t-0 md:border-l md:border-slate-200 md:pl-8">
            <div className="w-11 h-11 sm:w-12 sm:h-12 md:w-14 md:h-14 shrink-0 rounded-xl md:rounded-2xl bg-amber-50 text-amber-600 border border-amber-200 flex items-center justify-center">
              <MapPin className="w-5 h-5 sm:w-6 sm:h-6 md:w-7 md:h-7" />
            </div>
            <div>
              <p className="text-[10px] sm:text-xs font-bold text-slate-400 uppercase tracking-wider">Địa Điểm Vòng Chung Kết Sân Khấu</p>
              <p className="text-slate-900 font-extrabold text-sm sm:text-base md:text-lg leading-snug mt-0.5">
                Nhà khách Nghệ An
              </p>
              <p className="text-slate-500 font-medium text-xs sm:text-sm mt-0.5">
                Số 04 Phan Đăng Lưu, phường Trường Vinh, Nghệ An
              </p>
            </div>
          </div>
        </div>
      </div>

      <style>{`
        .stats-reveal.is-visible {
          opacity: 1 !important;
          transform: translateY(0) !important;
        }
      `}</style>
    </section>
  );
}
