"use client";

import { useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import {
  ACHIEVEMENTS,
  CATEGORY_LABELS,
  CATEGORY_ORDER,
  type AchievementCategory,
  type AchievementDef,
} from "./achievements-catalog";
import { useAchievements } from "./AchievementsProvider";

// Same measure-then-animate recipe as app/mods/page.tsx and PatchNotes.tsx.
const useIsomorphicLayoutEffect =
  typeof window !== "undefined" ? useLayoutEffect : useEffect;

// However many locked secrets actually remain (across both tiers, once
// tier 2 is visible), the gallery only ever shows this many anonymous
// "???" slots for them — the true remaining count stays hidden.
const MAX_VISIBLE_LOCKED_SECRETS = 3;

function AchievementTile({
  achievement,
  isUnlocked,
}: {
  achievement: AchievementDef;
  isUnlocked: boolean;
}) {
  const hideDetails = achievement.secret && !isUnlocked;
  return (
    <div
      className={`flex items-center gap-2 rounded-lg border p-2 text-xs ${
        isUnlocked ? "border-[var(--outpost-accent-soft)] bg-white/5" : "border-white/10 opacity-50"
      }`}
    >
      <span className="text-lg leading-none">{hideDetails ? "❓" : achievement.icon}</span>
      <div className="min-w-0">
        <p className="truncate font-semibold text-slate-200">
          {hideDetails ? "???" : achievement.title}
        </p>
        <p className="truncate text-slate-400">
          {hideDetails ? "A hidden secret." : achievement.description}
        </p>
      </div>
    </div>
  );
}

// Ledger Entries render as a compact progress readout, never as up-to-975
// individual DOM tiles — the point is a sense of scale ("214/975"), not a
// literal checklist. Shows whichever metrics are closest to their next rank.
function LedgerSection() {
  const { ledgerProgress } = useAchievements();
  const upNext = [...ledgerProgress.perMetric]
    .filter((m) => m.nextThreshold !== null)
    .sort((a, b) => b.value / (b.nextThreshold ?? 1) - a.value / (a.nextThreshold ?? 1))
    .slice(0, 4);

  return (
    <div>
      <div className="mb-2 flex items-center justify-between">
        <h4 className="text-[0.7rem] font-bold uppercase tracking-wider text-white/40">Ledger Entries</h4>
        <span className="rounded-full bg-white/10 px-2 py-0.5 text-xs font-semibold text-[var(--outpost-accent)]">
          {ledgerProgress.unlockedCount}/{ledgerProgress.total}
        </span>
      </div>
      <p className="mb-2 text-xs text-slate-400">
        Every counter in the Outpost gets filed here too, numbered and without end.
      </p>
      <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
        {upNext.map((m) => (
          <div key={m.key} className="rounded-lg border border-white/10 p-2 text-xs">
            <p className="truncate font-semibold text-slate-200">
              {m.icon} {m.noun} #{m.rank + 1}
            </p>
            <p className="truncate text-slate-400">
              {m.value} / {m.nextThreshold}
            </p>
          </div>
        ))}
      </div>
    </div>
  );
}

function GalleryContent({
  visible,
  unlocked,
}: {
  visible: AchievementDef[];
  unlocked: Set<string>;
}) {
  const groups = useMemo(() => {
    const byCategory = new Map<AchievementCategory, AchievementDef[]>();
    let lockedSecretCount = 0;
    for (const a of visible) {
      if (a.category === "secrets" && !unlocked.has(a.id)) {
        lockedSecretCount++;
        continue; // locked secrets are represented by anonymous slots below, not listed individually
      }
      if (!byCategory.has(a.category)) byCategory.set(a.category, []);
      byCategory.get(a.category)!.push(a);
    }
    const visibleLockedSecrets = Math.min(lockedSecretCount, MAX_VISIBLE_LOCKED_SECRETS);
    if (visibleLockedSecrets > 0) {
      if (!byCategory.has("secrets")) byCategory.set("secrets", []);
    }
    return CATEGORY_ORDER.filter((c) => byCategory.has(c)).map((c) => ({
      category: c,
      items: byCategory.get(c)!,
      lockedPlaceholders: c === "secrets" ? visibleLockedSecrets : 0,
    }));
  }, [visible, unlocked]);

  return (
    <div className="space-y-4">
      {groups.map((group) => (
        <div key={group.category}>
          <h4 className="mb-2 text-[0.7rem] font-bold uppercase tracking-wider text-white/40">
            {CATEGORY_LABELS[group.category]}
          </h4>
          <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
            {group.items.map((achievement) => (
              <AchievementTile
                key={achievement.id}
                achievement={achievement}
                isUnlocked={unlocked.has(achievement.id)}
              />
            ))}
            {Array.from({ length: group.lockedPlaceholders }).map((_, i) => (
              <div
                key={`locked-secret-${i}`}
                className="flex items-center gap-2 rounded-lg border border-white/10 p-2 text-xs opacity-50"
              >
                <span className="text-lg leading-none">❓</span>
                <div className="min-w-0">
                  <p className="truncate font-semibold text-slate-200">???</p>
                  <p className="truncate text-slate-400">A hidden secret.</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}

export default function AchievementGallery({
  variant = "card",
  tier1Only = false,
}: {
  /** "card": collapsible card (tier-1 grid). "flat": always-open, no outer chrome (tier-2 dashboard tab). */
  variant?: "card" | "flat";
  /** Forces tier-1-only listing regardless of tier-2 status — used by the
   * original tier-1 hub, which stays exactly as it was (see
   * AccomplishmentsSection for tier 2's own, separate Achievements view). */
  tier1Only?: boolean;
}) {
  const { unlocked, mounted, tier2Unlocked, isTierUnlocked, achievementTierId } = useAchievements();
  const [open, setOpen] = useState(false);
  const [naturalHeight, setNaturalHeight] = useState(0);
  const contentRef = useRef<HTMLDivElement>(null);
  const showTier2 = tier2Unlocked && !tier1Only;

  useIsomorphicLayoutEffect(() => {
    const el = contentRef.current;
    if (!el) return;
    const recompute = () => setNaturalHeight(el.scrollHeight);
    recompute();
    window.addEventListener("resize", recompute);
    return () => window.removeEventListener("resize", recompute);
  }, [open, showTier2, unlocked.size]);

  // Tier 2's existence is itself a secret — its achievements aren't just
  // masked as "???", they're not listed at all until tier 2 unlocks (and
  // never in the tier-1 hub's own gallery, which stays tier-1-only always).
  // Visibility now routes through the admin-overridable tier assignment
  // (achievementTierId) rather than the catalog's hardcoded field directly,
  // so reassigning an achievement in the admin panel actually moves it.
  const visible = ACHIEVEMENTS.filter((a) => {
    const tierId = achievementTierId(a.id);
    return tier1Only ? tierId === "tier1" : isTierUnlocked(tierId);
  });
  const visibleUnlockedCount = visible.filter((a) => unlocked.has(a.id)).length;

  if (variant === "flat") {
    return (
      <div>
        <div className="flex items-center justify-end gap-2">
          <span className="rounded-full bg-white/10 px-2 py-0.5 text-xs font-semibold text-[var(--outpost-accent)]">
            {visibleUnlockedCount}/{visible.length} unlocked
          </span>
        </div>
        <div className="mt-4 space-y-4">
          <GalleryContent visible={visible} unlocked={unlocked} />
          {showTier2 && <LedgerSection />}
        </div>
      </div>
    );
  }

  const panelHeight = open ? naturalHeight : 0;

  return (
    <div className="outpost-panel rounded-xl">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        className="flex w-full items-center justify-between gap-3 px-5 py-4 text-left"
      >
        <span className="flex items-center gap-2">
          <h3 className="font-heading text-sm font-bold uppercase tracking-wider text-[var(--outpost-accent)]">
            Achievements
          </h3>
          {mounted && (
            <span className="rounded-full bg-white/10 px-2 py-0.5 text-xs font-semibold text-[var(--outpost-accent)]">
              {visibleUnlockedCount}/{visible.length}
            </span>
          )}
        </span>
        <svg
          className={`h-4 w-4 shrink-0 text-white/60 transition-transform duration-300 ${
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
      <div className="category-panel overflow-hidden" style={{ maxHeight: `${panelHeight}px` }}>
        <div ref={contentRef} className="space-y-4 px-5 pb-5">
          <GalleryContent visible={visible} unlocked={unlocked} />
          {showTier2 && <LedgerSection />}
        </div>
      </div>
    </div>
  );
}
