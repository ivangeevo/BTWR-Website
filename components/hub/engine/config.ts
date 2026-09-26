// Admin-tunable numbers for the Engine, in the same "plain class with public
// field defaults + a static configFields list" style as mechanics.ts, so the
// admin panel's generic field editor can render every group without
// bespoke JSX. Kept free of admin-config.ts imports (admin-config imports
// the override type from here instead) to avoid a circular dependency.
import type { MechanicConfigField } from "../mechanics";
import { COMPONENTS, type ComponentDef } from "./catalog/components";
import type { ComponentId } from "./types";

function field(
  key: string,
  label: string,
  description: string,
  min: number,
  max: number,
  step: number,
  suffix?: string
): MechanicConfigField {
  return { key, label, description, min, max, step, suffix };
}

export class EngineEconomyMechanic {
  /** Share of component output kept even with zero spare power. */
  powerFloor = 0.2;
  /** Insight/sec bonus per Engine Mark past the first (0.5 = +50%). */
  markBonus = 0.5;
  /** Rebuild discount per Mark past the first (0.05 = 5%), floored at 40% off. */
  markDiscountStep = 0.05;
  /** Component cost growth per owned unit. */
  costGrowth = 1.15;
  /** Seconds of insight/sec a solved puzzle is worth (floored by the stage's flat reward). */
  puzzleBurstSec = 45;
  /** Seconds of insight/sec a solved cipher is worth. */
  cipherBurstSec = 600;
  /** How many stage-flat rewards answering an Engine question is worth. */
  askFlatMult = 3;
  /** Milliseconds per hand-crank revolution. */
  crankRevMs = 800;
  /** Milliseconds per revolution while the crank is fed. */
  crankBoostRevMs = 400;
  /** Seconds the grid counts as crank-turned after the last revolution. */
  crankActiveSec = 5;
  /** Seconds one Cooked Food keeps the crank fed. */
  crankBoostSec = 120;
  /** Insight/sec multiplier for the Hardcore specialization. */
  hardcoreIpsMult = 1.25;
  /** Permanent insight/sec bonus per Difference Engine gold medal (percent). */
  goldBonusPct = 5;
  /** Cost of changing specialization, in seconds of insight/sec. */
  respecCostSec = 1800;

  static readonly configFields: MechanicConfigField[] = [
    field("powerFloor", "Power floor", "Share of component output kept with no spare power.", 0, 1, 0.05),
    field("markBonus", "Mark bonus", "Insight/sec bonus per Mark past the first.", 0, 5, 0.05),
    field("markDiscountStep", "Rebuild discount / Mark", "Cost discount per Mark past the first.", 0, 0.2, 0.01),
    field("costGrowth", "Component cost growth", "Cost multiplier per owned unit.", 1.01, 2, 0.01),
    field("puzzleBurstSec", "Puzzle burst", "Seconds of insight/sec per solved puzzle.", 0, 3600, 5, "s"),
    field("cipherBurstSec", "Cipher burst", "Seconds of insight/sec per solved cipher.", 0, 36000, 30, "s"),
    field("askFlatMult", "Question reward", "Stage-flat rewards per answered question.", 0, 50, 1),
    field("crankRevMs", "Crank revolution", "Milliseconds per revolution.", 100, 5000, 50, "ms"),
    field("crankBoostRevMs", "Fed crank revolution", "Milliseconds per revolution while fed.", 50, 5000, 50, "ms"),
    field("crankActiveSec", "Crank coast", "Seconds the crank keeps turning its neighbours after the last revolution.", 1, 60, 1, "s"),
    field("crankBoostSec", "Crank feed duration", "Seconds one Cooked Food keeps the crank fed.", 10, 3600, 10, "s"),
    field("hardcoreIpsMult", "Hardcore insight/sec", "Hardcore specialization multiplier.", 1, 5, 0.05),
    field("goldBonusPct", "Gold medal bonus", "Permanent insight/sec per Difference Engine gold.", 0, 100, 1, "%"),
    field("respecCostSec", "Respec cost", "Seconds of insight/sec to change specialization.", 0, 86400, 60, "s"),
  ];
}

export class EnginePowerMechanic {
  /** Power while the hand crank is turned. */
  crankPU = 1;
  windmillPU = 4;
  waterWheelPU = 6;
  /** A standard gearbox pops when more than this many power units enter it. */
  gearboxCap = 4;
  sfGearboxCap = 12;
  /** BTW's rule: a powered line may run this many axles before it needs a gearbox. */
  maxChain = 3;

