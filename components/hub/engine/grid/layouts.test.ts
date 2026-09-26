import { describe, expect, it } from "vitest";
import type { PlacedPart } from "../types";
import { canPlaceAt, layoutFor, placementRot, remapGrid, turnTarget } from "./layouts";
import { footprint, nextRot } from "./parts";

describe("layoutFor", () => {
  it("has no body before Stage 4, then grows 5×5 → 6×6 → 7×7", () => {
    expect(layoutFor(3)).toBeNull();
    expect([4, 5, 6, 7, 8].map((s) => layoutFor(s as 4)!.w)).toEqual([5, 6, 6, 7, 7]);
  });

  it("has one core, mid-way down the right edge", () => {
    for (const [stage, w, coreY] of [
      [4, 5, 2],
      [5, 6, 3],
      [7, 7, 3],
    ] as const) {
      const l = layoutFor(stage)!;
      expect(l.terrain.filter((t) => t === "core")).toHaveLength(1);
      expect(l.terrain.indexOf("core")).toBe(coreY * w + (w - 1));
    }
  });

  it("has water from Stage 5, down the left edge from the core's row", () => {
    const four = layoutFor(4)!;
    expect(four.terrain.includes("water")).toBe(false);
    const five = layoutFor(5)!;
    expect(five.terrain[3 * 6]).toBe("water");
    expect(five.terrain[2 * 6]).toBe("ground");
  });
});

describe("footprint", () => {
  it("lays big sources across their axle, hub in the middle", () => {
    // 5×5: a windmill with an east–west axle stands in a column; north–south, in a row
    expect(footprint("windmill", 1, 2 * 5 + 2, 5, 5)).toEqual([2, 7, 12, 17, 22]);
    expect(footprint("windmill", 0, 2 * 5 + 2, 5, 5)).toEqual([10, 11, 12, 13, 14]);
    expect(footprint("waterWheel", 1, 3 * 6, 6, 6)).toEqual([12, 18, 24]);
    expect(footprint("axle", 1, 7, 5, 5)).toEqual([7]);
  });

  it("is null when it runs off the board", () => {
    expect(footprint("windmill", 1, 1 * 5 + 2, 5, 5)).toBeNull();
    expect(footprint("windmill", 0, 2 * 5 + 1, 5, 5)).toBeNull();
    expect(footprint("waterWheel", 1, 5 * 6, 6, 6)).toBeNull();
  });
});

describe("canPlaceAt", () => {
  const five = layoutFor(4)!;
  const six = layoutFor(5)!;
  const empty = (n: number) => Array.from({ length: n }, () => null) as (PlacedPart | null)[];

  it("needs every square free, and ignores the part being moved or turned", () => {
    const cells = empty(25);
    cells[2 * 5 + 2] = { uid: "w", type: "windmill", rot: 1 };
    expect(canPlaceAt(cells, five.terrain, 5, 5, 0 * 5 + 1, "axle", 0)).toBe(true);
    expect(canPlaceAt(cells, five.terrain, 5, 5, 0 * 5 + 2, "axle", 0)).toBe(false); // a sail square
    expect(canPlaceAt(cells, five.terrain, 5, 5, 1 * 5 + 2, "windmill", 0)).toBe(false); // row 1 crosses its sail
    // moving it one square right fits once its own squares don't count
    expect(canPlaceAt(cells, five.terrain, 5, 5, 2 * 5 + 3, "windmill", 1, 2 * 5 + 2)).toBe(true);
    // turning it to lie along row 2 would cover the core at its end
    expect(canPlaceAt(cells, five.terrain, 5, 5, 2 * 5 + 2, "windmill", 0, 2 * 5 + 2)).toBe(false);
    // ...but along row 1 it turns fine (hub moved up one, ignoring itself)
    expect(canPlaceAt(cells, five.terrain, 5, 5, 1 * 5 + 2, "windmill", 0, 2 * 5 + 2)).toBe(true);
  });

  it("keeps windmills off water, and lets a water wheel hang over ground", () => {
    // 6×6: water down column 0 from row 3
    expect(canPlaceAt(empty(36), six.terrain, 6, 6, 3 * 6 + 1, "windmill", 1)).toBe(true);
    expect(canPlaceAt(empty(36), six.terrain, 6, 6, 3 * 6, "windmill", 1)).toBe(false);
    expect(canPlaceAt(empty(36), six.terrain, 6, 6, 3 * 6, "waterWheel", 1)).toBe(true);
    expect(canPlaceAt(empty(36), six.terrain, 6, 6, 3 * 6 + 1, "waterWheel", 0)).toBe(true);
    expect(canPlaceAt(empty(36), six.terrain, 6, 6, 3 * 6, "axle", 0)).toBe(false);
  });
});

