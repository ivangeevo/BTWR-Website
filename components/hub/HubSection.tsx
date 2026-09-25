"use client";

import Reveal from "@/components/Reveal";
import type { Mod, PackRelease } from "@/lib/mods";
import { ACHIEVEMENTS } from "./achievements-catalog";
import { AchievementsProvider, useAchievements } from "./AchievementsProvider";
import AccomplishmentsSection from "./AccomplishmentsSection";
import AchievementToastStack from "./AchievementToastStack";
import Campfire from "./Campfire";
import CraftingCard from "./CraftingCard";
import DailyBriefing from "./DailyBriefing";
import Gathering from "./Gathering";
import OutpostCorners from "./OutpostCorners";
import OutpostSettings from "./OutpostSettings";
import OutpostTabs, { OutpostTabPanel, useOutpostTabs } from "./OutpostTabs";
import PatchNotes from "./PatchNotes";
import Ponder from "./Ponder";
import PrestigeBadge from "./PrestigeBadge";
import GuessTheMod from "./GuessTheMod";
import ResourceToolStrip from "./ResourceToolStrip";
import TierRevealNotice from "./TierRevealNotice";
import TierTip from "./TierTip";
import UpgradesBadge from "./UpgradesBadge";
import YourProgressSection from "./YourProgressSection";
import { type ModuleId } from "./module-registry";
import { EngineProvider, useEngine } from "./engine/ui/EngineProvider";
import { EngineToasts, EurekaLayer } from "./engine/ui/overlays/EngineOverlays";
import { SKINS_BY_ID } from "./tier2";
import { END_KEY, useCardReorder, type CardReorder } from "./use-card-reorder";
import { useReducedMotion } from "./engine/ui/use-reduced-motion";

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
// visual column) and the rest of the grid shifts to make room. Dragging is
// handled by use-card-reorder.ts: a card is picked up by its move handle (top-right) only,
// and the other cards slide aside live while it's held.

// Sits after the last card so a drag has somewhere to land for "move this
// card to the very end". Occupies its own grid cell; only visible while a
// card is being dragged. Hit-tested by use-card-reorder.ts via END_KEY.
function DropzoneEnd({ reorder }: { reorder: CardReorder | null }) {
  if (!reorder) return null;
  const active = reorder.draggingId !== null;
  return (
    <div
      ref={reorder.cellRef(END_KEY)}
      aria-hidden="true"
      className={`h-16 rounded-xl border-2 border-dashed transition-colors duration-200 ${
        active ? "border-white/15" : "border-transparent"
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
function HubHeader({ tabs }: { tabs: ReturnType<typeof useOutpostTabs> }) {
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
      <OutpostTabs {...tabs} />
    </div>
  );
}

// The drag handle's glyph: a cross with an arrowhead on each arm — "move".
function MoveIcon() {
  return (
    <svg
      viewBox="0 0 16 16"
      className="h-3.5 w-3.5"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="M8 1.5v13M1.5 8h13" />
      <path d="M6 3.5 8 1.5l2 2M6 12.5l2 2 2-2M3.5 6 1.5 8l2 2M12.5 6l2 2-2 2" />
    </svg>
  );
}

// Each grid card's cell — carries data-module-id (Eureka sparks land on
// cards by it) and lets the Engine's card span both columns once it has a
// body or its Workshop is open. With the "card-reorder" upgrade owned it
// also holds the card's move handle; the cell stays put as a dashed
// placeholder while its card is lifted out and follows the pointer.
function CardCell({
  id,
  reorder,
  children,
}: {
  id: ModuleId;
  reorder: CardReorder | null;
  children: React.ReactNode;
}) {
  const { wide } = useEngine();
  const span = id === "ponder" && wide ? "sm:col-span-2" : "";
  if (!reorder) {
    return (
      <div data-module-id={id} className={span || undefined}>
        {children}
      </div>
    );
  }
  const dragging = reorder.draggingId === id;
  const settling = reorder.settlingId === id;
  return (
    <div
      ref={reorder.cellRef(id)}
      data-module-id={id}
      className={`relative rounded-xl ${span} ${dragging ? "outpost-card-placeholder z-50" : settling ? "z-40" : ""}`}
    >
      <div
        ref={reorder.cardRef(id)}
        className={`relative rounded-xl transition-shadow duration-200 ${
          dragging || settling ? "outpost-card-lifted" : ""
        }`}
      >
        {children}
        <button
          type="button"
          {...reorder.handleProps(id)}
          aria-label="Move this card: drag it, or use the arrow keys"
          title="Drag to move"
          className={`absolute right-1 top-1 z-20 flex h-5 w-5 touch-none items-center justify-center rounded text-xs transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-[var(--outpost-accent)] ${
            dragging
              ? "cursor-grabbing bg-white/15 text-white"
              : "cursor-grab text-white/30 hover:bg-white/10 hover:text-white/80"
          }`}
        >
          <MoveIcon />
        </button>
      </div>
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
  const reducedMotion = useReducedMotion();
  const drag = useCardReorder({ order: cardOrder, commit: reorderCard, reducedMotion });
  const reorder = reorderEnabled ? drag : null;

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
          make room. While dragging, this renders the live preview order. */}
      {(reorder ? drag.displayOrder : cardOrder).map((id) => (
        <ModuleGate key={id} id={id}>
          <CardCell id={id} reorder={reorder}>
            {renderCard(id, mods, packReleases)}
          </CardCell>
        </ModuleGate>
      ))}
      <DropzoneEnd reorder={reorder} />
    </div>
  );
}

// The whole card's accent (header tag, corners, progress bar, every shared
// panel's hover glow) follows whichever skin is picked in the Tier 2 panel
// once tier 2 is unlocked — before that, .outpost-frame's own CSS defaults
// (fixed amber) apply untouched, so a tier-1-only visitor sees no change.
function OutpostFrame({ mods, packReleases }: { mods: Mod[]; packReleases: PackRelease[] }) {
  const { tier2Unlocked, tier2, settings } = useAchievements();
  const tabs = useOutpostTabs();
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
      <HubHeader tabs={tabs} />
      {/* Basecamp stays mounted while another tab is open, so its cards keep
          their in-progress state; the other two mount when opened. */}
      <OutpostTabPanel id="basecamp" active={tabs.tab === "basecamp"} labelled={tabs.available.length > 1}>
        <div className="px-3 py-8 sm:py-10">
          <HubBody mods={mods} packReleases={packReleases} />
        </div>
      </OutpostTabPanel>
      {tabs.tab === "progress" && (
        <OutpostTabPanel id="progress" active labelled>
          <YourProgressSection />
        </OutpostTabPanel>
      )}
      {tabs.tab === "achievements" && (
        <OutpostTabPanel id="achievements" active labelled>
          <AccomplishmentsSection />
        </OutpostTabPanel>
      )}
      <TierRevealNotice />
      <EngineToasts />
      <EurekaLayer />
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
      <EngineProvider mods={mods}>
        <Reveal>
          <section className="outpost-zone relative overflow-hidden px-3 py-10 sm:px-4 sm:py-14">
            <OutpostFrame mods={mods} packReleases={packReleases} />
          </section>
        </Reveal>
      </EngineProvider>
    </AchievementsProvider>
  );
}
