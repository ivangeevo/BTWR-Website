"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import {
  ALL_HAND_AUTHORED_IDS,
  CATEGORY_ORDER,
  EXPANSION_IDS,
  EXPANSION_MANUAL_LABOR_IDS,
  EXPANSION_SOUL_FORGE_IDS,
  TIER2_NEW_IDS,
  type AchievementId,
} from "./achievements-catalog";
import {
  applyVisit,
  defaultState,
  loadState,
  normalizeCampfire,
  normalizeExperience,
  saveState as saveStateRaw,
  type ExperienceMode,
  todayUTC,
  type HubState,
  type QuizStats,
  type Tier2State,
} from "./hub-storage";
import { currentCampfireStage, type CampfireStage } from "./campfire-stage";
import { computeBuffs, type EngineBuffs } from "./engine/buffs";
import { researchEffects } from "./engine/catalog/research";
import { resolveEngineConfig, type EngineConfig } from "./engine/config";
import { settle } from "./engine/economy";
import { ENGINE_CUSTOM_RULES, ENGINE_NUMERIC_RULES } from "./engine/achievements";
import { engineOnPrestige, normalizeEngineState } from "./engine/state";
import { readEngineDebug, takeQueuedSecrets, writeEngineDebug } from "./engine/bridge-storage";
import {
  computeCyclePhase,
  gloomDarkness,
  isGloomNight,
  loadCycleStartedAt,
  saveCycleStartedAt,
  skipToMorning,
} from "./day-night-cycle";
import {
  applyDamage,
  completeTrekIfDone,
  DEATH_CAUSE_TEXT,
  defaultSurvivalState,
  eat,
  formatHalves,
  respawn,
  rollActivityDamage,
  spendHunger,
  tickVitals,
  type DeathCause,
  type SurvivalState,
} from "./survival";
import { SURVIVAL_NUMERIC_RULES } from "./survival-achievements";
import type { EngineState } from "./engine/types";
import {
  collectBonus,
  craftCostDiscount,
  defaultLegacyState,
  effectiveCooldownMs,
  insightPrestigeBonus,
  nextPerkCost,
  pointsForPrestige,
  startingTierIndex,
  type LegacyState,
  type PerkId,
} from "./legacy";
import {
  nextToolTier,
  rollMiningYield,
  type ResourceId,
  type ResourceState,
} from "./resources";
import {
  defaultAdminConfig,
  resolvedAchievementCatalog,
  resolvedAchievementTree,
  isModuleDisabled,
  loadAdminConfig,
  resolvedCollectAmounts,
  resolvedCraftCost,
  resolvedFeatures,
  resolvedMechanic,
  resolvedModuleStage,
  resolvedResourceMeta,
  resolvedStageTips,
  resolvedToolOrder,
  resolvedToolTiers,
  resolvedUpgrade,
  resolvedUpgrades,
  type AdminConfig,
  type FeaturesConfig,
} from "./admin-config";
import type {
  CampfireMechanic,
  GatheringMechanic,
  PrestigeMechanic,
  SurvivalMechanic,
  UpgradesMechanic,
} from "./mechanics";
import { DEFAULT_CARD_ORDER, type ModuleId } from "./module-registry";
import type { AchievementTree } from "./achievement-tree";
import {
  BUILTIN_CATALOG,
  customTriggerMet,
  type ActiveCatalog,
} from "./custom-achievements";
import type { UpgradeDef, UpgradeId } from "./upgrade-catalog";
import {
  computeLedgerProgress,
  ledgerEntryTitle,
  ledgerRankSnapshot,
  type LedgerMetricKey,
  type LedgerProgress,
} from "./ledger-entries";
import {
  isFullMoon,
  isNewMoon,
  isWeekend,
  levelForXp,
  xpProgress,
  PRESTIGE_LEVEL,
  TIER2_TAB_IDS,
  XP_PER_DAILY_VISIT,
  type SkinId,
  type Tier2TabId,
} from "./tier2";

const ACTIVITY_LOG_MAX = 20;

export type ToastInstance = { instanceId: string; achievementId: AchievementId };

type AchievementsContextValue = {
  mounted: boolean;
  /** Every achievement that exists right now — built-ins not removed in /outpost-admin, plus custom ones. */
  achievements: ActiveCatalog["list"];
  achievementsById: ActiveCatalog["byId"];
  /** Earned achievements that still exist (a removed one's unlock stays saved, just not shown or counted). */
  unlocked: Set<AchievementId>;
  /** When each earned achievement was unlocked (ISO timestamps). */
  unlockedAt: HubState["unlocked"];
  unlock: (id: AchievementId) => void;
  toasts: ToastInstance[];
  dismissToast: (instanceId: string) => void;
  dismissAllToasts: () => void;
  quiz: QuizStats;
  updateQuiz: (updater: (prev: QuizStats) => QuizStats) => void;
  visits: HubState["visits"];
  tier2: Tier2State;
  xpInfo: ReturnType<typeof xpProgress>;
  ledgerProgress: LedgerProgress;
  addXp: (amount: number) => void;
  setSkin: (skin: SkinId) => void;
  prestige: () => void;
  bumpPatchNotesSwitch: () => void;
  markQuizPlayedToday: () => void;
  markAchievementsSeen: () => void;
  setLastTab: (tab: Tier2TabId | null) => void;
  setLeftTab: (tab: Tier2TabId | null) => void;
  setPinnedTab: (tab: Tier2TabId | null) => void;
  recordTabVisit: (tab: Tier2TabId) => void;
  recordModGuessCorrect: (projectId: string) => void;
  recordPatchNotesOpen: () => void;
  recordExport: () => void;
  importState: (parsed: unknown) => boolean;
  /** Ponder / The Analytical Engine's slice, as last committed to React state. */
  engine: EngineState;
  /** The engine slice as of right now (may be ahead of `engine` between throttled commits). */
  getEngine: () => EngineState;
  /** The single way the Engine's state changes — "soon" batches frequent updates (cranking) into one commit. */
  updateEngine: (fn: (e: EngineState) => EngineState, mode?: "now" | "soon") => void;
  engineConfig: EngineConfig;
  /** What the Engine's powered attachments are doing for the rest of the Outpost right now. */
  engineBuffs: EngineBuffs;
  /** Spends Outpost resources for the Engine (parts, commissions, feeding the crank). False if unaffordable. */
  spendResources: (cost: Partial<ResourceState>, logText?: string) => boolean;
  /** Grants Outpost resources without touching the gathering cooldown. */
  grantResources: (gain: Partial<ResourceState>, logText?: string) => void;
  logActivity: (text: string) => void;
  campfire: HubState["campfire"];
  /** Raises the fire a stage. Relighting an Extinguished fire costs Wood; false if unaffordable or not crafted yet. */
  tendCampfire: () => boolean;
  /** Crafts the Campfire (2×2 Player Crafting, Wood). False if already built, unaffordable, or stranded. */
  craftCampfire: () => boolean;
  /** Only succeeds while the fire is at the Medium stage and there's enough Food — see resources.ts. */
  completeCooking: () => boolean;
  eatCookedFood: () => boolean;
  resources: HubState["resources"];
  tools: HubState["tools"];
  activityCooldownUntil: string | null;
  completeWoodGathering: () => void;
  completeHunting: () => void;
  completeMining: () => Partial<ResourceState>;
  craftTool: (tier: string) => boolean;
  /** The Engine stage that reveals a card (default + admin override). */
  moduleStage: (id: ModuleId) => number;
  /** False when the card is switched off in /outpost-admin (never shown at all). */
  isModuleEnabled: (id: ModuleId) => boolean;
  /** Whether the card is enabled and the Engine has reached the stage that reveals it. */
  isModuleRevealed: (id: ModuleId) => boolean;
  /** The Achievements tab's advancement trees (authored + admin edits) — see achievement-tree.ts. */
  achievementTree: AchievementTree;
  toolTiersList: ReturnType<typeof resolvedToolTiers>;
  craftCostFor: (tierId: string) => Partial<ResourceState>;
  resourceMeta: ReturnType<typeof resolvedResourceMeta>;
  /** Tip strings for the Engine's current stage — empty if none set. */
  stageTips: string[];
  /** Feature toggles — Features tab in /outpost-admin. */
  features: FeaturesConfig;
  /** Resolved (class defaults + admin overrides) mechanic settings — Modules tab's per-module gear menu in /outpost-admin. */
  mechanics: {
    campfire: CampfireMechanic;
    gathering: GatheringMechanic;
    prestige: PrestigeMechanic;
    upgrades: UpgradesMechanic;
    survival: SurvivalMechanic;
  };
  /** Health, Hunger, and Hardcore Spawn — see survival.ts. */
  survival: SurvivalState;
  /** Whether survival is switched on (Features tab) and the Engine has reached its stage. */
  survivalActive: boolean;
  /** True while a respawn's trek home is underway — Crafting is out of reach (the Campfire comes along). */
  stranded: boolean;
  /** 0..1 gloom darkness over the Outpost right now (0 while the fire's lit). */
  gloomLevel: number;
  /** A New Moon night on the cycle (or forced by the admin debug tab). */
  gloomNight: boolean;
  /** The admin Engine Debug tab makes every night a gloom night. */
  gloomForced: boolean;
  craftCompass: () => boolean;
  /** "Full survival" or "Casual idle", picked once when the camp opens (null until then). */
  experience: HubState["experience"];
  /** The Engine has reached The Stump and the visitor hasn't picked an experience yet. */
  needsExperienceChoice: boolean;
  chooseExperience: (mode: ExperienceMode) => void;
  settings: HubState["settings"];
  updateSettings: (patch: Partial<HubState["settings"]>) => void;
  legacy: LegacyState;
  /** True once the Engine has reached its final stage (Stage 8). */
  canPrestige: boolean;
  prestigeOutpost: () => boolean;
  buyLegacyPerk: (id: PerkId) => boolean;
  /** Skill Points balance + owned upgrade ids + any custom card order — see upgrade-catalog.ts. */
  upgrades: HubState["upgrades"];
  /** Resolved (catalog defaults + admin cost/tier overrides) Upgrades-shop entries — Upgrades tab in /outpost-admin. */
  upgradeCatalog: UpgradeDef[];
  buyUpgrade: (id: UpgradeId) => boolean;
  /** Moves a card to a new position in the single main-grid order, persisted — only meaningful once "card-reorder" is owned. */
  reorderCard: (from: number, to: number) => void;
  /** Resolved (custom order, else the default) card id order for the main grid. */
  cardOrder: ModuleId[];
};

const AchievementsContext = createContext<AchievementsContextValue | null>(null);

// A classic arrow-key input gesture, not referred to by its usual nickname
// anywhere in this codebase or its UI copy.
const SECRET_SEQUENCE = [
  "ArrowUp",
  "ArrowUp",
  "ArrowDown",
  "ArrowDown",
  "ArrowLeft",
  "ArrowRight",
  "ArrowLeft",
  "ArrowRight",
];

const RESIZE_DEBOUNCE_MS = 300;

// --- The 111-achievement expansion's check engine ---
// Most of the 111 are a simple "metric crosses a threshold" shape; a smaller
// set need real logic (category sweeps, AND-combos, same-session chains,
// capstones). Both run generically off one snapshot (`ExpansionCtx`) built
// fresh after every state change, rather than as ~110 hand-scattered
// `if (x >= n) unlock(...)` calls throughout this file.
type ExpansionCtx = {
  state: HubState;
  /** Achievements that exist right now (admin-removed ones left out, custom ones in). */
  catalog: ActiveCatalog;
  unlockedCount: number;
  unlockedSet: Set<AchievementId>;
  level: number;
  ledger: LedgerProgress;
  sessionUnlocks: number;
  sessionPerfectRounds: number;
  sessionLifetimeXpGained: number;
  sessionSkinChanges: number;
  sessionAnswered: number;
  sessionTabsVisited: Set<Tier2TabId>;
  sessionExported: boolean;
  sessionImported: boolean;
};

