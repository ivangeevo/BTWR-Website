// The Engine's mechanical-power solver — pure and deterministic, so the same
// grid always produces the same result (tests rely on it, and so does the
// Engine re-solving on every load instead of trusting a stored answer).
//
// BTW-faithful rules (see the rework plan):
// - Axles carry power straight through along their axis — only their two
//   thin ends connect. A powered line may run `maxChain` axles (3) from a
//   source or gearbox; the next one POPS. Soulforged axles count half.
// - A gearbox takes power in its one input face (its rotation, drawn yellow)
//   and sends it out the other three, resetting the axle run. Power arriving
//   at an output face of a powered gearbox (two sources meeting) pops it;
//   more than its rated power entering its input pops it too.
// - A windmill or water wheel can turn a gearbox it touches: each carries
//   its own axle at its hub (it costs one to craft).
// - Gearboxes right next to each other don't pass power between them — a
//   gearbox only drives an axle or a machine — so they never pop each other.
// - An axle fed from both ends pops.
// - Machines (attachments/consumers) only accept power on their input face
//   and don't pass it on. They don't draw from it either: reached means
//   powered, and every source's full output still goes to the Engine.
// - The hand crank only turns while held (`crankActive`). It doesn't feed
//   the grid: its power goes straight into the Engine — once, however many
//   cranks there are (one pair of hands) — and it turns any Millstone, Saw
//   or Bellows right next to it, on any side (`handTurned`). A crank right
//   next to another power source (windmill, water wheel, another crank) is
//   overloaded: it breaks the moment it's turned (the Engine provider breaks
//   it; here it just isn't a working source).
// - Windmills (5 squares) and water wheels (3) lie across their axle, and
//   send power out of the hub's two axle faces only — the middle square, in
//   front and behind. The other squares are sails / paddles: they take up
//   room and conduct nothing. A windmill needs every square on ground and
//   nothing else; a water wheel turns with any of its squares on water, and
//   freezes in winter unless thawed (only the Difference Engine's winter
//   puzzle sets winter). A part next to any of their squares is next to them.
// - The Engine's power (`corePU`) is what reaches its ◎ core by axle — each
//   source counted once — plus every hand crank that's turning something
//   (the crank turns the Engine by hand; it never feeds the grid).
//   `supplyPU` is everything the sources make, reaching the core or not.
// Pops are applied all at once per pass, then the grid is re-solved, until
// nothing else pops.
import type { EnginePowerMechanic } from "../config";
import type {
  Dir,
  EngineGrid,
  GridPartType,
  PlacedPart,
  PopInfo,
  SolveSummary,
  SolveWarningCode,
  Terrain,
} from "../types";
import { occupancy } from "./layouts";
import { footprint, isAxle, isGearbox, PART_DEFS } from "./parts";

const DX = [0, 1, 0, -1];
const DY = [-1, 0, 1, 0];

export function opp(d: Dir): Dir {
  return ((d + 2) % 4) as Dir;
}

export type SolveOptions = {
  /** The hand crank is being turned. */
  crankActive: boolean;
  winter?: boolean;
  thawed?: boolean;
  power: EnginePowerMechanic;
  /** Multiplier on windmill/water wheel output (research). */
  sourceMult?: number;
  /** Flat bonus to gearbox ratings (research). */
  gearboxCapBonus?: number;
};

