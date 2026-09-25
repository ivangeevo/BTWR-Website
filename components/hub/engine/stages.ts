// The Engine's eight stages — chapters of the real BTW Beginner's Guide —
// and the hybrid gate into each: something the Engine itself did AND
// something the visitor did elsewhere on the site, plus an insight cost.
// Gate numbers are admin-tunable (config.ts's EngineGateMechanic).
import type { EngineGateMechanic } from "./config";
import type { EngineStage, EngineState, GridPartType, SolveSummary } from "./types";

export type StageDef = { stage: EngineStage; chapter: string; caption: string };

export const STAGES: Record<EngineStage, StageDef> = {
  1: { stage: 1, chapter: "Day One", caption: "Punching trees for shafts, not logs. Same as you." },
  2: { stage: 2, chapter: "Day Two", caption: "Waiting for daylight before it decides anything." },
  3: { stage: 3, chapter: "The Stump", caption: "Found a blueprint in its own head. Can't read it yet." },
  4: { stage: 4, chapter: "Your First Iron", caption: "It has a body now. Mostly axles." },
  5: { stage: 5, chapter: "The Road to Mid-Game", caption: "The world got automated. So, a little, did it." },
  6: { stage: 6, chapter: "Beginning to Thrive", caption: "It thinks while you're away now. Mostly about you." },
  7: { stage: 7, chapter: "The Crucible", caption: "Soulforged steel. It chose its own temper." },
  8: { stage: 8, chapter: "The Wither & The End", caption: "Past the Wither, past the End — still writing." },
};

const ROMAN: [number, string][] = [
  [1000, "M"],
  [900, "CM"],
  [500, "D"],
  [400, "CD"],
  [100, "C"],
  [90, "XC"],
  [50, "L"],
  [40, "XL"],
  [10, "X"],
  [9, "IX"],
  [5, "V"],
  [4, "IV"],
  [1, "I"],
];

export function roman(n: number): string {
  let out = "";
  let left = Math.max(1, Math.floor(n));
  for (const [v, s] of ROMAN) {
    while (left >= v) {
      out += s;
      left -= v;
    }
  }
  return out;
}

export function stageTitle(stage: EngineStage, mark: number): string {
  if (stage <= 3) return "Ponder";
  if (stage === 4) return mark > 1 ? `The Contraption, Mark ${roman(mark)}` : "The Contraption";
  return mark > 1 ? `The Analytical Engine, Mark ${roman(mark)}` : "The Analytical Engine";
}

/** Everything a gate reads from outside the Engine, pre-resolved by the provider. */
export type GateSite = {
  daysVisited: number;
  unlockedCount: number;
  isTierUnlocked: (tierId: string) => boolean;
  isModuleRevealed: (moduleId: string) => boolean;
  /** Index of the visitor's current tool in the tool ladder. */
  toolIndex: number;
  toolIndexOf: (tierId: string) => number;
  toolNameOf: (tierId: string) => string;
  iron: number;
  quizCorrect: number;
};

export type GateReq = {
  id: string;
  label: string;
  done: boolean;
  progress: number;
  target: number;
  /** True for the "something elsewhere on the site" half of the gate. */
  site: boolean;
};

export type GateResult = { stage: EngineStage; reqs: GateReq[]; cost: number; met: boolean };

function count(id: string, label: string, have: number, target: number, site = false): GateReq {
  return { id, label, done: have >= target, progress: Math.min(have, target), target, site };
}

function flag(id: string, label: string, done: boolean, site = false): GateReq {
  return { id, label, done, progress: done ? 1 : 0, target: 1, site };
}

function hasSource(s: SolveSummary | undefined, type: GridPartType): boolean {
  return !!s?.sources.some((x) => x.type === type);
}

function poweredTypes(e: EngineState): GridPartType[] {
  const idle = e.solved?.idle;
  if (!idle) return [];
  const byUid = new Map(e.grid.cells.filter(Boolean).map((c) => [c!.uid, c!.type]));
  return idle.powered.map((uid) => byUid.get(uid)).filter((t): t is GridPartType => !!t);
}

function componentTypes(e: EngineState): number {
  return Object.values(e.components).filter((n) => (n ?? 0) > 0).length;
}

function componentTotal(e: EngineState): number {
  return Object.values(e.components).reduce<number>((a, n) => a + (n ?? 0), 0);
}

function toolReq(site: GateSite, tierId: string): GateReq {
  const target = site.toolIndexOf(tierId);
  return {
    id: `tool-${tierId}`,
    label: `Carry a ${site.toolNameOf(tierId)} (or better)`,
    done: site.toolIndex >= target,
    progress: Math.min(site.toolIndex, target),
    target,
    site: true,
  };
}

