import { describe, expect, it } from "vitest";
import { EnginePowerMechanic } from "../config";
import type { EngineGrid, GridPartType, Rot, Terrain } from "../types";
import { popFixText, popReasonText } from "../content/voice";
import { crankCanTurn, overloadedCranks, solveGrid, type SolveOptions } from "./solver";

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

// A board with two spare rows above and below, so an east–west windmill's
// five squares (or a water wheel's three) fit. Coordinates, the core and
// water are given as on the unpadded board.
const PAD = 2;
function padded(w: number, h: number, core?: [number, number], water: [number, number][] = []) {
  const b = board(
    w,
    h + PAD * 2,
    core && [core[0], core[1] + PAD],
    water.map(([x, y]) => [x, y + PAD] as [number, number])
  );
  const api = {
    grid: b.grid,
    terrain: b.terrain,
    put(x: number, y: number, type: GridPartType, rot: Rot = N) {
      b.put(x, y + PAD, type, rot);
      return api;
    },
    uid: (x: number, y: number) => b.uid(x, y + PAD),
    at: (x: number, y: number) => (y + PAD) * w + x,
  };
  return api;
}

function opts(over: Partial<SolveOptions> = {}): SolveOptions {
  return {
    crankActive: true,
    winter: false,
    thawed: false,
    power: new EnginePowerMechanic(),
    ...over,
  };
}

describe("solveGrid — axle runs", () => {
  it("carries a windmill through three axles to the core", () => {
    // windmill at x0 (E-W axis), 3 axles, core at x4
    const b = padded(5, 3, [4, 1]).put(0, 1, "windmill", E).put(1, 1, "axle", E).put(2, 1, "axle", E).put(3, 1, "axle", E);
    const r = solveGrid(b.grid, b.terrain, opts());
    expect(r.pops).toEqual([]);
    expect(r.corePU).toBe(4);
  });

  it("pops the 4th axle in a powered run", () => {
    const b = padded(6, 3, [5, 1])
      .put(0, 1, "windmill", E)
      .put(1, 1, "axle", E)
      .put(2, 1, "axle", E)
      .put(3, 1, "axle", E)
      .put(4, 1, "axle", E);
    const r = solveGrid(b.grid, b.terrain, opts());
    expect(r.pops).toEqual([{ uid: b.uid(4, 1), reason: "chain", run: 4 }]);
    expect(r.broken).toEqual([b.uid(4, 1)]);
    expect(r.corePU).toBe(0);
  });

  it("a gearbox resets the axle run", () => {
    const b = padded(9, 3, [8, 1])
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
    const b = padded(8, 3, [7, 1]).put(0, 1, "windmill", E);
    for (let x = 1; x <= 6; x++) b.put(x, 1, "sfAxle", E);
    const r = solveGrid(b.grid, b.terrain, opts());
    expect(r.pops).toEqual([]);
    expect(r.corePU).toBe(4);
  });

  it("ignores an axle turned sideways to the flow", () => {
    const b = padded(4, 3, [3, 1]).put(0, 1, "windmill", E).put(1, 1, "axle", N).put(2, 1, "axle", E);
    const r = solveGrid(b.grid, b.terrain, opts());
    expect(r.corePU).toBe(0);
    expect(r.pops).toEqual([]);
  });

  it("only connects through an axle's thin ends", () => {
    // gearbox sends power north into an east-west axle's side: nothing turns
    const b = padded(4, 3, [3, 1]).put(0, 1, "windmill", E).put(1, 1, "axle", E).put(2, 1, "gearbox", W).put(2, 0, "axle", E);
    const r = solveGrid(b.grid, b.terrain, opts());
    expect(r.turning).not.toContain(b.uid(2, 0));
    expect(r.chainAt[b.uid(2, 0)]).toBeUndefined();
    // turned to run north-south, it carries the power
    const t = padded(4, 3, [3, 1]).put(0, 1, "windmill", E).put(1, 1, "axle", E).put(2, 1, "gearbox", W).put(2, 0, "axle", N);
    expect(solveGrid(t.grid, t.terrain, opts()).turning).toContain(t.uid(2, 0));
  });

  it("pops an axle fed from both ends", () => {
    // two windmills facing each other through one axle — and no core nearby
    const b = padded(5, 3).put(0, 1, "windmill", E).put(2, 1, "axle", E).put(4, 1, "windmill", E);
    b.put(1, 1, "axle", E).put(3, 1, "axle", E);
    const r = solveGrid(b.grid, b.terrain, opts());
    expect(r.pops.map((p) => p.reason)).toContain("opposed");
  });
});

