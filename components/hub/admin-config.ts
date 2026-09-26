// Personal, per-browser admin overrides for the Outpost — separate
// localStorage key from the main hub state, since this is visitor-side
// customization/tooling, not gameplay progress. A visitor who never opens
// the admin panel gets the designed defaults below; every override here is
// additive on top of them. What reveals each card is the Engine's stage
// (module-registry.ts's DEFAULT_MODULE_STAGE), not a tier ladder.
import type { AchievementId } from "./achievements-catalog";
import { DEFAULT_MODULE_STAGE, type ModuleId } from "./module-registry";
import { MODULE_MECHANICS } from "./mechanics";
import type { EngineAdminOverrides } from "./engine/config";
import { resolveTree, type AchievementTree, type AdvFrame } from "./achievement-tree";
import {
  activeCatalog,
  sanitizeCustom,
  type ActiveCatalog,
  type CustomAchievement,
} from "./custom-achievements";
import { UPGRADES, type UpgradeDef, type UpgradeId } from "./upgrade-catalog";
import {
  RESOURCE_IDS,
  RESOURCE_META,
  TOOL_CRAFT_COSTS,
  TOOL_ORDER,
  TOOL_TIERS,
  type ResourceId,
  type ResourceState,
  type ToolTier,
} from "./resources";

const ADMIN_STORAGE_KEY = "btwr:hub:admin:v1";

export type CustomToolTier = ToolTier & {
  craftCost: Partial<Record<ResourceId, number>>;
};

export type ResourceMetaEdit = { name?: string; icon?: string };

// Whole-mechanic on/off switches. Day/Night Cycle, Stars, Hunting and Mining
// used to live here as admin toggles/tier pickers, but have moved
// to the Upgrades shop (upgrade-catalog.ts) as purchasable unlocks instead —
// each keeps its own Engine stage there. What's left here is just the header
// badges, which stay admin-controlled since they're not something a visitor
// buys into.
export type FeaturesConfig = {
  /** Master switch — off means the Upgrades badge/shop never shows in the Outpost header. */
  upgradesEnabled: boolean;
  /** Engine stage before the Upgrades badge appears in the header. Each upgrade inside keeps its own stage (upgrade-catalog.ts) on top of this. */
  upgradesStage: number;
  /** Master switch — off means the Prestige badge never shows in the header. Otherwise it appears once the Engine reaches Stage 8. */
  prestigeEnabled: boolean;
  /** Master switch for Health/Hunger/Gloom and Hardcore Spawn (survival.ts). */
  survivalEnabled: boolean;
  /** Engine stage at which survival switches on (default: The Stump, when the camp opens). */
  survivalStage: number;
};

export function defaultFeatures(): FeaturesConfig {
  return {
    upgradesEnabled: true,
    upgradesStage: 2,
    prestigeEnabled: true,
    survivalEnabled: true,
    survivalStage: 3,
  };
}

export type AdminConfig = {
  version: 1;
  /** Overrides the Engine stage that reveals a card (module-registry.ts's DEFAULT_MODULE_STAGE). */
  moduleStage: Partial<Record<ModuleId, number>>;
  /** Cards/sections switched off entirely — never shown, whatever the Engine's stage. */
  moduleDisabled: Partial<Record<ModuleId, boolean>>;
  /** Overrides which achievement another chains off in the Achievements tab's trees ("root" = starts its own tree). See achievement-tree.ts. */
  achievementParent: Partial<Record<AchievementId, AchievementId | "root">>;
  /** Overrides an achievement's tree frame (task / goal / challenge). */
  achievementFrame: Partial<Record<AchievementId, AdvFrame>>;
  /** Achievements added here, each with its own unlock rule — see custom-achievements.ts. */
  customAchievements: CustomAchievement[];
  /** Built-in achievements taken out: hidden, never unlocked, left out of every total. */
  removedAchievements: AchievementId[];
  toolTierEdits: Partial<Record<string, Partial<ToolTier>>>;
  customToolTiers: CustomToolTier[];
  /** Overrides a tool tier's craft cost — works for both built-ins (which
   * otherwise have no admin surface at all) and custom tiers (on top of
   * whatever cost they were created with). */
  craftCostEdits: Partial<Record<string, Partial<ResourceState>>>;
  resourceEdits: Partial<Record<ResourceId, ResourceMetaEdit>>;
  /** Flat amount Wood Gathering/Hunting grant per completed chop/trip. */
  collectAmounts: { wood: number; food: number };
  /** Tip strings shown (rotating every 60s if more than one) while the
   * Engine is at that stage — see StageTip.tsx. Empty/missing means no tip
   * box at that stage. */
  stageTips: Partial<Record<number, string[]>>;
  features: FeaturesConfig;
  /** Overrides for an Upgrades-shop entry's cost/stage (see upgrade-catalog.ts) — keyed by upgrade id. Missing means that upgrade uses its catalog default. */
  upgradeEdits: Partial<Record<UpgradeId, { cost?: number; stage?: number }>>;
  /** Overrides for a module's mechanic class fields (see mechanics.ts) — keyed by module id, then by field key. */
  mechanicOverrides: Partial<Record<string, Partial<Record<string, number>>>>;
  /** Ponder / The Analytical Engine's tunables (engine/config.ts) — the admin panel's Engine tab. */
  engine: EngineAdminOverrides;
};

