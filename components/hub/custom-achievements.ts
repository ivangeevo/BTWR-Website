// Achievements added and removed from /outpost-admin, without code.
//
// An achievement is its data (title, description, icon, category, XP,
// secret) plus the rule that unlocks it. The data is free-form; the rule is
// picked from what the Outpost already keeps count of — "this number
// reaches N" (ACHIEVEMENT_STATS below) or "earn all of these achievements".
// A brand-new kind of trigger, something nothing tracks yet, still needs
// code. Removing a built-in hides it, stops it unlocking and takes it out
// of every total; restoring it brings it (and anything already earned) back.
import {
  ACHIEVEMENTS,
  CATEGORY_ORDER,
  type AchievementCategory,
  type AchievementDef,
  type AchievementId,
  type CustomAchievementId,
} from "./achievements-catalog";
import type { HubState } from "./hub-storage";

/** What a stat reads from — a subset of AchievementsProvider's rule snapshot. */
export type StatCtx = { state: HubState; level: number; unlockedCount: number };

export type AchievementStat = { id: string; label: string; group: string; read: (c: StatCtx) => number };

// Everything here is already saved and kept up to date by the Outpost.
export const ACHIEVEMENT_STATS: AchievementStat[] = [
  // Visits
  { id: "days-visited", group: "Visits", label: "Days visited", read: (c) => c.state.tier2.totalDaysVisited },
  { id: "visit-streak", group: "Visits", label: "Visit streak (days in a row)", read: (c) => c.state.visits.streakDays },
  { id: "night-visits", group: "Visits", label: "Night visits", read: (c) => c.state.tier2.nightVisits },
  { id: "dawn-visits", group: "Visits", label: "Dawn visits", read: (c) => c.state.tier2.dawnVisits },
  { id: "weekend-visits", group: "Visits", label: "Weekend visits", read: (c) => c.state.tier2.weekendVisits },
  { id: "full-moon-visits", group: "Visits", label: "Full moon visits", read: (c) => c.state.tier2.fullMoonVisits },
  // Progress
  { id: "achievements", group: "Progress", label: "Achievements unlocked", read: (c) => c.unlockedCount },
  { id: "level", group: "Progress", label: "Level", read: (c) => c.level },
  { id: "lifetime-xp", group: "Progress", label: "Lifetime XP", read: (c) => c.state.tier2.lifetimeXp },
  { id: "prestige", group: "Progress", label: "Times prestiged", read: (c) => c.state.tier2.prestigeCount },
  { id: "skins-tried", group: "Progress", label: "Skins tried", read: (c) => c.state.tier2.skinsTried.length },
  { id: "skill-points", group: "Progress", label: "Skill Points on hand", read: (c) => c.state.upgrades.skillPoints },
  { id: "upgrades", group: "Progress", label: "Upgrades bought", read: (c) => c.state.upgrades.purchased.length },
  // Guess the Mod
  { id: "quiz-answered", group: "Guess the Mod", label: "Questions answered", read: (c) => c.state.quiz.totalAnswered },
  { id: "quiz-correct", group: "Guess the Mod", label: "Correct answers", read: (c) => c.state.quiz.totalCorrect },
  { id: "quiz-streak", group: "Guess the Mod", label: "Best answer streak", read: (c) => c.state.quiz.bestStreak },
  { id: "quiz-perfect", group: "Guess the Mod", label: "Perfect rounds", read: (c) => c.state.quiz.perfectRounds },
  { id: "mods-guessed", group: "Guess the Mod", label: "Different mods guessed right", read: (c) => c.state.tier2.modsGuessedCorrect.length },
  // Camp
  { id: "meals", group: "Camp", label: "Meals cooked", read: (c) => c.state.engine.counters.mealsCooked ?? 0 },
  { id: "wood", group: "Camp", label: "Wood on hand", read: (c) => c.state.resources.wood },
  { id: "stone", group: "Camp", label: "Stone on hand", read: (c) => c.state.resources.stone },
  { id: "iron", group: "Camp", label: "Iron on hand", read: (c) => c.state.resources.iron },
  // The Engine
  { id: "engine-stage", group: "The Engine", label: "Engine stage (1–8)", read: (c) => c.state.engine.stage },
  { id: "insight", group: "The Engine", label: "Lifetime insight", read: (c) => c.state.engine.lifetimeInsight },
  { id: "sentences", group: "The Engine", label: "Sentences finished", read: (c) => c.state.engine.solvedCount },
  { id: "choices", group: "The Engine", label: "Sentence endings chosen", read: (c) => c.state.engine.choicesMade },
  { id: "ciphers", group: "The Engine", label: "Ciphers decoded", read: (c) => c.state.engine.ciphers.solved.length },
  { id: "mods-read", group: "The Engine", label: "Mods read on the Mods page", read: (c) => c.state.engine.modsRead.length },
  { id: "components", group: "The Engine", label: "Components bought", read: (c) => c.state.engine.counters.componentsBought ?? 0 },
  { id: "research", group: "The Engine", label: "Research bought", read: (c) => c.state.engine.counters.researchBought ?? 0 },
  // Site
  { id: "theme-clicks", group: "Around the site", label: "Theme button clicks", read: (c) => c.state.tier2.themeToggleClicks },
  { id: "resizes", group: "Around the site", label: "Window resizes", read: (c) => c.state.tier2.windowResizeCount },
];

