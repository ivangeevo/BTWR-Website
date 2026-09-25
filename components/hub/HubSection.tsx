"use client";

import { useEffect, useRef, useState } from "react";
import type { Mod, PackRelease } from "@/lib/mods";
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
import StageTip from "./StageTip";
import UpgradesPanel, { useUpgradesShown } from "./UpgradesPanel";
import YourProgressSection from "./YourProgressSection";
import { type ModuleId } from "./module-registry";
import { EngineProvider, useEngine } from "./engine/ui/EngineProvider";
import { EngineToasts, EurekaLayer } from "./engine/ui/overlays/EngineOverlays";
import { OUTPOST_VERSION } from "./outpost-version";
import { SKINS_BY_ID } from "./tier2";
import { END_KEY, useCardReorder, type CardReorder } from "./use-card-reorder";
import { useReducedMotion } from "./engine/ui/use-reduced-motion";

// The Outpost, on its own page (/outpost) and exactly one screen tall, like
// Cookie Clicker: the page never scrolls, each part scrolls inside itself.
// - A slim top bar: title, the Basecamp/Progress/Achievements tabs, rank, settings.
// - Basecamp is three columns. Left, "the cookie": the Engine (the Ponder
//   card), with the stage tip above it. Its Workshop, when open, widens over
//   the middle column. Middle: the activity cards, as a grid that scrolls in
//   its own column, and any one of them can be expanded to fill it. Right,
//   "the store": resources & tool, then the Upgrades shop.
// - Progress and Achievements fill the space under the bar.
// Below the lg breakpoint (a narrow desktop window) the columns stack and
// the page scrolls normally instead; see .outpost-screen in globals.css.

// Shows a module once the Engine reaches the stage that reveals it
// (module-registry.ts's DEFAULT_MODULE_STAGE, admin-overridable) — the one
// place this decision gets made.
function ModuleGate({ id, children }: { id: ModuleId; children: React.ReactNode }) {
  const { isModuleRevealed } = useAchievements();
  if (!isModuleRevealed(id)) return null;
  return <>{children}</>;
}

