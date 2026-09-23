"use client";

import Image from "next/image";
import { useEffect, useState } from "react";
import type { Mod } from "@/lib/mods";
import { MISC_SUBCATEGORIES } from "@/data/mod-categories.mjs";
import { FIELD_NOTES } from "./field-notes";
import { pickByDate, pickModOfDay, todayUTC } from "./hub-storage";
import { isFullMoon, isNewMoon } from "./tier2";
import { useAchievements } from "./AchievementsProvider";

// Three small, independent, date-seeded flavor reads — the mod spotlight,
// tonight's moon phase, and a beginner tip — that used to each be their own
// card (ModOfTheDay/TonightsSky/BtwFieldNotes). None of the three carries
// enough content on its own to match the visual weight of the Outpost's
// other cards, and they're all "same shape" (a title, an icon row, a line
// or two of text), so a size pass on the whole grid combines them into one
// card with three short sections instead of three separate sparse ones.

const CORE_BLURBS = [
  "One of the mods that makes BTWR feel like BTWR.",
  "Part of the pack's core survival identity — not just along for the ride.",
  "Touches the pack's core gameplay loop in a real way.",
];

const MISC_BLURBS = [
  "Quietly making the pack smoother without changing how it plays.",
  "Quality-of-life you'll stop noticing about a day after you install it.",
  "One of the utility mods holding the modpack together behind the scenes.",
];

function pickIndex(dateStr: string, length: number) {
  let sum = 0;
  for (const ch of dateStr) sum += ch.charCodeAt(0);
  return sum % length;
}

function categoryLabel(mod: Mod) {
  if (mod.category === "core") return "Core";
  if (mod.subcategory && MISC_SUBCATEGORIES[mod.subcategory]) {
    return MISC_SUBCATEGORIES[mod.subcategory];
  }
  return "Misc";
}

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

function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <h4 className="text-[0.7rem] font-bold uppercase tracking-wider text-white/40">
      {children}
    </h4>
  );
}

export default function DailyBriefing({ mods }: { mods: Mod[] }) {
  const { unlock } = useAchievements();
  const [mod, setMod] = useState<Mod | null>(null);
  const [sky, setSky] = useState<SkyReading | null>(null);
  const [note, setNote] = useState<string | null>(null);

  useEffect(() => {
    setMod(pickModOfDay(mods));
  }, [mods]);

  useEffect(() => {
    setSky(readSky(new Date()));
    setNote(pickByDate(FIELD_NOTES));
  }, []);

  useEffect(() => {
    if (mod) unlock("mod-of-day-viewed");
  }, [mod, unlock]);

  let blurb: string | null = null;
  if (mod) {
    const blurbs = mod.category === "core" ? CORE_BLURBS : MISC_BLURBS;
    blurb = blurbs[pickIndex(todayUTC(), blurbs.length)];
  }

  return (
    <div className="outpost-panel outpost-card-md rounded-xl p-4">
      <h3 className="font-heading text-xs font-bold uppercase tracking-wider text-[var(--outpost-accent)]">
        Today at the Outpost
      </h3>

      <div className="mt-1.5">
        <SectionLabel>Mod of the Day</SectionLabel>
        {mod ? (
          <div className="mt-1 flex items-center gap-2">
            {mod.iconUrl ? (
              <Image src={mod.iconUrl} alt="" width={26} height={26} unoptimized className="rounded-lg" />
            ) : (
              <div className="h-[26px] w-[26px] shrink-0 rounded-lg bg-white/10" />
            )}
            <div className="min-w-0">
              <div className="flex items-center gap-1.5">
                <a
                  href={mod.modrinthUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="truncate text-sm font-semibold text-white hover:text-[var(--outpost-accent)]"
                >
                  {mod.name}
                </a>
                <span className="shrink-0 rounded-full bg-white/10 px-1.5 py-px text-[0.65rem] font-semibold text-[var(--outpost-accent)]">
                  {categoryLabel(mod)}
                </span>
              </div>
              {blurb && <p className="truncate text-xs text-slate-400">{blurb}</p>}
            </div>
          </div>
        ) : (
          <div className="mt-1 flex items-center gap-2">
            <div className="h-[26px] w-[26px] shrink-0 animate-pulse rounded-lg bg-white/10" />
            <div className="flex-1 space-y-1.5">
              <div className="h-3.5 w-2/3 animate-pulse rounded bg-white/10" />
              <div className="h-3 w-1/3 animate-pulse rounded bg-white/10" />
            </div>
          </div>
        )}
      </div>

      <div className="mt-2 border-t border-white/10 pt-2">
        <SectionLabel>Tonight&apos;s Sky</SectionLabel>
        {sky ? (
          <div className="mt-1 flex items-center gap-2">
            <span className="text-lg leading-none" aria-hidden="true">
              {sky.icon}
            </span>
            <div className="min-w-0">
              <p className="text-sm font-semibold text-white">{sky.label}</p>
              <p className="truncate text-xs text-slate-400">{sky.caption}</p>
            </div>
          </div>
        ) : (
          <div className="mt-1 h-3.5 w-1/2 animate-pulse rounded bg-white/10" />
        )}
      </div>

      <div className="mt-2 border-t border-white/10 pt-2">
        <SectionLabel>Field Notes</SectionLabel>
        {note ? (
          <p className="mt-1 truncate text-xs text-slate-300">{note}</p>
        ) : (
          <div className="mt-1 space-y-1.5">
            <div className="h-3 w-full animate-pulse rounded bg-white/10" />
            <div className="h-3 w-2/3 animate-pulse rounded bg-white/10" />
          </div>
        )}
      </div>
    </div>
  );
}
