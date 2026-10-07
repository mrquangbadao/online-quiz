import { useState, useEffect, useRef } from "react";
import { BookOpen, Users, Trophy, Calendar, MapPin, Flame, Swords, Award, ShieldCheck, CheckCircle2 } from "lucide-react";

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
    label: "THÍ SINH XUẤT SẮC",
    sublabel: "Top 10 Vòng loại Tỉnh",
    value: 10,
    suffix: "",
    icon: <Users className="w-5 h-5 sm:w-6 sm:h-6 md:w-8 md:h-8" />,
    iconBg: "bg-blue-50 text-blue-700 border border-blue-200",
    hoverBg: "hover:border-blue-500",
    valueFmt: "text-blue-700",
  },
  {
    label: "PHẦN THI LIÊN HOÀN",
    sublabel: "Thông thái · Nhạy bén · Bản lĩnh",
    value: 3,
    suffix: "",
    icon: <BookOpen className="w-5 h-5 sm:w-6 sm:h-6 md:w-8 md:h-8" />,
    iconBg: "bg-teal-50 text-teal-700 border border-teal-200",
    hoverBg: "hover:border-teal-500",
    valueFmt: "text-teal-700",
  },
  {
    label: "CẶP ĐẤU ĐỐI KHÁNG",
    sublabel: "Tranh biện sân khấu",
    value: 5,
    suffix: "",
    icon: <Flame className="w-5 h-5 sm:w-6 sm:h-6 md:w-8 md:h-8" />,
    iconBg: "bg-amber-50 text-amber-700 border border-amber-200",
    hoverBg: "hover:border-amber-500",
    valueFmt: "text-amber-700",
  },
  {
    label: "QUÁN QUÂN TOÀN QUỐC",
    sublabel: "Đại diện tỉnh tại Hà Nội",
    value: 1,
    suffix: "",
    icon: <Trophy className="w-5 h-5 sm:w-6 sm:h-6 md:w-8 md:h-8" />,
    iconBg: "bg-yellow-50 text-yellow-700 border border-yellow-200",
    hoverBg: "hover:border-yellow-500",
    valueFmt: "text-yellow-600",
  },
];

const finalsStages = [
  {
    part: "Phần 1",
    title: "BÍ THƯ ĐOÀN CƠ SỞ – THÔNG THÁI",
    format: "10 câu hỏi logic · 40 giây / câu",
    desc: "Thao tác bấm đáp án trực tiếp trên điện thoại qua hệ thống tương tác sân khấu. Thang điểm giảm dần theo thời gian (01-10s: 5 điểm, 11-30s: 3 điểm, 31-40s: 2 điểm). Có cơ chế Ngôi sao hy vọng (Đúng x2 điểm, Sai trừ 2 điểm, sử dụng duy nhất 1 lần).",
    badge: "Tương tác thời gian thực",
    badgeColor: "bg-blue-100 text-blue-800 border-blue-200",
    icon: <ZapIcon className="w-5 h-5 text-blue-700" />,
  },
  {
    part: "Phần 2",
    title: "BÍ THƯ ĐOÀN CƠ SỞ – NHẠY BÉN",
    format: "02 tình huống nghiệp vụ · 10 phút",
    desc: "Thí sinh bốc thăm 01 đề thi bất kỳ gồm 02 tình huống thực tế về thực hiện nghiệp vụ trên phần mềm Quản lý đoàn viên của Trung ương Đoàn. Tổng thời gian 10 phút thực hiện trực tiếp trên phần mềm; mỗi tình huống chính xác đạt 20 điểm (tối đa 40 điểm).",
    badge: "Thực hành nghiệp vụ Đoàn",
    badgeColor: "bg-teal-100 text-teal-800 border-teal-200",
    icon: <ShieldCheck className="w-5 h-5 text-teal-700" />,
  },
  {
    part: "Phần 3",
    title: "BÍ THƯ ĐOÀN CƠ SỞ – BẢN LĨNH",
    format: "05 cặp đối kháng · 03 giai đoạn",
    desc: "Phân cặp thi đấu bằng hình thức bốc thăm ngẫu nhiên trên sân khấu. Tranh biện trực tiếp trên bục qua 3 giai đoạn: Đề xuất phương án (02 phút chuẩn bị, 05 phút trình bày), Giải quyết vấn đề (03 phút) và Tầm nhìn thủ lĩnh (01 phút). Ban Giám khảo chấm tối đa 100 điểm.",
    badge: "Đối kháng sân khấu",
    badgeColor: "bg-amber-100 text-amber-800 border-amber-200",
    icon: <Swords className="w-5 h-5 text-amber-700" />,
  },
];

