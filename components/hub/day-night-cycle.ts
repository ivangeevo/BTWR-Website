// Site-wide day/night cycle — deliberately independent of AchievementsProvider
// (which only mounts on the Outpost page) since the theme toggle in the site
// header, and the sky band in the root layout, both need to read this on
// every page. Everything here is a pure function of a stored start
// timestamp plus the current clock, so nothing needs a ticking React
// context — each consumer just re-derives on its own interval.
import { isPhoneDevice } from "./device";
import { loadState } from "./hub-storage";

const CYCLE_KEY = "btwr:hub:cycle:v1";

/** How long the sun/moon takes to arc from rise to set. */
export const PHASE_MS = 300_000;
// A brief pause after the body sets, before the next one rises — sky colors
// keep drifting (deepening toward midnight, or lightening toward midday)
// through this gap instead of handing off instantly, same as real dusk/dawn
// twilight lingering after the sun's actually below the horizon.
const TWILIGHT_MS = 6_000;
const SEGMENT_MS = PHASE_MS + TWILIGHT_MS;
const FULL_CYCLE_MS = SEGMENT_MS * 2;

export const MOON_PHASES = [
  { name: "New Moon", icon: "\u{1F311}" },
  { name: "Waxing Crescent", icon: "\u{1F312}" },
  { name: "First Quarter", icon: "\u{1F313}" },
  { name: "Waxing Gibbous", icon: "\u{1F314}" },
  { name: "Full Moon", icon: "\u{1F315}" },
  { name: "Waning Gibbous", icon: "\u{1F316}" },
  { name: "Last Quarter", icon: "\u{1F317}" },
  { name: "Waning Crescent", icon: "\u{1F318}" },
];

// Established once (first time anything asks) and persisted, so the cycle's
// phase/progress stays continuous across reloads instead of restarting —
// the same "derived from a stored anchor, not re-randomized" approach as
// the rest of the hub's date-seeded picks.
export function loadCycleStartedAt(): number {
  if (typeof window === "undefined") return Date.now();
  try {
    const raw = window.localStorage.getItem(CYCLE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (typeof parsed?.startedAt === "number") return parsed.startedAt;
    }
  } catch {
    // fall through to establishing a fresh anchor
  }
  const now = Date.now();
  try {
    window.localStorage.setItem(CYCLE_KEY, JSON.stringify({ startedAt: now }));
  } catch {
    // localStorage unavailable — the cycle still works, it just restarts every load
  }
  return now;
}

export type CyclePhase = {
  isDay: boolean;
  /** 0..1 progress through the current segment (visible arc + trailing twilight) — drives sky color. */
  progress: number;
  /** False during the trailing twilight gap, after the body has set and before the next one rises. */
  bodyVisible: boolean;
  /** 0..1 position along the rise-to-set arc — only meaningful while bodyVisible; holds at 1 otherwise. */
  bodyProgress: number;
  moonPhaseIndex: number;
};

export function computeCyclePhase(startedAt: number, now: number = Date.now()): CyclePhase {
  const elapsed = Math.max(0, now - startedAt);
  const segmentIndex = Math.floor(elapsed / SEGMENT_MS);
  const elapsedInSegment = elapsed % SEGMENT_MS;
  const bodyVisible = elapsedInSegment < PHASE_MS;
  return {
    isDay: segmentIndex % 2 === 0,
    progress: elapsedInSegment / SEGMENT_MS,
    bodyVisible,
    bodyProgress: bodyVisible ? elapsedInSegment / PHASE_MS : 1,
    moonPhaseIndex: Math.floor(elapsed / FULL_CYCLE_MS) % MOON_PHASES.length,
  };
}

// The cycle only runs "when the Outpost is active" (OutpostControlPanel's
// enable switch) AND the visitor hasn't turned it off in the Outpost
// settings dropdown AND the "Day/Night Cycle" upgrade has been purchased
// (upgrade-catalog.ts — this is what lets a visitor unlock the day/night
// cycle by spending Skill Points instead of it always being on) — all plain
// localStorage reads, so this works from anywhere (ThemeToggle lives in the
// site header, outside the Outpost's own React tree entirely).
export function isDayNightCycleActive(): boolean {
  if (typeof window === "undefined") return false;
  try {
    const state = loadState();
    if (!state.enabled || isPhoneDevice()) return false;
    // Survival's gloom runs on this clock, so while it's on the sky is too —
    // otherwise the page could look like midday while a New Moon night
    // darkens it (GloomLayer.tsx). The visitor's toggle can't hide it.
    if (state.experience.mode === "survival" && survivalForcesCycle(state.engine.stage)) return true;
    if (!state.settings.dayNightCycleEnabled) return false;
    return state.upgrades.purchased.includes("day-night-cycle");
  } catch {
    return false;
  }
}