  static readonly configFields: MechanicConfigField[] = [
    field("crankPU", "Hand crank", "Power units while the crank turns.", 0, 20, 1, "PU"),
    field("windmillPU", "Windmill", "Constant power units per windmill.", 0, 40, 1, "PU"),
    field("waterWheelPU", "Water wheel", "Constant power units per water wheel.", 0, 40, 1, "PU"),
    field("gearboxCap", "Gearbox rating", "Power a gearbox takes before it pops.", 1, 40, 1, "PU"),
    field("sfGearboxCap", "Soulforged gearbox rating", "Power a soulforged gearbox takes.", 1, 80, 1, "PU"),
    field("maxChain", "Axle run", "Axles a powered line may run before it needs a gearbox.", 1, 10, 1),
  ];
}

export class EngineBuffMechanic {
  /** Extra wood per Wood Gathering per powered Saw. */
  sawWood = 1;
  /** Percent shorter Wood Gathering run while a Saw is powered. */
  sawHoldPct = 25;
  /** Extra stone per Mining run per powered Millstone. */
  millstoneStone = 2;
  /** Extra of each ore found per Mining run per powered Bellows. */
  bellowsOre = 1;
  /** Crank turns per yield from each Millstone / Saw / Bellows the crank turns by hand. */
  handYieldRevs = 10;
  /** Detector Block charges held at once. */
  detectorMaxCharges = 3;
  /** Real minutes to recharge one Detector charge. */
  detectorRechargeMin = 60;
  /** Specialization bonus to the Saw, Millstone & Bellows (Homesteader), percent. */
  homesteaderAttachPct = 100;

  static readonly configFields: MechanicConfigField[] = [
    field("sawWood", "Saw: extra wood", "Extra wood per Wood Gathering, per powered Saw.", 0, 50, 1),
    field("sawHoldPct", "Saw: faster chop", "Percent shorter Wood Gathering run.", 0, 90, 5, "%"),
    field("millstoneStone", "Millstone: extra stone", "Extra stone per Mining run, per powered Millstone.", 0, 50, 1),
    field("bellowsOre", "Bellows: extra ore", "Extra of each ore found per Mining run, per powered Bellows.", 0, 20, 1),
    field("handYieldRevs", "Hand-turned yield", "Crank turns per Stone / Wood / ore from each machine the crank turns.", 1, 200, 1),
    field("detectorMaxCharges", "Detector charges", "Charges held at once.", 1, 20, 1),
    field("detectorRechargeMin", "Detector recharge", "Minutes per charge.", 1, 1440, 5, "min"),
    field("homesteaderAttachPct", "Homesteader attachments", "Extra Saw, Millstone & Bellows strength.", 0, 500, 10, "%"),
  ];
}

export class EngineEurekaMechanic {
  minMinutes = 3;
  maxMinutes = 8;
  lifeSec = 12;
  frenzyMult = 7;
  frenzySec = 60;
  /** Interval multiplier at night (lower = more often). */
  nightFactor = 0.7;
  fullMoonFactor = 0.5;
  fullMoonRewardMult = 1.5;
  /** Lucky burst: percent of banked insight, capped by luckyCapSec of insight/sec. */
  luckyPct = 15;
  luckyCapSec = 900;
  startStage = 4;

  static readonly configFields: MechanicConfigField[] = [
    field("minMinutes", "Min interval", "Shortest wait between sparks.", 0.5, 120, 0.5, "min"),
    field("maxMinutes", "Max interval", "Longest wait between sparks.", 0.5, 240, 0.5, "min"),
    field("lifeSec", "Spark lifetime", "Seconds a spark stays clickable.", 3, 120, 1, "s"),
    field("frenzyMult", "Frenzy multiplier", "Insight/sec multiplier during a frenzy.", 1, 50, 1, "x"),
    field("frenzySec", "Frenzy length", "Seconds a frenzy lasts.", 5, 600, 5, "s"),
    field("nightFactor", "Night interval", "Interval multiplier at night.", 0.1, 2, 0.05, "x"),
    field("fullMoonFactor", "Full moon interval", "Interval multiplier at full moon.", 0.1, 2, 0.05, "x"),
    field("fullMoonRewardMult", "Full moon reward", "Reward multiplier at full moon.", 1, 5, 0.1, "x"),
    field("luckyPct", "Lucky burst", "Percent of banked insight.", 0, 100, 1, "%"),
    field("luckyCapSec", "Lucky cap", "Cap, in seconds of insight/sec.", 0, 36000, 60, "s"),
    field("startStage", "First stage", "Engine stage sparks begin at.", 1, 8, 1),
  ];
}

