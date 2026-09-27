import { describe, expect, it } from "vitest";
import { defaultState, normalizeState } from "./hub-storage";
import { buildSaveFile, parseSaveFile, SAVE_FILE_FORMAT } from "./save-file";

function richSave() {
  const s = defaultState();
  s.enabled = true;
  s.unlocked = { "first-visit": "2026-09-01T00:00:00.000Z" };
  s.resources = { ...s.resources, wood: 12, iron: 3 };
  s.experience = { mode: "survival", chosenAt: "2026-09-02T00:00:00.000Z" };
  s.survival = { ...s.survival, health: 7, deaths: 2 };
  s.campfire = { built: true, stage: 3, lastTendedAt: "2026-09-03T00:00:00.000Z" };
  s.engine = { ...s.engine, stage: 5, insight: 1234, modsRead: ["create"] };
  s.tier2 = { ...s.tier2, xp: 500, exportCount: 1 };
  return s;
}

describe("save file round trip", () => {
  it("brings back the whole save plus the cycle anchor and mods read", () => {
    const save = richSave();
    const file = JSON.parse(JSON.stringify(buildSaveFile(save, 1_700_000_000_000, ["create", "sodium"])));
    expect(file.format).toBe(SAVE_FILE_FORMAT);
    const parsed = parseSaveFile(file)!;
    expect(parsed.save).toEqual(normalizeState(JSON.parse(JSON.stringify(save))));
    expect(parsed.save.engine.insight).toBe(1234);
    expect(parsed.save.survival.deaths).toBe(2);
    expect(parsed.save.experience.mode).toBe("survival");
    expect(parsed.cycleStartedAt).toBe(1_700_000_000_000);
    expect(parsed.modsRead).toEqual(["create", "sodium"]);
  });

  it("still reads an older export that was just the raw save", () => {
    const parsed = parseSaveFile(JSON.parse(JSON.stringify(richSave())))!;
    expect(parsed.save.resources.wood).toBe(12);
    expect(parsed.cycleStartedAt).toBeNull();
    expect(parsed.modsRead).toEqual(["create"]);
  });

  it("rejects things that aren't Outpost saves", () => {
    expect(parseSaveFile(null)).toBeNull();
    expect(parseSaveFile("save")).toBeNull();
    expect(parseSaveFile({ version: 2, unlocked: {} })).toBeNull();
    expect(parseSaveFile({ version: 1 })).toBeNull();
    expect(parseSaveFile({ format: SAVE_FILE_FORMAT, save: null })).toBeNull();
  });
});

describe("normalizeState (shared by page load and import)", () => {
  it("applies the same migrations a page load does", () => {
    const raw = {
      version: 1,
      unlocked: { "first-visit": "x", "long-gone-achievement": "y", "custom-mine": "z" },
      tier2: { skin: "frost" },
      upgrades: { skillPoints: 3, cardOrder: { left: ["ponder"], right: [] } },
      modOfDay: { lastSeenDate: "2026-01-01" },
      survival: { health: 0 },
      settings: { toastsEnabled: false },
      priorities: { old: true },
    };
    const s = normalizeState(raw)!;
    expect(Object.keys(s.unlocked).sort()).toEqual(["custom-mine", "first-visit"]);
    expect(s.tier2.skin).toBe("campfire");
    expect(s.upgrades).toEqual({ skillPoints: 3, purchased: [] });
    expect("modOfDay" in s).toBe(false);
    expect(s.survival.health).toBe(1);
    expect(s.settings).toEqual({ ...defaultState().settings, toastsEnabled: false });
    expect(s.activity).toEqual(defaultState().activity);
    expect("priorities" in s).toBe(false);
    expect("priorities" in raw).toBe(true);
  });

  it("refunds upgrades the shop no longer sells, once", () => {
    const raw = {
      version: 1,
      experience: { mode: "casual", chosenAt: "2026-09-01T00:00:00.000Z" },
      upgrades: { skillPoints: 2, purchased: ["hunting", "stars", "day-night-cycle", "wolf"] },
    };
    const s = normalizeState(raw)!;
    expect(s.upgrades.purchased).toEqual(["wolf"]);
    expect(s.upgrades.skillPoints).toBe(2 + 5 + 3 + 8);
    expect(s.camp).toEqual(defaultState().camp);
    // Loading the same stored save again gives the same result, not a second refund.
    expect(normalizeState(raw)!.upgrades.skillPoints).toBe(18);
    // A save that has already been migrated stays as it is.
    expect(normalizeState(JSON.parse(JSON.stringify(s)))!.upgrades.skillPoints).toBe(18);
  });

  it("doesn't refund the Day/Night Cycle survival handed out for free", () => {
    const s = normalizeState({
      version: 1,
      experience: { mode: "survival", chosenAt: "2026-09-01T00:00:00.000Z" },
      upgrades: { skillPoints: 0, purchased: ["day-night-cycle", "mining"] },
    })!;
    expect(s.upgrades.purchased).toEqual([]);
    expect(s.upgrades.skillPoints).toBe(5);
  });
});
