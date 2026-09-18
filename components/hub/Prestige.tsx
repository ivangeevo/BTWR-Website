"use client";

import { useState } from "react";
import { useAchievements } from "./AchievementsProvider";
import { findToolTier } from "./resources";
import { nextPerkCost, perkLevel, pointsForPrestige, PERKS, startingTierIndex } from "./legacy";

export default function Prestige() {
  const { canPrestige, legacy, prestigeOutpost, buyLegacyPerk, tools, toolTiersList, resourceMeta } =
    useAchievements();
  const [confirming, setConfirming] = useState(false);

  if (!canPrestige) {
    return (
      <div className="outpost-panel rounded-xl p-5 opacity-80">
        <h3 className="font-heading text-sm font-bold uppercase tracking-wider text-[var(--outpost-accent)]">
          {"\u{1F31F}"} Prestige
        </h3>
        <p className="mt-2 text-sm text-slate-300">
          Reach the Outpost&apos;s top tier to unlock Prestige — reset the gathering loop for permanent perks
          that make the next run a little easier.
        </p>
      </div>
    );
  }

  const currentTool = findToolTier(toolTiersList, tools.tier);
  const order = toolTiersList.map((t) => t.id);
  const startIndex = Math.min(Math.max(0, order.length - 1), startingTierIndex(legacy.perks));
  const startTierName = findToolTier(toolTiersList, order[startIndex] ?? order[0]).name;
  const pointsPreview = pointsForPrestige(Math.max(0, order.indexOf(tools.tier)));

  return (
    <div className="outpost-panel rounded-xl p-5">
      <div className="flex items-center justify-between gap-3">
        <h3 className="font-heading text-sm font-bold uppercase tracking-wider text-[var(--outpost-accent)]">
          {"\u{1F31F}"} Prestige
        </h3>
        <span className="shrink-0 text-xs text-white/40">
          Legacy {legacy.level} · {legacy.points} pts
        </span>
      </div>
      <p className="mt-2 text-sm text-slate-300">
        No rush — this is just a replay button. It resets your resources and tool tier ({"\u{2192}"}{" "}
        {startTierName}), but every achievement, tier, and level you&apos;ve earned stays exactly where it
        is. Every perk below is permanent.
      </p>
      <p className="mt-1 text-xs text-white/40">
        Currently at {currentTool.icon} {currentTool.name} — prestiging now would bank {pointsPreview}{" "}
        {pointsPreview === 1 ? "point" : "points"}.
      </p>

      <div className="mt-4 space-y-2">
        {PERKS.map((perk) => {
          const level = perkLevel(legacy.perks, perk.id);
          const cost = nextPerkCost(legacy.perks, perk.id);
          const maxed = cost === null;
          const canAfford = cost !== null && legacy.points >= cost;
          return (
            <div key={perk.id} className="flex items-center justify-between gap-3 rounded-md bg-white/5 px-2.5 py-2 text-xs">
              <div className="flex items-center gap-2">
                <span aria-hidden="true">{perk.icon}</span>
                <div>
                  <p className="font-semibold text-white">
                    {perk.name}{" "}
                    <span className="font-normal text-white/40">
                      ({level}/{perk.maxLevel})
                    </span>
                  </p>
                  <p className="text-white/40">{perk.description}</p>
                </div>
              </div>
              {maxed ? (
                <span className="shrink-0 text-white/40">Maxed</span>
              ) : (
                <button
                  type="button"
                  onClick={() => buyLegacyPerk(perk.id)}
                  disabled={!canAfford}
                  className={`shrink-0 rounded-md border px-2.5 py-1 text-xs font-semibold transition-colors ${
                    canAfford
                      ? "border-[var(--outpost-accent)] text-[var(--outpost-accent)] hover:bg-[var(--outpost-accent-soft)]"
                      : "border-white/15 text-white/30"
                  }`}
                >
                  {cost} pts
                </button>
              )}
            </div>
          );
        })}
      </div>

      {confirming ? (
        <div className="mt-4 rounded-md border border-[var(--outpost-accent-soft)] bg-black/20 p-3 text-xs">
          <p className="text-slate-300">
            This resets your {(Object.keys(resourceMeta) as (keyof typeof resourceMeta)[])
              .map((id) => resourceMeta[id].name)
              .join(", ")}{" "}
            and tool tier back to the start. Achievements, tiers, and levels are untouched. Go for it?
          </p>
          <div className="mt-2 flex gap-2">
            <button
              type="button"
              onClick={() => {
                prestigeOutpost();
                setConfirming(false);
              }}
              className="rounded-md border border-[var(--outpost-accent)] px-3 py-1 font-semibold text-[var(--outpost-accent)] hover:bg-[var(--outpost-accent-soft)]"
            >
              Prestige now
            </button>
            <button
              type="button"
              onClick={() => setConfirming(false)}
              className="rounded-md border border-white/15 px-3 py-1 text-white/60 hover:bg-white/5"
            >
              Never mind
            </button>
          </div>
        </div>
      ) : (
        <button
          type="button"
          onClick={() => setConfirming(true)}
          className="mt-4 w-full rounded-md border border-[var(--outpost-accent)] px-3 py-2 text-xs font-semibold text-[var(--outpost-accent)] hover:bg-[var(--outpost-accent-soft)]"
        >
          Prestige the Outpost
        </button>
      )}
    </div>
  );
}
