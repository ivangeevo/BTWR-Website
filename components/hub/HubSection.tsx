"use client";

import { useCallback, useEffect, useLayoutEffect, useRef, useState } from "react";
import Reveal from "@/components/Reveal";
import type { Mod, PackRelease } from "@/lib/mods";
import { ACHIEVEMENTS } from "./achievements-catalog";
import { AchievementsProvider, useAchievements } from "./AchievementsProvider";
import AccomplishmentsSection from "./AccomplishmentsSection";
import AchievementToastStack from "./AchievementToastStack";
import AchievementGallery from "./AchievementGallery";
import Campfire from "./Campfire";
import CraftingCard from "./CraftingCard";
import DailyBriefing from "./DailyBriefing";
import FirstIronTool from "./FirstIronTool";
import Gathering from "./Gathering";
import OutpostCorners from "./OutpostCorners";
import OutpostSettings from "./OutpostSettings";
import PatchNotes from "./PatchNotes";
import Ponder from "./Ponder";
import PrestigeBadge from "./PrestigeBadge";
import Priorities from "./Priorities";
import GuessTheMod from "./GuessTheMod";
import ResourceToolStrip from "./ResourceToolStrip";
import TierRevealNotice from "./TierRevealNotice";
import TierTip from "./TierTip";
import UpgradesBadge from "./UpgradesBadge";
import YourProgressSection from "./YourProgressSection";
import { type ModuleId } from "./module-registry";
import { SKINS_BY_ID } from "./tier2";

// Gates a module's visibility by its admin-configured tier assignment
// (default placement lives in module-registry.ts's DEFAULT_MODULE_TIER) —
// the one, single place this decision gets made, instead of a scattered
// `{tier2Unlocked && <X/>}` per module. Not used for the tier-1-only
// Achievement Gallery preview (its rule is inverted — hidden once a LATER
// tier unlocks, not shown once ITS tier unlocks) or TierRevealNotice (fires
// generically off its own tier-transition detection, not a module gate).
function ModuleGate({ id, children }: { id: ModuleId; children: React.ReactNode }) {
  const { isTierUnlocked, moduleTierId } = useAchievements();
  if (!isTierUnlocked(moduleTierId(id))) return null;
  return <>{children}</>;
}

// Maps a main-grid module id to its actual card, with whatever props it
// needs — kept as one lookup rather than a component-id map so the
// mods/packReleases props each card needs individually stay simple to
// thread through. Only covers ids that appear in DEFAULT_CARD_ORDER
// (module-registry.ts) — the full-width utility rows (tier-tip,
// resource-tool-strip) and the two full-width sections below the grid are
// rendered separately in HubBody/OutpostFrame, never through this.
function renderCard(id: ModuleId, mods: Mod[], packReleases: PackRelease[]): React.ReactNode {
  switch (id) {
    case "ponder":
      return <Ponder />;
    case "daily-briefing":
      return <DailyBriefing mods={mods} />;
    case "campfire":
      return <Campfire />;
    case "gathering":
      return <Gathering />;
    case "patch-notes":
      return <PatchNotes mods={mods} packReleases={packReleases} />;
    case "first-iron-tool":
      return <FirstIronTool />;
    case "priorities":
      return <Priorities />;
    case "crafting":
      return <CraftingCard />;
    case "guess-the-mod":
      return <GuessTheMod mods={mods} />;
    default:
      return null;
  }
}

// The card grid is one modular 2-column layout — every card the same size,
// laid out row-major — rather than two independently-stacked columns, so a
// card can be dragged to any position (including diagonally, into the other
// visual column) and the rest of the grid shifts to make room.
//
// Drag is entirely pointer-events-based (not native HTML5 draggable) so the
// pickup/follow/drop can be real CSS-animated motion of the actual card
// instead of the browser's own translucent "after-image" drag ghost — and so
// a press-and-hold is required before a drag starts at all, which matters
// because cards contain their own interactive bits (buttons, checkboxes,
// the quiz) that need ordinary quick taps/clicks to keep working. Pointer
// Events unify mouse/touch/pen, so this also happens to add touch support,
// which the old native-DnD version never had.
//
// Geometry/hit-testing for "which slot is the pointer over right now" can't
// be done by the target slot itself receiving its own pointer events (the
// dragged slot holds pointer capture, so only IT keeps receiving move/up
// events even once the cursor is physically over a different card) — so the
// dragged slot resolves the element under the cursor itself via
// elementFromPoint + the data-drag-index attribute every slot carries, and
// reports the hit up through onHover to HubBody, which owns dragIndex/
// overIndex and re-passes the result down as props so the actual target slot
// can render its own highlight.
const HOLD_MS = 500;
const MOVE_CANCEL_PX = 8;

