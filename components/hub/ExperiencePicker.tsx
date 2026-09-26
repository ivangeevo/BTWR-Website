"use client";

import { useEffect, useRef, useState } from "react";
import { useAchievements } from "./AchievementsProvider";
import type { ExperienceMode } from "./hub-storage";
import { useEngine } from "./engine/ui/EngineProvider";

type Option = {
  mode: ExperienceMode;
  icon: string;
  name: string;
  tagline: string;
  points: string[];
};

const OPTIONS: Option[] = [
  {
    mode: "survival",
    icon: "\u{1F525}",
    name: "Full survival",
    tagline: "The Outpost the way Better Than Wolves plays it.",
    points: [
      "Health and Hunger: every trip out makes you hungry, and hunts and digs can hurt. Cook food and eat to keep going.",
      "The gloom: on New Moon nights a dead fire means a darkness that hurts. Watch Tonight's Sky and keep your Campfire lit.",
      "Hardcore Spawn: die and you wake up far from camp, with a short trek home. You keep everything you gathered.",
      "The day/night cycle is always on.",
    ],
  },
  {
    mode: "casual",
    icon: "☕",
    name: "Casual idle",
    tagline: "Gather, craft, and tinker at your own pace.",
    points: [
      "No health or hunger. Nothing out there can hurt you.",
      "Nights are just nights: no gloom.",
      "The day/night cycle stays an optional upgrade.",
      "The Engine, crafting, cooking, and achievements all work the same (except Hardcore Spawn's own).",
    ],
  },
];

// The Stump opens the camp, and with it the one real choice about how the
// Outpost plays (survival.ts). Covers the whole Outpost until the visitor
// picks and presses Start Journey — waits for the Engine's own Stump
// ceremony to finish first, so the two never talk over each other.
export default function ExperiencePicker() {
  const { needsExperienceChoice, chooseExperience } = useAchievements();
  const { ceremony } = useEngine();
  const [picked, setPicked] = useState<ExperienceMode | null>(null);
  const headingRef = useRef<HTMLHeadingElement>(null);
  const open = needsExperienceChoice && !ceremony;

  useEffect(() => {
    if (open) headingRef.current?.focus();
  }, [open]);

  if (!open) return null;

  return (
    <div
      // z-[70]: above everything else inside the Outpost frame — the gloom
      // (30), achievement toasts (50), and the Engine's toasts (60).
      className="outpost-experience absolute inset-0 z-[70] flex items-center justify-center overflow-y-auto p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="outpost-experience-title"
      data-no-drag
    >
      <div className="outpost-materialize w-full max-w-3xl">
        <p className="text-center text-[0.65rem] font-bold uppercase tracking-[0.25em] text-[var(--outpost-accent)]">
          The Stump
        </p>
        <h2
          id="outpost-experience-title"
          ref={headingRef}
          tabIndex={-1}
          className="mt-1 text-center font-heading text-2xl font-bold text-white outline-none"
        >
          The camp is open. How do you want to play?
        </h2>

        <div className="mt-5 grid gap-3 sm:grid-cols-2" role="radiogroup" aria-label="Experience">
          {OPTIONS.map((o) => {
            const selected = picked === o.mode;
            return (
              <button
                key={o.mode}
                type="button"
                role="radio"
                aria-checked={selected}
                onClick={() => setPicked(o.mode)}
                className={`outpost-panel flex flex-col rounded-xl p-4 text-left transition-colors ${
                  selected
                    ? "border-[var(--outpost-accent)] ring-2 ring-[var(--outpost-accent)]"
                    : "hover:border-[var(--outpost-accent-soft)]"
                }`}
              >
                <div className="flex items-center gap-2">
                  <span className="text-2xl leading-none" aria-hidden="true">
                    {o.icon}
                  </span>
                  <span className="font-heading text-lg font-bold text-white">{o.name}</span>
                  <span
                    className={`ml-auto h-4 w-4 shrink-0 rounded-full border-2 ${
                      selected ? "border-[var(--outpost-accent)] bg-[var(--outpost-accent)]" : "border-white/30"
                    }`}
                    aria-hidden="true"
                  />
                </div>
                <p className="mt-1.5 text-sm text-slate-300">{o.tagline}</p>
                <ul className="mt-2.5 space-y-1.5 text-xs leading-snug text-slate-400">
                  {o.points.map((p) => (
                    <li key={p} className="flex gap-1.5">
                      <span className="text-[var(--outpost-accent)]" aria-hidden="true">
                        •
                      </span>
                      <span>{p}</span>
                    </li>
                  ))}
                </ul>
              </button>
            );
          })}
        </div>

        <div className="mt-5 flex justify-center">
          <button
            type="button"
            disabled={!picked}
            onClick={() => picked && chooseExperience(picked)}
            className={`rounded-lg px-6 py-2 text-sm font-semibold ${
              picked ? "btn-glow btn-gradient text-white" : "cursor-not-allowed border border-white/15 text-white/30"
            }`}
          >
            Start Journey
          </button>
        </div>
      </div>
    </div>
  );
}
