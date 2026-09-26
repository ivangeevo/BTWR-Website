// The Engine's clicker economy — every number that turns into insight goes
// through here. Pure functions of (state, config, research effects, time),
// so settle() can integrate any stretch of time exactly (piecewise-constant
// rate between breakpoints) instead of counting ticks, and tests can check
// it against a brute-force 1-second integration.
import type { ComponentDef } from "./catalog/components";
import type { ResearchEffects } from "./catalog/research";
import type { EngineConfig } from "./config";
import type { ComponentId, EngineStage, EngineState } from "./types";

/** Flat reward floor per stage (index = stage), so early solves matter before insight/sec exists. */
export const STAGE_FLAT = [0, 2, 3, 5, 20, 100, 1_000, 10_000, 100_000];

/** Ledger Drum: hours of offline insight kept, per level. */
export const DRUM_HOURS = [1, 2, 4, 8, 12, 24, 48];
/** Cost to reach each level (index = level). */
export const DRUM_COSTS = [0, 500, 5_000, 100_000, 5_000_000, 500_000_000, 50_000_000_000];

const SOULFORGER_LATE: ComponentId[] = ["kiln", "soulUrn", "enchanter"];

export function markDiscount(mark: number, cfg: EngineConfig): number {
  return Math.max(0.6, 1 - cfg.economy.markDiscountStep * Math.max(0, mark - 1));
}

export function componentCost(def: ComponentDef, owned: number, mark: number, cfg: EngineConfig): number {
  return Math.ceil(def.baseCost * Math.pow(cfg.economy.costGrowth, owned) * markDiscount(mark, cfg));
}

export function bulkCost(def: ComponentDef, owned: number, k: number, mark: number, cfg: EngineConfig): number {
  let total = 0;
  for (let i = 0; i < k; i++) total += componentCost(def, owned + i, mark, cfg);
  return total;
}

export function maxAffordable(def: ComponentDef, owned: number, insight: number, mark: number, cfg: EngineConfig): number {
  let k = 0;
  let spent = 0;
  for (;;) {
    const next = componentCost(def, owned + k, mark, cfg);
    if (spent + next > insight || k >= 10_000) return k;
    spent += next;
    k += 1;
  }
}

function ms(iso: string | null | undefined): number {
  return iso ? new Date(iso).getTime() : 0;
}

export function crankActiveAt(e: EngineState, at: number): boolean {
  return ms(e.crankActiveUntil) > at;
}

/** Whether the hand crank is fed (it turns faster) at time `at`. */
export function crankBoostAt(e: EngineState, at: number): boolean {
  return ms(e.crankBoostUntil) > at;
}

/** The engaged grid solve in effect at `at`: with the crank turning, or steady (offline = crank still). */
function activeSolve(e: EngineState, at: number, offline: boolean) {
  if (e.stage < 4 || !e.solved || !e.grid.clutch) return null;
  return !offline && crankActiveAt(e, at) ? e.solved.cranked : e.solved.idle;
}

/**
 * The Engine's power: what its sources get to the ◎ core, plus a turning
 * hand crank. Only the body makes power, so before Stage 4 there is none.
 */
export function enginePUAt(e: EngineState, at: number, offline = false): number {
  return activeSolve(e, at, offline)?.corePU ?? 0;
}

export function neglectMult(e: EngineState, cfg: EngineConfig, at: number): number {
  const hours = (at - ms(e.lastInteractAt)) / 3_600_000;
  const o = cfg.offline;
  let m = 1;
  if (e.specialization === "hardcore") {
    if (hours >= o.hardcoreHours2) m = o.hardcoreMult2;
    else if (hours >= o.hardcoreHours1) m = o.hardcoreMult1;
  } else {
    if (hours >= o.neglectHours2) m = o.neglectMult2;
    else if (hours >= o.neglectHours1) m = o.neglectMult1;
  }
  if (e.specialization === "homesteader") m = Math.max(m, o.homesteaderFloor);
  return m;
}

