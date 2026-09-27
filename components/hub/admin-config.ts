// Personal, per-browser admin overrides for the Outpost — separate
// localStorage key from the main hub state, since this is visitor-side
// customization/tooling, not gameplay progress. A visitor who never opens
// the admin panel gets the designed defaults below; every override here is
// additive on top of them. What reveals each card is the Engine's stage
// (module-registry.ts's DEFAULT_MODULE_STAGE), not a tier ladder.
import type { AchievementId } from "./achievements-catalog";
import { DEFAULT_MODULE_STAGE, isModuleShelved, type ModuleId } from "./module-registry";
import { MODULE_MECHANICS } from "./mechanics";
import type { EngineAdminOverrides } from "./engine/config";
import { resolveTree, type AchievementTree, type AdvFrame } from "./achievement-tree";
import {
  activeCatalog,
  sanitizeCustom,
  type ActiveCatalog,
  type CustomAchievement,
} from "./custom-achievements";
import { OUTPOST_VERSION } from "./outpost-version";
import { isUpgradeId, UPGRADES, type UpgradeDef, type UpgradeId } from "./upgrade-catalog";
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

export type UpgradeEdit = { cost?: number; stage?: number; build?: Partial<ResourceState> };

export type CustomToolTier = ToolTier & {
  craftCost: Partial<Record<ResourceId, number>>;
};

export type ResourceMetaEdit = { name?: string; icon?: string };

// Whole-mechanic on/off switches. The header badges stay admin-controlled
// since they're not something a visitor buys into; each Upgrades-shop entry
// keeps its own Engine stage in upgrade-catalog.ts on top of upgradesStage.
export type FeaturesConfig = {
  /** Master switch — off means the Upgrades shop never shows in the Camp rail. */
  upgradesEnabled: boolean;
  /** Engine stage before the Upgrades shop appears in the Camp rail. Each upgrade inside keeps its own stage (upgrade-catalog.ts) on top of this. */
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
    upgradesStage: 3,
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
  /** Overrides for an Upgrades-shop entry's cost/stage/build cost (see upgrade-catalog.ts) — keyed by upgrade id. Missing means that upgrade uses its catalog default. */
  upgradeEdits: Partial<Record<UpgradeId, UpgradeEdit>>;
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
        "Day Two: the Engine wants to read about the pack — open a few mods on the Mods page and it will.",
        "Keep an eye on the rest of the site too... not everything announces itself.",
      ],
      3: [
        "The camp is open, down the right-hand side. Chop Wood in Gathering, craft a Campfire (4 Wood) in Crafting and keep it at Medium to cook, and go Hunting for Food. Upgrades, at the bottom of the camp, trades Skill Points and resources for new things to do.",
        "Cooked food will feed the Engine's hand crank, once it has a body. Mining needs a Stone Tool first.",
      ],
      4: [
        "Your trips out now and then turn up an unidentified relic: name the mod it came from, right in Gathering, for a cache and a new Field Guide entry (Progress tab).",
        "The Engine has a body now — build its gear grid from the Body tab: a hand crank powers it, and grinds Stone from a Millstone next to it. Powered machines help the Outpost: a Saw for Wood, a Millstone for Stone, Bellows for ore.",
      ],
      5: ["A powered Detector Block strikes a wrong name off a relic."],
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

// --- Normalizing (localStorage and imported files share this) ---
// Rebuilds a config from only the fields it knows, over the defaults, and
// checks every value's type on the way in — a hand-edited file, an older or
// newer panel's export, or a NaN that JSON turned into null can't leave a
// string or null where the Outpost's mechanics do arithmetic. Shared by
// loadAdminConfig and importAdminConfig, so the two can't migrate
// differently. Keys configs saved before tiers were retired may carry
// (tiers, moduleTier, achievementTier, tierTips, achievementDefault) simply
// aren't copied.

type Obj = Record<string, unknown>;

function isObj(v: unknown): v is Obj {
  return typeof v === "object" && v !== null && !Array.isArray(v);
}

function isNum(v: unknown): v is number {
  return typeof v === "number" && Number.isFinite(v);
}

/** Keeps each entry `each` accepts (non-null), keyed as it was. */
function mapOf<T>(v: unknown, each: (x: unknown) => T | null): Record<string, T> {
  const out: Record<string, T> = {};
  if (!isObj(v)) return out;
  for (const [k, x] of Object.entries(v)) {
    const kept = each(x);
    if (kept !== null) out[k] = kept;
  }
  return out;
}

function numbers(v: unknown): Record<string, number> {
  return mapOf(v, (x) => (isNum(x) ? x : null));
}

/** Only the listed numeric keys; null when none of them survive. */
function pickNumbers<K extends string>(v: unknown, keys: readonly K[]): Partial<Record<K, number>> | null {
  if (!isObj(v)) return null;
  const out: Partial<Record<K, number>> = {};
  for (const k of keys) {
    const n = v[k];
    if (isNum(n)) out[k] = n;
  }
  return Object.keys(out).length > 0 ? out : null;
}

