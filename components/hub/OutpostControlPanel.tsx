"use client";

import { useEffect, useRef, useState } from "react";
import { ACHIEVEMENTS, TIER1_IDS } from "./achievements-catalog";
import { defaultState, loadState, saveState, type HubState } from "./hub-storage";
import { defaultAdminConfig, loadAdminConfig, tierThreshold, type AdminConfig } from "./admin-config";
import OutpostCorners from "./OutpostCorners";
import { clearEngineSideKeys } from "./engine/bridge-storage";

const RESET_CONFIRM_WINDOW_MS = 4000;

// Standalone settings console for "The Outpost" homepage feature — reads
// and writes the same localStorage blob HubSection uses, but stays outside
// AchievementsProvider entirely: this page shouldn't unlock achievements or
// show toasts, it just flips the switch that lets the homepage render it.
export default function OutpostControlPanel() {
  const [state, setState] = useState<HubState>(defaultState());
  const [adminConfig, setAdminConfig] = useState<AdminConfig>(defaultAdminConfig());
  const [mounted, setMounted] = useState(false);
  const [confirmingReset, setConfirmingReset] = useState(false);
  const confirmTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    setState(loadState());
    setAdminConfig(loadAdminConfig());
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
    // The Engine's cross-page side keys (mods read, inbox, sky hold) go too.
    clearEngineSideKeys();
    setState(next);
  }

  const isEnabled = mounted && state.enabled;
  // Tier 2's existence is itself a secret — this pill must never hint at a
  // bigger pool of achievements beyond 12 before it's actually unlocked.
  // Mirrors AchievementsProvider's tier2Unlocked: reaching the ladder's
  // tier2 threshold, not any one specific achievement.
  const tier2Unlocked = Object.keys(state.unlocked).length >= tierThreshold(adminConfig, "tier2");
  const visibleTotal = tier2Unlocked ? ACHIEVEMENTS.length : TIER1_IDS.length;
  const visibleUnlockedCount = Object.keys(state.unlocked).filter(
    (id) => tier2Unlocked || TIER1_IDS.includes(id as (typeof TIER1_IDS)[number])
  ).length;

  const enableSwitch = (
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
  );

  // Sits in the same grid as the plain Discord/GitHub cards, spanning both
  // columns so it reads as its own row below them. Same frame/layout
  // whether enabled or not — only the options section below the switch
  // slides open once enabled, so the switch and status text never move.
  return (
    <div className="outpost-zone overflow-hidden rounded-xl sm:col-span-2">
      <div className="outpost-frame relative">
        <OutpostCorners />
        <div className="px-5 py-4">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <span className="outpost-status-tag">
                <span
                  className={`outpost-status-dot ${isEnabled ? "outpost-status-dot-online" : "outpost-status-dot-offline"}`}
                  aria-hidden="true"
                />
                {mounted ? (isEnabled ? "Online" : "Offline") : ""}
              </span>
              <p className="mt-2 max-w-xs text-sm text-slate-400">
                A small hangout section that unlocks on the homepage — mod
                spotlight, quiz, patch notes, and achievements. Saved locally
                in your browser only.
              </p>
            </div>
            <div className="flex shrink-0 flex-col items-end gap-1.5">
              <span className="text-xs font-semibold text-white">The Outpost</span>
              {enableSwitch}
            </div>
          </div>

          <div className={`outpost-panel-collapse ${isEnabled ? "open" : ""}`}>
            <div>
              <div className="mt-4 flex items-center justify-between gap-4 border-t border-white/10 pt-4">
                <p className="text-sm font-semibold text-white">Achievements</p>
                <span className="rounded-full bg-white/10 px-2 py-0.5 text-xs font-semibold text-[var(--outpost-accent)]">
                  {visibleUnlockedCount}/{visibleTotal}
                </span>
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
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
