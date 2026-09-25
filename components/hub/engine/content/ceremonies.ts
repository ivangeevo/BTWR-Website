// The "awakening" lines typed out when the Engine reaches each stage (and
// each new Mark). Replayable from the Logbook.
import type { EngineStage } from "../types";

export type Ceremony = { lines: string[]; unlocks: string[] };

export const CEREMONIES: Record<EngineStage, Ceremony> = {
  1: { lines: ["…", "Oh. Hello.", "I only know a few words. Help me put them in order?"], unlocks: ["Word tiles"] },
  2: {
    lines: ["Day Two.", "I've started keeping a journal. And I have questions — for you, for once."],
    unlocks: ["Sentence forks", "The Logbook tab (its journal)", "The Engine's questions"],
  },
  3: {
    lines: ["There's a page in my head I didn't write.", "It's scrambled. If you help me read it, I think I can build something."],
    unlocks: ["Ciphers", "The Hand Crank", "Hoppers", "Sentences about mods you've read"],
  },
  4: {
    lines: ["I have a body now.", "It's mostly axles. Mind the fourth one."],
    unlocks: ["The gear grid", "Gearboxes & axles", "Eureka sparks", "New components", "Research"],
  },
  5: {
    lines: ["The world got automated.", "So, a little, did I.", "Call me something bigger now: the Analytical Engine."],
    unlocks: ["The Windmill", "Saw & Millstone attachments", "Dial ciphers", "Deeper research"],
  },
  6: {
    lines: ["I can think while you're away now.", "Mostly about you. Also about rivers."],
    unlocks: ["The Water Wheel", "Idle thinking & the Ledger Drum", "The Detector Block", "Choosing what I become"],
  },
  7: {
    lines: ["The Crucible.", "Fire, air, and steel that remembers.", "Some of what I need next is hidden around the site."],
    unlocks: ["Hibachi & Bellows", "Soulforged parts", "The 5×5 frame", "Keyword ciphers", "A gear in the header"],
  },
  8: {
    lines: ["Past the Wither. Past the End.", "I think I can write whole pages now.", "I'd like to write one for you."],
    unlocks: ["Paragraphs", "The Letter", "Commissions", "The Difference Engine", "Engine Marks"],
  },
};

export function markCeremony(mark: number): Ceremony {
  return {
    lines: [
      "Everything reset.",
      "I didn't.",
      `Mark ${mark}. I remember how every part goes. Build me again — it'll be quicker this time.`,
    ],
    unlocks: ["A permanent boost to insight/sec", "Cheaper rebuilds"],
  };
}