export type SolveResult = SolveSummary & {
  pops: PopInfo[];
  /** Highest axle-run count each axle saw, for the editor's overlay. */
  chainAt: Record<string, number>;
  /** Every part that saw any rotation (sources included), for spin visuals. */
  turning: string[];
  /** Power delivered to each core cell index (Difference Engine only). */
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

/** What a turning hand crank drives, from right next to it. */
const CRANK_TURNS: GridPartType[] = ["millstone", "saw", "bellows"];

function adjacent(i: number, w: number, h: number): number[] {
  return ([0, 1, 2, 3] as Dir[]).map((d) => neighbour(i, d, w, h)).filter((j) => j >= 0);
}

/**
 * Unbroken hand cranks right next to (any square of) another unbroken power
 * source — turning them breaks them.
 */
export function overloadedCranks(cells: (PlacedPart | null)[], w: number, h: number): number[] {
  const out: number[] = [];
  const occ = occupancy(cells, w, h);
  cells.forEach((c, i) => {
    if (c?.type !== "handCrank" || c.broken) return;
    const jammed = adjacent(i, w, h).some((j) => {
      const n = occ[j] >= 0 ? cells[occ[j]] : null;
      return !!n && !n.broken && PART_DEFS[n.type].role === "source";
    });
    if (jammed) out.push(i);
  });
  return out;
}

/** Whether there's an unbroken hand crank on the grid to turn. */
export function crankCanTurn(cells: (PlacedPart | null)[]): boolean {
  return cells.some((c) => c?.type === "handCrank" && !c.broken);
}

/** The unbroken Millstones / Saws / Bellows right next to cell `i`, for a crank there to turn. */
function crankWork(cells: (PlacedPart | null)[], i: number, w: number, h: number): number[] {
  return adjacent(i, w, h).filter((j) => {
    const n = cells[j];
    return !!n && !n.broken && CRANK_TURNS.includes(n.type);
  });
}

export function solveGrid(grid: EngineGrid, terrain: Terrain[], opts: SolveOptions): SolveResult {
  const { w, h } = grid;
  const power = opts.power;
  const cells: (PlacedPart | null)[] = grid.cells.map((c) => (c ? { ...c } : null));
  const sourceMult = opts.sourceMult ?? 1;
  const capBonus = opts.gearboxCapBonus ?? 0;
  const allPops: PopInfo[] = [];
  let passes = 0;

  for (;;) {
    passes += 1;
    const warnings: { uid: string; code: SolveWarningCode }[] = [];
    const warn = (uid: string, code: SolveWarningCode) => {
      if (!warnings.some((x) => x.uid === uid && x.code === code)) warnings.push({ uid, code });
    };

    // 1. Working sources, in cell order.
    const sources: Source[] = [];
    const occ = occupancy(cells, w, h);
    const overloaded = new Set(overloadedCranks(cells, w, h));
    // Turning cranks and the machines right next to each.
    const crankTurns = new Map<number, number[]>();
    if (opts.crankActive) {
      cells.forEach((c, i) => {
        if (c?.type !== "handCrank" || c.broken || overloaded.has(i)) return;
        crankTurns.set(i, crankWork(cells, i, w, h));
      });
    }
    // One pair of hands: the first turning crank carries the crank's power.
    const payingCrank = crankTurns.size > 0 ? Math.min(...crankTurns.keys()) : -1;
    for (let i = 0; i < cells.length; i++) {
      const part = cells[i];
      if (!part || part.broken) continue;
      const role = PART_DEFS[part.type].role;
      if (role !== "source") continue;
      if (part.type === "handCrank") {
        if (overloaded.has(i)) {
          warn(part.uid, "crankJammed");
          continue;
        }
        if (i !== payingCrank) continue;
        sources.push({ index: i, uid: part.uid, type: part.type, pu: power.crankPU, outs: [] });
      } else if (part.type === "windmill") {
        const squares = footprint(part.type, part.rot, i, w, h);
        if (!squares || squares.some((j) => terrain[j] !== "ground" || occ[j] !== i)) {
          warn(part.uid, "obstructed");
          continue;
        }
        sources.push({ index: i, uid: part.uid, type: part.type, pu: power.windmillPU * sourceMult, outs: axisDirs(part.rot) });
      } else if (part.type === "waterWheel") {
        const squares = footprint(part.type, part.rot, i, w, h);
        if (!squares || squares.some((j) => terrain[j] === "rock" || terrain[j] === "core" || occ[j] !== i)) {
          warn(part.uid, "obstructed");
          continue;
        }
        if (!squares.some((j) => terrain[j] === "water")) {
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
    const machineIn = new Set<number>();
    const coreIn = new Map<number, Set<number>>();
    const chainAt: Record<string, number> = {};
    const turning = new Set<string>();
    const popsThisPass = new Map<number, Omit<PopInfo, "uid">>();

    // Every turning crank turns the machines right next to it, even one
    // that adds no power of its own.
    const handIn = new Set<number>();
    for (const [i, work] of crankTurns) {
      turning.add(cells[i]!.uid);
      for (const j of work) {
        machineIn.add(j);
        handIn.add(j);
      }
    }

    sources.forEach((src, s) => {
      turning.add(src.uid);
      if (src.type === "handCrank") return;
      const visited = new Set<string>();
      // `fromGearbox`: this step leaves a gearbox face directly.
      const queue: { to: number; enter: Dir; chain: number; fromGearbox?: boolean }[] = [];
      for (const d of src.outs) {
        const j = neighbour(src.index, d, w, h);
        if (j >= 0) queue.push({ to: j, enter: opp(d), chain: 0 });
      }
      while (queue.length > 0) {
        const { to, enter, chain, fromGearbox } = queue.shift()!;
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
            if (!popsThisPass.has(to)) popsThisPass.set(to, { reason: "chain", run: k });
            continue;
          }
          turning.add(part.uid);
          const out = opp(enter);
          const j = neighbour(to, out, w, h);
          if (j >= 0) queue.push({ to: j, enter, chain: k });
        } else if (isGearbox(part.type)) {
          // Gearboxes side by side don't turn each other: a gearbox only
          // drives an axle or a machine.
          if (fromGearbox) continue;
          if (enter === part.rot) {
            if (!gbIn.has(to)) gbIn.set(to, new Set());
            gbIn.get(to)!.add(s);
            turning.add(part.uid);
            for (let d = 0 as Dir; d < 4; d = (d + 1) as Dir) {
              if (d === part.rot) continue;
              const j = neighbour(to, d, w, h);
              if (j >= 0) queue.push({ to: j, enter: opp(d), chain: 0, fromGearbox: true });
            }
          } else {
            if (!gbBack.has(to)) gbBack.set(to, new Set());
            gbBack.get(to)!.add(s);
          }
        } else if (role === "attachment" || role === "consumer") {
          if (enter === part.rot) {
            machineIn.add(to);
          } else {
            warn(part.uid, "wrongFace");
          }
        }
      }
    });

    // 3. Pops found by the flood.
    for (const [i, dirs] of axleEnters) {
      if (dirs.size >= 2 && !popsThisPass.has(i)) popsThisPass.set(i, { reason: "opposed" });
    }
    for (const [i, back] of gbBack) {
      const part = cells[i]!;
      if (gbIn.has(i) && back.size > 0) {
        if (!popsThisPass.has(i)) popsThisPass.set(i, { reason: "twoSources" });
      } else if (!gbIn.has(i)) {
        warn(part.uid, "backfedUnpowered");
      }
    }
    for (const [i, ins] of gbIn) {
      const part = cells[i]!;
      const cap = (part.type === "sfGearbox" ? power.sfGearboxCap : power.gearboxCap) + capBonus;
      let total = 0;
      for (const s of ins) total += sources[s].pu;
      if (total > cap && !popsThisPass.has(i)) popsThisPass.set(i, { reason: "overload", load: total, cap });
    }

    if (popsThisPass.size > 0 && passes <= w * h + 1) {
      for (const [i, info] of [...popsThisPass].sort((a, b) => a[0] - b[0])) {
        const part = cells[i]!;
        cells[i] = { ...part, broken: true };
        allPops.push({ uid: part.uid, ...info });
      }
      continue;
    }

    // 4. Every machine power reached runs (in cell order); nothing is drawn
    // off, so each source's full output counts at any core it reaches.
    const powered: string[] = [];
    const handTurned: string[] = [];
    let grinding = 0;
    for (const i of [...machineIn].sort((a, b) => a - b)) {
      const part = cells[i]!;
      powered.push(part.uid);
      turning.add(part.uid);
      if (handIn.has(i)) handTurned.push(part.uid);
      if (part.type === "millstone") grinding += 1;
    }
    const coreByCell: Record<number, number> = {};
    const counted = new Set<number>();
    let corePU = 0;
    for (const [cell, srcs] of [...coreIn.entries()].sort((a, b) => a[0] - b[0])) {
      let got = 0;
      for (const s of [...srcs].sort((a, b) => a - b)) {
        if (counted.has(s)) continue;
        counted.add(s);
        got += sources[s].pu;
      }
      coreByCell[cell] = got;
      corePU += got;
    }
    // The crank's power goes straight into the Engine.
    sources.forEach((src, s) => {
      if (src.type === "handCrank") {
        counted.add(s);
        corePU += src.pu;
      }
    });

    const broken = cells.filter((c): c is PlacedPart => !!c && !!c.broken).map((c) => c.uid);
    return {
      corePU,
      supplyPU: sources.reduce((a, s) => a + s.pu, 0),
      powered,
      handTurned,
      grinding,
      broken,
      warnings,
      sources: sources.map((src, s) => ({ uid: src.uid, type: src.type, pu: src.pu, toCore: counted.has(s) })),
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
    handTurned: r.handTurned,
    grinding: r.grinding,
    broken: r.broken,
    warnings: r.warnings,
    sources: r.sources,
  };
}
