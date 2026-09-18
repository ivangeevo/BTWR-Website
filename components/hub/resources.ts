// Resource/tool/crafting data — small static tables, same pattern as
// tier2.ts. Backs three new activity cards (Tree Mining, Hunting, Mining)
// and a Crafting card that upgrades a single shared tool tier, which in
// turn speeds up all three activities and unlocks better mining yields.

export type ResourceId = "wood" | "food" | "stone" | "coal" | "copper" | "iron" | "cookedFood";

export type ResourceState = Record<ResourceId, number>;

export const RESOURCE_IDS: ResourceId[] = ["wood", "food", "stone", "coal", "copper", "iron", "cookedFood"];

export const RESOURCE_META: Record<ResourceId, { name: string; icon: string }> = {
  wood: { name: "Wood", icon: "\u{1FAB5}" },
  food: { name: "Food", icon: "\u{1F356}" },
  stone: { name: "Stone", icon: "\u{1FAA8}" },
  coal: { name: "Coal", icon: "\u{26AB}" },
  copper: { name: "Copper", icon: "\u{1F7E0}" },
  iron: { name: "Iron", icon: "\u{2699}\u{FE0F}" },
  cookedFood: { name: "Cooked Food", icon: "\u{1F372}" },
};

// Cooking (see Campfire.tsx) only works while the fire is at the Medium
// stage — same rule the campfire's own flavor text has described since
// before this mechanic existed (see campfire-stage.ts's captions).
export const COOK_FOOD_COST = 1;
export const COOK_YIELD = 1;
export const EAT_XP_REWARD = 5;

// The six built-in tiers. Admin-added custom tiers (see admin-config.ts)
// get free-form string ids instead — anything that reads `tools.tier` off
// HubState treats it as a plain string for that reason, only narrowing to
// this union where a value is known to be one of the built-ins.
export type ToolTierId = "none" | "stone" | "copper" | "iron" | "diamond" | "netherite";

export const TOOL_ORDER: ToolTierId[] = ["none", "stone", "copper", "iron", "diamond", "netherite"];

export type ToolTier = {
  id: string;
  name: string;
  icon: string;
  /** Hold duration for Tree Mining, in ms. */
  treeMiningMs: number;
  /** Loading-bar duration for Hunting, in ms. */
  huntingMs: number;
  /** Hold duration for Mining, in ms — null means Mining is locked (no tool yet). */
  miningMs: number | null;
};

export const TOOL_TIERS: Record<ToolTierId, ToolTier> = {
  none: { id: "none", name: "Bare Hands", icon: "✊", treeMiningMs: 6000, huntingMs: 9000, miningMs: null },
  stone: { id: "stone", name: "Stone Tools", icon: "\u{1FAA8}", treeMiningMs: 5000, huntingMs: 8000, miningMs: 5000 },
  copper: { id: "copper", name: "Copper Tools", icon: "\u{1F7E0}", treeMiningMs: 4000, huntingMs: 6500, miningMs: 4000 },
  iron: { id: "iron", name: "Iron Tools", icon: "⛏️", treeMiningMs: 3000, huntingMs: 5000, miningMs: 3000 },
  diamond: { id: "diamond", name: "Diamond Tools", icon: "\u{1F48E}", treeMiningMs: 2200, huntingMs: 3500, miningMs: 2200 },
  netherite: { id: "netherite", name: "Netherite Tools", icon: "\u{1F525}", treeMiningMs: 1600, huntingMs: 2500, miningMs: 1600 },
};

// `order` defaults to the built-in 6-tier ladder but callers that have
// admin-added custom tiers pass the resolved order instead (see
// admin-config.ts's resolvedToolOrder), so crafting still progresses
// correctly past Netherite.
// Looks up a tool tier by id in a resolved (default + admin-added) list —
// components read tool data this way instead of indexing TOOL_TIERS
// directly, since that record only has the six built-ins.
export function findToolTier(tiers: readonly ToolTier[], id: string): ToolTier {
  return tiers.find((t) => t.id === id) ?? TOOL_TIERS.none;
}

export function nextToolTier(current: string, order: readonly string[] = TOOL_ORDER): string | null {
  const idx = order.indexOf(current);
  return idx >= 0 && idx < order.length - 1 ? order[idx + 1] : null;
}

// What a full Mining hold yields, by current tool tier — stone/coal are
// near-guaranteed and scale up gently; copper and (especially) iron get
// rarer the lower the tool tier, so the tool ladder is a real progression
// rather than a flat multiplier.
type YieldRoll = { chance: number; min: number; max: number };
type MiningYieldRule = { stone: [number, number]; coal: YieldRoll; copper: YieldRoll; iron: YieldRoll };

