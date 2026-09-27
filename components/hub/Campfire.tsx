"use client";

import { useEffect, useRef, useState } from "react";
import { LoadingBarButton } from "./activity-common";
import {
  CAMPFIRE_CAPTIONS,
  CAMPFIRE_ICONS,
  CAMPFIRE_STAGES,
  currentCampfireStage,
  type CampfireStage,
} from "./campfire-stage";
import { useAchievements } from "./AchievementsProvider";
import { isWolfFed } from "./camp";
import { cycleDayIndex, loadCycleStartedAt } from "./day-night-cycle";
import { HUNTING_STAGE } from "./resources";

// Live decay refresh — the fire's displayed stage used to only recompute
// when `campfire` itself changed (i.e. right after tending), so a visitor
// who left the tab open could see a stale stage. Now matters more than
// before: cooking's own eligibility depends on catching the real stage,
// not a stale one.
// Kept short now that a stage only lasts about a minute (mechanics.ts), and
// because a cook in progress is cancelled the moment the fire leaves Medium.
const REFRESH_MS = 1_000;

// The fire's real (decay-aware) stage, re-read every REFRESH_MS; null
// until mounted. Shared by the card and its folded Camp rail header.
function useLiveCampfireStage(): CampfireStage | null {
  const { campfire, mechanics, mounted } = useAchievements();
  const { decayMinutes } = mechanics.campfire;
  const [stage, setStage] = useState<CampfireStage | null>(null);
  useEffect(() => {
    if (!mounted) return;
    setStage(currentCampfireStage(campfire, decayMinutes));
    const id = window.setInterval(() => setStage(currentCampfireStage(campfire, decayMinutes)), REFRESH_MS);
    return () => window.clearInterval(id);
  }, [mounted, campfire, decayMinutes]);
  return stage;
}

// The Campfire's line in its folded Camp rail header (CampRail.tsx).
export function CampfireStatus({ cooking }: { cooking: boolean }) {
  const { campfire, mounted, gloomNight } = useAchievements();
  const stage = useLiveCampfireStage();
  if (!mounted) return null;
  if (!campfire.built) return <span>No fire yet</span>;
  if (stage === null) return null;
  return (
    <span className={stage === 0 && gloomNight ? "text-rose-300" : undefined}>
      <span aria-hidden="true">{CAMPFIRE_ICONS[stage]}</span> {CAMPFIRE_STAGES[stage]}
      {cooking && " · Cooking…"}
    </span>
  );
}

