// "Tend the Fire" — a small interactive widget modeled on BTW's own
// campfire mechanic: four visible lit stages plus extinguished, where only
// Medium actually cooks food (High just burns it, Low/Embers do nothing).
// See the Beginner's Guide's "Campfire Usage" section.
import type { CampfireState } from "./hub-storage";

export const CAMPFIRE_STAGES = ["Extinguished", "Embers", "Low", "Medium", "High"] as const;
export type CampfireStage = 0 | 1 | 2 | 3 | 4;

export const CAMPFIRE_CAPTIONS: Record<CampfireStage, string> = {
  0: "Cold pit, dead ash. Somebody's going to have first-night trouble.",
  1: "Smoldering — but letting it sit here resets any cooking progress.",
  2: "Enough to see by. Won't cook anything, won't burn you either.",
  3: "Food's actually cooking now. Don't let this slip.",
  4: "Bright and warm — and completely useless for cooking. You're just burning dinner.",
};

export const CAMPFIRE_ICONS: Record<CampfireStage, string> = {
  0: "\u{26AB}",
  1: "\u{1F534}",
  2: "\u{1F7E0}",
  3: "\u{1F525}",
  4: "\u{2600}\u{FE0F}",
};

// One stage of decay per this many real minutes since the last tend —
// gentle enough that a same-day return still finds embers, not ash. Admin-
// configurable via CampfireMechanic (see mechanics.ts); this is just the
// fallback for callers that don't have a resolved value on hand.
const DECAY_MINUTES = 15;

/** The campfire's real, decayed stage right now — never stored directly. */
export function currentCampfireStage(
  campfire: CampfireState,
  decayMinutes: number = DECAY_MINUTES,
  now: Date = new Date()
): CampfireStage {
  if (!campfire.lastTendedAt) return campfire.stage as CampfireStage;
  const elapsedMin = (now.getTime() - new Date(campfire.lastTendedAt).getTime()) / 60_000;
  const decaySteps = Math.floor(elapsedMin / decayMinutes);
  return Math.max(0, campfire.stage - decaySteps) as CampfireStage;
}
