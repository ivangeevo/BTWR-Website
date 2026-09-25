// Tier 2's XP/level system, rank ladder, unlockable skins, flair badges,
// and lore log. Kept in one file since they're all small, static tables
// that only tier-2 UI reads — see TIER2_PLAN.md for the design rationale.

// Cumulative XP required to REACH a given level (level 1 = 0 XP).
// 50 * (level-1)^2 — a standard increasing-cost RPG curve. Collecting every
// tier-2 achievement (2200 XP incl. Community Edition's 300) lands around
// level 7; going further requires repeatable XP (quiz correct answers,
// daily visits), which is what keeps the system open-ended.
function thresholdForLevel(level: number): number {
  if (level <= 1) return 0;
  return 50 * (level - 1) ** 2;
}

export function levelForXp(xp: number): number {
  let level = 1;
  // Levels stay cheap for a long time at low XP; this loop is fine since
  // XP realistically never gets large enough to make it slow.
  while (thresholdForLevel(level + 1) <= xp) level++;
  return level;
}

export function xpProgress(xp: number) {
  const level = levelForXp(xp);
  const currentThreshold = thresholdForLevel(level);
  const nextThreshold = thresholdForLevel(level + 1);
  const intoLevel = xp - currentThreshold;
  const span = nextThreshold - currentThreshold;
  return {
    level,
    intoLevel,
    span,
    nextThreshold,
    percent: span > 0 ? Math.min(100, Math.round((intoLevel / span) * 100)) : 100,
  };
}

// Scaled against the achievement pool's actual size: earning every
// hand-authored achievement (124 of them carry XP, ~41,450 total) lands
// around level 29 on its own — so "Outpost Legend" now sits mid-ladder,
// not as the finish line, and everything past it is deep Ledger-grinding
// territory (repeatable quiz/visit XP, or the Ledger's own escalating
// ranks) rather than something achievement completion alone reaches.
const RANK_TITLES: { minLevel: number; title: string }[] = [
  { minLevel: 1, title: "Newcomer" },
  { minLevel: 2, title: "Apprentice" },
  { minLevel: 4, title: "Journeyman" },
  { minLevel: 7, title: "Tradesman" },
  { minLevel: 11, title: "Craftsman" },
  { minLevel: 16, title: "Veteran" },
  { minLevel: 22, title: "Outpost Legend" },
  { minLevel: 30, title: "Forge Warden" },
  { minLevel: 42, title: "Hellfire Adept" },
  { minLevel: 58, title: "Nether-Touched" },
  { minLevel: 80, title: "Elder of the Outpost" },
  { minLevel: 110, title: "The Undying" },
  { minLevel: 150, title: "Ledger Incarnate" },
];

export function rankTitleForLevel(level: number): string {
  let title = RANK_TITLES[0].title;
  for (const rank of RANK_TITLES) {
    if (level >= rank.minLevel) title = rank.title;
    else break;
  }
  return title;
}

// One icon per rank tier (same minLevel breakpoints as RANK_TITLES), so the
// level badge reads as "a rank with its own identity" rather than just a
// number in a circle — climbs from a seedling to something genuinely
// ominous by the late game, mirroring the rank titles' own escalation.
const RANK_ICONS: Record<string, string> = {
  Newcomer: "\u{1F331}",
  Apprentice: "\u{1F528}",
  Journeyman: "\u{2692}\u{FE0F}",
  Tradesman: "\u{1F6E0}\u{FE0F}",
  Craftsman: "\u{1F451}",
  Veteran: "\u{1F396}\u{FE0F}",
  "Outpost Legend": "\u{2B50}",
  "Forge Warden": "\u{1F525}",
  "Hellfire Adept": "\u{1F30B}",
  "Nether-Touched": "\u{1F300}",
  "Elder of the Outpost": "\u{1F9D9}",
  "The Undying": "\u{1F480}",
  "Ledger Incarnate": "\u{1F4DC}",
};

export function rankIconForLevel(level: number): string {
  return RANK_ICONS[rankTitleForLevel(level)] ?? RANK_ICONS.Newcomer;
}

// Level at which the player can start prestiging (see AchievementsProvider).
export const PRESTIGE_LEVEL = 20;