export function evaluateGate(next: EngineStage, e: EngineState, g: EngineGateMechanic, site: GateSite): GateResult {
  const reqs: GateReq[] = [];
  let cost = 0;
  const engaged = e.grid.clutch && !!e.solved;
  switch (next) {
    case 2:
      reqs.push(count("solves", "Finish sentences", e.solvedCount, g.s2Solves));
      reqs.push(
        flag(
          "return",
          `Come back another day (or earn ${g.s2Unlocked} achievements)`,
          site.daysVisited >= g.s2Days || site.unlockedCount >= g.s2Unlocked,
          true
        )
      );
      cost = g.s2Cost;
      break;
    case 3:
      reqs.push(count("forks", "Choose how sentences end", e.choicesMade, g.s3Choices));
      reqs.push(count("asks", "Answer the Engine's questions", Object.keys(e.askAnswers).length, g.s3Asks));
      reqs.push(flag("tier3", "Make camp (reach Outpost Tier 3)", site.isTierUnlocked("tier3"), true));
      reqs.push(count("mods", "Let it read mods on the Mods page", e.modsRead.length, g.s3ModsRead, true));
      cost = g.s3Cost;
      break;
    case 4:
      reqs.push(flag("bp-crank", "Decode the Hand Crank blueprint", e.blueprints.includes("handCrank")));
      reqs.push(count("modfacts", "Solve sentences about mods", e.solvesByKind.modFact, g.s4ModFacts));
      reqs.push(count("hoppers", "Own Hoppers", e.components.hopper ?? 0, g.s4Hoppers));
      reqs.push(flag("gathering", "Start Gathering at the Outpost", site.isModuleRevealed("gathering"), true));
      reqs.push(toolReq(site, "stone"));
      cost = g.s4Cost;
      break;
    case 5:
      reqs.push(
        count("cranked", "Crank power into the Engine's core", engaged ? e.solved!.cranked.corePU : 0, g.s5CorePU)
      );
      reqs.push(flag("bp-windmill", "Decode the Windmill blueprint", e.blueprints.includes("windmill")));
      reqs.push(count("types", "Own different components", componentTypes(e), g.s5ComponentTypes));
      reqs.push(toolReq(site, "copper"));
      reqs.push(count("iron", "Have iron on hand", site.iron, g.s5Iron, true));
      cost = g.s5Cost;
      break;
    case 6: {
      const types = poweredTypes(e);
      const caesar = e.ciphers.solved.filter((id) => id === "bp-saw" || id === "bp-millstone").length;
      reqs.push(flag("windmill", "Run the Engine on a windmill", engaged && hasSource(e.solved?.idle, "windmill")));
      reqs.push(flag("attach", "Power a Saw or Millstone", types.includes("saw") || types.includes("millstone")));
      reqs.push(count("caesar", "Decode dial ciphers", caesar, g.s6Caesar));
      reqs.push(flag("quiz", "Find Guess the Mod at the Outpost", site.isModuleRevealed("guess-the-mod"), true));
      reqs.push(count("quiz-correct", "Guess mods correctly", site.quizCorrect, g.s6QuizCorrect, true));
      cost = g.s6Cost;
      break;
    }
    case 7:
      reqs.push(flag("water", "Run the Engine on a water wheel", engaged && hasSource(e.solved?.idle, "waterWheel")));
      reqs.push(count("detector", "Use the Detector Block in Guess the Mod", e.counters.detectorUses, g.s7DetectorUses));
      reqs.push(flag("spec", "Choose what the Engine becomes", e.specialization !== null));
      reqs.push(count("components", "Own components in total", componentTotal(e), g.s7Components));
      reqs.push(flag("tier7", "Reach Outpost Tier 7", site.isTierUnlocked("tier7"), true));
      reqs.push(toolReq(site, "iron"));
      cost = g.s7Cost;
      break;
    case 8:
      reqs.push(count("soulforged", "Forge a soulforged part", e.counters.soulforged, 1));
      reqs.push(count("idle", "Steady power into the core", engaged ? e.solved!.idle.corePU : 0, g.s8CorePU));
      reqs.push(flag("bp-final", "Decode the last blueprint", e.ciphers.solved.includes("bp-final")));
      reqs.push(flag("tier9", "Reach Outpost Tier 9", site.isTierUnlocked("tier9"), true));
      reqs.push(toolReq(site, "diamond"));
      cost = g.s8Cost;
      break;
    default:
      break;
  }
  return { stage: next, reqs, cost, met: reqs.every((r) => r.done) };
}