describe("solveGrid — gearboxes", () => {
  it("turns a corner", () => {
    // crank-less: windmill (sails along the top row) north-south into a gearbox, east out to the core
    const b = board(5, 4, [4, 3]).put(2, 0, "windmill", S).put(2, 1, "axle", S).put(2, 2, "axle", S);
    b.put(2, 3, "gearbox", N).put(3, 3, "axle", E);
    const r = solveGrid(b.grid, b.terrain, opts());
    expect(r.pops).toEqual([]);
    expect(r.corePU).toBe(4);
  });

  it("gearboxes side by side don't pass power to each other, so neither pops", () => {
    // two windmills, each feeding its own gearbox; the gearboxes touch (one above the other)
    const b = padded(6, 5, [5, 1])
      .put(0, 1, "windmill", E)
      .put(1, 1, "axle", E)
      .put(2, 1, "gearbox", W)
      .put(3, 1, "axle", E)
      .put(4, 1, "axle", E)
      .put(2, 4, "windmill", N)
      .put(2, 3, "axle", N)
      .put(2, 2, "gearbox", S);
    const r = solveGrid(b.grid, b.terrain, opts());
    expect(r.pops).toEqual([]);
    expect(r.turning).toEqual(expect.arrayContaining([b.uid(2, 1), b.uid(2, 2)]));
    expect(r.corePU).toBe(4);
    // one feeding the other's yellow side directly still passes nothing
    const chain = padded(5, 3, [4, 1]).put(0, 1, "windmill", E).put(1, 1, "gearbox", W).put(2, 1, "gearbox", W).put(3, 1, "axle", E);
    const r2 = solveGrid(chain.grid, chain.terrain, opts());
    expect(r2.turning).not.toContain(chain.uid(2, 1));
    expect(r2.corePU).toBe(0);
  });

  it("pops when a second source feeds an output face", () => {
    const b = padded(7, 3, [6, 1])
      .put(0, 1, "windmill", E)
      .put(1, 1, "axle", E)
      .put(2, 1, "gearbox", W)
      .put(3, 1, "axle", E)
      .put(4, 1, "windmill", E);
    const r = solveGrid(b.grid, b.terrain, opts());
    expect(r.pops).toContainEqual({ uid: b.uid(2, 1), reason: "twoSources" });
  });

  it("takes power only on its yellow (input) side and sends it out the other three", () => {
    const b = padded(5, 5, [4, 2]).put(0, 2, "windmill", E).put(1, 2, "axle", E).put(2, 2, "gearbox", W);
    b.put(3, 2, "axle", E).put(2, 1, "axle", N).put(2, 3, "axle", N);
    const r = solveGrid(b.grid, b.terrain, opts());
    expect(r.corePU).toBe(4);
    expect(r.turning).toEqual(expect.arrayContaining([b.uid(2, 2), b.uid(3, 2), b.uid(2, 1), b.uid(2, 3)]));
    // turned so the yellow side faces away from the power: it doesn't turn
    const wrong = padded(5, 5, [4, 2]).put(0, 2, "windmill", E).put(1, 2, "axle", E).put(2, 2, "gearbox", E).put(3, 2, "axle", E);
    const w = solveGrid(wrong.grid, wrong.terrain, opts());
    expect(w.corePU).toBe(0);
    expect(w.warnings).toContainEqual({ uid: wrong.uid(2, 2), code: "backfedUnpowered" });
  });

  it("turns straight off a windmill or water wheel — they bring their own axle", () => {
    const touching = padded(4, 3, [3, 1]).put(0, 1, "windmill", E).put(1, 1, "gearbox", W).put(2, 1, "axle", E);
    const r = solveGrid(touching.grid, touching.terrain, opts());
    expect(r.corePU).toBe(4);
    expect(r.turning).toContain(touching.uid(1, 1));
    expect(r.warnings).toEqual([]);
    const wheel = padded(4, 3, [3, 1], [[0, 1]]).put(0, 1, "waterWheel", E).put(1, 1, "sfGearbox", W).put(2, 1, "axle", E);
    expect(solveGrid(wheel.grid, wheel.terrain, opts()).corePU).toBe(6);
  });

  it("pops a plain gearbox fed by a water wheel (overload), not a soulforged one", () => {
    const plain = padded(5, 3, [4, 1], [[0, 1]]).put(0, 1, "waterWheel", E).put(1, 1, "axle", E).put(2, 1, "gearbox", W).put(3, 1, "axle", E);
    const r1 = solveGrid(plain.grid, plain.terrain, opts());
    expect(r1.pops).toEqual([{ uid: plain.uid(2, 1), reason: "overload", load: 6, cap: 4 }]);
    const sf = padded(5, 3, [4, 1], [[0, 1]]).put(0, 1, "waterWheel", E).put(1, 1, "axle", E).put(2, 1, "sfGearbox", W).put(3, 1, "axle", E);
    const r2 = solveGrid(sf.grid, sf.terrain, opts());
    expect(r2.pops).toEqual([]);
    expect(r2.corePU).toBe(6);
  });

  it("does not pop a gearbox that is only back-fed", () => {
    const b = padded(4, 3, [3, 1]).put(0, 1, "windmill", E).put(1, 1, "axle", E).put(2, 1, "gearbox", E);
    const r = solveGrid(b.grid, b.terrain, opts());
    expect(r.pops).toEqual([]);
    expect(r.warnings).toContainEqual({ uid: b.uid(2, 1), code: "backfedUnpowered" });
  });
});

