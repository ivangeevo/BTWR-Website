// Commissions — Stage 8's rotating requests. Three daily + one weekly,
// date-seeded like the Daily Briefing, so everyone gets the same set on the
// same day. Progress is a counter's delta since seeding; "deliver" asks for
// Outpost resources outright. Rewards are insight (and sometimes a part) —
// never Skill Points, which stay separate from the Engine.
import { hashString, isoWeekKey, mulberry32, seededShuffle, todayKeyUTC } from "./rng";
import type { CommissionInstance, EngineCounterKey, EngineStage, EngineState, GridPartType } from "./types";

export type CommissionTemplate = {
  id: string;
  label: (target: number) => string;
  kind: CommissionInstance["kind"];
  counter?: EngineCounterKey | "solvedCount";
  resource?: string;
  target: (stage: EngineStage, mark: number) => number;
  rewardSec: number;
  rewardPart?: GridPartType;
  weekly?: boolean;
};

export const COMMISSION_TEMPLATES: CommissionTemplate[] = [
  { id: "c-solve", label: (n) => `Finish ${n} sentences`, kind: "counter", counter: "solvedCount", target: () => 8, rewardSec: 900 },
  { id: "c-crank", label: (n) => `Turn the crank ${n} times`, kind: "counter", counter: "cranks", target: () => 150, rewardSec: 900 },
  { id: "c-eureka", label: (n) => `Catch ${n} Eureka sparks`, kind: "counter", counter: "eurekasCaught", target: () => 2, rewardSec: 1800 },
  { id: "c-detector", label: (n) => `Use the Detector ${n} times`, kind: "counter", counter: "detectorUses", target: () => 2, rewardSec: 1200 },
  { id: "c-stoke", label: (n) => `Stoke the campfire from the Engine ${n} times`, kind: "counter", counter: "stokes", target: () => 3, rewardSec: 900 },
  { id: "c-engage", label: () => "Engage the clutch without popping anything", kind: "counter", counter: "cleanEngages", target: () => 1, rewardSec: 1200 },
  { id: "c-asks", label: () => "Answer one of the Engine's questions", kind: "counter", counter: "asksAnswered", target: () => 1, rewardSec: 600 },
  { id: "c-saw", label: (n) => `Chop ${n} trees with the Saw running`, kind: "counter", counter: "sawChops", target: () => 5, rewardSec: 1200 },
  { id: "c-meal", label: (n) => `Cook ${n} Millstone meals`, kind: "counter", counter: "millstoneMeals", target: () => 3, rewardSec: 1200 },
  { id: "c-wood", label: (n) => `Deliver ${n} wood`, kind: "deliver", resource: "wood", target: (_s, m) => 30 + 10 * m, rewardSec: 1500 },
  { id: "c-stone", label: (n) => `Deliver ${n} stone`, kind: "deliver", resource: "stone", target: (_s, m) => 25 + 10 * m, rewardSec: 1500 },
  { id: "c-coal", label: (n) => `Deliver ${n} coal`, kind: "deliver", resource: "coal", target: () => 10, rewardSec: 2000, rewardPart: "sfAxle" },
  { id: "c-iron", label: (n) => `Deliver ${n} iron`, kind: "deliver", resource: "iron", target: () => 8, rewardSec: 2400 },
  { id: "c-mods", label: (n) => `Read ${n} more mods on the Mods page`, kind: "modsRead", target: () => 3, rewardSec: 1500 },
  // Weekly
  { id: "w-ciphers", label: (n) => `Decode ${n} practice ciphers`, kind: "counter", counter: "ciphersSolved", target: () => 3, rewardSec: 14_400, weekly: true, rewardPart: "sfGearbox" },
  { id: "w-iron", label: (n) => `Deliver ${n} iron`, kind: "deliver", resource: "iron", target: () => 50, rewardSec: 14_400, weekly: true },
  { id: "w-solves", label: (n) => `Finish ${n} sentences`, kind: "counter", counter: "solvedCount", target: () => 40, rewardSec: 14_400, weekly: true },
  { id: "w-crank", label: (n) => `Turn the crank ${n} times`, kind: "counter", counter: "cranks", target: () => 1500, rewardSec: 14_400, weekly: true },
];

export const COMMISSIONS_BY_ID: Record<string, CommissionTemplate> = Object.fromEntries(
  COMMISSION_TEMPLATES.map((t) => [t.id, t])
);

export function counterValue(e: EngineState, c: CommissionInstance): number {
  if (c.kind === "modsRead") return e.modsRead.length;
  if (c.counter === "solvedCount") return e.solvedCount;
  return c.counter ? e.counters[c.counter] : 0;
}

function instantiate(t: CommissionTemplate, e: EngineState, totalMods: number): CommissionInstance | null {
  const target = t.target(e.stage, e.mark);
  if (t.kind === "modsRead" && totalMods - e.modsRead.length < target) return null;
  const inst: CommissionInstance = {
    tplId: t.id,
    kind: t.kind,
    counter: t.counter,
    resource: t.resource,
    target,
    baseline: 0,
    rewardSec: t.rewardSec,
    rewardPart: t.rewardPart,
    done: false,
    claimed: false,
  };
  inst.baseline = t.kind === "deliver" ? 0 : counterValue(e, inst);
  return inst;
}

/** Re-seeds the daily/weekly slots when the day/week rolls over. Returns the same object if nothing changed. */
export function refreshCommissions(e: EngineState, now: Date, totalMods: number): EngineState["commissions"] {
  const day = todayKeyUTC(now);
  const week = isoWeekKey(now);
  let { daily, weekly } = e.commissions;
  let changed = false;
  if (e.commissions.day !== day) {
    const rand = mulberry32(hashString(`c:${day}`));
    const pool = seededShuffle(COMMISSION_TEMPLATES.filter((t) => !t.weekly), rand);
    daily = [];
    for (const t of pool) {
      if (daily.length >= 3) break;
      const inst = instantiate(t, e, totalMods);
      if (inst) daily.push(inst);
    }
    changed = true;
  }
  if (e.commissions.week !== week) {
    const rand = mulberry32(hashString(`w:${week}`));
    const pool = seededShuffle(COMMISSION_TEMPLATES.filter((t) => t.weekly), rand);
    weekly = instantiate(pool[0], e, totalMods);
    changed = true;
  }
  return changed ? { day, week, daily, weekly } : e.commissions;
}

export function commissionProgress(e: EngineState, c: CommissionInstance): number {
  if (c.kind === "deliver") return c.done ? c.target : 0;
  return Math.min(c.target, Math.max(0, counterValue(e, c) - c.baseline));
}
