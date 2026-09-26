// The Outpost's Export / Import save file (Tier2Progression.tsx's "Save
// data" box). The main save (btwr:hub:v1) is most of it, but a couple of
// things that shape a run live in their own localStorage keys because pages
// outside the Outpost read them — those ride along here so an imported save
// plays exactly like it did where it was exported:
//
//   - btwr:hub:cycle:v1 — the day/night clock's anchor. Survival's Gloom
//     nights, the moon, and Hardcore Spawn's reset-to-morning all run on it.
//   - btwr:hub:modsread:v1 — mods read on the Mods page (its "read" ticks,
//     and the Engine's modsRead / Stage 7 star fragment drain from it).
//
// Deliberately NOT in the file:
//   - btwr:hub:admin:v1 — /outpost-admin's config, exported on its own there.
//   - Per-browser UI niceties: the open Outpost tab, the Advancements view's
//     pan, the Upgrades fold, the Engine card's "new tab" dots, the theme.
//   - Transient plumbing: the Engine's tab lock and sky hold, the off-page
//     inbox and queued secrets (drained the moment the Outpost is open, which
//     it always is when exporting), and the admin debug overrides.
import { normalizeState, type HubState } from "./hub-storage";
import { OUTPOST_VERSION } from "./outpost-version";

export const SAVE_FILE_FORMAT = "btwr-outpost-save";
export const SAVE_FILE_VERSION = 2;

export type SaveFile = {
  format: typeof SAVE_FILE_FORMAT;
  fileVersion: typeof SAVE_FILE_VERSION;
  exportedAt: string;
  /** Informational only — which Outpost build wrote the file. */
  outpostVersion: string;
  save: HubState;
  /** The day/night cycle's anchor (ms epoch). */
  cycleStartedAt: number;
  /** Mod slugs read on the Mods page. */
  modsRead: string[];
};

export type ParsedSaveFile = {
  save: HubState;
  /** Null for a file from before the cycle was exported: keep this browser's clock. */
  cycleStartedAt: number | null;
  modsRead: string[];
};

export function buildSaveFile(
  save: HubState,
  cycleStartedAt: number,
  modsRead: string[],
  now: Date = new Date()
): SaveFile {
  return {
    format: SAVE_FILE_FORMAT,
    fileVersion: SAVE_FILE_VERSION,
    exportedAt: now.toISOString(),
    outpostVersion: OUTPOST_VERSION,
    save,
    cycleStartedAt,
    modsRead,
  };
}

function strings(v: unknown): string[] {
  return Array.isArray(v) ? v.filter((x): x is string => typeof x === "string") : [];
}

/**
 * Reads a save file: the current bundle, or an older export that was just
 * the raw main save. Everything goes through normalizeState, the same
 * migrations a page load applies. Null when it isn't an Outpost save.
 */
export function parseSaveFile(raw: unknown): ParsedSaveFile | null {
  if (typeof raw !== "object" || raw === null) return null;
  const r = raw as Record<string, unknown>;
  const bundled = r.format === SAVE_FILE_FORMAT;
  const body = bundled ? r.save : raw;
  // The same bar the import has always had: a v1 save with an unlocked map.
  if (typeof body !== "object" || body === null || typeof (body as { unlocked?: unknown }).unlocked !== "object") {
    return null;
  }
  const save = normalizeState(body);
  if (!save) return null;
  const cycle = bundled && typeof r.cycleStartedAt === "number" && Number.isFinite(r.cycleStartedAt) ? r.cycleStartedAt : null;
  // An older file has no Mods-page list of its own; the Engine's copy is the
  // closest thing it carries.
  const modsRead = bundled && Array.isArray(r.modsRead) ? strings(r.modsRead) : save.engine.modsRead;
  return { save, cycleStartedAt: cycle, modsRead };
}
