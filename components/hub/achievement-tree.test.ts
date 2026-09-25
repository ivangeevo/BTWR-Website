import { describe, expect, it } from "vitest";
import { ACHIEVEMENTS, ACHIEVEMENTS_BY_ID, CATEGORY_ORDER, type AchievementId } from "./achievements-catalog";
import {
  DEFAULT_ACHIEVEMENT_TREE as TREE,
  isSelfOrDescendant,
  layoutTree,
  resolveTree,
  TREE_ROW_H,
  visibleNodes,
} from "./achievement-tree";

describe("achievement tree data", () => {
  it("has an entry for every achievement", () => {
    for (const a of ACHIEVEMENTS) expect(TREE[a.id], a.id).toBeDefined();
  });

  it("links parents within the same category, without loops", () => {
    for (const a of ACHIEVEMENTS) {
      const parent = TREE[a.id].parent;
      if (!parent) continue;
      expect(ACHIEVEMENTS_BY_ID[parent], `${a.id} → ${parent}`).toBeDefined();
      expect(ACHIEVEMENTS_BY_ID[parent].category, `${a.id} → ${parent}`).toBe(a.category);
      expect(isSelfOrDescendant(TREE, a.id, parent), `${a.id} loops`).toBe(false);
    }
  });

  it("gives every category at least one root", () => {
    for (const c of CATEGORY_ORDER) {
      const inCat = ACHIEVEMENTS.filter((a) => a.category === c);
      if (inCat.length === 0) continue;
      expect(inCat.some((a) => TREE[a.id].parent === null), c).toBe(true);
    }
  });

  it("frames secrets as challenges unless told otherwise", () => {
    expect(TREE["en-first-pop"].frame).toBe("challenge");
    expect(TREE["pd-first-sentence"].frame).toBe("task");
    expect(TREE["pd-insight-200"].frame).toBe("goal");
  });
});

describe("resolveTree", () => {
  it("applies valid parent and frame edits", () => {
    const t = resolveTree({ parent: { "pd-first-choice": "pd-fluent" }, frame: { "pd-fluent": "goal" } });
    expect(t["pd-first-choice"].parent).toBe("pd-fluent");
    expect(t["pd-fluent"].frame).toBe("goal");
  });

  it("can make a node a root", () => {
    expect(resolveTree({ parent: { "pd-fluent": "root" } })["pd-fluent"].parent).toBeNull();
  });

  it("rejects cross-category and looping parents", () => {
    const t = resolveTree({ parent: { "pd-fluent": "quiz-attempted", "pd-first-sentence": "pd-insight-200" } });
    expect(t["pd-fluent"].parent).toBe(TREE["pd-fluent"].parent);
    expect(t["pd-first-sentence"].parent).toBeNull();
  });
});

describe("fog of war", () => {
  const ids = (v: { id: AchievementId }[]) => v.map((n) => n.id);

  it("a fresh save sees only the roots", () => {
    expect(ids(visibleNodes(TREE, "ponder", new Set()))).toEqual(["pd-first-sentence"]);
  });

  it("earning a node reveals its next steps", () => {
    const v = ids(visibleNodes(TREE, "ponder", new Set(["pd-first-sentence"])));
    expect(v).toEqual(expect.arrayContaining(["pd-first-sentence", "pd-fluent", "pd-first-choice", "pd-insight-1"]));
    expect(v).not.toContain("pd-insight-10");
  });

  it("an early-earned node pulls in its whole chain", () => {
    const v = ids(visibleNodes(TREE, "ponder", new Set(["pd-insight-50"])));
    expect(v).toEqual(expect.arrayContaining(["pd-first-sentence", "pd-insight-1", "pd-insight-10", "pd-insight-50", "pd-insight-200"]));
  });

  it("unearned secrets stay hidden, or masked when they lead somewhere earned", () => {
    expect(ids(visibleNodes(TREE, "secrets", new Set()))).toEqual([]);
    const v = visibleNodes(TREE, "secrets", new Set(["master-smith"]));
    expect(v.find((n) => n.id === "soul-urn")?.masked).toBe(true);
    expect(v.find((n) => n.id === "master-smith")?.masked).toBe(false);
    expect(ids(visibleNodes(TREE, "engine", new Set(["en-first-iron"])))).not.toContain("en-first-pop");
  });
});

describe("layoutTree", () => {
  it("gives unique positions and centres parents on their children", () => {
    const earned = new Set(ACHIEVEMENTS.filter((a) => a.category === "engine").map((a) => a.id));
    const layout = layoutTree(TREE, visibleNodes(TREE, "engine", earned));
    const keys = new Set(layout.nodes.map((n) => `${n.x},${n.y}`));
    expect(keys.size).toBe(layout.nodes.length);
    const byId = new Map(layout.nodes.map((n) => [n.id, n]));
    for (const n of layout.nodes) {
      const kids = layout.edges.filter((e) => e.from === n.id).map((e) => byId.get(e.to)!);
      if (kids.length === 0) continue;
      expect(n.y).toBeCloseTo((kids[0].y + kids[kids.length - 1].y) / 2);
      for (const k of kids) expect(k.depth).toBe(n.depth + 1);
    }
  });

  it("stacks several roots with rows between them", () => {
    const layout = layoutTree(TREE, visibleNodes(TREE, "manual-labor", new Set()));
    const ys = layout.nodes.map((n) => n.y).sort((a, b) => a - b);
    for (let i = 1; i < ys.length; i++) expect(ys[i] - ys[i - 1]).toBeGreaterThanOrEqual(TREE_ROW_H);
  });
});
