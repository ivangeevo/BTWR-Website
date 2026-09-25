import type { Mod } from "@/lib/mods";
import { ACHIEVEMENTS_BY_ID, type AchievementId } from "./achievements-catalog";
import { isPhoneDevice } from "./device";
import { hashString } from "./engine/rng";
import { defaultEngineState, normalizeEngineState } from "./engine/state";
import type { EngineState } from "./engine/types";
import { defaultLegacyState, type LegacyState } from "./legacy";
import { DEFAULT_CARD_ORDER, type ModuleId } from "./module-registry";
import type { ResourceState } from "./resources";
import { SKINS_BY_ID, type SkinId, type Tier2TabId } from "./tier2";

const STORAGE_KEY = "btwr:hub:v1";

export type QuizStats = {
  bestScore: number;
  bestStreak: number;
  currentStreak: number;
  totalAnswered: number;
  totalCorrect: number;
  perfectRounds: number;
};

export type ActivityLogEntry = { ts: string; text: string };

// State exclusive to tier 2 (see TIER2_PLAN.md). Exists in HubState from
// the start so it can accumulate silently pre-tier-2 (e.g. theme toggle
// clicks) without needing a migration once tier 2 unlocks.
export type Tier2State = {
  xp: number;
  prestigeCount: number;
  skin: SkinId;
  /** Highest level whose lore snippet has been revealed (0 = none yet). */
  loreRevealedLevel: number;
  themeToggleClicks: number;
  windowResizeCount: number;
  patchNotesModeSwitchCount: number;
  /** Dashboard QoL: last tab viewed on each side, an optional pinned
   * default, unread tracking, and a running log of notable events — makes
   * the flanking menus read as a persistent module rather than throwaway
   * UI state. `null` means that side is collapsed (no panel open). */
  leftTab: Tier2TabId | null;
  lastTab: Tier2TabId | null;
  pinnedTab: Tier2TabId | null;
  lastQuizPlayedDate: string | null;
  lastSeenAchievementCount: number;
  activityLog: ActivityLogEntry[];

  // --- Ledger tracking (the 111-achievement expansion + Ledger Entries) ---
  // All of these back either a hand-authored achievement threshold or a
  // procedurally-generated Ledger Entry at a higher rung of the same metric
  // — see achievements-catalog.ts and ledger-entries.ts.
  modsGuessedCorrect: string[];
  tabsVisited: string[];
  skinsTried: string[];
  skinChangeCount: number;
  pinChanges: number;
  unpinCount: number;
  patchNotesOpenCount: number;
  exportCount: number;
  importCount: number;
  nightVisits: number;
  dawnVisits: number;
  duskVisits: number;
  weekendVisits: number;
  weekdayVisits: number;
  fullMoonVisits: number;
  newMoonVisits: number;
  /** Lifetime distinct real-world days visited — unlike streakDays, never resets on a gap. */
  totalDaysVisited: number;
  /** Ever-incrementing count of activity-log-worthy events (the log itself caps at 20). */
  totalEventsLogged: number;
  /** Lifetime XP earned, unlike tier2.xp which prestige resets to 0. */
  lifetimeXp: number;
};

// The campfire's displayed stage is derived (see campfire.ts's
// currentCampfireStage), not stored directly — this is just the last
// value it was set to and when, so decay-since-then can be computed fresh
// on every read without a live ticking timer.
export type CampfireState = {
  stage: 0 | 1 | 2 | 3 | 4;
  lastTendedAt: string | null;
};

// The Outpost's meta-progression shop state (see upgrade-catalog.ts). cardOrder is
// null until the visitor actually drags something (or before the
// card-reorder upgrade even exists) — consumers fall back to
// DEFAULT_CARD_ORDER, so this never needs a migration default beyond null.
// A single flat list — the main card grid is one modular grid now, not two
// independently-ordered columns (see loadState's migration off the old
// `{ left, right }` shape for visitors with a pre-existing save).
export type UpgradesState = {
  skillPoints: number;
  purchased: string[];
  cardOrder: ModuleId[] | null;
};

export type ToolState = {
  /** A built-in ToolTierId, or an admin-added custom tier's string id. */
  tier: string;
};

// Tree Mining, Hunting, and Mining all share this single cooldown — see
// mechanics.ts's GatheringMechanic.
export type ActivityState = {
  cooldownUntil: string | null;
};

