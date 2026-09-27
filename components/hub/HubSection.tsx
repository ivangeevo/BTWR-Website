"use client";

import { useEffect, useRef, useState } from "react";
import type { Mod, PackRelease } from "@/lib/mods";
import { AchievementsProvider, useAchievements } from "./AchievementsProvider";
import AccomplishmentsSection from "./AccomplishmentsSection";
import AchievementToastStack from "./AchievementToastStack";
import CampRail, { useCampRailShown } from "./CampRail";
import DailyBriefing from "./DailyBriefing";
import ExperiencePicker from "./ExperiencePicker";
import OutpostCorners from "./OutpostCorners";
import OutpostSettings from "./OutpostSettings";
import OutpostTabs, { OutpostTabPanel, useOutpostTabs } from "./OutpostTabs";
import PatchNotes from "./PatchNotes";
import Ponder from "./Ponder";
import PrestigeBadge from "./PrestigeBadge";
import GloomLayer from "./GloomLayer";
import GuessTheMod from "./GuessTheMod";
import StageTip from "./StageTip";
import StrandedPanel from "./StrandedPanel";
import YourProgressSection from "./YourProgressSection";
import { MODULE_GROUP, type ModuleId } from "./module-registry";
import { pendingTutorial } from "./engine/content/tutorials";
import { EngineProvider, useEngine } from "./engine/ui/EngineProvider";
import { EngineToasts, EurekaLayer } from "./engine/ui/overlays/EngineOverlays";
import { OUTPOST_VERSION } from "./outpost-version";
import { SKINS_BY_ID } from "./tier2";
import { END_KEY, useCardReorder, type CardReorder } from "./use-card-reorder";
import { useReducedMotion } from "./engine/ui/use-reduced-motion";

// The Outpost, on its own page (/outpost) and exactly one screen tall.
// The page never scrolls, each part scrolls inside itself.
// - A slim top bar: title, the Basecamp/Progress/Achievements tabs, rank, settings.
// - Basecamp is two parts. The main view, under the stage tip, switches
//   between the Engine (the Ponder card, the same size on every one of its
//   tabs) and the Notice Board (the daily reads and the quiz, as a card grid
//   that scrolls in its own column; any card can be expanded to fill it).
//   Beside it, the Camp rail (CampRail.tsx): Stats & Materials and the
//   survival work — Campfire, Gathering, Crafting, Upgrades — always on
//   screen whatever the main view shows.
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

// Maps a Notice Board module id to its actual card, with whatever props it
// needs. The Engine and the Camp rail's cards have places of their own.
function renderCard(id: ModuleId, mods: Mod[], packReleases: PackRelease[]): React.ReactNode {
  switch (id) {
    case "daily-briefing":
      return <DailyBriefing mods={mods} />;
    case "patch-notes":
      return <PatchNotes mods={mods} packReleases={packReleases} />;
    case "guess-the-mod":
      return <GuessTheMod mods={mods} />;
    default:
      return null;
  }
}

