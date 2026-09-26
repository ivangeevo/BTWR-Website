"use client";

import { useId } from "react";
import { PART_DEFS } from "../../grid/parts";
import type { GridPartType } from "../../types";

// Drawn art for the big power sources. On the grid they're seen from above,
// lying across their axle: the axle runs top–bottom through the hub (its
// bright caps are the two faces power leaves by) and the sails / paddles
// run left–right. The grid rotates the whole drawing a quarter turn when
// the part stands in a column. Spin animations only run under
// `.engine-cell-turning` (see globals.css).

const WOOD_DARK = "#5c3b20";
const WOOD = "#8a5a32";
const WOOD_LIGHT = "#b07a47";
const CLOTH = "#efe3c8";
const IRON = "#6b7280";
const IRON_LIGHT = "#9ca3af";
const CAP = "var(--outpost-accent, #d98a4a)";

/** The axle stub through the hub, top edge to bottom edge, with lit caps. */
function AxleStub({ cx, h }: { cx: number; h: number }) {
  return (
    <g>
      <rect x={cx - 4} y={0} width={8} height={h} fill={WOOD_LIGHT} stroke={WOOD_DARK} strokeWidth={1} />
      <rect x={cx - 6} y={0} width={12} height={3} fill={CAP} />
      <rect x={cx - 6} y={h - 3} width={12} height={3} fill={CAP} />
    </g>
  );
}

/** One sail arm: a stock with a lattice frame and cloth on it, from the hub out to `len`. */
function SailArm({ len, flip }: { len: number; flip?: boolean }) {
  const bays = 5;
  const start = 14;
  const bay = (len - start) / bays;
  return (
    <g transform={flip ? "scale(-1 1)" : undefined}>
      <rect x={start} y={-11} width={len - start} height={22} fill={CLOTH} fillOpacity={0.85} stroke={WOOD_DARK} strokeWidth={1.2} rx={1.5} />
      {Array.from({ length: bays - 1 }, (_, k) => (
        <line key={k} x1={start + bay * (k + 1)} y1={-11} x2={start + bay * (k + 1)} y2={11} stroke={WOOD} strokeWidth={1.3} />
      ))}
      <line x1={start} y1={0} x2={len} y2={0} stroke={WOOD} strokeWidth={0.9} strokeOpacity={0.7} />
      {/* the stock (spar) the sail hangs on */}
      <rect x={0} y={-2.5} width={len + 2} height={5} fill={WOOD} stroke={WOOD_DARK} strokeWidth={0.8} />
    </g>
  );
}

/** A 5-square windmill from above: two pairs of sails around a hub cap. */
export function WindmillArt() {
  const W = 250;
  const H = 50;
  const cx = W / 2;
  const cy = H / 2;
  const len = cx - 4;
  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="engine-part-svg" aria-hidden="true">
      <AxleStub cx={cx} h={H} />
      <g transform={`translate(${cx} ${cy})`}>
        {/* The pair at right angles to the first — edge-on (hidden) at rest. */}
        <g className="engine-sail engine-sail-b">
          <SailArm len={len} />
          <SailArm len={len} flip />
        </g>
        <g className="engine-sail engine-sail-a">
          <SailArm len={len} />
          <SailArm len={len} flip />
        </g>
        <circle r={11} fill={WOOD} stroke={WOOD_DARK} strokeWidth={1.5} />
        <circle r={6} fill={WOOD_LIGHT} stroke={WOOD_DARK} strokeWidth={1} />
        {[45, 135, 225, 315].map((a) => (
          <circle key={a} r={1.3} cx={8.5 * Math.cos((a * Math.PI) / 180)} cy={8.5 * Math.sin((a * Math.PI) / 180)} fill={IRON_LIGHT} />
        ))}
      </g>
    </svg>
  );
}

