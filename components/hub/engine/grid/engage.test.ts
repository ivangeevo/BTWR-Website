import { describe, expect, it } from "vitest";
import { researchEffects } from "../catalog/research";
import { DEFAULT_ENGINE_CONFIG as cfg } from "../config";
import { defaultEngineState } from "../state";
import type { EngineState, PlacedPart } from "../types";
import { breakOverloadedCranks, engageGrid } from "./engage";

const env = { night: false, fullMoon: false };
const fx = researchEffects([]);

function stage4(parts: [number, PlacedPart["type"]][]): EngineState {
  const cells: (PlacedPart | null)[] = Array.from({ length: 25 }, () => null);
  for (const [i, type] of parts) cells[i] = { uid: `${type}@${i}`, type, rot: 0 };
  return { ...defaultEngineState(), stage: 4, grid: { w: 5, h: 5, cells, clutch: false, rev: 0 } };
}

describe("breakOverloadedCranks", () => {
  it("snaps a crank next to a windmill and re-solves the engaged grid", () => {
    const base = stage4([
      [6, "handCrank"],
      [5, "millstone"],
      [7, "windmill"],
    ]);
    const engaged = engageGrid(base, env, cfg, fx, { refundFirstPop: false })!;
    // engaging doesn't break it — only turning it does
    expect(engaged.grid.cells[6]?.broken).toBeFalsy();
    const e = { ...base, grid: engaged.grid, solved: engaged.solved };
    const r = breakOverloadedCranks(e, env, cfg, fx)!;
    expect(r.broken).toBe(1);
    expect(r.grid.cells[6]?.broken).toBe(true);
    expect(r.grid.rev).toBe(e.grid.rev + 1);
    expect(r.solved?.cranked.supplyPU).toBe(0);
  });

  it("leaves a crank that only touches its Millstone alone", () => {
    const e = stage4([
      [6, "handCrank"],
      [5, "millstone"],
    ]);
    expect(breakOverloadedCranks(e, env, cfg, fx)).toBeNull();
  });
});
