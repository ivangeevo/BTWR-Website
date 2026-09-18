// "Which iron tool should I make first?" — one of the most debated
// questions in BTW, because there's no correct answer. Blurbs are trimmed
// from the Beginner's Guide's own tool-by-tool rationale.
export type IronToolId =
  | "pickaxe"
  | "axe"
  | "shears"
  | "sword"
  | "shovel"
  | "hoe"
  | "bucket"
  | "flint-and-steel";

export type IronTool = {
  id: IronToolId;
  name: string;
  icon: string;
  blurb: string;
};

export const IRON_TOOLS: IronTool[] = [
  {
    id: "pickaxe",
    name: "Pickaxe",
    icon: "\u{26CF}\u{FE0F}",
    blurb: "Much faster mining, and the only way to break into the second stone layer for more iron.",
  },
  {
    id: "axe",
    name: "Axe",
    icon: "\u{1FA93}",
    blurb: "Unlocks most plank recipes and lets mobs-can't-spawn-on-wood work in your favor for a safer base.",
  },
  {
    id: "shears",
    name: "Shears",
    icon: "\u{2702}\u{FE0F}",
    blurb: "Defuse a creeper's explosive bits in a pinch, and doubles your string output from cobwebs.",
  },
  {
    id: "sword",
    name: "Sword",
    icon: "\u{1F5E1}\u{FE0F}",
    blurb: "Indispensable for deeper mining — right-click to block and halve incoming damage.",
  },
  {
    id: "shovel",
    name: "Shovel",
    icon: "\u{1F9F1}",
    blurb: "Full dirt blocks instead of piles, faster clay, and no more loose dirt collapsing your dig.",
  },
  {
    id: "hoe",
    name: "Hoe",
    icon: "\u{1F33E}",
    blurb: "Faster hemp seed gathering from grass, and instant wet farmland next to water.",
  },
  {
    id: "bucket",
    name: "Bucket",
    icon: "\u{1F95B}",
    blurb: "Milk from wild cows to fight hunger, water to douse fires — the cheapest real quality-of-life pick.",
  },
  {
    id: "flint-and-steel",
    name: "Flint and Steel",
    icon: "\u{1F525}",
    blurb: "The cheapest iron tool of all — an instant fire without burning hunger on a fire plough.",
  },
];

export const IRON_TOOLS_BY_ID: Record<IronToolId, IronTool> = Object.fromEntries(
  IRON_TOOLS.map((t) => [t.id, t])
) as Record<IronToolId, IronTool>;

export function isIronToolId(value: string): value is IronToolId {
  return IRON_TOOLS.some((t) => t.id === value);
}
