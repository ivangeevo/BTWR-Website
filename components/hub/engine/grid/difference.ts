// The Difference Engine — Stage 8's meta-build. Twelve fixed 7×7 layouts:
// sources and targets are locked in place, you place conductors (virtual,
// free — only the count matters) to power every target. Medals by parts
// used against par; anything popping costs a medal tier. Each gold is a
// permanent +5% insight/sec (economy.ts). Every layout ships with a
// reference solution that the test suite proves reaches gold.
import type { EnginePowerMechanic } from "../config";
import type { DifferenceResult, EngineGrid, GridPartType, PlacedPart, Rot, Terrain } from "../types";
import { solveGrid } from "./solver";

export type DiffPart = { x: number; y: number; type: GridPartType; rot: Rot };

export type DiffChallenge = {
  id: string;
  name: string;
  blurb: string;
  /** 7 rows of 7: "." ground, "~" water, "#" rock, "C" core. */
  terrain: string[];
  fixed: DiffPart[];
  /** Minimum power each core cell must receive (in cell order). */
  coreMinPU: number;
  /** How many of each placeable part you may use. */
  allowed: Partial<Record<GridPartType, number>>;
  winter?: boolean;
  par: { gold: number; silver: number };
  solution: DiffPart[];
};

export const DIFF_SIZE = 7;

const N: Rot = 0;
const E: Rot = 1;
const S: Rot = 2;
const W: Rot = 3;

const row = (s: string) => s;

