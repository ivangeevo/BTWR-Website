import type { Mod } from "@/lib/mods";
import type { AchievementId } from "./achievements-catalog";

const STORAGE_KEY = "btwr:hub:v1";

export type QuizStats = {
  bestScore: number;
  bestStreak: number;
  currentStreak: number;
  totalAnswered: number;
  totalCorrect: number;
};

export type HubState = {
  version: 1;
  unlocked: Partial<Record<AchievementId, string>>;
  quiz: QuizStats;
  modOfDay: { lastSeenDate: string | null };
  visits: { firstVisitAt: string | null; lastVisitDate: string | null; streakDays: number };
};

export function defaultState(): HubState {
  return {
    version: 1,
    unlocked: {},
    quiz: {
      bestScore: 0,
      bestStreak: 0,
      currentStreak: 0,
      totalAnswered: 0,
      totalCorrect: 0,
    },
    modOfDay: { lastSeenDate: null },
    visits: { firstVisitAt: null, lastVisitDate: null, streakDays: 0 },
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
    return {
      ...base,
      ...parsed,
      quiz: { ...base.quiz, ...parsed.quiz },
      modOfDay: { ...base.modOfDay, ...parsed.modOfDay },
      visits: { ...base.visits, ...parsed.visits },
      unlocked: { ...parsed.unlocked },
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

// FNV-1a — deterministic, tiny, no dependency. Same date string always
// hashes the same way, so every visitor sees the same mod-of-the-day.
function hashString(str: string): number {
  let hash = 0x811c9dc5;
  for (let i = 0; i < str.length; i++) {
    hash ^= str.charCodeAt(i);
    hash = Math.imul(hash, 0x01000193);
  }
  return hash >>> 0;
}

export function pickModOfDay(mods: Mod[], dateStr: string = todayUTC()): Mod | null {
  const pool = mods.filter((m) => !m.disabled && m.iconUrl);
  if (pool.length === 0) return null;
  const index = hashString(dateStr) % pool.length;
  return pool[index];
}

export { STORAGE_KEY, todayUTC };
