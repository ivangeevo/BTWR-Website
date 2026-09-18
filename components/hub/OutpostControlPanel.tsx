"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { ACHIEVEMENTS, TIER1_IDS } from "./achievements-catalog";
import { defaultState, loadState, saveState, type HubState } from "./hub-storage";
import OutpostCorners from "./OutpostCorners";

const RESET_CONFIRM_WINDOW_MS = 4000;

// Standalone settings console for "The Outpost" homepage feature — reads
// and writes the same localStorage blob HubSection uses, but stays outside
// AchievementsProvider entirely: this page shouldn't unlock achievements or
// show toasts, it just flips the switch that lets the homepage render it.
export default function OutpostControlPanel() {
  const [state, setState] = useState<HubState>(defaultState());
  const [mounted, setMounted] = useState(false);
  const [confirmingReset, setConfirmingReset] = useState(false);
  const confirmTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    setState(loadState());
    setMounted(true);
    return () => {
      if (confirmTimerRef.current) clearTimeout(confirmTimerRef.current);
    };
  }, []);

  function toggleEnabled() {
    setState((prev) => {
      const next = { ...prev, enabled: !prev.enabled };
      saveState(next);
      return next;
    });
  }

  function handleResetClick() {
    if (!confirmingReset) {
      setConfirmingReset(true);
      confirmTimerRef.current = setTimeout(() => setConfirmingReset(false), RESET_CONFIRM_WINDOW_MS);
      return;
    }
    if (confirmTimerRef.current) clearTimeout(confirmTimerRef.current);
    setConfirmingReset(false);
    // Resetting progress data is a separate action from the enable switch —
    // it shouldn't silently turn the homepage section off too.
    const next = defaultState();
    next.enabled = state.enabled;
    saveState(next);
    setState(next);
  }

  const isEnabled = mounted && state.enabled;
  // Tier 2's existence is itself a secret — this pill must never hint at a
  // bigger pool of achievements beyond 12 before it's actually unlocked.
  const tier2Unlocked = Boolean(state.unlocked["community-edition"]);
  const visibleTotal = tier2Unlocked ? ACHIEVEMENTS.length : TIER1_IDS.length;
  const visibleUnlockedCount = Object.keys(state.unlocked).filter(
    (id) => tier2Unlocked || TIER1_IDS.includes(id as (typeof TIER1_IDS)[number])
  ).length;

  return (
    <div className="outpost-zone mt-6 overflow-hidden rounded-xl">
      <div className="outpost-frame relative">
        <OutpostCorners />
        <div className="px-5 py-4">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <span className="outpost-status-tag">
              <span className="outpost-status-dot" aria-hidden="true" />
              Outpost {isEnabled ? "Online" : "Offline"}
            </span>
            {isEnabled && (
              <span className="text-xs font-semibold uppercase tracking-wider text-white/50">
                {visibleUnlockedCount}/{visibleTotal} achievements
              </span>
            )}
          </div>

          <div className="mt-4 flex items-center justify-between gap-4 border-t border-white/10 pt-4 pr-11">
            <div className="min-w-0">
              <p className="text-sm font-semibold text-white">Enable the Outpost</p>
              <p className="mt-0.5 text-xs text-slate-400">
                Adds a small hangout section to the homepage — mod spotlight,
                quiz, patch notes, and achievements. Saved locally in your
                browser only.
              </p>
            </div>
            <button
              type="button"
              role="switch"
              aria-checked={isEnabled}
              aria-label="Enable the Outpost"
              onClick={toggleEnabled}
              className={`relative h-6 w-11 shrink-0 rounded-full border transition-colors duration-200 [forced-color-adjust:none] ${
                isEnabled
                  ? "border-[var(--outpost-accent)] bg-[var(--outpost-accent)] shadow-[0_0_10px_1px_rgba(217,138,74,0.55)]"
                  : "border-white/25 bg-white/10"
              }`}
            >
              <span
                className={`absolute left-0.5 top-px h-5 w-5 rounded-full shadow transition-transform duration-200 [forced-color-adjust:none] ${
                  isEnabled ? "translate-x-5 bg-white" : "translate-x-0 bg-white/80"
                }`}
              />
            </button>
          </div>

          <div className="mt-4 flex items-center justify-between gap-4 border-t border-white/10 pt-4">
            <div className="min-w-0">
              <p className="text-sm font-semibold text-white">Reset local Outpost data</p>
              <p className="mt-0.5 text-xs text-slate-400">
                Clears achievements, quiz stats, and visit streaks stored in
                this browser. Doesn&apos;t change the switch above.
              </p>
            </div>
            <button
              type="button"
              onClick={handleResetClick}
              className={`shrink-0 rounded-lg border px-3 py-1.5 text-xs font-semibold transition-colors ${
                confirmingReset
                  ? "border-red-500 bg-red-950/60 text-red-300"
                  : "border-white/15 text-slate-300 hover:border-[var(--outpost-accent)] hover:text-[var(--outpost-accent)]"
              }`}
            >
              {confirmingReset ? "Confirm reset?" : "Reset data"}
            </button>
          </div>

          <div className="mt-4 flex items-center justify-between gap-4 border-t border-white/10 pt-4">
            <div className="min-w-0">
              <p className="text-sm font-semibold text-white">Customize tiers</p>
              <p className="mt-0.5 text-xs text-slate-400">
                Advanced: pick which tier each card, achievement, and tool belongs to, or add your own tiers.
              </p>
            </div>
            <Link
              href="/outpost-admin"
              className="shrink-0 rounded-lg border border-white/15 px-3 py-1.5 text-xs font-semibold text-slate-300 transition-colors hover:border-[var(--outpost-accent)] hover:text-[var(--outpost-accent)]"
            >
              Open Admin Panel
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
