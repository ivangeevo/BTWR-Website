// Health, Hunger, Gloom, and Hardcore Spawn — BTW's respawn-far-from-spawn
// rule, played as a small setback rather than a punishment. A death never
// costs resources: the visitor wakes up "stranded" some distance from camp,
// with Crafting out of reach until a short trek home finishes (halved with
// a Compass) — the Campfire goes with them. Dying again soon after lands in the same
// general area with a little less health and hunger, never below a floor.
//
// Plain data + pure functions, same shape as legacy.ts/campfire-stage.ts —
// AchievementsProvider owns the ticking and persistence. Every tunable
// number comes from SurvivalMechanic (mechanics.ts), admin-editable.
import type { SurvivalMechanic } from "./mechanics";

export type DeathCause = "gloom" | "starvation" | "hunting" | "mining";

export type StrandedState = {
  /** Flavor only — how far from spawn the respawn landed. */
  blocks: number;
  trekMs: number;
  trekEndsAt: string;
};

export type SurvivalState = {
  health: number;
  hunger: number;
  /** Sub-point progress carried between ticks, so a 1s tick stays exact. */
  acc: { hunger: number; regen: number; starve: number; gloom: number };
  /** Set from a respawn until the visitor's back at camp (see completeTrekIfDone). */
  stranded: StrandedState | null;
  /** When the current frequent-respawn window opened (the first respawn in it). */
  respawnWindowStart: string | null;
  /** Repeat respawns inside the current window (0 = only the first one). */
  respawnsInWindow: number;
  lastBlocks: number | null;
  deaths: number;
  gloomDeaths: number;
  treksCompleted: number;
  compass: boolean;
  lastCause: DeathCause | null;
};

export type SurvivalTuning = Pick<
  SurvivalMechanic,
  | "maxHealth"
  | "maxHunger"
  | "hungerDrainSec"
  | "regenSec"
  | "regenHungerMin"
  | "starveSec"
  | "gloomSec"
  | "damageChancePct"
  | "damageMin"
  | "damageMax"
  | "nightDamageMult"
  | "toolDamageReductionPct"
  | "minDamageChancePct"
  | "trekSec"
  | "compassTrekPct"
  | "respawnWindowMin"
  | "respawnPenalty"
  | "respawnFloor"
  | "minBlocks"
  | "maxBlocks"
>;

const EMPTY_ACC = { hunger: 0, regen: 0, starve: 0, gloom: 0 };

export function defaultSurvivalState(maxHealth = 20, maxHunger = 20): SurvivalState {
  return {
    health: maxHealth,
    hunger: maxHunger,
    acc: { ...EMPTY_ACC },
    stranded: null,
    respawnWindowStart: null,
    respawnsInWindow: 0,
    lastBlocks: null,
    deaths: 0,
    gloomDeaths: 0,
    treksCompleted: 0,
    compass: false,
    lastCause: null,
  };
}

export type VitalsEnv = {
  /** A New Moon night on the Outpost's day/night cycle (day-night-cycle.ts's isGloomNight). */
  gloomNight: boolean;
  /** Any lit Campfire stage — and the visitor is at camp to sit by it. */
  fireLit: boolean;
};

/** Whether gloom is hurting the visitor right now. */
export function inGloom(env: VitalsEnv): boolean {
  return env.gloomNight && !env.fireLit;
}

// Whole points accrued from a fractional accumulator: returns the points
// earned this tick and the leftover to carry.
function accrue(acc: number, dtMs: number, secPerPoint: number): [number, number] {
  const total = acc + dtMs / (Math.max(0.1, secPerPoint) * 1000);
  const whole = Math.floor(total);
  return [whole, total - whole];
}

/**
 * Advances vitals by dtMs of page-open time. Returns the new state and, if
 * health hit 0 this tick, what killed the visitor (the caller respawns).
 */
export function tickVitals(
  s: SurvivalState,
  dtMs: number,
  env: VitalsEnv,
  t: SurvivalTuning
): { state: SurvivalState; died: DeathCause | null } {
  if (dtMs <= 0 || s.health <= 0) return { state: s, died: null };
  const acc = { ...s.acc };
  let { health, hunger } = s;

  let drained: number;
  [drained, acc.hunger] = accrue(acc.hunger, dtMs, t.hungerDrainSec);
  hunger = Math.max(0, hunger - drained);

  let gloomHit = 0;
  if (inGloom(env)) {
    [gloomHit, acc.gloom] = accrue(acc.gloom, dtMs, t.gloomSec);
  } else {
    acc.gloom = 0;
  }

  let starveHit = 0;
  if (hunger <= 0) {
    [starveHit, acc.starve] = accrue(acc.starve, dtMs, t.starveSec);
  } else {
    acc.starve = 0;
  }

  let regen = 0;
  if (hunger >= t.regenHungerMin && health < t.maxHealth && !inGloom(env)) {
    [regen, acc.regen] = accrue(acc.regen, dtMs, t.regenSec);
  } else {
    acc.regen = 0;
  }

  health = Math.min(t.maxHealth, health + regen) - gloomHit - starveHit;
  let died: DeathCause | null = null;
  if (health <= 0) {
    health = 0;
    died = gloomHit > 0 ? "gloom" : "starvation";
  }
  return { state: { ...s, health, hunger, acc }, died };
}

