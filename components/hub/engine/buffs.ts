// What the Engine gives back to the rest of the Outpost. Machines only count
// here when grid power (a windmill or water wheel line) keeps them turning —
// the STEADY (idle) solve, never the crank — so a per-run bonus can't flicker
// on and off mid-hold. Each powered copy stacks. What the crank turns by
// hand yields directly instead (see crankRev in EngineProvider).
import type { ResearchEffects } from "./catalog/research";
import type { EngineConfig } from "./config";
import type { EngineState, GridPartType } from "./types";

export type EngineBuffs = {
  sawPowered: boolean;
  detectorPowered: boolean;
  millPowered: boolean;
  bellowsPowered: boolean;
  hibachiLit: boolean;
  /** Extra wood per Wood Gathering (all powered Saws). */
  sawWood: number;
  /** Multiplier on how long a Wood Gathering run takes (< 1 = faster). */
  sawHoldMult: number;
  /** Extra stone per Mining run (all powered Millstones). */
  millStone: number;
  /** Extra of each ore found per Mining run (all powered Bellows). */
  bellowsOre: number;
  detectorMaxCharges: number;
};

export const NO_BUFFS: EngineBuffs = {
  sawPowered: false,
  detectorPowered: false,
  millPowered: false,
  bellowsPowered: false,
  hibachiLit: false,
  sawWood: 0,
  sawHoldMult: 1,
  millStone: 0,
  bellowsOre: 0,
  detectorMaxCharges: 0,
};

/** How many unbroken parts of each type the steady (idle) solve powers. */
export function poweredPartCounts(e: EngineState): Map<GridPartType, number> {
  const out = new Map<GridPartType, number>();
  if (!e.grid.clutch || !e.solved) return out;
  const byUid = new Map<string, GridPartType>();
  for (const c of e.grid.cells) if (c && !c.broken) byUid.set(c.uid, c.type);
  for (const uid of e.solved.idle.powered) {
    const t = byUid.get(uid);
    if (t) out.set(t, (out.get(t) ?? 0) + 1);
  }
  return out;
}

export function poweredPartTypes(e: EngineState): Set<GridPartType> {
  return new Set(poweredPartCounts(e).keys());
}

export function computeBuffs(e: EngineState, cfg: EngineConfig, fx: ResearchEffects): EngineBuffs {
  const counts = poweredPartCounts(e);
  if (counts.size === 0) return NO_BUFFS;
  const b = cfg.buffs;
  const home = e.specialization === "homesteader" ? 1 + b.homesteaderAttachPct / 100 : 1;
  const saws = counts.get("saw") ?? 0;
  const mills = counts.get("millstone") ?? 0;
  const bellows = counts.get("bellows") ?? 0;
  return {
    sawPowered: saws > 0,
    detectorPowered: counts.has("detector"),
    millPowered: mills > 0,
    bellowsPowered: bellows > 0,
    hibachiLit: counts.has("hibachi"),
    sawWood: Math.round(saws * b.sawWood * fx.sawMult * home),
    sawHoldMult: saws > 0 ? Math.max(0.1, 1 - (b.sawHoldPct / 100) * fx.sawMult * home) : 1,
    millStone: Math.round(mills * b.millstoneStone * fx.millMult * home),
    bellowsOre: Math.round(bellows * b.bellowsOre * fx.bellowsMult * home),
    detectorMaxCharges: counts.has("detector") ? b.detectorMaxCharges + fx.detectorChargeBonus : 0,
  };
}

/** Detector charges refill over time while it's powered. Returns the updated slice. */
export function accrueDetector(
  e: EngineState,
  cfg: EngineConfig,
  fx: ResearchEffects,
  buffs: EngineBuffs,
  now: number
): EngineState["detector"] {
  const max = buffs.detectorMaxCharges;
  if (max <= 0) return { charges: Math.min(e.detector.charges, 0), chargedAt: null };
  const periodMs = cfg.buffs.detectorRechargeMin * 60_000 * fx.detectorRechargeMult;
  if (e.detector.charges >= max) return { charges: max, chargedAt: new Date(now).toISOString() };
  const since = e.detector.chargedAt ? new Date(e.detector.chargedAt).getTime() : now;
  const gained = Math.floor((now - since) / periodMs);
  if (!e.detector.chargedAt) return { charges: e.detector.charges, chargedAt: new Date(now).toISOString() };
  if (gained <= 0) return e.detector;
  const charges = Math.min(max, e.detector.charges + gained);
  const chargedAt = charges >= max ? new Date(now).toISOString() : new Date(since + gained * periodMs).toISOString();
  return { charges, chargedAt };
}
