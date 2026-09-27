import { describe, expect, it } from "vitest";
import {
  defaultCampState,
  farmGrowth,
  feedWolf,
  isTorchLit,
  isWolfFed,
  lightTorch,
  normalizeCamp,
  rollFish,
} from "./camp";
import { computeCyclePhase, cycleDayIndex, cycleSegmentIndex, daylightMsBetween, isTwilight, PHASE_MS } from "./day-night-cycle";

// Mirrors day-night-cycle.ts: a day or night segment is its arc plus a 6s twilight gap.
const SEGMENT = PHASE_MS + 6_000;
const T0 = 1_700_000_000_000;

describe("the wolf", () => {
  it("stays fed through the days one meal covers, then wanders off", () => {
    const fed = feedWolf(defaultCampState(), 10, 2)!;
    expect(isWolfFed(fed, 10)).toBe(true);
    expect(isWolfFed(fed, 11)).toBe(true);
    expect(isWolfFed(fed, 12)).toBe(false);
  });

  it("won't take another meal until one would reach further", () => {
    const fed = feedWolf(defaultCampState(), 10, 2)!;
    expect(feedWolf(fed, 10, 2)).toBeNull();
    expect(feedWolf(fed, 11, 2)!.wolfFedUntilDay).toBe(13);
  });
});

describe("torches", () => {
  it("burn one per night, and only when there's one to light", () => {
    const camp = { ...defaultCampState(), torches: 2 };
    const lit = lightTorch(camp, 5)!;
    expect(lit.torches).toBe(1);
    expect(isTorchLit(lit, 5)).toBe(true);
    // Asking again the same night changes nothing.
    expect(lightTorch(lit, 5)).toBe(lit);
    expect(lightTorch(lit, 7)!.torches).toBe(0);
    expect(lightTorch(defaultCampState(), 5)).toBeNull();
  });
});

describe("the farm plot", () => {
  it("only grows in daylight", () => {
    // A whole day: all of it counts.
    expect(daylightMsBetween(T0, T0, T0 + SEGMENT)).toBe(SEGMENT);
    // The night after it adds nothing.
    expect(daylightMsBetween(T0, T0 + SEGMENT, T0 + 2 * SEGMENT)).toBe(0);
    // Half a day, a night, half a day.
    expect(daylightMsBetween(T0, T0 + SEGMENT / 2, T0 + 2.5 * SEGMENT)).toBe(SEGMENT);
    expect(daylightMsBetween(T0, T0 + 10, T0)).toBe(0);
  });

  it("ripens once it's had enough daylight", () => {
    expect(farmGrowth(null, 10)).toBeNull();
    expect(farmGrowth(5 * 60_000, 10)).toBeCloseTo(0.5);
    expect(farmGrowth(20 * 60_000, 10)).toBe(1);
  });
});

describe("fishing", () => {
  it("bites harder at dawn and dusk", () => {
    expect(rollFish(1, 2, false, 1, () => 0)).toBe(1);
    expect(rollFish(1, 2, false, 1, () => 0.99)).toBe(2);
    expect(rollFish(1, 2, true, 1, () => 0)).toBe(2);
  });

  it("knows dawn and dusk from the middle of the day", () => {
    expect(isTwilight(computeCyclePhase(T0, T0 + 1_000))).toBe(true);
    expect(isTwilight(computeCyclePhase(T0, T0 + PHASE_MS / 2))).toBe(false);
    expect(isTwilight(computeCyclePhase(T0, T0 + PHASE_MS - 1_000))).toBe(true);
    // Night never counts.
    expect(isTwilight(computeCyclePhase(T0, T0 + SEGMENT + 1_000))).toBe(false);
  });
});

describe("cycle indexes", () => {
  it("count days and half-days from the anchor", () => {
    expect(cycleSegmentIndex(T0, T0 + SEGMENT + 1)).toBe(1);
    expect(cycleDayIndex(T0, T0 + SEGMENT + 1)).toBe(0);
    expect(cycleDayIndex(T0, T0 + 2 * SEGMENT)).toBe(1);
  });
});

describe("normalizeCamp", () => {
  it("fills in a missing or malformed slice", () => {
    expect(normalizeCamp(undefined)).toEqual(defaultCampState());
    expect(normalizeCamp({ torches: -3, wolfFedUntilDay: "x" as unknown as number })).toEqual(defaultCampState());
  });
});