// Normal-visitor preferences, surfaced through the Outpost's own settings
// dropdown (OutpostSettings.tsx) — separate from OutpostControlPanel
// (enable/reset, on the Community page) and admin-config.ts (tier/module
// customization). Purely cosmetic/comfort options, nothing gameplay-gating.
export type OutpostSettings = {
  toastsEnabled: boolean;
  reducedMotion: boolean;
  /** Sun/moon cycle across the whole site, and the theme it forces — see day-night-cycle.ts. */
  dayNightCycleEnabled: boolean;
  /** When true, clicking the site's theme toggle actually sticks instead of being fought back to the cycle's theme. */
  themeOverrideAllowed: boolean;
};

export type HubState = {
  version: 1;
  // Controlled from the Community page's Outpost control panel, not from
  // the Outpost itself — the /outpost page (and the header link to it) just
  // read this to decide whether to open at all.
  enabled: boolean;
  unlocked: Partial<Record<AchievementId, string>>;
  quiz: QuizStats;
  modOfDay: { lastSeenDate: string | null };
  visits: { firstVisitAt: string | null; lastVisitDate: string | null; streakDays: number };
  campfire: CampfireState;
  resources: ResourceState;
  tools: ToolState;
  activity: ActivityState;
  settings: OutpostSettings;
  tier2: Tier2State;
  legacy: LegacyState;
  upgrades: UpgradesState;
  /** Ponder / The Analytical Engine — see engine/types.ts and engine/state.ts.
   * Part of prestige: its mind survives, its body doesn't (engineOnPrestige). */
  engine: EngineState;
};

export function defaultState(): HubState {
  return {
    version: 1,
    enabled: false,
    unlocked: {},
    quiz: {
      bestScore: 0,
      bestStreak: 0,
      currentStreak: 0,
      totalAnswered: 0,
      totalCorrect: 0,
      perfectRounds: 0,
    },
    modOfDay: { lastSeenDate: null },
    visits: { firstVisitAt: null, lastVisitDate: null, streakDays: 0 },
    campfire: { stage: 0, lastTendedAt: null },
    resources: { wood: 0, food: 0, stone: 0, coal: 0, copper: 0, iron: 0, cookedFood: 0 },
    tools: { tier: "none" },
    activity: { cooldownUntil: null },
    settings: {
      toastsEnabled: true,
      reducedMotion: false,
      dayNightCycleEnabled: true,
      themeOverrideAllowed: false,
    },
    legacy: defaultLegacyState(),
    upgrades: { skillPoints: 0, purchased: [], cardOrder: null },
    engine: defaultEngineState(),
    tier2: {
      xp: 0,
      prestigeCount: 0,
      skin: "campfire",
      loreRevealedLevel: 0,
      themeToggleClicks: 0,
      windowResizeCount: 0,
      patchNotesModeSwitchCount: 0,
      leftTab: null,
      lastTab: null,
      pinnedTab: null,
      lastQuizPlayedDate: null,
      lastSeenAchievementCount: 0,
      activityLog: [],
      modsGuessedCorrect: [],
      tabsVisited: [],
      skinsTried: [],
      skinChangeCount: 0,
      pinChanges: 0,
      unpinCount: 0,
      patchNotesOpenCount: 0,
      exportCount: 0,
      importCount: 0,
      nightVisits: 0,
      dawnVisits: 0,
      duskVisits: 0,
      weekendVisits: 0,
      weekdayVisits: 0,
      fullMoonVisits: 0,
      newMoonVisits: 0,
      totalDaysVisited: 0,
      totalEventsLogged: 0,
      lifetimeXp: 0,
    },
  };
}

