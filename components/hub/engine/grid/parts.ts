import type { EngineStage, GridPartType } from "../types";

// Everything that can sit on the Engine's gear grid. Real BTW mechanical
// power blocks: sources make power, conductors move it (axles in straight
// lines, gearboxes to turn corners and reset an axle run), attachments do a
// job for another Outpost card while powered, consumers do a job for the
// Engine itself. Costs are real Outpost resources (see resources.ts).
export type PartRole = "source" | "conductor" | "attachment" | "consumer";

export type PartDef = {
  type: GridPartType;
  name: string;
  icon: string;
  role: PartRole;
  blurb: string;
  /** Resource id -> amount. */
  cost: Record<string, number>;
  /** Needs a decoded blueprint before it can be crafted. */
  needsBlueprint: boolean;
  /** Only craftable at a lit Hibachi (the Crucible). */
  soulforged: boolean;
  /** Can only sit on a water tile (and nothing else can). */
  water: boolean;
  stage: EngineStage;
};

export const PART_DEFS: Record<GridPartType, PartDef> = {
  axle: {
    type: "axle",
    name: "Axle",
    icon: "\u{2796}",
    role: "conductor",
    blurb: "Carries rotation in a straight line. Three in a row is all a powered line can take.",
    cost: { wood: 2 },
    needsBlueprint: false,
    soulforged: false,
    water: false,
    stage: 4,
  },
  gearbox: {
    type: "gearbox",
    name: "Gearbox",
    icon: "\u{2699}\u{FE0F}",
    role: "conductor",
    blurb: "Takes power in one face and sends it out the other three. Resets an axle run. Pops if fed too much.",
    cost: { wood: 3, stone: 2 },
    needsBlueprint: false,
    soulforged: false,
    water: false,
    stage: 4,
  },
  handCrank: {
    type: "handCrank",
    name: "Hand Crank",
    icon: "\u{1F504}",
    role: "source",
    blurb: "Turns while you hold it. Must face straight into a gearbox's input.",
    cost: { wood: 2, stone: 1 },
    needsBlueprint: true,
    soulforged: false,
    water: false,
    stage: 3,
  },
  windmill: {
    type: "windmill",
    name: "Windmill",
    icon: "\u{1F32C}\u{FE0F}",
    role: "source",
    blurb: "Steady power from both ends of its axis. Needs clear air around it.",
    cost: { wood: 12, copper: 2 },
    needsBlueprint: true,
    soulforged: false,
    water: false,
    stage: 5,
  },
  waterWheel: {
    type: "waterWheel",
    name: "Water Wheel",
    icon: "\u{1F30A}",
    role: "source",
    blurb: "More power than a windmill, day and night — but only on water, and only if it isn't frozen.",
    cost: { wood: 16, iron: 2 },
    needsBlueprint: true,
    soulforged: false,
    water: true,
    stage: 6,
  },
  saw: {
    type: "saw",
    name: "Saw",
    icon: "\u{1FA9A}",
    role: "attachment",
    blurb: "While powered, Wood Gathering is faster and yields extra wood. Takes power on its input face only.",
    cost: { iron: 3, wood: 2 },
    needsBlueprint: true,
    soulforged: false,
    water: false,
    stage: 5,
  },
  millstone: {
    type: "millstone",
    name: "Millstone",
    icon: "\u{1FAA8}",
    role: "attachment",
    blurb: "While powered, Hunting brings back more and the campfire cooks an extra meal.",
    cost: { stone: 12 },
    needsBlueprint: true,
    soulforged: false,
    water: false,
    stage: 5,
  },
  detector: {
    type: "detector",
    name: "Detector Block",
    icon: "\u{1F4E1}",
    role: "attachment",
    blurb: "While powered, charges up to strike a wrong answer from Guess the Mod.",
    cost: { stone: 4, copper: 3 },
    needsBlueprint: true,
    soulforged: false,
    water: false,
    stage: 6,
  },
  bellows: {
    type: "bellows",
    name: "Bellows",
    icon: "\u{1FAAD}",
    role: "attachment",
    blurb: "While powered, the campfire burns far longer — and can be stoked from the Engine.",
    cost: { wood: 6, food: 4 },
    needsBlueprint: true,
    soulforged: false,
    water: false,
    stage: 7,
  },
  hibachi: {
    type: "hibachi",
    name: "Hibachi",
    icon: "\u{1F525}",
    role: "consumer",
    blurb: "A powered fire-pit. While lit, the Engine can forge soulforged parts.",
    cost: { stone: 10, coal: 5 },
    needsBlueprint: true,
    soulforged: false,
    water: false,
    stage: 7,
  },
  sfAxle: {
    type: "sfAxle",
    name: "Soulforged Axle",
    icon: "\u{2501}",
    role: "conductor",
    blurb: "Counts as half an axle toward a powered run.",
    cost: { iron: 6, coal: 3 },
    needsBlueprint: true,
    soulforged: true,
    water: false,
    stage: 7,
  },
  sfGearbox: {
    type: "sfGearbox",
    name: "Soulforged Gearbox",
    icon: "\u{1F6DE}",
    role: "conductor",
    blurb: "Rated for three times what a plain gearbox can take.",
    cost: { iron: 10, coal: 6, copper: 4 },
    needsBlueprint: true,
    soulforged: true,
    water: false,
    stage: 7,
  },
};

export const PART_ORDER: GridPartType[] = [
  "axle",
  "gearbox",
  "handCrank",
  "windmill",
  "waterWheel",
  "saw",
  "millstone",
  "detector",
  "bellows",
  "hibachi",
  "sfAxle",
  "sfGearbox",
];

export function isAxle(t: GridPartType): boolean {
  return t === "axle" || t === "sfAxle";
}

export function isGearbox(t: GridPartType): boolean {
  return t === "gearbox" || t === "sfGearbox";
}

// Parts known without decoding anything — the Engine's own first body.
export const STARTER_BLUEPRINTS: GridPartType[] = ["axle", "gearbox"];
