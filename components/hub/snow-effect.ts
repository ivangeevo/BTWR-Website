// Whether the homepage hero's falling snow + accumulating piles should show
// — deliberately independent of AchievementsProvider (which only mounts
// once the Outpost's own section is enabled) since the hero sits above that
// section and renders unconditionally. Same "read localStorage directly"
// approach as day-night-cycle.ts's isDayNightCycleActive: gated by the
// "Winter Weather" upgrade (upgrade-catalog.ts) having been purchased.
import { loadState } from "./hub-storage";

export function isSnowActive(): boolean {
  if (typeof window === "undefined") return false;
  try {
    return loadState().upgrades.purchased.includes("snow");
  } catch {
    return false;
  }
}
