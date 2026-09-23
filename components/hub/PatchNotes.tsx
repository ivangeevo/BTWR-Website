"use client";

import { useEffect, useLayoutEffect, useRef, useState } from "react";
import type { Mod, PackRelease } from "@/lib/mods";
import { buildModChangelogFeed } from "@/lib/mods";
import { useAchievements } from "./AchievementsProvider";

// useLayoutEffect warns when it runs during static-export SSR; fall back to
// useEffect there since only the browser needs the pre-paint measurement.
// Same recipe as app/mods/page.tsx.
const useIsomorphicLayoutEffect =
  typeof window !== "undefined" ? useLayoutEffect : useEffect;

// Trimmed from 160 in a size pass on the Outpost grid — the collapsed peek
// was consistently one of the tallest cards regardless of content; still
// enough to preview a release's first couple lines.
const PEEK_HEIGHT = 128;

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

type Mode = "modpack" | "mods";

export default function PatchNotes({
  mods,
  packReleases,
  variant = "card",
}: {
  mods: Mod[];
  packReleases: PackRelease[];
  /** "card": self-contained panel (tier-1 grid). "flat": no outer chrome (tier-2 dashboard tab). */
  variant?: "card" | "flat";
}) {
  const { unlock, bumpPatchNotesSwitch, recordPatchNotesOpen } = useAchievements();
  const [mode, setMode] = useState<Mode>("modpack");
  const [open, setOpen] = useState(false);
  const [everOpened, setEverOpened] = useState(false);
  const [naturalHeight, setNaturalHeight] = useState(0);
  const contentRef = useRef<HTMLDivElement>(null);

  const modFeed = buildModChangelogFeed(mods);

  useIsomorphicLayoutEffect(() => {
    const el = contentRef.current;
    if (!el) return;
    const recompute = () => setNaturalHeight(el.scrollHeight);
    recompute();
    window.addEventListener("resize", recompute);
    return () => window.removeEventListener("resize", recompute);
  }, [mode, packReleases.length, modFeed.length]);

  const fitsWithoutPeek = naturalHeight > 0 && naturalHeight <= PEEK_HEIGHT;
  const isOpen = open || fitsWithoutPeek;
  const showPeek = !isOpen && !everOpened;
  const panelHeight = isOpen ? naturalHeight : showPeek ? PEEK_HEIGHT : 0;

  // Unlocking here (not just in the click handler) also covers the case
  // where there's little enough content that it skips the peek/click flow
  // and renders fully open by default — the visitor still saw it either way.
  useEffect(() => {
    if (isOpen) {
      unlock("patch-notes-opened");
      recordPatchNotesOpen();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen]);

  function toggleOpen() {
    setOpen((v) => !v);
    setEverOpened(true);
  }

  function switchMode(next: Mode) {
    if (next === mode) return;
    setMode(next);
    unlock("patch-notes-mode-switched");
    bumpPatchNotesSwitch();
  }

  return (
    <div className={variant === "card" ? "outpost-panel outpost-card-md rounded-xl" : ""}>
      <div
        className={`flex items-center gap-3 px-5 pt-4 ${
          variant === "card" ? "justify-between" : "justify-end"
        }`}
      >
        {variant === "card" && (
          <h3 className="font-heading text-sm font-bold uppercase tracking-wider text-[var(--outpost-accent)]">
            Patch Notes
          </h3>
        )}
        <div className="flex rounded-full bg-white/10 p-0.5 text-xs font-semibold">
          {(["modpack", "mods"] as const).map((m) => (
            <button
              key={m}
              type="button"
              aria-pressed={mode === m}
              onClick={() => switchMode(m)}
              className={`rounded-full px-3 py-1 capitalize transition-colors ${
                mode === m ? "bg-white/15 text-[var(--outpost-accent)] shadow" : "text-slate-400"
              }`}
            >
              {m}
            </button>
          ))}
        </div>
      </div>

      <button
        type="button"
        onClick={toggleOpen}
        aria-expanded={isOpen}
        className="mt-2 flex w-full items-center justify-between px-5 py-2 text-left text-sm text-slate-400 hover:text-[var(--outpost-accent)]"
      >
        <span>{isOpen ? "Hide" : mode === "modpack" ? "Read the release notes" : "See what's new"}</span>
        <svg
          className={`h-4 w-4 shrink-0 transition-transform duration-300 ${isOpen ? "rotate-180" : ""}`}
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

      <div className="category-panel relative overflow-hidden" style={{ maxHeight: `${panelHeight}px` }}>
        <div ref={contentRef} className="space-y-5 px-5 pb-5">
          {mode === "modpack"
            ? packReleases.map((release) => (
                <article key={release.versionNumber}>
                  <div className="flex flex-wrap items-baseline gap-2">
                    <span className="font-semibold text-white">v{release.versionNumber}</span>
                    <span className="text-xs text-slate-500">
                      {formatDate(release.datePublished)}
                    </span>
                  </div>
                  {release.changelog && (
                    <p className="mt-1 whitespace-pre-wrap text-sm text-slate-300">
                      {release.changelog}
                    </p>
                  )}
                </article>
              ))
            : modFeed.map((entry) => (
                <article key={`${entry.mod.projectId}-${entry.version}`}>
                  <div className="flex flex-wrap items-baseline gap-2">
                    <span className="font-semibold text-white">{entry.mod.name}</span>
                    <span className="text-xs text-slate-500">
                      {entry.version} &middot; {formatDate(entry.date)}
                    </span>
                  </div>
                  <p className="mt-1 text-xs uppercase tracking-wide text-slate-500">
                    Latest version notes
                  </p>
                  <p className="mt-1 whitespace-pre-wrap text-sm text-slate-300">
                    {entry.changelog}
                  </p>
                </article>
              ))}
        </div>
        {showPeek && <div className="category-peek-fade" aria-hidden="true" />}
      </div>
    </div>
  );
}