// Only upgrades still in the catalog — retired ids (upgrade-catalog.ts's
// RETIRED_UPGRADE_REFUNDS) drop out of an old save.
function upgradeEdits(v: unknown): AdminConfig["upgradeEdits"] {
  const all = mapOf(v, (x): UpgradeEdit | null => {
    if (!isObj(x)) return null;
    const out: UpgradeEdit = { ...pickNumbers(x, ["cost", "stage"] as const) };
    const build = pickNumbers(x.build, RESOURCE_IDS);
    if (build) out.build = build;
    return Object.keys(out).length > 0 ? out : null;
  });
  return Object.fromEntries(Object.entries(all).filter(([id]) => isUpgradeId(id)));
}

function toolTierEdit(v: unknown): Partial<ToolTier> | null {
  if (!isObj(v)) return null;
  const out: Partial<ToolTier> = {};
  if (typeof v.name === "string") out.name = v.name;
  if (typeof v.icon === "string") out.icon = v.icon;
  if (isNum(v.treeMiningMs)) out.treeMiningMs = v.treeMiningMs;
  if (isNum(v.huntingMs)) out.huntingMs = v.huntingMs;
  if (isNum(v.miningMs) || v.miningMs === null) out.miningMs = v.miningMs;
  return Object.keys(out).length > 0 ? out : null;
}

function customToolTiers(v: unknown): CustomToolTier[] {
  if (!Array.isArray(v)) return [];
  const taken = new Set<string>(TOOL_ORDER);
  const out: CustomToolTier[] = [];
  for (const t of v) {
    if (!isObj(t) || typeof t.id !== "string" || !t.id || taken.has(t.id)) continue;
    if (typeof t.name !== "string" || !isNum(t.treeMiningMs) || !isNum(t.huntingMs)) continue;
    taken.add(t.id);
    out.push({
      id: t.id,
      name: t.name,
      icon: typeof t.icon === "string" ? t.icon : "✨",
      treeMiningMs: t.treeMiningMs,
      huntingMs: t.huntingMs,
      miningMs: isNum(t.miningMs) ? t.miningMs : null,
      craftCost: numbers(t.craftCost),
    });
  }
  return out;
}

function resourceEdit(v: unknown): ResourceMetaEdit | null {
  if (!isObj(v)) return null;
  const out: ResourceMetaEdit = {};
  if (typeof v.name === "string") out.name = v.name;
  if (typeof v.icon === "string") out.icon = v.icon;
  return Object.keys(out).length > 0 ? out : null;
}

function normalizeFeatures(v: unknown): FeaturesConfig {
  const out = defaultFeatures();
  if (!isObj(v)) return out;
  for (const k of Object.keys(out) as (keyof FeaturesConfig)[]) {
    const x = v[k];
    if (typeof x === typeof out[k] && (typeof x !== "number" || isNum(x))) {
      (out as Record<string, unknown>)[k] = x;
    }
  }
  return out;
}

const FRAMES: readonly AdvFrame[] = ["task", "goal", "challenge"];
const COMPONENT_KEYS = ["baseCost", "rate", "draw"] as const;

function normalizeAdminConfig(parsed: Obj): AdminConfig {
  const base = defaultAdminConfig();
  const collect = isObj(parsed.collectAmounts) ? parsed.collectAmounts : {};
  const engine = isObj(parsed.engine) ? parsed.engine : {};
  return {
    version: 1,
    moduleStage: numbers(parsed.moduleStage),
    moduleDisabled: mapOf(parsed.moduleDisabled, (x) => (x === true ? true : null)),
    achievementParent: mapOf(parsed.achievementParent, (x) => (typeof x === "string" ? (x as AchievementId) : null)),
    achievementFrame: mapOf(parsed.achievementFrame, (x) => (FRAMES.includes(x as AdvFrame) ? (x as AdvFrame) : null)),
    customAchievements: Array.isArray(parsed.customAchievements)
      ? parsed.customAchievements.map(sanitizeCustom).filter((a): a is CustomAchievement => a !== null)
      : [],
    removedAchievements: Array.isArray(parsed.removedAchievements)
      ? [...new Set(parsed.removedAchievements.filter((id): id is AchievementId => typeof id === "string"))]
      : [],
    toolTierEdits: mapOf(parsed.toolTierEdits, toolTierEdit),
    customToolTiers: customToolTiers(parsed.customToolTiers),
    craftCostEdits: mapOf(parsed.craftCostEdits, (x) => (isObj(x) ? numbers(x) : null)),
    resourceEdits: mapOf(parsed.resourceEdits, resourceEdit),
    collectAmounts: {
      wood: isNum(collect.wood) ? Math.max(0, collect.wood) : base.collectAmounts.wood,
      food: isNum(collect.food) ? Math.max(0, collect.food) : base.collectAmounts.food,
    },
    // Per stage: a saved list (even an emptied one) replaces the default tips.
    stageTips: {
      ...base.stageTips,
      ...mapOf(parsed.stageTips, (x) => (Array.isArray(x) ? x.filter((s): s is string => typeof s === "string") : null)),
    },
    features: normalizeFeatures(parsed.features),
    upgradeEdits: upgradeEdits(parsed.upgradeEdits),
    mechanicOverrides: mapOf(parsed.mechanicOverrides, (x) => (isObj(x) ? numbers(x) : null)),
    engine: {
      mechanic: mapOf(engine.mechanic, (x) => (isObj(x) ? numbers(x) : null)),
      components: mapOf(engine.components, (x) => pickNumbers(x, COMPONENT_KEYS)),
    },
  };
}

