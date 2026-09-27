import { describe, expect, it } from "vitest";
import {
  ADMIN_FILE_FORMAT,
  defaultAdminConfig,
  exportAdminConfig,
  importAdminConfig,
  type AdminConfig,
} from "./admin-config";
import { defaultState } from "./hub-storage";
import { buildSaveFile } from "./save-file";

function richConfig(): AdminConfig {
  const c = defaultAdminConfig();
  c.moduleStage = { gathering: 4 };
  c.moduleDisabled = { crafting: true };
  c.achievementParent = { "first-visit": "root" };
  c.achievementFrame = { "first-visit": "goal" };
  c.removedAchievements = ["visit-streak-2"];
  c.toolTierEdits = { stone: { name: "Flint Tools", miningMs: null } };
  c.customToolTiers = [
    { id: "mythril", name: "Mythril", icon: "M", treeMiningMs: 500, huntingMs: 800, miningMs: 400, craftCost: { iron: 50 } },
  ];
  c.craftCostEdits = { iron: { iron: 12 } };
  c.resourceEdits = { wood: { name: "Logs" } };
  c.collectAmounts = { wood: 3, food: 2 };
  c.stageTips = { ...c.stageTips, 5: [] };
  c.features = { ...c.features, survivalEnabled: false, survivalStage: 5 };
  c.upgradeEdits = { wolf: { cost: 9, build: { cookedFood: 1 } } };
  c.mechanicOverrides = { campfire: { decayMinutes: 30 } };
  c.engine = { mechanic: { economy: { baseRate: 2 } }, components: { hopper: { baseCost: 7 } } };
  return c;
}

describe("admin settings file", () => {
  it("round-trips every tab's settings", () => {
    const config = richConfig();
    const text = exportAdminConfig(config);
    expect(JSON.parse(text).format).toBe(ADMIN_FILE_FORMAT);
    expect(importAdminConfig(text)).toEqual(config);
  });

  it("still reads an older export that was just the raw config, dropping retired keys", () => {
    const old = { ...richConfig(), tiers: [1, 2], moduleTier: {}, somethingElse: true };
    const imported = importAdminConfig(JSON.stringify(old))!;
    expect(imported).toEqual(richConfig());
    expect("tiers" in imported).toBe(false);
    expect("somethingElse" in imported).toBe(false);
  });

  it("rejects Outpost progress saves and other files", () => {
    const save = { ...defaultState(), enabled: true };
    expect(importAdminConfig(JSON.stringify(save))).toBeNull();
    expect(importAdminConfig(JSON.stringify(buildSaveFile(save, 0, [])))).toBeNull();
    expect(importAdminConfig(JSON.stringify({ version: 1 }))).toBeNull();
    expect(importAdminConfig("[]")).toBeNull();
    expect(importAdminConfig("not json")).toBeNull();
  });

  it("drops values of the wrong type instead of handing them to the mechanics", () => {
    const imported = importAdminConfig(
      JSON.stringify({
        version: 1,
        features: { survivalEnabled: "no", upgradesStage: 4 },
        moduleStage: { gathering: "3" },
        mechanicOverrides: { campfire: { decayMinutes: null, other: 5 } },
        achievementFrame: { "first-visit": "boss" },
        collectAmounts: { wood: -4 },
        customToolTiers: [
          { id: "stone", name: "Clash", treeMiningMs: 1, huntingMs: 1 },
          { id: "ok", name: "Ok", treeMiningMs: 1, huntingMs: 1, miningMs: "x" },
          { id: "ok", name: "Dupe", treeMiningMs: 1, huntingMs: 1 },
        ],
        engine: { components: { hopper: { baseCost: "1", rate: 2 } } },
        upgradeEdits: { stars: { cost: 1 }, farm: { build: { wood: 2, gold: 5, stone: "x" } } },
      })
    )!;
    expect(imported.features.survivalEnabled).toBe(true);
    expect(imported.features.upgradesStage).toBe(4);
    expect(imported.moduleStage).toEqual({});
    expect(imported.mechanicOverrides).toEqual({ campfire: { other: 5 } });
    expect(imported.achievementFrame).toEqual({});
    expect(imported.collectAmounts).toEqual({ wood: 0, food: 1 });
    expect(imported.customToolTiers.map((t) => [t.id, t.miningMs])).toEqual([["ok", null]]);
    expect(imported.engine.components).toEqual({ hopper: { rate: 2 } });
    expect(imported.upgradeEdits).toEqual({ farm: { build: { wood: 2 } } });
  });
});
