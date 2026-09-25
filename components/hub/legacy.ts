// The Outpost's prestige layer — "Legacy". Deliberately laid-back: the only
// thing that resets is the resource/tool micromanagement loop (the part of
// the Outpost that's actually fun to replay, mirroring BTW's own moment-to-
// moment gameplay), never achievements, tiers, or XP/level. Each reset earns
// permanent points to spend on small QoL perks that make the next loop a bit
// faster/cheaper — the loop stays the same shape, just friendlier each time.

export type PerkId = "quick-hands" | "green-thumb" | "head-start" | "master-crafter" | "borrowed-insight";

export type PerkDef = {
  id: PerkId;
  name: string;
  icon: string;
  description: string;
  maxLevel: number;
  /** Cost in Legacy Points to buy the given level (1-indexed — the level being purchased). */
  costForLevel: (level: number) => number;
};

export const PERKS: PerkDef[] = [
  {
    id: "quick-hands",
    name: "Quick Hands",
    icon: "\u{1F91D}",
    description: "Shortens the shared activity rest timer by 3s per level.",
    maxLevel: 5,
    costForLevel: (level) => level,
  },
  {
    id: "green-thumb",
    name: "Green Thumb",
    icon: "\u{1F33F}",
    description: "+1 Wood and Food per collect, per level.",
    maxLevel: 5,
    costForLevel: (level) => level,
  },
  {
    id: "head-start",
    name: "Head Start",
    icon: "\u{1F392}",
    description: "Each new loop starts one tool tier further along, per level.",
    maxLevel: 5,
    costForLevel: (level) => level + 1,
  },
  {
    id: "master-crafter",
    name: "Master Crafter",
    icon: "\u{1F6E0}\u{FE0F}",
    description: "Crafting costs less (down to a floor of 1 per resource), per level.",
    maxLevel: 3,
    costForLevel: (level) => (level + 1) * 2,
  },
  {
    id: "borrowed-insight",
    name: "Borrowed Insight",
    icon: "\u{1F9E0}",
    description: "+1 Legacy Point per prestige for every power of ten of the Engine's lifetime insight, per level.",
    maxLevel: 5,
    costForLevel: (level) => level * 3,
  },
];

export const PERKS_BY_ID: Record<PerkId, PerkDef> = Object.fromEntries(
  PERKS.map((p) => [p.id, p])
) as Record<PerkId, PerkDef>;

export type LegacyPerks = Partial<Record<PerkId, number>>;

export type LegacyState = {
  /** Number of times the loop has been prestiged. */
  level: number;
  /** Spendable Legacy Points balance. */
  points: number;
  perks: LegacyPerks;
};

export function defaultLegacyState(): LegacyState {
  return { level: 0, points: 0, perks: {} };
}

export function perkLevel(perks: LegacyPerks, id: PerkId): number {
  return perks[id] ?? 0;
}

/** Cost of the next level of a perk, or null if already maxed. */
export function nextPerkCost(perks: LegacyPerks, id: PerkId): number | null {
  const def = PERKS_BY_ID[id];
  const level = perkLevel(perks, id);
  if (level >= def.maxLevel) return null;
  return def.costForLevel(level + 1);
}

// Reaching further before prestiging earns more points, so there's a real
// (but never mandatory) reason to keep going instead of resetting the
// instant it's available. pointsPerTier is admin-configurable — see
// mechanics.ts's PrestigeMechanic — and defaults to 1 (today's behavior).
export function pointsForPrestige(toolTierIndex: number, pointsPerTier: number = 1): number {
  return Math.max(1, toolTierIndex * pointsPerTier);
}

export function effectiveCooldownMs(baseMs: number, perks: LegacyPerks): number {
  return Math.max(5000, baseMs - perkLevel(perks, "quick-hands") * 3000);
}

export function collectBonus(perks: LegacyPerks): number {
  return perkLevel(perks, "green-thumb");
}

export function startingTierIndex(perks: LegacyPerks): number {
  return perkLevel(perks, "head-start");
}

export function craftCostDiscount(perks: LegacyPerks): number {
  return perkLevel(perks, "master-crafter");
}

// The Engine's endgame tie-in to Prestige: each level of Borrowed Insight
// adds one Legacy Point per order of magnitude of the Engine's lifetime
// insight — logarithmic, because the Engine's numbers run at clicker scale
// (a billion lifetime insight at level 5 is 45 extra points, not millions).
export function insightPrestigeBonus(perks: LegacyPerks, lifetimeInsight: number): number {
  return perkLevel(perks, "borrowed-insight") * Math.floor(Math.log10(Math.max(10, lifetimeInsight)));
}