// Lives in the Camp rail (CampRail.tsx), which supplies its panel and title.
export default function Campfire({ onCookingChange }: { onCookingChange?: (cooking: boolean) => void }) {
  const {
    campfire,
    tendCampfire,
    completeCooking,
    eatCookedFood,
    resources,
    resourceMeta,
    upgrades,
    mechanics,
    mounted,
    survivalActive,
    engine,
  } = useAchievements();
  const { cookFoodCost, cookYield, cookMs, eatXpReward, relightWoodCost, craftWoodCost } = mechanics.campfire;
  const { eatHunger } = mechanics.survival;
  // Re-read the moment tending changes the fire, and every REFRESH_MS as it decays.
  const stage = useLiveCampfireStage();
  const [feedback, setFeedback] = useState<string | null>(null);
  const feedbackTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  function flash(text: string) {
    if (feedbackTimerRef.current) clearTimeout(feedbackTimerRef.current);
    setFeedback(text);
    feedbackTimerRef.current = setTimeout(() => setFeedback(null), 4000);
  }

  function handleCook() {
    if (completeCooking()) {
      flash(`${resourceMeta.cookedFood.icon} +${cookYield} ${resourceMeta.cookedFood.name}`);
    } else {
      flash("The fire left Medium before it was done.");
    }
  }

  function handleEat() {
    if (eatCookedFood()) flash(survivalActive ? `+${eatHunger / 2} \u{1F357}  +${eatXpReward} XP` : `+${eatXpReward} XP`);
  }

  function handleTend() {
    tendCampfire();
  }

  // Cooking only exists once Food is actually gatherable — the same stage
  // that opens Gathering's Hunting activity, so the two stay in step.
  const foodAvailable = engine.stage >= HUNTING_STAGE;

  const canCook = stage === 3 && resources.food >= cookFoodCost;
  // A dead fire takes Wood to relight (mechanics.ts); tending a lit one is free.
  const relighting = stage === 0 && relightWoodCost > 0;
  const canTend = !relighting || resources.wood >= relightWoodCost;

  return (
    <div>
      {mounted && !campfire.built ? (
        <div>
          <div className="flex items-center gap-2">
            <span className="text-xl leading-none opacity-40 grayscale" aria-hidden="true">
              {"\u{1FAB5}"}
            </span>
            <p className="text-sm font-semibold text-white">No fire yet</p>
          </div>
          <p className="mt-1.5 text-xs leading-snug text-slate-400">
            Craft a Campfire in Crafting&apos;s 2×2 Player Crafting grid for {craftWoodCost} {resourceMeta.wood.name}.
            It&apos;s the only thing that keeps the gloom away on a New Moon night.
          </p>
        </div>
      ) : stage === null ? (
        <div className="flex items-center gap-3">
          <div className="h-12 w-12 shrink-0 animate-pulse rounded-lg bg-white/10" />
          <div className="flex-1 space-y-2">
            <div className="h-4 w-1/3 animate-pulse rounded bg-white/10" />
            <div className="h-3 w-2/3 animate-pulse rounded bg-white/10" />
          </div>
        </div>
      ) : (
        <>
          <div className="flex items-center gap-2">
            <span className="campfire-icon text-xl leading-none" data-stage={stage} aria-hidden="true">
              {CAMPFIRE_ICONS[stage]}
            </span>
            <p className="text-sm font-semibold text-white">{CAMPFIRE_STAGES[stage]}</p>
          </div>
          <p className="mt-1.5 text-xs leading-snug text-slate-400">{CAMPFIRE_CAPTIONS[stage]}</p>
          <button
            type="button"
            onClick={handleTend}
            disabled={!canTend}
            className={`mt-2 rounded-lg px-3 py-1 text-xs font-semibold ${
              canTend ? "btn-glow btn-gradient text-white" : "border border-white/15 text-white/30"
            }`}
          >
            {relighting ? `Relight (${resourceMeta.wood.icon} ${relightWoodCost})` : "Tend the Fire"}
          </button>
          {relighting && resources.wood < relightWoodCost && (
            <p className="mt-1 text-[10px] leading-snug text-white/35">
              Needs {relightWoodCost} {resourceMeta.wood.name}. Chop some in Gathering.
            </p>
          )}

          {foodAvailable && (
            <div className="mt-2 border-t border-white/10 pt-2">
              <div className="flex items-center justify-between text-[11px] font-semibold uppercase tracking-wider text-white/40">
                <span>Cooking</span>
                <span className="normal-case text-white/60">
                  {resourceMeta.food.icon} {resources.food} · {resourceMeta.cookedFood.icon} {resources.cookedFood}
                </span>
              </div>
              <div className="mt-1.5 flex gap-2">
                {/* Remounts (and so cancels a cook in progress) whenever the
                    fire leaves Medium. */}
                <LoadingBarButton
                  key={stage === 3 ? "medium" : "off"}
                  durationMs={cookMs}
                  disabled={!canCook}
                  idleLabel={`Cook (-${cookFoodCost} Food)`}
                  runningLabel={(ms) => `Cooking... ${Math.ceil(ms / 1000)}s`}
                  onComplete={handleCook}
                  onRunningChange={onCookingChange}
                  className="outpost-hold-button--compact"
                />
                <button
                  type="button"
                  onClick={handleEat}
                  disabled={resources.cookedFood < 1}
                  className={`flex-1 rounded-md border px-2 py-1 text-[11px] font-semibold transition-colors ${
                    resources.cookedFood >= 1
                      ? "border-[var(--outpost-accent)] text-[var(--outpost-accent)] hover:bg-[var(--outpost-accent-soft)]"
                      : "border-white/15 text-white/30"
                  }`}
                >
                  Eat
                </button>
              </div>
              {stage !== 3 && (
                <p className="mt-1 text-[10px] leading-snug text-white/35">
                  Cooks on a Medium fire — Low won&apos;t, High burns it.
                </p>
              )}
              {stage === 3 && resources.food < cookFoodCost && (
                <p className="mt-1 text-[10px] leading-snug text-white/35">Needs at least {cookFoodCost} Food — go hunting.</p>
              )}
              {feedback && <p className="mt-1 text-[11px] text-[var(--outpost-accent)]">{feedback}</p>}
            </div>
          )}

          {upgrades.purchased.includes("wolf") && <WolfRow />}
        </>
      )}
    </div>
  );
}

// The Upgrades shop's wolf (camp.ts): lies by the fire while it's fed, and
// wanders off once its last meal runs out, until the next one calls it back.
function WolfRow() {
  const { camp, resources, resourceMeta, mechanics, feedWolf, mounted } = useAchievements();
  const [day, setDay] = useState<number | null>(null);

  useEffect(() => {
    if (!mounted) return;
    const read = () => setDay(cycleDayIndex(loadCycleStartedAt()));
    read();
    const id = window.setInterval(read, REFRESH_MS);
    return () => window.clearInterval(id);
  }, [mounted]);

  if (day === null) return null;
  const fed = isWolfFed(camp, day);
  // Already fed as far ahead as one meal reaches — nothing to gain yet.
  const full = camp.wolfFedUntilDay !== null && camp.wolfFedUntilDay >= day + mechanics.upgrades.wolfFedDays;
  const canFeed = !full && resources.cookedFood >= 1;
  const daysLeft = fed ? camp.wolfFedUntilDay! - day : 0;

  return (
    <div className="mt-2 flex items-center justify-between gap-2 border-t border-white/10 pt-2">
      <div className="min-w-0">
        <p className="text-[11px] font-semibold text-white">
          <span aria-hidden="true">{"\u{1F43A}"}</span> {fed ? "Your wolf is by the fire" : "Your wolf wandered off"}
        </p>
        <p className="text-[10px] leading-snug text-white/40">
          {fed
            ? `Fed for ${daysLeft === 1 ? "today" : `${daysLeft} days`}: it hunts alongside you.`
            : "Feed it to call it back."}
        </p>
      </div>
      <button
        type="button"
        onClick={feedWolf}
        disabled={!canFeed}
        className={`shrink-0 rounded-md border px-2 py-1 text-[11px] font-semibold transition-colors ${
          canFeed
            ? "border-[var(--outpost-accent)] text-[var(--outpost-accent)] hover:bg-[var(--outpost-accent-soft)]"
            : "border-white/15 text-white/30"
        }`}
      >
        Feed ({resourceMeta.cookedFood.icon} 1)
      </button>
    </div>
  );
}