/** A 3-square water wheel from above: a paddled drum, the paddles rolling past as it turns. */
export function WaterWheelArt() {
  const W = 150;
  const H = 50;
  const cx = W / 2;
  const top = 9;
  const bottom = H - 9;
  const pitch = 12;
  const clip = useId();
  const shade = useId();
  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="engine-part-svg" aria-hidden="true">
      <defs>
        <clipPath id={clip}>
          <rect x={3} y={top} width={W - 6} height={bottom - top} rx={4} />
        </clipPath>
        {/* A drum is round: dark where it curves away at both ends. */}
        <linearGradient id={shade} x1="0" x2="1" y1="0" y2="0">
          <stop offset="0" stopColor="#000" stopOpacity={0.55} />
          <stop offset="0.25" stopColor="#000" stopOpacity={0.1} />
          <stop offset="0.5" stopColor="#fff" stopOpacity={0.08} />
          <stop offset="0.75" stopColor="#000" stopOpacity={0.1} />
          <stop offset="1" stopColor="#000" stopOpacity={0.55} />
        </linearGradient>
      </defs>
      <AxleStub cx={cx} h={H} />
      <g clipPath={`url(#${clip})`}>
        <rect x={0} y={top} width={W} height={bottom - top} fill={WOOD_DARK} />
        <g className="engine-paddles" style={{ ["--engine-paddle-pitch" as string]: `${pitch}px` }}>
          {Array.from({ length: Math.ceil(W / pitch) + 2 }, (_, k) => (
            <rect key={k} x={k * pitch - pitch} y={top} width={5} height={bottom - top} fill={WOOD_LIGHT} stroke={WOOD_DARK} strokeWidth={0.8} />
          ))}
        </g>
        <rect x={0} y={top} width={W} height={bottom - top} fill={`url(#${shade})`} />
      </g>
      {/* the two rims */}
      <rect x={3} y={top - 3} width={W - 6} height={5} rx={2} fill={WOOD} stroke={WOOD_DARK} strokeWidth={0.8} />
      <rect x={3} y={bottom - 2} width={W - 6} height={5} rx={2} fill={WOOD} stroke={WOOD_DARK} strokeWidth={0.8} />
      {/* iron hub where the axle passes through */}
      <rect x={cx - 8} y={top - 4} width={16} height={bottom - top + 8} rx={3} fill={IRON} stroke="#374151" strokeWidth={1} />
      <circle cx={cx} cy={H / 2} r={4} fill={IRON_LIGHT} />
    </svg>
  );
}

// ---- One-square parts, seen from above like the big sources. The grid
// still draws each part's input face (and a gearbox's outputs) around it;
// the part in the middle turns while it's powered (`.engine-cell-spin`).

const STONE = "#8b8f97";
const STONE_DARK = "#4b5057";
const STONE_LIGHT = "#b5b9c0";

/** A millstone from above: a dressed stone with its furrows, on a wooden spindle. */
function MillstoneArt() {
  const grad = useId();
  const furrows = Array.from({ length: 10 }, (_, k) => (k * 360) / 10);
  const at = (r: number, deg: number) => [25 + r * Math.cos((deg * Math.PI) / 180), 25 + r * Math.sin((deg * Math.PI) / 180)];
  return (
    <svg viewBox="0 0 50 50" className="engine-cell-svg" aria-hidden="true">
      <defs>
        <radialGradient id={grad} cx="0.42" cy="0.38" r="0.7">
          <stop offset="0" stopColor={STONE_LIGHT} />
          <stop offset="0.7" stopColor={STONE} />
          <stop offset="1" stopColor={STONE_DARK} />
        </radialGradient>
      </defs>
      <circle cx={25} cy={25} r={20} fill={`url(#${grad})`} stroke={STONE_DARK} strokeWidth={1.5} />
      <g className="engine-cell-spin">
        {/* the dressing: furrows sweeping out from the eye, the way a real millstone is cut */}
        {furrows.map((a) => {
          const [x1, y1] = at(7, a);
          const [x2, y2] = at(18.5, a + 24);
          return <line key={a} x1={x1} y1={y1} x2={x2} y2={y2} stroke={STONE_DARK} strokeWidth={1.4} strokeLinecap="round" />;
        })}
        <circle cx={25} cy={25} r={18.8} fill="none" stroke={STONE_DARK} strokeWidth={0.8} strokeOpacity={0.6} />
      </g>
      {/* the eye, with the wooden spindle and its iron rynd */}
      <circle cx={25} cy={25} r={6} fill={STONE_DARK} />
      <circle cx={25} cy={25} r={4.2} fill={WOOD_LIGHT} stroke={WOOD_DARK} strokeWidth={1} />
      <rect x={19} y={23.6} width={12} height={2.8} rx={1} fill={IRON} stroke="#374151" strokeWidth={0.6} className="engine-cell-spin" />
    </svg>
  );
}

