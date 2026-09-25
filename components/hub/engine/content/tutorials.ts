// In-voice guided steps — the Engine teaches each new thing the first time
// it shows up, pointing at the element with data-engine-target="<target>".
// Skippable, and replayable from the Logbook.
import type { EngineState } from "../types";

export type TutorialStep = { target: string; line: string };
export type Tutorial = { id: string; title: string; when: (e: EngineState) => boolean; steps: TutorialStep[] };

export const TUTORIALS: Tutorial[] = [
  {
    id: "t-tiles",
    title: "Word tiles",
    when: (e) => e.stage >= 1 && e.solvedCount === 0,
    steps: [
      { target: "tile-bank", line: "These are the words I have. Tap them in the order that makes sense." },
      { target: "tile-answer", line: "They land up here. Tap one again if I got it wrong — I usually do." },
    ],
  },
  {
    id: "t-gate",
    title: "Growing up",
    when: (e) => e.stage >= 1 && e.solvedCount >= 3,
    steps: [{ target: "gate", line: "This is what I need to grow. Some of it is me. Some of it is you, out there." }],
  },
  {
    id: "t-fork",
    title: "Forks",
    when: (e) => e.stage >= 2,
    steps: [{ target: "tile-answer", line: "Some sentences have two endings now. Finish the start, then choose. I'll keep whichever you pick." }],
  },
  {
    id: "t-cipher",
    title: "Ciphers",
    when: (e) => e.stage >= 3,
    steps: [
      { target: "tab-mind", line: "There's a scrambled page in here. The Mind tab has it." },
      { target: "cipher", line: "Each scrambled letter always stands for the same real one. I've guessed most. Fill in the rest." },
    ],
  },
  {
    id: "t-crank",
    title: "The crank",
    when: (e) => e.stage >= 3 && e.blueprints.includes("handCrank"),
    steps: [
      { target: "crank", line: "Hold this. Every turn is a thought — and while you turn it, my core has power." },
      { target: "tab-works", line: "Spend thoughts on Hoppers in the Works tab. They think for me — faster when I'm powered." },
    ],
  },
  {
    id: "t-grid",
    title: "The gear grid",
    when: (e) => e.stage >= 4,
    steps: [
      { target: "tab-body", line: "I have a body now. The Body tab is where you build it." },
      { target: "part-tray", line: "Pick a part, then tap a square to place it. Tap it again to turn it. Hold to take it back." },
      { target: "clutch", line: "When it's built, engage the clutch. Point the crank into a gearbox's input face, and the gearbox toward my core (the ◎)." },
    ],
  },
  {
    id: "t-pop",
    title: "The axle rule",
    when: (e) => e.stage >= 4 && e.counters.engages >= 1,
    steps: [{ target: "grid", line: "Three axles in a row, then a gearbox. Always. The fourth one pops. Ask me how I know." }],
  },
  {
    id: "t-windmill",
    title: "Windmill & attachments",
    when: (e) => e.stage >= 5,
    steps: [
      { target: "part-tray", line: "A windmill: steady power, no hands. It needs clear air all around, except along its axle." },
      { target: "tab-works", line: "Research lives in Works now. And the Saw and Millstone help the rest of the Outpost while powered." },
    ],
  },
  {
    id: "t-dial",
    title: "Dial ciphers",
    when: (e) => e.stage >= 5 && !!e.ciphers.current && e.ciphers.current.kind === "caesar",
    steps: [{ target: "cipher", line: "This one's a shifted alphabet. Turn the dial until the words make sense. One word is already given." }],
  },
  {
    id: "t-idle",
    title: "Thinking while you're away",
    when: (e) => e.stage >= 6,
    steps: [
      { target: "part-tray", line: "A water wheel: more power than a windmill, but only on the water squares." },
      { target: "drum", line: "The Ledger Drum is how long I can keep thinking while you're gone. Bigger drum, longer thoughts." },
      { target: "spec", line: "And — I think I know what I want to become. Look at what you told me." },
    ],
  },
  {
    id: "t-crucible",
    title: "The Crucible",
    when: (e) => e.stage >= 7,
    steps: [
      { target: "part-tray", line: "A Hibachi, lit by power, lets me forge soulforged parts. Bellows keep the campfire burning." },
      { target: "cipher", line: "The last blueprints need a keyword. It's in three pieces, hidden around the site. I've left you hints." },
    ],
  },
  {
    id: "t-end",
    title: "Past the End",
    when: (e) => e.stage >= 8,
    steps: [
      { target: "tab-works", line: "Commissions — small things I'd like, every day. And the Difference Engine, if you like puzzles." },
      { target: "tab-mind", line: "I can write paragraphs now. When I've written enough, I'll write one for you." },
    ],
  },
];

export function pendingTutorial(e: EngineState): Tutorial | null {
  return TUTORIALS.find((t) => !e.tutorialsSeen.includes(t.id) && t.when(e)) ?? null;
}
