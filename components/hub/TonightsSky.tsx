"use client";

import { useEffect, useState } from "react";
import { isFullMoon, isNewMoon } from "./tier2";

type SkyReading = { label: string; caption: string; icon: string };

function readSky(now: Date): SkyReading {
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

// Passive flavor card, mount-gated since it depends on the real current
// date (SSR and the client can disagree about "now" right around a static
// export's build time) — same reasoning as Mod of the Day.
export default function TonightsSky() {
  const [sky, setSky] = useState<SkyReading | null>(null);

  useEffect(() => {
    setSky(readSky(new Date()));
  }, []);

  return (
    <div className="outpost-panel rounded-xl p-5">
      <h3 className="font-heading text-sm font-bold uppercase tracking-wider text-[var(--outpost-accent)]">
        Tonight&apos;s Sky
      </h3>
      {sky === null ? (
        <div className="mt-3 flex items-center gap-3">
          <div className="h-12 w-12 shrink-0 animate-pulse rounded-lg bg-white/10" />
          <div className="flex-1 space-y-2">
            <div className="h-4 w-1/3 animate-pulse rounded bg-white/10" />
            <div className="h-3 w-2/3 animate-pulse rounded bg-white/10" />
          </div>
        </div>
      ) : (
        <div className="mt-3 flex items-center gap-3">
          <span className="text-3xl leading-none" aria-hidden="true">
            {sky.icon}
          </span>
          <div>
            <p className="font-semibold text-white">{sky.label}</p>
            <p className="mt-1 text-sm text-slate-300">{sky.caption}</p>
          </div>
        </div>
      )}
    </div>
  );
}
