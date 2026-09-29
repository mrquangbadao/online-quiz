export default function DigitalCongressIllustration({ className = "" }: { className?: string }) {
  return (
    <div className={`relative pointer-events-none select-none ${className}`}>
      <svg
        viewBox="0 0 700 270"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        className="w-full h-auto drop-shadow-2xl"
      >
        <defs>
          {/* Cyan Glow Filter */}
          <filter id="digiGlow" x="-30%" y="-30%" width="160%" height="160%">
            <feGaussianBlur stdDeviation="4" result="blur" />
            <feComposite in="SourceGraphic" in2="blur" operator="over" />
          </filter>
          <filter id="softGlow" x="-20%" y="-20%" width="140%" height="140%">
            <feGaussianBlur stdDeviation="8" result="blur" />
          </filter>

          {/* Gradients */}
          <linearGradient id="pedestalGrad" x1="350" y1="170" x2="350" y2="245" gradientUnits="userSpaceOnUse">
            <stop offset="0%" stopColor="#00f2fe" stopOpacity="0.45" />
            <stop offset="50%" stopColor="#0284c7" stopOpacity="0.25" />
            <stop offset="100%" stopColor="#0369a1" stopOpacity="0" />
          </linearGradient>

          <linearGradient id="screenGrad" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#075985" />
            <stop offset="100%" stopColor="#0c4a6e" />
          </linearGradient>

          <linearGradient id="clipPaperGrad" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#ffffff" />
            <stop offset="100%" stopColor="#e0f2fe" />
          </linearGradient>

          <linearGradient id="chartBarGrad" x1="0" y1="1" x2="0" y2="0">
            <stop offset="0%" stopColor="#0284c7" />
            <stop offset="100%" stopColor="#38bdf8" />
          </linearGradient>

          <linearGradient id="beamGrad" x1="350" y1="230" x2="350" y2="70" gradientUnits="userSpaceOnUse">
            <stop offset="0%" stopColor="#38bdf8" stopOpacity="0.25" />
            <stop offset="100%" stopColor="#38bdf8" stopOpacity="0" />
          </linearGradient>
        </defs>

        {/* ── 1. Cyber Pedestal & Radial Light Beam ── */}
        <polygon points="260,230 440,230 490,90 210,90" fill="url(#beamGrad)" />
        <ellipse cx="350" cy="225" rx="240" ry="38" fill="url(#pedestalGrad)" />
        <ellipse cx="350" cy="225" rx="210" ry="30" stroke="#38bdf8" strokeWidth="1.5" strokeOpacity="0.7" strokeDasharray="8 6" filter="url(#digiGlow)" />
        <ellipse cx="350" cy="225" rx="160" ry="22" stroke="#00f2fe" strokeWidth="2" strokeOpacity="0.85" filter="url(#digiGlow)" />
        <ellipse cx="350" cy="225" rx="110" ry="14" stroke="#ffffff" strokeWidth="1" strokeOpacity="0.9" />

        {/* ── 2. Circuit Board Tracks (Emanating Left & Right) ── */}
        {/* Left Circuit Tracks */}
        <g stroke="#38bdf8" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" fill="none" opacity="0.85">
          <path d="M 230 220 L 150 220 L 110 185 L 50 185 L 25 155" />
          <circle cx="25" cy="155" r="4.5" fill="#00f2fe" filter="url(#digiGlow)" />
          <circle cx="110" cy="185" r="3.5" fill="#38bdf8" />

          <path d="M 180 235 L 120 235 L 75 255 L 20 255" />
          <circle cx="20" cy="255" r="4" fill="#38bdf8" filter="url(#digiGlow)" />

          <path d="M 210 190 L 140 190 L 110 145 L 60 145" />
          <circle cx="60" cy="145" r="3.5" fill="#00f2fe" />

          <path d="M 150 145 L 130 110 L 80 110" />
          <circle cx="80" cy="110" r="4" fill="#38bdf8" filter="url(#digiGlow)" />
        </g>

        {/* Right Circuit Tracks */}
        <g stroke="#38bdf8" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" fill="none" opacity="0.85">
          <path d="M 470 220 L 550 220 L 590 185 L 650 185 L 675 155" />
          <circle cx="675" cy="155" r="4.5" fill="#00f2fe" filter="url(#digiGlow)" />
          <circle cx="590" cy="185" r="3.5" fill="#38bdf8" />

          <path d="M 520 235 L 580 235 L 625 255 L 680 255" />
          <circle cx="680" cy="255" r="4" fill="#38bdf8" filter="url(#digiGlow)" />

          <path d="M 490 190 L 560 190 L 590 145 L 640 145" />
          <circle cx="640" cy="145" r="3.5" fill="#00f2fe" />

          <path d="M 550 145 L 570 110 L 620 110" />
          <circle cx="620" cy="110" r="4" fill="#38bdf8" filter="url(#digiGlow)" />
        </g>

        {/* ── 3. Tech Icons Floating ── */}
        {/* Cloud Upload Icon (Left) */}
        <g transform="translate(140, 50)" opacity="0.85">
          <circle cx="20" cy="20" r="22" fill="#0284c7" fillOpacity="0.4" stroke="#38bdf8" strokeWidth="1.5" />
          <path d="M 12 24 C 9 24 7 22 7 19 C 7 16.5 9 14.5 11.5 14.2 C 12.5 11 15.5 9 19 9 C 23.5 9 27 12 27.5 16 C 30 16.5 32 18.5 32 21 C 32 23.5 30 24 28 24 Z" fill="#ffffff" fillOpacity="0.85" />
          <path d="M 19 22 L 19 15 M 16 18 L 19 15 L 22 18" stroke="#0284c7" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
        </g>

        {/* WiFi Signal Icon (Right) */}
        <g transform="translate(520, 50)" opacity="0.85">
          <circle cx="20" cy="20" r="22" fill="#0284c7" fillOpacity="0.4" stroke="#38bdf8" strokeWidth="1.5" />
          <path d="M 10 13 A 14 14 0 0 1 30 13" stroke="#ffffff" strokeWidth="2.5" strokeLinecap="round" fill="none" />
          <path d="M 14 17 A 9 9 0 0 1 26 17" stroke="#ffffff" strokeWidth="2.5" strokeLinecap="round" fill="none" />
          <circle cx="20" cy="23" r="2.5" fill="#38bdf8" />
        </g>

        {/* ── 4. Certificate Document Sheet (Layered behind clipboard) ── */}
        <g transform="translate(170, 95) rotate(-6)">
          <rect x="0" y="0" width="85" height="115" rx="6" fill="#f8fafc" stroke="#94a3b8" strokeWidth="1.5" />
          <rect x="12" y="16" width="60" height="7" rx="3.5" fill="#0284c7" fillOpacity="0.8" />
          <rect x="12" y="32" width="50" height="4" rx="2" fill="#cbd5e1" />
          <rect x="12" y="42" width="55" height="4" rx="2" fill="#cbd5e1" />
          <rect x="12" y="52" width="45" height="4" rx="2" fill="#cbd5e1" />
          <rect x="12" y="62" width="52" height="4" rx="2" fill="#cbd5e1" />
          {/* Certificate Ribbon Seal */}
          <circle cx="58" cy="88" r="14" fill="#facc15" stroke="#eab308" strokeWidth="1.5" />
          <polygon points="58,80 61,86 67,86 62,90 64,96 58,92 52,96 54,90 49,86 55,86" fill="#ffffff" />
        </g>

        {/* ── 5. Digital Checklist Clipboard (Left of Laptop) ── */}
        <g transform="translate(205, 75)">
          {/* Clipboard Backing */}
          <rect x="0" y="8" width="105" height="142" rx="10" fill="#0369a1" stroke="#38bdf8" strokeWidth="2" filter="url(#digiGlow)" />
          {/* Top Metal Clip */}
          <rect x="32" y="0" width="42" height="16" rx="4" fill="#94a3b8" stroke="#f1f5f9" strokeWidth="1.5" />
          <circle cx="53" cy="7" r="3" fill="#334155" />

          {/* Paper Sheet */}
          <rect x="8" y="20" width="89" height="122" rx="5" fill="url(#clipPaperGrad)" />

          {/* Checklist Item 1 */}
          <g transform="translate(16, 34)">
            <rect x="0" y="0" width="14" height="14" rx="3" fill="#0284c7" />
            <path d="M 3 7 L 6 10 L 11 4" stroke="#ffffff" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
            <rect x="20" y="4" width="48" height="6" rx="3" fill="#0369a1" fillOpacity="0.8" />
          </g>

          {/* Checklist Item 2 */}
          <g transform="translate(16, 58)">
            <rect x="0" y="0" width="14" height="14" rx="3" fill="#0284c7" />
            <path d="M 3 7 L 6 10 L 11 4" stroke="#ffffff" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
            <rect x="20" y="4" width="42" height="6" rx="3" fill="#0369a1" fillOpacity="0.8" />
          </g>

          {/* Checklist Item 3 */}
          <g transform="translate(16, 82)">
            <rect x="0" y="0" width="14" height="14" rx="3" fill="#0284c7" />
            <path d="M 3 7 L 6 10 L 11 4" stroke="#ffffff" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
            <rect x="20" y="4" width="46" height="6" rx="3" fill="#0369a1" fillOpacity="0.8" />
          </g>

          {/* Verified Badge Checkmark at bottom right of clipboard */}
          <g transform="translate(62, 102)">
            <circle cx="16" cy="16" r="16" fill="#0284c7" stroke="#38bdf8" strokeWidth="2" filter="url(#digiGlow)" />
            <circle cx="16" cy="16" r="12" fill="#38bdf8" />
            <path d="M 10 16 L 14 20 L 22 12" stroke="#ffffff" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />
          </g>
        </g>

        {/* ── 6. Central Laptop (Online Quiz Interface) ── */}
        <g transform="translate(290, 75)">
          {/* Laptop Screen Bezel */}
          <rect x="0" y="0" width="168" height="114" rx="9" fill="#0f172a" stroke="#38bdf8" strokeWidth="2" filter="url(#digiGlow)" />
          {/* Screen Display */}
          <rect x="7" y="7" width="154" height="98" rx="5" fill="url(#screenGrad)" />

          {/* Screen Header Bar */}
          <rect x="7" y="7" width="154" height="15" fill="#0369a1" />
          <circle cx="14" cy="14.5" r="2.5" fill="#ef4444" />
          <circle cx="21" cy="14.5" r="2.5" fill="#eab308" />
          <circle cx="28" cy="14.5" r="2.5" fill="#22c55e" />
          {/* Quiz Timer in Screen Header */}
          <rect x="118" y="9.5" width="38" height="10" rx="3" fill="#facc15" />
          <text x="137" y="17.5" fill="#0f172a" fontSize="7" fontWeight="bold" textAnchor="middle">20:00</text>

          {/* Question Title */}
          <rect x="15" y="29" width="80" height="6" rx="3" fill="#ffffff" />
          <rect x="15" y="38" width="120" height="4" rx="2" fill="#bae6fd" />

          {/* Question Radio Options */}
          {/* Option A */}
          <circle cx="20" cy="52" r="4" fill="none" stroke="#38bdf8" strokeWidth="1.5" />
          <rect x="28" y="49" width="85" height="5" rx="2.5" fill="#ffffff" fillOpacity="0.85" />

          {/* Option B (Selected Answer) */}
          <circle cx="20" cy="65" r="4" fill="#22c55e" stroke="#4ade80" strokeWidth="1.5" />
          <circle cx="20" cy="65" r="2" fill="#ffffff" />
          <rect x="28" y="62" width="105" height="5" rx="2.5" fill="#86efac" />

          {/* Option C */}
          <circle cx="20" cy="78" r="4" fill="none" stroke="#38bdf8" strokeWidth="1.5" />
          <rect x="28" y="75" width="75" height="5" rx="2.5" fill="#ffffff" fillOpacity="0.85" />

          {/* Option D */}
          <circle cx="20" cy="91" r="4" fill="none" stroke="#38bdf8" strokeWidth="1.5" />
          <rect x="28" y="88" width="90" height="5" rx="2.5" fill="#ffffff" fillOpacity="0.85" />

          {/* Laptop Keyboard Base */}
          <path d="M -18 114 L 186 114 L 198 126 L -30 126 Z" fill="#1e293b" stroke="#38bdf8" strokeWidth="1.5" />
          <rect x="62" y="116" width="44" height="6" rx="2" fill="#0284c7" />
          {/* Glowing bottom edge line */}
          <line x1="-30" y1="126" x2="198" y2="126" stroke="#00f2fe" strokeWidth="2.5" filter="url(#digiGlow)" />
        </g>

        {/* ── 7. Smartphone (Mobile Quiz App with Verified Checkmark) ── */}
        <g transform="translate(470, 105)">
          {/* Phone Body */}
          <rect x="0" y="0" width="58" height="106" rx="11" fill="#0f172a" stroke="#38bdf8" strokeWidth="2" filter="url(#digiGlow)" />
          {/* Screen */}
          <rect x="5" y="8" width="48" height="90" rx="7" fill="url(#screenGrad)" />
          {/* Phone Speaker Notch */}
          <rect x="21" y="3" width="16" height="3" rx="1.5" fill="#64748b" />

          {/* App Header */}
          <rect x="9" y="14" width="28" height="4" rx="2" fill="#38bdf8" />

          {/* Center Checkmark Circle */}
          <circle cx="29" cy="50" r="16" fill="#16a34a" fillOpacity="0.3" stroke="#22c55e" strokeWidth="2" filter="url(#digiGlow)" />
          <circle cx="29" cy="50" r="12" fill="#22c55e" />
          <path d="M 23 50 L 27 54 L 35 45" stroke="#ffffff" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />

          {/* Status Bars */}
          <rect x="12" y="74" width="34" height="4" rx="2" fill="#ffffff" />
          <rect x="15" y="82" width="28" height="3" rx="1.5" fill="#bae6fd" />

          {/* Home indicator */}
          <rect x="22" y="94" width="14" height="2" rx="1" fill="#94a3b8" />
        </g>

        {/* ── 8. Analytics Growth Bar Chart (Right Side) ── */}
        <g transform="translate(540, 130)">
          {/* Chart Background Panel */}
          <rect x="0" y="0" width="90" height="68" rx="8" fill="#0284c7" fillOpacity="0.3" stroke="#38bdf8" strokeWidth="1.5" />
          {/* Grid lines */}
          <line x1="8" y1="18" x2="82" y2="18" stroke="#38bdf8" strokeWidth="0.8" strokeOpacity="0.4" strokeDasharray="3 3" />
          <line x1="8" y1="36" x2="82" y2="36" stroke="#38bdf8" strokeWidth="0.8" strokeOpacity="0.4" strokeDasharray="3 3" />
          <line x1="8" y1="54" x2="82" y2="54" stroke="#38bdf8" strokeWidth="0.8" strokeOpacity="0.6" />

          {/* Bars */}
          <rect x="16" y="38" width="10" height="16" rx="2" fill="url(#chartBarGrad)" />
          <rect x="32" y="28" width="10" height="26" rx="2" fill="url(#chartBarGrad)" />
          <rect x="48" y="20" width="10" height="34" rx="2" fill="url(#chartBarGrad)" />
          <rect x="64" y="10" width="10" height="44" rx="2" fill="url(#chartBarGrad)" />

          {/* Upward Growth Trend Line */}
          <path d="M 21 34 L 37 24 L 53 16 L 69 7" stroke="#facc15" strokeWidth="2.5" fill="none" strokeLinecap="round" />
          <circle cx="69" cy="7" r="3.5" fill="#facc15" filter="url(#digiGlow)" />
        </g>
      </svg>
    </div>
  );
}
