import { describe, expect, it } from "vitest";
import type { Mod } from "@/lib/mods";
import { mulberry32 } from "./engine/rng";
import { newRelic, normalizeRelic, pickRelicMod, relicCache, relicPool, rollRelic, strikeable } from "./relics";

function mod(id: string, over: Partial<Mod> = {}): Mod {
  return {
    projectId: id,
    slug: id,
    name: `Mod ${id}`,
    iconUrl: `https://example.test/${id}.png`,
    modrinthUrl: `https://modrinth.com/mod/${id}`,
    category: "core",
    subcategory: null,
    disabled: false,
    currentVersion: "1",
    currentVersionDate: null,
    newestVersion: "1",
    newestVersionDate: null,
    newestMatchesTarget: true,
    isOutdated: false,
    changelog: null,
    ...over,
  };
}

const MODS = ["a", "b", "c", "d", "e", "f"].map((id) => mod(id));

describe("relics", () => {
  it("only asks about mods in the pack with an icon to show", () => {
    const pool = relicPool([...MODS, mod("x", { iconUrl: null }), mod("y", { disabled: true })]);
    expect(pool.map((m) => m.projectId)).toEqual(["a", "b", "c", "d", "e", "f"]);
  });

  it("rolls against the chance, and never at zero", () => {
    expect(rollRelic(0, () => 0)).toBe(false);
    expect(rollRelic(0.12, () => 0.1)).toBe(true);
    expect(rollRelic(0.12, () => 0.5)).toBe(false);
  });

  it("builds four distinct choices that include the answer", () => {
    const rand = mulberry32(7);
    for (let i = 0; i < 50; i++) {
      const r = newRelic(MODS, [], "wood", rand)!;
      expect(r.choices).toHaveLength(4);
      expect(new Set(r.choices).size).toBe(4);
      expect(r.choices).toContain(r.modId);
      expect(r.struck).toEqual([]);
    }
  });

  it("can't ask with fewer mods than choices", () => {
    expect(newRelic(MODS.slice(0, 3), [], "mining")).toBeNull();
  });

  it("leans towards mods the Field Guide is missing", () => {
    const rand = mulberry32(3);
    const catalogued = ["a", "b", "c", "d", "e"];
    let missing = 0;
    for (let i = 0; i < 400; i++) if (pickRelicMod(MODS, catalogued, rand)!.projectId === "f") missing++;
    // 75% straight from the missing one, plus its share of the rest.
    expect(missing / 400).toBeGreaterThan(0.7);
    expect(pickRelicMod(MODS, MODS.map((m) => m.projectId), rand)).not.toBeNull();
  });

  it("the Detector strikes only wrong names, and always leaves two", () => {
    const r = { modId: "a", source: "wood" as const, choices: ["a", "b", "c", "d"], struck: [] as string[] };
    expect(strikeable(r).sort()).toEqual(["b", "c", "d"]);
    expect(strikeable({ ...r, struck: ["b"] }).sort()).toEqual(["c", "d"]);
    expect(strikeable({ ...r, struck: ["b", "c"] })).toEqual([]);
  });

  it("pays a cache of what the trip gathers", () => {
    expect(relicCache("wood", { wood: 2, food: 1 }, 3)).toEqual({ wood: 6 });
    expect(relicCache("hunting", { wood: 2, food: 2 }, 3)).toEqual({ cookedFood: 3 });
    expect(relicCache("hunting", { wood: 1, food: 1 }, 1)).toEqual({ cookedFood: 1 });
  });

  it("checks a saved relic on the way in", () => {
    const ok = { modId: "a", source: "mining", choices: ["a", "b", "c", "d"], struck: ["a", "b", 3] };
    expect(normalizeRelic(ok)).toEqual({ modId: "a", source: "mining", choices: ["a", "b", "c", "d"], struck: ["b"] });
    expect(normalizeRelic(null)).toBeNull();
    expect(normalizeRelic({ ...ok, source: "fishing" })).toBeNull();
    expect(normalizeRelic({ ...ok, choices: ["b", "c", "d"] })).toBeNull();
  });
});
