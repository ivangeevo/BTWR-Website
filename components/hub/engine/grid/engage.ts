// Engaging the clutch: solve the grid at its busiest (crank turning) to find
// what pops, apply the pops, then cache two summaries for the economy —
// steady (crank still) and while the crank turns. Pure; the Engine provider
// stores the result.
import type { ResearchEffects } from "../catalog/research";
import type { EngineConfig } from "../config";
import type { EngineEnv, EngineState, PlacedPart, PopInfo } from "../types";
import { layoutFor } from "./layouts";
import { overloadedCranks, solveGrid, summarize, type SolveOptions } from "./solver";

export type EngageResult = {
  grid: EngineState["grid"];
  solved: NonNullable<EngineState["solved"]>;
  pops: (PopInfo & { type: PlacedPart["type"] })[];
  /** Parts handed back to the inventory (the one-time first-pop refund). */
  refunded: PlacedPart["type"][];
};

export function solveOptions(e: EngineState, env: EngineEnv, cfg: EngineConfig, fx: ResearchEffects): Omit<SolveOptions, "crankActive"> {
  return {
    power: cfg.power,
    sourceMult: fx.sourceMult,
    gearboxCapBonus: fx.gearboxCapBonus,
  };
}

export function engageGrid(
  e: EngineState,
  env: EngineEnv,
  cfg: EngineConfig,
  fx: ResearchEffects,
  opts: { refundFirstPop: boolean }
): EngageResult | null {
  const layout = layoutFor(e.stage);
  if (!layout) return null;
  const base = solveOptions(e, env, cfg, fx);
  const first = solveGrid(e.grid, layout.terrain, { ...base, crankActive: true });
  const byUid = new Map(e.grid.cells.filter(Boolean).map((c) => [c!.uid, c!]));
  const pops = first.pops.map((p) => ({ ...p, type: byUid.get(p.uid)!.type }));
  let cells = first.cells;
  const refunded: PlacedPart["type"][] = [];
  if (opts.refundFirstPop && pops.length > 0) {
    // The Engine's first ever pop is a lesson, not a loss: the popped parts
    // come back off the grid, unbroken.
    const popped = new Set(pops.map((p) => p.uid));
    cells = cells.map((c) => {
      if (c && popped.has(c.uid)) {
        refunded.push(c.type);
        return null;
      }
      return c;
    });
  }
  const grid = { ...e.grid, cells, clutch: true };
  return { grid, solved: summarizeEngaged(grid, layout.terrain, base), pops, refunded };
}

function summarizeEngaged(
  grid: EngineState["grid"],
  terrain: Parameters<typeof solveGrid>[1],
  base: Omit<SolveOptions, "crankActive">
): NonNullable<EngineState["solved"]> {
  const idle = solveGrid(grid, terrain, { ...base, crankActive: false });
  const cranked = solveGrid(grid, terrain, { ...base, crankActive: true });
  return { idle: summarize(idle), cranked: summarize(cranked), rev: grid.rev };
}

/**
 * Turning the crank breaks every overloaded crank (right next to another
 * power source). Returns the grid with them broken and, if the clutch is
 * in, a fresh cached solve — or null when nothing was overloaded.
 */
export function breakOverloadedCranks(
  e: EngineState,
  env: EngineEnv,
  cfg: EngineConfig,
  fx: ResearchEffects
): { grid: EngineState["grid"]; solved: EngineState["solved"]; broken: number } | null {
  const layout = layoutFor(e.stage);
  if (!layout) return null;
  const hit = overloadedCranks(e.grid.cells, e.grid.w, e.grid.h);
  if (hit.length === 0) return null;
  const cells = e.grid.cells.map((c, i) => (c && hit.includes(i) ? { ...c, broken: true } : c));
  const grid = { ...e.grid, cells, rev: e.grid.rev + 1 };
  const solved = grid.clutch ? summarizeEngaged(grid, layout.terrain, solveOptions(e, env, cfg, fx)) : null;
  return { grid, solved, broken: hit.length };
}