export type SkinId = "campfire" | "iron" | "copper" | "gold" | "diamond" | "soulforged-steel";

export type Skin = {
  id: SkinId;
  name: string;
  unlockLevel: number;
  accent: string;
  accentSoft: string;
  accentDark: string;
};

// Campfire is the Outpost's own amber (the look every Outpost starts in);
// the rest are real material names, climbing in ascending prestige order. The top
// tier is named for the Outpost's own Soul Forge lore rather than plain
// "Netherite", matching the rank ladder's late-game vocabulary.
export const SKINS: Skin[] = [
  { id: "campfire", name: "Campfire", unlockLevel: 1, accent: "#d98a4a", accentSoft: "rgba(217,138,74,0.3)", accentDark: "#5c3d1f" },
  { id: "iron", name: "Iron", unlockLevel: 1, accent: "#5b9bd5", accentSoft: "rgba(91,155,213,0.35)", accentDark: "#1c3a52" },
  { id: "copper", name: "Copper", unlockLevel: 5, accent: "#b87333", accentSoft: "rgba(184,115,51,0.35)", accentDark: "#4a2c14" },
  { id: "gold", name: "Gold", unlockLevel: 10, accent: "#d4af37", accentSoft: "rgba(212,175,55,0.35)", accentDark: "#4a3c14" },
  { id: "diamond", name: "Diamond", unlockLevel: 15, accent: "#4fd8e0", accentSoft: "rgba(79,216,224,0.35)", accentDark: "#123a3d" },
  { id: "soulforged-steel", name: "Soulforged Steel", unlockLevel: 20, accent: "#8b6fb0", accentSoft: "rgba(139,111,176,0.35)", accentDark: "#2a2135" },
];

export const SKINS_BY_ID: Record<SkinId, Skin> = Object.fromEntries(
  SKINS.map((s) => [s.id, s])
) as Record<SkinId, Skin>;

export type FlairBadge = { icon: string; name: string; unlockLevel: number };

export const FLAIR_BADGES: FlairBadge[] = [
  { icon: "\u{1F528}", name: "Apprentice's Hammer", unlockLevel: 2 },
  { icon: "\u{2692}\u{FE0F}", name: "Journeyman's Anvil", unlockLevel: 5 },
  { icon: "\u{1F6E0}\u{FE0F}", name: "Tradesman's Toolkit", unlockLevel: 10 },
  { icon: "\u{1F451}", name: "Craftsman's Crown", unlockLevel: 15 },
  { icon: "\u{1F3C5}", name: "Veteran's Medal", unlockLevel: 20 },
];

// Revealed one at a time, in order, on each level-up — accumulates into a
// readable "logbook" inside the Outpost. Cycles once the pool runs out so
// higher levels don't dead-end with nothing new.
export const LORE_SNIPPETS: string[] = [
  "Early log: the millstone doesn't care how tired your arm is. Grind first, ask questions later.",
  "Hoppers weren't always this convenient — early prototypes needed a hand crank per stack.",
  "The crucible remembers every alloy you've ever poured into it, whether you meant to or not.",
  "A broody hen won't be rushed. Neither will this pack's balance testing.",
  "Windmills only turn when the world lets them. Some days that's the whole lesson.",
  "Rope frays. Grapples slip. The mountain doesn't apologize either way.",
  "Darkness in this pack isn't cosmetic — it's a standing invitation.",
  "Hemp was never glamorous. It was just always there when the sheep weren't.",
  "The soul urn holds more than mobs. It holds every farm you almost gave up on.",
  "Every hardcore mechanic in this pack started as someone's 'wouldn't it be funny if—'",
  "The saw doesn't forgive a bad cut. Neither does the deploy pipeline, most days.",
  "Somewhere in an old changelog: 'rebalanced difficulty.' It was not rebalanced down.",
];

export function loreSnippetForLevel(level: number): string {
  const index = (level - 2) % LORE_SNIPPETS.length; // level 2 = first snippet
  return LORE_SNIPPETS[((index % LORE_SNIPPETS.length) + LORE_SNIPPETS.length) % LORE_SNIPPETS.length];
}

