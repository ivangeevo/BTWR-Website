// What the Upgrades shop's capabilities (upgrade-catalog.ts) keep at camp:
// the wolf's feeding, the torch supply, and the farm plot. Everything is
// measured on the day/night cycle's own clock (day-night-cycle.ts) — in-game
// days, nights, and daylight — so it lines up with the sky and the gloom.
//
// Plain data + pure functions, same shape as survival.ts — AchievementsProvider
// owns the clock reads and persistence. Tunables live on UpgradesMechanic
// (mechanics.ts), admin-editable. Reset with the resource loop (Legacy), like
// resources and tools; the know-how in upgrades.purchased is kept.

export type CampState = {
  /** The in-game day (cycleDayIndex) the wolf's last meal runs out on; null until first fed. */
  wolfFedUntilDay: number | null;
  torches: number;
  /** The night (cycleSegmentIndex) a torch is burning through, if any. */
  torchNight: number | null;
  farm: { plantedAt: string | null };
};

export function defaultCampState(): CampState {
  return { wolfFedUntilDay: null, torches: 0, torchNight: null, farm: { plantedAt: null } };
}

export function normalizeCamp(raw: Partial<CampState> | undefined): CampState {
  const base = defaultCampState();
  const num = (v: unknown) => (typeof v === "number" && Number.isFinite(v) ? v : null);
  return {
    wolfFedUntilDay: num(raw?.wolfFedUntilDay),
    torches: Math.max(0, Math.floor(num(raw?.torches) ?? 0)),
    torchNight: num(raw?.torchNight),
    farm: { plantedAt: typeof raw?.farm?.plantedAt === "string" ? raw.farm.plantedAt : base.farm.plantedAt },
  };
}

// --- The wolf ---

export function isWolfFed(camp: CampState, day: number): boolean {
  return camp.wolfFedUntilDay !== null && day < camp.wolfFedUntilDay;
}

/** Feeds the wolf through `fedDays` in-game days from today. Null when it's already fed that far. */
export function feedWolf(camp: CampState, day: number, fedDays: number): CampState | null {
  const until = day + Math.max(1, fedDays);
  if (camp.wolfFedUntilDay !== null && camp.wolfFedUntilDay >= until) return null;
  return { ...camp, wolfFedUntilDay: until };
}

// --- Torches ---

export function isTorchLit(camp: CampState, segment: number): boolean {
  return camp.torchNight === segment;
}

/**
 * Lights a torch for this night — at most one per night. Returns the same
 * state when one's already burning, null when there's none to light.
 */
export function lightTorch(camp: CampState, segment: number): CampState | null {
  if (isTorchLit(camp, segment)) return camp;
  if (camp.torches < 1) return null;
  return { ...camp, torches: camp.torches - 1, torchNight: segment };
}

// --- The farm plot ---

/** 0..1 growth of the planted crop, from the daylight it's had; null when nothing's planted. */
export function farmGrowth(daylightMs: number | null, growDaylightMin: number): number | null {
  if (daylightMs === null) return null;
  const needMs = Math.max(1, growDaylightMin) * 60_000;
  return Math.min(1, daylightMs / needMs);
}

// --- Fishing ---

/** Food from one Fishing run: a roll in [min, max], plus a bonus at dawn or dusk. */
export function rollFish(
  min: number,
  max: number,
  twilight: boolean,
  twilightBonus: number,
  rand: () => number = Math.random
): number {
  const lo = Math.max(0, Math.min(min, max));
  const hi = Math.max(0, Math.max(min, max));
  return lo + Math.floor(rand() * (hi - lo + 1)) + (twilight ? Math.max(0, twilightBonus) : 0);
}