// Sits after the last card so a drag has somewhere to land for "move this
// card to the very end". Occupies its own grid cell; only visible while a
// card is being dragged. Hit-tested by use-card-reorder.ts via END_KEY.
function DropzoneEnd({ reorder }: { reorder: CardReorder }) {
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
      // z-40: its dropdowns (settings, Prestige, Upgrades) must open over the
      // gloom (z-30) and the panels lit above it (.outpost-lit, z-31).
      className="relative z-40 grid shrink-0 items-center gap-3 border-b border-white/10 px-4 py-2.5 sm:grid-cols-[1fr_auto_1fr]"
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

// Each Notice Board card's cell — carries data-module-id (Eureka sparks
// land on cards by it), the card's expand button and its move handle; the cell
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
  reorder: CardReorder;
  expanded: boolean;
  anyExpanded: boolean;
  onExpand: (id: ModuleId | null) => void;
  children: React.ReactNode;
}) {
  const dragging = reorder.draggingId === id;
  const settling = reorder.settlingId === id;
  const canMove = !anyExpanded;
  return (
    <div
      ref={reorder.cellRef(id)}
      data-module-id={id}
      hidden={anyExpanded && !expanded}
      className={`relative rounded-xl ${expanded ? "outpost-card-expanded col-span-full" : ""} ${
        dragging ? "outpost-card-placeholder z-50" : settling ? "z-40" : ""
      }`}
    >
      <div
        ref={reorder.cardRef(id)}
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

// The Notice Board: every revealed board card, in the visitor's order.
function CardColumn({
  ids,
  mods,
  packReleases,
}: {
  ids: ModuleId[];
  mods: Mod[];
  packReleases: PackRelease[];
}) {
  const { cardOrder, reorderCard } = useAchievements();
  const reducedMotion = useReducedMotion();
  const scrollRef = useRef<HTMLDivElement>(null);
  // Dragging works on the board's own cards; the move is saved into the one
  // stored order (cards of other groups keep their places in it).
  const boardOrder = cardOrder.filter((id) => MODULE_GROUP[id] === "board");
  const commit = (from: number, to: number) => {
    const fromFull = cardOrder.indexOf(boardOrder[from]);
    const toFull = to >= boardOrder.length ? cardOrder.length : cardOrder.indexOf(boardOrder[to]);
    reorderCard(fromFull, toFull);
  };
  const reorder = useCardReorder({ order: boardOrder, commit, reducedMotion, scrollRef });
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
        {reorder.displayOrder
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

type MainViewId = "engine" | "board";

// Which main view is showing, remembered per browser (a convenience only).
const VIEW_KEY = "btwr:hub:main-view:v1";

function readView(): MainViewId {
  try {
    return window.localStorage.getItem(VIEW_KEY) === "board" ? "board" : "engine";
  } catch {
    return "engine";
  }
}

function writeView(view: MainViewId) {
  try {
    window.localStorage.setItem(VIEW_KEY, view);
  } catch {
    // Remembering the view is a nicety.
  }
}

// The Engine / Notice Board switch over the main view.
function ViewSwitch({ view, onChange }: { view: MainViewId; onChange: (v: MainViewId) => void }) {
  const { title } = useEngine();
  const options: { id: MainViewId; label: string }[] = [
    { id: "engine", label: title },
    { id: "board", label: "Notice Board" },
  ];
  return (
    <div className="outpost-view-switch" role="tablist" aria-label="Basecamp">
      {options.map((o) => (
        <button
          key={o.id}
          type="button"
          role="tab"
          id={`outpost-view-${o.id}`}
          aria-selected={view === o.id}
          aria-controls={`outpost-view-panel-${o.id}`}
          onClick={() => onChange(o.id)}
          className={`rounded-md px-3 py-1 text-xs font-semibold transition-colors ${
            view === o.id ? "bg-[var(--outpost-accent-soft)] text-white" : "text-slate-400 hover:text-white"
          }`}
        >
          {o.label}
        </button>
      ))}
    </div>
  );
}

function Basecamp({ mods, packReleases }: { mods: Mod[]; packReleases: PackRelease[] }) {
  const { cardOrder, isModuleRevealed } = useAchievements();
  const { e, ceremony } = useEngine();
  const boardIds = cardOrder.filter((id) => MODULE_GROUP[id] === "board" && isModuleRevealed(id));
  const hasBoard = boardIds.length > 0;
  const hasRail = useCampRailShown();
  const [pickedView, setPickedView] = useState<MainViewId>("engine");
  useEffect(() => setPickedView(readView()), []);
  const view: MainViewId = hasBoard ? pickedView : "engine";

  function pickView(v: MainViewId) {
    setPickedView(v);
    writeView(v);
  }

  // A stage ceremony or a lesson points at the Engine: bring it up.
  const engineCalling = !!ceremony || !!pendingTutorial(e);
  useEffect(() => {
    if (engineCalling) pickView("engine");
  }, [engineCalling]);

  // Day One: just the Engine, at a readable width in the middle.
  const centred = !hasBoard && !hasRail ? "mx-auto w-full max-w-3xl" : "";

  return (
    <div className="flex flex-col gap-4 p-3 sm:p-4 lg:absolute lg:inset-0 lg:flex-row">
      <div className={`flex flex-col gap-3 lg:min-h-0 lg:min-w-0 lg:flex-1 ${centred}`}>
        <ModuleGate id="stage-tip">
          <StageTip />
        </ModuleGate>
        {/* Hardcore Spawn: only there while a respawn's trek home is underway. */}
        <StrandedPanel />
        {hasBoard && <ViewSwitch view={view} onChange={pickView} />}
        {/* Both views stay mounted (the other just hidden), so neither loses
            its in-progress state when you switch. */}
        <div className="lg:min-h-0 lg:flex-1">
          <div
            id="outpost-view-panel-engine"
            role={hasBoard ? "tabpanel" : undefined}
            aria-labelledby={hasBoard ? "outpost-view-engine" : undefined}
            data-module-id="ponder"
            hidden={view !== "engine"}
            className="lg:h-full"
          >
            <Ponder />
          </div>
          {hasBoard && (
            <div
              id="outpost-view-panel-board"
              role="tabpanel"
              aria-labelledby="outpost-view-board"
              hidden={view !== "board"}
              className="lg:h-full"
            >
              <CardColumn ids={boardIds} mods={mods} packReleases={packReleases} />
            </div>
          )}
        </div>
      </div>
      {hasRail && <CampRail />}
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
        <GloomLayer />
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
      <ExperiencePicker />
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