// Read straight off the admin save instead of importing admin-config.ts:
// this module ships on every page (DayNightSky, ThemeToggle), and that one
// pulls in the whole achievement catalog. Defaults mirror admin-config.ts's
// defaultFeatures() — keep in sync (and with app/layout.tsx's boot script).
const ADMIN_KEY = "btwr:hub:admin:v1";

export function survivalForcesCycle(engineStage: number): boolean {
  let enabled = true;
  let stage = 3;
  try {
    const features = JSON.parse(window.localStorage.getItem(ADMIN_KEY) ?? "null")?.features;
    if (typeof features?.survivalEnabled === "boolean") enabled = features.survivalEnabled;
    if (typeof features?.survivalStage === "number") stage = features.survivalStage;
  } catch {
    // defaults
  }
  return enabled && engineStage >= stage;
}

// --- Gloom (see survival.ts) ---
// The cycle's own moon (moonPhaseIndex) advances once per full day+night, so
// a day and the night after it share an index. New Moon nights are gloom
// nights: with the Campfire out, the gloom hurts. Survival runs off the
// cycle's clock whether or not its visuals are switched on.

const NEW_MOON_INDEX = 0;

export function isGloomNight(phase: CyclePhase): boolean {
  return !phase.isDay && phase.moonPhaseIndex === NEW_MOON_INDEX;
}

// Where along the sun's arc the gloom starts creeping in (the sun's low on
// the horizon), and how dark it's got by the time night actually falls.
const GLOOM_DUSK_START = 0.9;
const GLOOM_AT_NIGHTFALL = 0.4;

/**
 * 0..1 darkness over the Outpost for a gloom night. Daytime stays clear: it
 * only creeps in once the sun is setting on the day before a New Moon night,
 * deepens to full over the first stretch of the night, holds, and lifts
 * over the last stretch before dawn. Only visual — gloom only hurts at night.
 */
export function gloomDarkness(phase: CyclePhase): number {
  if (phase.moonPhaseIndex !== NEW_MOON_INDEX) return 0;
  if (phase.isDay) {
    // bodyProgress holds at 1 through the twilight gap after the sun sets.
    if (phase.bodyProgress < GLOOM_DUSK_START) return 0;
    return ((phase.bodyProgress - GLOOM_DUSK_START) / (1 - GLOOM_DUSK_START)) * GLOOM_AT_NIGHTFALL;
  }
  if (phase.progress < 0.1) return GLOOM_AT_NIGHTFALL + (phase.progress / 0.1) * (1 - GLOOM_AT_NIGHTFALL);
  return phase.progress < 0.9 ? 1 : 1 - (phase.progress - 0.9) / 0.1;
}

export type NightForecast = {
  isNight: boolean;
  /** The moon of the current night, or of tonight if it's still day. */
  moonPhaseIndex: number;
  isGloom: boolean;
  /** Time until tonight starts (0 once it's night). */
  msUntilNight: number;
  /** Time until the current night ends (0 during the day). */
  msUntilDawn: number;
};

export function nightForecast(startedAt: number, now: number = Date.now()): NightForecast {
  const elapsed = Math.max(0, now - startedAt);
  const elapsedInSegment = elapsed % SEGMENT_MS;
  const phase = computeCyclePhase(startedAt, now);
  return {
    isNight: !phase.isDay,
    moonPhaseIndex: phase.moonPhaseIndex,
    isGloom: phase.moonPhaseIndex === NEW_MOON_INDEX,
    msUntilNight: phase.isDay ? SEGMENT_MS - elapsedInSegment : 0,
    msUntilDawn: phase.isDay ? 0 : SEGMENT_MS - elapsedInSegment,
  };
}

/**
 * Hardcore Spawn's "reset to morning": a new anchor for the cycle landing at
 * the start of a day — the current one if it's already day, the next one if
 * it's night. Always moves the clock to a day start rather than restarting
 * it, so the moon keeps its place instead of snapping back to New Moon.
 */
export function skipToMorning(startedAt: number, now: number = Date.now()): number {
  const elapsed = Math.max(0, now - startedAt);
  const segment = Math.floor(elapsed / SEGMENT_MS);
  const target = segment % 2 === 0 ? segment : segment + 1;
  return now - target * SEGMENT_MS;
}

export type CycleJump = "dusk" | "dawn" | "gloom-sunset" | "gloom-night";

/**
 * Admin testing (Engine Debug tab): a new anchor that puts the cycle a few
 * seconds before the chosen moment, always moving forward in time.
 * "gloom-sunset" lands where the darkness starts creeping in, on the day
 * before the next New Moon night; "gloom-night" just before that night falls.
 */