export function loadAdminConfig(): AdminConfig {
  if (typeof window === "undefined") return defaultAdminConfig();
  try {
    const raw = window.localStorage.getItem(ADMIN_STORAGE_KEY);
    if (!raw) return defaultAdminConfig();
    const parsed: unknown = JSON.parse(raw);
    if (!isObj(parsed) || parsed.version !== 1) return defaultAdminConfig();
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

// --- The settings file (AdminPanel's ExportImportControl) ---
// Everything the panel's tabs edit lives in this one config, so the file is
// the config plus a header saying what it is. Deliberately not in it: the
// Engine Debug tab's switches (btwr:hub:debug:v1 — test toggles like forced
// night or gloom, not customization) and which lists are folded (a
// per-browser nicety). Progress is the Outpost's own save file (save-file.ts).
export const ADMIN_FILE_FORMAT = "btwr-outpost-admin-settings";
export const ADMIN_FILE_VERSION = 2;

export type AdminSettingsFile = {
  format: typeof ADMIN_FILE_FORMAT;
  fileVersion: typeof ADMIN_FILE_VERSION;
  exportedAt: string;
  /** Informational only — which Outpost build wrote the file. */
  outpostVersion: string;
  config: AdminConfig;
};

export function exportAdminConfig(config: AdminConfig, now: Date = new Date()): string {
  const file: AdminSettingsFile = {
    format: ADMIN_FILE_FORMAT,
    fileVersion: ADMIN_FILE_VERSION,
    exportedAt: now.toISOString(),
    outpostVersion: OUTPOST_VERSION,
    config,
  };
  return JSON.stringify(file, null, 2);
}

// Top-level keys every admin config has always saved — how an older export
// (just the raw config) is told apart from an Outpost progress save, which
// is also `version: 1`.
const ADMIN_ONLY_KEYS = ["moduleStage", "moduleDisabled", "features", "mechanicOverrides", "stageTips", "toolTierEdits"];

// Parses a settings file: the current bundle, or an older export that was
// just the raw config. Returns null for anything else — an Outpost progress
// save included — so the caller can show an error instead of silently
// taking it in.
export function importAdminConfig(raw: string): AdminConfig | null {
  try {
    const parsed: unknown = JSON.parse(raw);
    if (!isObj(parsed)) return null;
    const body = parsed.format === ADMIN_FILE_FORMAT ? parsed.config : parsed;
    if (!isObj(body) || body.version !== 1) return null;
    if ("unlocked" in body || !ADMIN_ONLY_KEYS.some((k) => isObj(body[k]))) return null;
    return normalizeAdminConfig(body);
  } catch {
    return null;
  }
}

// --- Resolved (default + admin-override) views, used by both the panel and the live site ---

export function resolvedModuleStage(config: AdminConfig, moduleId: ModuleId): number {
  return config.moduleStage[moduleId] ?? DEFAULT_MODULE_STAGE[moduleId];
}

// Ponder is the Engine itself (it holds every stage gate), so it can't be
// switched off. A shelved card (module-registry.ts) is off whatever the config says.
export function isModuleDisabled(config: AdminConfig, moduleId: ModuleId): boolean {
  if (isModuleShelved(moduleId)) return true;
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

// The Upgrades shop's catalog (upgrade-catalog.ts) with any admin cost/stage/
// build overrides applied on top — the live site and the admin panel's own
// Upgrades tab both read off this instead of the catalog's hardcoded
// defaults directly, same pattern as resolvedMechanic below.
function withEdit(u: UpgradeDef, edit: UpgradeEdit | undefined): UpgradeDef {
  if (!edit) return u;
  return { ...u, ...edit, build: { ...u.build, ...edit.build } };
}

export function resolvedUpgrades(config: AdminConfig): UpgradeDef[] {
  return UPGRADES.map((u) => withEdit(u, config.upgradeEdits[u.id]));
}

export function resolvedUpgrade(config: AdminConfig, id: UpgradeId): UpgradeDef | undefined {
  const base = UPGRADES.find((u) => u.id === id);
  return base ? withEdit(base, config.upgradeEdits[id]) : undefined;
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