// Maps a middle-column module id to its actual card, with whatever props it
// needs. The Engine ("ponder") has its own column, so it's never in here.
function renderCard(id: ModuleId, mods: Mod[], packReleases: PackRelease[]): React.ReactNode {
  switch (id) {
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
// as a fraction, to give the progress readout more weight. Deliberately its
// own small vocabulary, apart from the Progress tab's level titles.
function rankForProgress(unlockedCount: number, total: number): string {
  if (total === 0) return "Wanderer";
  const ratio = unlockedCount / total;
  if (ratio >= 1) return "Founding Member";
  if (ratio >= 0.7) return "Homesteader";
  if (ratio >= 0.4) return "Settler";
  return "Wanderer";
}

// The slim bar across the top: status and title (with the Prestige badge),
// the tabs in the middle, the rank bar and settings gear on the right.
function TopBar({ tabs }: { tabs: ReturnType<typeof useOutpostTabs> }) {
  const { unlocked, mounted, achievements } = useAchievements();
  const totalUnlocked = unlocked.size;
  const totalAchievements = achievements.length;
  const percent = mounted ? Math.round((totalUnlocked / totalAchievements) * 100) : 0;

  return (
    <div
      id="outpost"
      className="relative z-30 grid shrink-0 items-center gap-3 border-b border-white/10 px-4 py-2.5 sm:grid-cols-[1fr_auto_1fr]"
    >
      <div className="flex min-w-0 items-center gap-3">
        <span className="outpost-status-tag">
          <span className="outpost-status-dot outpost-status-dot-online" aria-hidden="true" />
          Online
        </span>
        <h1 className="truncate font-heading text-xl font-extrabold tracking-wide text-white">The Outpost</h1>
        <PrestigeBadge />
      </div>
      {/* Keeps the three-part grid in shape while the tab bar is hidden. */}
      {tabs.available.length > 1 ? <OutpostTabs {...tabs} /> : <div />}
      <div className="flex items-center gap-3 sm:justify-end">
        {mounted && (
          <div className="w-44" title={`${totalUnlocked} of ${totalAchievements} achievements`}>
            <div className="flex items-center justify-between text-[0.65rem] font-semibold uppercase tracking-wider text-white/50">
              {/* Plain live count, not <CountUp> — this keeps changing all session. */}
              <span>{rankForProgress(totalUnlocked, totalAchievements)}</span>
              <span className="text-[var(--outpost-accent)]">
                {totalUnlocked}/{totalAchievements}
              </span>
            </div>
            <div className="outpost-progress-track mt-1">
              <div className="outpost-progress-fill" style={{ width: `${percent}%` }} />
            </div>
          </div>
        )}
        <OutpostSettings />
      </div>
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

// Expand (corners pointing out) / collapse (corners pointing in).
function ExpandIcon({ expanded }: { expanded: boolean }) {
  return (
    <svg
      viewBox="0 0 16 16"
      className="h-3 w-3"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      {expanded ? (
        <path d="M6 2v4H2M10 2v4h4M6 14v-4H2M10 14v-4h4" />
      ) : (
        <path d="M2 6V2h4M14 6V2h-4M2 10v4h4M14 10v4h-4" />
      )}
    </svg>
  );
}

const HANDLE_CLASS =
  "absolute top-1 z-20 flex h-5 w-5 items-center justify-center rounded text-xs transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-[var(--outpost-accent)]";

// Each middle-column card's cell — carries data-module-id (Eureka sparks
// land on cards by it) and the card's expand button. With the
// "card-reorder" upgrade owned it also holds the move handle; the cell
// stays put as a dashed placeholder while its card is lifted out and
// follows the pointer. An expanded card fills the column (the others stay
// mounted, just hidden, so nothing loses its in-progress state).
function CardCell({
  id,
  reorder,
  expanded,
  anyExpanded,
  onExpand,
  children,
}: {
  id: ModuleId;
  reorder: CardReorder | null;
  expanded: boolean;
  anyExpanded: boolean;
  onExpand: (id: ModuleId | null) => void;
  children: React.ReactNode;
}) {
  const dragging = reorder?.draggingId === id;
  const settling = reorder?.settlingId === id;
  const canMove = reorder && !anyExpanded;
  return (
    <div
      ref={reorder?.cellRef(id)}
      data-module-id={id}
      hidden={anyExpanded && !expanded}
      className={`relative rounded-xl ${expanded ? "outpost-card-expanded col-span-full" : ""} ${
        dragging ? "outpost-card-placeholder z-50" : settling ? "z-40" : ""
      }`}
    >
      <div
        ref={reorder?.cardRef(id)}
        className={`relative rounded-xl transition-shadow duration-200 ${dragging || settling ? "outpost-card-lifted" : ""}`}
      >
        {children}
        <button
          type="button"
          onClick={() => onExpand(expanded ? null : id)}
          aria-label={expanded ? "Shrink this card back" : "Expand this card to fill the column"}
          aria-pressed={expanded}
          title={expanded ? "Shrink" : "Expand"}
          className={`${HANDLE_CLASS} ${canMove ? "right-7" : "right-1"} ${
            expanded ? "bg-white/10 text-white" : "text-white/30 hover:bg-white/10 hover:text-white/80"
          }`}
        >
          <ExpandIcon expanded={expanded} />
        </button>
        {canMove && (
          <button
            type="button"
            {...reorder.handleProps(id)}
            aria-label="Move this card: drag it, or use the arrow keys"
            title="Drag to move"
            className={`${HANDLE_CLASS} right-1 touch-none ${
              dragging
                ? "cursor-grabbing bg-white/15 text-white"
                : "cursor-grab text-white/30 hover:bg-white/10 hover:text-white/80"
            }`}
          >
            <MoveIcon />
          </button>
        )}
      </div>
    </div>
  );
}

// The middle column: every revealed activity card, in the visitor's order.
function CardColumn({
  ids,
  mods,
  packReleases,
}: {
  ids: ModuleId[];
  mods: Mod[];
  packReleases: PackRelease[];
}) {
  const { cardOrder, reorderCard, upgrades } = useAchievements();
  const reorderEnabled = upgrades.purchased.includes("card-reorder");
  const reducedMotion = useReducedMotion();
  const scrollRef = useRef<HTMLDivElement>(null);
  const drag = useCardReorder({ order: cardOrder, commit: reorderCard, reducedMotion, scrollRef });
  const reorder = reorderEnabled ? drag : null;
  const [expanded, setExpanded] = useState<ModuleId | null>(null);
  const shown = new Set(ids);
  const expandedId = expanded && shown.has(expanded) ? expanded : null;

  // Escape shrinks an expanded card back (a drag's own Escape comes first).
  useEffect(() => {
    if (!expandedId) return;
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape" && !e.defaultPrevented) setExpanded(null);
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [expandedId]);

  function expand(id: ModuleId | null) {
    setExpanded(id);
    scrollRef.current?.scrollTo({ top: 0 });
  }

  return (
    <div ref={scrollRef} data-outpost-scroll className="outpost-col-scroll lg:h-full lg:overflow-y-auto">
      <div className="grid gap-4 [grid-template-columns:repeat(auto-fill,minmax(min(100%,17rem),1fr))]">
        {(reorder ? drag.displayOrder : cardOrder)
          .filter((id) => shown.has(id))
          .map((id) => (
            <CardCell
              key={id}
              id={id}
              reorder={reorder}
              expanded={expandedId === id}
              anyExpanded={expandedId !== null}
              onExpand={expand}
            >
              {renderCard(id, mods, packReleases)}
            </CardCell>
          ))}
        {!expandedId && <DropzoneEnd reorder={reorder} />}
      </div>
    </div>
  );
}

function Basecamp({ mods, packReleases }: { mods: Mod[]; packReleases: PackRelease[] }) {
  const { cardOrder, isModuleRevealed } = useAchievements();
  const { workshopOpen } = useEngine();
  const upgradesShown = useUpgradesShown();
  const cardIds = cardOrder.filter((id) => id !== "ponder" && isModuleRevealed(id));
  const hasMiddle = cardIds.length > 0;
  const hasRight = isModuleRevealed("resource-tool-strip") || upgradesShown;
  // The Engine's column is fixed-width beside the cards, and takes their
  // room while its Workshop is open (or when there are no cards yet).
  const wideEngine = workshopOpen || !hasMiddle;

  const centred = !hasMiddle && !workshopOpen ? "mx-auto w-full max-w-2xl" : "";

  return (
    <div className="flex flex-col gap-4 p-3 sm:p-4 lg:absolute lg:inset-0 lg:flex-row">
      {/* The stage tip runs across the Engine's column and the cards' both,
          as wide as it gets with the Workshop open, so it always shows in
          full; the Engine and the cards start below it. */}
      <div className="flex flex-col gap-3 lg:min-h-0 lg:min-w-0 lg:flex-1">
        <ModuleGate id="stage-tip">
          <div className={centred}>
            <StageTip />
          </div>
        </ModuleGate>
        <div className="flex flex-col gap-4 lg:min-h-0 lg:flex-1 lg:flex-row">
          <div
            data-outpost-scroll
            className={`outpost-engine-col flex flex-col gap-3 lg:h-full lg:overflow-y-auto ${
              wideEngine ? "lg:min-w-0 lg:flex-1" : "lg:w-[22rem] lg:shrink-0 2xl:w-[26rem]"
            }`}
          >
            <div data-module-id="ponder" className={`flex flex-1 flex-col ${centred}`}>
              <Ponder />
            </div>
          </div>
          {hasMiddle && (
            <div hidden={workshopOpen} className="lg:min-w-0 lg:flex-1">
              <CardColumn ids={cardIds} mods={mods} packReleases={packReleases} />
            </div>
          )}
        </div>
      </div>
      {hasRight && (
        <aside
          data-outpost-scroll
          aria-label="Store"
          className="flex flex-col gap-4 lg:h-full lg:w-[18rem] lg:shrink-0 lg:overflow-y-auto 2xl:w-[21rem]"
        >
          <ModuleGate id="resource-tool-strip">
            <ResourceToolStrip />
          </ModuleGate>
          <UpgradesPanel />
        </aside>
      )}
    </div>
  );
}

// The whole frame's accent (top bar, corners, progress bar, every shared
// panel's hover glow) follows whichever skin is picked in the Progress tab.
function OutpostFrame({ mods, packReleases }: { mods: Mod[]; packReleases: PackRelease[] }) {
  const { tier2, settings } = useAchievements();
  const tabs = useOutpostTabs();
  const skin = SKINS_BY_ID[tier2.skin] ?? SKINS_BY_ID.campfire;
  const style = skin
    ? ({
        "--outpost-accent": skin.accent,
        "--outpost-accent-soft": skin.accentSoft,
        "--outpost-accent-dark": skin.accentDark,
      } as React.CSSProperties)
    : undefined;
  const labelled = tabs.available.length > 1;

  return (
    <div
      className="outpost-frame relative mx-auto flex w-full max-w-[120rem] flex-col lg:min-h-0 lg:flex-1"
      style={style}
      data-reduced-motion={settings.reducedMotion || undefined}
    >
      <OutpostCorners />
      <TopBar tabs={tabs} />
      {/* Basecamp stays mounted while another tab is open, so its cards keep
          their in-progress state; the other two mount when opened. */}
      <OutpostTabPanel
        id="basecamp"
        active={tabs.tab === "basecamp"}
        labelled={labelled}
        className="relative lg:min-h-0 lg:flex-1"
      >
        <Basecamp mods={mods} packReleases={packReleases} />
      </OutpostTabPanel>
      {tabs.tab === "progress" && (
        <OutpostTabPanel id="progress" active labelled className="outpost-tab-scroll lg:min-h-0 lg:flex-1 lg:overflow-y-auto">
          <YourProgressSection />
        </OutpostTabPanel>
      )}
      {tabs.tab === "achievements" && (
        <OutpostTabPanel id="achievements" active labelled className="outpost-tab-scroll lg:min-h-0 lg:flex-1 lg:overflow-y-auto">
          <AccomplishmentsSection />
        </OutpostTabPanel>
      )}
      <span className="pointer-events-none absolute bottom-1 right-2 z-10 select-none whitespace-nowrap text-[14px] leading-none text-slate-500">
        v{OUTPOST_VERSION}
      </span>
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
        <section className="outpost-zone outpost-screen outpost-materialize relative flex flex-col overflow-hidden p-2 sm:p-3 lg:min-h-0 lg:flex-1">
          <OutpostFrame mods={mods} packReleases={packReleases} />
        </section>
      </EngineProvider>
    </AchievementsProvider>
  );
}
