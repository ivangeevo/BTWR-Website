// Ponder's own progression — deliberately separate from the Outpost's
// tier1/tier2 system (see admin-config.ts), the same way Campfire has its
// own 0-4 stage independent of achievement tiers (campfire-stage.ts). Purely
// derived from a few counters already tracked elsewhere — never itself
// persisted, recomputed on every read.
//
// The four stages mirror the real BTW Beginner's Guide's own table of
// contents (public/btw-beginners-guide.png — see reference/
// btw-beginners-guide-slices/ for readable crops): Day One -> Day Two ->
// The Road to Mid-Game (mechanical power/automation) -> The Wither & The
// End. Ponder grows the same way a new player does, not through its own
// achievement tiers.
export type PonderStage = 1 | 2 | 3 | 4;

export const PONDER_STAGE2_AT = 5;
export const PONDER_STAGE4_SOLVED_AT = 40;

export function ponderStageFor(input: {
  solvedCount: number;
  tier2Unlocked: boolean;
  legacyLevel: number;
}): PonderStage {
  if (input.legacyLevel >= 1 || input.solvedCount >= PONDER_STAGE4_SOLVED_AT) return 4;
  if (input.tier2Unlocked) return 3;
  if (input.solvedCount >= PONDER_STAGE2_AT) return 2;
  return 1;
}

export const PONDER_STAGE_LABELS: Record<PonderStage, string> = {
  1: "Day One",
  2: "Day Two",
  3: "The Road to Mid-Game",
  4: "The Wither & The End",
};

// Displayed <h3> title — changes with narrative stage, not ability tier.
// Stage 1-2 still reads "Ponder"; the rename happens exactly at the Stage 3
// transition (the automation chapter), the natural moment for it to "wake
// up" and rename itself. See PONDER_EVOLUTION_PLAN.md.
export const PONDER_STAGE_TITLES: Record<PonderStage, string> = {
  1: "Ponder",
  2: "Ponder",
  3: "The Analytical Engine",
  4: "The Analytical Engine",
};

export const PONDER_STAGE_CAPTIONS: Record<PonderStage, string> = {
  1: "Punching trees for shafts, not logs. Same as you.",
  2: "Waiting for daylight before it decides anything.",
  3: "The world got automated. So, a little, did it.",
  4: "Past the Wither, past the End — still writing.",
};