// A visitor who's never opened /outpost-admin gets these. Card reveals come
// from DEFAULT_MODULE_STAGE (module-registry.ts); moduleStage here is only
// for admin overrides.
export function defaultAdminConfig(): AdminConfig {
  return {
    version: 1,
    moduleStage: {},
    moduleDisabled: {},
    achievementParent: {},
    achievementFrame: {},
    customAchievements: [],
    removedAchievements: [],
    toolTierEdits: {},
    customToolTiers: [],
    craftCostEdits: {},
    resourceEdits: {},
    collectAmounts: { wood: 1, food: 1 },
    stageTips: {
      1: ["Solve a sentence with Ponder — it's the only thing here right now, and that's the point."],
      2: [
        "Day Two: check today's Mod of the Day and crack open the Patch Notes — the Engine wants to read them too.",
        "Keep an eye on the rest of the site too... not everything announces itself.",
      ],
      3: [
        "The camp is open. Chop Wood in Gathering, craft a Campfire (4 Wood) in Crafting and keep it at Medium to cook, and spend Skill Points in the Upgrades shop (top-left badge) — Hunting and Mining are in there.",
        "Cooked food will feed the Engine's hand crank, once it has a body. Mining needs a Stone Tool first.",
      ],
      4: ["Guess the Mod is open, and the Engine has a body now — build its gear grid from the Body tab: a hand crank powers it, and grinds Stone from a Millstone next to it. Powered machines help the Outpost: a Saw for Wood, a Millstone for Stone, Bellows for ore."],
      5: ["A powered Detector Block helps you in Guess the Mod."],
      6: ["Powered Bellows keep the campfire burning far longer."],
      7: ["Soulforged parts need a lit Hibachi. Choose what the Engine becomes."],
      8: ["The Engine is finished — and Prestige is open (top-left). A rebuild keeps its mind, not its body."],
    },
    features: defaultFeatures(),
    upgradeEdits: {},
    mechanicOverrides: {},
    engine: {},
  };
}

// Shallow-merges a parsed blob (from localStorage or an imported file) over
// the defaults, the same way hub-storage tolerates a partially-shaped value
// — shared by loadAdminConfig and importAdminConfig so a settings file
// exported from an older/newer version of this panel doesn't crash it.
function normalizeAdminConfig(parsed: Partial<AdminConfig>): AdminConfig {
  const base = defaultAdminConfig();
  // Configs saved before tiers were retired may still carry these.
  const legacy = parsed as Record<string, unknown>;
  delete legacy.tiers;
  delete legacy.moduleTier;
  delete legacy.achievementTier;
  delete legacy.tierTips;
  delete legacy.achievementDefault;
  return {
    ...base,
    ...parsed,
    moduleStage: { ...base.moduleStage, ...parsed.moduleStage },
    moduleDisabled: { ...base.moduleDisabled, ...parsed.moduleDisabled },
    achievementParent: { ...base.achievementParent, ...parsed.achievementParent },
    achievementFrame: { ...base.achievementFrame, ...parsed.achievementFrame },
    customAchievements: Array.isArray(parsed.customAchievements)
      ? parsed.customAchievements.map(sanitizeCustom).filter((a): a is CustomAchievement => a !== null)
      : [],
    removedAchievements: Array.isArray(parsed.removedAchievements)
      ? parsed.removedAchievements.filter((id): id is AchievementId => typeof id === "string")
      : [],
    toolTierEdits: { ...base.toolTierEdits, ...parsed.toolTierEdits },
    customToolTiers: Array.isArray(parsed.customToolTiers) ? parsed.customToolTiers : [],
    craftCostEdits: { ...base.craftCostEdits, ...parsed.craftCostEdits },
    resourceEdits: { ...base.resourceEdits, ...parsed.resourceEdits },
    collectAmounts: { ...base.collectAmounts, ...parsed.collectAmounts },
    stageTips: { ...base.stageTips, ...parsed.stageTips },
    features: { ...base.features, ...parsed.features },
    upgradeEdits: { ...base.upgradeEdits, ...parsed.upgradeEdits },
    mechanicOverrides: { ...base.mechanicOverrides, ...parsed.mechanicOverrides },
    engine: {
      mechanic: { ...base.engine.mechanic, ...parsed.engine?.mechanic },
      components: { ...base.engine.components, ...parsed.engine?.components },
    },
  };
}

export function loadAdminConfig(): AdminConfig {
  if (typeof window === "undefined") return defaultAdminConfig();
  try {
    const raw = window.localStorage.getItem(ADMIN_STORAGE_KEY);
    if (!raw) return defaultAdminConfig();
    const parsed = JSON.parse(raw);
    if (parsed?.version !== 1) return defaultAdminConfig();
    return normalizeAdminConfig(parsed);
  } catch {
    return defaultAdminConfig();
  }
}

