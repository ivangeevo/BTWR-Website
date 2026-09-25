import { describe, expect, it } from "vitest";
import { ACHIEVEMENTS, type AchievementId } from "./achievements-catalog";
import { DEFAULT_ACHIEVEMENT_TREE, resolveTree, visibleNodes } from "./achievement-tree";
import {
  activeCatalog,
  customTriggerMet,
  newCustomId,
  sanitizeCustom,
  type CustomAchievement,
} from "./custom-achievements";
import { defaultState } from "./hub-storage";

const custom = (over: Partial<CustomAchievement> = {}): CustomAchievement => ({
  id: "custom-regular",
  title: "Regular",
  description: "Visited five days.",
  icon: "\u{1F3E0}",
  category: "ponder",
  xp: 40,
  secret: false,
  trigger: { kind: "stat", stat: "days-visited", at: 5 },
  ...over,
});

describe("active catalog", () => {
  it("drops removed built-ins and appends custom ones", () => {
    const cat = activeCatalog([custom()], ["pd-fluent"]);
    expect(cat.byId["pd-fluent"]).toBeUndefined();
    expect(cat.byId["custom-regular"]?.title).toBe("Regular");
    expect(cat.list.length).toBe(ACHIEVEMENTS.length);
  });

  it("makes unique readable ids", () => {
    expect(newCustomId("First Snowfall!", new Set())).toBe("custom-first-snowfall");
    expect(newCustomId("First Snowfall", new Set(["custom-first-snowfall"]))).toBe("custom-first-snowfall-2");
  });

  it("sanitizes saved entries", () => {
    expect(sanitizeCustom({ id: "pd-fluent", title: "x" })).toBeNull();
    const s = sanitizeCustom({ id: "custom-a", category: "nope", trigger: { kind: "stat", stat: "level", at: -3 } });
    expect(s?.category).toBe("ponder");
    expect(s?.trigger).toEqual({ kind: "stat", stat: "level", at: 0 });
  });
});

describe("custom triggers", () => {
  const state = defaultState();
  const ctx = (days: number, unlocked: AchievementId[] = []) => {
    const s = { ...state, tier2: { ...state.tier2, totalDaysVisited: days } };
    return { state: s, level: 1, unlockedCount: unlocked.length, unlockedSet: new Set(unlocked) };
  };

  it("a stat rule fires at its target", () => {
    const a = custom();
    const cat = activeCatalog([a], []);
    expect(customTriggerMet(a, ctx(4), cat)).toBe(false);
    expect(customTriggerMet(a, ctx(5), cat)).toBe(true);
  });

  it("an all-of rule needs every one, ignoring removed ones", () => {
    const a = custom({ trigger: { kind: "all", ids: ["pd-first-sentence", "pd-fluent"] } });
    expect(customTriggerMet(a, ctx(0, ["pd-first-sentence"]), activeCatalog([a], []))).toBe(false);
    expect(customTriggerMet(a, ctx(0, ["pd-first-sentence"]), activeCatalog([a], ["pd-fluent"]))).toBe(true);
    const empty = custom({ trigger: { kind: "all", ids: [] } });
    expect(customTriggerMet(empty, ctx(0), activeCatalog([empty], []))).toBe(false);
  });
});

describe("trees with custom and removed achievements", () => {
  it("a custom achievement is a root and can be chained", () => {
    const cat = activeCatalog([custom()], []);
    expect(resolveTree({}, cat)["custom-regular"]).toEqual({ parent: null, frame: "task" });
    expect(resolveTree({ parent: { "custom-regular": "pd-fluent" } }, cat)["custom-regular"].parent).toBe("pd-fluent");
    expect(visibleNodes(resolveTree({}, cat), "ponder", new Set(), cat).map((n) => n.id)).toContain("custom-regular");
  });

  it("removing a parent leaves the tree whole, its children becoming roots", () => {
    const child = ACHIEVEMENTS.find((a) => DEFAULT_ACHIEVEMENT_TREE[a.id].parent === "pd-first-sentence")!;
    const cat = activeCatalog([], ["pd-first-sentence"]);
    const tree = resolveTree({}, cat);
    expect(tree["pd-first-sentence"]).toBeUndefined();
    expect(tree[child.id].parent).toBeNull();
    expect(visibleNodes(tree, "ponder", new Set(), cat).map((n) => n.id)).not.toContain("pd-first-sentence");
  });
});
