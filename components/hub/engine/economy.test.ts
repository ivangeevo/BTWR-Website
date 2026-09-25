import { describe, expect, it } from "vitest";
import { COMPONENTS_BY_ID } from "./catalog/components";
import { researchEffects } from "./catalog/research";
import { DEFAULT_ENGINE_CONFIG as cfg, resolveEngineConfig } from "./config";
import {
  bulkCost,
  componentCost,
  computeIps,
  formatInsight,
  maxAffordable,
  neglectMult,
  offlineAccrual,
  onlineGain,
  settle,
} from "./economy";
import { defaultEngineState, emptySummary } from "./state";
import type { EngineState } from "./types";

const T0 = Date.parse("2026-09-01T00:00:00Z");
const iso = (t: number) => new Date(t).toISOString();
const fx = researchEffects([]);

function engine(over: Partial<EngineState> = {}): EngineState {
  return { ...defaultEngineState(iso(T0)), ...over };
}

function withPower(e: EngineState, idle: number, cranked = idle, boosted = cranked): EngineState {
  return {
    ...e,
    grid: { ...e.grid, clutch: true },
    solved: {
      idle: { ...emptySummary(), corePU: idle },
      cranked: { ...emptySummary(), corePU: cranked },
      boosted: { ...emptySummary(), corePU: boosted },
      rev: 0,
    },
  };
}

describe("costs", () => {
  const hopper = COMPONENTS_BY_ID.hopper;
  it("grows by 1.15 per owned", () => {
    expect(componentCost(hopper, 0, 1, cfg)).toBe(15);
    expect(componentCost(hopper, 1, 1, cfg)).toBe(Math.ceil(15 * 1.15));
  });
  it("bulk equals the iterated sum and maxAffordable agrees", () => {
    let sum = 0;
    for (let i = 0; i < 10; i++) sum += componentCost(hopper, 3 + i, 1, cfg);
    expect(bulkCost(hopper, 3, 10, 1, cfg)).toBe(sum);
    expect(maxAffordable(hopper, 3, sum, 1, cfg)).toBe(10);
    expect(maxAffordable(hopper, 3, sum - 1, 1, cfg)).toBe(9);
  });
  it("later Marks rebuild cheaper, floored at 40% off", () => {
    expect(componentCost(hopper, 0, 3, cfg)).toBe(Math.ceil(15 * 0.9));
    expect(componentCost(hopper, 0, 50, cfg)).toBe(Math.ceil(15 * 0.6));
  });
});

describe("computeIps", () => {
  it("is zero with no components", () => {
    expect(computeIps(engine({ stage: 4 }), cfg, fx, T0).ips).toBe(0);
  });

  it("keeps only the power floor with no spare power", () => {
    const e = engine({ stage: 4, components: { hopper: 10 } });
    expect(computeIps(e, cfg, fx, T0).ips).toBeCloseTo(10 * 0.1 * 0.2);
  });

  it("scales with power up to the per-type draw", () => {
    const e = withPower(engine({ stage: 5, components: { hopper: 10, dispenser: 2 } }), 1);
    // draw: hopper 1 + dispenser 1 = 2; core 1 -> ratio .5 -> factor .6
    const r = computeIps(e, cfg, fx, T0);
    expect(r.requiredPU).toBe(2);
    expect(r.ips).toBeCloseTo((10 * 0.1 + 2 * 1) * 0.6);
    const full = withPower(e, 5);
    expect(computeIps(full, cfg, fx, T0).ips).toBeCloseTo(3);
  });

  it("stage 3 powers a virtual core only while cranking", () => {
    const e = engine({ stage: 3, blueprints: ["handCrank"], components: { hopper: 10 } });
    expect(computeIps(e, cfg, fx, T0).ips).toBeCloseTo(0.2);
    const cranking = { ...e, crankActiveUntil: iso(T0 + 5000) };
    expect(computeIps(cranking, cfg, fx, T0).ips).toBeCloseTo(1);
  });

  it("applies research, Mark, frenzy multipliers", () => {
    const e = withPower(engine({ stage: 5, components: { hopper: 10 }, mark: 3 }), 5);
    const r = computeIps(e, cfg, researchEffects(["r-hopper-1", "r-global-1"]), T0);
    expect(r.ips).toBeCloseTo(10 * 0.1 * 2 * 1.1 * 2);
    const frenzied = { ...e, frenzy: { until: iso(T0 + 1000), mult: 7 } };
    expect(computeIps(frenzied, cfg, fx, T0).ips).toBeCloseTo(10 * 0.1 * 2 * 7);
  });
});