const NUMERIC_RULES: { id: AchievementId; at: number; read: (ctx: ExpansionCtx) => number }[] = [
  // Homestead Basics
  { id: "hb-full-tour", at: 5, read: (c) => c.state.tier2.tabsVisited.length },
  { id: "hb-pin-first", at: 1, read: (c) => c.state.tier2.pinChanges },
  { id: "hb-pin-fickle", at: 3, read: (c) => c.state.tier2.pinChanges },
  { id: "hb-skin-first-change", at: 2, read: (c) => c.state.tier2.skinsTried.length },
  { id: "hb-skin-all", at: 4, read: (c) => c.state.tier2.skinsTried.length },
  { id: "hb-lore-half", at: 10, read: (c) => c.state.tier2.loreRevealedLevel },
  { id: "hb-lore-deep", at: 25, read: (c) => c.state.tier2.loreRevealedLevel },
  { id: "hb-activity-25", at: 25, read: (c) => c.state.tier2.totalEventsLogged },
  { id: "hb-activity-100", at: 100, read: (c) => c.state.tier2.totalEventsLogged },
  { id: "hb-export-first", at: 1, read: (c) => c.state.tier2.exportCount },
  { id: "hb-import-first", at: 1, read: (c) => c.state.tier2.importCount },
  // Manual Labor
  { id: "ml-millstone-ii", at: 100, read: (c) => c.state.quiz.totalAnswered },
  { id: "ml-millstone-iii", at: 250, read: (c) => c.state.quiz.totalAnswered },
  { id: "ml-bellows-ii", at: 20, read: (c) => c.state.tier2.patchNotesModeSwitchCount },
  { id: "ml-bellows-iii", at: 50, read: (c) => c.state.tier2.patchNotesModeSwitchCount },
  { id: "ml-turntable-ii", at: 25, read: (c) => c.state.tier2.windowResizeCount },
  { id: "ml-turntable-iii", at: 60, read: (c) => c.state.tier2.windowResizeCount },
  { id: "ml-crank-ii", at: 40, read: (c) => c.state.tier2.themeToggleClicks },
  { id: "ml-crank-iii", at: 80, read: (c) => c.state.tier2.themeToggleClicks },
  { id: "ml-loom-streak", at: 15, read: (c) => c.state.quiz.bestStreak },
  { id: "ml-loom-streak-ii", at: 25, read: (c) => c.state.quiz.bestStreak },
  { id: "ml-reforge-i", at: 1, read: (c) => c.state.tier2.prestigeCount },
  // Soul Forge & Hellfire Forge
  { id: "sf-apprentice", at: 5, read: (c) => c.level },
  { id: "sf-journeyman", at: 10, read: (c) => c.level },
  { id: "sf-tradesman", at: 15, read: (c) => c.level },
  { id: "sf-veteran", at: 20, read: (c) => c.level },
  { id: "sf-legend", at: 30, read: (c) => c.level },
  { id: "sf-prestige-ii", at: 2, read: (c) => c.state.tier2.prestigeCount },
  { id: "sf-prestige-iii", at: 3, read: (c) => c.state.tier2.prestigeCount },
  { id: "sf-perfect-ii", at: 10, read: (c) => c.state.quiz.perfectRounds },
  { id: "sf-perfect-iii", at: 25, read: (c) => c.state.quiz.perfectRounds },
  { id: "sf-streak-50", at: 50, read: (c) => c.state.quiz.bestStreak },
  { id: "sf-lifetime-xp", at: 5000, read: (c) => c.state.tier2.lifetimeXp },
  // Husbandry & Harvest
  { id: "hh-first-catch", at: 5, read: (c) => c.state.tier2.modsGuessedCorrect.length },
  { id: "hh-apiary", at: 15, read: (c) => c.state.tier2.modsGuessedCorrect.length },
  { id: "hh-broody", at: 30, read: (c) => c.state.tier2.modsGuessedCorrect.length },
  { id: "hh-full-harvest", at: 45, read: (c) => c.state.tier2.modsGuessedCorrect.length },
  { id: "hh-compost", at: 10, read: (c) => c.state.tier2.totalDaysVisited },
  { id: "hh-compost-ii", at: 30, read: (c) => c.state.tier2.totalDaysVisited },
  { id: "hh-old-growth", at: 60, read: (c) => c.state.tier2.totalDaysVisited },
  { id: "hh-lay-of-land", at: 3, read: (c) => c.state.tier2.tabsVisited.length },
  { id: "hh-three-piece", at: 3, read: (c) => c.state.tier2.skinsTried.length },
  { id: "hh-full-coop", at: 14, read: (c) => c.state.visits.streakDays },
  // Mob & Moonphase
  { id: "mm-night-watch", at: 1, read: (c) => c.state.tier2.nightVisits },
  { id: "mm-first-light", at: 1, read: (c) => c.state.tier2.dawnVisits },
  { id: "mm-nocturnal", at: 5, read: (c) => c.state.tier2.nightVisits },
  { id: "mm-blood-moon", at: 1, read: (c) => c.state.tier2.fullMoonVisits },
  { id: "mm-off-clock", at: 1, read: (c) => c.state.tier2.weekendVisits },
  { id: "mm-weekend-regular", at: 5, read: (c) => c.state.tier2.weekendVisits },
  { id: "mm-golden-hour", at: 1, read: (c) => c.state.tier2.duskVisits },
  { id: "mm-dusk-regular", at: 5, read: (c) => c.state.tier2.duskVisits },
  { id: "mm-moon-regular", at: 3, read: (c) => c.state.tier2.fullMoonVisits },
  { id: "mm-dawn-regular", at: 5, read: (c) => c.state.tier2.dawnVisits },
  { id: "mm-new-moon", at: 1, read: (c) => c.state.tier2.newMoonVisits },
  // Nether Reachievement
  { id: "nr-milestone-25", at: 25, read: (c) => c.unlockedCount },
  { id: "nr-milestone-50", at: 50, read: (c) => c.unlockedCount },
  { id: "nr-milestone-75", at: 75, read: (c) => c.unlockedCount },
  { id: "nr-milestone-100", at: 100, read: (c) => c.unlockedCount },
  { id: "nr-hundred-days", at: 100, read: (c) => c.state.tier2.totalDaysVisited },
  // RTFM
  { id: "rw-open-5", at: 5, read: (c) => c.state.tier2.patchNotesOpenCount },
  { id: "rw-open-15", at: 15, read: (c) => c.state.tier2.patchNotesOpenCount },
  { id: "rw-open-30", at: 30, read: (c) => c.state.tier2.patchNotesOpenCount },
  { id: "rw-lore-15", at: 15, read: (c) => c.state.tier2.loreRevealedLevel },
  { id: "rw-lore-20", at: 20, read: (c) => c.state.tier2.loreRevealedLevel },
  { id: "rw-quiz-300", at: 300, read: (c) => c.state.quiz.totalAnswered },
  { id: "rw-activity-200", at: 200, read: (c) => c.state.tier2.totalEventsLogged },
  { id: "rw-mode-switch-100", at: 100, read: (c) => c.state.tier2.patchNotesModeSwitchCount },
  { id: "rw-pin-5", at: 5, read: (c) => c.state.tier2.pinChanges },
  { id: "rw-export-5", at: 5, read: (c) => c.state.tier2.exportCount },
  { id: "rw-import-5", at: 5, read: (c) => c.state.tier2.importCount },
  // Bureaucracy & Paperwork
  { id: "bp-skin-swap-5", at: 5, read: (c) => c.state.tier2.skinChangeCount },
  { id: "bp-skin-swap-15", at: 15, read: (c) => c.state.tier2.skinChangeCount },
  { id: "bp-unpinned", at: 1, read: (c) => c.state.tier2.unpinCount },
  { id: "bp-resize-100", at: 100, read: (c) => c.state.tier2.windowResizeCount },
  { id: "bp-toggle-150", at: 150, read: (c) => c.state.tier2.themeToggleClicks },
  { id: "bp-streak-75", at: 75, read: (c) => c.state.quiz.bestStreak },
  { id: "bp-perfect-40", at: 40, read: (c) => c.state.quiz.perfectRounds },
  { id: "bp-activity-500", at: 500, read: (c) => c.state.tier2.totalEventsLogged },
  { id: "bp-prestige-5", at: 5, read: (c) => c.state.tier2.prestigeCount },
  // Hopper Economy (session chains — reuses the same session-unlock counter
  // as the original "Hopper Chain" achievement, just at higher rungs)
  { id: "he-chain-ii", at: 10, read: (c) => c.sessionUnlocks },
  { id: "he-chain-iii", at: 20, read: (c) => c.sessionUnlocks },
  { id: "he-chain-master", at: 30, read: (c) => c.sessionUnlocks },
  // Frontier Record
  { id: "fr-all-flair", at: 20, read: (c) => c.level },
  { id: "fr-lifes-work", at: 20_000, read: (c) => c.state.tier2.lifetimeXp },
  { id: "fr-half-year", at: 180, read: (c) => c.state.tier2.totalDaysVisited },
  { id: "fr-prestige-10", at: 10, read: (c) => c.state.tier2.prestigeCount },
  // The Campfire — stage/count only ever increase in
  // storage (decay is a display-layer computation, see campfire.ts), so a
  // plain threshold read is safe here.
  { id: "campfire-medium", at: 3, read: (c) => c.state.campfire.stage },
  { id: "campfire-overstoked", at: 4, read: (c) => c.state.campfire.stage },
  // Ponder / The Analytical Engine — its own rules live beside its
  // definitions in engine/achievements.ts.
  ...ENGINE_NUMERIC_RULES,
  ...SURVIVAL_NUMERIC_RULES,
];

const COMMUNITY_EDITION_AT = 10;
// Achievements without their own XP value (the easy, early ones) still pay a little.
const DEFAULT_ACHIEVEMENT_XP = 25;

