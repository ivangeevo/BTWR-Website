// The Analytical Engine's own achievement category — 3–5 per stage plus the
// endgame, a few secret. Defined here (not inline in achievements-catalog.ts)
// so the Engine's rules and its definitions live side by side; the catalog
// spreads ENGINE_ACHIEVEMENT_DEFS into ACHIEVEMENTS and AchievementsProvider
// spreads the rules into its generic checker.
import modsData from "@/data/mods.json";
import type { AchievementDef, AchievementId } from "../achievements-catalog";
import type { HubState } from "../hub-storage";
import { ASKS_BY_ID } from "./content/asks";
import { isDialCipher } from "./stages";
import type { BeliefAxis } from "./types";

export const ENGINE_ACHIEVEMENT_IDS = [
  "en-day-two",
  "en-first-ask",
  "en-believer",
  "en-true-believer",
  "en-stump",
  "en-first-cipher",
  "en-first-hopper",
  "en-well-read",
  "en-librarian",
  "en-first-iron",
  "en-crank-100",
  "en-first-pop",
  "en-clean-engage",
  "en-mid-game",
  "en-windmill",
  "en-caesar",
  "en-sawmill",
  "en-thrive",
  "en-water-wheel",
  "en-detector-10",
  "en-full-drum",
  "en-crucible",
  "en-soulforged",
  "en-starlight",
  "en-eureka-50",
  "en-companion",
  "en-wither-end",
  "en-letter",
  "en-mark-ii",
  "en-mark-v",
  "en-commissions-7",
  "en-first-gold",
  "en-all-gold",
  "en-billion",
  "en-all-specs",
  "en-sky-held",
] as const;

export type EngineAchievementId = (typeof ENGINE_ACHIEVEMENT_IDS)[number];

function def(
  id: EngineAchievementId,
  title: string,
  description: string,
  icon: string,
  opts: { secret?: boolean; xp?: number } = {}
): AchievementDef {
  return { id, title, description, icon, secret: opts.secret, category: "engine", xp: opts.xp };
}

