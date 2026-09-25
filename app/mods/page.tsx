"use client";

import Image from "next/image";
import { useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import Reveal from "@/components/Reveal";
import modsData from "@/data/mods.json";
import { MISC_SUBCATEGORIES } from "@/data/mod-categories.mjs";
import type { Mod } from "@/lib/mods";
import {
  EVT_MODS_READ,
  markModRead,
  pushInbox,
  readEnginePublic,
  readModsRead,
} from "@/components/hub/engine/bridge-storage";

// How tall the "peek" preview is before a category has ever been expanded —
// tall enough to hint at a full card, short enough to make it obvious more
// is cut off (the blur fade at the bottom reinforces that).
const PEEK_HEIGHT = 130;

// useLayoutEffect warns when it runs during static-export SSR; fall back to
// useEffect there since only the browser needs the pre-paint measurement.
const useIsomorphicLayoutEffect =
  typeof window !== "undefined" ? useLayoutEffect : useEffect;

function byMostRecentlyUpdated(a: Mod, b: Mod) {
  const aTime = a.currentVersionDate ? new Date(a.currentVersionDate).getTime() : -Infinity;
  const bTime = b.currentVersionDate ? new Date(b.currentVersionDate).getTime() : -Infinity;
  return bTime - aTime;
}

function formatDate(iso: string | null) {
  if (!iso) return null;
  return new Date(iso).toLocaleDateString("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

// The Outpost's Engine "reads" mods you open here (a click on a card) — it
// can only write sentences about, and draw cipher keys from, mods it has
// read. Pure side-key plumbing (engine/bridge-storage.ts): this page never
// touches the Outpost's own save.
type EngineReading = {
  active: boolean;
  read: Set<string>;
  onRead: (slug: string) => void;
  fragmentSlug: string | null;
  onFragment: () => void;
};

const FRAGMENT_MOD_SLUG = "btwr-core";

function useEngineReading(): EngineReading {
  const [pub, setPub] = useState<ReturnType<typeof readEnginePublic>>(null);
  const [read, setRead] = useState<Set<string>>(new Set());
  useEffect(() => {
    const sync = () => {
      setPub(readEnginePublic());
      setRead(new Set(readModsRead()));
    };
    sync();
    window.addEventListener("storage", sync);
    window.addEventListener(EVT_MODS_READ, sync);
    return () => {
      window.removeEventListener("storage", sync);
      window.removeEventListener(EVT_MODS_READ, sync);
    };
  }, []);
  const active = !!pub && pub.stage >= 2;
  const huntOn = !!pub && pub.keywordHunt && !pub.fragments.includes("frag-page");
  return {
    active,
    read,
    onRead: (slug) => {
      if (active && markModRead(slug)) setRead((prev) => new Set([...prev, slug]));
    },
    fragmentSlug: huntOn ? FRAGMENT_MOD_SLUG : null,
    onFragment: () => {
      pushInbox({ type: "keyFragment", data: { frag: "frag-page", via: "mods" } });
      setPub((p) => (p ? { ...p, fragments: [...p.fragments, "frag-page"] } : p));
    },
  };
}

function ModCard({ mod, reading }: { mod: Mod; reading: EngineReading }) {
  const isRead = reading.read.has(mod.slug);
  return (
    <li
      className="card-glow rounded-lg border border-slate-200 p-4 dark:border-slate-700"
      onClick={() => reading.onRead(mod.slug)}
    >
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
            {reading.active && isRead && (
              <span className="text-xs text-amber-700 dark:text-amber-400" title="The Outpost's Engine has read this mod">
                {"\u{2699}\u{FE0F}"} read
              </span>
            )}
            {reading.fragmentSlug === mod.slug && (
              <button
                type="button"
                onClick={(ev) => {
                  ev.stopPropagation();
                  reading.onFragment();
                }}
                className="engine-fragment-glyph ml-auto"
                title="Something the Engine is looking for"
              >
                {"\u{2699}"} LFO
              </button>
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

function groupBySubcategory(mods: Mod[]) {
  const groups = new Map<string, Mod[]>();
  for (const mod of mods) {
    const key = mod.subcategory && MISC_SUBCATEGORIES[mod.subcategory] ? mod.subcategory : "other";
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key)!.push(mod);
  }
  const order = [...Object.keys(MISC_SUBCATEGORIES), "other"];
  return order
    .filter((key) => groups.has(key))
    .map((key) => ({
      label: MISC_SUBCATEGORIES[key] ?? "Other",
      mods: groups.get(key)!,
    }));
}

function ModSection({
  title,
  mods,
  grouped = false,
  reading,
}: {
  title: string;
  mods: Mod[];
  grouped?: boolean;
  reading: EngineReading;
}) {
  // Three states: a slightly-open "peek" (first impression only), fully
  // open, and fully closed. Once a category has been opened at least once,
  // it stops peeking and just toggles open/closed like a normal dropdown.
  const [open, setOpen] = useState(false);
  const [everOpened, setEverOpened] = useState(false);
  const [naturalHeight, setNaturalHeight] = useState(0);
  const contentRef = useRef<HTMLDivElement>(null);

  useIsomorphicLayoutEffect(() => {
    const el = contentRef.current;
    if (!el) return;
    const recompute = () => setNaturalHeight(el.scrollHeight);
    recompute();
    window.addEventListener("resize", recompute);
    return () => window.removeEventListener("resize", recompute);
  }, [mods.length]);

  if (mods.length === 0) return null;

  // A category with barely any content doesn't need a peek at all — just
  // show it fully so there's nothing misleadingly "cut off".
  const fitsWithoutPeek = naturalHeight > 0 && naturalHeight <= PEEK_HEIGHT;
  const isOpen = open || fitsWithoutPeek;
  const showPeek = !isOpen && !everOpened;
  const panelHeight = isOpen ? naturalHeight : showPeek ? PEEK_HEIGHT : 0;

  const panelId = `mod-section-${title.toLowerCase().replace(/\s+/g, "-")}`;
  const sections = grouped ? groupBySubcategory(mods) : [{ label: null, mods }];

  return (
    <Reveal className="mt-10">
      <section className="card-glow rounded-lg border border-slate-200 dark:border-slate-700">
        <button
          type="button"
          onClick={() => {
            setOpen((v) => !v);
            setEverOpened(true);
          }}
          aria-expanded={isOpen}
          aria-controls={panelId}
          className="category-header-bounce flex w-full items-center justify-between gap-3 rounded-lg px-4 py-3 text-left transition-colors hover:bg-chrome-light/40 dark:hover:bg-slate-800/60"
        >
          <span className="flex items-center gap-3">
            <h2 className="text-xl font-bold text-slate-900 dark:text-slate-100">
              {title}
            </h2>
            <span className="rounded-full bg-chrome-light px-2.5 py-0.5 text-xs font-semibold text-chrome-dark dark:bg-slate-800 dark:text-chrome">
              {mods.length}
            </span>
          </span>
          <svg
            className={`h-5 w-5 shrink-0 text-chrome-dark transition-transform duration-300 dark:text-chrome ${
              isOpen ? "rotate-180" : ""
            }`}
            viewBox="0 0 20 20"
            fill="none"
            stroke="currentColor"
            strokeWidth={2}
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <path d="M5 7.5l5 5 5-5" />
          </svg>
        </button>
        <div
          id={panelId}
          className="category-panel relative overflow-hidden"
          style={{ maxHeight: `${panelHeight}px` }}
        >
          <div ref={contentRef} className="px-4 pb-4 pt-1">
            {sections.map(({ label, mods: groupMods }) => (
              <div key={label ?? "flat"} className="mt-3 first:mt-0">
                {label && (
                  <h3 className="mb-2 text-xs font-bold uppercase tracking-wider text-chrome-dark/70 dark:text-chrome/70">
                    {label}
                  </h3>
                )}
                <ul className="space-y-3">
                  {groupMods.map((mod) => (
                    <ModCard key={mod.projectId} mod={mod} reading={reading} />
                  ))}
                </ul>
              </div>
            ))}
          </div>
          {showPeek && (
            <div className="category-peek-fade" aria-hidden="true" />
          )}
        </div>
      </section>
    </Reveal>
  );
}

export default function ModsPage() {
  const allMods = modsData.mods as Mod[];
  const [query, setQuery] = useState("");
  const reading = useEngineReading();

  const mods = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return allMods;
    return allMods.filter((mod) => mod.name.toLowerCase().includes(q));
  }, [allMods, query]);

  const core = mods.filter((m) => m.category === "core").sort(byMostRecentlyUpdated);
  const misc = mods.filter((m) => m.category === "misc").sort(byMostRecentlyUpdated);
  const uncategorized = mods
    .filter((m) => m.category === "uncategorized")
    .sort(byMostRecentlyUpdated);

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
          <ModSection title="Core Mods" mods={core} reading={reading} />
          <ModSection title="Miscellaneous" mods={misc} grouped reading={reading} />
          <ModSection title="Needs Categorization" mods={uncategorized} reading={reading} />
        </>
      )}
    </div>
  );
}
