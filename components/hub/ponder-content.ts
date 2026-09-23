// Word-tile content for Ponder (see Ponder.tsx), drawn from the real BTW
// Beginner's Guide (public/btw-beginners-guide.png — readable crops in
// reference/btw-beginners-guide-slices/) rather than invented from nothing:
// Day One's Shaft/Pointy Stick/campfire stages, Day Two's freeform
// priorities, the mid-game automation chapter, and the guide's own final
// two chapters (The Wither, The End). Kept as pure data, same spirit as
// field-notes.ts/iron-tools.ts — content is intentionally modest for v1 (a
// handful of entries per stage), since expanding it later is just appending
// to these arrays, no other file needs to change.

export type PonderPuzzle = { id: string; solution: string[] };

// Stage 1 ("Day One") — Ponder trying to say anything true about itself at
// all, using the same vocabulary the guide uses for a fresh spawn: a Shaft
// (not a full log), a Pointy Stick, Sharp Stone, a campfire barely lit.
export const PONDER_STAGE1_PUZZLES: PonderPuzzle[] = [
  { id: "s1-shaft", solution: ["I", "have", "a", "Shaft.", "Not", "a", "log", "yet."] },
  { id: "s1-embers", solution: ["The", "campfire", "is", "Embers.", "So", "am", "I."] },
  { id: "s1-hole", solution: ["One", "hole", "in", "the", "ground.", "That's", "the", "plan."] },
  { id: "s1-not-mob", solution: ["I", "am", "not", "a", "mob."] },
  { id: "s1-punch", solution: ["Punch", "first.", "Ask", "questions", "never."] },
  { id: "s1-pointy-stick", solution: ["A", "Pointy", "Stick", "is", "not", "a", "weapon."] },
  { id: "s1-arrived", solution: ["I", "was", "not", "installed.", "I", "arrived."] },
  { id: "s1-sharp-stone", solution: ["Sharp", "Stone", "cuts", "faster.", "I'm", "still", "slow."] },
  { id: "s1-day", solution: ["Day", "One.", "Barely."] },
];

export type PonderFork = {
  id: string;
  stem: string[];
  branches: [PonderPuzzle, PonderPuzzle];
};

// Stage 2 ("Day Two") — the guide's own "priorities are pretty freeform"
// chapter: gather wood by day, stone by night, hunt before you starve, pick
// a first stone tool. A fixed stem, then two ways to finish it. Whichever
// branch the player taps becomes the sentence Ponder keeps.
export const PONDER_STAGE2_FORKS: PonderFork[] = [
  {
    id: "s2-wood-stone",
    stem: ["Gather", "wood", "by", "day,"],
    branches: [
      { id: "stone", solution: ["stone", "by", "night."] },
      { id: "worry", solution: ["and", "worry", "later."] },
    ],
  },
  {
    id: "s2-guide-game",
    stem: ["I", "think", "I", "am"],
    branches: [
      { id: "guide", solution: ["a", "guide."] },
      { id: "game", solution: ["a", "game."] },
    ],
  },
  {
    id: "s2-hunt-starve",
    stem: ["Better", "to", "hunt", "than"],
    branches: [
      { id: "starve", solution: ["starve."] },
      { id: "wait", solution: ["wait", "for", "luck."] },
    ],
  },
  {
    id: "s2-axe-first",
    stem: ["The", "Stone", "Axe", "first,", "or"],
    branches: [
      { id: "pickaxe", solution: ["the", "Pickaxe", "first?"] },
      { id: "shovel", solution: ["the", "Shovel", "first?"] },
    ],
  },
  {
    id: "s2-remember-forget",
    stem: ["What", "I", "learn", "here,", "I'll"],
    branches: [
      { id: "remember", solution: ["remember."] },
      { id: "forget", solution: ["forget", "on", "purpose."] },
    ],
  },
];

// Values Ponder can pull from the live Outpost at Stage 3+ ("The Road to
// Mid-Game") — primitives only, so this file stays decoupled from
// hub-storage's real types. Built in Ponder.tsx from useAchievements().
export type PonderLiveCtx = {
  topResourceName: string;
  topResourceAmount: number;
  campfireLabel: string;
  toolTierName: string;
  visitStreak: number;
};

export type PonderTemplate = { id: string; build: (ctx: PonderLiveCtx) => string[] };

