import type { EngineGrid, EngineStage, PlacedPart, Terrain } from "../types";
import { PART_DEFS } from "./parts";

// The grid grows with the Engine's stage. The core (where leftover power
// feeds the Engine's own components) always sits mid-way down the right
// edge; water tiles appear down the left edge from Stage 6, lined up with
// the core's row so a water wheel can reach it in one straight axle run.
export type GridLayout = { w: number; h: number; terrain: Terrain[]; core: number };

export function layoutFor(stage: EngineStage): GridLayout | null {
  if (stage < 4) return null;
  const size = stage === 4 ? 3 : stage <= 6 ? 4 : 5;
  const w = size;
  const h = size;
  const terrain: Terrain[] = Array.from({ length: w * h }, () => "ground");
  const coreY = Math.floor(h / 2);
  const core = coreY * w + (w - 1);
  terrain[core] = "core";
  if (stage >= 6) {
    for (let y = coreY; y < h; y++) terrain[y * w] = "water";
  }
  return { w, h, terrain, core };
}

export function emptyGrid(stage: EngineStage): EngineGrid {
  const layout = layoutFor(stage);
  const w = layout?.w ?? 0;
  const h = layout?.h ?? 0;
  return { w, h, cells: Array.from({ length: w * h }, () => null), clutch: false, rev: 0 };
}

export function canPlaceOn(terrain: Terrain, part: PlacedPart | { type: PlacedPart["type"] }): boolean {
  if (terrain === "core" || terrain === "rock") return false;
  const def = PART_DEFS[part.type];
  return def.water ? terrain === "water" : terrain === "ground";
}

// Carries parts over into a bigger layout at the same (x, y). Anything
// that no longer fits (off the edge, now the core, wrong terrain) goes back
// to the inventory rather than vanishing.
export function remapGrid(
  grid: EngineGrid,
  stage: EngineStage
): { grid: EngineGrid; returned: PlacedPart[] } {
  const layout = layoutFor(stage);
  if (!layout) return { grid: emptyGrid(stage), returned: grid.cells.filter((c): c is PlacedPart => c !== null) };
  if (layout.w === grid.w && layout.h === grid.h) {
    const returned: PlacedPart[] = [];
    const cells = grid.cells.map((c, i) => {
      if (c && !canPlaceOn(layout.terrain[i], c)) {
        returned.push(c);
        return null;
      }
      return c;
    });
    return { grid: { ...grid, cells, rev: grid.rev + (returned.length ? 1 : 0) }, returned };
  }
  const next = emptyGrid(stage);
  const returned: PlacedPart[] = [];
  for (let y = 0; y < grid.h; y++) {
    for (let x = 0; x < grid.w; x++) {
      const part = grid.cells[y * grid.w + x];
      if (!part) continue;
      if (x < layout.w && y < layout.h && canPlaceOn(layout.terrain[y * layout.w + x], part)) {
        next.cells[y * layout.w + x] = part;
      } else {
        returned.push(part);
      }
    }
  }
  return { grid: { ...next, rev: grid.rev + 1 }, returned };
}