function resolveDragIndexAt(x: number, y: number): number | null {
  const el = document.elementFromPoint(x, y);
  const slot = el instanceof Element ? el.closest<HTMLElement>("[data-drag-index]") : null;
  if (!slot) return null;
  const index = Number(slot.dataset.dragIndex);
  return Number.isFinite(index) ? index : null;
}

// Only attaches drag behavior once the "card-reorder" upgrade is owned (see
// upgrade-catalog.ts) — otherwise this is a transparent passthrough, so a
// visitor who hasn't bought it sees the exact same static grid as before.
function DraggableSlot({
  index,
  enabled,
  isDropTarget,
  onBeginDrag,
  onHover,
  onEndDrag,
  onCancelDrag,
  children,
}: {
  index: number;
  enabled: boolean;
  isDropTarget: boolean;
  onBeginDrag: (index: number) => void;
  onHover: (index: number | null) => void;
  onEndDrag: (from: number) => void;
  onCancelDrag: () => void;
  children: React.ReactNode;
}) {
  const nodeRef = useRef<HTMLDivElement | null>(null);
  const holdTimer = useRef<number | null>(null);
  const dropTimer = useRef<number | null>(null);
  const pointerStart = useRef<{ x: number; y: number } | null>(null);
  // Where this card was still visually sitting (on screen, post-transform)
  // at the instant it was dropped — set right before the reorder commits,
  // consumed by the FLIP-correction layout effect below once the reorder
  // has actually moved this slot to its new grid cell.
  const flipFrom = useRef<{ left: number; top: number } | null>(null);
  const [lifted, setLifted] = useState(false);
  // True for a brief window right after a drop — swaps in a bouncier,
  // slightly slower transition than the snappy one used while actively
  // tracking the pointer, so the card visibly "plops" into its new spot
  // instead of just snapping there at the same speed it was following at.
  const [plopping, setPlopping] = useState(false);
  const [offset, setOffset] = useState({ dx: 0, dy: 0 });

  useEffect(
    () => () => {
      if (holdTimer.current !== null) window.clearTimeout(holdTimer.current);
      if (dropTimer.current !== null) window.clearTimeout(dropTimer.current);
    },
    [],
  );

  // Runs after every commit, but only does anything right after a drop: the
  // offset a card was released at is relative to its OLD grid slot, so
  // applying it unchanged once the reorder has moved this same component
  // (matched by its stable `id` key) into a NEW slot launches it sideways —
  // most visibly on a left/right or diagonal move, where the old and new
  // slots sit far apart. Correct for that with a FLIP: the instant this
  // slot lands in its new position, jump the transform (no transition) so
  // it still LOOKS like it's exactly where it visually was a moment ago,
  // then release that on the next frame so the already-active `plopping`
  // transition animates the true slide from there into the new slot.
  useLayoutEffect(() => {
    const from = flipFrom.current;
    const node = nodeRef.current;
    if (!from || !node) return;
    flipFrom.current = null;
    const to = node.getBoundingClientRect();
    const dx = from.left - to.left;
    const dy = from.top - to.top;
    if (dx === 0 && dy === 0) return;
    node.style.transition = "none";
    node.style.transform = `translate3d(${dx}px, ${dy}px, 0) scale(1.06)`;
    // Forces the browser to commit the jump above in this paint before the
    // rAF callback below hands it back to the CSS-driven settle transition.
    void node.offsetHeight;
    requestAnimationFrame(() => {
      node.style.transition = "";
      node.style.transform = "";
    });
  });

  if (!enabled) return <>{children}</>;

  function clearHold() {
    if (holdTimer.current !== null) {
      window.clearTimeout(holdTimer.current);
      holdTimer.current = null;
    }
  }

  function reset() {
    clearHold();
    setLifted(false);
    setOffset({ dx: 0, dy: 0 });
    pointerStart.current = null;
  }

  return (
    <div
      ref={nodeRef}
      data-drag-index={index}
      onPointerDown={(e) => {
        if (e.pointerType === "mouse" && e.button !== 0) return;
        pointerStart.current = { x: e.clientX, y: e.clientY };
        const pointerId = e.pointerId;
        const target = e.currentTarget;
        clearHold();
        holdTimer.current = window.setTimeout(() => {
          holdTimer.current = null;
          setLifted(true);
          onBeginDrag(index);
          target.setPointerCapture(pointerId);
        }, HOLD_MS);
      }}
      onPointerMove={(e) => {
        if (!pointerStart.current) return;
        const dx = e.clientX - pointerStart.current.x;
        const dy = e.clientY - pointerStart.current.y;
        if (!lifted) {
          // Still waiting out the hold — a real drag attempt stays put;
          // this much movement means it was a scroll/swipe instead.
          if (Math.hypot(dx, dy) > MOVE_CANCEL_PX) clearHold();
          return;
        }
        e.preventDefault();
        setOffset({ dx, dy });
        onHover(resolveDragIndexAt(e.clientX, e.clientY));
      }}
      onPointerUp={(e) => {
        const wasLifted = lifted;
        if (wasLifted && nodeRef.current) {
          flipFrom.current = nodeRef.current.getBoundingClientRect();
        }
        reset();
        if (wasLifted) {
          onEndDrag(index);
          setPlopping(true);
          if (dropTimer.current !== null) window.clearTimeout(dropTimer.current);
          dropTimer.current = window.setTimeout(() => {
            dropTimer.current = null;
            setPlopping(false);
          }, 260);
        }
        e.currentTarget.releasePointerCapture(e.pointerId);
      }}
      onPointerCancel={(e) => {
        const wasLifted = lifted;
        reset();
        if (wasLifted) onCancelDrag();
        e.currentTarget.releasePointerCapture(e.pointerId);
      }}
      style={
        lifted
          ? {
              transform: `translate3d(${offset.dx}px, ${offset.dy}px, 0) scale(1.06)`,
              touchAction: "none",
              // Otherwise this element — sitting right on top at z-50, under
              // the cursor by construction — is what elementFromPoint hits
              // every time, so resolveDragIndexAt always resolves back to
              // its own index and the drop looks like it does nothing.
              // Pointer capture still routes this element's own move/up/
              // cancel events to it regardless of pointer-events.
              pointerEvents: "none",
            }
          : undefined
      }
      // Two different transitions share the transform property: a fast,
      // linear-ish one that's on by default (covers the pickup pop and keeps
      // up with continuous pointermove updates while dragging), and a
      // slower, overshooting one that swaps in for `plopping`'s brief window
      // right after release so the card visibly bounces into its new spot
      // instead of snapping there at drag speed.
      className={`relative rounded-xl will-change-transform ${
        plopping
          ? "transition-transform duration-[260ms] ease-[cubic-bezier(0.34,1.56,0.64,1)]"
          : "transition-transform duration-[120ms] ease-out"
      } ${lifted ? "z-50 cursor-grabbing select-none shadow-2xl shadow-black/50" : "cursor-grab"} ${
        isDropTarget ? "outline outline-2 outline-offset-2 outline-[var(--outpost-accent)]" : ""
      }`}
    >
      <span
        className="pointer-events-none absolute right-2.5 top-2.5 z-10 text-xs text-white/25"
        aria-hidden="true"
        title="Press and hold to reorder"
      >
        {"\u{2630}"}
      </span>
      {children}
    </div>
  );
}

