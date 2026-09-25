// The Engine's mechanical-power solver — pure and deterministic, so the same
// grid always produces the same result (tests rely on it, and so does the
// Engine re-solving on every load instead of trusting a stored answer).
//
// BTW-faithful rules (see the rework plan):
// - Axles carry power straight through along their axis. A powered line may
//   run `maxChain` axles (3) from a source or gearbox; the next one POPS.
//   Soulforged axles count half.
// - A gearbox takes power in its one input face (its rotation) and sends it
//   out the other three, resetting the axle run. Power arriving at an output
//   face of a powered gearbox (two sources meeting) pops it; more than its
//   rated power entering its input pops it too.
// - An axle fed from both ends pops.
// - Attachments/consumers only accept power on their input face and don't
//   pass it on. The hand crank only works pointed into a gearbox's input.
// - Windmills need every neighbouring cell clear except their two axis ends;
//   water wheels must sit on water and freeze in winter unless thawed
//   (only the Difference Engine's winter puzzle sets winter).
// Pops are applied all at once per pass, then the grid is re-solved, until
// nothing else pops.
import type { EnginePowerMechanic } from "../config";
import type {
  Dir,
  EngineGrid,
  GridPartType,
  PlacedPart,
  PopReason,
  SolveSummary,
  SolveWarningCode,
  Terrain,
} from "../types";
import { isAxle, isGearbox, PART_DEFS } from "./parts";

const DX = [0, 1, 0, -1];
const DY = [-1, 0, 1, 0];

export function opp(d: Dir): Dir {
  return ((d + 2) % 4) as Dir;
}

export type SolveOptions = {
  crankActive: boolean;
  crankBoost: boolean;
  winter?: boolean;
  thawed?: boolean;
  power: EnginePowerMechanic;
  /** Multiplier on Bellows/Hibachi draw (Soulforger specialization). */
  forgeDrawMult?: number;
  /** Multiplier on windmill/water wheel output (research). */
  sourceMult?: number;
  /** Flat bonus to gearbox ratings (research). */
  gearboxCapBonus?: number;
};

export type SolveResult = SolveSummary & {
  pops: { uid: string; reason: PopReason }[];
  /** Highest axle-run count each axle saw, for the editor's overlay. */
  chainAt: Record<string, number>;
  /** Every part that saw any rotation (sources included), for spin visuals. */
  turning: string[];
  /** Power delivered to each core cell index. */
  coreByCell: Record<number, number>;
  /** The grid's cells after pops were applied. */
  cells: (PlacedPart | null)[];
  passes: number;
};

type Source = { index: number; uid: string; type: GridPartType; pu: number; outs: Dir[] };

function neighbour(i: number, d: Dir, w: number, h: number): number {
  const x = (i % w) + DX[d];
  const y = Math.floor(i / w) + DY[d];
  if (x < 0 || y < 0 || x >= w || y >= h) return -1;
  return y * w + x;
}

function axisDirs(rot: number): Dir[] {
  return rot % 2 === 0 ? [0, 2] : [1, 3];
}

export function drawOf(type: GridPartType, power: EnginePowerMechanic, forgeDrawMult = 1): number {
  switch (type) {
    case "saw":
      return power.drawSaw;
    case "millstone":
      return power.drawMillstone;
    case "detector":
      return power.drawDetector;
    case "bellows":
      return power.drawBellows * forgeDrawMult;
    case "hibachi":
      return power.drawHibachi * forgeDrawMult;
    default:
      return 0;
  }
}