describe("neglect", () => {
  it("steps down by specialization, never below the Homesteader floor", () => {
    const e = engine({ lastInteractAt: iso(T0) });
    expect(neglectMult(e, cfg, T0 + 23 * 3.6e6)).toBe(1);
    expect(neglectMult(e, cfg, T0 + 25 * 3.6e6)).toBe(0.9);
    expect(neglectMult(e, cfg, T0 + 80 * 3.6e6)).toBe(0.75);
    const hc = { ...e, specialization: "hardcore" as const };
    expect(neglectMult(hc, cfg, T0 + 13 * 3.6e6)).toBe(0.8);
    expect(neglectMult(hc, cfg, T0 + 50 * 3.6e6)).toBe(0.6);
    const hs = { ...e, specialization: "homesteader" as const };
    expect(neglectMult(hs, cfg, T0 + 100 * 3.6e6)).toBe(0.9);
  });
});

describe("settle", () => {
  it("matches a brute-force 1-second integration across crank, frenzy and neglect breakpoints", () => {
    const e = withPower(
      engine({
        stage: 5,
        components: { hopper: 20, dispenser: 5 },
        crankActiveUntil: iso(T0 + 37_000),
        frenzy: { until: iso(T0 + 61_000), mult: 7 },
        lastInteractAt: iso(T0 - 24 * 3.6e6 + 90_000),
      }),
      1,
      2
    );
    const to = T0 + 180_000;
    let brute = 0;
    for (let t = T0; t < to; t += 1000) brute += computeIps(e, cfg, fx, t).ips;
    expect(onlineGain(e, cfg, fx, T0, to)).toBeCloseTo(brute, 6);
    const s = settle(e, cfg, fx, to);
    expect(s.insight).toBeCloseTo(brute, 6);
    expect(s.lifetimeInsight).toBeCloseTo(brute, 6);
    expect(s.frenzy).toBeNull();
    expect(s.settledAt).toBe(iso(to));
  });

  it("is a no-op backwards in time", () => {
    const e = engine({ settledAt: iso(T0 + 1000) });
    expect(settle(e, cfg, fx, T0)).toBe(e);
  });
});

describe("offlineAccrual", () => {
  it("earns at half rate, capped by the Ledger Drum", () => {
    const e = withPower(engine({ stage: 5, components: { hopper: 10 } }), 5);
    const ips = computeIps(e, cfg, fx, T0).ips;
    const r = offlineAccrual(e, cfg, fx, T0, T0 + 30 * 60_000);
    expect(r.capped).toBe(false);
    expect(r.gained).toBeCloseTo(ips * 0.5 * 1800);
    const long = offlineAccrual({ ...e, lastInteractAt: iso(T0 + 10 * 3.6e6) }, cfg, fx, T0, T0 + 10 * 3.6e6);
    expect(long.capped).toBe(true);
    expect(long.gained).toBeCloseTo(ips * 0.5 * 3600);
  });

  it("ignores the crank and frenzies", () => {
    const e = withPower(engine({ stage: 5, components: { hopper: 10 }, crankActiveUntil: iso(T0 + 1e9) }), 0, 5);
    const r = offlineAccrual(e, cfg, fx, T0, T0 + 600_000);
    expect(r.offIps).toBeCloseTo(10 * 0.1 * 0.2 * 0.5);
  });
});

describe("config overrides", () => {
  it("resolves admin overrides and ignores junk", () => {
    const c = resolveEngineConfig({ mechanic: { power: { maxChain: 5, bogus: 3 } }, components: { hopper: { rate: 1 } } });
    expect(c.power.maxChain).toBe(5);
    expect((c.power as unknown as Record<string, unknown>).bogus).toBeUndefined();
    expect(c.components.find((x) => x.id === "hopper")!.rate).toBe(1);
  });
});

describe("formatInsight", () => {
  it("abbreviates", () => {
    expect(formatInsight(3.47)).toBe("3.4");
    expect(formatInsight(999)).toBe("999");
    expect(formatInsight(1234)).toBe("1.23K");
    expect(formatInsight(56_700_000)).toBe("56.7M");
    expect(formatInsight(5.6e9)).toBe("5.60B");
  });
});
