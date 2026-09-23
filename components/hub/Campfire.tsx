"use client";

import { useEffect, useRef, useState } from "react";
import { CooldownNotice, useCooldownRemaining } from "./activity-common";
import {
  CAMPFIRE_CAPTIONS,
  CAMPFIRE_ICONS,
  CAMPFIRE_STAGES,
  currentCampfireStage,
  type CampfireStage,
} from "./campfire-stage";
import { useAchievements } from "./AchievementsProvider";

// Live decay refresh — the fire's displayed stage used to only recompute
// when `campfire` itself changed (i.e. right after tending), so a visitor
// who left the tab open could see a stale stage. Now matters more than
// before: cooking's own eligibility depends on catching the real stage,
// not a stale one.
const REFRESH_MS = 15_000;

export default function Campfire() {
  const {
    campfire,
    tendCampfire,
    completeCooking,
    eatCookedFood,
    resources,
    resourceMeta,
    upgrades,
    mechanics,
    activityCooldownUntil,
    mounted,
  } = useAchievements();
  const { decayMinutes, cookFoodCost, cookYield, eatXpReward } = mechanics.campfire;
  const [stage, setStage] = useState<CampfireStage | null>(null);
  const [feedback, setFeedback] = useState<string | null>(null);
  const feedbackTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const remainingMs = useCooldownRemaining(activityCooldownUntil);

  useEffect(() => {
    if (!mounted) return;
    setStage(currentCampfireStage(campfire, decayMinutes));
    const id = window.setInterval(() => setStage(currentCampfireStage(campfire, decayMinutes)), REFRESH_MS);
    return () => window.clearInterval(id);
  }, [mounted, campfire, decayMinutes]);

  function flash(text: string) {
    if (feedbackTimerRef.current) clearTimeout(feedbackTimerRef.current);
    setFeedback(text);
    feedbackTimerRef.current = setTimeout(() => setFeedback(null), 4000);
  }

  function handleCook() {
    if (completeCooking()) flash(`${resourceMeta.cookedFood.icon} +${cookYield} ${resourceMeta.cookedFood.name}`);
  }

  function handleEat() {
    if (eatCookedFood()) flash(`+${eatXpReward} XP`);
  }

  // Cooking only exists once Food is actually gatherable — gated by the
  // same "Hunting" upgrade that unlocks Gathering's Hunting activity
  // (upgrade-catalog.ts), so the two stay in step from one purchase.
  const foodAvailable = upgrades.purchased.includes("hunting");

  const canCook = stage === 3 && resources.food >= cookFoodCost && remainingMs <= 0;

  return (
    <div className="outpost-panel outpost-card-md rounded-xl p-4">
      <h3 className="font-heading text-sm font-bold uppercase tracking-wider text-[var(--outpost-accent)]">
        The Campfire
      </h3>
      {stage === null ? (
        <div className="mt-2 flex items-center gap-3">
          <div className="h-12 w-12 shrink-0 animate-pulse rounded-lg bg-white/10" />
          <div className="flex-1 space-y-2">
            <div className="h-4 w-1/3 animate-pulse rounded bg-white/10" />
            <div className="h-3 w-2/3 animate-pulse rounded bg-white/10" />
          </div>
        </div>
      ) : (
        <>
          <div className="mt-2 flex items-center gap-2">
            <span className="campfire-icon text-2xl leading-none" data-stage={stage} aria-hidden="true">
              {CAMPFIRE_ICONS[stage]}
            </span>
            <p className="font-semibold text-white">{CAMPFIRE_STAGES[stage]}</p>
          </div>
          <p className="mt-2 text-sm text-slate-300">{CAMPFIRE_CAPTIONS[stage]}</p>
          <button
            type="button"
            onClick={() => {
              tendCampfire();
              setStage((s) => (s === null ? s : (Math.min(4, s + 1) as CampfireStage)));
            }}
            className="btn-glow btn-gradient mt-3 rounded-lg px-4 py-1.5 text-sm font-semibold text-white"
          >
            Tend the Fire
          </button>

          {foodAvailable && (
            <div className="mt-3 border-t border-white/10 pt-3">
              <div className="flex items-center justify-between text-xs font-semibold uppercase tracking-wider text-white/40">
                <span>Cooking</span>
                <span className="normal-case text-white/60">
                  {resourceMeta.food.icon} {resources.food} · {resourceMeta.cookedFood.icon} {resources.cookedFood}
                </span>
              </div>
              <div className="mt-2 flex gap-2">
                <button
                  type="button"
                  onClick={handleCook}
                  disabled={!canCook}
                  className={`flex-1 rounded-md border px-2 py-1.5 text-xs font-semibold transition-colors ${
                    canCook
                      ? "border-[var(--outpost-accent)] text-[var(--outpost-accent)] hover:bg-[var(--outpost-accent-soft)]"
                      : "border-white/15 text-white/30"
                  }`}
                >
                  Cook (-{cookFoodCost} Food)
                </button>
                <button
                  type="button"
                  onClick={handleEat}
                  disabled={resources.cookedFood < 1}
                  className={`flex-1 rounded-md border px-2 py-1.5 text-xs font-semibold transition-colors ${
                    resources.cookedFood >= 1
                      ? "border-[var(--outpost-accent)] text-[var(--outpost-accent)] hover:bg-[var(--outpost-accent-soft)]"
                      : "border-white/15 text-white/30"
                  }`}
                >
                  Eat
                </button>
              </div>
              {stage !== 3 && (
                <p className="mt-1.5 text-[11px] text-white/35">
                  Needs a Medium fire to cook — Low won&apos;t cook it, High just burns it.
                </p>
              )}
              {stage === 3 && resources.food < cookFoodCost && (
                <p className="mt-1.5 text-[11px] text-white/35">Needs at least {cookFoodCost} Food — go hunting.</p>
              )}
              {feedback && <p className="mt-1.5 text-xs text-[var(--outpost-accent)]">{feedback}</p>}
              <CooldownNotice remainingMs={remainingMs} />
            </div>
          )}
        </>
      )}
    </div>
  );
}
