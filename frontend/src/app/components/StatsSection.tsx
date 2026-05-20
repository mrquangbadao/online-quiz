import { useState, useEffect, useRef } from "react";
import { BookOpen, Scale, Target, Users, Calendar } from "lucide-react";

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
          const duration = 1500;
          const step = end / (duration / 16);
          const timer = setInterval(() => {
            start += step;
            if (start >= end) { setCount(end); clearInterval(timer); }
            else setCount(Math.floor(start));
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
    label: "CÂU LÝ THUYẾT",
    value: 10,
    suffix: "",
    icon: <BookOpen className="w-8 h-8 md:w-10 md:h-10" />,
    iconBg: "bg-emerald-100",
    iconColor: "text-emerald-600",
    hoverBg: "hover:bg-emerald-600",
    valueFmt: "text-emerald-800",
  },
  {
    label: "CÂU TÌNH HUỐNG",
    value: 10,
    suffix: "",
    icon: <Scale className="w-8 h-8 md:w-10 md:h-10" />,
    iconBg: "bg-blue-100",
    iconColor: "text-blue-600",
    hoverBg: "hover:bg-blue-600",
    valueFmt: "text-blue-800",
  },
  {
    label: "CÂU DỰ ĐOÁN",
    value: 1,
    suffix: "",
    icon: <Target className="w-8 h-8 md:w-10 md:h-10" />,
    iconBg: "bg-amber-100",
    iconColor: "text-amber-600",
    hoverBg: "hover:bg-amber-600",
    valueFmt: "text-amber-800",
  },
  {
    label: "THÍ SINH",
    value: 100,
    suffix: "+",
    icon: <Users className="w-8 h-8 md:w-10 md:h-10" />,
    iconBg: "bg-rose-100",
    iconColor: "text-rose-600",
    hoverBg: "hover:bg-rose-600",
    valueFmt: "text-rose-800",
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
    <section ref={sectionRef} className="relative py-24 bg-gradient-to-b from-white to-slate-50 border-b border-slate-100 z-20 overflow-hidden">
      {/* Decorative background */}
      <div className="absolute top-0 right-0 w-80 h-80 bg-emerald-50 rounded-full blur-[120px] -translate-y-1/2 translate-x-1/4"></div>
      <div className="absolute bottom-0 left-0 w-96 h-96 bg-amber-50 rounded-full blur-[140px] translate-y-1/3 -translate-x-1/4"></div>

      <div className="max-w-[1400px] mx-auto px-4 md:px-10 lg:px-16 relative z-10">
        <div className="text-center mb-16 stats-reveal" style={{ opacity: 0, transform: 'translateY(20px)', transition: 'opacity 0.6s ease-out, transform 0.6s ease-out' }}>
          <span className="text-sm font-bold tracking-[0.2em] text-green-700 uppercase bg-green-50 px-5 py-2 rounded-full inline-flex items-center gap-2 mb-4 border border-green-200">
            📊 HÌNH THỨC, THỂ LỆ CUỘC THI
          </span>
          <h2 className="text-3xl md:text-4xl lg:text-5xl font-black text-slate-800">
            THÔNG TIN CUỘC THI
          </h2>
          <div className="w-20 h-1.5 bg-green-500 mx-auto mt-5 rounded-full"></div>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-5 md:gap-8">
          {stats.map((stat, idx) => (
            <div
              key={idx}
              className={`stats-reveal group p-6 md:p-8 rounded-3xl bg-white border border-slate-100 ${stat.hoverBg} transition-colors duration-300 shadow-[0_4px_20px_rgb(0,0,0,0.04)] hover:shadow-[0_20px_50px_rgba(0,0,0,0.12)] hover:-translate-y-2.5 transition-transform text-center flex flex-col items-center relative overflow-hidden cursor-default`}
              style={{
                opacity: 0,
                transform: 'translateY(25px)',
                transition: `opacity 0.5s ease-out ${idx * 0.1}s, transform 0.5s ease-out ${idx * 0.1}s`,
              }}
            >
              {/* Decorative ring */}
              <div className="absolute -top-12 -right-12 w-32 h-32 rounded-full border-[4px] border-slate-50 group-hover:border-white/20 transition-colors pointer-events-none" />

              <div className={`w-16 h-16 md:w-20 md:h-20 ${stat.iconBg} group-hover:bg-white/20 shadow-sm rounded-2xl flex justify-center items-center ${stat.iconColor} group-hover:text-white transition-all mb-5 relative z-10`}>
                {stat.icon}
              </div>
              <div className={`text-4xl md:text-5xl font-black ${stat.valueFmt} group-hover:text-white transition-colors relative z-10 tabular-nums`}>
                <AnimatedCounter end={stat.value} suffix={stat.suffix} />
              </div>
              <div className="text-xs md:text-sm font-bold text-slate-500 group-hover:text-white/80 mt-2 tracking-[0.15em] relative z-10">
                {stat.label}
              </div>
            </div>
          ))}
        </div>

        {/* ════════════ THỜI GIAN & ĐỐI TƯỢNG BANNER ════════════ */}
        <div
          className="stats-reveal mt-16 max-w-[1000px] mx-auto bg-white rounded-3xl shadow-xl shadow-slate-200/50 border border-slate-100 p-8 flex flex-col md:flex-row gap-8 items-start md:items-center justify-between"
          style={{
            opacity: 0,
            transform: 'translateY(30px)',
            transition: 'opacity 0.6s ease-out 0.4s, transform 0.6s ease-out 0.4s',
          }}
        >
          <div className="flex items-center gap-6 w-full md:w-auto">
            <div className="w-16 h-16 shrink-0 rounded-2xl bg-green-100 text-green-600 flex items-center justify-center">
              <Calendar className="w-8 h-8" />
            </div>
            <div>
              <h3 className="text-xl font-black text-slate-800 mb-1">Thời Gian Bắt Đầu</h3>
              <p className="text-slate-600 font-medium text-lg">Cuối tháng 5/2026</p>
            </div>
          </div>
          <div className="hidden md:block w-px h-16 bg-slate-200"></div>
          <div className="flex items-center gap-6 w-full md:w-auto">
            <div className="w-16 h-16 shrink-0 rounded-2xl bg-yellow-100 text-yellow-600 flex items-center justify-center">
              <Users className="w-8 h-8" />
            </div>
            <div>
              <h3 className="text-xl font-black text-slate-800 mb-1">Thí sinh Tham Gia</h3>
              <p className="text-slate-600 font-medium text-lg">Đoàn viên, thanh niên và Nhân dân</p>
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
