"use client";

import { useEffect, useRef, useState } from "react";
import {
  computeCyclePhase,
  isDayNightCycleActive,
  isThemeOverrideAllowed,
  loadCycleStartedAt,
  themeForPhase,
} from "./hub/day-night-cycle";
import { isSkyHeldByEngine, pushInbox, readEnginePublic, setSkyHold } from "./hub/engine/bridge-storage";

// How long the Engine holds the sky still once asked — about one phase.
const SKY_HOLD_MS = 180_000;

const FIGHT_BACK_MS = 1500;
const TOAST_MS = 4500;

// Sun/moon theme switch, ported from an existing (unreleased) design:
// icons cross-fade + scale between states, and a short spin/rock
// animation plays on click. Theme is stored as data-theme on <html>
// (see the inline boot script in app/layout.tsx, which also handles
// the initial value before hydration to avoid a flash of wrong theme).
//
// While the Outpost's day/night cycle is active and the visitor hasn't
// allowed overrides (see the Outpost settings dropdown), a click doesn't
// stick — it visually flips with a blur for a moment, then snaps back to
// whichever theme the cycle currently mandates, along with a toast
// pointing at where to turn that off.
export default function ThemeToggle() {
  const [spinning, setSpinning] = useState(false);
  const [blockedToast, setBlockedToast] = useState(false);
  const [locked, setLocked] = useState(false);
  const [lockPulsing, setLockPulsing] = useState(false);
  const revertTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const toastTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(
    () => () => {
      if (revertTimerRef.current) clearTimeout(revertTimerRef.current);
      if (toastTimerRef.current) clearTimeout(toastTimerRef.current);
    },
    []
  );

  // Keeps the persistent lock badge in sync with whether the cycle is
  // actually blocking right now — polled rather than event-driven since
  // that state can change from other, unrelated parts of the page (the
  // Outpost settings dropdown, or OutpostControlPanel's enable switch on
  // /community), neither of which shares a React tree with this component.
  useEffect(() => {
    function check() {
      setLocked(isDayNightCycleActive() && !isThemeOverrideAllowed() && !isSkyHeldByEngine());
    }
    check();
    const id = window.setInterval(check, 1000);
    return () => window.clearInterval(id);
  }, []);

  function handleClick() {
    const root = document.documentElement;
    const current = root.getAttribute("data-theme") === "dark" ? "dark" : "light";
    const opposite = current === "dark" ? "light" : "dark";
    let cycleBlocking = isDayNightCycleActive() && !isThemeOverrideAllowed() && !isSkyHeldByEngine();

    // At its final stage (with the Celestial Governor researched), the
    // Outpost's Engine can hold the sky still when you ask — the click that
    // would have been fought back just sticks, for a while.
    if (cycleBlocking && readEnginePublic()?.governsSky) {
      setSkyHold(Date.now() + SKY_HOLD_MS);
      pushInbox({ type: "skyHold" });
      cycleBlocking = false;
    }

    if (cycleBlocking) {
      root.setAttribute("data-theme", opposite);
      root.classList.add("daynight-fighting");
      setBlockedToast(true);

      if (revertTimerRef.current) clearTimeout(revertTimerRef.current);
      if (toastTimerRef.current) clearTimeout(toastTimerRef.current);
      revertTimerRef.current = setTimeout(() => {
        const phase = computeCyclePhase(loadCycleStartedAt());
        root.setAttribute("data-theme", themeForPhase(phase.isDay));
        root.classList.remove("daynight-fighting");
      }, FIGHT_BACK_MS);
      toastTimerRef.current = setTimeout(() => setBlockedToast(false), TOAST_MS);

      setLockPulsing(false);
      requestAnimationFrame(() => setLockPulsing(true));

      // Nudges the Outpost settings gear (OutpostSettings.tsx) to bounce,
      // if it happens to be mounted — no-op on any page other than the
      // homepage, where that gear doesn't exist.
      window.dispatchEvent(new Event("btwr-nudge-outpost-settings"));
    } else {
      root.setAttribute("data-theme", opposite);
      localStorage.setItem("theme", opposite);
    }

    setSpinning(false);
    requestAnimationFrame(() => setSpinning(true));

    // Tier-2 Outpost easter egg: this toggle lives outside the Outpost's
    // provider tree, so it just announces the click — never touches
    // localStorage for that system itself (see AchievementsProvider.tsx).
    window.dispatchEvent(new Event("btwr-theme-toggle-click"));
  }

  return (
    <div className="relative inline-flex">
      <button
        type="button"
        onClick={handleClick}
        onAnimationEnd={() => setSpinning(false)}
        className={`theme-toggle text-chrome-dark dark:text-chrome ${spinning ? "spin" : ""}`}
        aria-label={locked ? "Toggle light/dark theme (locked by the day/night cycle)" : "Toggle light/dark theme"}
      >
        <svg
          className="theme-toggle-icon"
          width="22"
          height="22"
          viewBox="0 0 24 24"
          aria-hidden="true"
        >
          <g className="icon-sun">
            <g className="icon-sun-spin">
              <circle cx="12" cy="12" r="5" />
              <g className="sun-rays">
                <line x1="12" y1="1" x2="12" y2="3" />
                <line x1="12" y1="21" x2="12" y2="23" />
                <line x1="4.22" y1="4.22" x2="5.64" y2="5.64" />
                <line x1="18.36" y1="18.36" x2="19.78" y2="19.78" />
                <line x1="1" y1="12" x2="3" y2="12" />
                <line x1="21" y1="12" x2="23" y2="12" />
                <line x1="4.22" y1="19.78" x2="5.64" y2="18.36" />
                <line x1="18.36" y1="5.64" x2="19.78" y2="4.22" />
              </g>
            </g>
          </g>
          <g className="icon-moon-wrap">
            <path
              className="icon-moon"
              d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79Z"
            />
          </g>
        </svg>

        {locked && (
          <span
            className={`theme-toggle-lock ${lockPulsing ? "theme-toggle-lock-pulse" : ""}`}
            onAnimationEnd={() => setLockPulsing(false)}
            aria-hidden="true"
          >
            {"\u{1F512}"}
          </span>
        )}
      </button>

      {blockedToast && (
        <div className="theme-toggle-blocked-toast" role="status">
          The day/night cycle is running the theme right now — you can turn
          that off (or let this button override it) in the Outpost&apos;s
          settings.
        </div>
      )}
    </div>
  );
}
