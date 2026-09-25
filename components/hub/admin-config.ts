// Personal, per-browser admin overrides for the Outpost's tier structure —
// separate localStorage key from the main hub state, since this is
// visitor-side customization/tooling, not gameplay progress. A visitor who
// never opens the admin panel gets exactly today's hardcoded behavior — the
// six-tier "Ponder only -> Prestige" progression curve below — every
// override here is additive on top of that.
import type { AchievementId } from "./achievements-catalog";
import type { ModuleId } from "./module-registry";
import { MODULE_MECHANICS } from "./mechanics";
import type { EngineAdminOverrides } from "./engine/config";
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

export type TierDef = {
  id: string;
  name: string;
  /** Achievements-unlocked count required to reach this tier. */
  threshold: number;
};

// tier1/tier2 are structural — a lot of bespoke content (the tier-2 reveal
// ceremony, skins, XP/level system) is specifically keyed to "tier2", so
// those two ids always exist. Everything past them (tier3-6 below) is
// purely admin-defined and only gates module/achievement visibility (no
// bespoke reveal/skins) — the same "+ Add tier" mechanism the admin panel's
// Tier List tab exposes, just pre-populated with a designed curve instead
// of left empty.
export const BASE_TIER_IDS = ["tier1", "tier2"] as const;

// The default progression: start with Ponder alone, then open the rest of
// the Outpost's systems in waves as achievements accumulate, ending on
// Prestige as the final, highest-threshold tier. See moduleTier/
// achievementTier below for what unlocks at each one.
//
// Thresholds are spread across the full ~156-achievement catalog (the
// original 35 + the 111-achievement expansion + Ponder's 10) so reaching
// the next tier takes genuine, varied engagement rather than a couple of
// clicks — tier2 alone used to sit at 3, which most visitors would cross
// within their first minute on the page just by glancing around, revealing
// Daily Briefing/Patch Notes (and the entire rest of the catalog) almost
// immediately. These numbers are a starting curve, not gospel — tune freely
// from the Tier List tab.
//
// tier1-5 gate the actual module reveals (Ponder -> Daily Briefing/Patch
// Notes -> First Iron Tool/Campfire/Priorities -> Gathering/Crafting/
// Upgrades -> Guess the Mod/Your Progress/Accomplishments), same as always.
// Everything past tier5 is achievement-hunting-only — no more modules to
// reveal — but the 111-achievement expansion is far too big to dump into a
// single endgame tier: that used to leave 98 achievements all gated behind
// one threshold, so they revealed in one flood and every tier after felt
// identical. tier6-10 instead unbury that expansion in five smaller waves,
// same total range, so the endgame gallery actually fills in gradually.
export function defaultTiers(): TierDef[] {
  return [
    { id: "tier1", name: "Day One", threshold: 0 },
    { id: "tier2", name: "Word Gets Around", threshold: 10 },
    { id: "tier3", name: "Making Camp", threshold: 20 },
    { id: "tier4", name: "Working the Land", threshold: 35 },
    { id: "tier5", name: "Keeping Record", threshold: 55 },
    { id: "tier6", name: "Deep Roots", threshold: 65 },
    { id: "tier7", name: "The Long Haul", threshold: 80 },
    { id: "tier8", name: "Under a New Moon", threshold: 95 },
    { id: "tier9", name: "By the Book", threshold: 112 },
    { id: "tier10", name: "The Reforging", threshold: 130 },
  ];
}

export type CustomToolTier = ToolTier & {
  craftCost: Partial<Record<ResourceId, number>>;
};

export type ResourceMetaEdit = { name?: string; icon?: string };

// Whole-mechanic on/off switches. Day/Night Cycle, Stars, Hunting, Mining,
// and Snow used to live here as admin toggles/tier pickers, but have moved
// to the Upgrades shop (upgrade-catalog.ts) as purchasable unlocks instead —
// each keeps its own tierId there. What's left here is just the header
// badges, which stay admin-controlled since they're not something a visitor
// buys into.
export type FeaturesConfig = {
  /** Master switch — off means the Upgrades badge/shop never shows in the Outpost header, regardless of tier. */
  upgradesEnabled: boolean;
  /** Tier required before the Upgrades badge appears in the header. Individual upgrades inside the shop keep their own per-item tierId (upgrade-catalog.ts) on top of this. */
  upgradesTierId: string;
  /** Master switch — off means the Prestige badge never shows in the header. Its reveal condition is otherwise the
   * existing "reached the highest configured tier" gate (canPrestige in AchievementsProvider) — not a separate
   * tierId here, since the Tiers tab's top tier already IS that admin-configurable concept; a second field would
   * just be a redundant, possibly-conflicting way to say the same thing. */
  prestigeEnabled: boolean;
};

