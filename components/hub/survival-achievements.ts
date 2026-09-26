// Hardcore Spawn's own achievement category (see survival.ts). Same split as
// engine/achievements.ts: definitions and their rules side by side, spread
// into ACHIEVEMENTS by the catalog and into the provider's generic checker.
import type { AchievementDef, AchievementId } from "./achievements-catalog";
import type { HubState } from "./hub-storage";

export const SURVIVAL_ACHIEVEMENT_IDS = [
  "hs-first-death",
  "hs-way-back",
  "hs-compass",
  "hs-gloom",
  "hs-frequent-flyer",
  "hs-ten-deaths",
] as const;

export type SurvivalAchievementId = (typeof SURVIVAL_ACHIEVEMENT_IDS)[number];

function def(
  id: SurvivalAchievementId,
  title: string,
  description: string,
  icon: string,
  opts: { secret?: boolean; xp?: number } = {}
): AchievementDef {
  return { id, title, description, icon, secret: opts.secret, category: "hardcore-spawn", xp: opts.xp };
}

export const SURVIVAL_ACHIEVEMENT_DEFS: AchievementDef[] = [
  def("hs-first-death", "Welcome to Hardcore Spawn", "Died, and woke up somewhere you didn't recognize.", "\u{1F480}", { xp: 50 }),
  def("hs-way-back", "Found Your Way Back", "Made it back to camp after a respawn.", "\u{1F3D5}\u{FE0F}", { xp: 75 }),
  def("hs-compass", "Needle North", "Crafted a Compass. The next walk home is half as long.", "\u{1F9ED}", { xp: 100 }),
  def("hs-gloom", "Afraid of the Dark", "Let the fire go out on a New Moon night.", "\u{1F311}", { secret: true, xp: 150 }),
  def("hs-frequent-flyer", "Frequent Flyer", "Respawned three times inside ten minutes.", "\u{1FA82}", { secret: true, xp: 150 }),
  def("hs-ten-deaths", "Seasoned Survivor", "Died ten times. Still here.", "\u{1FAA6}", { xp: 200 }),
];

type Ctx = { state: HubState };

export const SURVIVAL_NUMERIC_RULES: { id: AchievementId; at: number; read: (c: Ctx) => number }[] = [
  { id: "hs-first-death", at: 1, read: (c) => c.state.survival.deaths },
  { id: "hs-way-back", at: 1, read: (c) => c.state.survival.treksCompleted },
  { id: "hs-compass", at: 1, read: (c) => (c.state.survival.compass ? 1 : 0) },
  { id: "hs-gloom", at: 1, read: (c) => c.state.survival.gloomDeaths },
  { id: "hs-frequent-flyer", at: 2, read: (c) => c.state.survival.respawnsInWindow },
  { id: "hs-ten-deaths", at: 10, read: (c) => c.state.survival.deaths },
];
