import { describe, expect, it } from "vitest";
import { COMPONENTS } from "./catalog/components";
import { canBuyResearch, isResearchVisible, RESEARCH, researchEffects } from "./catalog/research";
import { commissionProgress, refreshCommissions } from "./commissions";
import { DEFAULT_ENGINE_CONFIG as cfg } from "./config";
import { nextEurekaDelayMs, rollEurekaKind } from "./eureka";
import { evaluateGate, type GateSite } from "./stages";
import { defaultEngineState, emptySummary } from "./state";
import type { EngineState } from "./types";

const fx = researchEffects([]);

function site(over: Partial<GateSite> = {}): GateSite {
  const order = ["none", "stone", "copper", "iron", "diamond", "netherite"];
  return {
    daysVisited: 1,
    unlockedCount: 0,
    isTierUnlocked: () => false,
    isModuleRevealed: () => false,
    toolIndex: 0,
    toolIndexOf: (id) => order.indexOf(id),
    toolNameOf: (id) => id,
    iron: 0,
    quizCorrect: 0,
    ...over,
  };
}

describe("stage gates", () => {
  it("Day Two needs solves AND (a return visit or achievements)", () => {
    const e = { ...defaultEngineState(), solvedCount: 8 };
    expect(evaluateGate(2, e, cfg.gates, site()).met).toBe(false);
    expect(evaluateGate(2, e, cfg.gates, site({ daysVisited: 2 })).met).toBe(true);
    expect(evaluateGate(2, e, cfg.gates, site({ unlockedCount: 8 })).met).toBe(true);
    expect(evaluateGate(2, { ...e, solvedCount: 7 }, cfg.gates, site({ daysVisited: 2 })).met).toBe(false);
    expect(evaluateGate(2, e, cfg.gates, site()).cost).toBe(cfg.gates.s2Cost);
  });

  it("each requirement toggles independently (The Stump)", () => {
    const e: EngineState = { ...defaultEngineState(), stage: 2, choicesMade: 6, askAnswers: { a: "x", b: "y", c: "z" }, modsRead: ["1", "2", "3", "4", "5"] };
    const ok = site({ isTierUnlocked: (t) => t === "tier3" });
    expect(evaluateGate(3, e, cfg.gates, ok).met).toBe(true);
    expect(evaluateGate(3, { ...e, choicesMade: 5 }, cfg.gates, ok).met).toBe(false);
    expect(evaluateGate(3, { ...e, askAnswers: { a: "x" } }, cfg.gates, ok).met).toBe(false);
    expect(evaluateGate(3, { ...e, modsRead: ["1"] }, cfg.gates, ok).met).toBe(false);
    expect(evaluateGate(3, e, cfg.gates, site()).met).toBe(false);
    expect(evaluateGate(3, e, cfg.gates, ok).reqs.filter((r) => r.site)).toHaveLength(2);
  });

  it("First Iron needs the crank blueprint, mod facts, hoppers, Gathering and a stone tool", () => {
    const e: EngineState = {
      ...defaultEngineState(),
      stage: 3,
      blueprints: ["handCrank"],
      solvesByKind: { tiles: 0, fork: 0, modFact: 10, live: 0, paragraph: 0 },
      components: { hopper: 5 },
    };
    const ok = site({ isModuleRevealed: (m) => m === "gathering", toolIndex: 1 });
    expect(evaluateGate(4, e, cfg.gates, ok).met).toBe(true);
    expect(evaluateGate(4, e, cfg.gates, { ...ok, toolIndex: 0 }).met).toBe(false);
    expect(evaluateGate(4, { ...e, blueprints: [] }, cfg.gates, ok).met).toBe(false);
  });

  it("Road to Mid-Game reads the engaged crank solve", () => {
    const base: EngineState = { ...defaultEngineState(), stage: 4, blueprints: ["handCrank", "windmill"], components: { hopper: 1, dispenser: 1, turntable: 1 } };
    const ok = site({ toolIndex: 2, iron: 3 });
    expect(evaluateGate(5, base, cfg.gates, ok).met).toBe(false);
    const engaged: EngineState = {
      ...base,
      grid: { ...base.grid, clutch: true },
      solved: { idle: emptySummary(), cranked: { ...emptySummary(), corePU: 1 }, boosted: { ...emptySummary(), corePU: 2 }, rev: 0 },
    };
    expect(evaluateGate(5, engaged, cfg.gates, ok).met).toBe(true);
  });
});