/** Spends hunger on an activity. Never kills directly — starvation does that over time. */
export function spendHunger(s: SurvivalState, amount: number): SurvivalState {
  return { ...s, hunger: Math.max(0, s.hunger - amount) };
}

export function eat(s: SurvivalState, amount: number, t: Pick<SurvivalTuning, "maxHunger">): SurvivalState {
  return { ...s, hunger: Math.min(t.maxHunger, s.hunger + amount) };
}

/** Hunting/Mining hit chance (0..1): better tools and daylight make it rarer. */
export function activityHitChance(toolIndex: number, isNight: boolean, t: SurvivalTuning): number {
  const reduced = t.damageChancePct - Math.max(0, toolIndex - 1) * t.toolDamageReductionPct;
  const pct = Math.max(t.minDamageChancePct, reduced) * (isNight ? t.nightDamageMult : 1);
  return Math.min(1, Math.max(0, pct / 100));
}

/** Damage from one Hunting/Mining run — 0 most of the time. */
export function rollActivityDamage(
  toolIndex: number,
  isNight: boolean,
  t: SurvivalTuning,
  rand: () => number = Math.random
): number {
  if (rand() >= activityHitChance(toolIndex, isNight, t)) return 0;
  const lo = Math.min(t.damageMin, t.damageMax);
  const hi = Math.max(t.damageMin, t.damageMax);
  return lo + Math.floor(rand() * (hi - lo + 1));
}

export function applyDamage(s: SurvivalState, amount: number): SurvivalState {
  return { ...s, health: Math.max(0, s.health - amount) };
}

export function trekMsFor(compass: boolean, t: Pick<SurvivalTuning, "trekSec" | "compassTrekPct">): number {
  return Math.round(t.trekSec * 1000 * (compass ? t.compassTrekPct / 100 : 1));
}

/**
 * Hardcore Spawn. Outside the frequent-respawn window: a fresh random spot,
 * full health and hunger, and a new window opens. Inside it: the same
 * general area (±10%), with a little less health/hunger each time, never
 * below the floor.
 */
export function respawn(
  s: SurvivalState,
  cause: DeathCause,
  nowMs: number,
  t: SurvivalTuning,
  rand: () => number = Math.random
): SurvivalState {
  const windowMs = t.respawnWindowMin * 60_000;
  const windowStartMs = s.respawnWindowStart ? new Date(s.respawnWindowStart).getTime() : null;
  const inWindow = windowStartMs !== null && s.lastBlocks !== null && nowMs - windowStartMs < windowMs;

  const repeats = inWindow ? s.respawnsInWindow + 1 : 0;
  const lo = Math.min(t.minBlocks, t.maxBlocks);
  const hi = Math.max(t.minBlocks, t.maxBlocks);
  const blocks = inWindow
    ? Math.round(s.lastBlocks! * (0.9 + rand() * 0.2))
    : Math.round(lo + rand() * (hi - lo));
  const penalty = repeats * t.respawnPenalty;
  const trekMs = trekMsFor(s.compass, t);

  return {
    ...s,
    health: Math.max(Math.min(t.respawnFloor, t.maxHealth), t.maxHealth - penalty),
    hunger: Math.max(Math.min(t.respawnFloor, t.maxHunger), t.maxHunger - penalty),
    acc: { ...EMPTY_ACC },
    stranded: { blocks, trekMs, trekEndsAt: new Date(nowMs + trekMs).toISOString() },
    respawnWindowStart: inWindow ? s.respawnWindowStart : new Date(nowMs).toISOString(),
    respawnsInWindow: repeats,
    lastBlocks: blocks,
    deaths: s.deaths + 1,
    gloomDeaths: s.gloomDeaths + (cause === "gloom" ? 1 : 0),
    lastCause: cause,
  };
}

/** True while a trek home is still underway. */
export function isStranded(s: SurvivalState, nowMs: number = Date.now()): boolean {
  return s.stranded !== null && nowMs < new Date(s.stranded.trekEndsAt).getTime();
}

export function trekRemainingMs(s: SurvivalState, nowMs: number = Date.now()): number {
  if (!s.stranded) return 0;
  return Math.max(0, new Date(s.stranded.trekEndsAt).getTime() - nowMs);
}

/** Clears a finished trek. Returns null when there's nothing to clear. */
export function completeTrekIfDone(s: SurvivalState, nowMs: number = Date.now()): SurvivalState | null {
  if (!s.stranded || isStranded(s, nowMs)) return null;
  return { ...s, stranded: null, treksCompleted: s.treksCompleted + 1 };
}

/** "3½" style heart/shank count for a 2-per-icon value. */
export function formatHalves(points: number): string {
  const whole = Math.floor(points / 2);
  return points % 2 === 1 ? `${whole}½` : String(whole);
}

export const DEATH_CAUSE_TEXT: Record<DeathCause, string> = {
  gloom: "the gloom",
  starvation: "starvation",
  hunting: "a hunt gone wrong",
  mining: "a cave-in",
};
