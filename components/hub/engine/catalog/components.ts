import type { ComponentId, EngineStage } from "../types";

// The Engine's "buildings" — BTW blocks the Engine learns to run as part of
// its own thinking apparatus, each producing insight/sec while the core has
// power to spare. Deliberately distinct from the grid's own parts (axles,
// gearboxes, windmills...), which move power rather than think with it.
// All of base cost / rate / draw are admin-tunable (config.ts).
export type ComponentDef = {
  id: ComponentId;
  name: string;
  icon: string;
  blurb: string;
  baseCost: number;
  /** Insight/sec per owned unit, before multipliers. */
  rate: number;
  /** Power units the core must spare for this TYPE (charged once per type owned, not per unit). */
  draw: number;
  /** Engine stage at which it appears in the shop. */
  stage: EngineStage;
};

export const COMPONENTS: ComponentDef[] = [
  {
    id: "hopper",
    name: "Hopper",
    icon: "\u{1F53B}",
    blurb: "Catches loose thoughts and drips them down to where they're useful.",
    baseCost: 15,
    rate: 0.1,
    draw: 1,
    stage: 3,
  },
  {
    id: "dispenser",
    name: "Block Dispenser",
    icon: "\u{1F4E4}",
    blurb: "Hands the Engine a new word to try, one block at a time.",
    baseCost: 100,
    rate: 1,
    draw: 1,
    stage: 4,
  },
  {
    id: "turntable",
    name: "Turntable",
    icon: "\u{1F504}",
    blurb: "Turns an idea over until it shows its other side.",
    baseCost: 1_100,
    rate: 8,
    draw: 2,
    stage: 4,
  },
  {
    id: "pulley",
    name: "Pulley",
    icon: "\u{1FA9D}",
    blurb: "Hauls heavy conclusions up from the deep end of the ledger.",
    baseCost: 12_000,
    rate: 47,
    draw: 2,
    stage: 5,
  },
  {
    id: "buddy",
    name: "Buddy Block",
    icon: "\u{1F441}\u{FE0F}",
    blurb: "Notices when something changes, and tells everyone about it.",
    baseCost: 130_000,
    rate: 260,
    draw: 3,
    stage: 5,
  },
  {
    id: "lens",
    name: "Lens",
    icon: "\u{1F50D}",
    blurb: "Focuses scattered daylight into one hot, clear thought.",
    baseCost: 1_400_000,
    rate: 1_400,
    draw: 3,
    stage: 6,
  },
  {
    id: "kiln",
    name: "Kiln",
    icon: "\u{1F9F1}",
    blurb: "Fires soft guesses into hard facts.",
    baseCost: 20_000_000,
    rate: 7_800,
    draw: 4,
    stage: 6,
  },
  {
    id: "soulUrn",
    name: "Soul Urn",
    icon: "\u{1F3FA}",
    blurb: "Keeps what the Engine learned from things that are gone now.",
    baseCost: 330_000_000,
    rate: 44_000,
    draw: 4,
    stage: 7,
  },
  {
    id: "enchanter",
    name: "Infernal Enchanter",
    icon: "\u{1F4D6}",
    blurb: "Writes in a language older than the Engine. It reads it anyway.",
    baseCost: 5_100_000_000,
    rate: 260_000,
    draw: 5,
    stage: 8,
  },
];

export const COMPONENTS_BY_ID: Record<ComponentId, ComponentDef> = Object.fromEntries(
  COMPONENTS.map((c) => [c.id, c])
) as Record<ComponentId, ComponentDef>;

export const COMPONENT_IDS: ComponentId[] = COMPONENTS.map((c) => c.id);
