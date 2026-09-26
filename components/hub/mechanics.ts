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
  decayMinutes = 1;
  /** Food consumed per cook. */
  cookFoodCost = 1;
  /** Cooked Food produced per cook. */
  cookYield = 1;
  /** XP granted for eating a cooked meal. */
  eatXpReward = 5;
  /** Wood spent relighting an Extinguished fire (tending a lit one stays free). */
  relightWoodCost = 3;
  /** Wood spent crafting the Campfire itself, in the 2×2 Player Crafting grid. */
  craftWoodCost = 4;

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
    {
      key: "relightWoodCost",
      label: "Relight cost",
      description: "Wood spent relighting an Extinguished fire. Tending a lit fire stays free.",
      min: 0,
      max: 50,
      step: 1,
      suffix: "wood",
    },
    {
      key: "craftWoodCost",
      label: "Craft cost",
      description: "Wood spent crafting the Campfire in the 2×2 Player Crafting grid.",
      min: 0,
      max: 50,
      step: 1,
      suffix: "wood",
    },
  ];
}

export class GatheringMechanic {
  /** Shared rest timer after any Wood Gathering/Hunting/Mining completion, in ms. */
  activityCooldownMs = 10_000;

  static readonly configFields: MechanicConfigField[] = [
    {
      key: "activityCooldownMs",
      label: "Activity cooldown",
      description: "Shared rest timer after any Wood Gathering, Hunting, or Mining completion.",
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

// Health, Hunger, Gloom, and Hardcore Spawn (see survival.ts). Deliberately
// gentle defaults: a death is a ~2 minute detour, never lost resources, and
// nothing ticks while the Outpost tab is closed.
export class SurvivalMechanic {
  maxHealth = 20;
  maxHunger = 20;
  /** Seconds (page open) per point of passive hunger drain. */
  hungerDrainSec = 60;
  woodHunger = 1;
  huntingHunger = 1;
  miningHunger = 2;
  /** Hunger restored per Cooked Food eaten. */
  eatHunger = 6;
  /** Seconds per point of health regenerated while fed. */
  regenSec = 10;
  /** Hunger at or above which health regenerates. */
  regenHungerMin = 15;
  /** Seconds per point of health lost while starving (0 hunger). */
  starveSec = 10;
  /** Chance a Hunting/Mining run hurts, in percent. */
  damageChancePct = 15;
  damageMin = 2;
  damageMax = 4;
  /** Damage chance multiplier at night. */
  nightDamageMult = 1.5;
  /** Damage chance removed per tool tier above Stone, in percent points. */
  toolDamageReductionPct = 2;
  minDamageChancePct = 5;
  /** Seconds per point of health lost to gloom. */
  gloomSec = 5;
  /** Base trek back to camp after a respawn. */
  trekSec = 120;
  /** Trek length with a Compass, as a percent of the base. */
  compassTrekPct = 50;
  /** Dying again within this many minutes of a respawn lands in the same area, weaker. */
  respawnWindowMin = 10;
  /** Health and hunger taken off each repeat respawn inside the window. */
  respawnPenalty = 4;
  /** Repeat respawns never start below this much health/hunger. */
  respawnFloor = 10;
  compassIron = 4;
  compassCopper = 1;
  minBlocks = 400;
  maxBlocks = 2000;

  static readonly configFields: MechanicConfigField[] = [
    { key: "maxHealth", label: "Max health", description: "2 per heart.", min: 2, max: 100, step: 2 },
    { key: "maxHunger", label: "Max hunger", description: "2 per shank.", min: 2, max: 100, step: 2 },
    { key: "hungerDrainSec", label: "Hunger drain", description: "Seconds (page open) per point of passive hunger drain.", min: 5, max: 600, step: 5, suffix: "s" },
    { key: "woodHunger", label: "Wood Gathering hunger", description: "Hunger spent per chop.", min: 0, max: 10, step: 1 },
    { key: "huntingHunger", label: "Hunting hunger", description: "Hunger spent per trip.", min: 0, max: 10, step: 1 },
    { key: "miningHunger", label: "Mining hunger", description: "Hunger spent per dig.", min: 0, max: 10, step: 1 },
    { key: "eatHunger", label: "Meal hunger", description: "Hunger restored per Cooked Food eaten.", min: 1, max: 40, step: 1 },
    { key: "regenSec", label: "Regen rate", description: "Seconds per point of health regenerated while fed.", min: 1, max: 120, step: 1, suffix: "s" },
    { key: "regenHungerMin", label: "Regen threshold", description: "Hunger at or above which health regenerates.", min: 0, max: 100, step: 1 },
    { key: "starveSec", label: "Starvation rate", description: "Seconds per point of health lost at 0 hunger.", min: 1, max: 120, step: 1, suffix: "s" },
    { key: "damageChancePct", label: "Hit chance", description: "Chance a Hunting/Mining run hurts.", min: 0, max: 100, step: 1, suffix: "%" },
    { key: "damageMin", label: "Hit damage (min)", min: 1, max: 20, step: 1 },
    { key: "damageMax", label: "Hit damage (max)", min: 1, max: 20, step: 1 },
    { key: "nightDamageMult", label: "Night hit multiplier", description: "Hit chance multiplier at night.", min: 1, max: 5, step: 0.1 },
    { key: "toolDamageReductionPct", label: "Tool protection", description: "Hit chance removed per tool tier above Stone.", min: 0, max: 20, step: 1, suffix: "%" },
    { key: "minDamageChancePct", label: "Hit chance floor", min: 0, max: 100, step: 1, suffix: "%" },
    { key: "gloomSec", label: "Gloom rate", description: "Seconds per point of health lost to gloom (New Moon night, fire out).", min: 1, max: 60, step: 1, suffix: "s" },
    { key: "trekSec", label: "Trek length", description: "Time to find your way back to camp after a respawn.", min: 5, max: 900, step: 5, suffix: "s" },
    { key: "compassTrekPct", label: "Compass trek", description: "Trek length with a Compass, as a share of the base.", min: 5, max: 100, step: 5, suffix: "%" },
    { key: "respawnWindowMin", label: "Respawn window", description: "Dying again within this long respawns in the same area, weaker.", min: 1, max: 60, step: 1, suffix: "min" },
    { key: "respawnPenalty", label: "Repeat respawn penalty", description: "Health and hunger taken off each repeat respawn in the window.", min: 0, max: 20, step: 1 },
    { key: "respawnFloor", label: "Repeat respawn floor", description: "Repeat respawns never start below this health/hunger.", min: 1, max: 100, step: 1 },
    { key: "compassIron", label: "Compass Iron cost", min: 0, max: 50, step: 1 },
    { key: "compassCopper", label: "Compass Copper cost", min: 0, max: 50, step: 1 },
    { key: "minBlocks", label: "Respawn distance (min)", description: "Flavor only: blocks from spawn.", min: 0, max: 10_000, step: 100, suffix: "blocks" },
    { key: "maxBlocks", label: "Respawn distance (max)", min: 0, max: 10_000, step: 100, suffix: "blocks" },
  ];
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type MechanicClass = new () => Record<string, any>;

export const MODULE_MECHANICS: Partial<Record<ModuleId, MechanicClass>> = {
  campfire: CampfireMechanic,
  gathering: GatheringMechanic,
  prestige: PrestigeMechanic,
  upgrades: UpgradesMechanic,
  survival: SurvivalMechanic,
};

export function mechanicConfigFields(id: ModuleId): MechanicConfigField[] {
  const Mechanic = MODULE_MECHANICS[id];
  return Mechanic ? (Mechanic as unknown as { configFields: MechanicConfigField[] }).configFields : [];
}
