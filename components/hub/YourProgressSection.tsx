"use client";

import Tier2Overview from "./Tier2Overview";
import Tier2Progression from "./Tier2Progression";

// The Outpost's Progress tab — level/XP and the skins/flair/logbook stuff
// are a *different* kind of progress than the Achievements tab (one is "how
// far along you are", the other is "what you've earned"), so each gets its
// own tab rather than being merged or squeezed into the header.
export default function YourProgressSection() {
  return (
    <div className="px-6 py-8 sm:py-10">
      <div className="mx-auto max-w-5xl">
        <h3 className="font-heading text-lg font-bold uppercase tracking-wider text-[var(--outpost-accent)]">
          Progress
        </h3>
        <div className="mt-4 grid gap-6 sm:grid-cols-2">
          <div className="rounded-xl border border-white/10 bg-white/5 p-4 sm:p-6">
            <Tier2Overview />
          </div>
          <div className="rounded-xl border border-white/10 bg-white/5 p-4 sm:p-6">
            <Tier2Progression />
          </div>
        </div>
      </div>
    </div>
  );
}
