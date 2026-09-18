"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { useAchievements } from "./AchievementsProvider";
import type { OutpostSettings as OutpostSettingsState } from "./hub-storage";

function ToggleRow({
  label,
  description,
  checked,
  onChange,
}: {
  label: string;
  description: string;
  checked: boolean;
  onChange: (next: boolean) => void;
}) {
  return (
    <div className="flex items-start justify-between gap-3 py-2.5">
      <div className="min-w-0">
        <p className="text-sm font-medium text-white">{label}</p>
        <p className="mt-0.5 text-xs text-white/40">{description}</p>
      </div>
      <button
        type="button"
        role="switch"
        aria-checked={checked}
        aria-label={label}
        onClick={() => onChange(!checked)}
        className={`relative h-5 w-9 shrink-0 rounded-full border transition-colors duration-200 [forced-color-adjust:none] ${
          checked ? "border-[var(--outpost-accent)] bg-[var(--outpost-accent)]" : "border-white/25 bg-white/10"
        }`}
      >
        <span
          className={`absolute left-0.5 top-0.5 h-3.5 w-3.5 rounded-full bg-white shadow transition-transform duration-200 [forced-color-adjust:none] ${
            checked ? "translate-x-4" : "translate-x-0"
          }`}
        />
      </button>
    </div>
  );
}

// Small gear button in the header, opening a dropdown overlay of
// player-facing preferences — separate from OutpostControlPanel
// (enable/reset, on /community) and the /outpost-admin tier/module/
// achievement/tool editor. This one is for ordinary visitors, always
// reachable right from the Outpost itself.
export default function OutpostSettings() {
  const { settings, updateSettings } = useAchievements();
  const [open, setOpen] = useState(false);
  const [bouncing, setBouncing] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    function handlePointerDown(e: PointerEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) setOpen(false);
    }
    function handleKey(e: KeyboardEvent) {
      if (e.key === "Escape") setOpen(false);
    }
    window.addEventListener("pointerdown", handlePointerDown);
    window.addEventListener("keydown", handleKey);
    return () => {
      window.removeEventListener("pointerdown", handlePointerDown);
      window.removeEventListener("keydown", handleKey);
    };
  }, [open]);

  // ThemeToggle (site header, outside the Outpost entirely) dispatches this
  // when a click got fought back by the day/night cycle — nudges a visitor
  // toward where they can fix that, but only does anything when this
  // component happens to be mounted (i.e. they're on the homepage).
  useEffect(() => {
    function handleNudge() {
      setBouncing(false);
      requestAnimationFrame(() => setBouncing(true));
    }
    window.addEventListener("btwr-nudge-outpost-settings", handleNudge);
    return () => window.removeEventListener("btwr-nudge-outpost-settings", handleNudge);
  }, []);

  function set(patch: Partial<OutpostSettingsState>) {
    updateSettings(patch);
  }

  return (
    <div ref={containerRef} className="absolute right-4 top-4 sm:right-5 sm:top-5">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        onAnimationEnd={() => setBouncing(false)}
        aria-expanded={open}
        aria-haspopup="true"
        aria-label="Outpost settings"
        className={`flex h-8 w-8 items-center justify-center rounded-full border border-white/15 bg-white/5 text-sm text-white/60 transition-colors hover:border-[var(--outpost-accent)] hover:text-[var(--outpost-accent)] ${
          bouncing ? "outpost-settings-nudge" : ""
        }`}
      >
        <span aria-hidden="true">{"⚙️"}</span>
      </button>

      {open && (
        <div className="outpost-settings-dropdown" role="menu">
          <p className="text-xs font-bold uppercase tracking-wider text-white/40">Outpost Settings</p>
          <div className="mt-1.5 divide-y divide-white/10">
            <ToggleRow
              label="Achievement notifications"
              description="Show a toast when you unlock something."
              checked={settings.toastsEnabled}
              onChange={(v) => set({ toastsEnabled: v })}
            />
            <ToggleRow
              label="Reduced motion"
              description="Turn off animations inside the Outpost."
              checked={settings.reducedMotion}
              onChange={(v) => set({ reducedMotion: v })}
            />
            <ToggleRow
              label="Day/night cycle"
              description="A sun and moon cross the top of the site, forcing the theme to match."
              checked={settings.dayNightCycleEnabled}
              onChange={(v) => set({ dayNightCycleEnabled: v })}
            />
            <ToggleRow
              label="Let the theme button override it"
              description="Allow manually switching light/dark even while the cycle is running."
              checked={settings.themeOverrideAllowed}
              onChange={(v) => set({ themeOverrideAllowed: v })}
            />
          </div>
          <Link
            href="/outpost-admin"
            className="mt-3 flex items-center justify-center gap-1.5 rounded-md border border-white/15 px-3 py-1.5 text-xs font-semibold text-white/70 transition-colors hover:border-[var(--outpost-accent)] hover:text-[var(--outpost-accent)]"
          >
            <span aria-hidden="true">{"\u{1F6E0}\u{FE0F}"}</span>
            Open Admin Panel
          </Link>
        </div>
      )}
    </div>
  );
}
