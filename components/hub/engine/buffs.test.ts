import { describe, expect, it } from "vitest";
import { computeBuffs, NO_BUFFS } from "./buffs";
import { researchEffects } from "./catalog/research";
import { DEFAULT_ENGINE_CONFIG as cfg } from "./config";
import { defaultEngineState, emptySummary } from "./state";
import type { EngineState, GridPartType } from "./types";

const fx = researchEffects([]);

// A grid holding the given parts, with the steady (idle) solve powering
// `powered` of them and the crank-turned solve powering `cranked`.
function engine(parts: GridPartType[], powered: number[], cranked: number[] = powered, over: Partial<EngineState> = {}): EngineState {
  const base = defaultEngineState();
  const cells = parts.map((type, i) => ({ uid: `p${i}`, type, rot: 0 as const }));
  return {
    ...base,
    stage: 6,
    grid: { w: parts.length, h: 1, cells, clutch: true, rev: 0 },
    solved: {
      idle: { ...emptySummary(), powered: powered.map((i) => `p${i}`) },
      cranked: { ...emptySummary(), powered: cranked.map((i) => `p${i}`) },
      rev: 0,
    },
    ...over,
  };
}

describe("computeBuffs", () => {
  it("gives nothing with the clutch out or nothing powered", () => {
    expect(computeBuffs(engine(["saw"], []), cfg, fx)).toEqual(NO_BUFFS);
    const e = engine(["saw"], [0]);
    expect(computeBuffs({ ...e, grid: { ...e.grid, clutch: false } }, cfg, fx)).toEqual(NO_BUFFS);
  });

  it("stacks a flat bonus per powered copy", () => {
    const b = computeBuffs(engine(["saw", "saw", "millstone", "millstone", "bellows"], [0, 1, 2, 3, 4]), cfg, fx);
    expect(b.sawWood).toBe(2 * cfg.buffs.sawWood);
    expect(b.millStone).toBe(2 * cfg.buffs.millstoneStone);
    expect(b.bellowsOre).toBe(cfg.buffs.bellowsOre);
    expect(b.sawHoldMult).toBeLessThan(1);
    expect([b.sawPowered, b.millPowered, b.bellowsPowered]).toEqual([true, true, true]);
  });

  it("only counts steady grid power, never what the crank turns", () => {
    const b = computeBuffs(engine(["millstone", "bellows"], [], [0, 1]), cfg, fx);
    expect(b).toEqual(NO_BUFFS);
  });

  it("grows with research and the Homesteader", () => {
    const e = engine(["millstone", "bellows"], [0, 1]);
    const plain = computeBuffs(e, cfg, fx);
    const researched = computeBuffs(e, cfg, researchEffects(["r-mill", "r-bellows"]));
    expect(researched.millStone).toBe(Math.round(cfg.buffs.millstoneStone * 1.5));
    expect(researched.bellowsOre).toBe(Math.round(cfg.buffs.bellowsOre * 1.5));
    const home = computeBuffs({ ...e, specialization: "homesteader" }, cfg, fx);
    expect(home.millStone).toBeGreaterThan(plain.millStone);
    expect(home.bellowsOre).toBeGreaterThan(plain.bellowsOre);
  });
});