// Soulforged steel: dark plate with a banked ember glow in its seams.
const STEEL_DARK = "#2a2f36";
const STEEL = "#4d5561";
const STEEL_LIGHT = "#a3adba";
const EMBER = "#f97316";

/** A gear seen face-on, centred on (25, 25): teeth, a web and a hub. */
function Gear({ fill, edge, web, hub }: { fill: string; edge: string; web: string; hub: string }) {
  const teeth = 10;
  return (
    <>
      {Array.from({ length: teeth }, (_, k) => (
        <rect key={k} x={23.4} y={13.6} width={3.2} height={4.4} rx={0.6} fill={fill} stroke={edge} strokeWidth={0.5} transform={`rotate(${(k * 360) / teeth} 25 25)`} />
      ))}
      <circle cx={25} cy={25} r={8.2} fill={fill} stroke={edge} strokeWidth={0.9} />
      {[0, 90].map((a) => (
        <rect key={a} x={24} y={18} width={2} height={14} fill={web} transform={`rotate(${a} 25 25)`} />
      ))}
      <circle cx={25} cy={25} r={2.6} fill={hub} stroke="#374151" strokeWidth={0.6} />
    </>
  );
}

/** A gearbox from above: a plank box with iron corners and its gear turning inside. */
function GearboxArt() {
  return (
    <svg viewBox="0 0 50 50" className="engine-cell-svg" aria-hidden="true">
      <rect x={6} y={6} width={38} height={38} rx={3} fill={WOOD} stroke={WOOD_DARK} strokeWidth={1.5} />
      {[15.5, 25, 34.5].map((y) => (
        <line key={y} x1={7} y1={y} x2={43} y2={y} stroke={WOOD_DARK} strokeWidth={0.8} strokeOpacity={0.7} />
      ))}
      {/* iron corner brackets */}
      {[
        [6, 6, 1, 1],
        [44, 6, -1, 1],
        [6, 44, 1, -1],
        [44, 44, -1, -1],
      ].map(([x, y, dx, dy]) => (
        <path key={`${x}-${y}`} d={`M${x} ${y + dy * 9} V${y} H${x + dx * 9}`} fill="none" stroke={IRON_LIGHT} strokeWidth={2.4} strokeLinecap="round" />
      ))}
      {/* the opening in the lid, and the gear inside it */}
      <circle cx={25} cy={25} r={13} fill="rgba(0,0,0,0.5)" stroke={WOOD_DARK} strokeWidth={1} />
      <g className="engine-cell-spin">
        <Gear fill={WOOD_LIGHT} edge={WOOD_DARK} web={WOOD} hub={IRON} />
      </g>
    </svg>
  );
}

/** A soulforged gearbox from above: riveted steel plate, a steel gear, embers in the seam. */
function SfGearboxArt() {
  const rivets: [number, number][] = [
    [9.5, 9.5],
    [25, 9.5],
    [40.5, 9.5],
    [9.5, 25],
    [40.5, 25],
    [9.5, 40.5],
    [25, 40.5],
    [40.5, 40.5],
  ];
  return (
    <svg viewBox="0 0 50 50" className="engine-cell-svg" aria-hidden="true">
      <rect x={6} y={6} width={38} height={38} rx={2.5} fill={STEEL} stroke={STEEL_DARK} strokeWidth={1.5} />
      <rect x={9} y={9} width={32} height={32} rx={1.5} fill="none" stroke={STEEL_DARK} strokeWidth={0.8} />
      {rivets.map(([x, y]) => (
        <circle key={`${x}-${y}`} cx={x} cy={y} r={1.3} fill={STEEL_LIGHT} />
      ))}
      <circle cx={25} cy={25} r={13} fill="rgba(0,0,0,0.6)" stroke={STEEL_DARK} strokeWidth={1} />
      <circle cx={25} cy={25} r={12.4} fill="none" stroke={EMBER} strokeWidth={0.8} strokeOpacity={0.55} />
      <g className="engine-cell-spin">
        <Gear fill={STEEL_LIGHT} edge={STEEL_DARK} web={STEEL} hub={STEEL_DARK} />
      </g>
    </svg>
  );
}