describe("research", () => {
  it("has about a hundred unique entries", () => {
    expect(RESEARCH.length).toBeGreaterThanOrEqual(95);
    expect(new Set(RESEARCH.map((r) => r.id)).size).toBe(RESEARCH.length);
  });

  it("doublers reveal at half their owned threshold and buy at the full one", () => {
    const r = RESEARCH.find((x) => x.id === "r-hopper-3")!; // 25 owned
    expect(isResearchVisible(r, 3, { hopper: 12 })).toBe(false);
    expect(isResearchVisible(r, 3, { hopper: 13 })).toBe(true);
    expect(canBuyResearch(r, 3, { hopper: 24 }, [], 1e12)).toBe(false);
    expect(canBuyResearch(r, 3, { hopper: 25 }, [], 1e12)).toBe(true);
    expect(canBuyResearch(r, 3, { hopper: 25 }, [r.id], 1e12)).toBe(false);
  });

  it("aggregates effects", () => {
    const f = researchEffects(["r-hopper-1", "r-hopper-2", "r-global-1", "r-thaw", "r-crank-1"]);
    expect(f.compMult.hopper).toBe(4);
    expect(f.globalPct).toBeCloseTo(0.1);
    expect(f.thawed).toBe(true);
    expect(f.clickFrac).toBeCloseTo(0.01);
    expect(researchEffects([]).compMult.dispenser).toBe(1);
  });

  it("every component has 7 doublers", () => {
    for (const c of COMPONENTS) expect(RESEARCH.filter((r) => r.requires?.component === c.id)).toHaveLength(7);
  });
});

describe("commissions", () => {
  const e: EngineState = { ...defaultEngineState(), stage: 8, solvedCount: 100 };
  const day = new Date("2026-09-25T12:00:00Z");

  it("seeds 3 daily + 1 weekly, the same for the same day", () => {
    const a = refreshCommissions(e, day, 53);
    const b = refreshCommissions(e, new Date("2026-09-25T23:00:00Z"), 53);
    expect(a.daily).toHaveLength(3);
    expect(a.weekly).not.toBeNull();
    expect(a.daily.map((c) => c.tplId)).toEqual(b.daily.map((c) => c.tplId));
  });

  it("does nothing until the day rolls over", () => {
    const a = refreshCommissions(e, day, 53);
    const seeded = { ...e, commissions: a };
    expect(refreshCommissions(seeded, day, 53)).toBe(a);
    const days = new Set<string>();
    for (let d = 1; d <= 20; d++) days.add(refreshCommissions(seeded, new Date(Date.UTC(2026, 9, d)), 53).daily.map((c) => c.tplId).join());
    expect(days.size).toBeGreaterThan(1);
  });

  it("progress is the counter delta since seeding", () => {
    const c = refreshCommissions(e, day, 53);
    const solveTask = [...c.daily, c.weekly!].find((x) => x.counter === "solvedCount");
    if (!solveTask) return;
    const later = { ...e, commissions: c, solvedCount: e.solvedCount + 3 };
    expect(commissionProgress(later, solveTask)).toBe(Math.min(3, solveTask.target));
  });

  it("skips read-more-mods when there aren't enough unread", () => {
    const allRead = { ...e, modsRead: Array.from({ length: 53 }, (_, i) => String(i)) };
    for (let d = 1; d <= 30; d++) {
      const c = refreshCommissions(allRead, new Date(Date.UTC(2026, 9, d)), 53);
      expect(c.daily.some((x) => x.kind === "modsRead")).toBe(false);
    }
  });
});

describe("eureka", () => {
  const env = { winter: false, night: false, fullMoon: false };
  it("comes sooner at night and at full moon", () => {
    const day = nextEurekaDelayMs(cfg, fx, env, () => 0.5);
    const night = nextEurekaDelayMs(cfg, fx, { ...env, night: true }, () => 0.5);
    const moon = nextEurekaDelayMs(cfg, fx, { ...env, night: true, fullMoon: true }, () => 0.5);
    expect(night).toBeLessThan(day);
    expect(moon).toBeLessThan(night);
    expect(day).toBeCloseTo(5.5 * 60_000);
  });

  it("rolls effects by weight, falling back when a part or cipher isn't possible", () => {
    expect(rollEurekaKind(() => 0.1, true, true)).toBe("frenzy");
    expect(rollEurekaKind(() => 0.6, true, true)).toBe("lucky");
    expect(rollEurekaKind(() => 0.85, true, true)).toBe("part");
    expect(rollEurekaKind(() => 0.85, false, true)).toBe("lucky");
    expect(rollEurekaKind(() => 0.95, true, true)).toBe("letter");
    expect(rollEurekaKind(() => 0.95, true, false)).toBe("lucky");
  });
});

describe("engine questions", () => {
  it("asks one question per four solves, never re-asking after an answer", async () => {
    const { nextAsk } = await import("./content/asks");
    expect(nextAsk({}, 8, 1)).toBeNull();
    expect(nextAsk({}, 3, 2)).toBeNull();
    const first = nextAsk({}, 4, 2);
    expect(first).not.toBeNull();
    expect(nextAsk({ [first!.id]: first!.options[0].id }, 4, 2)).toBeNull();
    expect(nextAsk({ [first!.id]: first!.options[0].id }, 8, 2)).not.toBeNull();
  });
});