describe("solveGrid — hand crank & millstone", () => {
  // crank in the middle; millstone west (facing away), bellows north, saw east, axle south
  const crankBoard = () =>
    board(3, 3)
      .put(1, 1, "handCrank", N)
      .put(0, 1, "millstone", W)
      .put(1, 0, "bellows", E)
      .put(2, 1, "saw", W)
      .put(1, 2, "axle", N);

  it("turns the Millstone, Saw and Bellows right next to it, any side — nothing else", () => {
    const b = crankBoard();
    const r = solveGrid(b.grid, b.terrain, opts());
    expect(r.powered).toEqual([b.uid(1, 0), b.uid(0, 1), b.uid(2, 1)]);
    expect(r.handTurned).toEqual([b.uid(1, 0), b.uid(0, 1), b.uid(2, 1)]);
    expect(r.grinding).toBe(1);
    expect(r.corePU).toBe(1);
    expect(r.turning).not.toContain(b.uid(1, 2));
  });

  it("only while it's being turned", () => {
    const b = crankBoard();
    const r = solveGrid(b.grid, b.terrain, opts({ crankActive: false }));
    expect(r.powered).toEqual([]);
    expect(r.handTurned).toEqual([]);
    expect(r.grinding).toBe(0);
    expect(r.corePU).toBe(0);
  });

  it("powers the Engine on its own — nothing needs to be next to it", () => {
    const b = board(3, 3).put(1, 1, "handCrank", N);
    const r = solveGrid(b.grid, b.terrain, opts());
    expect(r.corePU).toBe(1);
    expect(r.turning).toEqual([b.uid(1, 1)]);
    expect(r.handTurned).toEqual([]);
  });

  it("never feeds a gearbox, so it can't pop one", () => {
    const b = board(3, 3).put(0, 1, "handCrank", N).put(1, 1, "gearbox", W).put(2, 1, "axle", E);
    const r = solveGrid(b.grid, b.terrain, opts());
    expect(r.pops).toEqual([]);
    expect(r.turning).toEqual([b.uid(0, 1)]);
    expect(r.corePU).toBe(1);
  });

  it("gives its power once, however many cranks there are — one pair of hands", () => {
    const b = board(5, 1).put(0, 0, "handCrank", N).put(1, 0, "millstone", N).put(2, 0, "saw", N).put(4, 0, "handCrank", N);
    const r = solveGrid(b.grid, b.terrain, opts());
    expect(r.corePU).toBe(1);
    expect(r.sources).toEqual([{ uid: b.uid(0, 0), type: "handCrank", pu: 1, toCore: true }]);
    // both cranks still turn, and each turns what's next to it
    expect(r.turning).toEqual(expect.arrayContaining([b.uid(0, 0), b.uid(4, 0)]));
    expect(r.handTurned).toEqual([b.uid(1, 0)]);
  });

  it("is overloaded next to another power source — a windmill, a water wheel or another crank", () => {
    const wind = padded(4, 3).put(1, 1, "handCrank", N).put(0, 1, "millstone", N).put(2, 1, "windmill", E);
    expect(overloadedCranks(wind.grid.cells, wind.grid.w, wind.grid.h)).toEqual([wind.at(1, 1)]);
    const r = solveGrid(wind.grid, wind.terrain, opts());
    expect(r.warnings).toContainEqual({ uid: wind.uid(1, 1), code: "crankJammed" });
    expect(r.sources.map((x) => x.type)).not.toContain("handCrank");
    expect(r.grinding).toBe(0);
    const twins = board(3, 1).put(0, 0, "handCrank", N).put(1, 0, "handCrank", N).put(2, 0, "millstone", N);
    expect(overloadedCranks(twins.grid.cells, 3, 1)).toEqual([0, 1]);
    // axles, gearboxes and other machines next to it don't overload it; nor does a broken windmill
    const fine = board(3, 3).put(1, 1, "handCrank", N).put(0, 1, "millstone", N).put(2, 1, "gearbox", N).put(1, 0, "saw", N).put(1, 2, "axle", N);
    expect(overloadedCranks(fine.grid.cells, 3, 3)).toEqual([]);
    const broken = board(3, 1).put(0, 0, "handCrank", N).put(1, 0, "windmill", N);
    broken.grid.cells[1]!.broken = true;
    expect(overloadedCranks(broken.grid.cells, 3, 1)).toEqual([]);
  });

  it("counts a windmill's sail squares as the windmill — a crank beside one is overloaded", () => {
    // windmill hub at (0,1), sails down column 0 from y -1 to 3; crank beside the (0,3) sail
    const b = padded(3, 3).put(0, 1, "windmill", E).put(1, 3, "handCrank", N).put(2, 3, "millstone", N);
    expect(overloadedCranks(b.grid.cells, b.grid.w, b.grid.h)).toEqual([b.at(1, 3)]);
  });

  it("can be turned while any crank on the grid is whole", () => {
    const b = board(3, 3).put(1, 1, "handCrank", N);
    expect(crankCanTurn(b.grid.cells)).toBe(true);
    b.grid.cells[4]!.broken = true;
    expect(crankCanTurn(b.grid.cells)).toBe(false);
  });

  it("a Millstone also turns when grid power reaches its input — powered, not hand-turned", () => {
    const b = padded(4, 3).put(0, 1, "windmill", E).put(1, 1, "axle", E).put(2, 1, "millstone", W);
    const r = solveGrid(b.grid, b.terrain, opts({ crankActive: false }));
    expect(r.powered).toEqual([b.uid(2, 1)]);
    expect(r.handTurned).toEqual([]);
    expect(r.grinding).toBe(1);
  });
});