export const STATS_BY_ID: Record<string, AchievementStat> = Object.fromEntries(ACHIEVEMENT_STATS.map((s) => [s.id, s]));

export type AchievementTrigger =
  | { kind: "stat"; stat: string; at: number }
  | { kind: "all"; ids: AchievementId[] };

export type CustomAchievement = {
  id: CustomAchievementId;
  title: string;
  description: string;
  icon: string;
  category: AchievementCategory;
  xp: number;
  secret: boolean;
  trigger: AchievementTrigger;
};

export function isCustomId(id: string): id is CustomAchievementId {
  return id.startsWith("custom-");
}

// A readable, unique id from a title ("First Snowfall" → custom-first-snowfall).
export function newCustomId(title: string, taken: ReadonlySet<string>): CustomAchievementId {
  const slug =
    title
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "")
      .slice(0, 40) || "achievement";
  let id = `custom-${slug}` as CustomAchievementId;
  for (let n = 2; taken.has(id); n++) id = `custom-${slug}-${n}` as CustomAchievementId;
  return id;
}

/** Tidies one saved/imported entry, or drops it if it can't be made sense of. */
export function sanitizeCustom(raw: unknown): CustomAchievement | null {
  if (!raw || typeof raw !== "object") return null;
  const r = raw as Partial<CustomAchievement>;
  if (typeof r.id !== "string" || !isCustomId(r.id)) return null;
  const t = r.trigger as Partial<AchievementTrigger> | undefined;
  let trigger: AchievementTrigger;
  if (t?.kind === "all" && Array.isArray((t as { ids?: unknown }).ids)) {
    trigger = { kind: "all", ids: (t as { ids: unknown[] }).ids.filter((x): x is AchievementId => typeof x === "string") };
  } else if (t?.kind === "stat" && typeof (t as { stat?: unknown }).stat === "string") {
    const at = Number((t as { at?: unknown }).at);
    trigger = { kind: "stat", stat: (t as { stat: string }).stat, at: Number.isFinite(at) ? Math.max(0, at) : 1 };
  } else {
    trigger = { kind: "stat", stat: ACHIEVEMENT_STATS[0].id, at: 1 };
  }
  return {
    id: r.id,
    title: typeof r.title === "string" && r.title.trim() ? r.title : "Untitled achievement",
    description: typeof r.description === "string" ? r.description : "",
    icon: typeof r.icon === "string" && r.icon.trim() ? r.icon : "\u{1F3C6}",
    category: CATEGORY_ORDER.includes(r.category as AchievementCategory) ? (r.category as AchievementCategory) : CATEGORY_ORDER[0],
    xp: Number.isFinite(Number(r.xp)) ? Math.max(0, Number(r.xp)) : 25,
    secret: r.secret === true,
    trigger,
  };
}

export type ActiveCatalog = {
  /** Every achievement that exists right now: built-ins not removed, then custom ones. */
  list: AchievementDef[];
  byId: Partial<Record<AchievementId, AchievementDef>>;
  custom: CustomAchievement[];
};

export function activeCatalog(custom: readonly CustomAchievement[], removed: readonly AchievementId[]): ActiveCatalog {
  const gone = new Set(removed);
  const list: AchievementDef[] = [
    ...ACHIEVEMENTS.filter((a) => !gone.has(a.id)),
    ...custom.map(({ id, title, description, icon, category, xp, secret }) => ({ id, title, description, icon, category, xp, secret })),
  ];
  return { list, byId: Object.fromEntries(list.map((a) => [a.id, a])), custom: [...custom] };
}

export const BUILTIN_CATALOG: ActiveCatalog = activeCatalog([], []);

/** Whether a custom achievement's rule is met. An empty "all of" list never is. */
export function customTriggerMet(
  a: CustomAchievement,
  c: StatCtx & { unlockedSet: ReadonlySet<AchievementId> },
  catalog: ActiveCatalog
): boolean {
  const t = a.trigger;
  if (t.kind === "stat") {
    const stat = STATS_BY_ID[t.stat];
    return !!stat && stat.read(c) >= t.at;
  }
  // Removed achievements can't be earned any more, so they don't count.
  const ids = t.ids.filter((id) => id !== a.id && catalog.byId[id]);
  return ids.length > 0 && ids.every((id) => c.unlockedSet.has(id));
}

/** Plain-words version of a rule, for the admin list. */
export function describeTrigger(t: AchievementTrigger, catalog: ActiveCatalog): string {
  if (t.kind === "stat") return `${STATS_BY_ID[t.stat]?.label ?? "Unknown stat"} reaches ${t.at}`;
  const names = t.ids.map((id) => catalog.byId[id]?.title).filter(Boolean);
  return names.length ? `Earn all of: ${names.join(", ")}` : "Earn all of: (nothing picked yet)";
}
