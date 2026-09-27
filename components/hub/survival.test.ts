import { describe, expect, it } from "vitest";
import { SurvivalMechanic } from "./mechanics";
import {
  activityHitChance,
  completeTrekIfDone,
  defaultSurvivalState,
  isStranded,
  respawn,
  rollActivityDamage,
  tickVitals,
  trekRemainingMs,
} from "./survival";

const t = new SurvivalMechanic();
const calm = { gloomNight: false, fireLit: true };
const T0 = Date.UTC(2026, 0, 1);

describe("trek home", () => {
  it("is shortened by the Engine's lit core, stacking with the Compass", () => {
    const plain = respawn(defaultSurvivalState(), "hunting", T0, t, () => 0.5);
    const called = respawn(defaultSurvivalState(), "hunting", T0, t, () => 0.5, 0.75);
    const both = respawn({ ...defaultSurvivalState(), compass: true }, "hunting", T0, t, () => 0.5, 0.75);
    expect(plain.stranded!.trekMs).toBe(t.trekSec * 1000);
    expect(plain.stranded!.calledHome).toBeUndefined();
    expect(called.stranded!.trekMs).toBe(t.trekSec * 1000 * 0.75);
    expect(called.stranded!.calledHome).toBe(true);
    expect(both.stranded!.trekMs).toBe(t.trekSec * 1000 * (t.compassTrekPct / 100) * 0.75);
  });
});

describe("tickVitals", () => {
  it("drains a point of hunger per hungerDrainSec, across many small ticks", () => {
    let s = defaultSurvivalState();
    for (let i = 0; i < 60; i++) s = tickVitals(s, 1000, calm, t).state;
    expect(s.hunger).toBe(19);
  });

  it("only hurts in gloom on a New Moon night with the fire out", () => {
    const s = defaultSurvivalState();
    expect(tickVitals(s, 5000, { gloomNight: true, fireLit: true }, t).state.health).toBe(20);
    expect(tickVitals(s, 5000, { gloomNight: false, fireLit: false }, t).state.health).toBe(20);
    expect(tickVitals(s, 5000, { gloomNight: true, fireLit: false }, t).state.health).toBe(19);
  });

  it("lets the Engine's lit core hold part of the gloom back", () => {
    const s = defaultSurvivalState();
    const dark = { gloomNight: true, fireLit: false };
    // Half the gloom held back: a point every 2 × gloomSec instead of every gloomSec.
    expect(tickVitals(s, 5000, { ...dark, gloomShield: 0.5 }, t).state.health).toBe(20);
    expect(tickVitals(s, 10000, { ...dark, gloomShield: 0.5 }, t).state.health).toBe(19);
    // All of it held back: no harm at all.
    expect(tickVitals(s, 60000, { ...dark, gloomShield: 1 }, t).state.health).toBe(20);
    expect(defaultSurvivalState().gloomNightsSurvived).toBe(0);
  });

  it("kills by gloom in about 100s from full health", () => {
    let s = defaultSurvivalState();
    let died = null;
    let seconds = 0;
    while (!died && seconds < 1000) {
      const r = tickVitals(s, 1000, { gloomNight: true, fireLit: false }, t);
      s = r.state;
      died = r.died;
      seconds++;
    }
    expect(died).toBe("gloom");
    expect(seconds).toBe(100);
  });

  it("starves at 0 hunger and regenerates when fed", () => {
    const starving = { ...defaultSurvivalState(), hunger: 0 };
    expect(tickVitals(starving, 10_000, calm, t).state.health).toBe(19);
    const hurt = { ...defaultSurvivalState(), health: 10 };
    expect(tickVitals(hurt, 10_000, calm, t).state.health).toBe(11);
  });
});

describe("activity damage", () => {
  it("is rarer with better tools, likelier at night, never below the floor", () => {
    expect(activityHitChance(1, false, t)).toBeCloseTo(0.15);
    expect(activityHitChance(3, false, t)).toBeCloseTo(0.11);
    expect(activityHitChance(1, true, t)).toBeCloseTo(0.225);
    expect(activityHitChance(99, false, t)).toBeCloseTo(0.05);
  });

  it("rolls within the damage range on a hit and 0 on a miss", () => {
    expect(rollActivityDamage(1, false, t, () => 0.99)).toBe(0);
    expect(rollActivityDamage(1, false, t, () => 0)).toBe(t.damageMin);
  });
});

describe("respawn", () => {
  it("lands at full stats and strands the visitor for the trek", () => {
    const s = respawn(defaultSurvivalState(), "hunting", T0, t, () => 0.5);
    expect(s.health).toBe(20);
    expect(s.hunger).toBe(20);
    expect(s.stranded?.blocks).toBe(1200);
    expect(trekRemainingMs(s, T0)).toBe(120_000);
    expect(isStranded(s, T0 + 119_000)).toBe(true);
    expect(isStranded(s, T0 + 120_000)).toBe(false);
  });

  it("halves the trek with a Compass", () => {
    const s = respawn({ ...defaultSurvivalState(), compass: true }, "mining", T0, t, () => 0.5);
    expect(trekRemainingMs(s, T0)).toBe(60_000);
  });

  it("weakens repeat respawns inside the window, down to the floor", () => {
    let s = respawn(defaultSurvivalState(), "gloom", T0, t, () => 0.5);
    s = respawn(s, "gloom", T0 + 60_000, t, () => 0.5);
    expect(s.health).toBe(16);
    expect(s.stranded?.blocks).toBe(1200);
    for (let i = 2; i < 6; i++) s = respawn(s, "gloom", T0 + i * 60_000, t, () => 0.5);
    expect(s.health).toBe(10);
    expect(s.hunger).toBe(10);
    expect(s.respawnsInWindow).toBe(5);
    expect(s.gloomDeaths).toBe(6);
  });

  it("starts a fresh window once 10 minutes have passed", () => {
    let s = respawn(defaultSurvivalState(), "starvation", T0, t, () => 0.5);
    s = respawn(s, "starvation", T0 + 11 * 60_000, t, () => 0);
    expect(s.health).toBe(20);
    expect(s.respawnsInWindow).toBe(0);
    expect(s.stranded?.blocks).toBe(t.minBlocks);
  });

  it("clears a finished trek exactly once", () => {
    const s = respawn(defaultSurvivalState(), "hunting", T0, t, () => 0.5);
    expect(completeTrekIfDone(s, T0 + 1000)).toBeNull();
    const back = completeTrekIfDone(s, T0 + 120_000);
    expect(back?.stranded).toBeNull();
    expect(back?.treksCompleted).toBe(1);
    expect(completeTrekIfDone(back!, T0 + 200_000)).toBeNull();
  });
});
