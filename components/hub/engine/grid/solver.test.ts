import { describe, expect, it } from "vitest";
import { EnginePowerMechanic } from "../config";
import type { EngineGrid, GridPartType, Rot, Terrain } from "../types";
import { solveGrid, type SolveOptions } from "./solver";

const N: Rot = 0;
const E: Rot = 1;
const S: Rot = 2;
const W: Rot = 3;

function board(w: number, h: number, core?: [number, number], water: [number, number][] = []) {
  const terrain: Terrain[] = Array.from({ length: w * h }, () => "ground");
  if (core) terrain[core[1] * w + core[0]] = "core";
  for (const [x, y] of water) terrain[y * w + x] = "water";
  const grid: EngineGrid = { w, h, cells: Array.from({ length: w * h }, () => null), clutch: false, rev: 0 };
  let n = 0;
  const api = {
    grid,
    terrain,
    put(x: number, y: number, type: GridPartType, rot: Rot = N) {
      grid.cells[y * w + x] = { uid: `${type}-${n++}@${x},${y}`, type, rot };
      return api;
    },
    uid(x: number, y: number) {
      return grid.cells[y * w + x]!.uid;
    },
  };
  return api;
}

function opts(over: Partial<SolveOptions> = {}): SolveOptions {
  return {
    crankActive: true,
    crankBoost: false,
    winter: false,
    thawed: false,
    power: new EnginePowerMechanic(),
    ...over,
  };
}

describe("solveGrid — axle runs", () => {
  it("carries a windmill through three axles to the core", () => {
    // windmill at x0 (E-W axis), 3 axles, core at x4
    const b = board(5, 3, [4, 1]).put(0, 1, "windmill", E).put(1, 1, "axle", E).put(2, 1, "axle", E).put(3, 1, "axle", E);
    const r = solveGrid(b.grid, b.terrain, opts());
    expect(r.pops).toEqual([]);
    expect(r.corePU).toBe(4);
  });

  it("pops the 4th axle in a powered run", () => {
    const b = board(6, 3, [5, 1])
      .put(0, 1, "windmill", E)
      .put(1, 1, "axle", E)
      .put(2, 1, "axle", E)
      .put(3, 1, "axle", E)
      .put(4, 1, "axle", E);
    const r = solveGrid(b.grid, b.terrain, opts());
    expect(r.pops).toEqual([{ uid: b.uid(4, 1), reason: "chain" }]);
    expect(r.broken).toEqual([b.uid(4, 1)]);
    expect(r.corePU).toBe(0);
  });

  it("a gearbox resets the axle run", () => {
    const b = board(9, 3, [8, 1])
      .put(0, 1, "windmill", E)
      .put(1, 1, "axle", E)
      .put(2, 1, "axle", E)
      .put(3, 1, "axle", E)
      .put(4, 1, "gearbox", W)
      .put(5, 1, "axle", E)
      .put(6, 1, "axle", E)
      .put(7, 1, "axle", E);
    const r = solveGrid(b.grid, b.terrain, opts());
    expect(r.pops).toEqual([]);
    expect(r.corePU).toBe(4);
  });

  it("soulforged axles count half toward the run", () => {
    const b = board(8, 3, [7, 1]).put(0, 1, "windmill", E);
    for (let x = 1; x <= 6; x++) b.put(x, 1, "sfAxle", E);
    const r = solveGrid(b.grid, b.terrain, opts());
    expect(r.pops).toEqual([]);
    expect(r.corePU).toBe(4);
  });

  it("ignores an axle turned sideways to the flow", () => {
    const b = board(4, 3, [3, 1]).put(0, 1, "windmill", E).put(1, 1, "axle", N).put(2, 1, "axle", E);
    const r = solveGrid(b.grid, b.terrain, opts());
    expect(r.corePU).toBe(0);
    expect(r.pops).toEqual([]);
  });

  it("pops an axle fed from both ends", () => {
    // two windmills facing each other through one axle — and no core nearby
    const b = board(5, 3).put(0, 1, "windmill", E).put(2, 1, "axle", E).put(4, 1, "windmill", E);
    b.put(1, 1, "axle", E).put(3, 1, "axle", E);
    const r = solveGrid(b.grid, b.terrain, opts());
    expect(r.pops.map((p) => p.reason)).toContain("opposed");
  });
});