export function loadState(): HubState {
  if (typeof window === "undefined") return defaultState();
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return defaultState();
    const parsed = JSON.parse(raw);
    if (parsed?.version !== 1) return defaultState();
    // Shallow-merge over defaults so a partially-shaped stored value (e.g.
    // from a future field addition) doesn't crash consumers expecting it.
    const base = defaultState();
    const tier2: Tier2State = { ...base.tier2, ...parsed.tier2 };
    // Skins get renamed/replaced occasionally (e.g. the Frost/Ember/Verdant/
    // Void set became Iron/Bronze/Copper/Blackened Steel) — a visitor with
    // an old id saved would otherwise crash every consumer that looks it up
    // in SKINS_BY_ID.
    if (!SKINS_BY_ID[tier2.skin]) tier2.skin = base.tier2.skin;
    // cardOrder used to be stored as separate { left, right } column lists
    // (pre the modular single-grid rework) — a visitor with that old shape
    // still saved gets it interleaved into the new flat list (same pairing
    // the grid used to render) rather than silently falling back to defaults
    // and losing their customization.
    const rawCardOrder = parsed.upgrades?.cardOrder;
    let cardOrder: ModuleId[] | null = base.upgrades.cardOrder;
    if (Array.isArray(rawCardOrder)) {
      cardOrder = rawCardOrder;
    } else if (rawCardOrder && Array.isArray(rawCardOrder.left) && Array.isArray(rawCardOrder.right)) {
      const { left, right } = rawCardOrder as { left: ModuleId[]; right: ModuleId[] };
      cardOrder = [];
      for (let i = 0; i < Math.max(left.length, right.length); i++) {
        if (left[i]) cardOrder.push(left[i]);
        if (right[i]) cardOrder.push(right[i]);
      }
    }
    // Cards and achievements get retired over time — drop ids that no longer
    // exist, and slot any new card in at the end of a customized order.
    if (cardOrder) {
      const known = cardOrder.filter((id, i) => DEFAULT_CARD_ORDER.includes(id) && cardOrder!.indexOf(id) === i);
      cardOrder = [...known, ...DEFAULT_CARD_ORDER.filter((id) => !known.includes(id))];
    }
    const unlocked = Object.fromEntries(
      Object.entries(parsed.unlocked ?? {}).filter(([id]) => id in ACHIEVEMENTS_BY_ID || id.startsWith("custom-"))
    ) as HubState["unlocked"];
    // Old saves may still carry the retired First Iron Tool / Priorities slices.
    delete (parsed as Record<string, unknown>).firstIronTool;
    delete (parsed as Record<string, unknown>).priorities;
    return {
      ...base,
      ...parsed,
      quiz: { ...base.quiz, ...parsed.quiz },
      modOfDay: { ...base.modOfDay, ...parsed.modOfDay },
      visits: { ...base.visits, ...parsed.visits },
      campfire: { ...base.campfire, ...parsed.campfire },
      resources: { ...base.resources, ...parsed.resources },
      tools: { ...base.tools, ...parsed.tools },
      activity: { ...base.activity, ...parsed.activity },
      settings: { ...base.settings, ...parsed.settings },
      legacy: {
        ...base.legacy,
        ...parsed.legacy,
        perks: { ...base.legacy.perks, ...parsed.legacy?.perks },
      },
      upgrades: { ...base.upgrades, ...parsed.upgrades, cardOrder },
      engine: normalizeEngineState(parsed.engine),
      tier2,
      unlocked,
    };
  } catch {
    return defaultState();
  }
}

export function saveState(state: HubState) {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  } catch {
    // Storage can be unavailable (private browsing, quota) — losing
    // persistence here isn't worth surfacing an error to the visitor.
  }
}

function todayUTC(): string {
  return new Date().toISOString().slice(0, 10);
}

// Compares the stored last-visit date to today (UTC) and returns an updated
// visits block: same day is a no-op, exactly one day later increments the
// streak, anything else (including clock skew) resets it to 1.
export function applyVisit(visits: HubState["visits"]): HubState["visits"] {
  const today = todayUTC();
  if (visits.lastVisitDate === today) return visits;

  const firstVisitAt = visits.firstVisitAt ?? new Date().toISOString();
  if (!visits.lastVisitDate) {
    return { firstVisitAt, lastVisitDate: today, streakDays: 1 };
  }

  const prev = new Date(visits.lastVisitDate + "T00:00:00Z").getTime();
  const now = new Date(today + "T00:00:00Z").getTime();
  const dayMs = 24 * 60 * 60 * 1000;
  const isConsecutive = now - prev === dayMs;

  return {
    firstVisitAt,
    lastVisitDate: today,
    streakDays: isConsecutive ? visits.streakDays + 1 : 1,
  };
}

// FNV-1a (engine/rng.ts) — deterministic, tiny, no dependency. Same date
// string always hashes the same way, so every visitor sees the same
// mod-of-the-day.

export function pickModOfDay(mods: Mod[], dateStr: string = todayUTC()): Mod | null {
  const pool = mods.filter((m) => !m.disabled && m.iconUrl);
  if (pool.length === 0) return null;
  const index = hashString(dateStr) % pool.length;
  return pool[index];
}

// Same date-seeded trick as pickModOfDay, generalized for any pool — used
// by BtwFieldNotes so every visitor sees the same tip on a given day.
export function pickByDate<T>(pool: readonly T[], dateStr: string = todayUTC()): T | null {
  if (pool.length === 0) return null;
  return pool[hashString(dateStr) % pool.length];
}

// Desktop-only: a phone never counts as enabled (see device.ts).
export function isOutpostEnabled(): boolean {
  if (isPhoneDevice()) return false;
  return loadState().enabled;
}

export { STORAGE_KEY, todayUTC, hashString };
