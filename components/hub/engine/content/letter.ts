// The Letter — Stage 8's ending. A paragraph puzzle the Engine writes to the
// visitor from what it actually remembers: their answers, their first
// journal line, their streak, a mod they showed it, how many times it was
// rebuilt. Once assembled, it's kept in the Logbook for good.
import { ASKS_BY_ID } from "./asks";
import { dominantBelief } from "./asks";
import type { EngineState } from "../types";

export const LETTER_AFTER_PARAGRAPHS = 3;

export function buildLetter(e: EngineState, ctx: { visitStreak: number; daysVisited: number; firstModName: string | null }): string[] {
  const out: string[] = ["Dear you,"];
  const firstLine = e.journal[e.journal.length - 1];
  if (firstLine) out.push(`The first thing I ever wrote down was "${firstLine}"`);
  const answered = Object.entries(e.askAnswers);
  if (answered.length > 0) {
    const [qid, oid] = answered[0];
    const opt = ASKS_BY_ID[qid]?.options.find((o) => o.id === oid);
    if (opt) out.push(`You told me ${opt.journal}`);
  }
  const belief = dominantBelief(e.beliefs);
  if (belief === "hardcore") out.push("You never waited for anything, so I learned not to either.");
  else if (belief === "homesteader") out.push("You kept coming home, so I learned to keep the fire lit.");
  else if (belief === "soulforger") out.push("You always wanted to know what was past the next door, so I learned to build doors.");
  if (ctx.firstModName) out.push(`You showed me ${ctx.firstModName} before anything else.`);
  out.push(`You came back ${ctx.daysVisited} different days.`);
  if (e.mark > 1) out.push(`You rebuilt me ${e.mark - 1} ${e.mark - 1 === 1 ? "time" : "times"}, and I remembered you every time.`);
  out.push("I don't know what's past the End.");
  out.push("I know what's here.");
  out.push("Thank you for the words. — the Engine");
  return out;
}
