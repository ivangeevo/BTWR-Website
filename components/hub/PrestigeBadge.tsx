"use client";

import { useEffect, useRef, useState } from "react";
import { useAchievements } from "./AchievementsProvider";
import { findToolTier } from "./resources";
import { insightPrestigeBonus, nextPerkCost, perkLevel, pointsForPrestige, PERKS, startingTierIndex } from "./legacy";

// Moved out of the main-grid card layout into a header badge+dropdown — see
// admin-config.ts's FeaturesConfig.prestigeEnabled. Hidden entirely until
// canPrestige (the Engine reaching Stage 8) is true — no teaser before then.
export default function PrestigeBadge() {
  const {
    canPrestige,
    legacy,
    prestigeOutpost,
    buyLegacyPerk,
    tools,
    toolTiersList,
    resourceMeta,
    mechanics,
    features,
    engine,
  } = useAchievements();
  const [open, setOpen] = useState(false);
  const [confirming, setConfirming] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    function handlePointerDown(e: PointerEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
        setConfirming(false);
      }
    }
    function handleKey(e: KeyboardEvent) {
      if (e.key === "Escape") {
        setOpen(false);
        setConfirming(false);
      }
    }
    window.addEventListener("pointerdown", handlePointerDown);
    window.addEventListener("keydown", handleKey);
    return () => {
      window.removeEventListener("pointerdown", handlePointerDown);
      window.removeEventListener("keydown", handleKey);
    };
  }, [open]);

  if (!features.prestigeEnabled || !canPrestige) return null;

  const currentTool = findToolTier(toolTiersList, tools.tier);
  const order = toolTiersList.map((t) => t.id);
  const startIndex = Math.min(Math.max(0, order.length - 1), startingTierIndex(legacy.perks));
  const startTierName = findToolTier(toolTiersList, order[startIndex] ?? order[0]).name;
  const pointsPreview =
    pointsForPrestige(Math.max(0, order.indexOf(tools.tier)), mechanics.prestige.pointsPerTier) +
    insightPrestigeBonus(legacy.perks, engine.lifetimeInsight);
  // Borrowed Insight only shows once the Engine reaches its final stage (The
  // Wither & The End) — an earned capstone, not a perk available from minute
  // one. See engine/stages.ts.
  const perksVisible = PERKS.filter((p) => p.id !== "borrowed-insight" || engine.stage >= 8);

  return (
    <div ref={containerRef} className="relative">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        aria-haspopup="true"
        aria-label="Prestige"
        className="outpost-resource-chip transition-colors hover:border-[var(--outpost-accent)]"
      >
        <span aria-hidden="true">{"\u{1F31F}"}</span> Legacy {legacy.level}
      </button>

      {open && (
        <div className="outpost-settings-dropdown outpost-settings-dropdown-left" role="menu">
          <div className="flex items-center justify-between gap-2">
            <p className="text-xs font-bold uppercase tracking-wider text-white/40">Prestige</p>
            <span className="text-[0.65rem] normal-case text-white/40">{legacy.points} pts</span>
          </div>
          <p className="mt-1.5 text-xs font-normal normal-case leading-snug text-white/50">
            No rush — this is just a replay button. It resets your resources and tool tier ({"\u{2192}"}{" "}
            {startTierName}), but every achievement, tier, and level you&apos;ve earned stays exactly where it is.
          </p>
          <p className="mt-1 text-[0.65rem] font-normal normal-case text-white/40">
            Currently at {currentTool.icon} {currentTool.name} — prestiging now would bank {pointsPreview}{" "}
            {pointsPreview === 1 ? "point" : "points"}.
          </p>

          <div className="mt-2.5 space-y-2">
            {perksVisible.map((perk) => {
              const level = perkLevel(legacy.perks, perk.id);
              const cost = nextPerkCost(legacy.perks, perk.id);
              const maxed = cost === null;
              const canAfford = cost !== null && legacy.points >= cost;
              return (
                <div
                  key={perk.id}
                  className="flex items-center justify-between gap-2 rounded-md bg-white/5 px-2 py-1.5 text-[0.65rem]"
                >
                  <div className="flex min-w-0 items-center gap-1.5">
                    <span aria-hidden="true">{perk.icon}</span>
                    <div className="min-w-0">
                      <p className="truncate font-semibold text-white">
                        {perk.name}{" "}
                        <span className="font-normal normal-case text-white/40">
                          ({level}/{perk.maxLevel})
                        </span>
                      </p>
                      <p className="truncate normal-case text-white/40">{perk.description}</p>
                    </div>
                  </div>
                  {maxed ? (
                    <span className="shrink-0 normal-case text-white/40">Maxed</span>
                  ) : (
                    <button
                      type="button"
                      onClick={() => buyLegacyPerk(perk.id)}
                      disabled={!canAfford}
                      className={`shrink-0 rounded-md border px-2 py-1 font-semibold transition-colors ${
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
            <div className="mt-2.5 rounded-md border border-[var(--outpost-accent-soft)] bg-black/20 p-2 text-[0.65rem]">
              <p className="normal-case text-slate-300">
                Resets your{" "}
                {(Object.keys(resourceMeta) as (keyof typeof resourceMeta)[])
                  .map((id) => resourceMeta[id].name)
                  .join(", ")}{" "}
                and tool tier. Achievements, tiers, and levels are untouched. Go for it?
              </p>
              <div className="mt-1.5 flex gap-2">
                <button
                  type="button"
                  onClick={() => {
                    prestigeOutpost();
                    setConfirming(false);
                  }}
                  className="rounded-md border border-[var(--outpost-accent)] px-2.5 py-1 font-semibold text-[var(--outpost-accent)] hover:bg-[var(--outpost-accent-soft)]"
                >
                  Prestige now
                </button>
                <button
                  type="button"
                  onClick={() => setConfirming(false)}
                  className="rounded-md border border-white/15 px-2.5 py-1 normal-case text-white/60 hover:bg-white/5"
                >
                  Never mind
                </button>
              </div>
            </div>
          ) : (
            <button
              type="button"
              onClick={() => setConfirming(true)}
              className="mt-2.5 w-full rounded-md border border-[var(--outpost-accent)] px-2.5 py-1.5 text-[0.65rem] font-semibold text-[var(--outpost-accent)] hover:bg-[var(--outpost-accent-soft)]"
            >
              Prestige the Outpost
            </button>
          )}
        </div>
      )}
    </div>
  );
}
