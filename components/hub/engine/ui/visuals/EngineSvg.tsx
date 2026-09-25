"use client";

import type { EngineStage } from "../../types";

// The Engine's body, drawn — a small inline-SVG machine that gains a part per
// stage (cog → crank → frame & axles → windmill → water wheel → hibachi
// glow). Everything turns at a speed set by the power reaching the core;
// colours come from the Outpost's accent vars so it follows the skin.
function Cog({ cx, cy, r, teeth = 8, className = "", duration }: { cx: number; cy: number; r: number; teeth?: number; className?: string; duration?: string }) {
  return (
    <g transform={`translate(${cx} ${cy})`}>
      <g className={className} style={duration ? { animationDuration: duration } : undefined}>
        {Array.from({ length: teeth }, (_, i) => (
          <rect
            key={i}
            x={-r * 0.18}
            y={-r * 1.18}
            width={r * 0.36}
            height={r * 0.4}
            rx={r * 0.06}
            fill="var(--outpost-accent)"
            transform={`rotate(${(i * 360) / teeth})`}
          />
        ))}
        <circle r={r} fill="var(--outpost-accent-dark, #6b4423)" stroke="var(--outpost-accent)" strokeWidth={r * 0.14} />
        <circle r={r * 0.32} fill="rgba(0,0,0,0.45)" />
      </g>
    </g>
  );
}

export default function EngineSvg({
  stage,
  size = 96,
  spinning = true,
  corePU = 1,
  dust = 0,
}: {
  stage: EngineStage;
  size?: number;
  spinning?: boolean;
  corePU?: number;
  dust?: number;
}) {
  // More power, faster gears; a still core barely creaks.
  const seconds = corePU <= 0 ? 14 : Math.max(1.2, 8 / Math.sqrt(corePU));
  const spin = spinning ? "engine-spin" : "";
  const spinRev = spinning ? "engine-spin-rev" : "";
  const d = `${seconds}s`;
  const w = stage >= 4 ? 160 : 100;
  return (
    <svg
      viewBox={`0 0 ${w} 100`}
      width={(size * w) / 100}
      height={size}
      aria-hidden="true"
      className="engine-svg"
      data-dust={dust}
    >
      {stage >= 4 && (
        <g stroke="var(--outpost-accent)" strokeOpacity={0.45} strokeWidth={3} fill="none">
          <rect x={8} y={14} width={144} height={74} rx={6} />
          <line x1={8} y1={51} x2={152} y2={51} strokeDasharray="6 5" />
        </g>
      )}
      {stage >= 5 && (
        <g transform="translate(34 30)">
          <g className={spin} style={{ animationDuration: `${seconds * 1.4}s` }}>
            {[0, 90, 180, 270].map((a) => (
              <path key={a} d="M0 0 L5 -26 L-5 -26 Z" fill="var(--outpost-accent-soft)" stroke="var(--outpost-accent)" strokeWidth={1.2} transform={`rotate(${a})`} />
            ))}
            <circle r={4} fill="var(--outpost-accent)" />
          </g>
        </g>
      )}
      {stage >= 6 && (
        <g transform="translate(126 70)">
          <circle r={15} fill="none" stroke="#5aa9d6" strokeWidth={2} strokeOpacity={0.7} />
          <g className={spinRev} style={{ animationDuration: d }}>
            {Array.from({ length: 8 }, (_, i) => (
              <rect key={i} x={-1.5} y={-17} width={3} height={8} fill="#5aa9d6" transform={`rotate(${i * 45})`} />
            ))}
          </g>
          <path d="M-22 16 Q -11 11 0 16 T 22 16" stroke="#5aa9d6" strokeOpacity={0.6} fill="none" strokeWidth={2} />
        </g>
      )}
      {stage >= 7 && (
        <g transform="translate(126 26)">
          <rect x={-12} y={-4} width={24} height={12} rx={2} fill="rgba(0,0,0,0.5)" stroke="var(--outpost-accent)" strokeWidth={1.5} />
          <ellipse cx={0} cy={-6} rx={9} ry={6} fill="#ff7a2e" className="engine-glow" />
        </g>
      )}
      {stage >= 3 && (
        <g stroke="var(--outpost-accent)" strokeWidth={4} strokeLinecap="round">
          <line x1={stage >= 4 ? 64 : 22} y1={70} x2={stage >= 4 ? 52 : 12} y2={84} />
          <circle cx={stage >= 4 ? 52 : 12} cy={84} r={3.5} fill="var(--outpost-accent)" />
        </g>
      )}
      <Cog cx={stage >= 4 ? 80 : 50} cy={stage >= 4 ? 62 : 52} r={stage >= 3 ? 18 : 14} className={spin} duration={d} />
      {stage >= 2 && <Cog cx={stage >= 4 ? 106 : 74} cy={stage >= 4 ? 44 : 30} r={9} teeth={6} className={spinRev} duration={`${seconds / 2}s`} />}
      {stage === 1 && <circle cx={50} cy={52} r={4} fill="#fff" opacity={0.9} className="engine-glow" />}
      {stage >= 8 && (
        <g fill="var(--outpost-accent)" opacity={0.85}>
          <circle cx={146} cy={20} r={1.6} className="engine-glow" />
          <circle cx={14} cy={20} r={1.2} className="engine-glow" />
        </g>
      )}
    </svg>
  );
}
