import { describe, expect, it } from "vitest";
import { EnginePowerMechanic } from "../config";
import { DIFF_CHALLENGES, DIFF_SIZE, diffTerrain, fixedSquares, scoreChallenge } from "./difference";
import { canPlaceOn } from "./layouts";
import { footprint } from "./parts";

const power = new EnginePowerMechanic();

describe("Difference Engine challenges", () => {
  it("has 12 unique challenges on 7x7 boards", () => {
    expect(DIFF_CHALLENGES).toHaveLength(12);
    expect(new Set(DIFF_CHALLENGES.map((c) => c.id)).size).toBe(12);
    for (const c of DIFF_CHALLENGES) {
      expect(c.terrain).toHaveLength(DIFF_SIZE);
      for (const r of c.terrain) expect(r).toHaveLength(DIFF_SIZE);
    }
  });

  for (const c of DIFF_CHALLENGES) {
    it(`${c.name}: reference solution earns gold with nothing popping`, () => {
      const s = scoreChallenge(c, c.solution, power);
      expect(s.pops).toBe(0);
      expect(s.success).toBe(true);
      expect(s.medal).toBe("gold");
      expect(c.solution.length).toBeLessThanOrEqual(c.par.gold);
    });

    it(`${c.name}: fixed parts fit — every square on the board, on terrain they can sit on, never overlapping`, () => {
      const terrain = diffTerrain(c);
      const seen = new Set<number>();
      for (const f of c.fixed) {
        const squares = footprint(f.type, f.rot, f.y * DIFF_SIZE + f.x, DIFF_SIZE, DIFF_SIZE);
        expect(squares).not.toBeNull();
        for (const j of squares!) {
          expect(seen.has(j)).toBe(false);
          seen.add(j);
          expect(canPlaceOn(terrain[j], f)).toBe(true);
        }
      }
    });

    it(`${c.name}: solution respects the allowed parts and never overlaps fixed parts or bad terrain`, () => {
      const terrain = diffTerrain(c);
      const covered = fixedSquares(c);
      const counts: Record<string, number> = {};
      for (const p of c.solution) counts[p.type] = (counts[p.type] ?? 0) + 1;
      for (const [t, n] of Object.entries(counts)) expect(n).toBeLessThanOrEqual(c.allowed[t as keyof typeof c.allowed] ?? 0);
      for (const p of c.solution) {
        expect(covered.has(p.y * DIFF_SIZE + p.x)).toBe(false);
        expect(terrain[p.y * DIFF_SIZE + p.x]).toBe("ground");
      }
    });

    it(`${c.name}: an empty board fails`, () => {
      expect(scoreChallenge(c, [], power).success).toBe(c.fixed.length === 0);
    });
  }
});