// Repeatable XP sources (only awarded once tier 2 is unlocked).
export const XP_PER_CORRECT_ANSWER = 5;
export const XP_PER_DAILY_VISIT = 10;

// Shared with hub-storage.ts (for typing persisted last/pinned tab) and
// Tier2LeftMenu.tsx/Tier2RightMenu.tsx (for the rails themselves), so all
// three stay in sync.
export const TIER2_TAB_IDS = [
  "overview",
  "patch-notes",
  "quiz",
  "achievements",
  "progression",
] as const;

export type Tier2TabId = (typeof TIER2_TAB_IDS)[number];

export function isTier2TabId(value: string): value is Tier2TabId {
  return (TIER2_TAB_IDS as readonly string[]).includes(value);
}

// The two flanking menus' groupings — "Menus" (content you browse) on the
// left, "Your Progress" (personal stats/profile pages) on the right. Purely
// a display grouping; achievement thresholds keyed off TIER2_TAB_IDS.length
// (5) are unaffected by which side a tab renders on.
export const LEFT_MENU_TAB_IDS: Tier2TabId[] = ["patch-notes", "quiz"];
// Achievements lives in its own full-width "Accomplishments" section below
// the main card grid instead of a menu tab — too content-heavy for a
// narrow side panel. Still a Tier2TabId for deep-linking/visit-tracking
// purposes (see AccomplishmentsSection.tsx), just not rail-driven.
export const RIGHT_MENU_TAB_IDS: Tier2TabId[] = ["overview", "progression"];

export function isLeftMenuTab(tab: Tier2TabId): boolean {
  return (LEFT_MENU_TAB_IDS as string[]).includes(tab);
}

export const TAB_LABELS: Record<Tier2TabId, string> = {
  overview: "Overview",
  "patch-notes": "Patch Notes",
  quiz: "Guess the Mod",
  achievements: "Achievements",
  progression: "Progression",
};

export const TAB_ICONS: Record<Tier2TabId, string> = {
  overview: "\u{1F4CA}",
  "patch-notes": "\u{1F4DC}",
  quiz: "\u{1F9E0}",
  achievements: "\u{1F3C6}",
  progression: "\u{2699}\u{FE0F}",
};

// Deep-linkable tabs: #outpost-quiz etc. Lets a refresh or a shared link
// land back on the exact tab open on the right side it belongs to.
const HASH_PREFIX = "#outpost-";

export function readHashTab(): Tier2TabId | null {
  if (typeof window === "undefined") return null;
  const hash = window.location.hash;
  if (!hash.startsWith(HASH_PREFIX)) return null;
  const candidate = hash.slice(HASH_PREFIX.length);
  return isTier2TabId(candidate) ? candidate : null;
}

export function writeHashTab(tab: Tier2TabId) {
  window.history.replaceState(null, "", `${HASH_PREFIX}${tab}`);
}

// --- Date/moon helpers for the "Mob & Moonphase" achievement category ---
// BTW itself ties mob-spawn rates to real moon phase, so this is a genuine
// mechanic reference, not decoration. Standard synodic-month approximation,
// anchored to a known new moon — deterministic, no dependency.
const SYNODIC_MONTH_DAYS = 29.530588853;
const KNOWN_NEW_MOON_UTC = Date.UTC(2000, 0, 6, 18, 14);

export function moonAgeDays(date: Date): number {
  const diffDays = (date.getTime() - KNOWN_NEW_MOON_UTC) / 86_400_000;
  return ((diffDays % SYNODIC_MONTH_DAYS) + SYNODIC_MONTH_DAYS) % SYNODIC_MONTH_DAYS;
}

export function isFullMoon(date: Date): boolean {
  const age = moonAgeDays(date);
  return age > SYNODIC_MONTH_DAYS / 2 - 1.5 && age < SYNODIC_MONTH_DAYS / 2 + 1.5;
}

export function isNewMoon(date: Date): boolean {
  const age = moonAgeDays(date);
  return age < 1.5 || age > SYNODIC_MONTH_DAYS - 1.5;
}

export function isWeekend(date: Date): boolean {
  const day = date.getUTCDay();
  return day === 0 || day === 6;
}
