"use client";

import { useCooldownRemaining } from "./activity-common";
import { useAchievements } from "./AchievementsProvider";
import { DEATH_CAUSE_TEXT, formatHalves } from "./survival";

function formatClock(ms: number): string {
  const total = Math.ceil(ms / 1000);
  return `${Math.floor(total / 60)}:${String(total % 60).padStart(2, "0")}`;
}

// Hardcore Spawn's banner (survival.ts): shown across the top of Basecamp
// from a respawn until the trek home finishes. The walk runs off a stored
// end time, so it keeps going with the tab closed — coming back later just
// finds you home.
export default function StrandedPanel({ className = "" }: { className?: string }) {
  const { survival, stranded } = useAchievements();
  const remainingMs = useCooldownRemaining(survival.stranded?.trekEndsAt ?? null);
  if (!stranded || !survival.stranded) return null;

  const { blocks, trekMs } = survival.stranded;
  const pct = trekMs > 0 ? Math.min(100, Math.round(((trekMs - remainingMs) / trekMs) * 100)) : 100;
  const cause = survival.lastCause ? DEATH_CAUSE_TEXT[survival.lastCause] : null;

  return (
    <section className={`outpost-panel rounded-xl p-3 ${className}`} aria-label="Stranded" aria-live="polite">
      <div className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-1">
        <h3 className="font-heading text-sm font-bold uppercase tracking-wider text-[var(--outpost-accent)]">
          {"\u{1F480}"} Hardcore Spawn
        </h3>
        <p className="text-xs text-slate-300">
          {cause ? `Died to ${cause}. ` : ""}Woke up ~{blocks.toLocaleString()} blocks from spawn.
        </p>
      </div>

      <div className="mt-2 flex items-center gap-3">
        <div
          className="h-2 flex-1 overflow-hidden rounded-full bg-white/10"
          role="progressbar"
          aria-label="Trek back to camp"
          aria-valuemin={0}
          aria-valuemax={100}
          aria-valuenow={pct}
        >
          <div
            className="h-full rounded-full bg-[var(--outpost-accent)] transition-[width] duration-1000 ease-linear"
            style={{ width: `${pct}%` }}
          />
        </div>
        <span className="shrink-0 text-xs font-semibold tabular-nums text-white">
          {remainingMs > 0 ? formatClock(remainingMs) : "Almost there"}
        </span>
      </div>

      <p className="mt-1.5 text-[11px] leading-snug text-slate-400">
        Finding your way back to camp. Crafting is out of reach until you&apos;re home. Your Campfire comes with you,
        and Gathering still works.
      </p>
      {survival.respawnsInWindow > 0 && (
        <p className="mt-1 text-[11px] leading-snug text-slate-400">
          Same area as last time, and a little weaker: you respawned with {formatHalves(survival.health)} {"❤️"}.
        </p>
      )}
      <p className="mt-1 text-[11px] leading-snug text-[var(--outpost-accent)]">
        {survival.compass
          ? "\u{1F9ED} Your Compass halved the walk."
          : "\u{1F9ED} Craft a Compass and the next walk home takes half as long."}
      </p>
    </section>
  );
}

// Laid over a card the visitor can't use while stranded (Crafting).
export function FarFromCamp() {
  return (
    <div className="absolute inset-0 z-10 flex flex-col items-center justify-center gap-1 rounded-xl bg-black/60 p-4 text-center backdrop-blur-[2px]">
      <span className="text-2xl" aria-hidden="true">
        {"\u{1F9ED}"}
      </span>
      <p className="text-sm font-semibold text-white">You&apos;re far from camp</p>
      <p className="text-[11px] leading-snug text-slate-300">Back once the trek home finishes.</p>
    </div>
  );
}
