import React, { useState, useEffect } from 'react';

interface KnittingPreloaderProps {
  /** Fills the entire viewport height with a light gray background */
  fullScreen?: boolean;
  className?: string;
}

// ─── Cycling textile words ───────────────────────────────────────────────────
const WORDS = [
  'Stitching',
  'Threading',
  'Weaving',
  'Tailoring',
  'Hemming',
  'Pleating',
  'Dyeing',
  'Serging',
  'Blocking',
  'Steaming',
  'Quilting',
  'Binding',
  'Smocking',
  'Draping',
  'Cutting',
];

// ─── CSS keyframes ────────────────────────────────────────────────────────────
const STYLES = `
  @keyframes kp-top-needle {
    0%,100% { transform: rotate(0deg) translate(0,0); }
    50%      { transform: rotate(-8deg) translate(-5px,2px); }
  }
  @keyframes kp-bottom-needle {
    0%,100% { transform: rotate(0deg); }
    50%      { transform: rotate(2deg); }
  }
  @keyframes kp-fabric {
    0%,100% { transform: scaleY(1); }
    50%      { transform: scaleY(1.03); }
  }
  @keyframes kp-wave {
    0%   { stroke-dashoffset: 0; }
    100% { stroke-dashoffset: 40; }
  }
  @keyframes kp-word-in {
    from { opacity: 0; transform: translateY(6px); }
    to   { opacity: 0.85; transform: translateY(0); }
  }
  @keyframes kp-dot {
    0%, 60%, 100% { opacity: 0.15; }
    30%           { opacity: 1; }
  }
  .kp-needle { stroke: #000000; }
  .kp-label  { color: #000000; }
  .kp-fabric { stroke: #e84040; }
  @media (prefers-color-scheme: dark) {
    .kp-needle { stroke: #ffffff; }
    .kp-label  { color: #ffffff; }
    .kp-fabric { stroke: #ff2020; }
  }
  .dark .kp-needle { stroke: #ffffff; }
  .dark .kp-label  { color: #ffffff; }
  .dark .kp-fabric { stroke: #ff2020; }
`;


// ─── Main component ───────────────────────────────────────────────────────────
export const KnittingPreloader: React.FC<KnittingPreloaderProps> = ({
  fullScreen = false,
  className = '',
}) => {
  const [wordIdx, setWordIdx] = useState(0);

  useEffect(() => {
    const id = setInterval(() => {
      setWordIdx(i => (i + 1) % WORDS.length);
    }, 1800);
    return () => clearInterval(id);
  }, []);

  const loader = (
    <div
      style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 10 }}
      className={className}
    >
      <style>{STYLES}</style>

      <svg
        width={170}
        height={175}
        viewBox="-12 -12 184 192"
        xmlns="http://www.w3.org/2000/svg"
        aria-label="Loading…"
        role="img"
      >
        {/* ── NEEDLE & FABRIC ASSEMBLY ── */}

        {/* Bottom needle */}
        <g style={{ transformOrigin: '30px 60px', animation: 'kp-bottom-needle 1.2s ease-in-out infinite' }}>
          <line x1={35} y1={60} x2={135} y2={60}
            stroke="#1a1c2c" strokeWidth={3} strokeLinecap="round" className="kp-needle" />
          <circle cx={30} cy={60} r={5}
            fill="none" stroke="#1a1c2c" strokeWidth={3} className="kp-needle" />

          {/* Fabric */}
          <g style={{ transformOrigin: '80px 60px', animation: 'kp-fabric 1.2s ease-in-out infinite' }}>
            <rect x={50} y={60} width={60} height={70} rx={2}
              fill="none" stroke="#e84040" strokeWidth={2.5} strokeLinejoin="round" className="kp-fabric" />

            {[60, 70, 80, 90, 100].map(x => (
              <line key={x} x1={x} y1={60} x2={x} y2={130}
                stroke="#e84040" strokeWidth={1.5} opacity={0.55} className="kp-fabric" />
            ))}

            {[
              { d: 'M50,80 Q57.5,70 65,80 T80,80 T95,80 T110,80', delay: '0s' },
              { d: 'M50,100 Q57.5,90 65,100 T80,100 T95,100 T110,100', delay: '0.45s' },
              { d: 'M50,120 Q57.5,110 65,120 T80,120 T95,120 T110,120', delay: '0.9s' },
            ].map(({ d, delay }, i) => (
              <path key={i} d={d} fill="none" stroke="#e84040" strokeWidth={2.5}
                strokeLinecap="round" strokeDasharray="10 5" className="kp-fabric"
                style={{ animation: 'kp-wave 3s linear infinite', animationDelay: delay }} />
            ))}

            {/* Fringe */}
            {[[55, 50], [70, 70], [90, 90], [105, 110]].map(([x1, x2], i) => (
              <line key={i} x1={x1} y1={130} x2={x2} y2={148}
                stroke="#e84040" strokeWidth={2.2} strokeLinecap="round" className="kp-fabric" />
            ))}
          </g>
        </g>

        {/* Top needle */}
        <g style={{ transformOrigin: '130px 40px', animation: 'kp-top-needle 1.2s ease-in-out infinite' }}>
          <line x1={25} y1={40} x2={125} y2={40}
            stroke="#1a1c2c" strokeWidth={3} strokeLinecap="round" className="kp-needle" />
          <circle cx={130} cy={40} r={5}
            fill="none" stroke="#1a1c2c" strokeWidth={3} className="kp-needle" />
        </g>

      </svg>

      {/* Cycling textile word — key change remounts the div, triggering kp-word-in */}
      <div
        key={wordIdx}
        style={{
          display: 'flex',
          alignItems: 'baseline',
          gap: 1,
          fontSize: 10,
          letterSpacing: '0.35em',
          textTransform: 'uppercase',
          fontWeight: 700,
          fontFamily: 'sans-serif',
          animation: 'kp-word-in 0.45s ease-out forwards',
        }}
        className="kp-label"
      >
        {WORDS[wordIdx]}
        {/* Three dots staggered one after another */}
        {[0, 0.2, 0.4].map((delay, i) => (
          <span
            key={i}
            style={{ animation: `kp-dot 1.2s ease-in-out ${delay}s infinite` }}
          >.</span>
        ))}
      </div>
    </div>
  );

  if (fullScreen) {
    return (
      <div style={{
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        minHeight: '100vh', background: '#f3f4f6',
      }}>
        {loader}
      </div>
    );
  }

  return (
    <div style={{
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      padding: '7rem 0',
    }}>
      {loader}
    </div>
  );
};