describe("solveGrid — Engine power", () => {
  it("only counts what reaches the core — an unrouted source makes power for nothing", () => {
    const b = padded(5, 3).put(0, 1, "windmill", E);
    const r = solveGrid(b.grid, b.terrain, opts());
    expect(r.supplyPU).toBe(4);
    expect(r.corePU).toBe(0);
    expect(r.sources).toEqual([{ uid: b.uid(0, 1), type: "windmill", pu: 4, toCore: false }]);
  });

  it("marks a source routed into the core", () => {
    const b = padded(5, 3, [4, 1]).put(0, 1, "windmill", E).put(1, 1, "axle", E).put(2, 1, "axle", E).put(3, 1, "axle", E);
    const r = solveGrid(b.grid, b.terrain, opts());
    expect(r.corePU).toBe(4);
    expect(r.sources[0].toCore).toBe(true);
  });

  it("a turning crank's power goes straight into the Engine", () => {
    const b = board(3, 1).put(0, 0, "handCrank", N).put(1, 0, "millstone", N);
    const r = solveGrid(b.grid, b.terrain, opts());
    expect(r.corePU).toBe(1);
    expect(r.sources).toEqual([{ uid: b.uid(0, 0), type: "handCrank", pu: 1, toCore: true }]);
    expect(solveGrid(b.grid, b.terrain, opts({ crankActive: false })).corePU).toBe(0);
  });
});

