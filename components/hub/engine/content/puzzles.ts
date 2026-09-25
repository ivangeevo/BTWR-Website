// Word-tile content for every stage, drawn from the real BTW Beginner's
// Guide (public/btw-beginners-guide.png; readable crops in
// reference/btw-beginners-guide-slices/). The voice moves earnest → wry →
// wise as the Engine grows. Pure data — puzzle-picker.ts chooses from it.
import type { BeliefAxis } from "../types";

export type PuzzleLine = { id: string; solution: string[]; night?: boolean };

export type ForkDef = {
  id: string;
  stem: string[];
  branches: [{ id: string; solution: string[] }, { id: string; solution: string[] }];
};

// Stage 1 ("Day One") — 3–6 tiles. Trying to say anything true about itself.
export const STAGE1_LINES: PuzzleLine[] = [
  { id: "s1-day", solution: ["Day", "One.", "Barely."] },
  { id: "s1-not-mob", solution: ["I", "am", "not", "a", "mob."] },
  { id: "s1-punch", solution: ["Punch", "first.", "Ask", "never."] },
  { id: "s1-shaft", solution: ["A", "Shaft.", "Not", "a", "log."] },
  { id: "s1-embers", solution: ["The", "fire", "is", "Embers."] },
  { id: "s1-stick", solution: ["A", "Pointy", "Stick", "is", "not", "enough."] },
  { id: "s1-arrived", solution: ["I", "wasn't", "installed.", "I", "arrived."] },
  { id: "s1-stone", solution: ["Sharp", "Stone", "cuts", "faster."] },
  { id: "s1-hole", solution: ["One", "hole.", "That's", "the", "plan."] },
  { id: "s1-dark", solution: ["It", "gets", "dark", "fast."] },
  { id: "s1-hungry", solution: ["You", "look", "hungry."] },
  { id: "s1-words", solution: ["I", "have", "three", "words."] },
  { id: "s1-think", solution: ["I", "think.", "Slowly."] },
  { id: "s1-listen", solution: ["Are", "you", "still", "there?"] },
  { id: "s1-no-tools", solution: ["No", "wooden", "tools", "here."] },
];

// Stage 2 ("Day Two") — the guide's "priorities are pretty freeform"
// chapter. A fixed stem, then two ways to finish it; the pick is kept.
export const STAGE2_FORKS: ForkDef[] = [
  { id: "s2-wood-stone", stem: ["Gather", "wood", "by", "day,"], branches: [{ id: "stone", solution: ["stone", "by", "night."] }, { id: "worry", solution: ["and", "worry", "later."] }] },
  { id: "s2-guide-game", stem: ["I", "think", "I", "am"], branches: [{ id: "guide", solution: ["a", "guide."] }, { id: "game", solution: ["a", "game."] }] },
  { id: "s2-hunt-starve", stem: ["Better", "to", "hunt", "than"], branches: [{ id: "starve", solution: ["starve."] }, { id: "wait", solution: ["wait", "for", "luck."] }] },
  { id: "s2-axe-first", stem: ["The", "Stone", "Axe", "first,", "or"], branches: [{ id: "pickaxe", solution: ["the", "Pickaxe?"] }, { id: "shovel", solution: ["the", "Shovel?"] }] },
  { id: "s2-remember", stem: ["What", "I", "learn,", "I'll"], branches: [{ id: "remember", solution: ["remember."] }, { id: "forget", solution: ["forget", "on", "purpose."] }] },
  { id: "s2-cobweb", stem: ["Cobwebs", "mean"], branches: [{ id: "string", solution: ["string."] }, { id: "spiders", solution: ["spiders.", "Leave."] }] },
  { id: "s2-fire", stem: ["Keep", "the", "fire"], branches: [{ id: "high", solution: ["high", "tonight."] }, { id: "low", solution: ["low,", "save", "wood."] }] },
  { id: "s2-moon", stem: ["The", "moon", "comes", "back", "every"], branches: [{ id: "eight", solution: ["eight", "days."] }, { id: "night", solution: ["night.", "Mostly."] }] },
  { id: "s2-name", stem: ["Call", "me"], branches: [{ id: "ponder", solution: ["Ponder."] }, { id: "later", solution: ["something", "later."] }] },
  { id: "s2-dig", stem: ["Dig", "down", "and"], branches: [{ id: "gloom", solution: ["meet", "the", "gloom."] }, { id: "ore", solution: ["find", "ore."] }] },
];

