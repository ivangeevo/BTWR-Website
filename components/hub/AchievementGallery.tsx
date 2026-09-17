"use client";

import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { ACHIEVEMENTS } from "./achievements-catalog";
import { useAchievements } from "./AchievementsProvider";

// Same measure-then-animate recipe as app/mods/page.tsx and PatchNotes.tsx.
const useIsomorphicLayoutEffect =
  typeof window !== "undefined" ? useLayoutEffect : useEffect;

export default function AchievementGallery() {
  const { unlocked, mounted } = useAchievements();
  const [open, setOpen] = useState(false);
  const [naturalHeight, setNaturalHeight] = useState(0);
  const contentRef = useRef<HTMLDivElement>(null);

  useIsomorphicLayoutEffect(() => {
    const el = contentRef.current;
    if (!el) return;
    const recompute = () => setNaturalHeight(el.scrollHeight);
    recompute();
    window.addEventListener("resize", recompute);
    return () => window.removeEventListener("resize", recompute);
  }, [open]);

  const panelHeight = open ? naturalHeight : 0;

  return (
    <div className="card-glow rounded-xl border border-slate-200 dark:border-slate-700">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        className="flex w-full items-center justify-between gap-3 px-5 py-4 text-left"
      >
        <span className="flex items-center gap-2">
          <h3 className="font-heading text-sm font-bold uppercase tracking-wider text-chrome-dark dark:text-chrome">
            Achievements
          </h3>
          {mounted && (
            <span className="rounded-full bg-chrome-light px-2 py-0.5 text-xs font-semibold text-chrome-dark dark:bg-slate-800 dark:text-chrome">
              {unlocked.size}/{ACHIEVEMENTS.length}
            </span>
          )}
        </span>
        <svg
          className={`h-4 w-4 shrink-0 text-chrome-dark transition-transform duration-300 dark:text-chrome ${
            open ? "rotate-180" : ""
          }`}
          viewBox="0 0 20 20"
          fill="none"
          stroke="currentColor"
          strokeWidth={2}
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <path d="M5 7.5l5 5 5-5" />
        </svg>
      </button>
      <div className="category-panel overflow-hidden" style={{ maxHeight: `${panelHeight}px` }}>
        <div ref={contentRef} className="grid grid-cols-1 gap-2 px-5 pb-5 sm:grid-cols-2">
          {ACHIEVEMENTS.map((achievement) => {
            const isUnlocked = unlocked.has(achievement.id);
            const hideDetails = achievement.secret && !isUnlocked;
            return (
              <div
                key={achievement.id}
                className={`flex items-center gap-2 rounded-lg border p-2 text-xs ${
                  isUnlocked
                    ? "border-chrome-dark/30 bg-chrome-light/60 dark:border-chrome/30 dark:bg-slate-800/60"
                    : "border-slate-200 opacity-60 dark:border-slate-700"
                }`}
              >
                <span className="text-lg leading-none">{hideDetails ? "❓" : achievement.icon}</span>
                <div className="min-w-0">
                  <p className="truncate font-semibold text-slate-700 dark:text-slate-300">
                    {hideDetails ? "???" : achievement.title}
                  </p>
                  <p className="truncate text-slate-500 dark:text-slate-400">
                    {hideDetails ? "A hidden secret." : achievement.description}
                  </p>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
