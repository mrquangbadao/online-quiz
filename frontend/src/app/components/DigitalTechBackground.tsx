/**
 * DigitalTechBackground – decorative background for the hero section.
 *
 * Performance notes (Sep 2026):
 *   – Removed CSS blur-[80-120px] divs that crushed low-end phone GPUs.
 *   – Replaced with simple radial-gradient backgrounds via inline style
 *     which the browser composites cheaply on a single layer.
 *   – SVG circuit paths remain – they are lightweight static vectors.
 */
export default function DigitalTechBackground() {
  return (
    <div className="absolute inset-0 overflow-hidden pointer-events-none select-none z-0">
      {/* ── 1. Soft radial glows (no CSS blur, uses gradient opacity instead) ── */}
      {/* Central glow */}
      <div
        className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[300px] sm:w-[550px] md:w-[750px] h-[300px] sm:h-[450px] rounded-full"
        style={{ background: 'radial-gradient(circle, rgba(56,189,248,0.15) 0%, transparent 70%)' }}
      />
      {/* Top glow */}
      <div
        className="absolute -top-16 left-1/2 -translate-x-1/2 w-[260px] sm:w-[600px] h-[180px] sm:h-[300px] rounded-full"
        style={{ background: 'radial-gradient(circle, rgba(103,232,249,0.1) 0%, transparent 70%)' }}
      />
      {/* Bottom glow */}
      <div
        className="absolute -bottom-16 left-1/2 -translate-x-1/2 w-[300px] sm:w-[700px] h-[160px] sm:h-[240px] rounded-full"
        style={{ background: 'radial-gradient(circle, rgba(56,189,248,0.18) 0%, transparent 70%)' }}
      />

      {/* ── 2. Vector Mạch Điện Tử Trái (Sát mép trái) ── */}
      <svg
        className="absolute top-0 left-0 w-20 sm:w-28 md:w-36 h-full pointer-events-none opacity-40 sm:opacity-70"
        viewBox="0 0 140 600"
        fill="none"
        preserveAspectRatio="xMinYMin meet"
      >
        {/* Top-Left Cyber Corner */}
        <g stroke="#38bdf8" strokeWidth="1.5">
          <path d="M 12 50 L 12 24 L 24 12 L 65 12" />
          <path d="M 20 30 L 30 20 L 50 20" strokeWidth="1" strokeOpacity="0.4" />
          <circle cx="65" cy="12" r="2.5" fill="#38bdf8" />
        </g>

        {/* Left Circuit Tracks */}
        <g stroke="#38bdf8" strokeWidth="1.5" opacity="0.6">
          <path d="M 0 160 L 30 160 L 50 185 L 50 250 L 30 270 L 0 270" />
          <circle cx="50" cy="185" r="3" fill="#00f2fe" />
          <circle cx="50" cy="250" r="2.5" fill="#38bdf8" />

          <path d="M 0 350 L 25 350 L 45 375 L 45 430 L 20 455 L 0 455" />
          <circle cx="45" cy="375" r="2.5" fill="#38bdf8" />
          <circle cx="20" cy="455" r="3" fill="#00f2fe" />
        </g>

        {/* Bottom-Left Cyber Corner */}
        <g stroke="#38bdf8" strokeWidth="1.5" opacity="0.7">
          <path d="M 12 550 L 12 576 L 24 588 L 65 588" />
          <circle cx="65" cy="588" r="2.5" fill="#38bdf8" />
        </g>
      </svg>

      {/* ── 3. Vector Mạch Điện Tử Phải (Đối xứng hoàn hảo qua scale-x-[-1]) ── */}
      <div className="absolute top-0 right-0 w-20 sm:w-28 md:w-36 h-full pointer-events-none opacity-40 sm:opacity-70 scale-x-[-1]">
        <svg
          className="w-full h-full"
          viewBox="0 0 140 600"
          fill="none"
          preserveAspectRatio="xMinYMin meet"
        >
          {/* Top-Right Corner */}
          <g stroke="#38bdf8" strokeWidth="1.5">
            <path d="M 12 50 L 12 24 L 24 12 L 65 12" />
            <path d="M 20 30 L 30 20 L 50 20" strokeWidth="1" strokeOpacity="0.4" />
            <circle cx="65" cy="12" r="2.5" fill="#38bdf8" />
          </g>

          {/* Right Circuit Tracks */}
          <g stroke="#38bdf8" strokeWidth="1.5" opacity="0.6">
            <path d="M 0 160 L 30 160 L 50 185 L 50 250 L 30 270 L 0 270" />
            <circle cx="50" cy="185" r="3" fill="#00f2fe" />
            <circle cx="50" cy="250" r="2.5" fill="#38bdf8" />

            <path d="M 0 350 L 25 350 L 45 375 L 45 430 L 20 455 L 0 455" />
            <circle cx="45" cy="375" r="2.5" fill="#38bdf8" />
            <circle cx="20" cy="455" r="3" fill="#00f2fe" />
          </g>

          {/* Bottom-Right Corner */}
          <g stroke="#38bdf8" strokeWidth="1.5" opacity="0.7">
            <path d="M 12 550 L 12 576 L 24 588 L 65 588" />
            <circle cx="65" cy="588" r="2.5" fill="#38bdf8" />
          </g>
        </svg>
      </div>

      {/* ── 4. Subtle HUD Center Target ── */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-64 h-64 sm:w-80 sm:h-80 pointer-events-none opacity-10 flex items-center justify-center">
        <div className="w-56 h-56 rounded-full border border-dashed border-sky-400" />
        <div className="absolute w-72 h-72 rounded-full border border-dashed border-sky-300" />
      </div>
    </div>
  );
}