export function jumpCycle(startedAt: number, target: CycleJump, now: number = Date.now()): number {
  const LEAD_MS = 5_000;
  const elapsed = Math.max(0, now - startedAt);
  const segment = Math.floor(elapsed / SEGMENT_MS);
  let targetElapsed: number;
  if (target === "dusk" || target === "dawn") {
    // Next night segment (odd) for dusk, next day segment (even) for dawn.
    const wantOdd = target === "dusk";
    let s = segment + 1;
    if ((s % 2 === 1) !== wantOdd) s++;
    targetElapsed = s * SEGMENT_MS;
  } else {
    // The next full cycle whose moon is New (index 0).
    const cycle = Math.floor(elapsed / FULL_CYCLE_MS);
    const nextNewMoon = Math.ceil((cycle + 1) / MOON_PHASES.length) * MOON_PHASES.length;
    const cycleStart = nextNewMoon * FULL_CYCLE_MS;
    targetElapsed = target === "gloom-sunset" ? cycleStart + PHASE_MS * GLOOM_DUSK_START : cycleStart + SEGMENT_MS;
  }
  return now - (targetElapsed - LEAD_MS);
}

export function saveCycleStartedAt(startedAt: number) {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(CYCLE_KEY, JSON.stringify({ startedAt }));
  } catch {
    // Same tolerance as loadCycleStartedAt.
  }
}

export function areStarsEnabled(): boolean {
  if (typeof window === "undefined") return false;
  try {
    return loadState().upgrades.purchased.includes("stars");
  } catch {
    return false;
  }
}

export function isThemeOverrideAllowed(): boolean {
  if (typeof window === "undefined") return true;
  try {
    return loadState().settings.themeOverrideAllowed;
  } catch {
    return true;
  }
}

export function themeForPhase(isDay: boolean): "light" | "dark" {
  return isDay ? "light" : "dark";
}

// --- Sky gradient colors ---
// Four keyframes shared between the day and night halves of the cycle so
// the color is continuous at every boundary (no pop): dawn is where night
// hands off to day, dusk is where day hands off to night. Modeled loosely
// on Minecraft's own sky palette (warm pink/orange horizon at dawn/dusk,
// bright blue midday, near-black midnight) rather than the two flat colors
// this used to hard-swap between.
type Rgb = [number, number, number];
type SkyStop = { top: Rgb; horizon: Rgb };

const DAWN: SkyStop = { top: [91, 127, 181], horizon: [255, 178, 107] };
const MIDDAY: SkyStop = { top: [126, 200, 242], horizon: [191, 227, 247] };
const DUSK: SkyStop = { top: [58, 53, 96], horizon: [255, 126, 95] };
const MIDNIGHT: SkyStop = { top: [5, 8, 16], horizon: [12, 23, 48] };

function lerpRgb(a: Rgb, b: Rgb, t: number): Rgb {
  const mix = (x: number, y: number) => Math.round(x + (y - x) * t);
  return [mix(a[0], b[0]), mix(a[1], b[1]), mix(a[2], b[2])];
}

function lerpStop(a: SkyStop, b: SkyStop, t: number): SkyStop {
  return { top: lerpRgb(a.top, b.top, t), horizon: lerpRgb(a.horizon, b.horizon, t) };
}

export function rgbToCss([r, g, b]: Rgb, alpha = 1): string {
  return alpha >= 1 ? `rgb(${r}, ${g}, ${b})` : `rgba(${r}, ${g}, ${b}, ${alpha})`;
}

// Each phase is its own dawn/dusk-to-peak-and-back arc: the first half
// eases toward the extreme (midday or midnight), the second half eases back
// toward the next handoff color.
export function skyColors(phase: CyclePhase): SkyStop {
  const { isDay, progress } = phase;
  const [start, peak, end] = isDay ? [DAWN, MIDDAY, DUSK] : [DUSK, MIDNIGHT, DAWN];
  return progress < 0.5 ? lerpStop(start, peak, progress / 0.5) : lerpStop(peak, end, (progress - 0.5) / 0.5);
}

// The site's own light/dark theme body background (see app/globals.css's
// `body` / `[data-theme="dark"] body` rules — kept in sync by hand, there's
// no shared source of truth to import from CSS). Used as the sky gradient's
// bottom stop so it visually melts into the page instead of hard-cutting to
// "transparent" and exposing whatever flat color the page snaps to the
// instant `data-theme` flips.
const LIGHT_BG: Rgb = [255, 255, 255];
const DARK_BG: Rgb = [10, 20, 32];

// Holds at the CURRENT theme's color for the first half of each phase, then
// eases toward the next theme's color over the second half, arriving
// exactly as `data-theme` itself flips (see themeForPhase) — so the flip
// lands on a color the gradient already matches, instead of a separate,
// later CSS transition trying to paper over a mismatch after the fact.
export function siteBgBlend(phase: CyclePhase): Rgb {
  const { isDay, progress } = phase;
  const start = isDay ? LIGHT_BG : DARK_BG;
  const end = isDay ? DARK_BG : LIGHT_BG;
  return progress < 0.5 ? start : lerpRgb(start, end, (progress - 0.5) / 0.5);
}
