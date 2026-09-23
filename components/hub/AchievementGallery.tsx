"use client";

import { useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
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

// Same hold-to-reveal ring/tooltip as AdminPanel.tsx's AchievementLabel
// (reusing its admin-hint-* CSS for a consistent feel) — a tile's title and
// description are both truncated to one line to fit the grid, so this is
// the way to read the full text without redesigning the tile itself. Every
// tile gets it uniformly, not just ones that happen to overflow, so the
// interaction stays predictable across the whole gallery.
const ACHIEVEMENT_HINT_HOLD_MS = 1000;
const ACHIEVEMENT_HINT_RING_CIRCUMFERENCE = 2 * Math.PI * 6;
// Matches the tooltip's own w-56.
const ACHIEVEMENT_HINT_TOOLTIP_WIDTH_PX = 224;
const ACHIEVEMENT_HINT_TOOLTIP_MARGIN_PX = 8;

function AchievementTile({
  achievement,
  isUnlocked,
}: {
  achievement: AchievementDef;
  isUnlocked: boolean;
}) {
  const hideDetails = achievement.secret && !isUnlocked;
  const [hovering, setHovering] = useState(false);
  const [ready, setReady] = useState(false);
  // The tile's own rect at the moment the tooltip opens — left/top are
  // recomputed into a tooltip position below, not stored as the tooltip's
  // position directly, since which side it opens on can flip after mount.
  const [tileRect, setTileRect] = useState<{ left: number; top: number; bottom: number } | null>(null);
  const [placeAbove, setPlaceAbove] = useState(false);
  const tileRef = useRef<HTMLDivElement>(null);
  const tooltipRef = useRef<HTMLDivElement>(null);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => () => { if (timerRef.current) clearTimeout(timerRef.current); }, []);

  function dismiss() {
    if (timerRef.current) clearTimeout(timerRef.current);
    setHovering(false);
    setReady(false);
    setTileRect(null);
    setPlaceAbove(false);
  }

  function handleEnter() {
    setHovering(true);
    timerRef.current = setTimeout(() => {
      setReady(true);
      // Portaled to <body> and positioned in viewport coordinates (position:
      // fixed) instead of nesting inside the tile — the gallery card and its
      // collapse panel both clip overflow, so a tooltip anchored inside them
      // gets cut off at the card's own edge.
      const rect = tileRef.current?.getBoundingClientRect();
      if (rect) setTileRect({ left: rect.left, top: rect.top, bottom: rect.bottom });
    }, ACHIEVEMENT_HINT_HOLD_MS);
  }
  // Touch devices have no hover — a tap-and-hold does the same job.
  // preventDefault keeps the hold from also triggering a text-selection
  // callout on release.
  function handleTouchStart(e: React.TouchEvent) {
    e.preventDefault();
    handleEnter();
  }

  // A fixed-position tooltip doesn't track the page scrolling under it, so
  // dismiss rather than let it drift out of alignment with its tile.
  useEffect(() => {
    if (!ready) return;
    window.addEventListener("scroll", dismiss, true);
    window.addEventListener("resize", dismiss);
    return () => {
      window.removeEventListener("scroll", dismiss, true);
      window.removeEventListener("resize", dismiss);
    };
  }, [ready]);

  // Opens below the tile by default (the natural reading direction) and
  // only flips above once actually measured not to fit under the current
  // scroll position — e.g. hovering the bottom-most achievement while
  // scrolled near the bottom of the page. Runs before paint so the flip
  // itself never flashes the wrong placement first.
  useIsomorphicLayoutEffect(() => {
    if (!ready || !tileRect || placeAbove) return;
    const height = tooltipRef.current?.getBoundingClientRect().height ?? 0;
    if (tileRect.bottom + ACHIEVEMENT_HINT_TOOLTIP_MARGIN_PX + height > window.innerHeight) {
      setPlaceAbove(true);
    }
  }, [ready, tileRect, placeAbove]);

  const tooltipLeft = tileRect
    ? Math.min(
        Math.max(tileRect.left, ACHIEVEMENT_HINT_TOOLTIP_MARGIN_PX),
        window.innerWidth - ACHIEVEMENT_HINT_TOOLTIP_WIDTH_PX - ACHIEVEMENT_HINT_TOOLTIP_MARGIN_PX
      )
    : 0;
  const tooltipTop = tileRect
    ? placeAbove
      ? tileRect.top - ACHIEVEMENT_HINT_TOOLTIP_MARGIN_PX
      : tileRect.bottom + ACHIEVEMENT_HINT_TOOLTIP_MARGIN_PX
    : 0;

  return (
    <div
      ref={tileRef}
      className={`relative flex items-center gap-2 rounded-lg border p-2 text-xs ${
        isUnlocked ? "border-[var(--outpost-accent-soft)] bg-white/5" : "border-white/10 opacity-50"
      }`}
      onMouseEnter={handleEnter}
      onMouseLeave={dismiss}
      onTouchStart={handleTouchStart}
      onTouchEnd={dismiss}
      onTouchCancel={dismiss}
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
      {hovering && !ready && (
        <svg
          className="admin-hint-ring absolute right-1.5 top-1.5 h-3 w-3 shrink-0"
          viewBox="0 0 16 16"
          aria-hidden="true"
        >
          <circle cx="8" cy="8" r="6" fill="none" stroke="currentColor" strokeWidth="2" className="text-white/15" />
          <circle
            cx="8"
            cy="8"
            r="6"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeDasharray={ACHIEVEMENT_HINT_RING_CIRCUMFERENCE}
            className="admin-hint-ring-fill text-[var(--outpost-accent)]"
          />
        </svg>
      )}
      {ready &&
        tileRect &&
        typeof document !== "undefined" &&
        createPortal(
          <div
            ref={tooltipRef}
            role="tooltip"
            className={`admin-hint-tooltip pointer-events-none fixed z-[999] w-56 rounded-md border border-white/15 bg-[#1c140d] px-2.5 py-1.5 text-[0.7rem] font-normal leading-snug text-slate-200 shadow-lg ${
              placeAbove ? "-translate-y-full" : ""
            }`}
            style={{ left: tooltipLeft, top: tooltipTop }}
          >
            <p className="font-semibold text-white">{hideDetails ? "???" : achievement.title}</p>
            <p className="mt-0.5 text-slate-300">{hideDetails ? "A hidden secret." : achievement.description}</p>
          </div>,
          document.body
        )}
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
  const { achievementIsDefault } = useAchievements();

  const { pinned, categoryGroups } = useMemo(() => {
    const byCategory = new Map<AchievementCategory, AchievementDef[]>();
    const pinnedItems: AchievementDef[] = [];
    let lockedSecretCount = 0;
    for (const a of visible) {
      if (a.category === "secrets" && !unlocked.has(a.id)) {
        lockedSecretCount++;
        continue; // locked secrets are represented by anonymous slots below, not listed individually
      }
      // Pinned ahead of every category — see admin-config.ts's
      // achievementDefault — for odds-and-ends like window resizing or an
      // old cheat code that don't really belong to any one category.
      if (achievementIsDefault(a.id)) {
        pinnedItems.push(a);
        continue;
      }
      if (!byCategory.has(a.category)) byCategory.set(a.category, []);
      byCategory.get(a.category)!.push(a);
    }
    const visibleLockedSecrets = Math.min(lockedSecretCount, MAX_VISIBLE_LOCKED_SECRETS);
    if (visibleLockedSecrets > 0) {
      if (!byCategory.has("secrets")) byCategory.set("secrets", []);
    }
    // Completed achievements float to the top of each group (stable sort,
    // so relative catalog order is otherwise preserved) — a visitor only
    // needs to look toward the bottom of a group to find what's left.
    const byUnlockedFirst = (a: AchievementDef, b: AchievementDef) =>
      Number(unlocked.has(b.id)) - Number(unlocked.has(a.id));
    pinnedItems.sort(byUnlockedFirst);
    for (const items of byCategory.values()) items.sort(byUnlockedFirst);
    return {
      pinned: pinnedItems,
      categoryGroups: CATEGORY_ORDER.filter((c) => byCategory.has(c)).map((c) => ({
        category: c,
        items: byCategory.get(c)!,
        lockedPlaceholders: c === "secrets" ? visibleLockedSecrets : 0,
      })),
    };
  }, [visible, unlocked, achievementIsDefault]);

  return (
    <div className="space-y-4">
      {pinned.length > 0 && (
        <div>
          <h4 className="mb-2 text-[0.7rem] font-bold uppercase tracking-wider text-white/40">Default</h4>
          <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
            {pinned.map((achievement) => (
              <AchievementTile
                key={achievement.id}
                achievement={achievement}
                isUnlocked={unlocked.has(achievement.id)}
              />
            ))}
          </div>
        </div>
      )}
      {categoryGroups.map((group) => (
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
