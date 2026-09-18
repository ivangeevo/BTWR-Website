// "Ledger Entries" — the procedurally-generated tier on top of the 111
// hand-authored achievements. There's no game telemetry available to a
// static site, so "random" here means combinatorial: a small pool of real
// BTW tools/mechanics, each tied to a metric already tracked for the 111,
// escalating through numbered ranks with a steep threshold curve. Nothing
// here is persisted directly — every rank is derived live from the same
// HubState fields the hand-authored achievements already read, so the
// Ledger can't drift out of sync with the rest of the save.
import type { HubState } from "./hub-storage";

export type LedgerMetricKey =
  | "quizAnswered"
  | "quizStreak"
  | "quizPerfect"
  | "themeToggles"
  | "windowResizes"
  | "patchSwitches"
  | "lifetimeXp"
  | "prestige"
  | "daysVisited"
  | "eventsLogged"
  | "modsGuessed"
  | "exports"
  | "imports"
  | "visitStreak"
  | "loreLevel";

type LedgerMetricDef = {
  key: LedgerMetricKey;
  /** BTW-flavored noun this metric's entries are filed under, e.g. "Millstone Grind #14". */
  noun: string;
  icon: string;
  /** Threshold for rank 1 — later ranks grow from this via RANK_EXPONENT. */
  base: number;
  read: (state: HubState) => number;
};

// 15 metrics x 65 ranks = 975 procedural entries, on top of the 25 original
// + 111 hand-authored = 1111 total achievements, matching the requested cap.
export const RANKS_PER_METRIC = 65;
const RANK_EXPONENT = 1.6;

const METRICS: LedgerMetricDef[] = [
  { key: "quizAnswered", noun: "Millstone Grind", icon: "\u{2699}\u{FE0F}", base: 10, read: (s) => s.quiz.totalAnswered },
  { key: "quizStreak", noun: "Turntable Run", icon: "\u{1F32C}\u{FE0F}", base: 3, read: (s) => s.quiz.bestStreak },
  { key: "quizPerfect", noun: "Soul-Tempered Round", icon: "\u{1F56F}\u{FE0F}", base: 2, read: (s) => s.quiz.perfectRounds },
  { key: "themeToggles", noun: "Bellows Pump", icon: "\u{1F525}", base: 5, read: (s) => s.tier2.themeToggleClicks },
  { key: "windowResizes", noun: "Windmill Turn", icon: "\u{1F32C}\u{FE0F}", base: 5, read: (s) => s.tier2.windowResizeCount },
  { key: "patchSwitches", noun: "Ledger Flip", icon: "\u{1F4D1}", base: 3, read: (s) => s.tier2.patchNotesModeSwitchCount },
  { key: "lifetimeXp", noun: "Hellfire Stoke", icon: "\u{1F525}", base: 200, read: (s) => s.tier2.lifetimeXp },
  { key: "prestige", noun: "Reforging", icon: "\u{2692}\u{FE0F}", base: 1, read: (s) => s.tier2.prestigeCount },
  { key: "daysVisited", noun: "Homestead Tending", icon: "\u{1FAB5}", base: 2, read: (s) => s.tier2.totalDaysVisited },
  { key: "eventsLogged", noun: "Chronicle Entry", icon: "\u{1F5D2}\u{FE0F}", base: 10, read: (s) => s.tier2.totalEventsLogged },
  { key: "modsGuessed", noun: "Hide Cured", icon: "\u{1F9F5}", base: 2, read: (s) => s.tier2.modsGuessedCorrect.length },
  { key: "exports", noun: "Sealed Deed", icon: "\u{1F4E4}", base: 1, read: (s) => s.tier2.exportCount },
  { key: "imports", noun: "Recovered Deed", icon: "\u{1F4E5}", base: 1, read: (s) => s.tier2.importCount },
  { key: "visitStreak", noun: "Broody Watch", icon: "\u{1F414}", base: 2, read: (s) => s.visits.streakDays },
  { key: "loreLevel", noun: "Footnote", icon: "\u{1F4D6}", base: 2, read: (s) => s.tier2.loreRevealedLevel },
];

export const LEDGER_TOTAL = METRICS.length * RANKS_PER_METRIC; // 975

function thresholdForRank(base: number, rank: number): number {
  return Math.max(base, Math.ceil(base * Math.pow(rank, RANK_EXPONENT)));
}

/** Highest rank (0-65) this metric has reached for the given state. */
function currentRank(metric: LedgerMetricDef, state: HubState): number {
  const value = metric.read(state);
  let rank = 0;
  while (rank < RANKS_PER_METRIC && thresholdForRank(metric.base, rank + 1) <= value) {
    rank++;
  }
  return rank;
}

export type LedgerMetricProgress = {
  key: LedgerMetricKey;
  noun: string;
  icon: string;
  rank: number;
  value: number;
  /** Threshold for the next unattained rank, or null if this metric is maxed out. */
  nextThreshold: number | null;
};

export type LedgerProgress = {
  unlockedCount: number;
  total: number;
  perMetric: LedgerMetricProgress[];
};

export function computeLedgerProgress(state: HubState): LedgerProgress {
  let unlockedCount = 0;
  const perMetric: LedgerMetricProgress[] = METRICS.map((m) => {
    const rank = currentRank(m, state);
    unlockedCount += rank;
    return {
      key: m.key,
      noun: m.noun,
      icon: m.icon,
      rank,
      value: m.read(state),
      nextThreshold: rank < RANKS_PER_METRIC ? thresholdForRank(m.base, rank + 1) : null,
    };
  });
  return { unlockedCount, total: LEDGER_TOTAL, perMetric };
}

/** A snapshot of every metric's current rank — diffed on each state change to
 * find newly-crossed ranks worth a Chronicle line (see AchievementsProvider). */
export function ledgerRankSnapshot(state: HubState): Record<LedgerMetricKey, number> {
  const snapshot = {} as Record<LedgerMetricKey, number>;
  for (const m of METRICS) snapshot[m.key] = currentRank(m, state);
  return snapshot;
}

export function ledgerEntryTitle(noun: string, rank: number): string {
  return `${noun} #${rank}`;
}