/** A saw from above: a wooden bench with the toothed steel blade turning in its slot. */
function SawArt() {
  const teeth = 16;
  return (
    <svg viewBox="0 0 50 50" className="engine-cell-svg" aria-hidden="true">
      <rect x={7} y={10} width={36} height={30} rx={2.5} fill={WOOD} stroke={WOOD_DARK} strokeWidth={1.5} />
      {[18, 32].map((y) => (
        <line key={y} x1={8} y1={y} x2={42} y2={y} stroke={WOOD_DARK} strokeWidth={0.7} strokeOpacity={0.6} />
      ))}
      <rect x={10} y={23.2} width={30} height={3.6} rx={1} fill="rgba(0,0,0,0.55)" />
      <g className="engine-cell-spin engine-cell-spin-fast">
        {Array.from({ length: teeth }, (_, k) => (
          <path key={k} d="M25 9.6 L27.4 13.4 L23.6 13" fill={STEEL_LIGHT} transform={`rotate(${(k * 360) / teeth} 25 25)`} />
        ))}
        <circle cx={25} cy={25} r={12.2} fill={STEEL_LIGHT} stroke={STEEL} strokeWidth={0.8} />
        <circle cx={25} cy={25} r={8.5} fill="none" stroke={STEEL} strokeWidth={0.6} strokeOpacity={0.7} />
        {[0, 120, 240].map((a) => (
          <circle key={a} cx={25} cy={19.5} r={1.1} fill={STEEL} transform={`rotate(${a} 25 25)`} />
        ))}
      </g>
      <circle cx={25} cy={25} r={3} fill={IRON} stroke="#374151" strokeWidth={0.7} />
    </svg>
  );
}

/** Bellows from above: a pear-shaped board over pleated leather, nozzle out front; it pumps while powered. */
function BellowsArt() {
  const board = "M9 25 C9 14 17 9 25 11 L37 21 L37 29 L25 39 C17 41 9 36 9 25 Z";
  return (
    <svg viewBox="0 0 50 50" className="engine-cell-svg" aria-hidden="true">
      {/* iron nozzle */}
      <path d="M36 22 L45 23.6 L45 26.4 L36 28 Z" fill={IRON} stroke="#374151" strokeWidth={0.7} />
      {/* leather pleats showing around the board */}
      <path d={board} fill="#5a3a24" stroke="#3b2414" strokeWidth={1.2} transform="translate(25 25) scale(1.1) translate(-25 -25)" />
      <g className="engine-cell-pump">
        <path d={board} fill={WOOD} stroke={WOOD_DARK} strokeWidth={1.3} />
        <path d="M13 25 C13 17 19 14 25 15.5 L33 22" fill="none" stroke={WOOD_DARK} strokeWidth={0.7} strokeOpacity={0.6} />
        {/* handle */}
        <rect x={6} y={23} width={9} height={4} rx={2} fill={WOOD_LIGHT} stroke={WOOD_DARK} strokeWidth={0.8} />
        <circle cx={24} cy={25} r={3.2} fill={IRON} stroke="#374151" strokeWidth={0.6} />
      </g>
    </svg>
  );
}

const COALS: [number, number, number][] = [
  [20, 21, 4.2],
  [29, 20, 3.8],
  [25, 28, 4.4],
  [17.5, 29, 3.4],
  [32, 28.5, 3.6],
  [24.5, 17, 2.8],
];

/** A hibachi from above: an iron brazier full of coals, glowing while it's powered. */
function HibachiArt() {
  return (
    <svg viewBox="0 0 50 50" className="engine-cell-svg" aria-hidden="true">
      {/* stone feet under the bowl */}
      {[45, 135, 225, 315].map((a) => (
        <rect key={a} x={22} y={3.5} width={6} height={6} rx={1} fill={STONE} stroke={STONE_DARK} strokeWidth={0.7} transform={`rotate(${a} 25 25)`} />
      ))}
      <circle cx={25} cy={25} r={19} fill={IRON} stroke="#1f2937" strokeWidth={1.5} />
      <circle cx={25} cy={25} r={15.5} fill="#1c1f24" stroke={IRON_LIGHT} strokeWidth={0.8} strokeOpacity={0.6} />
      {COALS.map(([x, y, r]) => (
        <circle key={`${x}-${y}`} cx={x} cy={y} r={r} fill="#3a3d42" stroke="#23262a" strokeWidth={0.6} />
      ))}
      {/* lit: the coals glow and the heat flickers */}
      <g className="engine-cell-glow">
        <circle cx={25} cy={25} r={14.5} fill={EMBER} fillOpacity={0.22} />
        {COALS.map(([x, y, r]) => (
          <circle key={`g${x}-${y}`} cx={x} cy={y} r={r * 0.7} fill="#ffb347" fillOpacity={0.85} />
        ))}
      </g>
    </svg>
  );
}

