// Relics: what's left of Guess the Mod, folded into Gathering. A finished
// Wood Chopping / Hunting / Mining trip now and then turns up an
// unidentified relic (a mod's icon); naming it right pays a cache in the
// loop's own resources and catalogues the mod in the Field Guide
// (field-guide.ts). One relic waits at a time, saved with the rest of the
// Outpost (HubState.relic), so a reload never loses it and it never blocks
// gathering. Pure helpers only: the provider (AchievementsProvider.tsx)
// rolls, grants and saves, RelicPrompt.tsx asks.
import type { Mod } from "@/lib/mods";
import type { ResourceState } from "./resources";

export type RelicSource = "wood" | "hunting" | "mining";

export type RelicState = {
  /** The mod the relic really is (its projectId). */
  modId: string;
  source: RelicSource;
  /** The four names on offer, in the order shown — fixed when it drops, so a reload asks the same question. */
  choices: string[];
  /** Choices the Detector Block has struck out. */
  struck: string[];
};

/** How naming a relic went, for the prompt to show. */
export type RelicResult = {
  correct: boolean;
  /** What it really was. */
  modId: string;
  /** What it paid: the cache when right, a little Stone when wrong. */
  gain: Partial<ResourceState>;
};

export const RELIC_CHOICES = 4;

/** How much more likely a relic is to be one the Field Guide doesn't have yet. */
export const UNCATALOGUED_WEIGHT = 0.75;

/** Mods a relic can be: the ones with an icon to show that are in the pack. */
export function relicPool(mods: readonly Mod[]): Mod[] {
  return mods.filter((m) => m.iconUrl && !m.disabled);
}

export function rollRelic(chance: number, rand: () => number = Math.random): boolean {
  return chance > 0 && rand() < chance;
}

function shuffle<T>(items: readonly T[], rand: () => number): T[] {
  const arr = [...items];
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(rand() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

/** Usually a mod the Field Guide is missing, so the Guide fills steadily; now and then any mod. */
export function pickRelicMod(pool: readonly Mod[], catalogued: readonly string[], rand: () => number = Math.random): Mod | null {
  if (pool.length === 0) return null;
  const known = new Set(catalogued);
  const missing = pool.filter((m) => !known.has(m.projectId));
  const from = missing.length > 0 && rand() < UNCATALOGUED_WEIGHT ? missing : pool;
  return from[Math.floor(rand() * from.length)];
}

/** A new relic for `source`, or null when the pack has too few mods to ask about. */
export function newRelic(
  pool: readonly Mod[],
  catalogued: readonly string[],
  source: RelicSource,
  rand: () => number = Math.random
): RelicState | null {
  if (pool.length < RELIC_CHOICES) return null;
  const mod = pickRelicMod(pool, catalogued, rand);
  if (!mod) return null;
  const wrongs = shuffle(
    pool.filter((m) => m.projectId !== mod.projectId),
    rand
  ).slice(0, RELIC_CHOICES - 1);
  const choices = shuffle([mod, ...wrongs], rand).map((m) => m.projectId);
  return { modId: mod.projectId, source, choices, struck: [] };
}

/** Choices the Detector can still strike: wrong, not yet struck, and always leaving two to pick from. */
export function strikeable(relic: RelicState): string[] {
  const wrong = relic.choices.filter((id) => id !== relic.modId && !relic.struck.includes(id));
  return relic.choices.length - relic.struck.length > 2 ? wrong : [];
}

/** A saved relic, checked on the way in; null if it can't be asked any more. */
export function normalizeRelic(raw: unknown): RelicState | null {
  if (typeof raw !== "object" || raw === null) return null;
  const r = raw as Partial<RelicState>;
  if (typeof r.modId !== "string") return null;
  if (r.source !== "wood" && r.source !== "hunting" && r.source !== "mining") return null;
  if (!Array.isArray(r.choices) || !r.choices.every((c) => typeof c === "string") || !r.choices.includes(r.modId)) {
    return null;
  }
  const struck = Array.isArray(r.struck)
    ? r.struck.filter((c): c is string => typeof c === "string" && c !== r.modId && r.choices!.includes(c))
    : [];
  return { modId: r.modId, source: r.source, choices: [...r.choices], struck };
}

/**
 * The cache a relic pays when named right: about `trips` trips' worth of
 * what that trip gathers. A mining relic's cache is rolled by the caller
 * (a few extra mining rolls at the current tool), so it isn't here.
 */
export function relicCache(
  source: Exclude<RelicSource, "mining">,
  perTrip: { wood: number; food: number },
  trips: number
): Partial<ResourceState> {
  return source === "wood"
    ? { wood: Math.max(1, Math.round(perTrip.wood * trips)) }
    : { cookedFood: Math.max(1, Math.round(perTrip.food * trips * 0.5)) };
}
