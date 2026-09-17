"use client";

import Image from "next/image";
import { useEffect, useState } from "react";
import type { Mod } from "@/lib/mods";
import { MISC_SUBCATEGORIES } from "@/data/mod-categories.mjs";
import { pickModOfDay, todayUTC } from "./hub-storage";
import { useAchievements } from "./AchievementsProvider";

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

export default function ModOfTheDay({ mods }: { mods: Mod[] }) {
  const { unlock } = useAchievements();
  const [mod, setMod] = useState<Mod | null>(null);

  useEffect(() => {
    setMod(pickModOfDay(mods));
  }, [mods]);

  useEffect(() => {
    if (mod) unlock("mod-of-day-viewed");
  }, [mod, unlock]);

  if (!mod) {
    return (
      <div className="card-glow rounded-xl border border-slate-200 p-5 dark:border-slate-700">
        <h3 className="font-heading text-sm font-bold uppercase tracking-wider text-chrome-dark dark:text-chrome">
          Mod of the Day
        </h3>
        <div className="mt-3 flex items-center gap-3">
          <div className="h-12 w-12 shrink-0 animate-pulse rounded-lg bg-slate-100 dark:bg-slate-800" />
          <div className="flex-1 space-y-2">
            <div className="h-4 w-2/3 animate-pulse rounded bg-slate-100 dark:bg-slate-800" />
            <div className="h-3 w-1/3 animate-pulse rounded bg-slate-100 dark:bg-slate-800" />
          </div>
        </div>
      </div>
    );
  }

  const blurbs = mod.category === "core" ? CORE_BLURBS : MISC_BLURBS;
  const blurb = blurbs[pickIndex(todayUTC(), blurbs.length)];

  return (
    <div className="card-glow rounded-xl border border-slate-200 p-5 dark:border-slate-700">
      <h3 className="font-heading text-sm font-bold uppercase tracking-wider text-chrome-dark dark:text-chrome">
        Mod of the Day
      </h3>
      <div className="mt-3 flex items-center gap-3">
        {mod.iconUrl ? (
          <Image
            src={mod.iconUrl}
            alt=""
            width={48}
            height={48}
            unoptimized
            className="rounded-lg"
          />
        ) : (
          <div className="h-12 w-12 shrink-0 rounded-lg bg-slate-100 dark:bg-slate-800" />
        )}
        <div className="min-w-0">
          <a
            href={mod.modrinthUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="block truncate font-semibold text-chrome-dark hover:underline dark:text-chrome"
          >
            {mod.name}
          </a>
          <span className="rounded-full bg-chrome-light px-2 py-0.5 text-xs font-semibold text-chrome-dark dark:bg-slate-800 dark:text-chrome">
            {categoryLabel(mod)}
          </span>
        </div>
      </div>
      <p className="mt-3 text-sm text-slate-600 dark:text-slate-400">{blurb}</p>
    </div>
  );
}