export const ENGINE_ACHIEVEMENT_DEFS: AchievementDef[] = [
  def("en-day-two", "Day Two", "Ponder made it through its first night.", "\u{1F305}"),
  def("en-first-ask", "It Asked You Something", "Answered one of the Engine's questions.", "\u{2753}"),
  def("en-believer", "Confidant", "Answered 10 of the Engine's questions.", "\u{1F5E3}\u{FE0F}", { xp: 75 }),
  def("en-true-believer", "Consistent", "Answered six questions in a row the same way at heart.", "\u{1F9ED}", { secret: true, xp: 150 }),
  def("en-stump", "The Stump", "Ponder found a page in its head it didn't write.", "\u{1FAB5}", { xp: 75 }),
  def("en-first-cipher", "Codebreaker", "Decoded the Engine's first blueprint.", "\u{1F510}", { xp: 75 }),
  def("en-first-hopper", "A Place for Loose Thoughts", "Built the Engine's first Hopper.", "\u{1F53B}", { xp: 50 }),
  def("en-well-read", "Well Read", "Let the Engine read 20 mods on the Mods page.", "\u{1F4DA}", { xp: 100 }),
  def("en-librarian", "Librarian", "Let the Engine read every mod in the pack.", "\u{1F3DB}\u{FE0F}", { xp: 200 }),
  def("en-first-iron", "The Contraption", "Ponder built itself a body.", "\u{2699}\u{FE0F}", { xp: 100 }),
  def("en-crank-100", "Elbow Grease", "Turned the hand crank 100 times.", "\u{1F4AA}", { xp: 75 }),
  def("en-first-pop", "Three Was the Limit", "Popped an axle.", "\u{1F4A5}", { secret: true, xp: 50 }),
  def("en-clean-engage", "Clean Engage", "Engaged the clutch with something making power and nothing popping.", "\u{2705}", { xp: 75 }),
  def("en-mid-game", "The Analytical Engine", "It renamed itself. It had earned it.", "\u{1F9E0}", { xp: 150 }),
  def("en-windmill", "Steady Wind", "Ran the Engine on a windmill.", "\u{1F32C}\u{FE0F}", { xp: 100 }),
  def("en-caesar", "Turn of the Dial", "Decoded a dial cipher.", "\u{1F39B}\u{FE0F}", { xp: 100 }),
  def("en-sawmill", "Sawmill", "Chopped 25 trees with the Engine's Saw running.", "\u{1FA9A}", { xp: 100 }),
  def("en-thrive", "Beginning to Thrive", "The Engine learned to think while you're away.", "\u{1F331}", { xp: 150 }),
  def("en-water-wheel", "Running Water", "Ran the Engine on a water wheel.", "\u{1F30A}", { xp: 100 }),
  def("en-detector-10", "Sixth Sense", "Used the Detector Block 10 times in Guess the Mod.", "\u{1F4E1}", { xp: 100 }),
  def("en-full-drum", "A Full Drum", "Came back to a Ledger Drum filled to capacity.", "\u{1F941}", { xp: 75 }),
  def("en-crucible", "The Crucible", "The Engine reached the forge.", "\u{1F525}", { xp: 200 }),
  def("en-soulforged", "Soulforged", "Forged the Engine's first soulforged part.", "\u{1F5E1}\u{FE0F}", { xp: 150 }),
  def("en-starlight", "Not a Star", "Found what was hiding in the night sky.", "\u{2B50}", { secret: true, xp: 200 }),
  def("en-eureka-50", "Eureka, Eureka", "Caught 50 Eureka sparks.", "\u{1F4A1}", { xp: 150 }),
  def("en-companion", "Hold That Thought", "Held the Engine's gear in the header until it answered.", "\u{1F6DE}", { xp: 100 }),
  def("en-wither-end", "The Wither & The End", "The Engine reached its final chapter.", "\u{1F30C}", { xp: 250 }),
  def("en-letter", "Dear You", "Let the Engine finish its letter to you.", "\u{2709}\u{FE0F}", { xp: 300 }),
  def("en-mark-ii", "Mark II", "Rebuilt the Engine after a prestige.", "\u{1F501}", { xp: 150 }),
  def("en-mark-v", "Mark V", "Rebuilt the Engine four times.", "\u{1F3DB}\u{FE0F}", { xp: 300 }),
  def("en-commissions-7", "On Commission", "Completed 7 of the Engine's commissions.", "\u{1F4DC}", { xp: 150 }),
  def("en-first-gold", "Difference Engine", "Earned a gold medal on a Difference Engine challenge.", "\u{1F947}", { xp: 150 }),
  def("en-all-gold", "Perfect Tolerances", "Earned gold on every Difference Engine challenge.", "\u{1F3C6}", { secret: true, xp: 400 }),
  def("en-billion", "A Billion Thoughts", "The Engine thought its billionth thought.", "\u{1F522}", { xp: 250 }),
  def("en-all-specs", "Every Temper", "Tried every specialization the Engine can take.", "\u{1F3AD}", { secret: true, xp: 200 }),
  def("en-sky-held", "Hold the Sky", "Asked the Engine to hold the sky still — and it did.", "\u{1F30D}", { secret: true, xp: 250 }),
];


type Ctx = { state: HubState };

const TOTAL_MODS = (modsData as { mods: unknown[] }).mods.length;
const DIFFERENCE_CHALLENGE_COUNT = 12;

function golds(c: Ctx): number {
  return Object.values(c.state.engine.difference).filter((d) => d.medal === "gold").length;
}

function idleHas(c: Ctx, type: string): boolean {
  const e = c.state.engine;
  return e.grid.clutch && !!e.solved?.idle.sources.some((s) => s.type === type && s.toCore);
}

// Six answers in a row leaning the same way — read off the answer order.
function sameAxisStreak(c: Ctx, askAxis: (qid: string, oid: string) => BeliefAxis | null): number {
  const e = c.state.engine;
  let best = 0;
  let run = 0;
  let prev: BeliefAxis | null = null;
  for (const qid of e.askOrder) {
    const axis = askAxis(qid, e.askAnswers[qid]);
    run = axis && axis === prev ? run + 1 : axis ? 1 : 0;
    prev = axis;
    best = Math.max(best, run);
  }
  return best;
}

