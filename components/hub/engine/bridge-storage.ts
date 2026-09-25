// Cross-page plumbing for the Engine. Only AchievementsProvider ever writes
// the main save (btwr:hub:v1) — pages outside the Outpost (the Mods page,
// the header companion, the sky, the theme toggle) write small side keys
// and fire window events instead; the provider drains them. Every helper is
// SSR-safe (static export) and swallows storage errors.
import { isPhoneDevice } from "../device";
import type { EnginePublic } from "./types";

export const MODS_READ_KEY = "btwr:hub:modsread:v1";
export const INBOX_KEY = "btwr:hub:engine-inbox:v1";
export const HOLD_KEY = "btwr:hub:engine-hold:v1";
export const DEBUG_KEY = "btwr:hub:debug:v1";
const HUB_KEY = "btwr:hub:v1";

export const EVT_MODS_READ = "btwr-engine-mods-read";
export const EVT_INBOX = "btwr-engine-inbox";
const INBOX_MAX = 50;

function read<T>(key: string, fallback: T): T {
  if (typeof window === "undefined") return fallback;
  try {
    const raw = window.localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : fallback;
  } catch {
    return fallback;
  }
}

function write(key: string, value: unknown) {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(key, JSON.stringify(value));
  } catch {
    // Same tolerance as hub-storage's saveState.
  }
}

function dispatch(name: string) {
  if (typeof window === "undefined") return;
  window.dispatchEvent(new Event(name));
}

// --- Mods read on the Mods page ---

export function readModsRead(): string[] {
  const v = read<{ slugs?: unknown }>(MODS_READ_KEY, {});
  return Array.isArray(v.slugs) ? (v.slugs.filter((s) => typeof s === "string") as string[]) : [];
}

export function markModRead(slug: string): boolean {
  const slugs = readModsRead();
  if (slugs.includes(slug)) return false;
  write(MODS_READ_KEY, { slugs: [...slugs, slug] });
  dispatch(EVT_MODS_READ);
  return true;
}

// --- Inbox: off-Outpost events the provider drains idempotently by id ---

export type InboxEvent = {
  id: string;
  type: "eureka" | "keyFragment" | "skyHold" | "companionHold";
  at: string;
  data?: Record<string, string | number | boolean>;
};

export function readInbox(): InboxEvent[] {
  const v = read<{ events?: unknown }>(INBOX_KEY, {});
  return Array.isArray(v.events) ? (v.events as InboxEvent[]) : [];
}

export function pushInbox(ev: Omit<InboxEvent, "id" | "at">): void {
  const events = readInbox();
  const full: InboxEvent = {
    ...ev,
    id: `${ev.type}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    at: new Date().toISOString(),
  };
  write(INBOX_KEY, { events: [...events, full].slice(-INBOX_MAX) });
  dispatch(EVT_INBOX);
}

export function removeInbox(ids: string[]): void {
  if (ids.length === 0) return;
  const events = readInbox().filter((e) => !ids.includes(e.id));
  write(INBOX_KEY, { events });
}

// --- Sky hold (Stage 8, Celestial Governor) ---

export function isSkyHeldByEngine(now: number = Date.now()): boolean {
  const v = read<{ until?: unknown }>(HOLD_KEY, {});
  return typeof v.until === "number" && v.until > now;
}

export function setSkyHold(untilMs: number): void {
  write(HOLD_KEY, { until: untilMs });
}

// --- Debug overrides (written by /outpost-admin's Engine Debug tab) ---

export type EngineDebug = { forceNight?: boolean; forceFullMoon?: boolean; eurekaNow?: boolean };

export function readEngineDebug(): EngineDebug {
  return read<EngineDebug>(DEBUG_KEY, {});
}

export function writeEngineDebug(d: EngineDebug): void {
  write(DEBUG_KEY, d);
}

// --- One running Engine per browser ---
// Two homepage tabs would each accrue and save their own copy of the
// Engine. Whichever tab holds a fresh heartbeat here runs it; any other
// open Outpost goes passive until the visitor chooses to run it there.
export const LOCK_KEY = "btwr:hub:engine-lock:v1";
export const LOCK_STALE_MS = 20_000;

// Per-tab id that survives a reload of the same tab (sessionStorage), so a
// tab that just took over the Engine still recognizes its own lock.
export function engineTabId(): string {
  const fresh = `t${Date.now().toString(36)}${Math.random().toString(36).slice(2, 8)}`;
  if (typeof window === "undefined") return fresh;
  try {
    const existing = window.sessionStorage.getItem("btwr:hub:engine-tab");
    if (existing) return existing;
    window.sessionStorage.setItem("btwr:hub:engine-tab", fresh);
  } catch {
    // ignore
  }
  return fresh;
}

export function readEngineLock(): { tabId: string; at: number } | null {
  const v = read<{ tabId?: unknown; at?: unknown }>(LOCK_KEY, {});
  return typeof v.tabId === "string" && typeof v.at === "number" ? { tabId: v.tabId, at: v.at } : null;
}

export function writeEngineLock(tabId: string): void {
  write(LOCK_KEY, { tabId, at: Date.now() });
}

export function lockHeldElsewhere(tabId: string, now: number = Date.now()): boolean {
  const lock = readEngineLock();
  return !!lock && lock.tabId !== tabId && now - lock.at < LOCK_STALE_MS;
}

// --- The Engine's public snapshot, for pages outside the provider ---

export function readEnginePublic(): EnginePublic | null {
  const v = read<{ enabled?: boolean; engine?: { public?: EnginePublic } }>(HUB_KEY, {});
  if (!v.enabled || isPhoneDevice() || !v.engine?.public) return null;
  return v.engine.public;
}

export function clearEngineSideKeys(): void {
  if (typeof window === "undefined") return;
  for (const key of [MODS_READ_KEY, INBOX_KEY, HOLD_KEY, DEBUG_KEY, LOCK_KEY]) {
    try {
      window.localStorage.removeItem(key);
    } catch {
      // ignore
    }
  }
}