export class EngineOfflineMechanic {
  /** Share of insight/sec earned while away (before research/specialization). */
  baseEfficiency = 0.5;
  /** Seconds away before a return counts as "while you were away". */
  awayThresholdSec = 120;
  neglectHours1 = 24;
  neglectHours2 = 72;
  neglectMult1 = 0.9;
  neglectMult2 = 0.75;
  hardcoreHours1 = 12;
  hardcoreHours2 = 48;
  hardcoreMult1 = 0.8;
  hardcoreMult2 = 0.6;
  homesteaderFloor = 0.9;
  homesteaderCapMult = 1.5;
  homesteaderIdlePct = 25;
  /** Welcome-back gift after a neglect-length absence, in seconds of insight/sec. */
  welcomeBackSec = 600;

  static readonly configFields: MechanicConfigField[] = [
    field("baseEfficiency", "Offline efficiency", "Share of insight/sec earned while away.", 0, 1, 0.05),
    field("awayThresholdSec", "Away threshold", "Seconds before a return counts as away.", 10, 3600, 10, "s"),
    field("neglectHours1", "Neglect step 1", "Hours before the first slowdown.", 1, 720, 1, "h"),
    field("neglectHours2", "Neglect step 2", "Hours before the deeper slowdown.", 1, 720, 1, "h"),
    field("neglectMult1", "Neglect output 1", "Output share after step 1.", 0, 1, 0.05),
    field("neglectMult2", "Neglect output 2", "Output share after step 2.", 0, 1, 0.05),
    field("hardcoreHours1", "Hardcore step 1", "Hardcore: hours before the first slowdown.", 1, 720, 1, "h"),
    field("hardcoreHours2", "Hardcore step 2", "Hardcore: hours before the deeper slowdown.", 1, 720, 1, "h"),
    field("hardcoreMult1", "Hardcore output 1", "Hardcore: output share after step 1.", 0, 1, 0.05),
    field("hardcoreMult2", "Hardcore output 2", "Hardcore: output share after step 2.", 0, 1, 0.05),
    field("homesteaderFloor", "Homesteader floor", "Homesteader never drops below this share.", 0, 1, 0.05),
    field("homesteaderCapMult", "Homesteader drum", "Homesteader offline cap multiplier.", 1, 5, 0.1, "x"),
    field("homesteaderIdlePct", "Homesteader idle", "Homesteader extra offline efficiency.", 0, 100, 5, "%"),
    field("welcomeBackSec", "Welcome back", "Gift after a long absence, in seconds of insight/sec.", 0, 36000, 60, "s"),
  ];
}

// Every number a stage gate reads — kept flat so the admin panel's generic
// field editor can show them without a bespoke table.
export class EngineGateMechanic {
  s2Solves = 8;
  s2Days = 2;
  s2Unlocked = 8;
  s2Cost = 15;
  s3Choices = 6;
  s3Asks = 3;
  s3ModsRead = 5;
  s3Cost = 75;
  s4ModFacts = 10;
  s4Hoppers = 5;
  s4Meals = 1;
  s4Cost = 1_000;
  s5Grinds = 30;
  s5ComponentTypes = 3;
  s5Iron = 3;
  s5Cost = 50_000;
  s6Caesar = 2;
  s6QuizCorrect = 10;
  s6Cost = 2_500_000;
  s7DetectorUses = 3;
  s7Components = 25;
  s7Meals = 25;
  s7Cost = 150_000_000;
  s8CorePU = 10;
  s8QuizCorrect = 50;
  s8Cost = 10_000_000_000;

