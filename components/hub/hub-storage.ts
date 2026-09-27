import { ACHIEVEMENTS_BY_ID, type AchievementId } from "./achievements-catalog";
import { defaultCampState, normalizeCamp, type CampState } from "./camp";
import { isPhoneDevice } from "./device";
import { hashString } from "./engine/rng";
import { defaultEngineState, normalizeEngineState } from "./engine/state";
import type { EngineState } from "./engine/types";
import { defaultLegacyState, type LegacyState } from "./legacy";
import { normalizeRelic, type RelicState } from "./relics";
import type { ResourceState } from "./resources";
import { defaultSurvivalState, type SurvivalState } from "./survival";
import { SKINS_BY_ID, type SkinId, type Tier2TabId } from "./tier2";
import { RETIRED_UPGRADE_REFUNDS } from "./upgrade-catalog";

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
  /** Crafted yet (2×2 Player Crafting, see CampfireMechanic.craftWoodCost)? Until then there's no fire to tend. */
  built: boolean;
  stage: 0 | 1 | 2 | 3 | 4;
  lastTendedAt: string | null;
};

export function normalizeExperience(raw: Partial<HubState["experience"]> | undefined): HubState["experience"] {
  const mode = raw?.mode === "survival" || raw?.mode === "casual" ? raw.mode : null;
  return { mode, chosenAt: mode && typeof raw?.chosenAt === "string" ? raw.chosenAt : null };
}

// Saves from before the Campfire was a craft have no `built` — anyone who'd
// ever tended theirs already has one, so they keep it.
export function normalizeCampfire(raw: Partial<CampfireState> | undefined): CampfireState {
  const base: CampfireState = { built: false, stage: 0, lastTendedAt: null };
  const merged = { ...base, ...raw };
  if (typeof raw?.built !== "boolean") merged.built = merged.lastTendedAt !== null;
  return merged;
}

// The Outpost's meta-progression shop state (see upgrade-catalog.ts). Older
// saves also carry a cardOrder here, from when Basecamp had a card grid to
// drag around; normalizeState drops it.
export type UpgradesState = {
  skillPoints: number;
  purchased: string[];
};

export type ToolState = {
  /** A built-in ToolTierId, or an admin-added custom tier's string id. */
  tier: string;
};

// Every Gathering activity shares one rest timer — see mechanics.ts's
// GatheringMechanic. Cooking doesn't use it: its time is the Cook button's
// own bar (Campfire.tsx), so neither ever waits on the other.
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

// Picked once, on a full-Outpost screen when the Engine reaches The Stump
// (ExperiencePicker.tsx): "survival" turns on Health/Hunger/Gloom/Hardcore
// Spawn (survival.ts), "casual" leaves the Outpost a gentle idle game.
// null until chosen.
export type ExperienceMode = "survival" | "casual";

export type HubState = {
  version: 1;
  experience: { mode: ExperienceMode | null; chosenAt: string | null };
  // Controlled from the Community page's Outpost control panel, not from
  // the Outpost itself — the /outpost page (and the header link to it) just
  // read this to decide whether to open at all.
  enabled: boolean;
  unlocked: Partial<Record<AchievementId, string>>;
  /** Relic identification stats (relics.ts) — named "quiz" from when it was Guess the Mod's card. */
  quiz: QuizStats;
  /** The unidentified relic waiting in Gathering, if one's turned up — see relics.ts. */
  relic: RelicState | null;
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
  /** Health, Hunger, Gloom, and Hardcore Spawn — see survival.ts. Reset by prestige. */
  survival: SurvivalState;
  /** The Upgrades shop's capabilities out at camp: the wolf, torches, the farm — see camp.ts. Reset by prestige. */
  camp: CampState;
};

export function defaultState(): HubState {
  return {
    version: 1,
    experience: { mode: null, chosenAt: null },
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
    relic: null,
    visits: { firstVisitAt: null, lastVisitDate: null, streakDays: 0 },
    campfire: { built: false, stage: 0, lastTendedAt: null },
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
    upgrades: { skillPoints: 0, purchased: [] },
    engine: defaultEngineState(),
    survival: defaultSurvivalState(),
    camp: defaultCampState(),
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
    return normalizeState(JSON.parse(raw)) ?? defaultState();
  } catch {
    return defaultState();
  }
}

/**
 * Takes upgrades the shop no longer sells out of a save and gives back the
 * Skill Points they cost (upgrade-catalog.ts's RETIRED_UPGRADE_REFUNDS).
 * Survival handed out the Day/Night Cycle for free, so that one's only
 * refunded to a Casual (or undecided) save. Computed from the raw save every
 * load, so it can never refund twice.
 */
