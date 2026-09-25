// Engaging the clutch: solve the grid at its most demanding (cranking fed,
// so every source runs at full tilt) to find what pops, apply the pops, then
// cache three summaries for the economy — steady power only, cranking, and
// cranking fed. Pure; the Engine provider stores the result.
import type { ResearchEffects } from "../catalog/research";
import type { EngineConfig } from "../config";
import type { EngineEnv, EngineState, PlacedPart, PopReason } from "../types";
import { layoutFor } from "./layouts";
import { solveGrid, summarize, type SolveOptions } from "./solver";

export type EngageResult = {
  grid: EngineState["grid"];
  solved: NonNullable<EngineState["solved"]>;
  pops: { uid: string; reason: PopReason; type: PlacedPart["type"] }[];
  /** Parts handed back to the inventory (the one-time first-pop refund). */
  refunded: PlacedPart["type"][];
};

export function solveOptions(e: EngineState, env: EngineEnv, cfg: EngineConfig, fx: ResearchEffects) {
  const base: Omit<SolveOptions, "crankActive" | "crankBoost"> = {
    winter: env.winter,
    thawed: fx.thawed,
    power: cfg.power,
    forgeDrawMult: e.specialization === "soulforger" ? 0.5 : 1,
    sourceMult: fx.sourceMult,
    gearboxCapBonus: fx.gearboxCapBonus,
  };
  return base;
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
  const worst = solveGrid(e.grid, layout.terrain, { ...base, crankActive: true, crankBoost: true });
  const byUid = new Map(e.grid.cells.filter(Boolean).map((c) => [c!.uid, c!]));
  const pops = worst.pops.map((p) => ({ ...p, type: byUid.get(p.uid)!.type }));
  let cells = worst.cells;
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
  const idle = solveGrid(grid, layout.terrain, { ...base, crankActive: false, crankBoost: false });
  const cranked = solveGrid(grid, layout.terrain, { ...base, crankActive: true, crankBoost: false });
  const boosted = solveGrid(grid, layout.terrain, { ...base, crankActive: true, crankBoost: true });
  return {
    grid,
    solved: { idle: summarize(idle), cranked: summarize(cranked), boosted: summarize(boosted), rev: grid.rev },
    pops,
    refunded,
  };
}
