"use client";

import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { useAchievements } from "./AchievementsProvider";
import { STORAGE_KEY } from "./hub-storage";
import {
  FLAIR_BADGES,
  loreSnippetForLevel,
  PRESTIGE_LEVEL,
  SKINS,
} from "./tier2";

// Same measure-then-animate recipe used everywhere else in the hub.
const useIsomorphicLayoutEffect =
  typeof window !== "undefined" ? useLayoutEffect : useEffect;

function CollapsibleSubsection({
  title,
  badge,
  children,
}: {
  title: string;
  badge?: string;
  children: React.ReactNode;
}) {
  const [open, setOpen] = useState(false);
  const [naturalHeight, setNaturalHeight] = useState(0);
  const contentRef = useRef<HTMLDivElement>(null);

  useIsomorphicLayoutEffect(() => {
    const el = contentRef.current;
    if (!el) return;
    const recompute = () => setNaturalHeight(el.scrollHeight);
    recompute();
    window.addEventListener("resize", recompute);
    return () => window.removeEventListener("resize", recompute);
  }, [open]);

  return (
    <div className="mt-4 rounded-lg border border-white/10">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        className="flex w-full items-center justify-between gap-2 px-3 py-2.5 text-left"
      >
        <span className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-white/70">
          {title}
          {badge && (
            <span className="rounded-full bg-white/10 px-1.5 py-0.5 text-[0.65rem] text-white/50">
              {badge}
            </span>
          )}
        </span>
        <svg
          className={`h-3.5 w-3.5 shrink-0 text-white/50 transition-transform duration-300 ${
            open ? "rotate-180" : ""
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
      <div className="category-panel overflow-hidden" style={{ maxHeight: `${open ? naturalHeight : 0}px` }}>
        <div ref={contentRef} className="px-3 pb-3">
          {children}
        </div>
      </div>
    </div>
  );
}

function PrestigeButton({ onPrestige }: { onPrestige: () => void }) {
  const [confirming, setConfirming] = useState(false);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => () => { if (timerRef.current) clearTimeout(timerRef.current); }, []);

  function handleClick() {
    if (!confirming) {
      setConfirming(true);
      timerRef.current = setTimeout(() => setConfirming(false), 4000);
      return;
    }
    if (timerRef.current) clearTimeout(timerRef.current);
    setConfirming(false);
    onPrestige();
  }

  return (
    <div className="mt-4 flex items-center justify-between gap-3 rounded-lg border border-white/10 px-3 py-2.5">
      <p className="text-xs text-white/60">
        Max level reached. Prestige to reset your level for a permanent veteran badge.
      </p>
      <button
        type="button"
        onClick={handleClick}
        className={`shrink-0 rounded-lg border px-3 py-1.5 text-xs font-semibold transition-colors ${
          confirming
            ? "border-amber-400 bg-amber-950/60 text-amber-300"
            : "border-white/20 text-white/70 hover:border-white hover:text-white"
        }`}
      >
        {confirming ? "Confirm prestige?" : "Prestige"}
      </button>
    </div>
  );
}

function ExportImportSection() {
  const { recordExport, importState } = useAchievements();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [importError, setImportError] = useState<string | null>(null);

  function handleExport() {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return;
    const blob = new Blob([raw], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "btwr-outpost-save.json";
    a.click();
    URL.revokeObjectURL(url);
    recordExport();
  }

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    setImportError(null);
    const reader = new FileReader();
    reader.onload = () => {
      try {
        const parsed = JSON.parse(reader.result as string);
        // Applies in place (no reload) — see importState in
        // AchievementsProvider for why that matters for same-session
        // achievements like "Round Trip".
        if (!importState(parsed)) {
          setImportError("That file doesn't look like an Outpost save.");
        }
      } catch {
        setImportError("Couldn't read that file.");
      }
    };
    reader.readAsText(file);
  }

  return (
    <div className="mt-4 rounded-lg border border-white/10 px-3 py-2.5">
      <p className="text-xs font-semibold uppercase tracking-wider text-white/50">Save data</p>
      <p className="mt-1 text-xs text-white/50">
        Download your Outpost progress as a file, or restore one you saved earlier.
      </p>
      <div className="mt-2 flex gap-2">
        <button
          type="button"
          onClick={handleExport}
          className="rounded-lg border border-white/20 px-3 py-1.5 text-xs font-semibold text-white/70 transition-colors hover:border-white hover:text-white"
        >
          Export save
        </button>
        <button
          type="button"
          onClick={() => fileInputRef.current?.click()}
          className="rounded-lg border border-white/20 px-3 py-1.5 text-xs font-semibold text-white/70 transition-colors hover:border-white hover:text-white"
        >
          Import save
        </button>
        <input
          ref={fileInputRef}
          type="file"
          accept="application/json"
          className="hidden"
          onChange={handleFileChange}
        />
      </div>
      {importError && <p className="mt-2 text-xs text-red-400">{importError}</p>}
    </div>
  );
}

export default function Tier2Progression() {
  const { tier2, xpInfo, setSkin, prestige, unlocked, quiz, visits } = useAchievements();

  const unlockedSkins = SKINS.filter((s) => s.unlockLevel <= xpInfo.level);
  const earnedBadges = FLAIR_BADGES.filter((b) => b.unlockLevel <= xpInfo.level);
  const canPrestige = xpInfo.level >= PRESTIGE_LEVEL;

  const loreEntries: { level: number; text: string }[] = [];
  for (let lvl = 2; lvl <= tier2.loreRevealedLevel; lvl++) {
    loreEntries.push({ level: lvl, text: loreSnippetForLevel(lvl) });
  }

  return (
    <div>
      {earnedBadges.length > 0 && (
        <div>
          <p className="text-xs font-semibold uppercase tracking-wider text-white/50">Flair</p>
          <div className="mt-2 flex flex-wrap gap-2">
            {earnedBadges.map((b) => (
              <span key={b.name} className="tier2-flair-badge" title={b.name}>
                {b.icon}
              </span>
            ))}
          </div>
        </div>
      )}

      {unlockedSkins.length > 1 && (
        <div className="mt-5">
          <p className="text-xs font-semibold uppercase tracking-wider text-white/50">
            Outpost skin
          </p>
          <div className="mt-2 flex flex-wrap gap-2">
            {unlockedSkins.map((s) => (
              <button
                key={s.id}
                type="button"
                onClick={() => setSkin(s.id)}
                className={`rounded-full border px-3 py-1 text-xs font-semibold transition-colors ${
                  tier2.skin === s.id
                    ? "border-white text-white"
                    : "border-white/20 text-white/50 hover:text-white"
                }`}
                style={{ backgroundColor: tier2.skin === s.id ? s.accentSoft : "transparent" }}
              >
                {s.name}
              </button>
            ))}
          </div>
        </div>
      )}

      {xpInfo.level >= 4 && (
        <CollapsibleSubsection title="Stats Logbook">
          <dl className="grid grid-cols-2 gap-x-4 gap-y-2 text-xs">
            <div>
              <dt className="text-white/40">Visit streak</dt>
              <dd className="font-semibold text-white">{visits.streakDays} days</dd>
            </div>
            <div>
              <dt className="text-white/40">Quiz questions answered</dt>
              <dd className="font-semibold text-white">{quiz.totalAnswered}</dd>
            </div>
            <div>
              <dt className="text-white/40">Quiz accuracy</dt>
              <dd className="font-semibold text-white">
                {quiz.totalAnswered > 0
                  ? Math.round((quiz.totalCorrect / quiz.totalAnswered) * 100)
                  : 0}
                %
              </dd>
            </div>
            <div>
              <dt className="text-white/40">Best streak</dt>
              <dd className="font-semibold text-white">{quiz.bestStreak}</dd>
            </div>
            <div>
              <dt className="text-white/40">Perfect rounds</dt>
              <dd className="font-semibold text-white">{quiz.perfectRounds}</dd>
            </div>
            <div>
              <dt className="text-white/40">Achievements unlocked</dt>
              <dd className="font-semibold text-white">{unlocked.size}</dd>
            </div>
          </dl>
        </CollapsibleSubsection>
      )}

      {loreEntries.length > 0 && (
        <CollapsibleSubsection title="Outpost Logbook" badge={`${loreEntries.length}`}>
          <ul className="space-y-2">
            {loreEntries
              .slice()
              .reverse()
              .map((entry) => (
                <li key={entry.level} className="text-xs text-white/60">
                  <span className="mr-1.5 font-semibold text-white/40">Lv.{entry.level}</span>
                  {entry.text}
                </li>
              ))}
          </ul>
        </CollapsibleSubsection>
      )}

      {canPrestige && <PrestigeButton onPrestige={prestige} />}

      <ExportImportSection />

      {earnedBadges.length === 0 && unlockedSkins.length <= 1 && xpInfo.level < 4 && !canPrestige && (
        <p className="text-sm text-white/50">
          Keep earning XP — skins, flair, and a stats logbook unlock as you level up.
        </p>
      )}
    </div>
  );
}
