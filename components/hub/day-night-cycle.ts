// Site-wide day/night cycle — deliberately independent of AchievementsProvider
// (which only mounts on the homepage) since the theme toggle in the site
// header, and the sky band in the root layout, both need to read this on
// every page. Everything here is a pure function of a stored start
// timestamp plus the current clock, so nothing needs a ticking React
// context — each consumer just re-derives on its own interval.
import { loadState } from "./hub-storage";

const CYCLE_KEY = "btwr:hub:cycle:v1";

/** How long the sun/moon takes to arc from rise to set. */
export const PHASE_MS = 180_000;
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
    if (!state.enabled || !state.settings.dayNightCycleEnabled) return false;
    return state.upgrades.purchased.includes("day-night-cycle");
  } catch {
    return false;
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
