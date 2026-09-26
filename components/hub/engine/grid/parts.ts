import type { EngineStage, GridPartType, Rot } from "../types";

// Everything that can sit on the Engine's gear grid. Real BTW mechanical
// power blocks: sources make power (the hand crank first, turned by hand),
// conductors move it (axles in straight lines, gearboxes to turn corners and
// reset an axle run), attachments do a job while powered (the Millstone,
// Saw and Bellows boost the Outpost's Stone, Wood and ore; the Detector
// helps Guess the Mod), consumers do a job for the Engine itself. Costs are real Outpost resources (see resources.ts).
export type PartRole = "source" | "conductor" | "attachment" | "consumer";

export type PartDef = {
  type: GridPartType;
  name: string;
  icon: string;
  role: PartRole;
  blurb: string;
  /** Resource id -> amount. */
  cost: Record<string, number>;
  /** Other parts from the inventory used up crafting it (a windmill or water wheel is built on an axle). */
  parts?: Partial<Record<GridPartType, number>>;
  /** Needs a decoded blueprint before it can be crafted. */
  needsBlueprint: boolean;
  /** Only craftable at a lit Hibachi (the Crucible). */
  soulforged: boolean;
  /** Can sit on water tiles as well as ground (nothing else can). */
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
    blurb: "Takes power on its yellow side and sends it out the other three. Resets an axle run. Pops if fed too much.",
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
    blurb: "Hold to turn: powers the Engine, and turns a Millstone, Saw or Bellows right next to it. Breaks if it's also next to another power source.",
    cost: { wood: 2, stone: 1 },
    needsBlueprint: true,
    soulforged: false,
    water: false,
    stage: 4,
  },
  millstone: {
    type: "millstone",
    name: "Millstone",
    icon: "\u{1FAA8}",
    role: "attachment",
    blurb: "Grid power into its input: extra Stone from every Mining run. A hand crank next to it grinds Stone every few turns.",
    cost: { stone: 12 },
    needsBlueprint: true,
    soulforged: false,
    water: false,
    stage: 4,
  },
  windmill: {
    type: "windmill",
    name: "Windmill",
    icon: "\u{1F32C}\u{FE0F}",
    role: "source",
    blurb: "Steady power from both ends of its axle. Its sails span five squares.",
    cost: { wood: 12, copper: 2 },
    parts: { axle: 1 },
    needsBlueprint: true,
    soulforged: false,
    water: false,
    stage: 4,
  },
  waterWheel: {
    type: "waterWheel",
    name: "Water Wheel",
    icon: "\u{1F30A}",
    role: "source",
    blurb: "More power than a windmill, day and night — spans three squares, and turns only with one of them on water and the river unfrozen.",
    cost: { wood: 16, iron: 2 },
    parts: { axle: 1 },
    needsBlueprint: true,
    soulforged: false,
    water: true,
    stage: 5,
  },
  saw: {
    type: "saw",
    name: "Saw",
    icon: "\u{1FA9A}",
    role: "attachment",
    blurb: "Grid power into its input: faster Wood Gathering and extra Wood every run. A hand crank next to it cuts Wood every few turns.",
    cost: { iron: 3, wood: 2 },
    needsBlueprint: true,
    soulforged: false,
    water: false,
    stage: 4,
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
    stage: 5,
  },
  bellows: {
    type: "bellows",
    name: "Bellows",
    icon: "\u{1F4A8}",
    role: "attachment",
    blurb: "Grid power into its input: extra of every ore a Mining run finds. A hand crank next to it turns up ore every few turns.",
    cost: { wood: 6, food: 4 },
    needsBlueprint: true,
    soulforged: false,
    water: false,
    stage: 6,
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
    stage: 6,
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
    icon: "\u{1F529}",
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
  "millstone",
  "windmill",
  "waterWheel",
  "saw",
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

// Parts that work along an axis (both thin ends), not a single face — they
// only have two distinct orientations.
export function isAxisPart(t: GridPartType): boolean {
  return isAxle(t) || t === "windmill" || t === "waterWheel";
}

// How many squares a part spans. Big sources lie across their axle, like
// real sails or paddles: the hub is the middle square, and power only
// leaves the hub's two axle faces.
export const PART_SPAN: Partial<Record<GridPartType, number>> = { windmill: 5, waterWheel: 3 };

export function partSpan(t: GridPartType): number {
  return PART_SPAN[t] ?? 1;
}

/** Whether a part's squares run left–right (axle N–S) rather than top–bottom. */
export function spanIsHorizontal(rot: Rot): boolean {
  return rot % 2 === 0;
}

/**
 * The squares a part at hub `index` covers, hub included (in cell order), or
 * null when it would run off the board.
 */
export function footprint(t: GridPartType, rot: Rot, index: number, w: number, h: number): number[] | null {
  const r = (partSpan(t) - 1) / 2;
  const x0 = index % w;
  const y0 = Math.floor(index / w);
  const horizontal = spanIsHorizontal(rot);
  const out: number[] = [];
  for (let k = -r; k <= r; k++) {
    const x = horizontal ? x0 + k : x0;
    const y = horizontal ? y0 : y0 + k;
    if (x < 0 || y < 0 || x >= w || y >= h) return null;
    out.push(y * w + x);
  }
  return out;
}

/** One tap's turn: axis parts flip between their two axes, the rest turn a quarter. */
export function nextRot(t: GridPartType, rot: Rot): Rot {
  return (isAxisPart(t) ? (rot % 2 === 0 ? 1 : 0) : (rot + 1) % 4) as Rot;
}

// Parts known without decoding anything — the Engine's own first body.
export const STARTER_BLUEPRINTS: GridPartType[] = ["axle", "gearbox"];