describe("placementRot & turnTarget", () => {
  const five = layoutFor(4)!;
  const empty = () => Array.from({ length: 25 }, () => null) as (PlacedPart | null)[];

  it("stands a windmill in a column where it fits, and lays it along the row where it doesn't", () => {
    expect(placementRot(empty(), five.terrain, 5, 5, 2 * 5 + 1, "windmill")).toBe(1);
    // top and bottom rows: no room to stand, so it lies along the row
    expect(placementRot(empty(), five.terrain, 5, 5, 0 * 5 + 2, "windmill")).toBe(0);
    expect(placementRot(empty(), five.terrain, 5, 5, 4 * 5 + 2, "windmill")).toBe(0);
    // an edge corner fits neither way
    expect(placementRot(empty(), five.terrain, 5, 5, 0, "windmill")).toBeNull();
    // 1×1 parts keep the default
    expect(placementRot(empty(), five.terrain, 5, 5, 0, "gearbox")).toBe(1);
  });

  it("turns in place when there's room", () => {
    const cells = empty();
    cells[2 * 5 + 1] = { uid: "w", type: "windmill", rot: 1 };
    expect(turnTarget(cells, five.terrain, 5, 5, 2 * 5 + 1)).toBeNull(); // row 2 ends in the core
    const col = empty();
    col[1 * 5 + 2] = { uid: "w", type: "windmill", rot: 0 };
    // lying along row 1: standing up centred on (2,1) runs off the top, so it slides down to (2,2)
    expect(turnTarget(col, five.terrain, 5, 5, 1 * 5 + 2)).toEqual({ hub: 2 * 5 + 2, rot: 1 });
  });

  it("slides a windmill lying on the top row down into a column", () => {
    const cells = empty();
    cells[0 * 5 + 2] = { uid: "w", type: "windmill", rot: 0 };
    expect(turnTarget(cells, five.terrain, 5, 5, 2)).toEqual({ hub: 2 * 5 + 2, rot: 1 });
  });
});

describe("remapGrid", () => {
  it("sends back a part sitting where the core now is", () => {
    const cells = Array.from({ length: 25 }, () => null) as (PlacedPart | null)[];
    cells[2 * 5 + 4] = { uid: "g", type: "gearbox", rot: 0 };
    const r = remapGrid({ w: 5, h: 5, cells, clutch: false, rev: 0 }, 4);
    expect(r.returned.map((p) => p.uid)).toEqual(["g"]);
  });

  it("sends back a part that now overlaps another part's squares", () => {
    const cells = Array.from({ length: 25 }, () => null) as (PlacedPart | null)[];
    cells[1] = { uid: "a", type: "axle", rot: 0 };
    cells[2 * 5 + 1] = { uid: "w", type: "windmill", rot: 1 }; // sails would cover (1,0)
    const r = remapGrid({ w: 5, h: 5, cells, clutch: true, rev: 3 }, 4);
    expect(r.returned.map((p) => p.uid)).toEqual(["w"]);
    expect(r.grid.cells[1]?.uid).toBe("a");
    expect(r.grid.clutch).toBe(true);
    expect(r.grid.rev).toBe(4);
  });
});

describe("nextRot", () => {
  it("flips axis parts between their two axes, turns the rest a quarter", () => {
    expect([0, 1].map((r) => nextRot("axle", r as 0))).toEqual([1, 0]);
    expect(nextRot("windmill", 3)).toBe(0);
    expect([0, 1, 2, 3].map((r) => nextRot("gearbox", r as 0))).toEqual([1, 2, 3, 0]);
  });
});
