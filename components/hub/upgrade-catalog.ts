// The Outpost's meta-progression shop — spend Skill Points (earned
// passively, +1 per achievement unlocked, see AchievementsProvider's
// unlock()) on permanent capability unlocks, not just number-tuning perks
// (that's Legacy's job, see legacy.ts). Deliberately small today: this is
// the seed of a much bigger "the Outpost becomes a real game later on"
// direction, so new upgrades get added here over time rather than
// this being a one-shot finished list.
export type UpgradeId = "card-reorder" | "day-night-cycle" | "stars" | "hunting" | "mining" | "snow";

export type UpgradeDef = {
  id: UpgradeId;
  name: string;
  icon: string;
  description: string;
  cost: number;
  /** Engine stage required before this upgrade can be bought, separate from affording its cost. */
  stage: number;
};

export const UPGRADES: UpgradeDef[] = [
  {
    id: "card-reorder",
    name: "Workshop Organization",
    icon: "\u{1F9ED}",
    description: "Drag the Outpost's cards into whatever order suits you.",
    cost: 5,
    stage: 2,
  },
  {
    id: "day-night-cycle",
    name: "Day/Night Cycle",
    icon: "\u{1F317}",
    description: "Sun/moon arcing across the top of every page, cycling the site's light/dark theme to match.",
    cost: 8,
    stage: 2,
  },
  {
    id: "stars",
    name: "Starry Sky",
    icon: "✨",
    description: "Twinkling stars in the night sky, on top of the Day/Night Cycle upgrade above.",
    cost: 3,
    stage: 2,
  },
  {
    id: "hunting",
    name: "Hunting",
    icon: "\u{1F3F9}",
    description: "Unlocks the Hunting activity in the Gathering card. Campfire cooking needs Food, so it unlocks with this too.",
    cost: 5,
    stage: 3,
  },
  {
    id: "mining",
    name: "Mining",
    icon: "⛏️",
    description: "Unlocks the Mining activity in the Gathering card.",
    cost: 5,
    stage: 3,
  },
  {
    id: "snow",
    name: "Winter Weather",
    icon: "❄️",
    description: "Falling snow and accumulating piles in the homepage hero, above the Outpost.",
    cost: 4,
    stage: 2,
  },
];

export const UPGRADES_BY_ID: Record<UpgradeId, UpgradeDef> = Object.fromEntries(
  UPGRADES.map((u) => [u.id, u])
) as Record<UpgradeId, UpgradeDef>;
