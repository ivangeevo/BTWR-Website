"use client";

import type { Mod } from "@/lib/mods";
import { AchievementsProvider, useAchievements } from "./AchievementsProvider";
import AccomplishmentsSection from "./AccomplishmentsSection";
import AchievementToastStack from "./AchievementToastStack";
import CampRail, { useCampRailShown } from "./CampRail";
import ExperiencePicker from "./ExperiencePicker";
import OutpostCorners from "./OutpostCorners";
import OutpostSettings from "./OutpostSettings";
import OutpostTabs, { OutpostTabPanel, useOutpostTabs } from "./OutpostTabs";
import Ponder from "./Ponder";
import PrestigeBadge from "./PrestigeBadge";
import GloomLayer from "./GloomLayer";
import StageTip from "./StageTip";
import StrandedPanel from "./StrandedPanel";
import YourProgressSection from "./YourProgressSection";
import type { ModuleId } from "./module-registry";
import { EngineProvider } from "./engine/ui/EngineProvider";
import { EngineToasts, EurekaLayer } from "./engine/ui/overlays/EngineOverlays";
import { OUTPOST_VERSION } from "./outpost-version";
import { SKINS_BY_ID } from "./tier2";

// The Outpost, on its own page (/outpost) and exactly one screen tall.
// The page never scrolls, each part scrolls inside itself.
// - A slim top bar: title, the Basecamp/Progress/Achievements tabs, rank, settings.
// - Basecamp is two parts. The main view, under the stage tip, is the
//   Engine (the Ponder card, the same size on every one of its tabs).
//   Beside it, the Camp rail (CampRail.tsx): Stats & Materials, Tonight's
//   Sky (once bought from Upgrades) and the survival work — Campfire,
//   Gathering (where relics turn up), Crafting, Upgrades — always on screen.
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

function Basecamp() {
  const hasRail = useCampRailShown();

  // Day One: just the Engine, at a readable width in the middle.
  const centred = !hasRail ? "mx-auto w-full max-w-3xl" : "";

  return (
    <div className="flex flex-col gap-4 p-3 sm:p-4 lg:absolute lg:inset-0 lg:flex-row">
      <div className={`flex flex-col gap-3 lg:min-h-0 lg:min-w-0 lg:flex-1 ${centred}`}>
        <ModuleGate id="stage-tip">
          <StageTip />
        </ModuleGate>
        {/* Hardcore Spawn: only there while a respawn's trek home is underway. */}
        <StrandedPanel />
        <div data-module-id="ponder" className="lg:min-h-0 lg:flex-1">
          <Ponder />
        </div>
      </div>
      {hasRail && <CampRail />}
    </div>
  );
}

// The whole frame's accent (top bar, corners, progress bar, every shared
// panel's hover glow) follows whichever skin is picked in the Progress tab.
function OutpostFrame() {
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
        <Basecamp />
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

export default function HubSection({ mods }: { mods: Mod[] }) {
  return (
    <AchievementsProvider mods={mods}>
      <EngineProvider mods={mods}>
        <section className="outpost-zone outpost-screen outpost-materialize relative flex flex-col overflow-hidden p-2 sm:p-3 lg:min-h-0 lg:flex-1">
          <OutpostFrame />
        </section>
      </EngineProvider>
    </AchievementsProvider>
  );
}