const CUSTOM_RULES: { id: AchievementId; check: (ctx: ExpansionCtx) => boolean }[] = [
  // A flavor milestone: your first ten achievements.
  {
    id: "community-edition",
    check: (c) => c.unlockedCount >= COMMUNITY_EDITION_AT,
  },
  {
    id: "hh-hemp-fields",
    check: (c) => ["patch-notes", "quiz"].every((t) => c.state.tier2.tabsVisited.includes(t)),
  },
  { id: "mm-round-the-clock", check: (c) => c.state.tier2.nightVisits >= 1 && c.state.tier2.dawnVisits >= 1 },
  {
    id: "nr-milestone-all",
    check: (c) => c.unlockedCount >= ALL_HAND_AUTHORED_IDS.length - 1,
  },
  {
    id: "nr-secrets-half",
    check: (c) => {
      const secrets = c.catalog.list.filter((a) => a.secret);
      const have = secrets.filter((a) => c.unlockedSet.has(a.id)).length;
      return secrets.length > 0 && have >= Math.ceil(secrets.length / 2);
    },
  },
  {
    id: "nr-secrets-most",
    check: (c) => {
      const secrets = c.catalog.list.filter((a) => a.secret);
      const have = secrets.filter((a) => c.unlockedSet.has(a.id)).length;
      return secrets.length > 0 && have >= Math.ceil(secrets.length * 0.8);
    },
  },
  {
    id: "nr-category-quiz",
    check: (c) => c.catalog.list.filter((a) => a.category === "quiz").every((a) => c.unlockedSet.has(a.id)),
  },
  {
    id: "nr-category-manual",
    check: (c) => EXPANSION_MANUAL_LABOR_IDS.every((id) => c.unlockedSet.has(id)),
  },
  {
    id: "nr-category-forge",
    check: (c) => EXPANSION_SOUL_FORGE_IDS.every((id) => c.unlockedSet.has(id)),
  },
  {
    id: "bp-paper-trail",
    check: (c) => c.state.tier2.exportCount >= 1 && c.state.tier2.importCount >= 1,
  },
  { id: "bp-tab-hopping", check: (c) => c.sessionTabsVisited.size >= 5 },
  {
    id: "he-explore-session",
    check: (c) => ["patch-notes", "quiz"].every((t) => c.sessionTabsVisited.has(t as Tier2TabId)),
  },
  { id: "he-full-session", check: (c) => c.sessionTabsVisited.size >= TIER2_TAB_IDS.length },
  { id: "he-redstone-clock", check: (c) => c.sessionPerfectRounds >= 2 },
  { id: "he-overclocked", check: (c) => c.sessionLifetimeXpGained >= 500 },
  {
    id: "he-every-day",
    check: (c) => c.state.tier2.weekendVisits >= 1 && c.state.tier2.weekdayVisits >= 1,
  },
  { id: "he-skin-session-swap", check: (c) => c.sessionSkinChanges >= 2 },
  { id: "he-round-trip", check: (c) => c.sessionExported && c.sessionImported },
  { id: "he-quiz-marathon", check: (c) => c.sessionAnswered >= 25 },
  {
    id: "fr-wardrobe-certified",
    check: (c) => c.state.tier2.skinsTried.length >= 4 && c.state.tier2.skinChangeCount >= 20,
  },
  {
    id: "fr-all-categories",
    check: (c) =>
      CATEGORY_ORDER.every(
        (cat) =>
          !c.catalog.list.some((a) => a.category === cat) ||
          c.catalog.list.some((a) => a.category === cat && c.unlockedSet.has(a.id))
      ),
  },
  {
    id: "fr-master-every-trade",
    check: (c) =>
      EXPANSION_MANUAL_LABOR_IDS.every((id) => c.unlockedSet.has(id)) &&
      EXPANSION_SOUL_FORGE_IDS.every((id) => c.unlockedSet.has(id)),
  },
  {
    id: "fr-nothing-hidden",
    check: (c) =>
      c.catalog.list.filter((a) => a.secret && a.id !== "fr-nothing-hidden").every((a) => c.unlockedSet.has(a.id)),
  },
  {
    id: "fr-complete-111",
    check: (c) => EXPANSION_IDS.filter((id) => id !== "fr-complete-111").every((id) => c.unlockedSet.has(id)),
  },
  {
    id: "fr-founding-settler",
    check: (c) =>
      ALL_HAND_AUTHORED_IDS.filter((id) => id !== "fr-founding-settler").every((id) => c.unlockedSet.has(id)),
  },
  { id: "fr-ledger-100", check: (c) => c.ledger.unlockedCount >= 100 },
  ...ENGINE_CUSTOM_RULES,
];

// The engine slice's live value, held at module scope (the Outpost only ever
// mounts one provider) so the save wrapper below can read it without every
// mutator in the provider having to list it as a hook dependency.
const liveEngine: { current: EngineState } = { current: defaultState().engine };

// Every save in the provider goes through this, never saveStateRaw
// directly: it always writes the latest engine slice, so a mutator holding
// an older copy of HubState can't persist a stale Engine over newer progress.
function saveState(next: HubState) {
  saveStateRaw({ ...next, engine: liveEngine.current });
}