/** 0-3, for the dusty visuals. */
export function dustLevel(e: EngineState, cfg: EngineConfig, at: number): number {
  const hours = (at - ms(e.lastInteractAt)) / 3_600_000;
  const o = cfg.offline;
  const [h1, h2] = e.specialization === "hardcore" ? [o.hardcoreHours1, o.hardcoreHours2] : [o.neglectHours1, o.neglectHours2];
  if (hours >= h2 * 2) return 3;
  if (hours >= h2) return 2;
  if (hours >= h1) return 1;
  return 0;
}

export type IpsBreakdown = {
  base: number;
  requiredPU: number;
  /** The Engine's power (what reaches the core, plus the crank). */
  enginePU: number;
  powerFactor: number;
  mult: number;
  ips: number;
};

export function computeIps(
  e: EngineState,
  cfg: EngineConfig,
  fx: ResearchEffects,
  at: number,
  opts: { offline?: boolean } = {}
): IpsBreakdown {
  let base = 0;
  let requiredPU = 0;
  for (const def of cfg.components) {
    const count = e.components[def.id] ?? 0;
    if (count <= 0) continue;
    const specBoost = e.specialization === "soulforger" && SOULFORGER_LATE.includes(def.id) ? 1.5 : 1;
    base += count * def.rate * fx.compMult[def.id] * specBoost;
    requiredPU += def.draw;
  }
  const enginePU = enginePUAt(e, at, opts.offline);
  // Before the body exists there's nothing to power the components with,
  // so they aren't held back by power at all.
  const ratio = e.stage < 4 || requiredPU === 0 ? 1 : Math.min(1, enginePU / requiredPU);
  const floor = cfg.economy.powerFloor;
  const powerFactor = floor + (1 - floor) * ratio;
  const golds = Object.values(e.difference).filter((d) => d.medal === "gold").length;
  const frenzy = !opts.offline && e.frenzy && ms(e.frenzy.until) > at ? e.frenzy.mult : 1;
  const mult =
    (1 + fx.globalPct + fx.lorePct * e.loreRevealedRank) *
    (1 + cfg.economy.markBonus * Math.max(0, e.mark - 1)) *
    (e.specialization === "hardcore" ? cfg.economy.hardcoreIpsMult : 1) *
    (1 + (cfg.economy.goldBonusPct / 100) * golds) *
    frenzy *
    neglectMult(e, cfg, at);
  return { base, requiredPU, enginePU, powerFactor, mult, ips: base * powerFactor * mult };
}

// Moments inside (from, to] where the insight rate can change.
function breakpoints(e: EngineState, cfg: EngineConfig, from: number, to: number): number[] {
  const pts = new Set<number>();
  const add = (t: number) => {
    if (t > from && t < to) pts.add(t);
  };
  add(ms(e.crankActiveUntil));
  if (e.frenzy) add(ms(e.frenzy.until));
  const o = cfg.offline;
  const hrs = e.specialization === "hardcore" ? [o.hardcoreHours1, o.hardcoreHours2] : [o.neglectHours1, o.neglectHours2];
  for (const hh of hrs) add(ms(e.lastInteractAt) + hh * 3_600_000);
  return [...pts].sort((a, b) => a - b);
}

/** Exact insight earned online between two instants. */
export function onlineGain(e: EngineState, cfg: EngineConfig, fx: ResearchEffects, from: number, to: number): number {
  if (to <= from) return 0;
  let gain = 0;
  let t = from;
  for (const bp of [...breakpoints(e, cfg, from, to), to]) {
    const { ips } = computeIps(e, cfg, fx, t);
    gain += ips * ((bp - t) / 1000);
    t = bp;
  }
  return gain;
}

/** Advances the settled balance to `to` (online rules). */
export function settle(e: EngineState, cfg: EngineConfig, fx: ResearchEffects, to: number): EngineState {
  const from = ms(e.settledAt);
  if (to <= from) return e;
  const gain = onlineGain(e, cfg, fx, from, to);
  const frenzy = e.frenzy && ms(e.frenzy.until) <= to ? null : e.frenzy;
  return {
    ...e,
    insight: e.insight + gain,
    lifetimeInsight: e.lifetimeInsight + gain,
    settledAt: new Date(to).toISOString(),
    frenzy,
  };
}