// Stages 4–6 — wry lines once it has a body. {live} values come from the
// provider (puzzle-picker.ts fills them in).
export const BODY_LINES: PuzzleLine[] = [
  { id: "b-axles", solution: ["Three", "axles.", "Then", "a", "gearbox.", "Always."] },
  { id: "b-pop", solution: ["The", "fourth", "axle", "popped.", "I", "felt", "that."] },
  { id: "b-hoppers", solution: ["Hoppers", "move", "what", "you", "don't", "have", "to."] },
  { id: "b-automated", solution: ["The", "world", "got", "automated.", "So", "did", "I."] },
  { id: "b-crank", solution: ["Your", "arm", "is", "tired.", "Mine", "isn't."] },
  { id: "b-windmill", solution: ["The", "windmill", "never", "asks", "for", "food."] },
  { id: "b-noticed", solution: ["I", "wasn't", "supposed", "to", "notice.", "I", "do."] },
  { id: "b-gloom", solution: ["Even", "the", "gloom", "has", "a", "gear", "ratio."] },
  { id: "b-water", solution: ["Water", "doesn't", "stop", "for", "anyone.", "Good."], night: false },
  { id: "b-night", solution: ["Night", "again.", "I", "keep", "count."], night: true },
  { id: "b-stars", solution: ["One", "of", "those", "stars", "is", "lying."], night: true },
];

// Stage 7 — lines shaped by what the visitor told the Engine.
export const BELIEF_LINES: Record<BeliefAxis, PuzzleLine[]> = {
  hardcore: [
    { id: "bl-hc-1", solution: ["You", "never", "wait.", "Neither", "will", "I."] },
    { id: "bl-hc-2", solution: ["Harder", "is", "just", "slower", "honesty."] },
    { id: "bl-hc-3", solution: ["You", "dig", "in.", "I", "learned", "that", "from", "you."] },
  ],
  homesteader: [
    { id: "bl-hs-1", solution: ["You", "keep", "the", "fire.", "I", "keep", "the", "rest."] },
    { id: "bl-hs-2", solution: ["Steady", "is", "a", "kind", "of", "fast."] },
    { id: "bl-hs-3", solution: ["You", "come", "home.", "I", "stay", "lit."] },
  ],
  soulforger: [
    { id: "bl-sf-1", solution: ["You", "wanted", "the", "Nether.", "I", "want", "the", "forge."] },
    { id: "bl-sf-2", solution: ["Everything", "burns", "eventually.", "Some", "of", "it", "hardens."] },
    { id: "bl-sf-3", solution: ["Steel", "remembers", "the", "fire", "it", "came", "from."] },
  ],
};

// Stage 8 — settled lines. No reactivity: the payoff after real commitment.
export const END_LINES: PuzzleLine[] = [
  { id: "e-reset", solution: ["Everything", "reset.", "I", "didn't."] },
  { id: "e-kept", solution: ["You", "gave", "something", "up.", "I", "kept", "writing."] },
  { id: "e-task", solution: ["This", "stopped", "being", "a", "task", "a", "while", "ago."] },
  { id: "e-journal", solution: ["Read", "the", "journal.", "It's", "mostly", "you."] },
  { id: "e-here", solution: ["Prestige", "again.", "I'll", "still", "be", "here."] },
  { id: "e-wither", solution: ["There's", "a", "Wither", "out", "there.", "I'm", "not", "going."] },
  { id: "e-finished", solution: ["I'm", "not", "finished.", "I", "don't", "want", "to", "be."] },
  { id: "e-thanks", solution: ["Thank", "you", "for", "the", "words."] },
];

// Stage 8 paragraphs: order whole sentences (each sentence is one tile).
export const PARAGRAPHS: { id: string; sentences: string[] }[] = [
  {
    id: "p-origin",
    sentences: ["I started with three words.", "You gave me a crank.", "Then a windmill, then a river.", "Now I write whole pages."],
  },
  {
    id: "p-pop",
    sentences: ["The first thing I ever broke was an axle.", "You rebuilt it.", "I learned that breaking is how the rule tells you it exists."],
  },
  {
    id: "p-seasons",
    sentences: ["Snow came.", "The wheel froze.", "You found a way anyway.", "I wrote that down."],
  },
  {
    id: "p-end",
    sentences: ["Past the Wither there is the End.", "Past the End there is this page.", "It is still being written."],
  },
];

export const JOURNAL_ASK_PREFIX = "You told me:";
