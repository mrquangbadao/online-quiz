/**
 * DigitalTechBackground – Họa tiết nền công nghệ & bản sắc Đoàn TNCS Hồ Chí Minh
 *
 * Tiêu chí thiết kế:
 *   1. Chi tiết & Chiều sâu: Hoa văn Trống đồng Đông Sơn số hóa chìm sau Huy hiệu Đoàn,
 *      dải tia sáng sân khấu (Cyber Stage Rays), và hệ thống vi mạch điện tử cách điệu 2 bên.
 *   2. Siêu nhẹ cho điện thoại yếu:
 *      – 100% Vector SVG tĩnh & CSS Gradients cơ bản.
 *      – TUYỆT ĐỐI KHÔNG dùng CSS blur-[80px-120px] hay backdrop-blur gây sụt FPS.
 *      – Trình duyệt chỉ tốn 1 lần rasterize tĩnh vào GPU memory, cuộn 60-120 FPS mượt mà.
 */
export default function DigitalTechBackground() {
  return (
    <div className="absolute inset-0 overflow-hidden pointer-events-none select-none z-0">
      {/* ── 1. Nền chiều sâu đa tầng bằng CSS Linear & Radial Gradients nhẹ nhàng ── */}
      {/* Vầng sáng vàng kim trung tâm (tôn vinh Huy hiệu Đoàn) */}
      <div
        className="absolute top-28 sm:top-36 left-1/2 -translate-x-1/2 w-[320px] sm:w-[500px] h-[320px] sm:h-[500px] rounded-full"
        style={{
          background: 'radial-gradient(circle, rgba(250, 204, 21, 0.12) 0%, rgba(56, 189, 248, 0.08) 45%, transparent 70%)',
        }}
      />
      {/* Vầng sáng xanh lộng lẫy phía trên */}
      <div
        className="absolute -top-20 left-1/2 -translate-x-1/2 w-[340px] sm:w-[750px] h-[220px] sm:h-[360px] rounded-full"
        style={{
          background: 'radial-gradient(ellipse at center, rgba(56, 189, 248, 0.18) 0%, transparent 70%)',
        }}
      />
      {/* Chiều sâu xanh dương đậm góc dưới */}
      <div
        className="absolute -bottom-24 left-1/2 -translate-x-1/2 w-[360px] sm:w-[850px] h-[200px] sm:h-[300px] rounded-full"
        style={{
          background: 'radial-gradient(circle, rgba(14, 165, 233, 0.15) 0%, transparent 75%)',
        }}
      />

      {/* ── 2. Dải tia sáng sân khấu góc nghiêng (Cyber Stage Light Beams) ── */}
      <svg
        className="absolute inset-0 w-full h-full pointer-events-none opacity-20 sm:opacity-25"
        viewBox="0 0 1440 700"
        preserveAspectRatio="xMidYMin slice"
        fill="none"
      >
        <defs>
          <linearGradient id="beam1" x1="50%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stopColor="#38bdf8" stopOpacity="0.8" />
            <stop offset="60%" stopColor="#38bdf8" stopOpacity="0.1" />
            <stop offset="100%" stopColor="#38bdf8" stopOpacity="0" />
          </linearGradient>
          <linearGradient id="beam2" x1="50%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#38bdf8" stopOpacity="0.8" />
            <stop offset="60%" stopColor="#38bdf8" stopOpacity="0.1" />
            <stop offset="100%" stopColor="#38bdf8" stopOpacity="0" />
          </linearGradient>
          <linearGradient id="goldBeam" x1="50%" y1="0%" x2="15%" y2="100%">
            <stop offset="0%" stopColor="#facc15" stopOpacity="0.6" />
            <stop offset="70%" stopColor="#facc15" stopOpacity="0" />
          </linearGradient>
        </defs>

        {/* Chùm tia sáng tỏa sang 2 cánh */}
        <polygon points="720,0 200,700 320,700" fill="url(#beam1)" />
        <polygon points="720,0 1240,700 1120,700" fill="url(#beam2)" />
        <polygon points="720,0 420,700 500,700" fill="url(#goldBeam)" opacity="0.5" />
        <polygon points="720,0 1020,700 940,700" fill="url(#goldBeam)" opacity="0.5" />

        {/* Đường laser chéo sắc sảo hai bên */}
        <line x1="720" y1="20" x2="60" y2="680" stroke="#38bdf8" strokeWidth="1" strokeDasharray="6 8" opacity="0.4" />
        <line x1="720" y1="20" x2="1380" y2="680" stroke="#38bdf8" strokeWidth="1" strokeDasharray="6 8" opacity="0.4" />
      </svg>

      {/* ── 3. Họa tiết Trống đồng Đông Sơn số hóa in chìm (Ngay phía sau Huy hiệu Đoàn) ── */}
      <div className="absolute top-20 sm:top-24 left-1/2 -translate-x-1/2 pointer-events-none opacity-20 sm:opacity-25 w-[380px] sm:w-[520px] md:w-[620px] h-[380px] sm:h-[520px] md:h-[620px]">
        <svg viewBox="0 0 400 400" className="w-full h-full" fill="none">
          {/* Vòng tròn ngoài cùng với vạch tọa độ */}
          <circle cx="200" cy="200" r="190" stroke="#38bdf8" strokeWidth="1" strokeDasharray="4 8" />
          <circle cx="200" cy="200" r="178" stroke="#facc15" strokeWidth="1.2" opacity="0.6" />
          <circle cx="200" cy="200" r="162" stroke="#38bdf8" strokeWidth="1" strokeDasharray="2 4" />
          <circle cx="200" cy="200" r="148" stroke="#38bdf8" strokeWidth="1.5" />

          {/* Vòng răng cưa / họa tiết hình học Trống đồng */}
          <circle cx="200" cy="200" r="132" stroke="#facc15" strokeWidth="1" strokeDasharray="8 6" />
          <circle cx="200" cy="200" r="115" stroke="#38bdf8" strokeWidth="1" />
          <circle cx="200" cy="200" r="95" stroke="#38bdf8" strokeWidth="1.2" strokeDasharray="4 4" />
          <circle cx="200" cy="200" r="75" stroke="#facc15" strokeWidth="1.5" opacity="0.8" />

          {/* Ngôi sao 14 cánh biểu trưng mặt trời Đông Sơn ở tâm */}
          <g stroke="#facc15" strokeWidth="1.2" fill="none" opacity="0.85">
            {[...Array(14)].map((_, i) => {
              const angle = (i * 360) / 14;
              const rad = (angle * Math.PI) / 180;
              const radNext = (((angle + 360 / 28) * Math.PI) / 180);
              const x1 = 200 + Math.cos(rad) * 72;
              const y1 = 200 + Math.sin(rad) * 72;
              const xInner = 200 + Math.cos(radNext) * 35;
              const yInner = 200 + Math.sin(radNext) * 35;
              return (
                <line key={i} x1="200" y1="200" x2={x1} y2={y1} stroke="#facc15" strokeWidth="1.5" />
              );
            })}
          </g>

          {/* 4 dấu ngắm HUD hiện đại góc 90 độ */}
          <path d="M 200 4 L 200 20" stroke="#38bdf8" strokeWidth="2.5" />
          <path d="M 200 396 L 200 380" stroke="#38bdf8" strokeWidth="2.5" />
          <path d="M 4 200 L 20 200" stroke="#38bdf8" strokeWidth="2.5" />
          <path d="M 396 200 L 380 200" stroke="#38bdf8" strokeWidth="2.5" />
        </svg>
      </div>

      {/* ── 4. Cụm vi mạch điện tử & Hexagon Nodes mạn trái ── */}
      <svg
        className="absolute top-0 left-0 w-28 sm:w-44 md:w-56 h-full pointer-events-none opacity-50 sm:opacity-75"
        viewBox="0 0 200 650"
        fill="none"
        preserveAspectRatio="xMinYMin meet"
      >
        {/* Hexagon Badge góc trên */}
        <polygon points="30,40 55,25 80,40 80,70 55,85 30,70" stroke="#38bdf8" strokeWidth="1.5" fill="rgba(56,189,248,0.06)" />
        <text x="55" y="60" textAnchor="middle" fill="#38bdf8" fontSize="10" fontWeight="900" fontFamily="sans-serif" opacity="0.9">2026</text>

        {/* Các nhánh vi mạch chính */}
        <g stroke="#38bdf8" strokeWidth="1.5">
          <path d="M 80 55 L 120 55 L 140 75 L 140 130 L 115 155 L 0 155" />
          <circle cx="140" cy="75" r="3" fill="#00f2fe" />
          <circle cx="115" cy="155" r="2.5" fill="#facc15" />

          <path d="M 0 230 L 45 230 L 75 260 L 75 330 L 105 360 L 140 360" />
          <circle cx="75" cy="260" r="3" fill="#00f2fe" />
          <circle cx="140" cy="360" r="3.5" fill="#facc15" />
          <circle cx="140" cy="360" r="7" stroke="#facc15" strokeWidth="1" strokeDasharray="3 3" />

          <path d="M 0 440 L 40 440 L 70 470 L 70 530 L 35 565 L 0 565" />
          <circle cx="70" cy="470" r="2.5" fill="#38bdf8" />
          <circle cx="35" cy="565" r="3" fill="#00f2fe" />
        </g>

        {/* Điểm data nodes nhỏ lấp lánh */}
        <circle cx="155" cy="210" r="1.5" fill="#38bdf8" opacity="0.6" />
        <circle cx="170" cy="225" r="2" fill="#facc15" opacity="0.7" />
        <circle cx="145" cy="245" r="1.5" fill="#38bdf8" opacity="0.5" />
        <line x1="155" y1="210" x2="170" y2="225" stroke="#38bdf8" strokeWidth="0.8" opacity="0.4" />
        <line x1="170" y1="225" x2="145" y2="245" stroke="#38bdf8" strokeWidth="0.8" opacity="0.4" />
      </svg>

      {/* ── 5. Cụm vi mạch điện tử & Hexagon Nodes mạn phải (Đối xứng) ── */}
      <div className="absolute top-0 right-0 w-28 sm:w-44 md:w-56 h-full pointer-events-none opacity-50 sm:opacity-75 scale-x-[-1]">
        <svg
          className="w-full h-full"
          viewBox="0 0 200 650"
          fill="none"
          preserveAspectRatio="xMinYMin meet"
        >
          {/* Hexagon Badge góc trên */}
          <polygon points="30,40 55,25 80,40 80,70 55,85 30,70" stroke="#38bdf8" strokeWidth="1.5" fill="rgba(56,189,248,0.06)" />
          <text x="-55" y="60" textAnchor="middle" transform="scale(-1, 1)" fill="#facc15" fontSize="9" fontWeight="900" fontFamily="sans-serif" opacity="0.9">ĐOÀN</text>

          {/* Các nhánh vi mạch chính */}
          <g stroke="#38bdf8" strokeWidth="1.5">
            <path d="M 80 55 L 120 55 L 140 75 L 140 130 L 115 155 L 0 155" />
            <circle cx="140" cy="75" r="3" fill="#00f2fe" />
            <circle cx="115" cy="155" r="2.5" fill="#facc15" />

            <path d="M 0 230 L 45 230 L 75 260 L 75 330 L 105 360 L 140 360" />
            <circle cx="75" cy="260" r="3" fill="#00f2fe" />
            <circle cx="140" cy="360" r="3.5" fill="#facc15" />
            <circle cx="140" cy="360" r="7" stroke="#facc15" strokeWidth="1" strokeDasharray="3 3" />

            <path d="M 0 440 L 40 440 L 70 470 L 70 530 L 35 565 L 0 565" />
            <circle cx="70" cy="470" r="2.5" fill="#38bdf8" />
            <circle cx="35" cy="565" r="3" fill="#00f2fe" />
          </g>

          {/* Điểm data nodes */}
          <circle cx="155" cy="210" r="1.5" fill="#38bdf8" opacity="0.6" />
          <circle cx="170" cy="225" r="2" fill="#facc15" opacity="0.7" />
          <circle cx="145" cy="245" r="1.5" fill="#38bdf8" opacity="0.5" />
          <line x1="155" y1="210" x2="170" y2="225" stroke="#38bdf8" strokeWidth="0.8" opacity="0.4" />
          <line x1="170" y1="225" x2="145" y2="245" stroke="#38bdf8" strokeWidth="0.8" opacity="0.4" />
        </svg>
      </div>

      {/* ── 6. Lưới phối cảnh chân sân khấu (Perspective Cyber Grid) ── */}
      <div
        className="absolute bottom-0 left-0 right-0 h-28 pointer-events-none opacity-20"
        style={{
          backgroundImage: `
            linear-gradient(to right, rgba(56, 189, 248, 0.25) 1px, transparent 1px),
            linear-gradient(to bottom, rgba(56, 189, 248, 0.25) 1px, transparent 1px)
          `,
          backgroundSize: '40px 24px',
          maskImage: 'linear-gradient(to top, black 20%, transparent 100%)',
          WebkitMaskImage: 'linear-gradient(to top, black 20%, transparent 100%)',
        }}
      />
    </div>
  );
}
