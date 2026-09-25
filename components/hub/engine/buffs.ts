// What the Engine gives back to the rest of the Outpost. Only the STEADY
// (idle) solve counts — never the crank — so a buff can't flicker on and off
// mid-hold, and the Campfire's decay math only changes on an engage.
import type { ResearchEffects } from "./catalog/research";
import type { EngineConfig } from "./config";
import type { EngineState, GridPartType } from "./types";

export type EngineBuffs = {
  sawPowered: boolean;
  millstonePowered: boolean;
  detectorPowered: boolean;
  bellowsPowered: boolean;
  hibachiLit: boolean;
  /** Extra wood per Wood Chopping. */
  sawWood: number;
  /** Multiplier on the Wood Chopping hold duration (< 1 = faster). */
  sawHoldMult: number;
  millstoneFood: number;
  millstoneCook: number;
  /** Multiplier on the Campfire's decayMinutes (> 1 = slower decay). */
  bellowsDecayMult: number;
  detectorMaxCharges: number;
};

export const NO_BUFFS: EngineBuffs = {
  sawPowered: false,
  millstonePowered: false,
  detectorPowered: false,
  bellowsPowered: false,
  hibachiLit: false,
  sawWood: 0,
  sawHoldMult: 1,
  millstoneFood: 0,
  millstoneCook: 0,
  bellowsDecayMult: 1,
  detectorMaxCharges: 0,
};

export function poweredPartTypes(e: EngineState): Set<GridPartType> {
  const out = new Set<GridPartType>();
  if (!e.grid.clutch || !e.solved) return out;
  const byUid = new Map<string, GridPartType>();
  for (const c of e.grid.cells) if (c && !c.broken) byUid.set(c.uid, c.type);
  for (const uid of e.solved.idle.powered) {
    const t = byUid.get(uid);
    if (t) out.add(t);
  }
  return out;
}

export function computeBuffs(e: EngineState, cfg: EngineConfig, fx: ResearchEffects): EngineBuffs {
  const types = poweredPartTypes(e);
  if (types.size === 0) return NO_BUFFS;
  const b = cfg.buffs;
  const home = e.specialization === "homesteader" ? 1 + b.homesteaderAttachPct / 100 : 1;
  const saw = types.has("saw");
  const mill = types.has("millstone");
  const bellows = types.has("bellows");
  return {
    sawPowered: saw,
    millstonePowered: mill,
    detectorPowered: types.has("detector"),
    bellowsPowered: bellows,
    hibachiLit: types.has("hibachi"),
    sawWood: saw ? Math.round(b.sawWood * fx.sawMult * home) : 0,
    sawHoldMult: saw ? Math.max(0.1, 1 - (b.sawHoldPct / 100) * fx.sawMult * home) : 1,
    millstoneFood: mill ? Math.round(b.millstoneFood * fx.millMult * home) : 0,
    millstoneCook: mill ? Math.round(b.millstoneCook * fx.millMult * home) : 0,
    bellowsDecayMult: bellows ? b.bellowsDecayMult * fx.bellowsMult : 1,
    detectorMaxCharges: types.has("detector") ? b.detectorMaxCharges + fx.detectorChargeBonus : 0,
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
