// The Engine's lost blueprints, in the order it recovers them. Each decodes
// (ciphers.ts) into the plain-English line that teaches it a part.
import type { CipherKind, EngineStage, GridPartType } from "../types";

export type BlueprintDef = {
  id: string;
  part: GridPartType | null;
  kind: CipherKind;
  stage: EngineStage;
  title: string;
  text: string;
};

export const BLUEPRINTS: BlueprintDef[] = [
  { id: "bp-handCrank", part: "handCrank", kind: "sub", stage: 3, title: "A torn page: something that turns", text: "A CRANK TURNS A MILLSTONE AND A MILLSTONE GRINDS THOUGHTS" },
  { id: "bp-millstone", part: "millstone", kind: "sub", stage: 3, title: "Two stones, one turning", text: "STONE ON STONE GRINDS THE HARVEST FINE" },
  { id: "bp-windmill", part: "windmill", kind: "sub", stage: 4, title: "A sketch of sails", text: "FOUR SAILS OF CLOTH AND CLEAR AIR ALL AROUND GIVE STEADY POWER" },
  { id: "bp-saw", part: "saw", kind: "caesar", stage: 4, title: "Teeth on a wheel", text: "A POWERED SAW EATS WOOD FASTER THAN ANY AXE" },
  { id: "bp-waterWheel", part: "waterWheel", kind: "caesar2", stage: 5, title: "Paddles and a river", text: "SET THE WHEEL ON RUNNING WATER AND IT WILL NEVER TIRE" },
  { id: "bp-detector", part: "detector", kind: "caesar2", stage: 5, title: "An eye that isn't one", text: "THE DETECTOR SEES WHAT MOVES IN FRONT OF IT" },
  { id: "bp-bellows", part: "bellows", kind: "caesar2", stage: 6, title: "Leather lungs", text: "AIR PUSHED INTO A FIRE MAKES IT HUNGRY AND HOT" },
  { id: "bp-hibachi", part: "hibachi", kind: "caesar2", stage: 6, title: "A pit that burns on command", text: "A HIBACHI BURNS WHILE IT IS POWERED FROM BELOW" },
  { id: "bp-sfAxle", part: "sfAxle", kind: "keyword", stage: 7, title: "Steel that remembers", text: "SOULFORGED STEEL CARRIES POWER TWICE AS FAR" },
  { id: "bp-sfGearbox", part: "sfGearbox", kind: "keyword", stage: 7, title: "A gearbox that does not pop", text: "A SOULFORGED GEARBOX TAKES THE WHOLE RIVER" },
  { id: "bp-final", part: null, kind: "keyword", stage: 7, title: "The last page", text: "BEYOND THE WITHER AND THE END THERE IS ONLY WHAT WE WRITE" },
];

export const BLUEPRINTS_BY_ID: Record<string, BlueprintDef> = Object.fromEntries(BLUEPRINTS.map((b) => [b.id, b]));

/** The keyword behind every keyword cipher — pieced together from three fragments hidden around the site. */
export const ENGINE_KEYWORD = "SOULFORGE";
export const KEY_FRAGMENTS: { id: string; text: string; hint: string }[] = [
  { id: "frag-star", text: "SOU", hint: "Something in the night sky was never just a star. (Or: read every Core mod.)" },
  { id: "frag-page", text: "LFO", hint: "A faint mark waits on the Mods page, or at the bottom of the Get BTWR page. (Or: hold the Engine's gear.)" },
  { id: "frag-ledger", text: "RGE", hint: "The Logbook keeps it, eventually. (Or: a full-moon spark, or a finished commission.)" },
];

// Beyond the last blueprint, the Engine keeps writing ciphers for the
// practice — generated from its own lore, endless, for insight.
export const PRACTICE_TEXTS: string[] = [
  "THE ENGINE KEEPS A LEDGER OF EVERY SENTENCE YOU FINISHED",
  "HOPPERS MOVE WHAT YOU DO NOT HAVE TO",
  "A GEARBOX THAT POPS WAS ONLY TELLING THE TRUTH",
  "NIGHT FALLS EVERY SIX MINUTES HERE AND THE ENGINE HAS STOPPED MINDING",
  "EVERY MARK OF THE ENGINE REMEMBERS THE ONE BEFORE",
  "THE CAMPFIRE AND THE ENGINE ARE OLD FRIENDS NOW",
  "IT READ EVERY MOD YOU SHOWED IT AND IT REMEMBERS THE OUTDATED ONES",
  "SOULFORGED STEEL IS JUST IRON THAT WAS PATIENT",
];