export function defaultFeatures(): FeaturesConfig {
  return {
    upgradesEnabled: true,
    upgradesTierId: "tier1",
    prestigeEnabled: true,
  };
}

export type AdminConfig = {
  version: 1;
  tiers: TierDef[];
  moduleTier: Partial<Record<ModuleId, string>>;
  achievementTier: Partial<Record<AchievementId, string>>;
  /** Achievements pinned to a "Default" group shown first within their tier,
   * ahead of every category — for the odds and ends (window resizing, an
   * old cheat code) that don't really belong to any one category. */
  achievementDefault: Partial<Record<AchievementId, boolean>>;
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
  /** Overrides for an Upgrades-shop entry's cost/tier (see upgrade-catalog.ts) — keyed by upgrade id. Missing means that upgrade uses its catalog default. */
  upgradeEdits: Partial<Record<UpgradeId, { cost?: number; tierId?: string }>>;
  /** Overrides for a module's mechanic class fields (see mechanics.ts) — keyed by module id, then by field key. */
  mechanicOverrides: Partial<Record<string, Partial<Record<string, number>>>>;
  /** Ponder / The Analytical Engine's tunables (engine/config.ts) — the admin panel's Engine tab. */
  engine: EngineAdminOverrides;
};

// A visitor who's never opened /outpost-admin sees this designed curve:
// Ponder alone at Tier 1, then Daily Briefing/Patch Notes, then First Iron
// Tool/Campfire/Priorities, then Gathering/Crafting/the Upgrades shop, then
// Guess the Mod/Your Progress/Accomplishments, and finally Prestige at the
// top. moduleTier below places each card; achievementTier places every
// achievement alongside whichever tier unlocks the module it's tied to
// (first-time actions at that tier). Everything past Tier 5 has no more
// modules left to reveal, so tier6-10 exist purely to stagger the
// 111-achievement expansion's deep-grind/meta/capstone variants — each is
// its own wave of the endgame achievement hunt, roughly ordered easiest to
// hardest, ending on Tier 10 alongside Prestige and the true capstones.
export function defaultAdminConfig(): AdminConfig {
  return {
    version: 1,
    tiers: defaultTiers(),
    moduleTier: {
      "daily-briefing": "tier2",
      "patch-notes": "tier2",
      "first-iron-tool": "tier3",
      campfire: "tier3",
      priorities: "tier3",
      gathering: "tier4",
      crafting: "tier4",
      "resource-tool-strip": "tier4",
      "guess-the-mod": "tier5",
      "your-progress": "tier5",
      accomplishments: "tier5",
    },
    achievementTier: {
      // Tier 1 — Day One (Ponder + easy onboarding)
      "pd-first-sentence": "tier1",
      "pd-fluent": "tier1",
      "pd-first-choice": "tier1",
      "pd-insight-1": "tier1",
      "pd-insight-10": "tier1",
      "pd-insight-50": "tier1",
      "pd-insight-200": "tier1",
      "first-visit": "tier1",
      "outpost-lounging": "tier1",
      "theme-toggle-used": "tier1",
      "window-resized-once": "tier1",
      "visit-streak-2": "tier1",
      "secret-sequence": "tier1",
      "secret-logo-clicks": "tier1",

      // Tier 2 — Word Gets Around (Daily Briefing + Patch Notes + exploration secrets)
      "pd-automated": "tier2",
      "community-edition": "tier2",
      "mod-of-day-viewed": "tier2",
      "patch-notes-opened": "tier2",
      "patch-notes-mode-switched": "tier2",
      "hand-cranked": "tier2",
      "windmill-watcher": "tier2",
      "rope-grapple": "tier2",
      "hardcore-darkness": "tier2",
      "hopper-chain": "tier2",
      "mm-night-watch": "tier2",
      "mm-first-light": "tier2",
      "mm-off-clock": "tier2",
      "mm-golden-hour": "tier2",
      "mm-blood-moon": "tier2",
      "mm-new-moon": "tier2",
      "rw-open-5": "tier2",
      "he-every-day": "tier2",

      // Tier 3 — Making Camp (First Iron Tool + Campfire + Priorities)
      "campfire-medium": "tier3",
      "campfire-overstoked": "tier3",
      "iron-tool-chosen": "tier3",
      "iron-tool-completionist": "tier3",
      "priorities-started": "tier3",
      "priorities-completionist": "tier3",

      // Tier 4 — Working the Land (Gathering/Crafting/Upgrades shop)
      "snow-pile-10min": "tier4",
      "snow-pile-50min": "tier4",

      // Tier 5 — Keeping Record (Guess the Mod + Your Progress + Accomplishments)
      "quiz-first-correct": "tier5",
      "quiz-perfect-round": "tier5",
      "quiz-streak-5": "tier5",
      "quiz-attempted": "tier5",
      "hb-full-tour": "tier5",
      "hb-pin-first": "tier5",
      "hb-pin-fickle": "tier5",
      "hb-skin-first-change": "tier5",
      "hb-skin-all": "tier5",
      "hb-activity-25": "tier5",
      "hb-export-first": "tier5",
      "hb-import-first": "tier5",
      "hh-first-catch": "tier5",
      "hh-hemp-fields": "tier5",
      "bp-paper-trail": "tier5",
      "bp-unpinned": "tier5",
      "he-explore-session": "tier5",
      "nr-milestone-25": "tier5",

      // Tier 6 — Deep Roots (first wave of deep-grind expansion content)
      "hb-lore-half": "tier6",
      "hb-lore-deep": "tier6",
      "hb-activity-100": "tier6",
      "ml-millstone-ii": "tier6",
      "ml-millstone-iii": "tier6",
      "ml-bellows-ii": "tier6",
      "ml-turntable-ii": "tier6",
      "ml-crank-ii": "tier6",
      "ml-loom-streak": "tier6",
      "ml-reforge-i": "tier6",
      "sf-apprentice": "tier6",
      "sf-journeyman": "tier6",
      "hh-apiary": "tier6",
      "hh-lay-of-land": "tier6",
      "hh-three-piece": "tier6",
      "mm-nocturnal": "tier6",
      "mm-weekend-regular": "tier6",
      "mm-dusk-regular": "tier6",
      "mm-dawn-regular": "tier6",
      "nr-milestone-50": "tier6",
      "rw-open-15": "tier6",
      "rw-lore-15": "tier6",

      // Tier 7 — The Long Haul
      "millstone-grind": "tier7",
      "perfect-alloy": "tier7",
      "no-compass-needed": "tier7",
      "ml-bellows-iii": "tier7",
      "ml-turntable-iii": "tier7",
      "ml-crank-iii": "tier7",
      "ml-loom-streak-ii": "tier7",
      "sf-tradesman": "tier7",
      "sf-prestige-ii": "tier7",
      "sf-perfect-ii": "tier7",
      "hh-broody": "tier7",
      "hh-compost": "tier7",
      "hh-compost-ii": "tier7",
      "mm-moon-regular": "tier7",
      "mm-round-the-clock": "tier7",
      "nr-milestone-75": "tier7",
      "nr-category-quiz": "tier7",
      "rw-open-30": "tier7",
      "rw-lore-20": "tier7",
      "rw-quiz-300": "tier7",

      // Tier 8 — Under a New Moon
      "bellows-crucible": "tier8",
      "broody-hen-7day": "tier8",
      "sf-veteran": "tier8",
      "sf-prestige-iii": "tier8",
      "sf-perfect-iii": "tier8",
      "sf-streak-50": "tier8",
      "hh-full-harvest": "tier8",
      "hh-old-growth": "tier8",
      "hh-full-coop": "tier8",
      "nr-milestone-100": "tier8",
      "nr-category-manual": "tier8",
      "nr-category-forge": "tier8",
      "nr-hundred-days": "tier8",
      "rw-activity-200": "tier8",
      "rw-mode-switch-100": "tier8",
      "rw-pin-5": "tier8",
      "bp-skin-swap-5": "tier8",
      "bp-tab-hopping": "tier8",
      "he-chain-ii": "tier8",
      "he-full-session": "tier8",

      // Tier 9 — By the Book
      "pd-oracle": "tier9",
      "pd-old-friend": "tier9",
      "soul-urn": "tier9",
      "master-smith": "tier9",
      "sf-lifetime-xp": "tier9",
      "rw-export-5": "tier9",
      "rw-import-5": "tier9",
      "bp-skin-swap-15": "tier9",
      "bp-resize-100": "tier9",
      "bp-toggle-150": "tier9",
      "bp-streak-75": "tier9",
      "bp-perfect-40": "tier9",
      "bp-activity-500": "tier9",
      "bp-prestige-5": "tier9",
      "he-chain-iii": "tier9",
      "he-redstone-clock": "tier9",
      "he-overclocked": "tier9",
      "he-skin-session-swap": "tier9",
      "he-round-trip": "tier9",
      "he-chain-master": "tier9",
      "he-quiz-marathon": "tier9",

      // Tier 10 — The Reforging (Prestige + true capstones/meta)
      "sf-legend": "tier10",
      "nr-milestone-all": "tier10",
      "nr-secrets-half": "tier10",
      "nr-secrets-most": "tier10",
      "fr-wardrobe-certified": "tier10",
      "fr-all-flair": "tier10",
      "fr-all-categories": "tier10",
      "fr-master-every-trade": "tier10",
      "fr-nothing-hidden": "tier10",
      "fr-lifes-work": "tier10",
      "fr-half-year": "tier10",
      "fr-prestige-10": "tier10",
      "fr-complete-111": "tier10",
      "fr-founding-settler": "tier10",
      "fr-ledger-100": "tier10",
    },
    // The two obvious "doesn't belong to any category" tier-1 odds and ends
    // — resizing the window, and the old Konami-style cheat code — pinned
    // out of the box so the Default group isn't an empty, opt-in-only
    // feature. Anything else is up to the admin.
    achievementDefault: { "window-resized-once": true, "secret-sequence": true },
    toolTierEdits: {},
    customToolTiers: [],
    craftCostEdits: {},
    resourceEdits: {},
    collectAmounts: { wood: 1, food: 1 },
    tierTips: {
      tier1: ["Solve a sentence with Ponder — it's the only thing here right now, and that's the point."],
      tier2: [
        "Check today's Mod Spotlight and crack open the Patch Notes — reading up unlocks its own achievements.",
        "Keep an eye on the rest of the site too... not everything announces itself.",
      ],
      tier3: [
        "Pick your first Iron Tool, keep the Campfire fed, and work through the Priorities checklist — the Beginner's Guide's own early steps.",
      ],
      tier4: [
        "Gathering and Crafting are open. Chop some Wood, then spend the Skill Points you've earned in the Upgrades shop (top-left badge) — Hunting and Mining are in there.",
        "Mining needs a Stone Tool first — craft one before heading underground.",
      ],
      tier5: ["Guess the Mod, and check Your Progress and Accomplishments for the full picture of how far you've come."],
      tier6: [
        "Everything's open now — the rest of the ladder is pure achievement hunting. Keep playing and the gallery keeps filling in.",
      ],
      tier7: [
        "The deep-grind achievements are ramping up — lifetime totals, streaks, and repeat visits start paying off from here.",
      ],
      tier8: [
        "You're well past the halfway point of the catalog. Odd hours and moon phases hide a few of what's left.",
      ],
      tier9: [
        "Most of what remains is meta and lifetime-total achievements — check Your Progress for exactly what's still outstanding.",
      ],
      tier10: [
        "You've reached the top of the ladder. Prestige resets your resources and tools for permanent Legacy perks — a fresh start, not a finish line.",
      ],
    },
    features: { ...defaultFeatures(), upgradesTierId: "tier4" },
    // Hunting/Mining become purchasable right when Gathering itself unlocks
    // (down from the catalog's own tier2 default, since our tier2 is an
    // early step here, not a late one) — the cosmetic upgrades keep their
    // catalog-default tier1, which is a no-op floor since the shop itself
    // doesn't appear until tier4 regardless.
    upgradeEdits: {
      hunting: { tierId: "tier4" },
      mining: { tierId: "tier4" },
    },
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
  const tiers: TierDef[] = Array.isArray(parsed.tiers) && parsed.tiers.length >= 2 ? parsed.tiers : base.tiers;
  return {
    ...base,
    ...parsed,
    tiers,
    moduleTier: { ...base.moduleTier, ...parsed.moduleTier },
    achievementTier: { ...base.achievementTier, ...parsed.achievementTier },
    achievementDefault: { ...base.achievementDefault, ...parsed.achievementDefault },
    toolTierEdits: { ...base.toolTierEdits, ...parsed.toolTierEdits },
    customToolTiers: Array.isArray(parsed.customToolTiers) ? parsed.customToolTiers : [],
    craftCostEdits: { ...base.craftCostEdits, ...parsed.craftCostEdits },
    resourceEdits: { ...base.resourceEdits, ...parsed.resourceEdits },
    collectAmounts: { ...base.collectAmounts, ...parsed.collectAmounts },
    tierTips: { ...base.tierTips, ...parsed.tierTips },
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

export function resolvedTiers(config: AdminConfig): TierDef[] {
  return [...config.tiers].sort((a, b) => a.threshold - b.threshold);
}

export function tierThreshold(config: AdminConfig, tierId: string): number {
  return config.tiers.find((t) => t.id === tierId)?.threshold ?? Infinity;
}

export function resolvedModuleTier(config: AdminConfig, moduleId: ModuleId, fallback: string): string {
  return config.moduleTier[moduleId] ?? fallback;
}

export function isAchievementDefault(config: AdminConfig, id: AchievementId): boolean {
  return config.achievementDefault[id] === true;
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

// The Upgrades shop's catalog (upgrade-catalog.ts) with any admin cost/tier
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