export const DIFF_CHALLENGES: DiffChallenge[] = [
  {
    id: "d-straight",
    name: "Straight Shot",
    blurb: "Five squares to the core. Three axles is the limit — you know what comes next.",
    terrain: [row("......."), row("......."), row("......."), row("......C"), row("......."), row("......."), row(".......")],
    fixed: [{ x: 0, y: 3, type: "windmill", rot: E }],
    coreMinPU: 4,
    allowed: { axle: 6, gearbox: 2 },
    par: { gold: 5, silver: 7 },
    solution: [
      { x: 1, y: 3, type: "axle", rot: E },
      { x: 2, y: 3, type: "axle", rot: E },
      { x: 3, y: 3, type: "axle", rot: E },
      { x: 4, y: 3, type: "gearbox", rot: W },
      { x: 5, y: 3, type: "axle", rot: E },
    ],
  },
  {
    id: "d-rock",
    name: "Around the Rock",
    blurb: "The straight line is blocked. Turn two corners.",
    terrain: [row("......."), row("......."), row("......."), row("......."), row(".###..."), row("......C"), row(".......")],
    fixed: [{ x: 0, y: 1, type: "windmill", rot: E }],
    coreMinPU: 4,
    allowed: { axle: 8, gearbox: 3 },
    par: { gold: 9, silver: 11 },
    solution: [
      { x: 1, y: 1, type: "axle", rot: E },
      { x: 2, y: 1, type: "axle", rot: E },
      { x: 3, y: 1, type: "axle", rot: E },
      { x: 4, y: 1, type: "gearbox", rot: W },
      { x: 4, y: 2, type: "axle", rot: N },
      { x: 4, y: 3, type: "axle", rot: N },
      { x: 4, y: 4, type: "axle", rot: N },
      { x: 4, y: 5, type: "gearbox", rot: N },
      { x: 5, y: 5, type: "axle", rot: E },
    ],
  },
  {
    id: "d-two-jobs",
    name: "Two Jobs",
    blurb: "Run the Saw and still get power home.",
    terrain: [row("......."), row("......."), row("......."), row("......C"), row("......."), row("......."), row(".......")],
    fixed: [
      { x: 0, y: 3, type: "windmill", rot: E },
      { x: 2, y: 2, type: "saw", rot: S },
    ],
    coreMinPU: 3,
    allowed: { axle: 6, gearbox: 2 },
    par: { gold: 5, silver: 7 },
    solution: [
      { x: 1, y: 3, type: "axle", rot: E },
      { x: 2, y: 3, type: "gearbox", rot: W },
      { x: 3, y: 3, type: "axle", rot: E },
      { x: 4, y: 3, type: "axle", rot: E },
      { x: 5, y: 3, type: "axle", rot: E },
    ],
  },
  {
    id: "d-river-steel",
    name: "The River Needs Steel",
    blurb: "A water wheel is more than a plain gearbox can hold.",
    terrain: [row("......."), row("......."), row("......."), row("~......"), row("......."), row("...C..."), row(".......")],
    fixed: [{ x: 0, y: 3, type: "waterWheel", rot: E }],
    coreMinPU: 6,
    allowed: { axle: 6, gearbox: 2, sfGearbox: 1 },
    par: { gold: 4, silver: 6 },
    solution: [
      { x: 1, y: 3, type: "axle", rot: E },
      { x: 2, y: 3, type: "axle", rot: E },
      { x: 3, y: 3, type: "sfGearbox", rot: W },
      { x: 3, y: 4, type: "axle", rot: N },
    ],
  },
  {
    id: "d-twin-mills",
    name: "Twin Mills",
    blurb: "Both windmills, one core. Don't let them meet in a gearbox.",
    terrain: [row("......."), row("......."), row("......."), row("...C..."), row("......."), row("......."), row(".......")],
    fixed: [
      { x: 0, y: 1, type: "windmill", rot: E },
      { x: 0, y: 5, type: "windmill", rot: E },
    ],
    coreMinPU: 8,
    allowed: { axle: 8, gearbox: 4 },
    par: { gold: 8, silver: 10 },
    solution: [
      { x: 1, y: 1, type: "axle", rot: E },
      { x: 2, y: 1, type: "axle", rot: E },
      { x: 3, y: 1, type: "gearbox", rot: W },
      { x: 3, y: 2, type: "axle", rot: N },
      { x: 1, y: 5, type: "axle", rot: E },
      { x: 2, y: 5, type: "axle", rot: E },
      { x: 3, y: 5, type: "gearbox", rot: W },
      { x: 3, y: 4, type: "axle", rot: N },
    ],
  },
  {
    id: "d-brownout",
    name: "Brownout",
    blurb: "One windmill, three machines. Exactly enough — if nothing's wasted.",
    terrain: [row("......."), row("......."), row("......."), row("......."), row("......."), row("......."), row(".......")],
    fixed: [
      { x: 0, y: 3, type: "windmill", rot: E },
      { x: 2, y: 2, type: "saw", rot: S },
      { x: 2, y: 4, type: "millstone", rot: N },
      { x: 4, y: 3, type: "bellows", rot: W },
    ],
    coreMinPU: 0,
    allowed: { axle: 4, gearbox: 2 },
    par: { gold: 3, silver: 5 },
    solution: [
      { x: 1, y: 3, type: "axle", rot: E },
      { x: 2, y: 3, type: "gearbox", rot: W },
      { x: 3, y: 3, type: "axle", rot: E },
    ],
  },
  {
    id: "d-long-way",
    name: "The Long Way Round",
    blurb: "Corner to corner. Count your axles.",
    terrain: [row("......."), row("......."), row("......."), row("......."), row("......."), row("......."), row("......C")],
    fixed: [{ x: 0, y: 0, type: "windmill", rot: S }],
    coreMinPU: 4,
    allowed: { axle: 10, gearbox: 4 },
    par: { gold: 11, silver: 13 },
    solution: [
      { x: 0, y: 1, type: "axle", rot: N },
      { x: 0, y: 2, type: "axle", rot: N },
      { x: 0, y: 3, type: "axle", rot: N },
      { x: 0, y: 4, type: "gearbox", rot: N },
      { x: 1, y: 4, type: "axle", rot: E },
      { x: 2, y: 4, type: "axle", rot: E },
      { x: 3, y: 4, type: "axle", rot: E },
      { x: 4, y: 4, type: "gearbox", rot: W },
      { x: 4, y: 5, type: "axle", rot: N },
      { x: 4, y: 6, type: "gearbox", rot: N },
      { x: 5, y: 6, type: "axle", rot: E },
    ],
  },
  {
    id: "d-frozen",
    name: "Frozen Choice",
    blurb: "It's winter. The river's no help today.",
    terrain: [row("......."), row("......."), row("......."), row("~......"), row("......."), row(".....C."), row(".......")],
    fixed: [
      { x: 0, y: 3, type: "waterWheel", rot: E },
      { x: 3, y: 0, type: "windmill", rot: S },
    ],
    coreMinPU: 4,
    allowed: { axle: 6, gearbox: 3 },
    winter: true,
    par: { gold: 6, silver: 8 },
    solution: [
      { x: 3, y: 1, type: "axle", rot: N },
      { x: 3, y: 2, type: "axle", rot: N },
      { x: 3, y: 3, type: "axle", rot: N },
      { x: 3, y: 4, type: "gearbox", rot: N },
      { x: 4, y: 4, type: "axle", rot: E },
      { x: 5, y: 4, type: "gearbox", rot: W },
    ],
  },
  {
    id: "d-soul-reach",
    name: "Soulforged Reach",
    blurb: "No gearboxes allowed. Steel that counts half.",
    terrain: [row("......."), row("......."), row("......."), row("......C"), row("......."), row("......."), row(".......")],
    fixed: [{ x: 0, y: 3, type: "windmill", rot: E }],
    coreMinPU: 4,
    allowed: { axle: 3, sfAxle: 5 },
    par: { gold: 5, silver: 5 },
    solution: [1, 2, 3, 4, 5].map((x) => ({ x, y: 3, type: "sfAxle" as GridPartType, rot: E })),
  },
  {
    id: "d-two-rivers",
    name: "Two Rivers",
    blurb: "Both wheels, into one core — and a plain gearbox won't survive either.",
    terrain: [row("......."), row("~......"), row("......."), row("...C..."), row("......."), row("~......"), row(".......")],
    fixed: [
      { x: 0, y: 1, type: "waterWheel", rot: E },
      { x: 0, y: 5, type: "waterWheel", rot: E },
    ],
    coreMinPU: 12,
    allowed: { axle: 8, gearbox: 2, sfGearbox: 2 },
    par: { gold: 8, silver: 10 },
    solution: [
      { x: 1, y: 1, type: "axle", rot: E },
      { x: 2, y: 1, type: "axle", rot: E },
      { x: 3, y: 1, type: "sfGearbox", rot: W },
      { x: 3, y: 2, type: "axle", rot: N },
      { x: 1, y: 5, type: "axle", rot: E },
      { x: 2, y: 5, type: "axle", rot: E },
      { x: 3, y: 5, type: "sfGearbox", rot: W },
      { x: 3, y: 4, type: "axle", rot: N },
    ],
  },
  {
    id: "d-hibachi",
    name: "Hibachi Heat",
    blurb: "Light the forge first. Whatever's left goes home.",
    terrain: [row("......."), row("......."), row("......."), row(".....C."), row("......."), row("......."), row(".......")],
    fixed: [
      { x: 0, y: 3, type: "windmill", rot: E },
      { x: 2, y: 2, type: "hibachi", rot: S },
    ],
    coreMinPU: 1,
    allowed: { axle: 5, gearbox: 2 },
    par: { gold: 4, silver: 6 },
    solution: [
      { x: 1, y: 3, type: "axle", rot: E },
      { x: 2, y: 3, type: "gearbox", rot: W },
      { x: 3, y: 3, type: "axle", rot: E },
      { x: 4, y: 3, type: "axle", rot: E },
    ],
  },
  {
    id: "d-difference",
    name: "The Difference",
    blurb: "Everything at once: wind and water, saw and stone, and the core in the middle.",
    terrain: [row("......."), row("......."), row("......."), row("...C..."), row("......."), row("......."), row("~......")],
    fixed: [
      { x: 0, y: 0, type: "windmill", rot: E },
      { x: 0, y: 6, type: "waterWheel", rot: E },
      { x: 6, y: 0, type: "saw", rot: W },
      { x: 6, y: 6, type: "millstone", rot: W },
    ],
    coreMinPU: 8,
    allowed: { axle: 12, gearbox: 3, sfGearbox: 1 },
    par: { gold: 15, silver: 18 },
    solution: [
      { x: 1, y: 0, type: "axle", rot: E },
      { x: 2, y: 0, type: "axle", rot: E },
      { x: 3, y: 0, type: "axle", rot: E },
      { x: 4, y: 0, type: "gearbox", rot: W },
      { x: 5, y: 0, type: "axle", rot: E },
      { x: 4, y: 1, type: "axle", rot: N },
      { x: 4, y: 2, type: "axle", rot: N },
      { x: 4, y: 3, type: "gearbox", rot: N },
      { x: 1, y: 6, type: "axle", rot: E },
      { x: 2, y: 6, type: "axle", rot: E },
      { x: 3, y: 6, type: "sfGearbox", rot: W },
      { x: 4, y: 6, type: "axle", rot: E },
      { x: 5, y: 6, type: "axle", rot: E },
      { x: 3, y: 5, type: "axle", rot: N },
      { x: 3, y: 4, type: "axle", rot: N },
    ],
  },
];

