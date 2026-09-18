// Personal, per-browser admin overrides for the Outpost's tier structure —
// separate localStorage key from the main hub state, since this is
// visitor-side customization/tooling, not gameplay progress. A visitor who
// never opens the admin panel gets exactly today's hardcoded behavior
// (tier1 always, tier2 at 35 achievements, the built-in module placement
// and tool ladder) — every override here is additive on top of that.
import type { AchievementId } from "./achievements-catalog";
import type { ModuleId } from "./module-registry";
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

export type TierDef = {
  id: string;
  name: string;
  /** Achievements-unlocked count required to reach this tier. */
  threshold: number;
};

// tier1/tier2 are structural — a lot of bespoke content (the tier-2 reveal
// ceremony, skins, XP/level system) is specifically keyed to "tier2", so
// those two ids always exist. Everything past them is purely admin-defined
// and only gates module/achievement visibility (no bespoke reveal/skins).
export const BASE_TIER_IDS = ["tier1", "tier2"] as const;

export function defaultTiers(): TierDef[] {
  return [
    { id: "tier1", name: "Tier 1", threshold: 0 },
    { id: "tier2", name: "Tier 2", threshold: 35 },
  ];
}

export type CustomToolTier = ToolTier & {
  craftCost: Partial<Record<ResourceId, number>>;
};

export type ResourceMetaEdit = { name?: string; icon?: string };

// Whole-mechanic on/off switches, several paired with a tier requirement —
// the "day/night cycle unlocks at a later tier" idea and anything else in
// that shape belongs here. Every default below reproduces today's actual
// behavior (day/night on from tier1, Hunting/Mining revealing at tier2) so
// a visitor who's never opened this panel sees nothing different.
export type FeaturesConfig = {
  /** Master switch — off means the sun/moon band and theme cycling never run, regardless of tier. */
  dayNightCycleEnabled: boolean;
  /** Tier required before the day/night cycle can run at all (still also needs the visitor's own settings toggle on). */
  dayNightCycleTierId: string;
  /** Stars in the night sky, part of the day/night cycle but separately switchable. */
  starsEnabled: boolean;
  /** Tier that reveals the Hunting toggle in the Gathering card — Campfire cooking (needs Food) unlocks at the same tier. */
  huntingTierId: string;
  /** Tier that reveals the Mining toggle in the Gathering card. */
  miningTierId: string;
};

export function defaultFeatures(): FeaturesConfig {
  return {
    dayNightCycleEnabled: true,
    dayNightCycleTierId: "tier1",
    starsEnabled: true,
    huntingTierId: "tier2",
    miningTierId: "tier2",
  };
}

export type AdminConfig = {
  version: 1;
  tiers: TierDef[];
  moduleTier: Partial<Record<ModuleId, string>>;
  achievementTier: Partial<Record<AchievementId, string>>;
  toolTierEdits: Partial<Record<string, Partial<ToolTier>>>;
  customToolTiers: CustomToolTier[];
  /** Overrides a tool tier's craft cost — works for both built-ins (which
   * otherwise have no admin surface at all) and custom tiers (on top of
   * whatever cost they were created with). */
  craftCostEdits: Partial<Record<string, Partial<ResourceState>>>;
  resourceEdits: Partial<Record<ResourceId, ResourceMetaEdit>>;
  /** Flat amount Tree Mining/Hunting grant per completed hold/trip. */
  collectAmounts: { wood: number; food: number };
  /** Tip strings shown (rotating every 60s if more than one) while a
   * visitor is currently at that tier — see TierTip.tsx. Empty/missing
   * means no tip module for that tier. */
  tierTips: Partial<Record<string, string[]>>;
  features: FeaturesConfig;
};

export function defaultAdminConfig(): AdminConfig {
  return {
    version: 1,
    tiers: defaultTiers(),
    moduleTier: {},
    achievementTier: {},
    toolTierEdits: {},
    customToolTiers: [],
    craftCostEdits: {},
    resourceEdits: {},
    collectAmounts: { wood: 1, food: 1 },
    tierTips: {
      tier1: ["Craft a Stone Tool in the Crafting card, then try Mining — it needs a tool to find anything."],
      tier2: ["Keep collecting achievements — every category counts toward the next tier."],
    },
    features: defaultFeatures(),
  };
}

export function loadAdminConfig(): AdminConfig {
  if (typeof window === "undefined") return defaultAdminConfig();
  try {
    const raw = window.localStorage.getItem(ADMIN_STORAGE_KEY);
    if (!raw) return defaultAdminConfig();
    const parsed = JSON.parse(raw);
    if (parsed?.version !== 1) return defaultAdminConfig();
    const base = defaultAdminConfig();
    const tiers: TierDef[] = Array.isArray(parsed.tiers) && parsed.tiers.length >= 2 ? parsed.tiers : base.tiers;
    return {
      ...base,
      ...parsed,
      tiers,
      moduleTier: { ...base.moduleTier, ...parsed.moduleTier },
      achievementTier: { ...base.achievementTier, ...parsed.achievementTier },
      toolTierEdits: { ...base.toolTierEdits, ...parsed.toolTierEdits },
      customToolTiers: Array.isArray(parsed.customToolTiers) ? parsed.customToolTiers : [],
      craftCostEdits: { ...base.craftCostEdits, ...parsed.craftCostEdits },
      resourceEdits: { ...base.resourceEdits, ...parsed.resourceEdits },
      collectAmounts: { ...base.collectAmounts, ...parsed.collectAmounts },
      tierTips: { ...base.tierTips, ...parsed.tierTips },
      features: { ...base.features, ...parsed.features },
    };
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

// --- Resolved (default + admin-override) views, used by both the panel and the live site ---

export function resolvedTiers(config: AdminConfig): TierDef[] {
  return [...config.tiers].sort((a, b) => a.threshold - b.threshold);
}

export function tierThreshold(config: AdminConfig, tierId: string): number {
  return config.tiers.find((t) => t.id === tierId)?.threshold ?? Infinity;
}

export function resolvedModuleTier(config: AdminConfig, moduleId: ModuleId, fallback: string): string {
  return config.moduleTier[moduleId] ?? fallback;
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

export function resolvedTierTips(config: AdminConfig, tierId: string): string[] {
  return config.tierTips[tierId] ?? [];
}

export function resolvedFeatures(config: AdminConfig): FeaturesConfig {
  return { ...defaultFeatures(), ...config.features };
}

// The most advanced tier a visitor has actually reached, given how many
// achievements they've unlocked — same threshold rule as isTierUnlocked,
// just picking the highest tier that qualifies instead of a yes/no for one.
export function currentTierId(config: AdminConfig, unlockedCount: number): string {
  const tiers = resolvedTiers(config);
  let current = tiers[0]?.id ?? "tier1";
  for (const t of tiers) {
    if (unlockedCount >= t.threshold) current = t.id;
    else break;
  }
  return current;
}