function ZapIcon(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} {...props}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M13 10V3L4 14h7v7l9-11h-7z" />
    </svg>
  );
}

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
    <section id="the-le" ref={sectionRef} className="relative py-10 sm:py-14 md:py-20 bg-gradient-to-b from-slate-50 via-white to-slate-50 border-b border-slate-200 z-20 overflow-hidden w-full">
      <div className="max-w-[1300px] mx-auto px-3.5 sm:px-4 md:px-8 relative z-10 w-full min-w-0">
        {/* Section Header */}
        <div
          className="text-center mb-7 sm:mb-10 md:mb-14 stats-reveal px-2"
          style={{ opacity: 0, transform: 'translateY(16px)', transition: 'opacity 0.5s ease-out, transform 0.5s ease-out' }}
        >
          <span className="text-[10px] sm:text-[11px] md:text-xs font-black tracking-widest text-[#10348c] uppercase bg-blue-100/80 px-3.5 sm:px-4 py-1 sm:py-1.5 rounded-full inline-flex items-center gap-1.5 mb-2 sm:mb-2.5 border border-blue-200">
            <Trophy className="w-3.5 h-3.5 text-[#10348c]" /> THÔNG TIN VÒNG CHUNG KẾT CẤP TỈNH
          </span>
          <h2 className="text-lg min-[360px]:text-xl sm:text-2xl md:text-4xl font-black text-slate-800 tracking-tight leading-snug">
            QUY CHẾ VÒNG THI CHUNG KẾT TRÊN SÂN KHẤU
          </h2>
          <div className="w-16 h-1 bg-[#10348c] mx-auto mt-2.5 sm:mt-3 rounded-full" />
          <p className="text-xs sm:text-sm text-slate-500 mt-2.5 sm:mt-3 max-w-2xl mx-auto">
            03 Phần thi đối kháng liên hoàn lựa chọn Bí thư Đoàn cơ sở xuất sắc nhất tỉnh Nghệ An năm 2026 đại diện tham gia Vòng chung kết cấp toàn quốc tại Thủ đô Hà Nội
          </p>
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

        {/* ════════════ 03 PHẦN THI CHUNG KẾT LIÊN HOÀN ════════════ */}
        <div className="mt-8 sm:mt-12">
          <div className="text-center mb-5 sm:mb-8">
            <span className="text-[10px] sm:text-xs font-bold text-slate-400 uppercase tracking-widest">
              Thể thức thi đấu sân khấu
            </span>
            <h3 className="text-base sm:text-xl md:text-2xl font-black text-slate-800 mt-1 uppercase">
              03 PHẦN THI ĐỐI KHÁNG VÒNG CHUNG KẾT
            </h3>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 sm:gap-6 items-stretch">
            {finalsStages.map((stage, idx) => (
              <div
                key={idx}
                className="stats-reveal p-5 sm:p-6 rounded-2xl bg-white border border-slate-200 shadow-xs hover:shadow-md transition-all flex flex-col justify-between"
                style={{
                  opacity: 0,
                  transform: 'translateY(20px)',
                  transition: `opacity 0.4s ease-out ${0.2 + idx * 0.1}s, transform 0.4s ease-out ${0.2 + idx * 0.1}s`,
                }}
              >
                <div>
                  <div className="flex items-center justify-between mb-3">
                    <span className="text-xs font-black text-slate-400 uppercase tracking-wider">
                      {stage.part}
                    </span>
                    <span className={`text-[10px] font-bold px-2.5 py-0.5 rounded-full border ${stage.badgeColor}`}>
                      {stage.badge}
                    </span>
                  </div>
                  <div className="flex items-center gap-2.5 mb-2">
                    <div className="w-8 h-8 rounded-lg bg-slate-50 border border-slate-100 flex items-center justify-center shrink-0">
                      {stage.icon}
                    </div>
                    <h4 className="font-black text-slate-900 text-sm sm:text-base leading-tight">
                      {stage.title}
                    </h4>
                  </div>
                  <p className="text-xs font-bold text-[#10348c] mb-2.5">
                    {stage.format}
                  </p>
                  <p className="text-xs text-slate-600 leading-relaxed">
                    {stage.desc}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* ════════════ THỜI GIAN & ĐỊA ĐIỂM BANNER (MOBILE FIRST) ════════════ */}
        <div
          className="stats-reveal mt-6 sm:mt-10 bg-white rounded-xl sm:rounded-2xl md:rounded-3xl border border-slate-200 shadow-xs p-3.5 sm:p-6 md:p-8 grid grid-cols-1 md:grid-cols-2 gap-3.5 sm:gap-6 md:gap-8 items-center w-full min-w-0"
          style={{
            opacity: 0,
            transform: 'translateY(20px)',
            transition: 'opacity 0.5s ease-out 0.3s, transform 0.5s ease-out 0.3s',
          }}
        >
          <div className="flex items-center gap-3.5 sm:gap-4">
            <div className="w-11 h-11 sm:w-12 sm:h-12 md:w-14 md:h-14 shrink-0 rounded-xl md:rounded-2xl bg-blue-50 text-blue-700 border border-blue-200 flex items-center justify-center">
              <Calendar className="w-5 h-5 sm:w-6 sm:h-6 md:w-7 md:h-7" />
            </div>
            <div>
              <p className="text-[10px] sm:text-xs font-bold text-slate-400 uppercase tracking-wider">Thời Gian Tổ Chức</p>
              <p className="text-slate-900 font-extrabold text-sm sm:text-base md:text-lg leading-snug mt-0.5">
                Vòng Chung kết: 09/10/2026
              </p>
              <p className="text-emerald-700 font-semibold text-xs sm:text-sm mt-0.5 flex items-center gap-1">
                <CheckCircle2 className="w-3.5 h-3.5" /> Vòng loại: Đã hoàn thành (02/10/2026)
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3.5 sm:gap-4 pt-3.5 border-t border-slate-100 md:pt-0 md:border-t-0 md:border-l md:border-slate-200 md:pl-8">
            <div className="w-11 h-11 sm:w-12 sm:h-12 md:w-14 md:h-14 shrink-0 rounded-xl md:rounded-2xl bg-amber-50 text-amber-700 border border-amber-200 flex items-center justify-center">
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