export const DIFF_BY_ID: Record<string, DiffChallenge> = Object.fromEntries(DIFF_CHALLENGES.map((c) => [c.id, c]));

export function diffTerrain(c: DiffChallenge): Terrain[] {
  const out: Terrain[] = [];
  for (const r of c.terrain) {
    for (const ch of r) out.push(ch === "~" ? "water" : ch === "#" ? "rock" : ch === "C" ? "core" : "ground");
  }
  return out;
}

export function diffGrid(c: DiffChallenge, placed: DiffPart[]): EngineGrid {
  const cells: (PlacedPart | null)[] = Array.from({ length: DIFF_SIZE * DIFF_SIZE }, () => null);
  c.fixed.forEach((p, i) => (cells[p.y * DIFF_SIZE + p.x] = { uid: `fixed-${i}`, type: p.type, rot: p.rot }));
  placed.forEach((p, i) => {
    const idx = p.y * DIFF_SIZE + p.x;
    if (!cells[idx]) cells[idx] = { uid: `placed-${i}`, type: p.type, rot: p.rot };
  });
  return { w: DIFF_SIZE, h: DIFF_SIZE, cells, clutch: true, rev: 0 };
}

export type DiffScore = { success: boolean; parts: number; pops: number; medal: DifferenceResult["medal"] | null; corePU: number };

