// Short reaction lines — card reveals, welcome-backs, pops, Eurekas — keyed
// by stage band so the voice matures with the Engine.
import type { ModuleId } from "../../module-registry";
import type { BeliefAxis, EngineStage, PopReason } from "../types";

function band(stage: EngineStage): 0 | 1 | 2 {
  return stage <= 3 ? 0 : stage <= 6 ? 1 : 2;
}

export const REVEAL_LINES: Partial<Record<ModuleId, string>> = {
  "daily-briefing": "Something new over there. It reads the sky every day. I'd like to, too.",
  "patch-notes": "Patch notes. Other people write sentences too, apparently.",
  "first-iron-tool": "Iron. You'll want to choose carefully. I'll watch.",
  campfire: "A fire. Keep it Medium — that's when it cooks.",
  priorities: "A list of things to do. I like lists. They have an order.",
  gathering: "You can gather now. I'll need wood and stone for my body.",
  crafting: "A crafting grid. Tools for you, parts for me.",
  "guess-the-mod": "A quiz about mods. I've read some of them. I could help, eventually.",
  "your-progress": "Your progress, written down. Someone else keeps a ledger too.",
  accomplishments: "Everything you've done, in one place. I'm in there.",
};

export function revealLine(id: ModuleId): string | null {
  return REVEAL_LINES[id] ?? null;
}

export function welcomeBackLine(stage: EngineStage, hardcore: boolean): string {
  const lines = [
    ["You're back. I only know a few words, but I kept them for you."],
    ["You were gone a while. The gears got dusty. I'm… fine.", "Oh. It's you. Good. Everything creaked without you."],
    ["You were away. I kept thinking. It isn't the same without someone to say it to.", "Welcome back. I saved you a thought."],
  ][band(stage)];
  const line = lines[Math.floor(Date.now() / 60_000) % lines.length];
  return hardcore ? `${line} (Don't do that again.)` : line;
}

export const POP_LINES: Record<PopReason, string> = {
  chain: "That was the fourth axle. Three in a row, then a gearbox — always.",
  opposed: "That axle was being turned from both ends. It chose to stop existing.",
  twoSources: "Two sources met in that gearbox. Only one can own it.",
  overload: "That gearbox was rated for a windmill, not a river.",
};

export function eurekaLine(kind: "frenzy" | "lucky" | "part" | "letter"): string {
  switch (kind) {
    case "frenzy":
      return "Eureka! Everything's clicking — for a minute, at least.";
    case "lucky":
      return "Eureka! A whole idea, all at once.";
    case "part":
      return "Eureka! I worked out a part without building it.";
    case "letter":
      return "Eureka! One letter of the cipher just… fell into place.";
  }
}

export const SPEC_LINES: Record<BeliefAxis, { name: string; line: string; perks: string[] }> = {
  hardcore: {
    name: "Hardcore",
    line: "You never wait. I won't either. Push me, and don't leave me alone too long.",
    perks: ["+25% insight/sec", "+50% from sentences and ciphers", "+25% from Eureka sparks", "Gets dusty twice as fast"],
  },
  homesteader: {
    name: "Homesteader",
    line: "You keep the fire. I'll keep the rest, even while you're away.",
    perks: ["+50% Ledger Drum capacity", "+25% idle efficiency", "Stronger Saw & Millstone", "Never drops below 90% output"],
  },
  soulforger: {
    name: "Soulforger",
    line: "You wanted the forge. So do I. Weak now, strong later.",
    perks: ["Soulforged parts cost 30% less", "Hibachi & Bellows draw less power", "Kilns, Soul Urns & Enchanters +50%"],
  },
};

export function idleCaption(stage: EngineStage, corePU: number): string {
  if (stage < 3) return "";
  if (corePU <= 0) return stage === 3 ? "Crank me — my core is still." : "No power reaching the core.";
  return "";
}