// Sits after the last card in the grid so a drag has somewhere to land when
// the target is "move this card to the very end" — without it, dropping past
// the last DraggableSlot has no droppable element under the cursor at all.
// Occupies its own grid cell (empty when the card count is odd, or a fresh
// row by itself when even) exactly like DraggableSlot's outline, so the same
// "drop here" affordance covers genuinely empty grid space too. Doesn't need
// its own pointer handlers — the dragged slot's own elementFromPoint hit-test
// finds this via its data-drag-index just like any card slot.
function DropzoneEnd({ enabled, count, isDropTarget }: { enabled: boolean; count: number; isDropTarget: boolean }) {
  if (!enabled) return null;

  return (
    <div
      data-drag-index={count}
      aria-hidden="true"
      className={`h-16 rounded-xl border-2 border-dashed transition-colors ${
        isDropTarget ? "border-[var(--outpost-accent)] bg-white/5" : "border-transparent"
      }`}
    />
  );
}

// Cosmetic-only "rank" derived from achievement completion — no separate
// tracking, just a label over the same unlocked/total ratio already shown
// as a fraction, to give the progress readout more weight. Deliberately
// its own small vocabulary (Wanderer/Settler/Homesteader/Founding Member)
// rather than reusing tier 2's rank titles (Newcomer/Veteran/Outpost
// Legend) — those mean something much bigger (deep XP/level progress
// across all 136 achievements), so sharing words with this 12-achievement,
// tier-1-only badge would make "Outpost Legend" mean two very different
// things depending on which readout you're looking at.
function rankForProgress(unlockedCount: number, total: number): string {
  if (total === 0) return "Wanderer";
  const ratio = unlockedCount / total;
  if (ratio >= 1) return "Founding Member";
  if (ratio >= 0.7) return "Homesteader";
  if (ratio >= 0.4) return "Settler";
  return "Wanderer";
}

