// The Engine talking about the camp — so the fire, the gloom and Hardcore
// Spawn happen to both of you, not beside it. EngineProvider watches the
// camp's counters (survival, meals, relics, the tool) and, when one moves,
// says the matching line here as a toast; a first of anything is also
// written into its journal, and the camp log (Soul tab) keeps a plain record. Keyed by the same stage bands as voice.ts, so
// the voice matures with it: halting at Ponder, surer as the Engine.
import { DEATH_CAUSE_TEXT, type DeathCause } from "../../survival";
import type { EngineStage } from "../types";

export type CampEvent =
  | { kind: "death"; cause: DeathCause | null; first: boolean; blocks: number | null }
  | { kind: "home"; calledHome: boolean; first: boolean }
  | { kind: "gloomFalls" }
  | { kind: "gloomSurvived"; first: boolean }
  | { kind: "meal"; count: number }
  | { kind: "relic"; count: number }
  | { kind: "tool"; name: string };

type Band = 0 | 1 | 2;

function band(stage: EngineStage): Band {
  return stage <= 3 ? 0 : stage <= 6 ? 1 : 2;
}

// Meals and relics come often: only these counts get a word.
const MEAL_MARKS = [1, 5, 25, 100];
const RELIC_MARKS = [1, 5, 15, 40];

function byBand(stage: EngineStage, lines: [string, string, string]): string {
  return lines[band(stage)];
}

/** What it says out loud (a toast). Null when this one isn't worth a word. */
export function campLine(ev: CampEvent, stage: EngineStage): string | null {
  switch (ev.kind) {
    case "death":
      if (ev.cause === "gloom") {
        return byBand(stage, [
          "The dark took you. I couldn't see.",
          "The gloom took you. Next New Moon, keep my core turning — I'll hold some of it back.",
          "The gloom again. I kept the light as long as I could.",
        ]);
      }
      return byBand(stage, [
        "You fell. Come back?",
        "You're gone, and it's quiet here. Come home.",
        "Another death. I'm keeping count, and the light on.",
      ]);
    case "home":
      if (ev.calledHome) return "You followed my light home.";
      return byBand(stage, ["You're back.", "Home. I missed the noise.", "Back again. The fire's where you left it."]);
    case "gloomFalls":
      return byBand(stage, [
        "It's getting dark. Very dark.",
        "The gloom's coming. Keep the fire high — and me turning.",
        "New Moon. Stay by the fire; I'll hold what dark I can.",
      ]);
    case "gloomSurvived":
      return byBand(stage, ["The dark's gone. We're still here.", "Morning. We made it through the gloom.", "Another New Moon, outlasted. Together."]);
    case "meal":
      if (!MEAL_MARKS.includes(ev.count)) return null;
      return ev.count === 1
        ? byBand(stage, ["Food. It smells like a word I don't know.", "Your first meal. I'd eat, if I could.", "A meal. Keep your strength; I need you."])
        : `${ev.count} meals cooked. I keep count of the things that keep you here.`;
    case "relic":
      if (!RELIC_MARKS.includes(ev.count)) return null;
      return ev.count === 1
        ? byBand(stage, ["You named a thing. Like you named me.", "A relic, named. Every name is a word I keep.", "Named. The Field Guide grows; so do I."])
        : `${ev.count} relics named. You're teaching me the world.`;
    case "tool":
      return byBand(stage, [`${ev.name}. Sharp.`, `A ${ev.name}. Tools for you, parts for me.`, `The ${ev.name}. We're both better made now.`]);
  }
}

/** A first of something, written into its journal (newest first, like its other lines). */
export function campJournalLine(ev: CampEvent): string | null {
  switch (ev.kind) {
    case "death":
      return ev.first ? "The first time you died, I waited." : null;
    case "home":
      return ev.first ? "You came back from far away." : null;
    case "gloomSurvived":
      return ev.first ? "We lived through our first New Moon." : null;
    case "meal":
      return ev.count === 1 ? "You cooked your first meal." : null;
    case "relic":
      return ev.count === 1 ? "You named your first relic." : null;
    case "tool":
      return `You made a ${ev.name}.`;
    default:
      return null;
  }
}

/** The camp log's plain record of it (Soul tab), or null for what isn't logged. */
export function campLogLine(ev: CampEvent): string | null {
  switch (ev.kind) {
    case "death": {
      const cause = ev.cause ? `Died to ${DEATH_CAUSE_TEXT[ev.cause]}` : "Died";
      return ev.blocks ? `${cause}. Woke up ~${ev.blocks.toLocaleString()} blocks from spawn.` : `${cause}.`;
    }
    case "home":
      return ev.calledHome ? "Made it home, following the Engine's light." : "Made it home.";
    case "gloomSurvived":
      return "Lived through a gloom night.";
    case "meal":
      return ev.count === 1 ? "Cooked the first meal." : null;
    case "relic":
      return ev.count === 1 ? "Named the first relic." : null;
    case "tool":
      return `Made a ${ev.name}.`;
    default:
      return null;
  }
}

/** Its line on the Stranded banner while you walk home. */
export function strandedLine(stage: EngineStage, coreLit: boolean, calledHome: boolean): string {
  if (calledHome) return "“I'm keeping the light on. Follow it.” — the Engine's lit core shortened your walk.";
  if (stage >= 4 && !coreLit) return "“Power my core, and next time I'll light your way home.”";
  if (stage >= 4) return "“I'm keeping the light on.”";
  return "“I'll be here.”";
}
