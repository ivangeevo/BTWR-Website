// The Outpost's meta-progression shop — spend Skill Points (earned
// passively, +1 per achievement unlocked, see AchievementsProvider's
// unlock()) plus a one-off build cost in resources on permanent
// capabilities: each one a new thing to do that hooks into at least two
// other systems, never a plain number bump (that's Legacy's job, see
// legacy.ts, and the Engine's Research). The Skill Points buy the know-how,
// the resources build the thing. Deliberately small today: new upgrades get
// added here over time rather than this being a one-shot finished list.
import type { ResourceState } from "./resources";

export type UpgradeId = "wolf" | "fishing" | "torches" | "farm";

export type UpgradeDef = {
  id: UpgradeId;
  name: string;
  icon: string;
  description: string;
  cost: number;
  /** Resources spent building it, on top of the Skill Points. */
  build: Partial<ResourceState>;
  /** Engine stage required before this upgrade can be bought, separate from affording its cost. */
  stage: number;
  /** Only does anything with survival on — hidden from the shop in Casual. */
  survivalOnly?: boolean;
};

export const UPGRADES: UpgradeDef[] = [
  {
    id: "wolf",
    name: "Tame a Wolf",
    icon: "\u{1F43A}",
    description:
      "A companion by the Campfire. Keep it fed with Cooked Food and it hunts alongside you: more Food per trip, and fewer hits.",
    cost: 5,
    build: { cookedFood: 3 },
    stage: 3,
  },
  {
    id: "fishing",
    name: "Fishing",
    icon: "\u{1F3A3}",
    description:
      "A slow, safe way to get Food in the Gathering card: no hunger, never hurts. The fish bite best at dawn and dusk.",
    cost: 4,
    build: { wood: 6 },
    stage: 3,
  },
  {
    id: "torches",
    name: "Torches",
    icon: "\u{1F526}",
    description:
      "Craft Torches from Wood and Coal. One lights itself when you need it at night: it keeps the gloom off with the fire out, and night hunts and digs are no riskier than by day.",
    cost: 6,
    build: { coal: 3, wood: 3 },
    stage: 4,
    survivalOnly: true,
  },
  {
    id: "farm",
    name: "Farm Plot",
    icon: "\u{1F33E}",
    description:
      "Plant a crop in the Gathering card and harvest it for Food. It grows while you're away, but only in daylight.",
    cost: 8,
    build: { wood: 10, stone: 6 },
    stage: 5,
  },
];

export const UPGRADES_BY_ID: Record<UpgradeId, UpgradeDef> = Object.fromEntries(
  UPGRADES.map((u) => [u.id, u])
) as Record<UpgradeId, UpgradeDef>;

export function isUpgradeId(id: string): id is UpgradeId {
  return id in UPGRADES_BY_ID;
}

// What the shop used to sell before it became capabilities-only: the
// Day/Night Cycle now arrives at The Stump, Starry Sky and card reordering
// are always on, Hunting opens at The Stump and Mining with Stone Tools.
// A save that bought any of them gets its Skill Points back (hub-storage.ts's
// normalizeState) at these default prices.
export const RETIRED_UPGRADE_REFUNDS: Record<string, number> = {
  "card-reorder": 5,
  "day-night-cycle": 8,
  stars: 3,
  hunting: 5,
  mining: 5,
};
