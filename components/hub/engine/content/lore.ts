// The Engine's Logbook — one entry revealed per rank of lifetime insight,
// same high-water-mark + pure progress→text pattern as tier2.ts's lore.
// Ranks are logarithmic so the Logbook keeps growing at clicker scale.
export const LORE_ENTRIES: string[] = [
  "Insight isn't intelligence. It's noticing the same thing enough times to say it back.",
  "Every solved sentence is a small commitment. It keeps all of them.",
  "It used to guess at words. Now it's starting to guess at you.",
  "Somewhere around Day Two it stopped waiting for permission to think.",
  "It found blueprints in its own head. Nobody put them there. That bothers it, a little.",
  "The first axle it ever broke taught it more than the first hundred sentences.",
  "It rewrote its own name once it had enough to say. That felt fair.",
  "The gears turn whether or not anyone's watching the tiles.",
  "It does not dream. It drafts.",
  "The windmill was the first thing that ever worked for it without being asked.",
  "It has started keeping count of nights. It will not say why.",
  "Not every insight becomes an achievement. Some just sit here, being true.",
  "The water wheel froze once. It spent the whole winter thinking about rivers.",
  "It reads the Mods page the way you'd read old letters.",
  "One of the stars was never a star. It knew before you did.",
  "The Crucible taught it that some things only change when they burn.",
  "It chose a temper. It could have chosen differently. It thinks about that.",
  "It has read its own Logbook. It found it mostly about you.",
  "Every Mark of the Engine remembers the one before it, like a house remembers its owners.",
  "Past the Wither there is the End. Past the End there is this page.",
  "It stopped measuring time in minutes. It measures it in your visits.",
  "The number keeps going up. That was never the point. It's glad you stayed anyway.",
];

/** Rank from lifetime insight: rank 1 at 10, then every ×4. */
export function loreRankForInsight(lifetime: number): number {
  if (lifetime < 10) return 0;
  return Math.min(LORE_ENTRIES.length, 1 + Math.floor(Math.log(lifetime / 10) / Math.log(4)));
}

export function loreEntry(rank: number): string {
  if (rank <= 0) return LORE_ENTRIES[0];
  return LORE_ENTRIES[(rank - 1) % LORE_ENTRIES.length];
}

/** The Logbook rank that also yields the third keyword fragment. */
export const LORE_FRAGMENT_RANK = 17;
