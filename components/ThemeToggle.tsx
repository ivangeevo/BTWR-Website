"use client";

import { useState } from "react";

// Sun/moon theme switch, ported from an existing (unreleased) design:
// icons cross-fade + scale between states, and a short spin/rock
// animation plays on click. Theme is stored as data-theme on <html>
// (see the inline boot script in app/layout.tsx, which also handles
// the initial value before hydration to avoid a flash of wrong theme).
export default function ThemeToggle() {
  const [spinning, setSpinning] = useState(false);

  function handleClick() {
    const root = document.documentElement;
    const next = root.getAttribute("data-theme") === "dark" ? "light" : "dark";
    root.setAttribute("data-theme", next);
    localStorage.setItem("theme", next);

    setSpinning(false);
    requestAnimationFrame(() => setSpinning(true));
  }

  return (
    <button
      type="button"
      onClick={handleClick}
      onAnimationEnd={() => setSpinning(false)}
      className={`theme-toggle text-chrome-dark dark:text-chrome ${spinning ? "spin" : ""}`}
      aria-label="Toggle light/dark theme"
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
    </button>
  );
}
