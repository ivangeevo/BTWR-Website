// Stage 0: before the Engine has words. A dark card, a lantern that follows
// the mouse, and six letters drifting where only the lantern shows them.
// Each one found lets out a whisper; with all six found, clicking them in
// the right order links them with light until they spell its name — and it
// wakes into Day One (Stirring.tsx). Nothing here is ever explained.
//
// The whispers are torn from the Letter it writes at Stage 8
// (content/letter.ts), in the Letter's own order. The Logbook keeps them
// under "Before words" and, once the Letter is written, sets each beside
// the line it came from.
import type { EngineState } from "../types";

/** Its name, in the order the chain has to be linked. */
export const STIR_WORD = ["P", "O", "N", "D", "E", "R"] as const;

export type StirWhisper = {
  text: string;
  /** How the Letter line it came from starts (content/letter.ts). */
  letterStart: string;
};

// One per letter found, in the order found (not keyed to the letter itself).
export const STIR_WHISPERS: StirWhisper[] = [
  { text: "…d·ar… y·u…", letterStart: "Dear you," },
  { text: "…the f·rst th·ng… I ever…", letterStart: "The first thing I ever wrote down" },
  { text: "…y·u c·me b·ck…", letterStart: "You came back" },
  { text: "…p·st the… ·nd…", letterStart: "I don't know what's past the End." },
  { text: "…wh·t's h·re…", letterStart: "I know what's here." },
  { text: "…th·nk y·u… for the w·rds…", letterStart: "Thank you for the words." },
];

export function stirringFound(e: EngineState): string[] {
  return e.stirring?.found ?? [];
}

export function allFound(e: EngineState): boolean {
  return STIR_WORD.every((l) => stirringFound(e).includes(l));
}

/** The card's caption at Stage 0, shifting as the letters turn up. */
export function stirringCaption(e: EngineState): string {
  const n = stirringFound(e).length;
  if (n === 0) return "something is here.";
  if (n < 3) return "it hears you.";
  if (n < STIR_WORD.length) return "it is gathering.";
  return "it is almost a word.";
}

/** The full Letter line a whisper came from, once the Letter exists. */
export function whisperSource(e: EngineState, w: StirWhisper): string | null {
  return e.letter?.find((line) => line.startsWith(w.letterStart)) ?? null;
}