describe("solveGrid — windmill & water wheel placement", () => {
  it("a windmill needs no clear air — parts right beside its sails don't stop it", () => {
    const b = padded(4, 3, [3, 1]).put(0, 1, "windmill", E).put(1, 1, "axle", E).put(2, 1, "axle", E).put(1, 0, "axle", N).put(1, 2, "saw", N);
    const r = solveGrid(b.grid, b.terrain, opts());
    expect(r.corePU).toBe(4);
    expect(r.warnings).toEqual([]);
  });

  it("a windmill whose sails run off the board is obstructed", () => {
    const b = board(4, 3, [3, 1]).put(0, 1, "windmill", E).put(1, 1, "axle", E).put(2, 1, "axle", E);
    const r = solveGrid(b.grid, b.terrain, opts());
    expect(r.corePU).toBe(0);
    expect(r.warnings).toContainEqual({ uid: b.uid(0, 1), code: "obstructed" });
  });

  it("power only leaves the hub — a sail square takes nothing in", () => {
    // windmill A down column 0 (hub y2, sails y0..4); windmill B's axle run ends on A's y0 sail
    const b = padded(5, 5).put(0, 2, "windmill", E).put(4, 0, "windmill", E).put(3, 0, "axle", E).put(2, 0, "axle", E).put(1, 0, "axle", E);
    const r = solveGrid(b.grid, b.terrain, opts());
    expect(r.pops).toEqual([]);
    expect(r.chainAt[b.uid(1, 0)]).toBe(3);
    expect(r.supplyPU).toBe(8);
  });

  it("a water wheel turns with any one of its squares on water", () => {
    // hub at (0,1) on ground, paddles at (0,0) and (0,2); only (0,2) is water
    const b = padded(3, 3, [2, 1], [[0, 2]]).put(0, 1, "waterWheel", E).put(1, 1, "axle", E);
    expect(solveGrid(b.grid, b.terrain, opts()).corePU).toBe(6);
  });

  it("water wheel must be on water, and freezes in winter unless thawed", () => {
    const dry = padded(3, 3, [2, 1]).put(0, 1, "waterWheel", E).put(1, 1, "axle", E);
    expect(solveGrid(dry.grid, dry.terrain, opts()).warnings).toContainEqual({ uid: dry.uid(0, 1), code: "notWater" });
    const wet = padded(3, 3, [2, 1], [[0, 1]]).put(0, 1, "waterWheel", E).put(1, 1, "axle", E);
    expect(solveGrid(wet.grid, wet.terrain, opts()).corePU).toBe(6);
    const frozen = solveGrid(wet.grid, wet.terrain, opts({ winter: true }));
    expect(frozen.corePU).toBe(0);
    expect(frozen.warnings).toContainEqual({ uid: wet.uid(0, 1), code: "frozen" });
    expect(solveGrid(wet.grid, wet.terrain, opts({ winter: true, thawed: true })).corePU).toBe(6);
  });
});