export function solveGrid(grid: EngineGrid, terrain: Terrain[], opts: SolveOptions): SolveResult {
  const { w, h } = grid;
  const power = opts.power;
  const cells: (PlacedPart | null)[] = grid.cells.map((c) => (c ? { ...c } : null));
  const sourceMult = opts.sourceMult ?? 1;
  const capBonus = opts.gearboxCapBonus ?? 0;
  const allPops: { uid: string; reason: PopReason }[] = [];
  let passes = 0;

  for (;;) {
    passes += 1;
    const warnings: { uid: string; code: SolveWarningCode }[] = [];
    const warn = (uid: string, code: SolveWarningCode) => {
      if (!warnings.some((x) => x.uid === uid && x.code === code)) warnings.push({ uid, code });
    };

    // 1. Working sources, in cell order.
    const sources: Source[] = [];
    for (let i = 0; i < cells.length; i++) {
      const part = cells[i];
      if (!part || part.broken) continue;
      const role = PART_DEFS[part.type].role;
      if (role !== "source") continue;
      if (part.type === "handCrank") {
        if (!opts.crankActive) continue;
        const target = neighbour(i, part.rot as Dir, w, h);
        const tp = target >= 0 ? cells[target] : null;
        if (!tp || tp.broken || !isGearbox(tp.type) || tp.rot !== opp(part.rot as Dir)) {
          warn(part.uid, "crankNeedsGearbox");
          continue;
        }
        sources.push({
          index: i,
          uid: part.uid,
          type: part.type,
          pu: opts.crankBoost ? power.crankBoostPU : power.crankPU,
          outs: [part.rot as Dir],
        });
      } else if (part.type === "windmill") {
        if (terrain[i] !== "ground") {
          warn(part.uid, "obstructed");
          continue;
        }
        const axis = axisDirs(part.rot);
        let clear = true;
        const x0 = i % w;
        const y0 = Math.floor(i / w);
        for (let dy = -1; dy <= 1 && clear; dy++) {
          for (let dx = -1; dx <= 1; dx++) {
            if (dx === 0 && dy === 0) continue;
            const x = x0 + dx;
            const y = y0 + dy;
            if (x < 0 || y < 0 || x >= w || y >= h) continue;
            const isAxisCell = axis.some((d) => DX[d] === dx && DY[d] === dy);
            if (isAxisCell) continue;
            const j = y * w + x;
            if (cells[j] || terrain[j] === "core" || terrain[j] === "rock") {
              clear = false;
              break;
            }
          }
        }
        if (!clear) {
          warn(part.uid, "obstructed");
          continue;
        }
        sources.push({ index: i, uid: part.uid, type: part.type, pu: power.windmillPU * sourceMult, outs: axis });
      } else if (part.type === "waterWheel") {
        if (terrain[i] !== "water") {
          warn(part.uid, "notWater");
          continue;
        }
        if (opts.winter && !opts.thawed) {
          warn(part.uid, "frozen");
          continue;
        }
        sources.push({
          index: i,
          uid: part.uid,
          type: part.type,
          pu: power.waterWheelPU * sourceMult,
          outs: axisDirs(part.rot),
        });
      }
    }

    // 2. Flood power out of each source.
    const axleEnters = new Map<number, Set<Dir>>();
    const gbIn = new Map<number, Set<number>>();
    const gbBack = new Map<number, Set<number>>();
    const consumerIn = new Map<number, { src: number; depth: number }[]>();
    const coreIn = new Map<number, Set<number>>();
    const chainAt: Record<string, number> = {};
    const turning = new Set<string>();
    const popsThisPass = new Map<number, PopReason>();

    sources.forEach((src, s) => {
      turning.add(src.uid);
      const visited = new Set<string>();
      const queue: { to: number; enter: Dir; chain: number; depth: number }[] = [];
      for (const d of src.outs) {
        const j = neighbour(src.index, d, w, h);
        if (j >= 0) queue.push({ to: j, enter: opp(d), chain: 0, depth: 1 });
      }
      while (queue.length > 0) {
        const { to, enter, chain, depth } = queue.shift()!;
        const key = `${to}:${enter}`;
        if (visited.has(key)) continue;
        visited.add(key);
        if (terrain[to] === "core") {
          if (!coreIn.has(to)) coreIn.set(to, new Set());
          coreIn.get(to)!.add(s);
          continue;
        }
        const part = cells[to];
        if (!part || part.broken) continue;
        const role = PART_DEFS[part.type].role;
        if (isAxle(part.type)) {
          if (enter % 2 !== part.rot % 2) continue;
          const k = chain + (part.type === "sfAxle" ? 0.5 : 1);
          if (!axleEnters.has(to)) axleEnters.set(to, new Set());
          axleEnters.get(to)!.add(enter);
          chainAt[part.uid] = Math.max(chainAt[part.uid] ?? 0, k);
          if (k > power.maxChain) {
            if (!popsThisPass.has(to)) popsThisPass.set(to, "chain");
            continue;
          }
          turning.add(part.uid);
          const out = opp(enter);
          const j = neighbour(to, out, w, h);
          if (j >= 0) queue.push({ to: j, enter, chain: k, depth: depth + 1 });
        } else if (isGearbox(part.type)) {
          if (enter === part.rot) {
            if (!gbIn.has(to)) gbIn.set(to, new Set());
            gbIn.get(to)!.add(s);
            turning.add(part.uid);
            for (let d = 0 as Dir; d < 4; d = (d + 1) as Dir) {
              if (d === part.rot) continue;
              const j = neighbour(to, d, w, h);
              if (j >= 0) queue.push({ to: j, enter: opp(d), chain: 0, depth: depth + 1 });
            }
          } else {
            if (!gbBack.has(to)) gbBack.set(to, new Set());
            gbBack.get(to)!.add(s);
          }
        } else if (role === "attachment" || role === "consumer") {
          if (enter === part.rot) {
            if (!consumerIn.has(to)) consumerIn.set(to, []);
            consumerIn.get(to)!.push({ src: s, depth });
          } else {
            warn(part.uid, "wrongFace");
          }
        }
      }
    });

    // 3. Pops found by the flood.
    for (const [i, dirs] of axleEnters) {
      if (dirs.size >= 2 && !popsThisPass.has(i)) popsThisPass.set(i, "opposed");
    }
    for (const [i, back] of gbBack) {
      const part = cells[i]!;
      if (gbIn.has(i) && back.size > 0) {
        if (!popsThisPass.has(i)) popsThisPass.set(i, "twoSources");
      } else if (!gbIn.has(i)) {
        warn(part.uid, "backfedUnpowered");
      }
    }
    for (const [i, ins] of gbIn) {
      const part = cells[i]!;
      const cap = (part.type === "sfGearbox" ? power.sfGearboxCap : power.gearboxCap) + capBonus;
      let total = 0;
      for (const s of ins) total += sources[s].pu;
      if (total > cap && !popsThisPass.has(i)) popsThisPass.set(i, "overload");
    }

    if (popsThisPass.size > 0 && passes <= w * h + 1) {
      for (const [i, reason] of [...popsThisPass].sort((a, b) => a[0] - b[0])) {
        const part = cells[i]!;
        cells[i] = { ...part, broken: true };
        allPops.push({ uid: part.uid, reason });
      }
      continue;
    }

    // 4. Allocate each source's power: attachments/consumers first (closest
    // first, then cell order), whatever's left reaches the core.
    const remaining = sources.map((s) => s.pu);
    const powered: string[] = [];
    const consumers = [...consumerIn.entries()]
      .map(([i, list]) => ({
        i,
        list: [...list].sort((a, b) => a.depth - b.depth || a.src - b.src),
        minDepth: Math.min(...list.map((x) => x.depth)),
      }))
      .sort((a, b) => a.minDepth - b.minDepth || a.i - b.i);
    for (const c of consumers) {
      const part = cells[c.i]!;
      const draw = drawOf(part.type, power, opts.forgeDrawMult);
      const donor = c.list.find((x) => remaining[x.src] >= draw);
      if (donor) {
        remaining[donor.src] -= draw;
        powered.push(part.uid);
        turning.add(part.uid);
      } else {
        warn(part.uid, "brownout");
      }
    }
    const coreByCell: Record<number, number> = {};
    const counted = new Set<number>();
    let corePU = 0;
    for (const [cell, srcs] of [...coreIn.entries()].sort((a, b) => a[0] - b[0])) {
      let got = 0;
      for (const s of [...srcs].sort((a, b) => a - b)) {
        if (counted.has(s)) continue;
        counted.add(s);
        got += remaining[s];
      }
      coreByCell[cell] = got;
      corePU += got;
    }

    const broken = cells.filter((c): c is PlacedPart => !!c && !!c.broken).map((c) => c.uid);
    return {
      corePU,
      supplyPU: sources.reduce((a, s) => a + s.pu, 0),
      powered,
      broken,
      warnings,
      sources: sources.map((s) => ({ uid: s.uid, type: s.type, pu: s.pu })),
      pops: allPops,
      chainAt,
      turning: [...turning],
      coreByCell,
      cells,
      passes,
    };
  }
}

export function summarize(r: SolveResult): SolveSummary {
  return {
    corePU: r.corePU,
    supplyPU: r.supplyPU,
    powered: r.powered,
    broken: r.broken,
    warnings: r.warnings,
    sources: r.sources,
  };
}