export const ENGINE_NUMERIC_RULES: { id: AchievementId; at: number; read: (c: Ctx) => number }[] = [
  { id: "en-day-two", at: 2, read: (c) => c.state.engine.stage },
  { id: "en-first-ask", at: 1, read: (c) => c.state.engine.counters.asksAnswered },
  { id: "en-believer", at: 10, read: (c) => c.state.engine.counters.asksAnswered },
  { id: "en-stump", at: 3, read: (c) => c.state.engine.stage },
  { id: "en-first-cipher", at: 1, read: (c) => c.state.engine.counters.ciphersSolved },
  { id: "en-first-hopper", at: 1, read: (c) => c.state.engine.components.hopper ?? 0 },
  { id: "en-well-read", at: 20, read: (c) => c.state.engine.modsRead.length },
  { id: "en-librarian", at: TOTAL_MODS, read: (c) => c.state.engine.modsRead.length },
  { id: "en-first-iron", at: 4, read: (c) => c.state.engine.stage },
  { id: "en-crank-100", at: 100, read: (c) => c.state.engine.counters.cranks },
  { id: "en-first-pop", at: 1, read: (c) => c.state.engine.counters.pops },
  { id: "en-clean-engage", at: 1, read: (c) => c.state.engine.counters.cleanEngages },
  { id: "en-mid-game", at: 5, read: (c) => c.state.engine.stage },
  { id: "en-sawmill", at: 25, read: (c) => c.state.engine.counters.sawChops },
  { id: "en-thrive", at: 6, read: (c) => c.state.engine.stage },
  { id: "en-detector-10", at: 10, read: (c) => c.state.engine.counters.detectorUses },
  { id: "en-full-drum", at: 1, read: (c) => c.state.engine.counters.offlineCapped },
  { id: "en-crucible", at: 7, read: (c) => c.state.engine.stage },
  { id: "en-soulforged", at: 1, read: (c) => c.state.engine.counters.soulforged },
  { id: "en-starlight", at: 1, read: (c) => c.state.engine.counters.starFound },
  { id: "en-eureka-50", at: 50, read: (c) => c.state.engine.counters.eurekasCaught },
  { id: "en-companion", at: 1, read: (c) => c.state.engine.counters.companionHolds },
  { id: "en-wither-end", at: 8, read: (c) => c.state.engine.stage },
  { id: "en-mark-ii", at: 2, read: (c) => c.state.engine.mark },
  { id: "en-mark-v", at: 5, read: (c) => c.state.engine.mark },
  { id: "en-commissions-7", at: 7, read: (c) => c.state.engine.counters.commissionsDone },
  { id: "en-first-gold", at: 1, read: golds },
  { id: "en-all-gold", at: DIFFERENCE_CHALLENGE_COUNT, read: golds },
  { id: "en-billion", at: 1e9, read: (c) => c.state.engine.lifetimeInsight },
  { id: "en-all-specs", at: 3, read: (c) => c.state.engine.specsTried.length },
  { id: "en-sky-held", at: 1, read: (c) => c.state.engine.counters.skyHolds },
  // Ponder's original ten, re-pointed at the Engine's slice.
  { id: "pd-first-sentence", at: 1, read: (c) => c.state.engine.solvedCount },
  { id: "pd-fluent", at: 10, read: (c) => c.state.engine.solvedCount },
  { id: "pd-first-choice", at: 1, read: (c) => c.state.engine.choicesMade },
  { id: "pd-insight-1", at: 1, read: (c) => c.state.engine.lifetimeInsight },
  { id: "pd-insight-10", at: 10, read: (c) => c.state.engine.lifetimeInsight },
  { id: "pd-insight-50", at: 50, read: (c) => c.state.engine.lifetimeInsight },
  { id: "pd-insight-200", at: 200, read: (c) => c.state.engine.lifetimeInsight },
  { id: "pd-automated", at: 3, read: (c) => c.state.engine.stage },
  { id: "pd-oracle", at: 8, read: (c) => c.state.engine.stage },
];

function askAxis(qid: string, oid: string): BeliefAxis | null {
  return ASKS_BY_ID[qid]?.options.find((o) => o.id === oid)?.axis ?? null;
}

export const ENGINE_CUSTOM_RULES: { id: AchievementId; check: (c: Ctx) => boolean }[] = [
    { id: "en-true-believer", check: (c) => sameAxisStreak(c, askAxis) >= 6 },
    { id: "en-windmill", check: (c) => idleHas(c, "windmill") },
    { id: "en-water-wheel", check: (c) => idleHas(c, "waterWheel") },
    {
      id: "en-caesar",
      check: (c) => c.state.engine.ciphers.solved.some((id) => isDialCipher(id)),
    },
    { id: "en-letter", check: (c) => c.state.engine.letter !== null },
    { id: "pd-old-friend", check: (c) => c.state.engine.mark >= 2 && c.state.engine.journal.length >= 20 },
];