const MINING_YIELDS: Record<Exclude<ToolTierId, "none">, MiningYieldRule> = {
  stone: {
    stone: [2, 3],
    coal: { chance: 0.7, min: 1, max: 1 },
    copper: { chance: 0.15, min: 1, max: 1 },
    iron: { chance: 0.03, min: 1, max: 1 },
  },
  copper: {
    stone: [3, 4],
    coal: { chance: 0.85, min: 1, max: 2 },
    copper: { chance: 0.35, min: 1, max: 1 },
    iron: { chance: 0.1, min: 1, max: 1 },
  },
  iron: {
    stone: [3, 5],
    coal: { chance: 0.9, min: 1, max: 2 },
    copper: { chance: 0.2, min: 1, max: 1 },
    iron: { chance: 0.45, min: 1, max: 2 },
  },
  diamond: {
    stone: [4, 6],
    coal: { chance: 0.95, min: 2, max: 3 },
    copper: { chance: 0.55, min: 1, max: 2 },
    iron: { chance: 0.65, min: 1, max: 2 },
  },
  netherite: {
    stone: [5, 7],
    coal: { chance: 1, min: 2, max: 3 },
    copper: { chance: 0.65, min: 1, max: 2 },
    iron: { chance: 0.75, min: 2, max: 3 },
  },
};

// Admin-added tiers beyond Netherite don't get a hand-authored yield rule
// (that's a lot of surface for a v1 admin panel) — instead each step past
// Netherite scales Netherite's own rule up a bit further, so a custom tier
// is still a meaningful upgrade without needing its own tuned table.
function scaledRule(stepsPastNetherite: number): MiningYieldRule {
  const base = MINING_YIELDS.netherite;
  const scale = 1 + stepsPastNetherite * 0.25;
  const scaleRange = ([min, max]: [number, number]): [number, number] => [
    Math.round(min * scale),
    Math.round(max * scale),
  ];
  const scaleRoll = (r: YieldRoll): YieldRoll => ({
    chance: Math.min(1, r.chance + stepsPastNetherite * 0.05),
    min: Math.round(r.min * scale),
    max: Math.round(r.max * scale),
  });
  return {
    stone: scaleRange(base.stone),
    coal: scaleRoll(base.coal),
    copper: scaleRoll(base.copper),
    iron: scaleRoll(base.iron),
  };
}

export function rollMiningYield(tierId: string, order: readonly string[] = TOOL_ORDER): Partial<ResourceState> {
  if (tierId === "none") return {};
  let rule: MiningYieldRule;
  if (tierId in MINING_YIELDS) {
    rule = MINING_YIELDS[tierId as Exclude<ToolTierId, "none">];
  } else {
    const netherIndex = order.indexOf("netherite");
    const thisIndex = order.indexOf(tierId);
    const steps = netherIndex >= 0 && thisIndex > netherIndex ? thisIndex - netherIndex : 1;
    rule = scaledRule(steps);
  }
  const roll = (min: number, max: number) => min + Math.floor(Math.random() * (max - min + 1));
  const out: Partial<ResourceState> = { stone: roll(rule.stone[0], rule.stone[1]) };
  if (Math.random() < rule.coal.chance) out.coal = roll(rule.coal.min, rule.coal.max);
  if (Math.random() < rule.copper.chance) out.copper = roll(rule.copper.min, rule.copper.max);
  if (Math.random() < rule.iron.chance) out.iron = roll(rule.iron.min, rule.iron.max);
  return out;
}

// Crafting a tool consumes resources and permanently raises the shared
// tool tier by one step — no inventory of tools, just "your best tool so
// far", so costs only need to cover the jump from the tier below.
export const TOOL_CRAFT_COSTS: Record<Exclude<ToolTierId, "none">, Partial<ResourceState>> = {
  stone: { wood: 5 },
  copper: { stone: 8, copper: 4 },
  iron: { stone: 10, copper: 6, iron: 8 },
  diamond: { iron: 15, copper: 10, coal: 5 },
  netherite: { iron: 20, coal: 15, copper: 10 },
};

export type CraftingGridId = "player" | "table" | "soulforge";

export type CraftingGrid = {
  id: CraftingGridId;
  name: string;
  size: string;
  /** Tier-2 level required before this grid is usable. */
  unlockLevel: number;
  /** Which tool tiers this grid can craft. */
  crafts: ToolTierId[];
};

// The Soulforge's unlock level deliberately matches the Soulforged Steel
// skin's (see tier2.ts's SKINS) — both are the pack's top-tier, late-game
// callback to the same lore.
export const CRAFTING_GRIDS: CraftingGrid[] = [
  { id: "player", name: "Player Crafting", size: "2×2", unlockLevel: 1, crafts: ["stone", "copper"] },
  { id: "table", name: "Crafting Table", size: "3×3", unlockLevel: 8, crafts: ["iron"] },
  { id: "soulforge", name: "Soulforge", size: "4×4", unlockLevel: 20, crafts: ["diamond", "netherite"] },
];

// Shared across Tree Mining, Hunting, and Mining — finishing any one of
// them blocks starting any of the three again until this elapses.
export const ACTIVITY_COOLDOWN_MS = 20_000;
