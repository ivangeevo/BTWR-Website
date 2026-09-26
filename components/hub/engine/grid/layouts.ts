import type { EngineGrid, EngineStage, GridPartType, PlacedPart, Rot, Terrain } from "../types";
import { footprint, nextRot, PART_DEFS, partSpan, spanIsHorizontal } from "./parts";

// The grid grows with the Engine's stage (5×5, 6×6, 7×7). The ◎ core — the
// Engine's input: only power that reaches it counts — sits mid-way down the
// right edge. Water tiles run down the left edge from the core's row, from
// Stage 5, so a water wheel there lines up with it.
export type GridLayout = { w: number; h: number; terrain: Terrain[] };

export function layoutFor(stage: EngineStage): GridLayout | null {
  if (stage < 4) return null;
  const size = stage === 4 ? 5 : stage <= 6 ? 6 : 7;
  const w = size;
  const h = size;
  const terrain: Terrain[] = Array.from({ length: w * h }, () => "ground");
  const coreY = Math.floor(h / 2);
  terrain[coreY * w + (w - 1)] = "core";
  if (stage >= 5) {
    for (let y = coreY; y < h; y++) terrain[y * w] = "water";
  }
  return { w, h, terrain };
}

export function emptyGrid(stage: EngineStage): EngineGrid {
  const layout = layoutFor(stage);
  const w = layout?.w ?? 0;
  const h = layout?.h ?? 0;
  return { w, h, cells: Array.from({ length: w * h }, () => null), clutch: false, rev: 0 };
}

/** Whether one square of a part may sit on this terrain. */
export function canPlaceOn(terrain: Terrain, part: PlacedPart | { type: PlacedPart["type"] }): boolean {
  if (terrain === "core" || terrain === "rock") return false;
  return PART_DEFS[part.type].water ? terrain === "water" || terrain === "ground" : terrain === "ground";
}

/** Which part covers each square: the hub cell index, or -1 for empty. */
export function occupancy(cells: (PlacedPart | null)[], w: number, h: number): Int32Array {
  const out = new Int32Array(cells.length).fill(-1);
  cells.forEach((c, i) => {
    if (!c) return;
    for (const j of footprint(c.type, c.rot, i, w, h) ?? [i]) if (out[j] < 0 || j === i) out[j] = i;
  });
  return out;
}

/**
 * Whether a part of `type` facing `rot` fits with its hub at `index`: on the
 * board, every square free (the part at `ignore` — the one being moved or
 * turned — doesn't count) and on terrain it can sit on.
 */
export function canPlaceAt(
  cells: (PlacedPart | null)[],
  terrain: Terrain[],
  w: number,
  h: number,
  index: number,
  type: GridPartType,
  rot: Rot,
  ignore = -1
): boolean {
  const squares = footprint(type, rot, index, w, h);
  if (!squares) return false;
  const occ = occupancy(cells, w, h);
  return squares.every((j) => (occ[j] < 0 || occ[j] === ignore) && canPlaceOn(terrain[j], { type }));
}

/**
 * The way a new part of `type` should face with its hub at `index`: the
 * preferred rotation if it fits, otherwise its other one (a windmill that
 * can't stand in a column lies along the row instead). Null if neither fits.
 */
export function placementRot(
  cells: (PlacedPart | null)[],
  terrain: Terrain[],
  w: number,
  h: number,
  index: number,
  type: GridPartType,
  preferred: Rot = 1
): Rot | null {
  if (canPlaceAt(cells, terrain, w, h, index, type, preferred)) return preferred;
  const other = nextRot(type, preferred);
  if (other !== preferred && canPlaceAt(cells, terrain, w, h, index, type, other)) return other;
  return null;
}

/**
 * Where the part with its hub at `index` ends up after one tap's turn. A big
 * part that has no room to turn in place slides along its new direction to
 * the nearest spot it fits (so a windmill lying along the top row can stand
 * up into a column). Null if it can't turn anywhere nearby.
 */
export function turnTarget(
  cells: (PlacedPart | null)[],
  terrain: Terrain[],
  w: number,
  h: number,
  index: number
): { hub: number; rot: Rot } | null {
  const part = cells[index];
  if (!part) return null;
  const rot = nextRot(part.type, part.rot);
  const reach = (partSpan(part.type) - 1) / 2;
  const x0 = index % w;
  const y0 = Math.floor(index / w);
  const horizontal = spanIsHorizontal(rot);
  // Nearest first: 0, -1, +1, -2, +2 ...
  for (let k = 0; k <= reach * 2; k++) {
    const shift = k === 0 ? 0 : k % 2 === 1 ? -Math.ceil(k / 2) : Math.ceil(k / 2);
    const x = horizontal ? x0 + shift : x0;
    const y = horizontal ? y0 : y0 + shift;
    if (x < 0 || y < 0 || x >= w || y >= h) continue;
    const hub = y * w + x;
    if (canPlaceAt(cells, terrain, w, h, hub, part.type, rot, index)) return { hub, rot };
  }
  return null;
}

// Lays parts into a (possibly bigger) layout at the same (x, y), in cell
// order. Anything that no longer fits (off the edge, wrong terrain, on top of
// another part's squares) goes back to the inventory rather than vanishing.
export function remapGrid(
  grid: EngineGrid,
  stage: EngineStage
): { grid: EngineGrid; returned: PlacedPart[] } {
  const layout = layoutFor(stage);
  if (!layout) return { grid: emptyGrid(stage), returned: grid.cells.filter((c): c is PlacedPart => c !== null) };
  const same = layout.w === grid.w && layout.h === grid.h;
  const next = emptyGrid(stage);
  const returned: PlacedPart[] = [];
  for (let y = 0; y < grid.h; y++) {
    for (let x = 0; x < grid.w; x++) {
      const part = grid.cells[y * grid.w + x];
      if (!part) continue;
      const i = y * layout.w + x;
      if (x < layout.w && y < layout.h && canPlaceAt(next.cells, layout.terrain, layout.w, layout.h, i, part.type, part.rot)) {
        next.cells[i] = part;
      } else {
        returned.push(part);
      }
    }
  }
  // A bigger grid starts disengaged; the same grid keeps its clutch.
  const base = same ? grid : next;
  return { grid: { ...base, cells: next.cells, rev: grid.rev + (!same || returned.length > 0 ? 1 : 0) }, returned };
}
