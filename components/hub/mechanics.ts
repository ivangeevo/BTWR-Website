// Per-module "mechanic" classes — each one models the tunable numeric knobs
// behind a module's actual gameplay behavior (decay rates, costs, rewards,
// cooldowns) as a plain class with public fields and their own defaults. The
// admin panel's Modules tab reads a mechanic's `configFields` to build its
// settings dropdown generically — adding a field here is the only step
// needed to make it editable there, no bespoke JSX per module. Only modules
// with an actual tunable mechanic get a class; flavor cards, quizzes, and
// other static sections have nothing to expose.
import type { ModuleId } from "./module-registry";

export type MechanicConfigField = {
  key: string;
  label: string;
  description?: string;
  min: number;
  max: number;
  step: number;
  suffix?: string;
};

export class CampfireMechanic {
  /** Real minutes between each stage of decay since the fire was last tended. */
  decayMinutes = 15;
  /** Food consumed per cook. */
  cookFoodCost = 1;
  /** Cooked Food produced per cook. */
  cookYield = 1;
  /** XP granted for eating a cooked meal. */
  eatXpReward = 5;

  static readonly configFields: MechanicConfigField[] = [
    {
      key: "decayMinutes",
      label: "Fire decay rate",
      description: "Real minutes between each stage of decay since the fire was last tended.",
      min: 1,
      max: 180,
      step: 1,
      suffix: "min",
    },
    {
      key: "cookFoodCost",
      label: "Cook cost",
      description: "Food consumed per cook.",
      min: 0,
      max: 20,
      step: 1,
    },
    {
      key: "cookYield",
      label: "Cook yield",
      description: "Cooked Food produced per cook.",
      min: 1,
      max: 20,
      step: 1,
    },
    {
      key: "eatXpReward",
      label: "Eat XP reward",
      description: "XP granted for eating a cooked meal.",
      min: 0,
      max: 200,
      step: 1,
      suffix: "XP",
    },
  ];
}

export class GatheringMechanic {
  /** Shared rest timer after any Tree Mining/Hunting/Mining completion, in ms. */
  activityCooldownMs = 20_000;

  static readonly configFields: MechanicConfigField[] = [
    {
      key: "activityCooldownMs",
      label: "Activity cooldown",
      description: "Shared rest timer after any Tree Mining, Hunting, or Mining completion.",
      min: 1000,
      max: 120_000,
      step: 1000,
      suffix: "ms",
    },
  ];
}

export class PrestigeMechanic {
  /** Legacy Points banked per tool tier progressed past when prestiging. */
  pointsPerTier = 1;

  static readonly configFields: MechanicConfigField[] = [
    {
      key: "pointsPerTier",
      label: "Legacy Points per tier",
      description: "Legacy Points banked per tool tier progressed past when prestiging.",
      min: 1,
      max: 20,
      step: 1,
      suffix: "pts",
    },
  ];
}

export class UpgradesMechanic {
  /** Skill Points earned per achievement unlocked. */
  skillPointsPerAchievement = 1;

  static readonly configFields: MechanicConfigField[] = [
    {
      key: "skillPointsPerAchievement",
      label: "Skill Points per achievement",
      description: "Skill Points earned per achievement unlocked.",
      min: 0,
      max: 10,
      step: 1,
      suffix: "SP",
    },
  ];
}

// The Analytical Engine's (Ponder's) ability profile — unlike the modules
// above, this one varies BY TIER (see PER_TIER_MODULE_MECHANICS below and
// admin-config.ts's resolvedMechanicForTier), so its fields describe one
// tier's ability profile rather than one flat, global setting. A field's
// class default here is effectively "tier 1's baseline" — every tier stays
// at these numbers until an admin sets a per-tier override, so a visitor who
// never opens the admin panel sees identical behavior at every tier.
export class AnalyticalEngineMechanic {
  /** Insight (the Engine's own resource) earned per puzzle solved at this tier. */
  insightPerSolve = 1;
  /** Insight generated per real minute while idle, once this tier is reached. 0 keeps idle generation off. */
  idleInsightPerMin = 0;
  /** 1 lets this tier's ability profile unlock the "Borrowed Insight" Legacy perk, 0 keeps it locked — see legacy.ts. */
  legacyPerkUnlocked = 0;

  static readonly configFields: MechanicConfigField[] = [
    {
      key: "insightPerSolve",
      label: "Insight per solve",
      description: "Insight earned each time a Ponder puzzle is solved, at this tier.",
      min: 0,
      max: 50,
      step: 1,
    },
    {
      key: "idleInsightPerMin",
      label: "Idle insight / min",
      description: "Insight generated per real minute while idle, once this tier is reached. 0 keeps idle generation off.",
      min: 0,
      max: 20,
      step: 1,
    },
    {
      key: "legacyPerkUnlocked",
      label: "Unlocks Borrowed Insight perk",
      description: "1 to let this tier unlock the Borrowed Insight Legacy perk, 0 to keep it locked.",
      min: 0,
      max: 1,
      step: 1,
    },
  ];
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type MechanicClass = new () => Record<string, any>;

export const MODULE_MECHANICS: Partial<Record<ModuleId, MechanicClass>> = {
  campfire: CampfireMechanic,
  gathering: GatheringMechanic,
  prestige: PrestigeMechanic,
  upgrades: UpgradesMechanic,
};

export function mechanicConfigFields(id: ModuleId): MechanicConfigField[] {
  const Mechanic = MODULE_MECHANICS[id];
  return Mechanic ? (Mechanic as unknown as { configFields: MechanicConfigField[] }).configFields : [];
}

// A sibling registry to MODULE_MECHANICS for modules whose mechanic needs a
// per-tier ability profile rather than one flat setting — currently just
// Ponder/The Analytical Engine. Kept separate so existing flat-mode modules
// (Campfire/Gathering/Prestige/Upgrades) are completely unaffected.
export const PER_TIER_MODULE_MECHANICS: Partial<Record<ModuleId, MechanicClass>> = {
  ponder: AnalyticalEngineMechanic,
};

export function perTierMechanicConfigFields(id: ModuleId): MechanicConfigField[] {
  const Mechanic = PER_TIER_MODULE_MECHANICS[id];
  return Mechanic ? (Mechanic as unknown as { configFields: MechanicConfigField[] }).configFields : [];
}