/** A detector block from above: a cut-stone block with its lens, which glows while it's powered. */
function DetectorArt() {
  const cracks: [number, number, number, number][] = [
    [8, 17, 8, 22],
    [42, 30, 42, 35],
    [17, 42, 22, 42],
  ];
  return (
    <svg viewBox="0 0 50 50" className="engine-cell-svg" aria-hidden="true">
      <rect x={6} y={6} width={38} height={38} rx={3} fill={STONE} stroke={STONE_DARK} strokeWidth={1.5} />
      <rect x={10} y={10} width={30} height={30} rx={2} fill="none" stroke={STONE_LIGHT} strokeWidth={0.8} strokeOpacity={0.6} />
      {cracks.map(([x1, y1, x2, y2]) => (
        <line key={`${x1}-${y1}`} x1={x1} y1={y1} x2={x2} y2={y2} stroke={STONE_DARK} strokeWidth={0.8} />
      ))}
      <circle cx={25} cy={25} r={10} fill={STONE_DARK} stroke="#2b2e33" strokeWidth={1} />
      <circle cx={25} cy={25} r={6.5} fill="#1d3b4a" />
      <circle cx={25} cy={25} r={3} fill="#0b1a22" />
      <g className="engine-cell-glow">
        <circle cx={25} cy={25} r={7.5} fill="#5aa9d6" fillOpacity={0.35} />
        <circle cx={25} cy={25} r={4.5} fill="#8fd3ff" />
        <circle cx={23.4} cy={23.4} r={1.3} fill="#ffffff" />
      </g>
    </svg>
  );
}

/** A soulforged axle, drawn left–right (the grid turns it for a north–south one): dark steel with lit ends. */
export function SfAxleArt() {
  return (
    <svg viewBox="0 0 50 50" className="engine-cell-svg" preserveAspectRatio="none" aria-hidden="true">
      <rect x={0} y={19.5} width={50} height={11} fill={STEEL} stroke={STEEL_DARK} strokeWidth={1} />
      <rect x={0} y={21.5} width={50} height={2.2} fill={STEEL_LIGHT} fillOpacity={0.55} />
      <line x1={3} y1={27.4} x2={47} y2={27.4} stroke={EMBER} strokeWidth={0.9} strokeOpacity={0.6} />
      {[16, 34].map((x) => (
        <rect key={x} x={x - 1.5} y={18} width={3} height={14} rx={0.8} fill={STEEL_DARK} />
      ))}
      <rect x={0} y={17} width={3} height={16} fill={CAP} className="engine-axle-cap" />
      <rect x={47} y={17} width={3} height={16} fill={CAP} className="engine-axle-cap" />
    </svg>
  );
}

/** A hand crank from above: a wooden block with the iron crank arm and its handle going round. */
function HandCrankArt() {
  return (
    <svg viewBox="0 0 50 50" className="engine-cell-svg" aria-hidden="true">
      <rect x={9} y={9} width={32} height={32} rx={5} fill={WOOD} stroke={WOOD_DARK} strokeWidth={1.5} />
      <circle cx={25} cy={25} r={11.5} fill="none" stroke={WOOD_DARK} strokeWidth={1} strokeOpacity={0.7} strokeDasharray="2 2.5" />
      <g className="engine-cell-spin engine-cell-spin-fast">
        {/* keeps the turning group centred on the spindle */}
        <circle cx={25} cy={25} r={20} fill="none" />
        <rect x={24} y={22.6} width={17} height={4.8} rx={2.2} fill={IRON} stroke="#374151" strokeWidth={0.7} />
        <circle cx={39.5} cy={25} r={5} fill={WOOD_LIGHT} stroke={WOOD_DARK} strokeWidth={1.2} />
        <circle cx={39.5} cy={25} r={1.8} fill={WOOD_DARK} />
      </g>
      <circle cx={25} cy={25} r={4.2} fill={IRON_LIGHT} stroke="#374151" strokeWidth={0.8} />
    </svg>
  );
}

