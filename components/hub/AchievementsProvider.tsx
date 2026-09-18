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
  ACHIEVEMENTS,
  ACHIEVEMENTS_BY_ID,
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
  saveState,
  todayUTC,
  type HubState,
  type QuizStats,
  type Tier2State,
} from "./hub-storage";
import { currentCampfireStage, type CampfireStage } from "./campfire-stage";
import {
  collectBonus,
  craftCostDiscount,
  defaultLegacyState,
  effectiveCooldownMs,
  nextPerkCost,
  pointsForPrestige,
  startingTierIndex,
  type LegacyState,
  type PerkId,
} from "./legacy";
import {
  ACTIVITY_COOLDOWN_MS,
  COOK_FOOD_COST,
  COOK_YIELD,
  EAT_XP_REWARD,
  nextToolTier,
  rollMiningYield,
  type ResourceId,
  type ResourceState,
} from "./resources";
import {
  currentTierId,
  defaultAdminConfig,
  loadAdminConfig,
  resolvedCollectAmounts,
  resolvedCraftCost,
  resolvedFeatures,
  resolvedModuleTier,
  resolvedResourceMeta,
  resolvedTierTips,
  resolvedTiers,
  resolvedToolOrder,
  resolvedToolTiers,
  tierThreshold,
  type AdminConfig,
  type FeaturesConfig,
  type TierDef,
} from "./admin-config";
import { DEFAULT_MODULE_TIER, type ModuleId } from "./module-registry";
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
  unlocked: Set<AchievementId>;
  unlock: (id: AchievementId) => void;
  toasts: ToastInstance[];
  dismissToast: (instanceId: string) => void;
  quiz: QuizStats;
  updateQuiz: (updater: (prev: QuizStats) => QuizStats) => void;
  visits: HubState["visits"];
  /** True once all 12 tier-1 achievements are done (community-edition granted). */
  tier2Unlocked: boolean;
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
  campfire: HubState["campfire"];
  tendCampfire: () => void;
  /** Only succeeds while the fire is at the Medium stage and there's enough Food — see resources.ts. */
  completeCooking: () => boolean;
  eatCookedFood: () => boolean;
  firstIronTool: HubState["firstIronTool"];
  chooseIronTool: (toolId: string) => void;
  resources: HubState["resources"];
  tools: HubState["tools"];
  activityCooldownUntil: string | null;
  completeTreeMining: () => void;
  completeHunting: () => void;
  completeMining: () => Partial<ResourceState>;
  craftTool: (tier: string) => boolean;
  /** Resolved (default + admin-override) tier list, ascending by threshold. */
  tiers: TierDef[];
  isTierUnlocked: (tierId: string) => boolean;
  moduleTierId: (id: ModuleId) => string;
  achievementTierId: (id: AchievementId) => string;
  toolTiersList: ReturnType<typeof resolvedToolTiers>;
  craftCostFor: (tierId: string) => Partial<ResourceState>;
  resourceMeta: ReturnType<typeof resolvedResourceMeta>;
  /** Tip strings for whichever tier the visitor has currently reached — empty if none set. */
  tierTips: string[];
  /** Feature toggles + their tier gates — Features tab in /outpost-admin. */
  features: FeaturesConfig;
  settings: HubState["settings"];
  updateSettings: (patch: Partial<HubState["settings"]>) => void;
  legacy: LegacyState;
  /** True once the visitor has reached the Outpost's highest configured tier. */
  canPrestige: boolean;
  prestigeOutpost: () => boolean;
  buyLegacyPerk: (id: PerkId) => boolean;
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

const SCROLL_BOTTOM_THRESHOLD_PX = 4;
const RESIZE_DEBOUNCE_MS = 300;