export function drumCapSec(e: EngineState, cfg: EngineConfig): number {
  const hours = DRUM_HOURS[Math.min(DRUM_HOURS.length - 1, Math.max(0, e.ledgerDrumLevel))];
  const mult = e.specialization === "homesteader" ? cfg.offline.homesteaderCapMult : 1;
  return hours * 3600 * mult;
}

export function offlineEfficiency(e: EngineState, cfg: EngineConfig, fx: ResearchEffects): number {
  const homesteader = e.specialization === "homesteader" ? cfg.offline.homesteaderIdlePct / 100 : 0;
  return Math.min(1, cfg.offline.baseEfficiency + fx.offlineEffBonus + homesteader);
}

export type OfflineResult = { gained: number; capped: boolean; neglect: number; offIps: number };

/** Insight earned while away between two instants (crank/frenzy off, efficiency + drum cap applied). */
export function offlineAccrual(
  e: EngineState,
  cfg: EngineConfig,
  fx: ResearchEffects,
  from: number,
  to: number
): OfflineResult {
  const gapSec = Math.max(0, (to - from) / 1000);
  const neglect = neglectMult(e, cfg, to);
  const { ips } = computeIps(e, cfg, fx, to, { offline: true });
  const offIps = ips * offlineEfficiency(e, cfg, fx);
  const cap = drumCapSec(e, cfg);
  return { gained: offIps * Math.min(gapSec, cap), capped: gapSec > cap, neglect, offIps };
}

function hardcoreBurst(e: EngineState): number {
  return e.specialization === "hardcore" ? 1.5 : 1;
}

export function stageFlat(stage: EngineStage): number {
  return STAGE_FLAT[stage] ?? 1;
}

export function puzzleBurst(e: EngineState, ips: number, cfg: EngineConfig, fx: ResearchEffects): number {
  return Math.max(stageFlat(e.stage), ips * cfg.economy.puzzleBurstSec) * fx.puzzleBurstMult * hardcoreBurst(e);
}

export function askReward(e: EngineState, cfg: EngineConfig): number {
  return stageFlat(e.stage) * cfg.economy.askFlatMult;
}

export function cipherBurst(e: EngineState, ips: number, cfg: EngineConfig, fx: ResearchEffects): number {
  return (ips * cfg.economy.cipherBurstSec + 50 * stageFlat(e.stage)) * fx.cipherBurstMult * hardcoreBurst(e);
}

export function crankRevValue(ips: number, fx: ResearchEffects): number {
  return 1 + fx.clickFrac * ips;
}

export function crankRevMs(e: EngineState, cfg: EngineConfig, fx: ResearchEffects, at: number): number {
  const base = crankBoostAt(e, at) ? cfg.economy.crankBoostRevMs : cfg.economy.crankRevMs;
  return Math.max(50, base * fx.crankSpeedMult);
}

const SUFFIXES = ["", "K", "M", "B", "T", "Qa", "Qi", "Sx", "Sp", "Oc", "No", "Dc"];

export function formatInsight(n: number): string {
  if (!Number.isFinite(n)) return "∞";
  if (n < 0) return `-${formatInsight(-n)}`;
  if (n < 10) return (Math.floor(n * 10) / 10).toString();
  if (n < 1000) return Math.floor(n).toString();
  const tier = Math.min(SUFFIXES.length - 1, Math.floor(Math.log10(n) / 3));
  const scaled = n / Math.pow(1000, tier);
  const digits = scaled < 10 ? 2 : scaled < 100 ? 1 : 0;
  const factor = Math.pow(10, digits);
  return `${(Math.floor(scaled * factor) / factor).toFixed(digits)}${SUFFIXES[tier]}`;
}
