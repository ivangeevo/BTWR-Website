"use client";

import { PRIORITY_STEPS } from "./priorities-content";
import { useAchievements } from "./AchievementsProvider";

// The Beginner's Guide's own "Priorities for the next few days" list — a
// checklist, not a tracker: nothing else in the Outpost reads a step back
// (no crafting/resource tie-in), it's just a place to tick off the guide's
// early Iron Age progression as you actually do it. Steps can be unchecked
// again freely; the two achievements tied to this list only ever add, never
// revoke, once earned (see AchievementsProvider.tsx).
export default function Priorities() {
  const { priorities, togglePriorityStep } = useAchievements();
  const checkedCount = priorities.checked.length;

  return (
    <div className="outpost-panel outpost-card-md outpost-card-pinned-header rounded-xl p-5">
      <div className="shrink-0">
        <div className="flex items-center justify-between gap-3">
          <h3 className="font-heading text-sm font-bold uppercase tracking-wider text-[var(--outpost-accent)]">
            Priorities
          </h3>
          <span className="shrink-0 text-xs text-white/40">
            {checkedCount}/{PRIORITY_STEPS.length}
          </span>
        </div>
        <p className="mt-2 text-sm text-slate-300">
          Straight from the Beginner&apos;s Guide — what to line up over the next few days, in roughly this order.
        </p>
      </div>
      {/* Only this list scrolls — the title/subtitle above stays pinned in
          place, instead of sliding away with the rest of the card. */}
      <ul className="outpost-card-inner-scroll mt-3 space-y-1.5 pr-1">
        {PRIORITY_STEPS.map((step) => {
          const checked = priorities.checked.includes(step.id);
          return (
            <li key={step.id}>
              <button
                type="button"
                onClick={() => togglePriorityStep(step.id)}
                aria-pressed={checked}
                className={`flex w-full items-start gap-2 rounded-md px-2 py-1.5 text-left text-xs transition-colors ${
                  checked ? "bg-white/5 text-white/50 line-through" : "text-slate-200 hover:bg-white/5"
                }`}
              >
                <span
                  aria-hidden="true"
                  className={`mt-0.5 flex h-3.5 w-3.5 shrink-0 items-center justify-center rounded-sm border text-[0.6rem] leading-none ${
                    checked
                      ? "border-[var(--outpost-accent)] bg-[var(--outpost-accent)] text-black"
                      : "border-white/25"
                  }`}
                >
                  {checked ? "✓" : ""}
                </span>
                {step.text}
              </button>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
