// "Priorities for the next few days" — the Beginner's Guide's own literal
// checklist for what to do once Day One's survival basics are handled,
// carried verbatim through to Iron Age's opening steps (sugarcane and clay
// through your first Chisel and Crafting Table). A widget, not a tracker —
// nothing else in the Outpost reads a step's checked state except the two
// achievements tied to starting and finishing the list (see
// AchievementsProvider.tsx's NUMERIC_RULES/CUSTOM_RULES).
export type PriorityStep = { id: string; text: string };

export const PRIORITY_STEPS: PriorityStep[] = [
  { id: "sugarcane-baskets", text: "Farm sugarcane and craft Baskets for one-stack storage." },
  { id: "dig-clay", text: "Dig up Clay from shallow water — a Stone Shovel doubles the output." },
  { id: "sun-bake-bricks", text: "Place clay on dirt or logs to sun-bake it into bricks." },
  { id: "brick-slabs", text: "Use 16 bricks to make four Brick Slabs." },
  { id: "brick-oven", text: "Use four Brick Slabs to build a Brick Oven." },
  { id: "collect-coal", text: "Find and collect exposed Coal using sharp stones." },
  { id: "coal-from-dust", text: "Craft Coal from Coal Dust." },
  { id: "primitive-torches", text: "Craft primitive torches from Coal and a Shaft — good for about a day each." },
  { id: "mine-iron", text: "Find and mine at least eight Iron Ore blocks." },
  { id: "iron-chunks", text: "Craft the Iron Ore into Chunks of Iron." },
  { id: "load-oven", text: "Place the iron chunks into your Brick Oven." },
  { id: "fill-light-oven", text: "Completely fill the oven (extra flammables help) and light it." },
  { id: "store-nuggets", text: "Store the smelted Iron Nuggets in a basket for later." },
  { id: "iron-chisel", text: "Craft an Iron Chisel from four Iron Nuggets." },
  { id: "crafting-table", text: "Use the chisel twice on a Stump to make a Crafting Table." },
];