describe("solveGrid — attachments", () => {
  it("powers an attachment on its input face without drawing from the core", () => {
    // windmill -> gearbox; gearbox east to core, south to a saw facing north
    const b = padded(5, 4, [4, 1]).put(0, 1, "windmill", E).put(1, 1, "axle", E).put(2, 1, "gearbox", W).put(3, 1, "axle", E);
    b.put(2, 2, "saw", N);
    const r = solveGrid(b.grid, b.terrain, opts());
    expect(r.powered).toEqual([b.uid(2, 2)]);
    expect(r.corePU).toBe(4);
  });

  it("wrong face: warning, unpowered, no pop", () => {
    const b = padded(5, 4, [4, 1]).put(0, 1, "windmill", E).put(1, 1, "axle", E).put(2, 1, "gearbox", W).put(3, 1, "axle", E);
    b.put(2, 2, "saw", E);
    const r = solveGrid(b.grid, b.terrain, opts());
    expect(r.powered).toEqual([]);
    expect(r.pops).toEqual([]);
    expect(r.warnings).toContainEqual({ uid: b.uid(2, 2), code: "wrongFace" });
    expect(r.corePU).toBe(4);
  });

  it("runs every machine power reaches — no brownouts", () => {
    // windmill -> axle -> gearbox; saw north, detector south, bellows east
    const b = padded(4, 3).put(0, 1, "windmill", E).put(1, 1, "axle", E).put(2, 1, "gearbox", W);
    b.put(2, 0, "saw", S).put(2, 2, "detector", N).put(3, 1, "bellows", W);
    const r = solveGrid(b.grid, b.terrain, opts());
    expect(r.powered).toEqual([b.uid(2, 0), b.uid(3, 1), b.uid(2, 2)]);
    expect(r.warnings).toEqual([]);
    expect(r.supplyPU).toBe(4);
  });
});

describe("solveGrid — determinism & fixpoint", () => {
  it("returns identical results for identical input", () => {
    const make = () =>
      padded(6, 3, [5, 1]).put(0, 1, "windmill", E).put(1, 1, "axle", E).put(2, 1, "axle", E).put(3, 1, "axle", E).put(4, 1, "axle", E);
    const a = make();
    const b = make();
    expect(solveGrid(a.grid, a.terrain, opts())).toEqual(solveGrid(b.grid, b.terrain, opts()));
  });

  it("does not mutate the input grid", () => {
    const b = padded(6, 3, [5, 1]).put(0, 1, "windmill", E).put(1, 1, "axle", E).put(2, 1, "axle", E).put(3, 1, "axle", E).put(4, 1, "axle", E);
    solveGrid(b.grid, b.terrain, opts());
    expect(b.grid.cells.some((c) => c?.broken)).toBe(false);
  });

  it("re-solves after pops (downstream parts lose power)", () => {
    const b = padded(5, 3, [4, 1], [[0, 1]]).put(0, 1, "waterWheel", E).put(1, 1, "axle", E).put(2, 1, "gearbox", W).put(3, 1, "axle", E);
    const r = solveGrid(b.grid, b.terrain, opts());
    expect(r.passes).toBe(2);
    expect(r.corePU).toBe(0);
  });
});

describe("pop explanations", () => {
  it("say what pops and why, with the numbers", () => {
    expect(popReasonText({ uid: "g", reason: "overload", load: 6, cap: 4 }, 3)).toBe("6 PU goes in, but it's rated for 4");
    expect(popReasonText({ uid: "g", reason: "overload", load: 7.5, cap: 6 }, 3)).toBe("7.5 PU goes in, but it's rated for 6");
    expect(popReasonText({ uid: "a", reason: "chain", run: 4 }, 3)).toContain("axle 4 in a row");
    expect(popFixText({ uid: "g", reason: "overload" }, "gearbox")).toContain("Soulforged Gearbox");
    expect(popFixText({ uid: "g", reason: "overload" }, "sfGearbox")).not.toContain("Soulforged Gearbox");
  });
});
