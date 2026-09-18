"use client";

import Reveal from "@/components/Reveal";
import type { Mod, PackRelease } from "@/lib/mods";
import { ACHIEVEMENTS } from "./achievements-catalog";
import { AchievementsProvider, useAchievements } from "./AchievementsProvider";
import AccomplishmentsSection from "./AccomplishmentsSection";
import AchievementToastStack from "./AchievementToastStack";
import AchievementGallery from "./AchievementGallery";
import BtwFieldNotes from "./BtwFieldNotes";
import Campfire from "./Campfire";
import CraftingCard from "./CraftingCard";
import FirstIronTool from "./FirstIronTool";
import Gathering from "./Gathering";
import ModOfTheDay from "./ModOfTheDay";
import OutpostCorners from "./OutpostCorners";
import OutpostSettings from "./OutpostSettings";
import PatchNotes from "./PatchNotes";
import Prestige from "./Prestige";
import GuessTheMod from "./GuessTheMod";
import ResourceToolStrip from "./ResourceToolStrip";
import Tier2Reveal from "./Tier2Reveal";
import TierTip from "./TierTip";
import TonightsSky from "./TonightsSky";
import YourProgressSection from "./YourProgressSection";
import { type ModuleId } from "./module-registry";
import { SKINS_BY_ID } from "./tier2";

// Gates a module's visibility by its admin-configured tier assignment
// (default placement lives in module-registry.ts's DEFAULT_MODULE_TIER) —
// the one, single place this decision gets made, instead of a scattered
// `{tier2Unlocked && <X/>}` per module. Not used for the tier-1-only
// Achievement Gallery preview (its rule is inverted — hidden once a LATER
// tier unlocks, not shown once ITS tier unlocks) or Tier2Reveal (a one-off
// animation tied specifically to the tier1->2 transition).
function ModuleGate({ id, children }: { id: ModuleId; children: React.ReactNode }) {
  const { isTierUnlocked, moduleTierId } = useAchievements();
  if (!isTierUnlocked(moduleTierId(id))) return null;
  return <>{children}</>;
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
    <div className="relative border-b border-white/10 px-6 py-8 text-center sm:py-10">
      <OutpostSettings />
      <span className="outpost-status-tag">
        <span className="outpost-status-dot" aria-hidden="true" />
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
  const { tier2Unlocked } = useAchievements();
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
      <div className="space-y-6">
        <ModuleGate id="mod-of-day">
          <ModOfTheDay mods={mods} />
        </ModuleGate>
        <ModuleGate id="tonights-sky">
          <TonightsSky />
        </ModuleGate>
        <ModuleGate id="campfire">
          <Campfire />
        </ModuleGate>
        <ModuleGate id="gathering">
          <Gathering />
        </ModuleGate>
        {!tier2Unlocked && <AchievementGallery tier1Only />}
      </div>
      <div className="space-y-6">
        <ModuleGate id="patch-notes">
          <PatchNotes mods={mods} packReleases={packReleases} />
        </ModuleGate>
        <ModuleGate id="btw-field-notes">
          <BtwFieldNotes />
        </ModuleGate>
        <ModuleGate id="first-iron-tool">
          <FirstIronTool />
        </ModuleGate>
        <ModuleGate id="crafting">
          <CraftingCard />
        </ModuleGate>
        <ModuleGate id="guess-the-mod">
          <GuessTheMod mods={mods} />
        </ModuleGate>
        <ModuleGate id="prestige">
          <Prestige />
        </ModuleGate>
      </div>
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
      <Tier2Reveal />
      <ModuleGate id="your-progress">
        <YourProgressSection />
      </ModuleGate>
      <ModuleGate id="accomplishments">
        <AccomplishmentsSection />
      </ModuleGate>
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
      <AchievementToastStack />
      <Reveal>
        <section className="outpost-zone relative overflow-hidden px-3 py-10 sm:px-4 sm:py-14">
          <OutpostFrame mods={mods} packReleases={packReleases} />
        </section>
      </Reveal>
    </AchievementsProvider>
  );
}