  static readonly configFields: MechanicConfigField[] = [
    field("s2Solves", "→2 solves", "Sentences solved to reach Day Two.", 0, 200, 1),
    field("s2Days", "→2 days visited", "Distinct days visited (or unlocked count below).", 0, 60, 1),
    field("s2Unlocked", "→2 achievements", "Alternative: achievements unlocked.", 0, 200, 1),
    field("s2Cost", "→2 insight cost", "Insight spent to advance.", 0, 1e12, 1),
    field("s3Choices", "→3 forks", "Forks chosen.", 0, 200, 1),
    field("s3Asks", "→3 questions", "Engine questions answered.", 0, 50, 1),
    field("s3ModsRead", "→3 mods read", "Mods read on the Mods page.", 0, 60, 1),
    field("s3Cost", "→3 insight cost", "Insight spent to advance.", 0, 1e12, 1),
    field("s4ModFacts", "→4 mod facts", "Mod-fact sentences solved.", 0, 200, 1),
    field("s4Hoppers", "→4 hoppers", "Hoppers owned.", 0, 200, 1),
    field("s4Meals", "→4 meals", "Meals cooked at the Campfire.", 0, 200, 1),
    field("s4Cost", "→4 insight cost", "Insight spent to advance.", 0, 1e12, 1),
    field("s5Grinds", "→5 grinds", "Crank turns with a Millstone next to the crank.", 0, 1000, 5),
    field("s5ComponentTypes", "→5 component types", "Different components owned.", 0, 9, 1),
    field("s5Iron", "→5 iron", "Iron on hand.", 0, 500, 1),
    field("s5Cost", "→5 insight cost", "Insight spent to advance.", 0, 1e12, 1),
    field("s6Caesar", "→6 dial ciphers", "Caesar-dial ciphers solved.", 0, 10, 1),
    field("s6QuizCorrect", "→6 quiz answers", "Correct Guess the Mod answers.", 0, 500, 1),
    field("s6Cost", "→6 insight cost", "Insight spent to advance.", 0, 1e13, 1),
    field("s7DetectorUses", "→7 detector uses", "Detector Block uses.", 0, 100, 1),
    field("s7Components", "→7 components", "Components owned in total.", 0, 1000, 1),
    field("s7Meals", "→7 meals", "Meals cooked at the Campfire, lifetime.", 0, 1000, 1),
    field("s7Cost", "→7 insight cost", "Insight spent to advance.", 0, 1e15, 1),
    field("s8CorePU", "→8 steady power", "Steady power reaching the Engine's core (crank not counted).", 0, 100, 1, "PU"),
    field("s8QuizCorrect", "→8 quiz answers", "Correct Guess the Mod answers, lifetime.", 0, 2000, 1),
    field("s8Cost", "→8 insight cost", "Insight spent to advance.", 0, 1e18, 1),
  ];
}

export const ENGINE_MECHANICS = {
  economy: EngineEconomyMechanic,
  power: EnginePowerMechanic,
  buffs: EngineBuffMechanic,
  eureka: EngineEurekaMechanic,
  offline: EngineOfflineMechanic,
  gates: EngineGateMechanic,
} as const;

export type EngineMechanicGroup = keyof typeof ENGINE_MECHANICS;

export const ENGINE_GROUP_LABELS: Record<EngineMechanicGroup, string> = {
  economy: "Economy",
  power: "Power",
  buffs: "Attachments",
  eureka: "Eureka sparks",
  offline: "Offline & neglect",
  gates: "Stage gates",
};

export type EngineAdminOverrides = {
  mechanic?: Partial<Record<EngineMechanicGroup, Partial<Record<string, number>>>>;
  components?: Partial<Record<ComponentId, Partial<Pick<ComponentDef, "baseCost" | "rate" | "draw">>>>;
};

export type EngineConfig = {
  economy: EngineEconomyMechanic;
  power: EnginePowerMechanic;
  buffs: EngineBuffMechanic;
  eureka: EngineEurekaMechanic;
  offline: EngineOfflineMechanic;
  gates: EngineGateMechanic;
  components: ComponentDef[];
};

function withOverrides<T extends object>(instance: T, overrides: Partial<Record<string, number>> | undefined): T {
  if (overrides) {
    for (const [k, v] of Object.entries(overrides)) {
      if (typeof v === "number" && Number.isFinite(v) && k in instance) {
        (instance as Record<string, unknown>)[k] = v;
      }
    }
  }
  return instance;
}

export function resolveEngineConfig(overrides: EngineAdminOverrides | undefined): EngineConfig {
  const m = overrides?.mechanic ?? {};
  return {
    economy: withOverrides(new EngineEconomyMechanic(), m.economy),
    power: withOverrides(new EnginePowerMechanic(), m.power),
    buffs: withOverrides(new EngineBuffMechanic(), m.buffs),
    eureka: withOverrides(new EngineEurekaMechanic(), m.eureka),
    offline: withOverrides(new EngineOfflineMechanic(), m.offline),
    gates: withOverrides(new EngineGateMechanic(), m.gates),
    components: COMPONENTS.map((c) => ({ ...c, ...overrides?.components?.[c.id] })),
  };
}

export function engineGroupFields(group: EngineMechanicGroup): MechanicConfigField[] {
  return (ENGINE_MECHANICS[group] as unknown as { configFields: MechanicConfigField[] }).configFields;
}

export function engineGroupDefaults(group: EngineMechanicGroup): Record<string, number> {
  return { ...(new ENGINE_MECHANICS[group]() as unknown as Record<string, number>) };
}

export const DEFAULT_ENGINE_CONFIG: EngineConfig = resolveEngineConfig(undefined);