export function retireUpgrades(upgrades: UpgradesState, mode: ExperienceMode | null): UpgradesState {
  let refund = 0;
  const purchased = upgrades.purchased.filter((id) => {
    if (!(id in RETIRED_UPGRADE_REFUNDS)) return true;
    if (!(id === "day-night-cycle" && mode === "survival")) refund += RETIRED_UPGRADE_REFUNDS[id];
    return false;
  });
  if (purchased.length === upgrades.purchased.length) return upgrades;
  return { ...upgrades, skillPoints: upgrades.skillPoints + refund, purchased };
}

/**
 * Brings any stored or imported save up to the current shape — the one path
 * both loadState and an imported save file (save-file.ts) go through, so the
 * two can never migrate differently. Null when it isn't a version-1 save.
 */
export function normalizeState(raw: unknown): HubState | null {
  if (typeof raw !== "object" || raw === null || (raw as { version?: unknown }).version !== 1) return null;
  try {
    // Old saves may still carry the retired First Iron Tool / Priorities /
    // Mod of the Day slices.
    // eslint-disable-next-line @typescript-eslint/no-unused-vars, @typescript-eslint/no-explicit-any
    const { firstIronTool, priorities, modOfDay, ...parsed } = raw as Record<string, any>;
    // Shallow-merge over defaults so a partially-shaped stored value (e.g.
    // from a future field addition) doesn't crash consumers expecting it.
    const base = defaultState();
    const tier2: Tier2State = { ...base.tier2, ...parsed.tier2 };
    // Skins get renamed/replaced occasionally (e.g. the Frost/Ember/Verdant/
    // Void set became Iron/Bronze/Copper/Blackened Steel) — a visitor with
    // an old id saved would otherwise crash every consumer that looks it up
    // in SKINS_BY_ID.
    if (!SKINS_BY_ID[tier2.skin]) tier2.skin = base.tier2.skin;
    // Achievements get retired over time — drop ids that no longer exist.
    const unlocked = Object.fromEntries(
      Object.entries(parsed.unlocked ?? {}).filter(([id]) => id in ACHIEVEMENTS_BY_ID || id.startsWith("custom-"))
    ) as HubState["unlocked"];
    const survival: SurvivalState = {
      ...base.survival,
      ...parsed.survival,
      acc: { ...base.survival.acc, ...parsed.survival?.acc },
    };
    const experience = normalizeExperience(parsed.experience);
    const upgrades = retireUpgrades(
      {
        skillPoints: typeof parsed.upgrades?.skillPoints === "number" ? parsed.upgrades.skillPoints : base.upgrades.skillPoints,
        purchased: Array.isArray(parsed.upgrades?.purchased)
          ? parsed.upgrades.purchased.filter((id: unknown): id is string => typeof id === "string")
          : base.upgrades.purchased,
      },
      experience.mode
    );
    // A save can't hold a dead visitor (death respawns on the spot), but
    // guard anyway so a hand-edited or imported save never starts at 0.
    if (!(survival.health > 0)) survival.health = 1;
    return {
      ...base,
      ...parsed,
      version: 1,
      quiz: { ...base.quiz, ...parsed.quiz },
      relic: normalizeRelic(parsed.relic),
      visits: { ...base.visits, ...parsed.visits },
      experience,
      campfire: normalizeCampfire(parsed.campfire),
      resources: { ...base.resources, ...parsed.resources },
      tools: { ...base.tools, ...parsed.tools },
      activity: { ...base.activity, ...parsed.activity },
      settings: { ...base.settings, ...parsed.settings },
      legacy: {
        ...base.legacy,
        ...parsed.legacy,
        perks: { ...base.legacy.perks, ...parsed.legacy?.perks },
      },
      upgrades,
      camp: normalizeCamp(parsed.camp),
      // A save from before the Engine existed has no slice: it was already
      // playing, so it resumes at Stage 1 rather than a new save's Stage 0.
      engine: normalizeEngineState(parsed.engine ?? {}),
      survival,
      tier2,
      unlocked,
    };
  } catch {
    return null;
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

// Desktop-only: a phone never counts as enabled (see device.ts).
export function isOutpostEnabled(): boolean {
  if (isPhoneDevice()) return false;
  return loadState().enabled;
}

export { STORAGE_KEY, todayUTC, hashString };