export function saveAdminConfig(config: AdminConfig) {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(ADMIN_STORAGE_KEY, JSON.stringify(config));
  } catch {
    // Same tolerance as hub-storage's saveState — losing this isn't worth surfacing.
  }
}

// Parses a settings file the panel itself exported (see AdminPanel's
// ExportImportControl) — returns null for anything that isn't recognizably
// one, so the caller can show an error instead of silently no-op'ing.
export function importAdminConfig(raw: string): AdminConfig | null {
  try {
    const parsed = JSON.parse(raw);
    if (parsed?.version !== 1 || typeof parsed !== "object") return null;
    return normalizeAdminConfig(parsed);
  } catch {
    return null;
  }
}

// --- Resolved (default + admin-override) views, used by both the panel and the live site ---

export function resolvedModuleStage(config: AdminConfig, moduleId: ModuleId): number {
  return config.moduleStage[moduleId] ?? DEFAULT_MODULE_STAGE[moduleId];
}

// Ponder is the Engine itself (it holds every stage gate), so it can't be switched off.
export function isModuleDisabled(config: AdminConfig, moduleId: ModuleId): boolean {
  return moduleId !== "ponder" && config.moduleDisabled[moduleId] === true;
}

/** Every achievement that exists with these settings: built-ins not removed, plus custom ones. */
export function resolvedAchievementCatalog(config: AdminConfig): ActiveCatalog {
  return activeCatalog(config.customAchievements, config.removedAchievements);
}

export function resolvedAchievementTree(config: AdminConfig, catalog = resolvedAchievementCatalog(config)): AchievementTree {
  return resolveTree({ parent: config.achievementParent, frame: config.achievementFrame }, catalog);
}

// Merges the built-in 6-tier ladder with any admin edits/additions into one
// ordered list. Custom tiers are appended after netherite in the order they
// were added — no reordering UI in v1, just extend the ladder.
export function resolvedToolTiers(config: AdminConfig): ToolTier[] {
  const builtins = TOOL_ORDER.map((id) => ({ ...TOOL_TIERS[id], ...config.toolTierEdits[id] }));
  const custom = config.customToolTiers.map((t) => ({ ...t, ...config.toolTierEdits[t.id] }));
  return [...builtins, ...custom];
}

export function resolvedToolOrder(config: AdminConfig): string[] {
  return resolvedToolTiers(config).map((t) => t.id);
}

// Craft cost for any tier in the resolved ladder — built-ins use their
// hardcoded cost, custom tiers use whatever the admin panel set them up
// with, and craftCostEdits (Resources tab) can override either on top.
export function resolvedCraftCost(config: AdminConfig, tierId: string): Partial<ResourceState> {
  const base =
    tierId in TOOL_CRAFT_COSTS
      ? TOOL_CRAFT_COSTS[tierId as keyof typeof TOOL_CRAFT_COSTS]
      : config.customToolTiers.find((t) => t.id === tierId)?.craftCost ?? {};
  const edit = config.craftCostEdits[tierId];
  return edit ? { ...base, ...edit } : base;
}

export function resolvedResourceMeta(config: AdminConfig): Record<ResourceId, { name: string; icon: string }> {
  const out = {} as Record<ResourceId, { name: string; icon: string }>;
  for (const id of RESOURCE_IDS) {
    out[id] = { ...RESOURCE_META[id], ...config.resourceEdits[id] };
  }
  return out;
}

export function resolvedCollectAmounts(config: AdminConfig): { wood: number; food: number } {
  return config.collectAmounts;
}

export function resolvedStageTips(config: AdminConfig, stage: number): string[] {
  return config.stageTips[stage] ?? [];
}

export function resolvedFeatures(config: AdminConfig): FeaturesConfig {
  return { ...defaultFeatures(), ...config.features };
}

// The Upgrades shop's catalog (upgrade-catalog.ts) with any admin cost/stage
// overrides applied on top — the live site and the admin panel's own
// Upgrades tab both read off this instead of the catalog's hardcoded
// defaults directly, same pattern as resolvedMechanic below.
export function resolvedUpgrades(config: AdminConfig): UpgradeDef[] {
  return UPGRADES.map((u) => ({ ...u, ...config.upgradeEdits[u.id] }));
}

export function resolvedUpgrade(config: AdminConfig, id: UpgradeId): UpgradeDef | undefined {
  const base = UPGRADES.find((u) => u.id === id);
  return base ? { ...base, ...config.upgradeEdits[id] } : undefined;
}

// A fresh instance of a module's mechanic class (its own defaults) with any
// admin overrides applied on top — components read their tunable numbers
// off this instead of the mechanic class's hardcoded defaults directly.
export function resolvedMechanic<T extends object>(config: AdminConfig, moduleId: ModuleId): T {
  const Mechanic = MODULE_MECHANICS[moduleId];
  if (!Mechanic) return {} as T;
  const instance = new Mechanic() as T;
  const overrides = config.mechanicOverrides[moduleId];
  if (overrides) Object.assign(instance, overrides);
  return instance;
}