// Deliberately tier-agnostic — no XP, no level badge, nothing tier-2-only.
// Level/XP is a genuinely different kind of progress (see rankForProgress's
// comment above) and now reads entirely from YourProgressSection instead,
// so this stays the same plain achievement-completion bar for everyone.
function HubHeader() {
  const { unlocked, mounted } = useAchievements();
  const totalUnlocked = unlocked.size;
  const totalAchievements = ACHIEVEMENTS.length;
  const percent = mounted ? Math.round((totalUnlocked / totalAchievements) * 100) : 0;

  return (
    <div id="outpost" className="relative scroll-mt-6 border-b border-white/10 px-6 py-8 text-center sm:py-10">
      <OutpostSettings />
      {/* Upgrades/Prestige moved here from the main-grid card layout — see
          module-registry.ts's comment on why they're no longer in MODULES.
          Mirrors OutpostSettings' gear on the opposite corner; each badge
          renders nothing until its own Feature toggle/tier unlocks it. */}
      <div className="absolute left-4 top-4 flex items-center gap-2 sm:left-5 sm:top-5">
        <UpgradesBadge />
        <PrestigeBadge />
      </div>
      <span className="outpost-status-tag">
        <span className="outpost-status-dot outpost-status-dot-online" aria-hidden="true" />
        Outpost Online
      </span>
      <h2 className="mt-4 font-heading text-3xl font-extrabold tracking-wide text-white sm:text-4xl">
        The Outpost
      </h2>
      <p className="mx-auto mt-2 max-w-xl text-white/70">
        Your basecamp for BTWR — spotlights, secrets, and a quiz that remembers you.
      </p>
      {mounted && (
        <div className="mx-auto mt-5 max-w-xs">
          <div className="flex items-center justify-between text-xs font-semibold uppercase tracking-wider text-white/50">
            {/* Plain live count, not <CountUp> — CountUp locks itself after
                its first scroll-into-view animation, but this number keeps
                changing all session long as achievements unlock. */}
            <span>{rankForProgress(totalUnlocked, totalAchievements)}</span>
            <span className="text-[var(--outpost-accent)]">
              {totalUnlocked}/{totalAchievements}
            </span>
          </div>
          <div className="outpost-progress-track mt-1.5">
            <div className="outpost-progress-fill" style={{ width: `${percent}%` }} />
          </div>
        </div>
      )}
    </div>
  );
}

