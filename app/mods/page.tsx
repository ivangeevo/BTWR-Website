"use client";

import Image from "next/image";
import { useMemo, useState } from "react";
import Reveal from "@/components/Reveal";
import modsData from "@/data/mods.json";

type Mod = {
  projectId: string;
  slug: string;
  name: string;
  iconUrl: string | null;
  modrinthUrl: string;
  category: "core" | "misc" | "uncategorized";
  disabled: boolean;
  currentVersion: string;
  currentVersionDate: string | null;
  newestVersion: string;
  newestVersionDate: string | null;
  newestMatchesTarget: boolean;
  isOutdated: boolean;
};

function formatDate(iso: string | null) {
  if (!iso) return null;
  return new Date(iso).toLocaleDateString("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

function ModCard({ mod }: { mod: Mod }) {
  return (
    <li className="card-glow rounded-lg border border-slate-200 p-4 dark:border-slate-700">
      <div className="flex items-start gap-3">
        {mod.iconUrl ? (
          <Image
            src={mod.iconUrl}
            alt=""
            width={40}
            height={40}
            unoptimized
            className="rounded"
          />
        ) : (
          <div className="h-10 w-10 shrink-0 rounded bg-slate-100 dark:bg-slate-800" />
        )}
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <a
              href={mod.modrinthUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="font-semibold text-chrome-dark hover:underline dark:text-chrome"
            >
              {mod.name}
            </a>
            {mod.disabled && (
              <span className="rounded-full bg-slate-200 px-2 py-0.5 text-xs font-medium text-slate-600 dark:bg-slate-700 dark:text-slate-300">
                Disabled in pack
              </span>
            )}
            {mod.isOutdated && (
              <span className="rounded-full bg-amber-100 px-2 py-0.5 text-xs font-medium text-amber-800 dark:bg-amber-950 dark:text-amber-300">
                Outdated
              </span>
            )}
          </div>
          <dl className="mt-2 grid grid-cols-2 gap-x-4 text-sm">
            <div>
              <dt className="text-slate-500 dark:text-slate-400">Current</dt>
              <dd className="text-slate-800 dark:text-slate-200">
                {mod.currentVersion}
                {formatDate(mod.currentVersionDate) && (
                  <span className="text-slate-400 dark:text-slate-500">
                    {" "}
                    ({formatDate(mod.currentVersionDate)})
                  </span>
                )}
              </dd>
            </div>
            <div>
              <dt className="text-slate-500 dark:text-slate-400">Newest</dt>
              <dd className="text-slate-800 dark:text-slate-200">
                {mod.newestVersion}
                {formatDate(mod.newestVersionDate) && (
                  <span className="text-slate-400 dark:text-slate-500">
                    {" "}
                    ({formatDate(mod.newestVersionDate)})
                  </span>
                )}
                {!mod.newestMatchesTarget && (
                  <span className="text-slate-400 dark:text-slate-500">
                    {" "}
                    (different game version)
                  </span>
                )}
              </dd>
            </div>
          </dl>
        </div>
      </div>
    </li>
  );
}

function ModSection({ title, mods }: { title: string; mods: Mod[] }) {
  if (mods.length === 0) return null;
  return (
    <Reveal className="mt-10">
      <section>
        <h2 className="text-xl font-bold text-slate-900 dark:text-slate-100">
          {title}
        </h2>
        <ul className="mt-4 space-y-3">
          {mods.map((mod) => (
            <ModCard key={mod.projectId} mod={mod} />
          ))}
        </ul>
      </section>
    </Reveal>
  );
}

export default function ModsPage() {
  const allMods = modsData.mods as Mod[];
  const [query, setQuery] = useState("");

  const mods = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return allMods;
    return allMods.filter((mod) => mod.name.toLowerCase().includes(q));
  }, [allMods, query]);

  const core = mods.filter((m) => m.category === "core");
  const misc = mods.filter((m) => m.category === "misc");
  const uncategorized = mods.filter((m) => m.category === "uncategorized");

  return (
    <div className="mx-auto max-w-3xl px-6 py-16">
      <div>
        <h1 className="font-heading text-3xl font-extrabold tracking-wide text-chrome-dark dark:text-chrome">
          Mods List
        </h1>
        <p className="mt-2 text-slate-600 dark:text-slate-400">
          Pulled automatically from{" "}
          <a
            href="https://modrinth.com/modpack/btw-remastered/versions"
            target="_blank"
            rel="noopener noreferrer"
            className="text-chrome-dark underline dark:text-chrome"
          >
            BTWR&apos;s Modrinth listing
          </a>
          .
        </p>
        <p className="mt-1 text-slate-600 dark:text-slate-400">
          &ldquo;Current&rdquo; is the version used in the pack;
          &ldquo;Newest&rdquo; is the latest available on Modrinth.
        </p>
        <div className="mt-3 inline-block rounded-full bg-chrome-light px-4 py-1.5 text-sm font-semibold text-chrome-dark dark:bg-slate-800 dark:text-chrome">
          Latest modpack version: {modsData.packVersion}
        </div>
      </div>

      <input
        type="text"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        placeholder={`Search ${allMods.length} mods...`}
        className="mt-6 w-full rounded-lg border border-slate-300 px-4 py-2 text-sm focus:border-glow focus:outline-none focus:ring-1 focus:ring-glow dark:border-slate-600 dark:bg-slate-800 dark:text-slate-100 dark:placeholder-slate-500"
      />

      {mods.length === 0 ? (
        <p className="mt-10 text-center text-slate-500 dark:text-slate-400">
          No mods match &ldquo;{query}&rdquo;.
        </p>
      ) : (
        <>
          <ModSection title="Core Mods" mods={core} />
          <ModSection title="Miscellaneous" mods={misc} />
          <ModSection title="Needs Categorization" mods={uncategorized} />
        </>
      )}
    </div>
  );
}
