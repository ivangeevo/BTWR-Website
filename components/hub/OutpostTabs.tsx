"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useAchievements } from "./AchievementsProvider";

// The Outpost's top-level tabs, in the middle of its top bar: Basecamp (the
// card grid), Progress (level/XP, skins, logbook) and Achievements (the full
// gallery). Progress and Achievements appear once the Engine stage set for
// them is reached (module-registry's "your-progress" / "accomplishments",
// Stage 1 by default), and the bar stays hidden while Basecamp is the only
// tab. A tab carries an accent dot until it's first opened. The picked tab is remembered per
// browser (a convenience only, so storage failures just fall back).

export type OutpostTabId = "basecamp" | "progress" | "achievements";

const TABS: { id: OutpostTabId; label: string }[] = [
  { id: "basecamp", label: "Basecamp" },
  { id: "progress", label: "Progress" },
  { id: "achievements", label: "Achievements" },
];

const TAB_KEY = "btwr:hub:tab:v1";

type Stored = { tab: OutpostTabId; opened: OutpostTabId[] };

function readStored(): Stored {
  try {
    const raw = window.localStorage.getItem(TAB_KEY);
    const v = raw ? (JSON.parse(raw) as Partial<Stored>) : {};
    const tab = TABS.some((t) => t.id === v.tab) ? (v.tab as OutpostTabId) : "basecamp";
    const opened = Array.isArray(v.opened) ? v.opened.filter((id) => TABS.some((t) => t.id === id)) : [];
    return { tab, opened };
  } catch {
    return { tab: "basecamp", opened: [] };
  }
}

function writeStored(v: Stored) {
  try {
    window.localStorage.setItem(TAB_KEY, JSON.stringify(v));
  } catch {
    // Remembering the tab is a nicety.
  }
}

export function tabPanelId(id: OutpostTabId) {
  return `outpost-tab-panel-${id}`;
}

function tabButtonId(id: OutpostTabId) {
  return `outpost-tab-${id}`;
}

/** Which tabs exist right now, plus the selected one (falls back to Basecamp). */
export function useOutpostTabs() {
  const { mounted, isModuleRevealed } = useAchievements();
  const available = TABS.filter(
    (t) =>
      t.id === "basecamp" ||
      (mounted && isModuleRevealed(t.id === "progress" ? "your-progress" : "accomplishments"))
  ).map((t) => t.id);
  const [stored, setStored] = useState<Stored>({ tab: "basecamp", opened: [] });
  const loaded = useRef(false);

  useEffect(() => {
    if (!mounted || loaded.current) return;
    loaded.current = true;
    setStored(readStored());
  }, [mounted]);

  const select = useCallback((id: OutpostTabId) => {
    setStored((prev) => {
      const next = { tab: id, opened: prev.opened.includes(id) ? prev.opened : [...prev.opened, id] };
      writeStored(next);
      return next;
    });
  }, []);

  const tab: OutpostTabId = available.includes(stored.tab) ? stored.tab : "basecamp";
  const isNew = (id: OutpostTabId) => id !== "basecamp" && !stored.opened.includes(id) && tab !== id;
  return { tab, available, select, isNew };
}

export default function OutpostTabs({
  tab,
  available,
  select,
  isNew,
}: ReturnType<typeof useOutpostTabs>) {
  const refs = useRef(new Map<OutpostTabId, HTMLButtonElement>());
  if (available.length < 2) return null;
  const shown = TABS.filter((t) => available.includes(t.id));

  function onKeyDown(e: React.KeyboardEvent, index: number) {
    let next = -1;
    if (e.key === "ArrowRight") next = (index + 1) % shown.length;
    else if (e.key === "ArrowLeft") next = (index - 1 + shown.length) % shown.length;
    else if (e.key === "Home") next = 0;
    else if (e.key === "End") next = shown.length - 1;
    if (next < 0) return;
    e.preventDefault();
    const id = shown[next].id;
    select(id);
    refs.current.get(id)?.focus();
  }

  return (
    <div className="flex justify-center">
      <div role="tablist" aria-label="The Outpost" className="flex rounded-full bg-white/10 p-1 text-sm font-semibold">
        {shown.map((t, i) => {
          const active = tab === t.id;
          return (
            <button
              key={t.id}
              ref={(el) => {
                if (el) refs.current.set(t.id, el);
                else refs.current.delete(t.id);
              }}
              id={tabButtonId(t.id)}
              type="button"
              role="tab"
              aria-selected={active}
              aria-controls={tabPanelId(t.id)}
              tabIndex={active ? 0 : -1}
              onClick={() => select(t.id)}
              onKeyDown={(e) => onKeyDown(e, i)}
              className={`relative rounded-full px-4 py-1.5 transition-colors ${
                active ? "bg-white/15 text-[var(--outpost-accent)] shadow" : "text-slate-400 hover:text-white"
              }`}
            >
              {t.label}
              {isNew(t.id) && (
                <span
                  className="absolute right-1.5 top-1 h-1.5 w-1.5 rounded-full bg-[var(--outpost-accent)]"
                  aria-label="new"
                />
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
}

/** Wraps one tab's content with its tabpanel semantics. */
export function OutpostTabPanel({
  id,
  active,
  labelled,
  className,
  children,
}: {
  id: OutpostTabId;
  active: boolean;
  /** False while the tab bar is hidden (Basecamp alone) — no tab to point at. */
  labelled: boolean;
  /** Sizing only — never a display class, which would beat the hidden attribute. */
  className?: string;
  children: React.ReactNode;
}) {
  if (!labelled)
    return (
      <div hidden={!active} className={className}>
        {children}
      </div>
    );
  return (
    <div role="tabpanel" id={tabPanelId(id)} aria-labelledby={tabButtonId(id)} hidden={!active} className={className}>
      {children}
    </div>
  );
}
