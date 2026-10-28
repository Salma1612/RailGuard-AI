/** Original SVG artwork (no third-party imagery): rails converging to a vanishing point with an inspection scan line. */
export default function HeroArt() {
  const sleepers = Array.from({ length: 11 }, (_, i) => i);
  return (
    <svg viewBox="0 0 600 420" className="h-full w-full" role="img" aria-label="Illustration of railway tracks receding into the distance with an AI scan line">
      <defs>
        <linearGradient id="sky" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#0b1324" /><stop offset="1" stopColor="#1f3050" />
        </linearGradient>
        <linearGradient id="scan" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#ff7a1a" stopOpacity="0" /><stop offset="1" stopColor="#ff7a1a" stopOpacity="0.55" />
        </linearGradient>
        <clipPath id="frame"><rect width="600" height="420" rx="16" /></clipPath>
      </defs>
      <g clipPath="url(#frame)">
        <rect width="600" height="420" fill="url(#sky)" />
        <polygon points="0,420 600,420 600,250 330,170 270,170 0,250" fill="#0e1830" />
        <polygon points="240,420 360,420 306,170 294,170" fill="#16233c" />
        {sleepers.map((i) => {
          const t = i / 10; const y = 170 + Math.pow(t, 1.8) * 250; const half = 12 + t * 175; const h = 2 + t * 12;
          return <rect key={i} x={300 - half - 20 * t} y={y} width={(half + 20 * t) * 2} height={h} fill="#2c4166" opacity={0.5 + t * 0.5} />;
        })}
        <line x1="296" y1="170" x2="215" y2="420" stroke="#c3cddd" strokeWidth="6" />
        <line x1="304" y1="170" x2="385" y2="420" stroke="#c3cddd" strokeWidth="6" />
        <line x1="296" y1="170" x2="215" y2="420" stroke="#ffffff" strokeOpacity="0.35" strokeWidth="1.5" />
        <circle cx="262" cy="330" r="7" fill="none" stroke="#ff7a1a" strokeWidth="2" />
        <g stroke="#ff7a1a" strokeWidth="2" fill="none">
          <path d="M236 304 v-14 h14 M288 304 v-14 h-14 M236 356 v14 h14 M288 356 v14 h-14" transform="translate(0,-8)" />
        </g>
        <rect x="0" y="0" width="600" height="70" fill="url(#scan)" className="animate-scan" />
        <line x1="0" x2="600" y1="0" y2="0" stroke="#ff7a1a" strokeWidth="2" className="animate-scan" />
      </g>
    </svg>
  );
}