/** Whether a one-square part is drawn with art (rather than its emoji). */
const CELL_ART: Partial<Record<GridPartType, () => JSX.Element>> = {
  millstone: MillstoneArt,
  gearbox: GearboxArt,
  sfGearbox: SfGearboxArt,
  handCrank: HandCrankArt,
  saw: SawArt,
  bellows: BellowsArt,
  hibachi: HibachiArt,
  detector: DetectorArt,
};

export function hasCellArt(type: GridPartType): boolean {
  return type in CELL_ART;
}

export function CellArt({ type }: { type: GridPartType }) {
  const Art = CELL_ART[type];
  return Art ? <Art /> : null;
}

/** Small front-view icons for the tray. */
export function PartIcon({ type, className = "" }: { type: GridPartType; className?: string }) {
  if (type === "millstone") {
    return (
      <svg viewBox="0 0 24 24" className={`engine-part-icon ${className}`} aria-hidden="true">
        {/* two stones on a wooden spindle, the runner above the bed */}
        <rect x={11} y={2} width={2} height={20} rx={0.8} fill={WOOD} />
        <ellipse cx={12} cy={16.5} rx={10} ry={4} fill={STONE_DARK} />
        <rect x={2} y={12} width={20} height={4.5} fill={STONE_DARK} />
        <ellipse cx={12} cy={12} rx={10} ry={4} fill={STONE} stroke={STONE_DARK} strokeWidth={0.6} />
        <ellipse cx={12} cy={9.5} rx={8.5} ry={3.4} fill={STONE_LIGHT} stroke={STONE_DARK} strokeWidth={0.6} />
        <path d="M5 9.5 Q12 6.8 19 9.5" fill="none" stroke={STONE_DARK} strokeWidth={0.6} />
        <ellipse cx={12} cy={9.5} rx={1.6} ry={0.8} fill={WOOD_DARK} />
      </svg>
    );
  }
  if (type === "gearbox") {
    return (
      <svg viewBox="0 0 24 24" className={`engine-part-icon ${className}`} aria-hidden="true">
        <rect x={2.5} y={2.5} width={19} height={19} rx={2} fill={WOOD} stroke={WOOD_DARK} strokeWidth={1} />
        {[2.5, 21.5].map((x) =>
          [2.5, 21.5].map((y) => <circle key={`${x}-${y}`} cx={x} cy={y} r={1.6} fill={IRON_LIGHT} />)
        )}
        {Array.from({ length: 8 }, (_, k) => (
          <rect key={k} x={11} y={4.8} width={2} height={3} fill={WOOD_LIGHT} transform={`rotate(${k * 45} 12 12)`} />
        ))}
        <circle cx={12} cy={12} r={5} fill={WOOD_LIGHT} stroke={WOOD_DARK} strokeWidth={0.8} />
        <circle cx={12} cy={12} r={1.6} fill={IRON} />
      </svg>
    );
  }
  if (type === "handCrank") {
    return (
      <svg viewBox="0 0 24 24" className={`engine-part-icon ${className}`} aria-hidden="true">
        {/* a block, an upright shaft, and the crank arm with its handle */}
        <rect x={5} y={17} width={14} height={5} rx={1} fill={WOOD} stroke={WOOD_DARK} strokeWidth={0.8} />
        <rect x={10.8} y={6} width={2.4} height={11.5} fill={IRON} />
        <path d="M12 6.8 H19.5" stroke={IRON} strokeWidth={2.4} strokeLinecap="round" />
        <rect x={18} y={1.5} width={3.2} height={6.5} rx={1.5} fill={WOOD_LIGHT} stroke={WOOD_DARK} strokeWidth={0.7} />
        <circle cx={12} cy={6.8} r={1.6} fill={IRON_LIGHT} />
      </svg>
    );
  }
  if (type === "saw") {
    return (
      <svg viewBox="0 0 24 24" className={`engine-part-icon ${className}`} aria-hidden="true">
        {/* a round blade standing up out of a wooden bench */}
        {Array.from({ length: 12 }, (_, k) => (
          <path key={k} d="M12 1.2 L13.6 3.6 L11 3.4" fill={STEEL_LIGHT} transform={`rotate(${k * 30} 12 10)`} />
        ))}
        <circle cx={12} cy={10} r={6.8} fill={STEEL_LIGHT} stroke={STEEL} strokeWidth={0.6} />
        <circle cx={12} cy={10} r={1.6} fill={IRON} />
        <rect x={1.5} y={14.5} width={21} height={5} rx={1} fill={WOOD} stroke={WOOD_DARK} strokeWidth={0.8} />
        <rect x={3.5} y={19.5} width={2.5} height={3} fill={WOOD_DARK} />
        <rect x={18} y={19.5} width={2.5} height={3} fill={WOOD_DARK} />
      </svg>
    );
  }
  if (type === "bellows") {
    return (
      <svg viewBox="0 0 24 24" className={`engine-part-icon ${className}`} aria-hidden="true">
        {/* side view: two boards hinged at the nozzle, pleated leather between */}
        <path d="M2 8 L15 10.5 L15 13.5 L2 16 Z" fill="#5a3a24" stroke="#3b2414" strokeWidth={0.6} />
        {[5, 8.5, 12].map((x) => (
          <line key={x} x1={x} y1={8.6 + (x - 2) * 0.19} x2={x} y2={15.4 - (x - 2) * 0.19} stroke="#3b2414" strokeWidth={0.6} />
        ))}
        <path d="M1.5 6.5 L15.5 10 L15.5 10.8 L1.5 8.2 Z" fill={WOOD} stroke={WOOD_DARK} strokeWidth={0.5} />
        <path d="M1.5 17.5 L15.5 14 L15.5 13.2 L1.5 15.8 Z" fill={WOOD} stroke={WOOD_DARK} strokeWidth={0.5} />
        <path d="M15 10.5 L22.5 11.4 L22.5 12.6 L15 13.5 Z" fill={IRON} />
        <rect x={0.5} y={5} width={4} height={2} rx={1} fill={WOOD_LIGHT} transform="rotate(14 2.5 6)" />
      </svg>
    );
  }
  if (type === "sfAxle") {
    return (
      <svg viewBox="0 0 24 24" className={`engine-part-icon ${className}`} aria-hidden="true">
        <g transform="rotate(-35 12 12)">
          <rect x={1} y={9.5} width={22} height={5} rx={1} fill={STEEL} stroke={STEEL_DARK} strokeWidth={0.7} />
          <rect x={1} y={10.3} width={22} height={1.1} fill={STEEL_LIGHT} fillOpacity={0.6} />
          <line x1={2.5} y1={13.2} x2={21.5} y2={13.2} stroke={EMBER} strokeWidth={0.6} strokeOpacity={0.8} />
          <rect x={7} y={8.7} width={1.6} height={6.6} rx={0.5} fill={STEEL_DARK} />
          <rect x={15.4} y={8.7} width={1.6} height={6.6} rx={0.5} fill={STEEL_DARK} />
        </g>
      </svg>
    );
  }
  if (type === "sfGearbox") {
    return (
      <svg viewBox="0 0 24 24" className={`engine-part-icon ${className}`} aria-hidden="true">
        <rect x={2.5} y={2.5} width={19} height={19} rx={1.5} fill={STEEL} stroke={STEEL_DARK} strokeWidth={1} />
        {[4.5, 19.5].map((x) =>
          [4.5, 19.5].map((y) => <circle key={`${x}-${y}`} cx={x} cy={y} r={1} fill={STEEL_LIGHT} />)
        )}
        {Array.from({ length: 8 }, (_, k) => (
          <rect key={k} x={11} y={4.8} width={2} height={3} fill={STEEL_LIGHT} transform={`rotate(${k * 45} 12 12)`} />
        ))}
        <circle cx={12} cy={12} r={5} fill={STEEL_LIGHT} stroke={STEEL_DARK} strokeWidth={0.8} />
        <circle cx={12} cy={12} r={5.6} fill="none" stroke={EMBER} strokeWidth={0.5} strokeOpacity={0.7} />
        <circle cx={12} cy={12} r={1.6} fill={STEEL_DARK} />
      </svg>
    );
  }
  if (type === "hibachi") {
    return (
      <svg viewBox="0 0 24 24" className={`engine-part-icon ${className}`} aria-hidden="true">
        {/* an iron bowl on stone feet, coals and a flame */}
        <path d="M12 2.5 C15 6 16 8 14.5 10.5 C16.5 9.5 17 8 17 7 C19 10 18 12.5 16 13 L8 13 C6 12.5 5 10 7 7.5 C7.5 9 8.5 10 9.5 10.3 C8.5 7.5 10.5 5 12 2.5 Z" fill="#ff7a2e" />
        <path d="M12 7 C13.4 9 13.6 10.8 12.6 12.4 L11.2 12.4 C10.4 10.8 10.8 9 12 7 Z" fill="#ffd166" />
        <path d="M3 12.5 H21 L19 17.5 C18.5 18.6 17.6 19 16.5 19 H7.5 C6.4 19 5.5 18.6 5 17.5 Z" fill={IRON} stroke="#1f2937" strokeWidth={0.8} />
        <rect x={6} y={19} width={3} height={3} rx={0.5} fill={STONE} />
        <rect x={15} y={19} width={3} height={3} rx={0.5} fill={STONE} />
      </svg>
    );
  }
  if (type === "detector") {
    return (
      <svg viewBox="0 0 24 24" className={`engine-part-icon ${className}`} aria-hidden="true">
        {/* a stone block with its lens */}
        <rect x={2.5} y={2.5} width={19} height={19} rx={1.5} fill={STONE} stroke={STONE_DARK} strokeWidth={1} />
        <line x1={4.5} y1={8} x2={4.5} y2={11} stroke={STONE_DARK} strokeWidth={0.6} />
        <line x1={17} y1={19.5} x2={20} y2={19.5} stroke={STONE_DARK} strokeWidth={0.6} />
        <circle cx={12} cy={12} r={5.2} fill={STONE_DARK} />
        <circle cx={12} cy={12} r={3.4} fill="#5aa9d6" />
        <circle cx={12} cy={12} r={1.5} fill="#0b1a22" />
        <circle cx={10.9} cy={10.9} r={0.8} fill="#ffffff" />
      </svg>
    );
  }
  if (type === "windmill") {
    return (
      <svg viewBox="0 0 24 24" className={`engine-part-icon ${className}`} aria-hidden="true">
        <path d="M10.5 23 L11.2 13 H12.8 L13.5 23 Z" fill={WOOD} />
        {[45, 135, 225, 315].map((a) => (
          <g key={a} transform={`rotate(${a} 12 11)`}>
            <line x1={12} y1={11} x2={12} y2={1.5} stroke={WOOD_DARK} strokeWidth={1} />
            <rect x={12.3} y={2} width={3.6} height={7} fill={CLOTH} stroke={WOOD_DARK} strokeWidth={0.6} />
          </g>
        ))}
        <circle cx={12} cy={11} r={1.8} fill={WOOD_LIGHT} stroke={WOOD_DARK} strokeWidth={0.6} />
      </svg>
    );
  }
  if (type === "waterWheel") {
    return (
      <svg viewBox="0 0 24 24" className={`engine-part-icon ${className}`} aria-hidden="true">
        <circle cx={12} cy={11} r={8} fill="none" stroke={WOOD} strokeWidth={1.6} />
        {Array.from({ length: 8 }, (_, k) => (
          <g key={k} transform={`rotate(${k * 45} 12 11)`}>
            <line x1={12} y1={11} x2={12} y2={3} stroke={WOOD_DARK} strokeWidth={0.9} />
            <rect x={10.6} y={0.8} width={2.8} height={3.2} fill={WOOD_LIGHT} stroke={WOOD_DARK} strokeWidth={0.5} />
          </g>
        ))}
        <circle cx={12} cy={11} r={2} fill={IRON} />
        <path d="M1 20.5 Q 4 18.5 7 20.5 T 13 20.5 T 19 20.5 T 25 20.5" fill="none" stroke="#5aa9d6" strokeWidth={1.6} />
      </svg>
    );
  }
  return (
    <span className={className} aria-hidden="true">
      {PART_DEFS[type].icon}
    </span>
  );
}

/** Whether a part has drawn grid art (rather than an emoji). */
export function hasPartArt(type: GridPartType): boolean {
  return type === "windmill" || type === "waterWheel";
}

export function PartArt({ type }: { type: GridPartType }) {
  return type === "windmill" ? <WindmillArt /> : type === "waterWheel" ? <WaterWheelArt /> : null;
}