function HubBody({ mods, packReleases }: { mods: Mod[]; packReleases: PackRelease[] }) {
  // Guess the Mod and Patch Notes are permanent cards here regardless of
  // tier — the old tier-2 side menu that used to take over Guess the Mod's
  // spot is gone, so nothing else duplicates or replaces it. Only the
  // Achievements gallery still steps aside once tier 2 unlocks, since the
  // full catalog moves into its own Accomplishments section below.
  const { tier2Unlocked, cardOrder, reorderCard, upgrades } = useAchievements();
  const reorderEnabled = upgrades.purchased.includes("card-reorder");

  // dragIndex/overIndex are lifted up here (rather than living inside
  // DraggableSlot) because the drop target needs to render ITS OWN highlight
  // from the dragged slot's hit-testing — see the drag-system comment above
  // DraggableSlot. overIndexRef mirrors the state so handleEndDrag (called
  // from the dragged slot's pointerup, which closes over whatever `index`
  // that slot was created with) always reads the latest hover target instead
  // of a stale one from whenever its own render happened.
  const [dragIndex, setDragIndex] = useState<number | null>(null);
  const [overIndex, setOverIndexState] = useState<number | null>(null);
  const overIndexRef = useRef<number | null>(null);
  const setOverIndex = useCallback((index: number | null) => {
    overIndexRef.current = index;
    setOverIndexState(index);
  }, []);
  const handleBeginDrag = useCallback((index: number) => setDragIndex(index), []);
  const handleEndDrag = useCallback(
    (from: number) => {
      const to = overIndexRef.current;
      if (to !== null && to !== from) reorderCard(from, to);
      setDragIndex(null);
      setOverIndex(null);
    },
    [reorderCard, setOverIndex],
  );
  const handleCancelDrag = useCallback(() => {
    setDragIndex(null);
    setOverIndex(null);
  }, [setOverIndex]);

  return (
    <div
      className={`mx-auto grid max-w-5xl gap-6 sm:grid-cols-2 ${
        tier2Unlocked ? "rounded-xl border p-4 sm:p-6" : ""
      }`}
      style={
        tier2Unlocked
          ? ({
              borderColor: "var(--outpost-accent-soft)",
              backgroundColor: "rgba(0, 0, 0, 0.12)",
            } as React.CSSProperties)
          : undefined
      }
    >
      <ModuleGate id="tier-tip">
        <TierTip />
      </ModuleGate>
      <ModuleGate id="resource-tool-strip">
        <ResourceToolStrip />
      </ModuleGate>
      {/* One modular grid — every card is the same size, so any card can be
          dragged to any other card's spot (including diagonally, across what
          used to be a fixed left/right column split) and the rest reflow to
          make room. See DraggableSlot/DropzoneEnd above. */}
      {cardOrder.map((id, index) => (
        <ModuleGate key={id} id={id}>
          <DraggableSlot
            index={index}
            enabled={reorderEnabled}
            isDropTarget={overIndex === index && dragIndex !== index}
            onBeginDrag={handleBeginDrag}
            onHover={setOverIndex}
            onEndDrag={handleEndDrag}
            onCancelDrag={handleCancelDrag}
          >
            {renderCard(id, mods, packReleases)}
          </DraggableSlot>
        </ModuleGate>
      ))}
      <DropzoneEnd enabled={reorderEnabled} count={cardOrder.length} isDropTarget={overIndex === cardOrder.length} />
      {!tier2Unlocked && (
        <div className="sm:col-span-2">
          <AchievementGallery tier1Only />
        </div>
      )}
    </div>
  );
}

// The whole card's accent (header tag, corners, progress bar, every shared
// panel's hover glow) follows whichever skin is picked in the Tier 2 panel
// once tier 2 is unlocked — before that, .outpost-frame's own CSS defaults
// (fixed amber) apply untouched, so a tier-1-only visitor sees no change.
function OutpostFrame({ mods, packReleases }: { mods: Mod[]; packReleases: PackRelease[] }) {
  const { tier2Unlocked, tier2, settings } = useAchievements();
  const skin = tier2Unlocked ? SKINS_BY_ID[tier2.skin] ?? SKINS_BY_ID.iron : null;
  const style = skin
    ? ({
        "--outpost-accent": skin.accent,
        "--outpost-accent-soft": skin.accentSoft,
        "--outpost-accent-dark": skin.accentDark,
      } as React.CSSProperties)
    : undefined;

  return (
    <div
      className="outpost-frame relative mx-auto w-full max-w-6xl"
      style={style}
      data-reduced-motion={settings.reducedMotion || undefined}
    >
      <OutpostCorners />
      <HubHeader />
      <div className="px-3 py-8 sm:py-10">
        <HubBody mods={mods} packReleases={packReleases} />
      </div>
      <TierRevealNotice />
      <ModuleGate id="your-progress">
        <YourProgressSection />
      </ModuleGate>
      <ModuleGate id="accomplishments">
        <AccomplishmentsSection />
      </ModuleGate>
      <AchievementToastStack />
    </div>
  );
}

export default function HubSection({
  mods,
  packReleases,
}: {
  mods: Mod[];
  packReleases: PackRelease[];
}) {
  return (
    <AchievementsProvider>
      <Reveal>
        <section className="outpost-zone relative overflow-hidden px-3 py-10 sm:px-4 sm:py-14">
          <OutpostFrame mods={mods} packReleases={packReleases} />
        </section>
      </Reveal>
    </AchievementsProvider>
  );
}