// --- The 111-achievement expansion's check engine ---
// Most of the 111 are a simple "metric crosses a threshold" shape; a smaller
// set need real logic (category sweeps, AND-combos, same-session chains,
// capstones). Both run generically off one snapshot (`ExpansionCtx`) built
// fresh after every state change, rather than as ~110 hand-scattered
// `if (x >= n) unlock(...)` calls throughout this file.
type ExpansionCtx = {
  state: HubState;
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
  // The Campfire / Your First Iron Tool — stage/count only ever increase in
  // storage (decay is a display-layer computation, see campfire.ts), so a
  // plain threshold read is safe here.
  { id: "campfire-medium", at: 3, read: (c) => c.state.campfire.stage },
  { id: "campfire-overstoked", at: 4, read: (c) => c.state.campfire.stage },
  { id: "iron-tool-completionist", at: 8, read: (c) => c.state.firstIronTool.triedTools.length },
];

const CUSTOM_RULES: { id: AchievementId; check: (ctx: ExpansionCtx) => boolean }[] = [
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
      const secrets = ACHIEVEMENTS.filter((a) => a.secret);
      const have = secrets.filter((a) => c.unlockedSet.has(a.id)).length;
      return secrets.length > 0 && have >= Math.ceil(secrets.length / 2);
    },
  },
  {
    id: "nr-secrets-most",
    check: (c) => {
      const secrets = ACHIEVEMENTS.filter((a) => a.secret);
      const have = secrets.filter((a) => c.unlockedSet.has(a.id)).length;
      return secrets.length > 0 && have >= Math.ceil(secrets.length * 0.8);
    },
  },
  {
    id: "nr-category-quiz",
    check: (c) => ACHIEVEMENTS.filter((a) => a.category === "quiz").every((a) => c.unlockedSet.has(a.id)),
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
  { id: "iron-tool-chosen", check: (c) => c.state.firstIronTool.choice !== null },
  {
    id: "fr-wardrobe-certified",
    check: (c) => c.state.tier2.skinsTried.length >= 4 && c.state.tier2.skinChangeCount >= 20,
  },
  {
    id: "fr-all-categories",
    check: (c) =>
      CATEGORY_ORDER.every((cat) => ACHIEVEMENTS.some((a) => a.category === cat && c.unlockedSet.has(a.id))),
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
      ACHIEVEMENTS.filter((a) => a.secret && a.id !== "fr-nothing-hidden").every((a) => c.unlockedSet.has(a.id)),
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
];

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
  // Read synchronously inside unlock() (a [addXp]-only useCallback) to
  // decide whether to push a toast — same reasoning as the other refs.
  const settingsRef = useRef<HubState["settings"]>(defaultState().settings);
  // Admin overrides (tiers/module placement/achievement tiers/tool ladder)
  // load once on mount, same as everything else — the admin panel lives on
  // its own page, so by the time a visitor reaches the homepage again after
  // editing, this is a fresh mount that picks up the new config naturally.
  const [adminConfig, setAdminConfig] = useState<AdminConfig>(defaultAdminConfig());
  const tiersRef = useRef<TierDef[]>(defaultAdminConfig().tiers);
  const adminConfigRef = useRef<AdminConfig>(defaultAdminConfig());

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
      unlockedRef.current.add(id);
      sessionUnlockCountRef.current += 1;
      const timestamp = new Date().toISOString();
      const def = ACHIEVEMENTS_BY_ID[id];

      setState((prev) => {
        const activityLog = [
          { ts: timestamp, text: `Achievement: ${def?.title ?? id}` },
          ...prev.tier2.activityLog,
        ].slice(0, ACTIVITY_LOG_MAX);
        const next = {
          ...prev,
          unlocked: { ...prev.unlocked, [id]: timestamp },
          tier2: { ...prev.tier2, activityLog, totalEventsLogged: prev.tier2.totalEventsLogged + 1 },
        };
        saveState(next);
        return next;
      });
      if (def?.xp) addXp(def.xp);

      if (settingsRef.current.toastsEnabled) {
        setToasts((prev) => [
          ...prev,
          {
            instanceId: `${id}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
            achievementId: id,
          },
        ]);
      }

      // Meta / tier-gate checks, evaluated after this unlock is registered.
      // Each recursive unlock() call is guarded by the same has()-check
      // above, so this can't loop — a meta-achievement can't satisfy its
      // own condition by unlocking itself.
      const tier2Threshold = tiersRef.current.find((t) => t.id === "tier2")?.threshold ?? 35;
      if (id !== "community-edition" && unlockedRef.current.size >= tier2Threshold) {
        unlock("community-edition");
      }
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
        campfire: { ...base.campfire, ...incoming.campfire },
        firstIronTool: { ...base.firstIronTool, ...incoming.firstIronTool },
        resources: { ...base.resources, ...incoming.resources },
        tools: { ...base.tools, ...incoming.tools },
        legacy: {
          ...base.legacy,
          ...incoming.legacy,
          perks: { ...base.legacy.perks, ...incoming.legacy?.perks },
        },
        tier2,
        unlocked: { ...incoming.unlocked },
      };
      unlockedRef.current = new Set(Object.keys(merged.unlocked) as AchievementId[]);
      resourcesRef.current = merged.resources;
      toolsRef.current = merged.tools;
      legacyRef.current = merged.legacy;
      campfireRef.current = merged.campfire;
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
  const tendCampfire = useCallback(() => {
    const displayedStage = currentCampfireStage(campfireRef.current);
    const nextStage = Math.min(4, displayedStage + 1) as CampfireStage;
    const campfire = { stage: nextStage, lastTendedAt: new Date().toISOString() };
    campfireRef.current = campfire;
    setState((prev) => {
      const next = { ...prev, campfire };
      saveState(next);
      return next;
    });
  }, []);

  // Only succeeds while the fire's real (decay-aware) stage is Medium — the
  // one stage that's ever actually cooked anything, per the campfire's own
  // long-standing flavor text (campfire-stage.ts). Shares the same rest
  // timer as Tree Mining/Hunting/Mining so it can't be spammed back-to-back.
  const completeCooking = useCallback((): boolean => {
    if (currentCampfireStage(campfireRef.current) !== 3) return false;
    if ((resourcesRef.current.food ?? 0) < COOK_FOOD_COST) return false;
    const resources = { ...resourcesRef.current };
    resources.food -= COOK_FOOD_COST;
    resources.cookedFood = (resources.cookedFood ?? 0) + COOK_YIELD;
    resourcesRef.current = resources;
    const cooldownMs = effectiveCooldownMs(ACTIVITY_COOLDOWN_MS, legacyRef.current.perks);
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
  }, []);

  // Unlike every other resource mutator here, deliberately NOT gated behind
  // the shared activity cooldown — eating a meal you already cooked should
  // never make you wait out the same rest timer gathering/cooking uses.
  // Its reward is a placeholder: a small XP bump, standing in until a real
  // hunger bar exists to actually feed.
  const eatCookedFood = useCallback((): boolean => {
    if ((resourcesRef.current.cookedFood ?? 0) < 1) return false;
    const resources = { ...resourcesRef.current, cookedFood: resourcesRef.current.cookedFood - 1 };
    resourcesRef.current = resources;
    setState((prev) => {
      const activityLog = [
        { ts: new Date().toISOString(), text: "Ate a hot meal" },
        ...prev.tier2.activityLog,
      ].slice(0, ACTIVITY_LOG_MAX);
      const next: HubState = {
        ...prev,
        resources,
        tier2: { ...prev.tier2, activityLog, totalEventsLogged: prev.tier2.totalEventsLogged + 1 },
      };
      saveState(next);
      return next;
    });
    addXp(EAT_XP_REWARD);
    return true;
  }, [addXp]);

  const chooseIronTool = useCallback((toolId: string) => {
    setState((prev) => {
      const triedTools = prev.firstIronTool.triedTools.includes(toolId)
        ? prev.firstIronTool.triedTools
        : [...prev.firstIronTool.triedTools, toolId];
      const next = { ...prev, firstIronTool: { choice: toolId, triedTools } };
      saveState(next);
      return next;
    });
  }, []);

  function formatYield(yieldAmounts: Partial<ResourceState>): string {
    const meta = resolvedResourceMeta(adminConfigRef.current);
    return (Object.entries(yieldAmounts) as [ResourceId, number][])
      .map(([id, amount]) => `${amount} ${meta[id].name}`)
      .join(", ");
  }

  // Tree Mining, Hunting, and Mining all funnel through this — computes the
  // new resource totals synchronously off resourcesRef (so the ref and the
  // persisted state never disagree), sets the shared cooldown, and logs a
  // Recent Activity line.
  const applyResourceGain = useCallback((gain: Partial<ResourceState>, logText: string) => {
    const resources = { ...resourcesRef.current };
    for (const [id, amount] of Object.entries(gain) as [ResourceId, number][]) {
      resources[id] = (resources[id] ?? 0) + amount;
    }
    resourcesRef.current = resources;
    const cooldownMs = effectiveCooldownMs(ACTIVITY_COOLDOWN_MS, legacyRef.current.perks);
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

  const completeTreeMining = useCallback(() => {
    const { wood } = resolvedCollectAmounts(adminConfigRef.current);
    const amount = wood + collectBonus(legacyRef.current.perks);
    const meta = resolvedResourceMeta(adminConfigRef.current);
    applyResourceGain({ wood: amount }, `Tree Mining: +${amount} ${meta.wood.name}`);
  }, [applyResourceGain]);

  const completeHunting = useCallback(() => {
    const { food } = resolvedCollectAmounts(adminConfigRef.current);
    const amount = food + collectBonus(legacyRef.current.perks);
    const meta = resolvedResourceMeta(adminConfigRef.current);
    applyResourceGain({ food: amount }, `Hunting: +${amount} ${meta.food.name}`);
  }, [applyResourceGain]);

  // Rolled off toolsRef (always current) so the caller gets back the exact
  // amounts applied, for its own completion feedback.
  const completeMining = useCallback((): Partial<ResourceState> => {
    const order = resolvedToolOrder(adminConfigRef.current);
    const gain = rollMiningYield(toolsRef.current.tier, order);
    if (Object.keys(gain).length > 0) {
      applyResourceGain(gain, `Mining: +${formatYield(gain)}`);
    }
    return gain;
  }, [applyResourceGain]);

  const craftTool = useCallback((tier: string): boolean => {
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
  }, []);

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
    const pointsEarned = pointsForPrestige(toolIndex);
    const startIndex = Math.min(order.length - 1, startingTierIndex(legacyRef.current.perks));
    const startTier = order[startIndex] ?? order[0];

    resourcesRef.current = defaultState().resources;
    toolsRef.current = { tier: startTier };
    legacyRef.current = {
      level: legacyRef.current.level + 1,
      points: legacyRef.current.points + pointsEarned,
      perks: legacyRef.current.perks,
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
        tier2: { ...prev.tier2, activityLog, totalEventsLogged: prev.tier2.totalEventsLogged + 1 },
      };
      saveState(next);
      return next;
    });
    return true;
  }, []);

  // Load persisted state once on mount, apply the day-streak, fire the
  // visit-related achievements, and check the handful of conditions that
  // only make sense once at page-load (time of day, the lounge timer, the
  // daily XP bonus, and the expansion's real-date/moon-phase trackers).
  useEffect(() => {
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
    settingsRef.current = next.settings;
    const loadedAdminConfig = loadAdminConfig();
    adminConfigRef.current = loadedAdminConfig;
    tiersRef.current = loadedAdminConfig.tiers;
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

    if (!hadVisitedToday && unlockedRef.current.has("community-edition")) {
      addXp(XP_PER_DAILY_VISIT);
    }

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

  // Easter egg 2: clicking the header wolf logo. Header.tsx dispatches this
  // event itself once it sees enough rapid clicks — it never touches
  // localStorage directly, this provider is the single writer.
  useEffect(() => {
    function onSecretLogo() {
      unlock("secret-logo-clicks");
    }
    window.addEventListener("btwr-secret-logo", onSecretLogo);
    return () => window.removeEventListener("btwr-secret-logo", onSecretLogo);
  }, [unlock]);

  // Easter eggs 3 & 4: the hero's snow pile effect (components/SnowPile.tsx)
  // dispatches these once it's been accumulating for 10 / 50 minutes.
  useEffect(() => {
    function onSnow10() {
      unlock("snow-pile-10min");
    }
    function onSnow50() {
      unlock("snow-pile-50min");
    }
    window.addEventListener("btwr-secret-snow-10", onSnow10);
    window.addEventListener("btwr-secret-snow-50", onSnow50);
    return () => {
      window.removeEventListener("btwr-secret-snow-10", onSnow10);
      window.removeEventListener("btwr-secret-snow-50", onSnow50);
    };
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

  // Tier 2 egg: scroll clear from the top of the homepage to the bottom.
  useEffect(() => {
    function onScroll() {
      const atBottom =
        window.innerHeight + window.scrollY >=
        document.documentElement.scrollHeight - SCROLL_BOTTOM_THRESHOLD_PX;
      if (atBottom) unlock("rope-grapple");
    }
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, [unlock]);

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

  const tier2Unlocked = unlockedRef.current.has("community-edition");
  const ledgerProgress = useMemo(() => computeLedgerProgress(state), [state]);

  const isTierUnlocked = useCallback(
    (tierId: string): boolean => unlockedRef.current.size >= tierThreshold(adminConfig, tierId),
    [adminConfig]
  );
  const moduleTierId = useCallback(
    (id: ModuleId): string => resolvedModuleTier(adminConfig, id, DEFAULT_MODULE_TIER[id]),
    [adminConfig]
  );
  const achievementTierId = useCallback(
    (id: AchievementId): string => {
      const override = adminConfig.achievementTier[id];
      if (override) return override;
      return ACHIEVEMENTS_BY_ID[id]?.tier === 2 ? "tier2" : "tier1";
    },
    [adminConfig]
  );
  const tiersList = useMemo(() => resolvedTiers(adminConfig), [adminConfig]);
  const toolTiersList = useMemo(() => resolvedToolTiers(adminConfig), [adminConfig]);
  const craftCostFor = useCallback(
    (tierId: string) => resolvedCraftCost(adminConfig, tierId),
    [adminConfig]
  );
  const resourceMetaResolved = useMemo(() => resolvedResourceMeta(adminConfig), [adminConfig]);
  const featuresResolved = useMemo(() => resolvedFeatures(adminConfig), [adminConfig]);
  const unlockedCount = Object.keys(state.unlocked).length;
  const tierTipsResolved = useMemo(
    () => resolvedTierTips(adminConfig, currentTierId(adminConfig, unlockedCount)),
    [adminConfig, unlockedCount]
  );
  // Prestige unlocks once the highest CONFIGURED tier (last in the sorted
  // list, admin-added ones included) has been reached — not the same as
  // tier2Unlocked, which only reflects the built-in tier1->2 gate.
  const highestTierId = tiersList.length > 0 ? tiersList[tiersList.length - 1].id : "tier2";
  const canPrestige = isTierUnlocked(highestTierId);

  const value: AchievementsContextValue = {
    mounted,
    unlocked: unlockedRef.current,
    unlock,
    toasts,
    dismissToast,
    quiz: state.quiz,
    updateQuiz,
    visits: state.visits,
    tier2Unlocked,
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
    campfire: state.campfire,
    tendCampfire,
    completeCooking,
    eatCookedFood,
    firstIronTool: state.firstIronTool,
    chooseIronTool,
    resources: state.resources,
    tools: state.tools,
    activityCooldownUntil: state.activity.cooldownUntil,
    completeTreeMining,
    completeHunting,
    completeMining,
    craftTool,
    tiers: tiersList,
    isTierUnlocked,
    moduleTierId,
    achievementTierId,
    toolTiersList,
    craftCostFor,
    resourceMeta: resourceMetaResolved,
    tierTips: tierTipsResolved,
    features: featuresResolved,
    settings: state.settings,
    updateSettings,
    legacy: state.legacy,
    canPrestige,
    prestigeOutpost,
    buyLegacyPerk,
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
