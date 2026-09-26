import { describe, expect, it } from "vitest";
import {
  computeCyclePhase,
  gloomDarkness,
  isGloomNight,
  jumpCycle,
  nightForecast,
  PHASE_MS,
  skipToMorning,
} from "./day-night-cycle";

const SEGMENT = PHASE_MS + 6_000;
const CYCLE = SEGMENT * 2;
const T0 = 1_000_000_000_000;

describe("gloom nights", () => {
  it("falls on the New Moon night only, once every eight nights", () => {
    const nights = Array.from({ length: 16 }, (_, i) => computeCyclePhase(T0, T0 + i * CYCLE + SEGMENT + 1000));
    expect(nights.filter(isGloomNight)).toHaveLength(2);
    expect(isGloomNight(computeCyclePhase(T0, T0 + 1000))).toBe(false); // New Moon's day half
  });

  it("stays clear all day, darkens only as the sun sets, and lifts toward dawn", () => {
    for (const f of [0.1, 0.5, 0.75, 0.85]) {
      expect(gloomDarkness(computeCyclePhase(T0, T0 + PHASE_MS * f)), `day ${f}`).toBe(0);
    }
    expect(gloomDarkness(computeCyclePhase(T0, T0 + PHASE_MS * 0.95))).toBeCloseTo(0.2);
    expect(gloomDarkness(computeCyclePhase(T0, T0 + PHASE_MS + 1000))).toBeCloseTo(0.4); // twilight gap
    expect(gloomDarkness(computeCyclePhase(T0, T0 + SEGMENT * 1.5))).toBe(1);
    expect(gloomDarkness(computeCyclePhase(T0, T0 + CYCLE + SEGMENT * 1.5))).toBe(0);
  });
});

describe("nightForecast", () => {
  it("counts down to tonight during the day, and to dawn at night", () => {
    const day = nightForecast(T0, T0 + 60_000);
    expect(day.isNight).toBe(false);
    expect(day.msUntilNight).toBe(SEGMENT - 60_000);
    expect(day.isGloom).toBe(true);
    const night = nightForecast(T0, T0 + SEGMENT + 60_000);
    expect(night.isNight).toBe(true);
    expect(night.msUntilDawn).toBe(SEGMENT - 60_000);
  });
});

describe("jumpCycle", () => {
  const now = T0 + CYCLE * 3 + 90_000; // day 3, moon index 3

  it("lands just before the next dusk or dawn", () => {
    const dusk = computeCyclePhase(jumpCycle(T0, "dusk", now), now + 5_000);
    expect(dusk.isDay).toBe(false);
    expect(dusk.progress).toBe(0);
    const dawn = computeCyclePhase(jumpCycle(T0, "dawn", now), now + 5_000);
    expect(dawn.isDay).toBe(true);
    expect(dawn.progress).toBe(0);
    expect(dawn.moonPhaseIndex).toBe(4);
  });

  it("lands on the next New Moon's sunset, then its night", () => {
    const sunset = computeCyclePhase(jumpCycle(T0, "gloom-sunset", now), now + 5_000);
    expect(sunset.isDay).toBe(true);
    expect(gloomDarkness(sunset)).toBe(0);
    expect(gloomDarkness(computeCyclePhase(jumpCycle(T0, "gloom-sunset", now), now + 60_000))).toBeGreaterThan(0);
    const night = computeCyclePhase(jumpCycle(T0, "gloom-night", now), now + 5_000);
    expect(isGloomNight(night)).toBe(true);
  });

  it("never moves the clock backward", () => {
    for (const target of ["dusk", "dawn", "gloom-sunset", "gloom-night"] as const) {
      expect(now - jumpCycle(T0, target, now)).toBeGreaterThan(now - T0);
    }
  });
});

describe("skipToMorning", () => {
  it("jumps a night forward to the next day, moon advanced by one", () => {
    const now = T0 + SEGMENT + 30_000; // New Moon night
    const anchor = skipToMorning(T0, now);
    const phase = computeCyclePhase(anchor, now);
    expect(phase.isDay).toBe(true);
    expect(phase.progress).toBe(0);
    expect(phase.moonPhaseIndex).toBe(1);
    expect(isGloomNight(phase)).toBe(false);
  });

  it("rewinds a day to its own morning, same moon", () => {
    const now = T0 + CYCLE * 3 + 90_000;
    const phase = computeCyclePhase(skipToMorning(T0, now), now);
    expect(phase.isDay).toBe(true);
    expect(phase.progress).toBe(0);
    expect(phase.moonPhaseIndex).toBe(3);
  });
});