export function scoreChallenge(c: DiffChallenge, placed: DiffPart[], power: EnginePowerMechanic): DiffScore {
  const terrain = diffTerrain(c);
  const r = solveGrid(diffGrid(c, placed), terrain, {
    crankActive: false,
    crankBoost: false,
    winter: !!c.winter,
    thawed: false,
    power,
  });
  const fixedTargets = c.fixed.filter((p) => ["saw", "millstone", "detector", "bellows", "hibachi"].includes(p.type));
  const fixedUids = fixedTargets.map((p) => `fixed-${c.fixed.indexOf(p)}`);
  const allPowered = fixedUids.every((uid) => r.powered.includes(uid));
  const coreCells = terrain.map((t, i) => (t === "core" ? i : -1)).filter((i) => i >= 0);
  const coresOk = coreCells.every((i) => (r.coreByCell[i] ?? 0) >= c.coreMinPU);
  const success = allPowered && coresOk;
  const parts = placed.length;
  let medal: DifferenceResult["medal"] | null = null;
  if (success) {
    let tier = parts <= c.par.gold ? 3 : parts <= c.par.silver ? 2 : 1;
    if (r.pops.length > 0) tier = Math.max(1, tier - 1);
    medal = tier === 3 ? "gold" : tier === 2 ? "silver" : "bronze";
  }
  return { success, parts, pops: r.pops.length, medal, corePU: r.corePU };
}

const MEDAL_RANK = { bronze: 1, silver: 2, gold: 3 } as const;

export function betterResult(prev: DifferenceResult | undefined, next: DifferenceResult): DifferenceResult {
  if (!prev) return next;
  if (MEDAL_RANK[next.medal] !== MEDAL_RANK[prev.medal]) return MEDAL_RANK[next.medal] > MEDAL_RANK[prev.medal] ? next : prev;
  return next.parts < prev.parts ? next : prev;
}
