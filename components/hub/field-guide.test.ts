import { describe, expect, it } from "vitest";
import type { Mod } from "@/lib/mods";
import { completedGroups, fieldGuideBonuses, fieldGuideGroups, fieldGuideProgress } from "./field-guide";

function mod(id: string, category: Mod["category"], subcategory: string | null = null, over: Partial<Mod> = {}): Mod {
  return {
    projectId: id,
    slug: id,
    name: id.toUpperCase(),
    iconUrl: `https://example.test/${id}.png`,
    modrinthUrl: `https://modrinth.com/mod/${id}`,
    category,
    subcategory,
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

const MODS = [
  mod("core-b", "core"),
  mod("core-a", "core"),
  mod("sodium", "misc", "performance"),
  mod("lib", "misc", "library"),
  mod("odd", "uncategorized"),
  mod("gone", "core", null, { disabled: true }),
];

describe("Field Guide", () => {
  it("groups the pack like the Mods page, sorted, empty groups left out", () => {
    const groups = fieldGuideGroups(MODS);
    expect(groups.map((g) => g.id)).toEqual(["core", "performance", "library", "other"]);
    expect(groups[0].mods.map((m) => m.projectId)).toEqual(["core-a", "core-b"]);
  });

  it("a group is done once every mod in it is catalogued", () => {
    expect(completedGroups(MODS, ["core-a"])).toEqual([]);
    expect(completedGroups(MODS, ["core-a", "core-b", "sodium"])).toEqual(["core", "performance"]);
  });

  it("adds up the finished groups' perks", () => {
    expect(fieldGuideBonuses([])).toEqual({ woodBonus: 0, foodBonus: 0, stoneBonus: 0, cooldownMult: 1, relicChanceBonus: 0 });
    const b = fieldGuideBonuses(["core", "performance", "library", "other"]);
    expect(b.foodBonus).toBe(1);
    expect(b.stoneBonus).toBe(1);
    expect(b.cooldownMult).toBeCloseTo(0.9);
  });

  it("counts progress against mods that can still turn up", () => {
    expect(fieldGuideProgress(MODS, ["core-a", "gone", "not-a-mod"])).toEqual({ have: 1, total: 5 });
  });
});
