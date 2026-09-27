"use client";

import Image from "next/image";
import { useMemo } from "react";
import { useAchievements } from "./AchievementsProvider";
import { FIELD_GUIDE_PERKS, fieldGuideGroups, fieldGuideProgress } from "./field-guide";

// The Field Guide (field-guide.ts), in the Progress tab: every mod a relic
// can be, grouped like the Mods page. A catalogued mod shows its icon, name
// and a link to it; the rest stay "?" until a relic of them is named. Each
// group says the perk finishing it gives, and whether it's earned.
export default function FieldGuide() {
  const { mods, tier2, mounted } = useAchievements();
  const catalogued = tier2.modsGuessedCorrect;
  const groups = useMemo(() => fieldGuideGroups(mods), [mods]);
  const known = useMemo(() => new Set(catalogued), [catalogued]);
  const { have, total } = fieldGuideProgress(mods, catalogued);

  return (
    <section aria-labelledby="field-guide-title">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <h4 id="field-guide-title" className="font-heading text-sm font-bold uppercase tracking-wider text-white">
          Field Guide
        </h4>
        {mounted && (
          <span className="text-xs font-semibold text-[var(--outpost-accent)]">
            {have}/{total} catalogued
          </span>
        )}
      </div>
      <p className="mt-1 text-xs leading-snug text-slate-400">
        Gathering trips now and then turn up a relic. Name the mod it came from and it goes in here. Finish a section
        for a perk out at camp.
      </p>

      <div className="mt-4 grid gap-4 md:grid-cols-2">
        {groups.map((g) => {
          const got = g.mods.filter((m) => known.has(m.projectId)).length;
          const done = got === g.mods.length;
          const perk = FIELD_GUIDE_PERKS[g.id];
          return (
            <div key={g.id} className="rounded-lg border border-white/10 p-3">
              <div className="flex items-baseline justify-between gap-2">
                <h5 className="text-xs font-semibold uppercase tracking-wider text-white/70">{g.label}</h5>
                <span className="text-[0.65rem] text-white/40">
                  {mounted ? got : 0}/{g.mods.length}
                </span>
              </div>
              {perk && (
                <p className={`mt-0.5 text-[11px] ${done && mounted ? "text-[var(--outpost-accent)]" : "text-white/40"}`}>
                  {done && mounted ? "\u{2713} " : "Finish it: "}
                  {perk.text}
                </p>
              )}
              <ul className="mt-2 grid grid-cols-[repeat(auto-fill,minmax(7.5rem,1fr))] gap-1.5">
                {g.mods.map((m) => {
                  const isKnown = mounted && known.has(m.projectId);
                  return (
                    <li key={m.projectId} className="flex min-w-0 items-center gap-1.5">
                      <div className="h-6 w-6 shrink-0 overflow-hidden rounded bg-white/10">
                        {isKnown && m.iconUrl && (
                          <Image src={m.iconUrl} alt="" width={24} height={24} unoptimized />
                        )}
                      </div>
                      {isKnown ? (
                        <a
                          href={m.modrinthUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="truncate text-[11px] text-slate-200 hover:text-[var(--outpost-accent)]"
                          title={m.name}
                        >
                          {m.name}
                        </a>
                      ) : (
                        <span className="text-[11px] text-white/25" aria-label="Not catalogued yet">
                          ?
                        </span>
                      )}
                    </li>
                  );
                })}
              </ul>
            </div>
          );
        })}
      </div>
    </section>
  );
}
