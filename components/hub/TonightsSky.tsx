"use client";

import { useEffect, useState } from "react";
import { useAchievements } from "./AchievementsProvider";
import { isDayNightCycleActive, loadCycleStartedAt, MOON_PHASES, nightForecast } from "./day-night-cycle";
import { isFullMoon, isNewMoon } from "./tier2";

// Tonight's Sky: a fixed readout in the Camp rail, under Stats & Materials
// (CampRail.tsx), once it's bought from the Upgrades shop (upgrade-catalog.ts).
// With the Outpost's own day/night cycle running it forecasts that cycle's
// night — the moon, the dusk/dawn countdown, and a gloom night coming (the
// only warning there is: without it the page just starts to darken at
// sunset, GloomLayer.tsx). Otherwise it reads the real-world moon.
// .outpost-lit, like Stats: a gloom warning has to stay readable in the gloom.

type SkyReading = { label: string; caption: string; icon: string; warn?: boolean };

function formatClock(ms: number): string {
  const total = Math.ceil(ms / 1000);
  return `${Math.floor(total / 60)}:${String(total % 60).padStart(2, "0")}`;
}

function readCycleSky(): SkyReading {
  const f = nightForecast(loadCycleStartedAt());
  const moon = MOON_PHASES[f.moonPhaseIndex];
  if (f.isNight) {
    return {
      label: `${moon.name} tonight`,
      caption: f.isGloom
        ? `Gloom night. Keep the fire lit until dawn (${formatClock(f.msUntilDawn)}).`
        : `Dawn in ${formatClock(f.msUntilDawn)}.`,
      icon: moon.icon,
      warn: f.isGloom,
    };
  }
  return {
    label: `Tonight: ${moon.name}`,
    caption: f.isGloom
      ? `Gloom tonight. Keep the fire lit. Dusk in ${formatClock(f.msUntilNight)}.`
      : `Dusk in ${formatClock(f.msUntilNight)}.`,
    icon: moon.icon,
    warn: f.isGloom,
  };
}

function readRealSky(now: Date): SkyReading {
  if (isFullMoon(now)) {
    return {
      label: "Full Moon",
      caption: "Bright enough to see by — but mobs still spawn, and fishing's up to 10x tonight.",
      icon: "\u{1F315}",
    };
  }
  if (isNewMoon(now)) {
    return {
      label: "New Moon",
      caption: "Zero light out there. Bring your own, or stay in.",
      icon: "\u{1F311}",
    };
  }
  return {
    label: "Waxing and Waning",
    caption: "An ordinary BTW night. Same rules as always: don't get caught in the gloom.",
    icon: "\u{1F319}",
  };
}

export function useTonightsSkyShown(): boolean {
  const { upgrades } = useAchievements();
  return upgrades.purchased.includes("sky");
}

export default function TonightsSky() {
  const { survivalActive } = useAchievements();
  const [sky, setSky] = useState<SkyReading | null>(null);

  // The Outpost's own cycle once it's running (survival forces it on), else
  // the real-world moon. Re-read every second for the dusk/dawn countdown.
  useEffect(() => {
    const read = () => setSky(survivalActive || isDayNightCycleActive() ? readCycleSky() : readRealSky(new Date()));
    read();
    const id = window.setInterval(read, 1000);
    return () => window.clearInterval(id);
  }, [survivalActive]);

  return (
    <section
      aria-label="Tonight's Sky"
      className="outpost-panel outpost-lit shrink-0 rounded-xl p-3"
    >
      <h3 className="font-heading text-sm font-bold uppercase tracking-wider text-[var(--outpost-accent)]">
        Tonight&apos;s Sky
      </h3>
      {sky ? (
        <div className="mt-1.5 flex items-center gap-2">
          <span className="text-lg leading-none" aria-hidden="true">
            {sky.icon}
          </span>
          <div className="min-w-0">
            <p className="text-sm font-semibold text-white">{sky.label}</p>
            <p className={`text-xs leading-snug ${sky.warn ? "font-semibold text-rose-300" : "text-slate-400"}`}>
              {sky.caption}
            </p>
          </div>
        </div>
      ) : (
        <div className="mt-1.5 h-3.5 w-1/2 animate-pulse rounded bg-white/10" />
      )}
    </section>
  );
}