describe("solveGrid — gearboxes", () => {
  it("turns a corner", () => {
    // crank-less: windmill north-south into a gearbox, east out to the core
    const b = board(3, 4, [2, 3]).put(0, 0, "windmill", S).put(0, 1, "axle", S).put(0, 2, "axle", S);
    b.put(0, 3, "gearbox", N).put(1, 3, "axle", E);
    const r = solveGrid(b.grid, b.terrain, opts());
    expect(r.pops).toEqual([]);
    expect(r.corePU).toBe(4);
  });

  it("pops when a second source feeds an output face", () => {
    const b = board(7, 3, [6, 1])
      .put(0, 1, "windmill", E)
      .put(1, 1, "axle", E)
      .put(2, 1, "gearbox", W)
      .put(3, 1, "axle", E)
      .put(4, 1, "windmill", E);
    const r = solveGrid(b.grid, b.terrain, opts());
    expect(r.pops).toContainEqual({ uid: b.uid(2, 1), reason: "twoSources" });
  });

  it("pops a plain gearbox fed by a water wheel (overload), not a soulforged one", () => {
    const plain = board(4, 3, [3, 1], [[0, 1]]).put(0, 1, "waterWheel", E).put(1, 1, "gearbox", W).put(2, 1, "axle", E);
    const r1 = solveGrid(plain.grid, plain.terrain, opts());
    expect(r1.pops).toEqual([{ uid: plain.uid(1, 1), reason: "overload" }]);
    const sf = board(4, 3, [3, 1], [[0, 1]]).put(0, 1, "waterWheel", E).put(1, 1, "sfGearbox", W).put(2, 1, "axle", E);
    const r2 = solveGrid(sf.grid, sf.terrain, opts());
    expect(r2.pops).toEqual([]);
    expect(r2.corePU).toBe(6);
  });

  it("does not pop a gearbox that is only back-fed", () => {
    const b = board(4, 3, [3, 1]).put(0, 1, "windmill", E).put(1, 1, "gearbox", E);
    const r = solveGrid(b.grid, b.terrain, opts());
    expect(r.pops).toEqual([]);
    expect(r.warnings).toContainEqual({ uid: b.uid(1, 1), code: "backfedUnpowered" });
  });
});

describe("solveGrid — hand crank", () => {
  it("only works pointed into a gearbox input", () => {
    const good = board(3, 3, [2, 1]).put(0, 1, "handCrank", E).put(1, 1, "gearbox", W);
    expect(solveGrid(good.grid, good.terrain, opts()).corePU).toBe(1);
    const bad = board(3, 3, [2, 1]).put(0, 1, "handCrank", E).put(1, 1, "axle", E);
    const r = solveGrid(bad.grid, bad.terrain, opts());
    expect(r.corePU).toBe(0);
    expect(r.warnings).toContainEqual({ uid: bad.uid(0, 1), code: "crankNeedsGearbox" });
  });

  it("gives nothing while not cranking, double while fed", () => {
    const b = board(3, 3, [2, 1]).put(0, 1, "handCrank", E).put(1, 1, "gearbox", W);
    expect(solveGrid(b.grid, b.terrain, opts({ crankActive: false })).corePU).toBe(0);
    expect(solveGrid(b.grid, b.terrain, opts({ crankBoost: true })).corePU).toBe(2);
  });
});

