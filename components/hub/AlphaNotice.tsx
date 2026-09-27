"use client";

import { useEffect, useRef } from "react";
import { useAchievements } from "./AchievementsProvider";
import { OUTPOST_VERSION, outpostBugReportHref } from "./outpost-version";

const POINTS = [
  "Things can break: a card that won't respond, progress that doesn't add up, a screen that looks wrong.",
  "Balance is still being tuned. Some things may be too slow, too fast, too cheap or too costly.",
  "Features will change or be replaced between versions. Your save is kept wherever it can be.",
];

// The first thing a new save sees: the Outpost is an early alpha, and where
// to report what goes wrong. Once per save (hub-storage.ts's
// alphaNoticeSeen), so resetting the Outpost shows it again. Covers the
// whole Outpost like ExperiencePicker.tsx, which it never overlaps — that
// only opens at The Stump, well after a new save's first look.
export default function AlphaNotice() {
  const { needsAlphaNotice, dismissAlphaNotice } = useAchievements();
  const headingRef = useRef<HTMLHeadingElement>(null);

  useEffect(() => {
    if (needsAlphaNotice) headingRef.current?.focus();
  }, [needsAlphaNotice]);

  if (!needsAlphaNotice) return null;

  return (
    <div
      // z-[70]: above everything else inside the Outpost frame, as with
      // ExperiencePicker.
      className="outpost-experience absolute inset-0 z-[70] flex items-center justify-center overflow-y-auto p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="outpost-alpha-title"
      data-no-drag
    >
      <div className="outpost-materialize outpost-panel w-full max-w-lg rounded-xl p-5">
        <p className="text-center text-[0.65rem] font-bold uppercase tracking-[0.25em] text-[var(--outpost-accent)]">
          Alpha v{OUTPOST_VERSION}
        </p>
        <h2
          id="outpost-alpha-title"
          ref={headingRef}
          tabIndex={-1}
          className="mt-1 text-center font-heading text-2xl font-bold text-white outline-none"
        >
          The Outpost is early in development
        </h2>
        <p className="mt-3 text-sm text-slate-300">
          Thanks for trying it out! This is an early test build, so expect some rough edges:
        </p>
        <ul className="mt-2.5 space-y-1.5 text-xs leading-snug text-slate-400">
          {POINTS.map((p) => (
            <li key={p} className="flex gap-1.5">
              <span className="text-[var(--outpost-accent)]" aria-hidden="true">
                •
              </span>
              <span>{p}</span>
            </li>
          ))}
        </ul>
        {outpostBugReportHref && (
          <p className="mt-4 text-sm text-slate-300">
            If something goes wrong or feels off, please{" "}
            <a
              href={outpostBugReportHref}
              target="_blank"
              rel="noopener noreferrer"
              className="font-semibold text-[var(--outpost-accent)] underline-offset-2 hover:underline"
            >
              report it on GitHub
            </a>
            . You can always find the <span className="font-semibold text-white">Report a bug</span> link in the
            bottom-right corner of the Outpost, next to the version number.
          </p>
        )}
        <div className="mt-5 flex justify-center">
          <button
            type="button"
            onClick={dismissAlphaNotice}
            className="btn-glow btn-gradient rounded-lg px-6 py-2 text-sm font-semibold text-white"
          >
            Got it
          </button>
        </div>
      </div>
    </div>
  );
}