export function AchievementsProvider({ children }: { children: React.ReactNode }) {
  const [state, setState] = useState<HubState>(defaultState());
  const [mounted, setMounted] = useState(false);
  const [toasts, setToasts] = useState<ToastInstance[]>([]);
  const unlockedRef = useRef<Set<AchievementId>>(new Set());
  const keyBufferRef = useRef<string[]>([]);
  // Session-scoped (not persisted): counts unlocks since this page load,
  // for "Hopper Chain" (5 unlocks in one visit) and its higher rungs.
  const sessionUnlockCountRef = useRef(0);
  // Persisted counters, mirrored in a ref too so handlers can read/bump
  // them synchronously (same reasoning as unlockedRef below).
  const patchSwitchCountRef = useRef(0);
  const themeClicksRef = useRef(0);
  const resizeCountRef = useRef(0);
  // Session-only tracking for the Hopper Economy category's same-session
  // achievements — never persisted, reset every page load by definition.
  const sessionTabsVisitedRef = useRef<Set<Tier2TabId>>(new Set());
  const sessionExportedRef = useRef(false);
  const sessionImportedRef = useRef(false);
  const mountSnapshotRef = useRef({ perfectRounds: 0, lifetimeXp: 0, skinChangeCount: 0, totalAnswered: 0 });
  // Diffed on every state change to log a Chronicle line only when a Ledger
  // Entry rank actually advances, not on every render.
  const ledgerRanksRef = useRef<Record<LedgerMetricKey, number> | null>(null);
  // Mirrors state.resources/state.tools so mutators that need to check
  // affordability or roll a tool-tier-dependent yield can read the current
  // value synchronously — setState's updater isn't guaranteed to run before
  // the call that scheduled it returns, so it can't be used for that (same
  // reasoning as unlockedRef above).
  const resourcesRef = useRef<ResourceState>(defaultState().resources);
  const toolsRef = useRef<HubState["tools"]>(defaultState().tools);
  // Read synchronously by completeCooking to check the fire's real (decay-
  // aware) stage — same reasoning as resourcesRef/toolsRef. Kept in sync by
  // tendCampfire and the mount effect.
  const campfireRef = useRef<HubState["campfire"]>(defaultState().campfire);
  // Read synchronously by the resource/cooldown/craft-cost mutators below,
  // same reasoning as resourcesRef/toolsRef — perks only change via
  // buyLegacyPerk/prestigeOutpost, both of which update this ref in lockstep
  // with the state they push.
  const legacyRef = useRef<LegacyState>(defaultLegacyState());
  // Read synchronously inside unlock() (Skill Point balance bump) and
  // buyUpgrade/reorderCard (affordability + current card order) — same
  // reasoning as the other refs.
  const upgradesRef = useRef<HubState["upgrades"]>({ skillPoints: 0, purchased: [], cardOrder: null });
  // Read synchronously inside unlock() (a [addXp]-only useCallback) to
  // decide whether to push a toast — same reasoning as the other refs.
  const settingsRef = useRef<HubState["settings"]>(defaultState().settings);
  // Health/Hunger/Hardcore Spawn — read and written synchronously by the
  // survival tick and every mutator that spends hunger or deals damage, same
  // reasoning as the other refs. Its fractional tick accumulators live here
  // between saves; only whole-point changes get persisted.
  const survivalRef = useRef<SurvivalState>(defaultState().survival);
  // The visitor's pick on The Stump's experience screen — survival only
  // ever runs for "survival". Read synchronously by survivalOn().
  const experienceRef = useRef<ExperienceMode | null>(null);
  const [gloomLevel, setGloomLevel] = useState(0);
  const [gloomNight, setGloomNight] = useState(false);
  const [gloomForced, setGloomForced] = useState(false);
  // Admin overrides (tiers/module placement/achievement tiers/tool ladder)
  // load once on mount, same as everything else — the admin panel lives on
  // its own page, so by the time a visitor reaches the Outpost again after
  // editing, this is a fresh mount that picks up the new config naturally.
  const [adminConfig, setAdminConfig] = useState<AdminConfig>(defaultAdminConfig());
  const adminConfigRef = useRef<AdminConfig>(defaultAdminConfig());
  // Which achievements exist (read synchronously by unlock(), so a removed
  // one can never be earned — not even by a direct unlock("id") call).
  const catalogRef = useRef<ActiveCatalog>(BUILTIN_CATALOG);

  // --- Ponder / The Analytical Engine ---
  // The engine slice's single source of truth is this ref: EngineProvider
  // (engine/ui) mutates it through updateEngine, and EVERY save below goes
  // through saveState() here, which always writes the ref's latest engine —
  // so none of the ~30 other mutators in this file can ever persist a stale
  // copy of it over newer progress.
  const engineCfgRef = useRef<EngineConfig>(resolveEngineConfig(undefined));
  const engineFlushTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const currentEngineBuffs = useCallback(
    (): EngineBuffs =>
      computeBuffs(liveEngine.current, engineCfgRef.current, researchEffects(liveEngine.current.research)),
    []
  );
  const commitEngine = useCallback(() => {
    if (engineFlushTimerRef.current) {
      clearTimeout(engineFlushTimerRef.current);
      engineFlushTimerRef.current = null;
    }
    setState((prev) => {
      if (prev.engine === liveEngine.current) return prev;
      const next = { ...prev, engine: liveEngine.current };
      saveStateRaw(next);
      return next;
    });
  }, []);
  const updateEngine = useCallback(
    (fn: (e: EngineState) => EngineState, mode: "now" | "soon" = "now") => {
      const next = fn(liveEngine.current);
      if (next === liveEngine.current) return;
      liveEngine.current = next;
      if (mode === "now") {
        commitEngine();
      } else if (!engineFlushTimerRef.current) {
        engineFlushTimerRef.current = setTimeout(commitEngine, 1500);
      }
    },
    [commitEngine]
  );
  const getEngine = useCallback(() => liveEngine.current, []);
  // A throttled commit must never be lost to a closing tab.
  useEffect(() => {
    function flush() {
      if (engineFlushTimerRef.current) commitEngine();
    }
    function onVisibility() {
      if (document.visibilityState === "hidden") flush();
    }
    window.addEventListener("pagehide", flush);
    document.addEventListener("visibilitychange", onVisibility);
    return () => {
      window.removeEventListener("pagehide", flush);
      document.removeEventListener("visibilitychange", onVisibility);
    };
  }, [commitEngine]);

  const addXp = useCallback((amount: number) => {
    if (amount <= 0) return;
    setState((prev) => {
      const prevLevel = levelForXp(prev.tier2.xp);
      const newXp = prev.tier2.xp + amount;
      const newLevel = levelForXp(newXp);
      const loreRevealedLevel = Math.max(prev.tier2.loreRevealedLevel, newLevel);
      let activityLog = prev.tier2.activityLog;
      let totalEventsLogged = prev.tier2.totalEventsLogged;
      if (newLevel > prevLevel) {
        activityLog = [
          { ts: new Date().toISOString(), text: `Reached Level ${newLevel}` },
          ...activityLog,
        ].slice(0, ACTIVITY_LOG_MAX);
        totalEventsLogged += 1;
      }
      const next = {
        ...prev,
        tier2: {
          ...prev.tier2,
          xp: newXp,
          lifetimeXp: prev.tier2.lifetimeXp + amount,
          loreRevealedLevel,
          activityLog,
          totalEventsLogged,
        },
      };
      saveState(next);
      return next;
    });
  }, []);

  const unlock = useCallback(
    (id: AchievementId) => {
      if (unlockedRef.current.has(id)) return;
      // Removed in /outpost-admin (or unknown): nothing to earn.
      const def = catalogRef.current.byId[id];
      if (!def) return;
      unlockedRef.current.add(id);
      sessionUnlockCountRef.current += 1;
      const timestamp = new Date().toISOString();
      // Skill Points per achievement — the Upgrades shop's passive income
      // (see mechanics.ts's UpgradesMechanic). Bumped in lockstep with the
      // ref, same pattern as every other synchronously-read mutator here.
      const upgradesMechanic = resolvedMechanic<UpgradesMechanic>(adminConfigRef.current, "upgrades");
      upgradesRef.current = {
        ...upgradesRef.current,
        skillPoints: upgradesRef.current.skillPoints + upgradesMechanic.skillPointsPerAchievement,
      };

      setState((prev) => {
        const activityLog = [
          { ts: timestamp, text: `Achievement: ${def.title}` },
          ...prev.tier2.activityLog,
        ].slice(0, ACTIVITY_LOG_MAX);
        const next = {
          ...prev,
          unlocked: { ...prev.unlocked, [id]: timestamp },
          upgrades: upgradesRef.current,
          tier2: { ...prev.tier2, activityLog, totalEventsLogged: prev.tier2.totalEventsLogged + 1 },
        };
        saveState(next);
        return next;
      });
      addXp(def.xp ?? DEFAULT_ACHIEVEMENT_XP);

      if (settingsRef.current.toastsEnabled) {
        setToasts((prev) => [
          ...prev,
          {
            instanceId: `${id}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
            achievementId: id,
          },
        ]);
      }

      // Meta checks, evaluated after this unlock is registered. Each
      // recursive unlock() call is guarded by the same has()-check above,
      // so this can't loop — a meta-achievement can't satisfy its own
      // condition by unlocking itself. (Tier-gate achievements like
      // "community-edition" aren't special-cased here anymore — they run
      // through the generic CUSTOM_RULES sweep below like everything else.)
      if (
        id !== "soul-urn" &&
        unlockedRef.current.has("secret-sequence") &&
        unlockedRef.current.has("secret-logo-clicks")
      ) {
        unlock("soul-urn");
      }
      if (id !== "hopper-chain" && sessionUnlockCountRef.current >= 5) {
        unlock("hopper-chain");
      }
      if (
        id !== "master-smith" &&
        TIER2_NEW_IDS.filter((tid) => tid !== "master-smith").every((tid) =>
          unlockedRef.current.has(tid)
        )
      ) {
        unlock("master-smith");
      }
    },
    [addXp]
  );

  const dismissToast = useCallback((instanceId: string) => {
    setToasts((prev) => prev.filter((t) => t.instanceId !== instanceId));
  }, []);

  const dismissAllToasts = useCallback(() => {
    setToasts([]);
  }, []);

  const updateQuiz = useCallback((updater: (prev: QuizStats) => QuizStats) => {
    setState((prev) => {
      const next = { ...prev, quiz: updater(prev.quiz) };
      saveState(next);
      return next;
    });
  }, []);

  const setSkin = useCallback((skin: SkinId) => {
    setState((prev) => {
      if (prev.tier2.skin === skin) return prev;
      const skinsTried = prev.tier2.skinsTried.includes(skin)
        ? prev.tier2.skinsTried
        : [...prev.tier2.skinsTried, skin];
      const next = {
        ...prev,
        tier2: {
          ...prev.tier2,
          skin,
          skinsTried,
          skinChangeCount: prev.tier2.skinChangeCount + 1,
        },
      };
      saveState(next);
      return next;
    });
  }, []);

  const prestige = useCallback(() => {
    setState((prev) => {
      if (levelForXp(prev.tier2.xp) < PRESTIGE_LEVEL) return prev;
      const next = {
        ...prev,
        tier2: { ...prev.tier2, xp: 0, prestigeCount: prev.tier2.prestigeCount + 1 },
      };
      saveState(next);
      return next;
    });
  }, []);

  const bumpPatchNotesSwitch = useCallback(() => {
    patchSwitchCountRef.current += 1;
    const count = patchSwitchCountRef.current;
    setState((prev) => {
      const next = { ...prev, tier2: { ...prev.tier2, patchNotesModeSwitchCount: count } };
      saveState(next);
      return next;
    });
    if (count >= 5) unlock("bellows-crucible");
  }, [unlock]);

  // Dashboard QoL — unread indicators, "remembers your last tab", pinning.
  const markQuizPlayedToday = useCallback(() => {
    setState((prev) => {
      const today = todayUTC();
      if (prev.tier2.lastQuizPlayedDate === today) return prev;
      const next = { ...prev, tier2: { ...prev.tier2, lastQuizPlayedDate: today } };
      saveState(next);
      return next;
    });
  }, []);

  const markAchievementsSeen = useCallback(() => {
    setState((prev) => {
      if (prev.tier2.lastSeenAchievementCount === unlockedRef.current.size) return prev;
      const next = {
        ...prev,
        tier2: { ...prev.tier2, lastSeenAchievementCount: unlockedRef.current.size },
      };
      saveState(next);
      return next;
    });
  }, []);

  // Right menu's open/closed + active-tab state, doubling as "remembers
  // your last tab" — null means that side is collapsed.
  const setLastTab = useCallback((tab: Tier2TabId | null) => {
    setState((prev) => {
      if (prev.tier2.lastTab === tab) return prev;
      const next = { ...prev, tier2: { ...prev.tier2, lastTab: tab } };
      saveState(next);
      return next;
    });
  }, []);

  // Left menu's equivalent of setLastTab — kept as a separate field/method
  // since the two flanking menus now expand independently of each other.
  const setLeftTab = useCallback((tab: Tier2TabId | null) => {
    setState((prev) => {
      if (prev.tier2.leftTab === tab) return prev;
      const next = { ...prev, tier2: { ...prev.tier2, leftTab: tab } };
      saveState(next);
      return next;
    });
  }, []);

  const setPinnedTab = useCallback((tab: Tier2TabId | null) => {
    setState((prev) => {
      const pinChanges = tab !== null ? prev.tier2.pinChanges + 1 : prev.tier2.pinChanges;
      const unpinCount =
        tab === null && prev.tier2.pinnedTab !== null ? prev.tier2.unpinCount + 1 : prev.tier2.unpinCount;
      const next = { ...prev, tier2: { ...prev.tier2, pinnedTab: tab, pinChanges, unpinCount } };
      saveState(next);
      return next;
    });
  }, []);

  // Ledger-entries-adjacent, real-interaction trackers for the 111
  // expansion. Each is a small, focused setter so the components that call
  // them (Tier2LeftMenu, Tier2RightMenu, GuessTheMod, PatchNotes,
  // Tier2Progression) stay decoupled from how the underlying achievements
  // are computed.
  const recordTabVisit = useCallback((tab: Tier2TabId) => {
    sessionTabsVisitedRef.current.add(tab);
    setState((prev) => {
      if (prev.tier2.tabsVisited.includes(tab)) return prev;
      const next = { ...prev, tier2: { ...prev.tier2, tabsVisited: [...prev.tier2.tabsVisited, tab] } };
      saveState(next);
      return next;
    });
  }, []);

  const recordModGuessCorrect = useCallback((projectId: string) => {
    setState((prev) => {
      if (prev.tier2.modsGuessedCorrect.includes(projectId)) return prev;
      const next = {
        ...prev,
        tier2: { ...prev.tier2, modsGuessedCorrect: [...prev.tier2.modsGuessedCorrect, projectId] },
      };
      saveState(next);
      return next;
    });
  }, []);

  const recordPatchNotesOpen = useCallback(() => {
    setState((prev) => {
      const next = { ...prev, tier2: { ...prev.tier2, patchNotesOpenCount: prev.tier2.patchNotesOpenCount + 1 } };
      saveState(next);
      return next;
    });
  }, []);

  const recordExport = useCallback(() => {
    sessionExportedRef.current = true;
    setState((prev) => {
      const next = { ...prev, tier2: { ...prev.tier2, exportCount: prev.tier2.exportCount + 1 } };
      saveState(next);
      return next;
    });
  }, []);

  // Imports apply in place (no page reload) so same-session achievements
  // like "Round Trip" (export then import) stay detectable. importCount
  // carries forward from THIS browser's current count, not whatever the
  // imported file happened to have. Returns false on a shape it doesn't
  // recognize, so the caller can show an error.
  const importState = useCallback((parsed: unknown): boolean => {
    if (
      typeof parsed !== "object" ||
      parsed === null ||
      (parsed as { version?: unknown }).version !== 1 ||
      typeof (parsed as { unlocked?: unknown }).unlocked !== "object"
    ) {
      return false;
    }
    sessionImportedRef.current = true;
    const incoming = parsed as Partial<HubState>;
    setState((prev) => {
      const base = defaultState();
      const tier2 = {
        ...base.tier2,
        ...incoming.tier2,
        importCount: prev.tier2.importCount + 1,
      };
      const merged: HubState = {
        ...base,
        ...incoming,
        version: 1,
        quiz: { ...base.quiz, ...incoming.quiz },
        modOfDay: { ...base.modOfDay, ...incoming.modOfDay },
        visits: { ...base.visits, ...incoming.visits },
        experience: normalizeExperience(incoming.experience),
        campfire: normalizeCampfire(incoming.campfire),
        resources: { ...base.resources, ...incoming.resources },
        tools: { ...base.tools, ...incoming.tools },
        legacy: {
          ...base.legacy,
          ...incoming.legacy,
          perks: { ...base.legacy.perks, ...incoming.legacy?.perks },
        },
        upgrades: { ...base.upgrades, ...incoming.upgrades },
        engine: normalizeEngineState(incoming.engine),
        survival: {
          ...base.survival,
          ...incoming.survival,
          acc: { ...base.survival.acc, ...incoming.survival?.acc },
        },
        tier2,
        unlocked: { ...incoming.unlocked },
      };
      unlockedRef.current = new Set(Object.keys(merged.unlocked) as AchievementId[]);
      resourcesRef.current = merged.resources;
      toolsRef.current = merged.tools;
      legacyRef.current = merged.legacy;
      campfireRef.current = merged.campfire;
      upgradesRef.current = merged.upgrades;
      survivalRef.current = merged.survival;
      experienceRef.current = merged.experience.mode;
      liveEngine.current = merged.engine;
      saveState(merged);
      return merged;
    });
    return true;
  }, []);

  const updateSettings = useCallback((patch: Partial<HubState["settings"]>) => {
    setState((prev) => {
      const settings = { ...prev.settings, ...patch };
      settingsRef.current = settings;
      const next = { ...prev, settings };
      saveState(next);
      return next;
    });
  }, []);

  // Advances from wherever the fire *currently* is (after decay), not from
  // its last raw stored value — so tending after a long absence starts
  // from the ember you'd actually see, not a stale high stage.
  // The Campfire's decay rate as it stands right now (admin-tuned). Every
  // decay read in this file goes through here so they can never disagree.
  const campfireDecayMinutes = useCallback(
    (): number => resolvedMechanic<CampfireMechanic>(adminConfigRef.current, "campfire").decayMinutes,
    []
  );

  // --- Survival: Health, Hunger, Gloom, Hardcore Spawn (survival.ts) ---
  const survivalMech = useCallback(
    (): SurvivalMechanic => resolvedMechanic<SurvivalMechanic>(adminConfigRef.current, "survival"),
    []
  );
  // On once the Features tab allows it, the Engine reaches its stage (The
  // Stump by default, when the camp opens), and the visitor picked Full
  // survival on the experience screen there.
  const survivalOn = useCallback((): boolean => {
    const f = resolvedFeatures(adminConfigRef.current);
    return experienceRef.current === "survival" && f.survivalEnabled && liveEngine.current.stage >= f.survivalStage;
  }, []);
  const chooseExperience = useCallback((mode: ExperienceMode) => {
    experienceRef.current = mode;
    setState((prev) => {
      const activityLog = [
        {
          ts: new Date().toISOString(),
          text: mode === "survival" ? "Started the journey: Full survival" : "Started the journey: Casual idle",
        },
        ...prev.tier2.activityLog,
      ].slice(0, ACTIVITY_LOG_MAX);
      const next: HubState = {
        ...prev,
        experience: { mode, chosenAt: new Date().toISOString() },
        tier2: { ...prev.tier2, activityLog, totalEventsLogged: prev.tier2.totalEventsLogged + 1 },
      };
      saveState(next);
      return next;
    });
  }, []);
  const strandedNow = useCallback(
    (): boolean => survivalOn() && survivalRef.current.stranded !== null,
    [survivalOn]
  );
  // Persists survivalRef (plus an optional Recent Activity line).
  const commitSurvival = useCallback((logText?: string) => {
    setState((prev) => {
      const activityLog = logText
        ? [{ ts: new Date().toISOString(), text: logText }, ...prev.tier2.activityLog].slice(0, ACTIVITY_LOG_MAX)
        : prev.tier2.activityLog;
      const next: HubState = {
        ...prev,
        survival: survivalRef.current,
        tier2: { ...prev.tier2, activityLog, totalEventsLogged: prev.tier2.totalEventsLogged + (logText ? 1 : 0) },
      };
      saveState(next);
      return next;
    });
  }, []);
  // Hardcore Spawn: respawn somewhere far off, stranded until the trek home
  // finishes, and the clock skips to morning (BTW resets the time on respawn).
  const die = useCallback(
    (cause: DeathCause) => {
      const nowMs = Date.now();
      survivalRef.current = respawn(survivalRef.current, cause, nowMs, survivalMech());
      saveCycleStartedAt(skipToMorning(loadCycleStartedAt(), nowMs));
      const blocks = survivalRef.current.stranded?.blocks ?? 0;
      commitSurvival(`Died to ${DEATH_CAUSE_TEXT[cause]} · woke up ~${blocks.toLocaleString()} blocks from spawn`);
    },
    [commitSurvival, survivalMech]
  );
  // Every Gathering run costs a little hunger; Hunting and Mining can also
  // hurt (rarer with better tools, likelier at night).
  const afterActivity = useCallback(
    (kind: "wood" | "hunting" | "mining") => {
      if (!survivalOn()) return;
      const mech = survivalMech();
      const hungerCost = kind === "wood" ? mech.woodHunger : kind === "hunting" ? mech.huntingHunger : mech.miningHunger;
      survivalRef.current = spendHunger(survivalRef.current, hungerCost);
      let logText: string | undefined;
      if (kind !== "wood") {
        const toolIndex = Math.max(0, resolvedToolOrder(adminConfigRef.current).indexOf(toolsRef.current.tier));
        const night = readEngineDebug().forceNight ?? !computeCyclePhase(loadCycleStartedAt()).isDay;
        const damage = rollActivityDamage(toolIndex, night, mech);
        if (damage > 0) {
          survivalRef.current = applyDamage(survivalRef.current, damage);
          logText = `Took a hit ${kind === "hunting" ? "while hunting" : "in the mine"} (−${formatHalves(damage)} ♥)`;
        }
      }
      // Chopping never hurts, so only a hunt or a dig can land the last blow.
      if (survivalRef.current.health <= 0 && kind !== "wood") {
        die(kind);
        return;
      }
      commitSurvival(logText);
    },
    [commitSurvival, die, survivalMech, survivalOn]
  );

  // The fire goes wherever you do — tending, relighting, and cooking all
  // work out on the trek home too; only Crafting waits for camp.
  const tendCampfire = useCallback((): boolean => {
    if (!campfireRef.current.built) return false;
    const displayedStage = currentCampfireStage(campfireRef.current, campfireDecayMinutes());
    // Relighting a dead fire takes fuel; tending a lit one stays free.
    const relightCost =
      displayedStage === 0 ? resolvedMechanic<CampfireMechanic>(adminConfigRef.current, "campfire").relightWoodCost : 0;
    if (relightCost > 0 && (resourcesRef.current.wood ?? 0) < relightCost) return false;
    const resources =
      relightCost > 0 ? { ...resourcesRef.current, wood: resourcesRef.current.wood - relightCost } : resourcesRef.current;
    resourcesRef.current = resources;
    const nextStage = Math.min(4, displayedStage + 1) as CampfireStage;
    const campfire = { ...campfireRef.current, stage: nextStage, lastTendedAt: new Date().toISOString() };
    campfireRef.current = campfire;
    setState((prev) => {
      const activityLog =
        relightCost > 0
          ? [{ ts: new Date().toISOString(), text: "Relit the fire" }, ...prev.tier2.activityLog].slice(0, ACTIVITY_LOG_MAX)
          : prev.tier2.activityLog;
      const next = {
        ...prev,
        campfire,
        resources,
        tier2: { ...prev.tier2, activityLog, totalEventsLogged: prev.tier2.totalEventsLogged + (relightCost > 0 ? 1 : 0) },
      };
      saveState(next);
      return next;
    });
    return true;
  }, [campfireDecayMinutes]);

  // The Campfire's own craft (2×2 Player Crafting). Crafting waits for camp
  // like every other craft; the fire it makes comes out already lit (Low).
  const craftCampfire = useCallback((): boolean => {
    if (strandedNow() || campfireRef.current.built) return false;
    const cost = resolvedMechanic<CampfireMechanic>(adminConfigRef.current, "campfire").craftWoodCost;
    if ((resourcesRef.current.wood ?? 0) < cost) return false;
    const resources = { ...resourcesRef.current, wood: resourcesRef.current.wood - cost };
    resourcesRef.current = resources;
    const campfire: HubState["campfire"] = { built: true, stage: 2, lastTendedAt: new Date().toISOString() };
    campfireRef.current = campfire;
    setState((prev) => {
      const activityLog = [
        { ts: new Date().toISOString(), text: "Crafted a Campfire" },
        ...prev.tier2.activityLog,
      ].slice(0, ACTIVITY_LOG_MAX);
      const next: HubState = {
        ...prev,
        campfire,
        resources,
        tier2: { ...prev.tier2, activityLog, totalEventsLogged: prev.tier2.totalEventsLogged + 1 },
      };
      saveState(next);
      return next;
    });
    return true;
  }, [strandedNow]);

  // Only succeeds while the fire's real (decay-aware) stage is Medium — the
  // one stage that's ever actually cooked anything, per the campfire's own
  // long-standing flavor text (campfire-stage.ts). Shares the same rest
  // timer as Wood Gathering/Hunting/Mining so it can't be spammed back-to-back.
  const completeCooking = useCallback((): boolean => {
    if (!campfireRef.current.built) return false;
    const campfireMechanic = resolvedMechanic<CampfireMechanic>(adminConfigRef.current, "campfire");
    if (currentCampfireStage(campfireRef.current, campfireDecayMinutes()) !== 3) return false;
    if ((resourcesRef.current.food ?? 0) < campfireMechanic.cookFoodCost) return false;
    const resources = { ...resourcesRef.current };
    resources.food -= campfireMechanic.cookFoodCost;
    resources.cookedFood = (resources.cookedFood ?? 0) + campfireMechanic.cookYield;
    resourcesRef.current = resources;
    // Every meal counts toward the Engine's stage gates.
    updateEngine((e) => ({ ...e, counters: { ...e.counters, mealsCooked: e.counters.mealsCooked + 1 } }), "soon");
    const gatheringMechanic = resolvedMechanic<GatheringMechanic>(adminConfigRef.current, "gathering");
    const cooldownMs = effectiveCooldownMs(gatheringMechanic.activityCooldownMs, legacyRef.current.perks);
    const cooldownUntil = new Date(Date.now() + cooldownMs).toISOString();
    setState((prev) => {
      const activityLog = [
        { ts: new Date().toISOString(), text: "Cooked a meal over the fire" },
        ...prev.tier2.activityLog,
      ].slice(0, ACTIVITY_LOG_MAX);
      const next: HubState = {
        ...prev,
        resources,
        activity: { cooldownUntil },
        tier2: { ...prev.tier2, activityLog, totalEventsLogged: prev.tier2.totalEventsLogged + 1 },
      };
      saveState(next);
      return next;
    });
    return true;
  }, [campfireDecayMinutes, updateEngine]);

  // Unlike every other resource mutator here, deliberately NOT gated behind
  // the shared activity cooldown — eating a meal you already cooked should
  // never make you wait out the same rest timer gathering/cooking uses. Not
  // gated on being stranded either: you carry your food with you. Fills the
  // hunger bar once survival is on, and keeps its small XP bump either way.
  const eatCookedFood = useCallback((): boolean => {
    if ((resourcesRef.current.cookedFood ?? 0) < 1) return false;
    const resources = { ...resourcesRef.current, cookedFood: resourcesRef.current.cookedFood - 1 };
    resourcesRef.current = resources;
    if (survivalOn()) {
      const mech = survivalMech();
      survivalRef.current = eat(survivalRef.current, mech.eatHunger, mech);
    }
    setState((prev) => {
      const activityLog = [
        { ts: new Date().toISOString(), text: "Ate a hot meal" },
        ...prev.tier2.activityLog,
      ].slice(0, ACTIVITY_LOG_MAX);
      const next: HubState = {
        ...prev,
        resources,
        survival: survivalRef.current,
        tier2: { ...prev.tier2, activityLog, totalEventsLogged: prev.tier2.totalEventsLogged + 1 },
      };
      saveState(next);
      return next;
    });
    addXp(resolvedMechanic<CampfireMechanic>(adminConfigRef.current, "campfire").eatXpReward);
    return true;
  }, [addXp, survivalMech, survivalOn]);

  function formatYield(yieldAmounts: Partial<ResourceState>): string {
    const meta = resolvedResourceMeta(adminConfigRef.current);
    return (Object.entries(yieldAmounts) as [ResourceId, number][])
      .map(([id, amount]) => `${amount} ${meta[id].name}`)
      .join(", ");
  }

  // Wood Gathering, Hunting, and Mining all funnel through this — computes the
  // new resource totals synchronously off resourcesRef (so the ref and the
  // persisted state never disagree), sets the shared cooldown, and logs a
  // Recent Activity line.
  const applyResourceGain = useCallback((gain: Partial<ResourceState>, logText: string) => {
    const resources = { ...resourcesRef.current };
    for (const [id, amount] of Object.entries(gain) as [ResourceId, number][]) {
      resources[id] = (resources[id] ?? 0) + amount;
    }
    resourcesRef.current = resources;
    const gatheringMechanic = resolvedMechanic<GatheringMechanic>(adminConfigRef.current, "gathering");
    const cooldownMs = effectiveCooldownMs(gatheringMechanic.activityCooldownMs, legacyRef.current.perks);
    const cooldownUntil = new Date(Date.now() + cooldownMs).toISOString();
    setState((prev) => {
      const activityLog = [
        { ts: new Date().toISOString(), text: logText },
        ...prev.tier2.activityLog,
      ].slice(0, ACTIVITY_LOG_MAX);
      const next: HubState = {
        ...prev,
        resources,
        activity: { cooldownUntil },
        tier2: { ...prev.tier2, activityLog, totalEventsLogged: prev.tier2.totalEventsLogged + 1 },
      };
      saveState(next);
      return next;
    });
  }, []);

  // The Engine's Saw adds to Wood Gathering while powered (engine/buffs.ts).
  const completeWoodGathering = useCallback(() => {
    const { wood } = resolvedCollectAmounts(adminConfigRef.current);
    const buffs = currentEngineBuffs();
    const amount = wood + collectBonus(legacyRef.current.perks) + buffs.sawWood;
    const meta = resolvedResourceMeta(adminConfigRef.current);
    applyResourceGain({ wood: amount }, `Wood Gathering: +${amount} ${meta.wood.name}${buffs.sawPowered ? " (Saw)" : ""}`);
    if (buffs.sawPowered) {
      updateEngine((e) => ({ ...e, counters: { ...e.counters, sawChops: e.counters.sawChops + 1 } }), "soon");
    }
    afterActivity("wood");
  }, [afterActivity, applyResourceGain, currentEngineBuffs, updateEngine]);

  const completeHunting = useCallback(() => {
    const { food } = resolvedCollectAmounts(adminConfigRef.current);
    const amount = food + collectBonus(legacyRef.current.perks);
    const meta = resolvedResourceMeta(adminConfigRef.current);
    applyResourceGain({ food: amount }, `Hunting: +${amount} ${meta.food.name}`);
    afterActivity("hunting");
  }, [afterActivity, applyResourceGain]);

  // Resource bridge for the Engine: spending (parts, commissions, feeding the
  // crank) and granting (Eureka/commission rewards), without the gathering
  // cooldown — same synchronous-ref pattern as craftTool below.
  const spendResources = useCallback((cost: Partial<ResourceState>, logText?: string): boolean => {
    const entries = (Object.entries(cost) as [ResourceId, number][]).filter(([, n]) => n > 0);
    if (!entries.every(([id, n]) => (resourcesRef.current[id] ?? 0) >= n)) return false;
    const resources = { ...resourcesRef.current };
    for (const [id, n] of entries) resources[id] -= n;
    resourcesRef.current = resources;
    setState((prev) => {
      const activityLog = logText
        ? [{ ts: new Date().toISOString(), text: logText }, ...prev.tier2.activityLog].slice(0, ACTIVITY_LOG_MAX)
        : prev.tier2.activityLog;
      const next: HubState = {
        ...prev,
        resources,
        tier2: { ...prev.tier2, activityLog, totalEventsLogged: prev.tier2.totalEventsLogged + (logText ? 1 : 0) },
      };
      saveState(next);
      return next;
    });
    return true;
  }, []);

  const grantResources = useCallback((gain: Partial<ResourceState>, logText?: string) => {
    const resources = { ...resourcesRef.current };
    for (const [id, n] of Object.entries(gain) as [ResourceId, number][]) resources[id] = (resources[id] ?? 0) + n;
    resourcesRef.current = resources;
    setState((prev) => {
      const activityLog = logText
        ? [{ ts: new Date().toISOString(), text: logText }, ...prev.tier2.activityLog].slice(0, ACTIVITY_LOG_MAX)
        : prev.tier2.activityLog;
      const next: HubState = {
        ...prev,
        resources,
        tier2: { ...prev.tier2, activityLog, totalEventsLogged: prev.tier2.totalEventsLogged + (logText ? 1 : 0) },
      };
      saveState(next);
      return next;
    });
  }, []);

  const logActivity = useCallback((text: string) => {
    setState((prev) => {
      const activityLog = [{ ts: new Date().toISOString(), text }, ...prev.tier2.activityLog].slice(0, ACTIVITY_LOG_MAX);
      const next: HubState = {
        ...prev,
        tier2: { ...prev.tier2, activityLog, totalEventsLogged: prev.tier2.totalEventsLogged + 1 },
      };
      saveState(next);
      return next;
    });
  }, []);

  // Rolled off toolsRef (always current) so the caller gets back the exact
  // amounts applied, for its own completion feedback.
  // The Engine's powered Millstones add Stone, its Bellows add to every ore
  // found (engine/buffs.ts).
  const completeMining = useCallback((): Partial<ResourceState> => {
    const order = resolvedToolOrder(adminConfigRef.current);
    const gain = rollMiningYield(toolsRef.current.tier, order);
    const buffs = currentEngineBuffs();
    const helpers: string[] = [];
    if (gain.stone !== undefined && buffs.millStone > 0) {
      gain.stone += buffs.millStone;
      helpers.push("Millstone");
    }
    if (buffs.bellowsOre > 0) {
      let boosted = false;
      for (const ore of ["coal", "copper", "iron"] as const) {
        if (gain[ore] !== undefined) {
          gain[ore] = gain[ore]! + buffs.bellowsOre;
          boosted = true;
        }
      }
      if (boosted) helpers.push("Bellows");
    }
    if (Object.keys(gain).length > 0) {
      applyResourceGain(gain, `Mining: +${formatYield(gain)}${helpers.length ? ` (${helpers.join(", ")})` : ""}`);
    }
    if (helpers.length > 0) {
      updateEngine(
        (e) => ({
          ...e,
          counters: {
            ...e.counters,
            millMines: e.counters.millMines + (helpers.includes("Millstone") ? 1 : 0),
            bellowsMines: e.counters.bellowsMines + (helpers.includes("Bellows") ? 1 : 0),
          },
        }),
        "soon"
      );
    }
    afterActivity("mining");
    return gain;
  }, [afterActivity, applyResourceGain, currentEngineBuffs, updateEngine]);

  // A one-off craft beside the tool ladder: halves every later trek home.
  const craftCompass = useCallback((): boolean => {
    if (strandedNow() || survivalRef.current.compass) return false;
    const mech = survivalMech();
    const cost: Partial<ResourceState> = { iron: mech.compassIron, copper: mech.compassCopper };
    const entries = (Object.entries(cost) as [ResourceId, number][]).filter(([, n]) => n > 0);
    if (!entries.every(([id, n]) => (resourcesRef.current[id] ?? 0) >= n)) return false;
    const resources = { ...resourcesRef.current };
    for (const [id, n] of entries) resources[id] -= n;
    resourcesRef.current = resources;
    survivalRef.current = { ...survivalRef.current, compass: true };
    setState((prev) => {
      const activityLog = [
        { ts: new Date().toISOString(), text: "Crafted a Compass" },
        ...prev.tier2.activityLog,
      ].slice(0, ACTIVITY_LOG_MAX);
      const next: HubState = {
        ...prev,
        resources,
        survival: survivalRef.current,
        tier2: { ...prev.tier2, activityLog, totalEventsLogged: prev.tier2.totalEventsLogged + 1 },
      };
      saveState(next);
      return next;
    });
    return true;
  }, [strandedNow, survivalMech]);

  const craftTool = useCallback((tier: string): boolean => {
    if (strandedNow()) return false;
    const order = resolvedToolOrder(adminConfigRef.current);
    if (nextToolTier(toolsRef.current.tier, order) !== tier) return false;
    const rawCost = resolvedCraftCost(adminConfigRef.current, tier);
    const discount = craftCostDiscount(legacyRef.current.perks);
    const cost = Object.fromEntries(
      (Object.entries(rawCost) as [ResourceId, number][]).map(([id, amount]) => [
        id,
        Math.max(1, amount - discount),
      ])
    ) as Partial<ResourceState>;
    const canAfford = (Object.entries(cost) as [ResourceId, number][]).every(
      ([id, amount]) => (resourcesRef.current[id] ?? 0) >= amount
    );
    if (!canAfford) return false;

    const resources = { ...resourcesRef.current };
    for (const [id, amount] of Object.entries(cost) as [ResourceId, number][]) {
      resources[id] -= amount;
    }
    resourcesRef.current = resources;
    toolsRef.current = { tier };
    const toolName = resolvedToolTiers(adminConfigRef.current).find((t) => t.id === tier)?.name ?? tier;

    setState((prev) => {
      const activityLog = [
        { ts: new Date().toISOString(), text: `Crafted ${toolName}` },
        ...prev.tier2.activityLog,
      ].slice(0, ACTIVITY_LOG_MAX);
      const next: HubState = {
        ...prev,
        resources,
        tools: { tier },
        tier2: { ...prev.tier2, activityLog, totalEventsLogged: prev.tier2.totalEventsLogged + 1 },
      };
      saveState(next);
      return next;
    });
    return true;
  }, [strandedNow]);

  const buyLegacyPerk = useCallback((id: PerkId): boolean => {
    const cost = nextPerkCost(legacyRef.current.perks, id);
    if (cost === null || legacyRef.current.points < cost) return false;
    const perks = { ...legacyRef.current.perks, [id]: (legacyRef.current.perks[id] ?? 0) + 1 };
    legacyRef.current = { ...legacyRef.current, perks, points: legacyRef.current.points - cost };
    setState((prev) => {
      const next = { ...prev, legacy: legacyRef.current };
      saveState(next);
      return next;
    });
    return true;
  }, []);

  // Resets the resource/tool micromanagement loop back to its start (never
  // achievements, tiers, or XP/level — see legacy.ts's file comment) and
  // banks permanent Legacy Points off however far the tool ladder got
  // climbed this loop. Callers gate the button on `canPrestige` themselves;
  // this still no-ops safely if called before that (0 points banked, tools
  // already at/near the start).
  const prestigeOutpost = useCallback((): boolean => {
    const order = resolvedToolOrder(adminConfigRef.current);
    const toolIndex = Math.max(0, order.indexOf(toolsRef.current.tier));
    const prestigeMechanic = resolvedMechanic<PrestigeMechanic>(adminConfigRef.current, "prestige");
    // Bank whatever the Engine earned up to this instant, then dismantle its
    // body — its mind (and lifetime insight, which Borrowed Insight reads)
    // survives. See engine/state.ts's engineOnPrestige.
    const nowMs = Date.now();
    const settled = settle(
      liveEngine.current,
      engineCfgRef.current,
      researchEffects(liveEngine.current.research),
      nowMs
    );
    const pointsEarned =
      pointsForPrestige(toolIndex, prestigeMechanic.pointsPerTier) +
      insightPrestigeBonus(legacyRef.current.perks, settled.lifetimeInsight);
    const startIndex = Math.min(order.length - 1, startingTierIndex(legacyRef.current.perks));
    const startTier = order[startIndex] ?? order[0];

    liveEngine.current = engineOnPrestige(settled, new Date(nowMs).toISOString());
    resourcesRef.current = defaultState().resources;
    toolsRef.current = { tier: startTier };
    legacyRef.current = {
      level: legacyRef.current.level + 1,
      points: legacyRef.current.points + pointsEarned,
      perks: legacyRef.current.perks,
    };
    // A new loop starts fed, healthy, at camp, with no Compass — the
    // lifetime death/trek counters (achievements) carry over.
    const mech = resolvedMechanic<SurvivalMechanic>(adminConfigRef.current, "survival");
    const prevSurvival = survivalRef.current;
    survivalRef.current = {
      ...defaultSurvivalState(mech.maxHealth, mech.maxHunger),
      deaths: prevSurvival.deaths,
      gloomDeaths: prevSurvival.gloomDeaths,
      treksCompleted: prevSurvival.treksCompleted,
    };

    setState((prev) => {
      const activityLog = [
        { ts: new Date().toISOString(), text: `Prestiged the Outpost (Legacy ${legacyRef.current.level})` },
        ...prev.tier2.activityLog,
      ].slice(0, ACTIVITY_LOG_MAX);
      const next: HubState = {
        ...prev,
        resources: resourcesRef.current,
        tools: toolsRef.current,
        activity: { cooldownUntil: null },
        legacy: legacyRef.current,
        survival: survivalRef.current,
        engine: liveEngine.current,
        tier2: { ...prev.tier2, activityLog, totalEventsLogged: prev.tier2.totalEventsLogged + 1 },
      };
      saveState(next);
      return next;
    });
    return true;
  }, []);

  const buyUpgrade = useCallback((id: UpgradeId): boolean => {
    const def = resolvedUpgrade(adminConfigRef.current, id);
    if (!def) return false;
    if (upgradesRef.current.purchased.includes(id)) return false;
    if (liveEngine.current.stage < def.stage) return false;
    if (upgradesRef.current.skillPoints < def.cost) return false;

    const upgrades = {
      ...upgradesRef.current,
      skillPoints: upgradesRef.current.skillPoints - def.cost,
      purchased: [...upgradesRef.current.purchased, id],
    };
    upgradesRef.current = upgrades;
    setState((prev) => {
      const activityLog = [
        { ts: new Date().toISOString(), text: `Unlocked upgrade: ${def.name}` },
        ...prev.tier2.activityLog,
      ].slice(0, ACTIVITY_LOG_MAX);
      const next: HubState = {
        ...prev,
        upgrades,
        tier2: { ...prev.tier2, activityLog, totalEventsLogged: prev.tier2.totalEventsLogged + 1 },
      };
      saveState(next);
      return next;
    });
    return true;
  }, []);

  // Only meaningful once "card-reorder" is owned — the components that call
  // this (HubSection's DraggableSlot) only attach drag handlers at all when
  // that's true, so this doesn't separately re-check ownership. Single flat
  // list now that the main grid is one modular grid (see module-registry.ts's
  // DEFAULT_CARD_ORDER) — a plain splice-out/splice-in, same "move to
  // position `to`, shifting everything between" semantics regardless of
  // where in the grid `to` lands.
  const reorderCard = useCallback((from: number, to: number) => {
    const list = [...(upgradesRef.current.cardOrder ?? DEFAULT_CARD_ORDER)];
    // to === list.length is a valid "move to the end" target (the grid's
    // trailing drop cell) — splice appends there fine. from === to is a
    // no-op (dropped on itself), and so is dropping the already-last card on
    // the trailing end cell — every other from/to pair (including an
    // adjacent forward drop, e.g. index i onto i+1) genuinely reorders the
    // two, since `to` is the target's index in the array as it stood before
    // removal, not after.
    if (
      from < 0 ||
      from >= list.length ||
      to < 0 ||
      to > list.length ||
      from === to ||
      (to === list.length && from === list.length - 1)
    )
      return;
    const [item] = list.splice(from, 1);
    list.splice(to, 0, item);
    upgradesRef.current = { ...upgradesRef.current, cardOrder: list };
    setState((prev) => {
      const next = { ...prev, upgrades: upgradesRef.current };
      saveState(next);
      return next;
    });
  }, []);

  // Load persisted state once on mount, apply the day-streak, fire the
  // visit-related achievements, and check the handful of conditions that
  // only make sense once at page-load (time of day, the lounge timer, the
  // daily XP bonus, and the expansion's real-date/moon-phase trackers).
  //
  // Guarded by a ref (not just the empty dep array) because React's dev-only
  // StrictMode double-invokes effects: without this, the second invocation
  // re-reads localStorage before the first invocation's saveState() (queued
  // inside unlock()'s setState updater) has actually flushed, clobbering
  // unlockedRef.current back to a state that doesn't have "first-visit" yet
  // — which then unlocks it a second time and shows its toast twice. This
  // makes the whole block run exactly once per real mount, full stop.
  const didInitRef = useRef(false);
  useEffect(() => {
    if (didInitRef.current) return;
    didInitRef.current = true;

    const loaded = loadState();
    const hadVisitedToday = loaded.visits.lastVisitDate === todayUTC();
    const visits = applyVisit(loaded.visits);
    const now = new Date();
    const hour = now.getHours();

    let tier2 = { ...loaded.tier2 };
    if (tier2.skinsTried.length === 0) tier2.skinsTried = [tier2.skin];
    if (!hadVisitedToday) {
      tier2 = {
        ...tier2,
        totalDaysVisited: tier2.totalDaysVisited + 1,
        nightVisits: tier2.nightVisits + (hour < 4 ? 1 : 0),
        dawnVisits: tier2.dawnVisits + (hour >= 5 && hour < 7 ? 1 : 0),
        duskVisits: tier2.duskVisits + (hour >= 18 && hour < 20 ? 1 : 0),
        weekendVisits: tier2.weekendVisits + (isWeekend(now) ? 1 : 0),
        weekdayVisits: tier2.weekdayVisits + (isWeekend(now) ? 0 : 1),
        fullMoonVisits: tier2.fullMoonVisits + (isFullMoon(now) ? 1 : 0),
        newMoonVisits: tier2.newMoonVisits + (isNewMoon(now) ? 1 : 0),
      };
    }

    const next = { ...loaded, visits, tier2 };
    unlockedRef.current = new Set(Object.keys(next.unlocked) as AchievementId[]);
    resourcesRef.current = next.resources;
    toolsRef.current = next.tools;
    legacyRef.current = next.legacy;
    campfireRef.current = next.campfire;
    upgradesRef.current = next.upgrades;
    settingsRef.current = next.settings;
    liveEngine.current = next.engine;
    // A save can't hold a dead visitor (death respawns on the spot), but
    // guard anyway so a hand-edited or imported save never starts at 0.
    if (next.survival.health <= 0) next.survival = { ...next.survival, health: 1 };
    survivalRef.current = next.survival;
    experienceRef.current = next.experience.mode;
    const loadedAdminConfig = loadAdminConfig();
    adminConfigRef.current = loadedAdminConfig;
    catalogRef.current = resolvedAchievementCatalog(loadedAdminConfig);
    engineCfgRef.current = resolveEngineConfig(loadedAdminConfig.engine);
    setAdminConfig(loadedAdminConfig);
    patchSwitchCountRef.current = loaded.tier2.patchNotesModeSwitchCount;
    themeClicksRef.current = loaded.tier2.themeToggleClicks;
    resizeCountRef.current = loaded.tier2.windowResizeCount;
    mountSnapshotRef.current = {
      perfectRounds: loaded.quiz.perfectRounds,
      lifetimeXp: loaded.tier2.lifetimeXp,
      skinChangeCount: loaded.tier2.skinChangeCount,
      totalAnswered: loaded.quiz.totalAnswered,
    };
    saveState(next);
    setState(next);
    setMounted(true);

    unlock("first-visit");
    if (visits.streakDays >= 2) unlock("visit-streak-2");
    if (visits.streakDays >= 7) unlock("broody-hen-7day");

    const isDark = document.documentElement.getAttribute("data-theme") === "dark";
    if (hour < 5 && isDark) unlock("hardcore-darkness");

    if (!hadVisitedToday) addXp(XP_PER_DAILY_VISIT);

    const loungeTimer = setTimeout(() => unlock("outpost-lounging"), 30_000);
    return () => clearTimeout(loungeTimer);
    // `unlock`/`addXp` are stable (see their own useCallbacks).
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Easter egg 1: the arrow-key gesture. Only listens while this pane is
  // mounted, matching the rest of the hub's "everything lives in the pane"
  // scope.
  useEffect(() => {
    function onKeyDown(e: KeyboardEvent) {
      const target = e.target as HTMLElement | null;
      if (target && /^(input|textarea|select)$/i.test(target.tagName)) return;

      const buffer = [...keyBufferRef.current, e.key].slice(-SECRET_SEQUENCE.length);
      keyBufferRef.current = buffer;
      if (
        buffer.length === SECRET_SEQUENCE.length &&
        buffer.every((k, i) => k === SECRET_SEQUENCE[i])
      ) {
        keyBufferRef.current = [];
        unlock("secret-sequence");
      }
    }
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [unlock]);

  // Secrets found on other pages: the header wolf logo (Header.tsx) and
  // scrolling the homepage to the bottom (OutpostTeaser.tsx). They queue
  // their find (see bridge-storage.ts) and fire this event; the queue is
  // drained here on mount and on the event — neither ever touches the main
  // save, this provider is its writer.
  useEffect(() => {
    function drainSecrets() {
      for (const id of takeQueuedSecrets()) {
        if (id === "secret-logo-clicks" || id === "rope-grapple") unlock(id);
      }
    }
    drainSecrets();
    window.addEventListener("btwr-secret-logo", drainSecrets);
    return () => window.removeEventListener("btwr-secret-logo", drainSecrets);
  }, [unlock]);

  // Tier 2 egg: the theme toggle lives in Header.tsx, outside this
  // provider's subtree — same decoupled dispatch pattern as the logo click.
  useEffect(() => {
    function onThemeToggleClick() {
      themeClicksRef.current += 1;
      const count = themeClicksRef.current;
      setState((prev) => {
        const next = { ...prev, tier2: { ...prev.tier2, themeToggleClicks: count } };
        saveState(next);
        return next;
      });
      if (count >= 1) unlock("theme-toggle-used");
      if (count >= 15) unlock("hand-cranked");
    }
    window.addEventListener("btwr-theme-toggle-click", onThemeToggleClick);
    return () => window.removeEventListener("btwr-theme-toggle-click", onThemeToggleClick);
  }, [unlock]);

  // Tier 2 egg: resize the window 10 separate times. Debounced so one drag
  // (which fires dozens of resize events) only counts once.
  useEffect(() => {
    let debounceTimer: ReturnType<typeof setTimeout> | null = null;
    function onResize() {
      if (debounceTimer) clearTimeout(debounceTimer);
      debounceTimer = setTimeout(() => {
        resizeCountRef.current += 1;
        const count = resizeCountRef.current;
        setState((prev) => {
          const next = { ...prev, tier2: { ...prev.tier2, windowResizeCount: count } };
          saveState(next);
          return next;
        });
        if (count >= 1) unlock("window-resized-once");
        if (count >= 10) unlock("windmill-watcher");
      }, RESIZE_DEBOUNCE_MS);
    }
    window.addEventListener("resize", onResize);
    return () => {
      window.removeEventListener("resize", onResize);
      if (debounceTimer) clearTimeout(debounceTimer);
    };
  }, [unlock]);

  // Survival's heartbeat. Ticks once a second, but only counts time while
  // this tab is actually visible — nothing drains while the Outpost is
  // closed or in the background, so a visitor can never come back dead.
  // Also runs the trek-home check, the gloom darkness, and the one-time
  // grant of the Day/Night Cycle upgrade (gloom needs its nights).
  useEffect(() => {
    if (!mounted) return;
    let lastMs = Date.now();
    function tick() {
      const nowMs = Date.now();
      // Capped so a throttled/suspended timer can't land one big lump of damage.
      const dtMs = document.visibilityState === "visible" ? Math.min(5000, nowMs - lastMs) : 0;
      lastMs = nowMs;

      const debug = readEngineDebug();
      if (debug.killNow || debug.finishTrek) {
        writeEngineDebug({ ...debug, killNow: undefined, finishTrek: undefined });
      }
      if (debug.finishTrek && survivalRef.current.stranded) {
        survivalRef.current = {
          ...survivalRef.current,
          stranded: { ...survivalRef.current.stranded, trekEndsAt: new Date(nowMs).toISOString() },
        };
      }
      // Always checked, even with survival off, so a trek never gets stuck.
      const back = completeTrekIfDone(survivalRef.current, nowMs);
      if (back) {
        survivalRef.current = back;
        commitSurvival("Found your way back to camp");
      }

      if (!survivalOn()) {
        setGloomLevel(0);
        setGloomNight(false);
        setGloomForced(false);
        return;
      }

      if (!upgradesRef.current.purchased.includes("day-night-cycle")) {
        upgradesRef.current = {
          ...upgradesRef.current,
          purchased: [...upgradesRef.current.purchased, "day-night-cycle"],
        };
        setState((prev) => {
          const activityLog = [
            { ts: new Date().toISOString(), text: "Nights matter now: the day/night cycle turns on its own" },
            ...prev.tier2.activityLog,
          ].slice(0, ACTIVITY_LOG_MAX);
          const next = {
            ...prev,
            upgrades: upgradesRef.current,
            tier2: { ...prev.tier2, activityLog, totalEventsLogged: prev.tier2.totalEventsLogged + 1 },
          };
          saveState(next);
          return next;
        });
      }

      if (debug.killNow) {
        die("starvation");
        return;
      }

      // The admin debug flag makes every night a New Moon night — never the
      // day: gloom only ever falls after sunset.
      const cyclePhase = computeCyclePhase(loadCycleStartedAt(), nowMs);
      const phase = debug.forceGloom ? { ...cyclePhase, moonPhaseIndex: 0 } : cyclePhase;
      const gloom = isGloomNight(phase);
      setGloomForced(debug.forceGloom === true);
      // Only a lit fire keeps the gloom off — wherever you are, since the
      // Campfire goes with you. No fire crafted yet means no shelter at all.
      const sheltered =
        campfireRef.current.built &&
        currentCampfireStage(campfireRef.current, campfireDecayMinutes(), new Date(nowMs)) > 0;
      const shown = sheltered ? 0 : Math.round(gloomDarkness(phase) * 100) / 100;
      setGloomLevel(shown);
      setGloomNight(gloom);

      if (dtMs <= 0) return;
      const before = survivalRef.current;
      const { state: after, died } = tickVitals(before, dtMs, { gloomNight: gloom, fireLit: sheltered }, survivalMech());
      survivalRef.current = after;
      if (died) {
        die(died);
      } else if (after.health !== before.health || after.hunger !== before.hunger) {
        commitSurvival();
      }
    }
    const id = window.setInterval(tick, 1000);
    return () => window.clearInterval(id);
  }, [mounted, campfireDecayMinutes, commitSurvival, die, survivalMech, survivalOn]);

  // The expansion's check engine — re-evaluates every numeric/custom rule
  // (and the Ledger Entries rank table) after each state change. unlock()
  // is idempotent, so re-checking already-unlocked ids is harmless; this is
  // what lets ~110 achievements share one small table instead of a call
  // site at every counter bump.
  useEffect(() => {
    if (!mounted) return;
    const level = levelForXp(state.tier2.xp);
    const ledger = computeLedgerProgress(state);
    const ctx: ExpansionCtx = {
      state,
      catalog: catalogRef.current,
      unlockedCount: unlockedRef.current.size,
      unlockedSet: unlockedRef.current,
      level,
      ledger,
      sessionUnlocks: sessionUnlockCountRef.current,
      sessionPerfectRounds: state.quiz.perfectRounds - mountSnapshotRef.current.perfectRounds,
      sessionLifetimeXpGained: state.tier2.lifetimeXp - mountSnapshotRef.current.lifetimeXp,
      sessionSkinChanges: state.tier2.skinChangeCount - mountSnapshotRef.current.skinChangeCount,
      sessionAnswered: state.quiz.totalAnswered - mountSnapshotRef.current.totalAnswered,
      sessionTabsVisited: sessionTabsVisitedRef.current,
      sessionExported: sessionExportedRef.current,
      sessionImported: sessionImportedRef.current,
    };

    for (const rule of NUMERIC_RULES) {
      if (!unlockedRef.current.has(rule.id) && rule.read(ctx) >= rule.at) unlock(rule.id);
    }
    for (const rule of CUSTOM_RULES) {
      if (!unlockedRef.current.has(rule.id) && rule.check(ctx)) unlock(rule.id);
    }
    // Achievements added in /outpost-admin, each with its own rule.
    for (const a of ctx.catalog.custom) {
      if (!unlockedRef.current.has(a.id) && customTriggerMet(a, ctx, ctx.catalog)) unlock(a.id);
    }

    // Ledger Entries — log a Chronicle line only for newly-crossed ranks,
    // not a toast per rank (there are up to 975 of these).
    const prevRanks = ledgerRanksRef.current;
    const nextRanks = ledgerRankSnapshot(state);
    if (prevRanks) {
      const crossed: string[] = [];
      for (const m of ledger.perMetric) {
        if (nextRanks[m.key] > prevRanks[m.key]) {
          crossed.push(ledgerEntryTitle(m.noun, nextRanks[m.key]));
        }
      }
      if (crossed.length > 0) {
        setState((prev) => {
          const lines = crossed.map((title) => ({ ts: new Date().toISOString(), text: `Ledger: ${title}` }));
          const activityLog = [...lines, ...prev.tier2.activityLog].slice(0, ACTIVITY_LOG_MAX);
          const next = {
            ...prev,
            tier2: {
              ...prev.tier2,
              activityLog,
              totalEventsLogged: prev.tier2.totalEventsLogged + crossed.length,
            },
          };
          saveState(next);
          return next;
        });
      }
    }
    ledgerRanksRef.current = nextRanks;
  }, [state, mounted, unlock]);

  const ledgerProgress = useMemo(() => computeLedgerProgress(state), [state]);

  const engineStage = state.engine.stage;
  const moduleStage = useCallback((id: ModuleId): number => resolvedModuleStage(adminConfig, id), [adminConfig]);
  const isModuleEnabled = useCallback((id: ModuleId): boolean => !isModuleDisabled(adminConfig, id), [adminConfig]);
  const isModuleRevealed = useCallback(
    (id: ModuleId): boolean => !isModuleDisabled(adminConfig, id) && engineStage >= resolvedModuleStage(adminConfig, id),
    [adminConfig, engineStage]
  );
  const catalog = useMemo(() => resolvedAchievementCatalog(adminConfig), [adminConfig]);
  const achievementTree = useMemo(() => resolvedAchievementTree(adminConfig, catalog), [adminConfig, catalog]);
  // Rebuilt whenever the save's unlocks change (unlockedRef itself is mutated in place).
  const shownUnlocked = useMemo(() => {
    const all = unlockedRef.current;
    if (adminConfig.removedAchievements.length === 0) return all;
    return new Set([...all].filter((id) => catalog.byId[id]));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [catalog, adminConfig.removedAchievements, state.unlocked]);
  const toolTiersList = useMemo(() => resolvedToolTiers(adminConfig), [adminConfig]);
  const craftCostFor = useCallback(
    (tierId: string) => resolvedCraftCost(adminConfig, tierId),
    [adminConfig]
  );
  const resourceMetaResolved = useMemo(() => resolvedResourceMeta(adminConfig), [adminConfig]);
  const featuresResolved = useMemo(() => resolvedFeatures(adminConfig), [adminConfig]);
  const upgradeCatalogResolved = useMemo(() => resolvedUpgrades(adminConfig), [adminConfig]);
  const engineConfig = useMemo(() => resolveEngineConfig(adminConfig.engine), [adminConfig]);
  const engineBuffs = useMemo(
    () => computeBuffs(state.engine, engineConfig, researchEffects(state.engine.research)),
    [state.engine, engineConfig]
  );
  const mechanicsResolved = useMemo(() => {
    return {
      campfire: resolvedMechanic<CampfireMechanic>(adminConfig, "campfire"),
      gathering: resolvedMechanic<GatheringMechanic>(adminConfig, "gathering"),
      prestige: resolvedMechanic<PrestigeMechanic>(adminConfig, "prestige"),
      upgrades: resolvedMechanic<UpgradesMechanic>(adminConfig, "upgrades"),
      survival: resolvedMechanic<SurvivalMechanic>(adminConfig, "survival"),
    };
  }, [adminConfig]);
  const stageTipsResolved = useMemo(() => resolvedStageTips(adminConfig, engineStage), [adminConfig, engineStage]);
  const canPrestige = engineStage >= 8;
  // The camp's open (survival's stage) with survival switched on: time to
  // ask how the visitor wants to play (ExperiencePicker.tsx), once.
  const survivalReached =
    mounted && featuresResolved.survivalEnabled && engineStage >= featuresResolved.survivalStage;
  const needsExperienceChoice = survivalReached && state.experience.mode === null;
  const survivalActive = survivalReached && state.experience.mode === "survival";

  const value: AchievementsContextValue = {
    mounted,
    achievements: catalog.list,
    achievementsById: catalog.byId,
    unlocked: shownUnlocked,
    unlockedAt: state.unlocked,
    unlock,
    toasts,
    dismissToast,
    dismissAllToasts,
    quiz: state.quiz,
    updateQuiz,
    visits: state.visits,
    tier2: state.tier2,
    xpInfo: xpProgress(state.tier2.xp),
    ledgerProgress,
    addXp,
    setSkin,
    prestige,
    bumpPatchNotesSwitch,
    markQuizPlayedToday,
    markAchievementsSeen,
    setLastTab,
    setLeftTab,
    setPinnedTab,
    recordTabVisit,
    recordModGuessCorrect,
    recordPatchNotesOpen,
    recordExport,
    importState,
    engine: state.engine,
    getEngine,
    updateEngine,
    engineConfig,
    engineBuffs,
    spendResources,
    grantResources,
    logActivity,
    campfire: state.campfire,
    tendCampfire,
    craftCampfire,
    completeCooking,
    eatCookedFood,
    resources: state.resources,
    tools: state.tools,
    activityCooldownUntil: state.activity.cooldownUntil,
    completeWoodGathering: completeWoodGathering,
    completeHunting,
    completeMining,
    craftTool,
    moduleStage,
    isModuleEnabled,
    isModuleRevealed,
    achievementTree,
    toolTiersList,
    craftCostFor,
    resourceMeta: resourceMetaResolved,
    stageTips: stageTipsResolved,
    features: featuresResolved,
    mechanics: mechanicsResolved,
    settings: state.settings,
    updateSettings,
    legacy: state.legacy,
    canPrestige,
    prestigeOutpost,
    buyLegacyPerk,
    upgrades: state.upgrades,
    upgradeCatalog: upgradeCatalogResolved,
    buyUpgrade,
    reorderCard,
    cardOrder: state.upgrades.cardOrder ?? DEFAULT_CARD_ORDER,
    survival: state.survival,
    survivalActive,
    stranded: survivalActive && state.survival.stranded !== null,
    gloomLevel: survivalActive ? gloomLevel : 0,
    gloomNight: survivalActive && gloomNight,
    gloomForced: survivalActive && gloomForced,
    craftCompass,
    experience: state.experience,
    needsExperienceChoice,
    chooseExperience,
  };

  return (
    <AchievementsContext.Provider value={value}>{children}</AchievementsContext.Provider>
  );
}

export function useAchievements() {
  const ctx = useContext(AchievementsContext);
  if (!ctx) {
    throw new Error("useAchievements must be used within AchievementsProvider");
  }
  return ctx;
}