describe("solveGrid — windmill & water wheel placement", () => {
  it("windmill needs clear neighbours except its axis", () => {
    const b = board(4, 3, [3, 1]).put(0, 1, "windmill", E).put(1, 1, "axle", E).put(2, 1, "axle", E).put(1, 0, "axle", N);
    const r = solveGrid(b.grid, b.terrain, opts());
    expect(r.corePU).toBe(0);
    expect(r.warnings).toContainEqual({ uid: b.uid(0, 1), code: "obstructed" });
  });

  it("water wheel must be on water, and freezes in winter unless thawed", () => {
    const dry = board(3, 3, [2, 1]).put(0, 1, "waterWheel", E).put(1, 1, "axle", E);
    expect(solveGrid(dry.grid, dry.terrain, opts()).warnings).toContainEqual({ uid: dry.uid(0, 1), code: "notWater" });
    const wet = board(3, 3, [2, 1], [[0, 1]]).put(0, 1, "waterWheel", E).put(1, 1, "axle", E);
    expect(solveGrid(wet.grid, wet.terrain, opts()).corePU).toBe(6);
    const frozen = solveGrid(wet.grid, wet.terrain, opts({ winter: true }));
    expect(frozen.corePU).toBe(0);
    expect(frozen.warnings).toContainEqual({ uid: wet.uid(0, 1), code: "frozen" });
    expect(solveGrid(wet.grid, wet.terrain, opts({ winter: true, thawed: true })).corePU).toBe(6);
  });
});

describe("solveGrid — attachments", () => {
  it("powers an attachment on its input face and sends the rest to the core", () => {
    // windmill -> gearbox; gearbox east to core, south to a saw facing north
    const b = board(5, 4, [4, 1]).put(0, 1, "windmill", E).put(1, 1, "axle", E).put(2, 1, "gearbox", W).put(3, 1, "axle", E);
    b.put(2, 2, "saw", N);
    const r = solveGrid(b.grid, b.terrain, opts());
    expect(r.powered).toEqual([b.uid(2, 2)]);
    expect(r.corePU).toBe(3);
  });

  it("wrong face: warning, unpowered, no pop", () => {
    const b = board(5, 4, [4, 1]).put(0, 1, "windmill", E).put(1, 1, "axle", E).put(2, 1, "gearbox", W).put(3, 1, "axle", E);
    b.put(2, 2, "saw", E);
    const r = solveGrid(b.grid, b.terrain, opts());
    expect(r.powered).toEqual([]);
    expect(r.pops).toEqual([]);
    expect(r.warnings).toContainEqual({ uid: b.uid(2, 2), code: "wrongFace" });
    expect(r.corePU).toBe(4);
  });

  it("browns out attachments when the source can't cover them, closest first", () => {
    // crank (1 PU) -> gearbox; saw north (depth 2) and millstone south (depth 2): north is lower cell index
    const b = board(3, 3, [2, 1]).put(0, 1, "handCrank", E).put(1, 1, "gearbox", W);
    b.put(1, 0, "saw", S).put(1, 2, "millstone", N);
    const r = solveGrid(b.grid, b.terrain, opts());
    expect(r.powered).toEqual([b.uid(1, 0)]);
    expect(r.warnings).toContainEqual({ uid: b.uid(1, 2), code: "brownout" });
    expect(r.corePU).toBe(0);
  });
});

describe("solveGrid — determinism & fixpoint", () => {
  it("returns identical results for identical input", () => {
    const make = () =>
      board(6, 3, [5, 1]).put(0, 1, "windmill", E).put(1, 1, "axle", E).put(2, 1, "axle", E).put(3, 1, "axle", E).put(4, 1, "axle", E);
    const a = make();
    const b = make();
    expect(solveGrid(a.grid, a.terrain, opts())).toEqual(solveGrid(b.grid, b.terrain, opts()));
  });

  it("does not mutate the input grid", () => {
    const b = board(6, 3, [5, 1]).put(0, 1, "windmill", E).put(1, 1, "axle", E).put(2, 1, "axle", E).put(3, 1, "axle", E).put(4, 1, "axle", E);
    solveGrid(b.grid, b.terrain, opts());
    expect(b.grid.cells.some((c) => c?.broken)).toBe(false);
  });

  it("re-solves after pops (downstream parts lose power)", () => {
    const b = board(4, 3, [3, 1], [[0, 1]]).put(0, 1, "waterWheel", E).put(1, 1, "gearbox", W).put(2, 1, "axle", E);
    const r = solveGrid(b.grid, b.terrain, opts());
    expect(r.passes).toBe(2);
    expect(r.corePU).toBe(0);
  });
});