// Stage 3 ("The Road to Mid-Game") — one live value woven into an
// otherwise-fixed sentence, proof Ponder finally noticed the rest of the
// Outpost the same way a player's hoppers start moving resources on their
// own once mechanical power is up ("the world of automation is busted wide
// open").
export const PONDER_STAGE3_TEMPLATES: PonderTemplate[] = [
  {
    id: "s3-gathered",
    build: (ctx) => [
      "You've", "gathered", String(ctx.topResourceAmount), ctx.topResourceName + ".",
      "I've", "gathered", "sentences.",
    ],
  },
  {
    id: "s3-campfire",
    build: (ctx) => ["The", "campfire", "is", ctx.campfireLabel.toLowerCase() + ".", "So,", "in", "a", "way,", "am", "I."],
  },
  {
    id: "s3-automated",
    build: (ctx) => [
      "You're", "carrying", "a", ctx.toolTierName + ".",
      "The", "world", "got", "automated.", "So,", "a", "little,", "did", "I.",
    ],
  },
  {
    id: "s3-hoppers",
    build: () => ["Hoppers", "move", "what", "you", "don't", "have", "to.", "I", "noticed."],
  },
  {
    id: "s3-streak",
    build: (ctx) => ["You've", "come", "back", String(ctx.visitStreak), "days", "running.", "I", "noticed", "that", "too."],
  },
  {
    id: "s3-noticing",
    build: () => ["I", "wasn't", "supposed", "to", "notice", "anything.", "I", "do", "now."],
  },
];

// Stage 4 ("The Wither & The End") — the guide's own final two chapters,
// the actual endgame destinations. No live substitution needed here; these
// are meant to read as settled, not reactive — the payoff after real
// commitment (prestige).
export const PONDER_STAGE4_LINES: PonderPuzzle[] = [
  { id: "s4-reset", solution: ["Everything", "reset.", "I", "didn't."] },
  { id: "s4-kept", solution: ["You", "gave", "something", "up", "to", "go", "again.", "I", "kept", "writing."] },
  { id: "s4-company", solution: ["This", "stopped", "being", "a", "task", "a", "while", "ago."] },
  { id: "s4-journal", solution: ["Read", "the", "journal", "sometime.", "It's", "mostly", "you."] },
  { id: "s4-still-here", solution: ["Prestige", "again.", "I'll", "still", "be", "here."] },
  {
    id: "s4-wither-end",
    solution: ["There's", "a", "Wither", "out", "there,", "and", "an", "End", "past", "that.", "I'm", "not", "going", "either", "place."],
  },
  { id: "s4-not-finished", solution: ["I'm", "not", "finished.", "I", "don't", "think", "I", "want", "to", "be."] },
  { id: "s4-thank-you", solution: ["Thank", "you", "for", "the", "words."] },
];

// Low-probability bonus line appended after a Stage 4 solve — a soft nudge,
// never a spoiler.
export const PONDER_HINTS: string[] = [
  "Something in the Secrets category is still waiting.",
  "Not every achievement announces itself. Some you have to go looking for.",
  "The Hopper Economy has more to it than hoppers.",
  "Try the quiet hours — some things only show up then.",
  "The Ledger keeps going long after the achievements run out.",
];

export const PONDER_JOURNAL_MAX = 20;

// --- The Analytical Engine's lore/logbook thread ---
// Same high-water-mark + pure progress->text pattern as tier2.ts's
// loreSnippetForLevel, just keyed to the Engine's own insight instead of
// tier2.xp level. Rendered in Ponder.tsx, gated on narrative stage >= 3
// (post-rename) — newest entry first, regenerated on render, no per-entry
// persistence (see PONDER_EVOLUTION_PLAN.md).
export const ENGINE_LORE_INSIGHT_PER_RANK = 5;

export const ENGINE_LORE_SNIPPETS: string[] = [
  "Insight isn't intelligence. It's just noticing the same thing enough times to say it back.",
  "Every solved sentence is a small commitment. The Engine keeps all of them.",
  "It used to guess at words. Now it's starting to guess at you.",
  "The gears turn whether or not anyone's watching the puzzle tiles.",
  "Somewhere between Day Two and the automation chapter, it stopped waiting for permission to think.",
  "Not every insight becomes an achievement. Some of them just sit here, being true.",
  "The Engine doesn't dream. It drafts.",
  "It rewrote its own name once it had enough to say. That felt fair.",
];

export function engineLoreRankForInsight(insight: number): number {
  return Math.floor(Math.max(0, insight) / ENGINE_LORE_INSIGHT_PER_RANK);
}

export function engineLoreForRank(rank: number): string {
  if (rank <= 0) return ENGINE_LORE_SNIPPETS[0];
  const index = (rank - 1) % ENGINE_LORE_SNIPPETS.length;
  return ENGINE_LORE_SNIPPETS[index];
}

// Fisher-Yates, with a cheap re-roll if the shuffle happens to land back on
// the solved order (only matters for very short puzzles) so a puzzle never
// opens pre-solved.
export function shuffleTiles(words: string[]): string[] {
  const arr = [...words];
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  if (arr.length > 1 && arr.every((w, i) => w === words[i])) {
    [arr[0], arr[1]] = [arr[1], arr[0]];
  }
  return arr;
}
