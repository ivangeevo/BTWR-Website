"use client";

import { useRef, useState } from "react";
import { CooldownNotice, HoldButton, LoadingBarButton, useCooldownRemaining } from "./activity-common";
import { useAchievements } from "./AchievementsProvider";
import { findToolTier, type ResourceId, type ResourceState } from "./resources";

type ActionId = "tree-mining" | "hunting" | "mining";

// Ordered simplest -> most involved: Tree Mining needs nothing and is
// always available (the "start very simple" baseline), Hunting and Mining
// reveal as toggles once later tiers unlock, gradually turning this from a
// one-button card into the full three-way gathering hub. Mining also keeps
// its own separate "need a tool" gate below regardless of tier, same as
// before.
const ACTIONS: { id: ActionId; label: string; icon: string }[] = [
  { id: "tree-mining", label: "Tree Mining", icon: "\u{1FA93}" },
  { id: "hunting", label: "Hunting", icon: "\u{1F3F9}" },
  { id: "mining", label: "Mining", icon: "\u{26CF}\u{FE0F}" },
];

// All three activities used to be separate cards; combined into one so the
// shared cooldown (only one can ever be "active" at a time anyway) reads as
// one coherent hub instead of three cards that happen to fight over the
// same timer. Tree Mining is always available; Hunting and Mining each
// unlock at their own admin-configured tier (Features tab in
// /outpost-admin — features.huntingTierId/miningTierId), defaulting to
// tier2 for both so a visitor who's never touched that panel sees exactly
// today's behavior.
export default function Gathering() {
  const {
    tools,
    toolTiersList,
    activityCooldownUntil,
    completeTreeMining,
    completeHunting,
    completeMining,
    resourceMeta,
    tiers,
    isTierUnlocked,
    features,
  } = useAchievements();
  const [active, setActive] = useState<ActionId>("tree-mining");
  const remainingMs = useCooldownRemaining(activityCooldownUntil);
  const tool = findToolTier(toolTiersList, tools.tier);
  const [lastYield, setLastYield] = useState<string | null>(null);
  const clearTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  function unlockTierFor(id: ActionId) {
    const tierId = id === "tree-mining" ? tiers[0]?.id : id === "hunting" ? features.huntingTierId : features.miningTierId;
    return tiers.find((t) => t.id === tierId) ?? tiers[tiers.length - 1];
  }

  function formatYield(gain: Partial<ResourceState>): string {
    return (Object.entries(gain) as [ResourceId, number][])
      .map(([id, amount]) => `${resourceMeta[id].icon} ${amount}`)
      .join("  ");
  }

  function handleMiningComplete() {
    const gain = completeMining();
    if (clearTimerRef.current) clearTimeout(clearTimerRef.current);
    setLastYield(Object.keys(gain).length > 0 ? formatYield(gain) : null);
    clearTimerRef.current = setTimeout(() => setLastYield(null), 6000);
  }

  return (
    <div className="outpost-panel rounded-xl p-5">
      <h3 className="font-heading text-sm font-bold uppercase tracking-wider text-[var(--outpost-accent)]">
        Gathering
      </h3>
      <p className="mt-2 text-sm text-slate-300">Pick an activity — they share one rest timer.</p>

      <div className="mt-4 flex gap-2" role="tablist">
        {ACTIONS.map((a) => {
          const tierDef = unlockTierFor(a.id);
          const unlocked = isTierUnlocked(tierDef.id);
          const isActive = active === a.id;
          return (
            <button
              key={a.id}
              type="button"
              role="tab"
              aria-selected={isActive}
              disabled={!unlocked}
              onClick={() => unlocked && setActive(a.id)}
              className={`flex flex-1 flex-col items-center gap-0.5 rounded-md border px-2 py-2 text-xs font-semibold transition-colors ${
                !unlocked
                  ? "cursor-not-allowed border-white/10 text-white/25"
                  : isActive
                    ? "border-[var(--outpost-accent)] bg-[var(--outpost-accent-soft)] text-[var(--outpost-accent)]"
                    : "border-white/15 text-white/60 hover:border-[var(--outpost-accent-soft)]"
              }`}
            >
              <span aria-hidden="true">{unlocked ? a.icon : "\u{1F512}"}</span>
              {a.label}
              {!unlocked && <span className="text-[10px] font-normal text-white/35">{tierDef.name}</span>}
            </button>
          );
        })}
      </div>

      {active === "tree-mining" && (
        <div className="mt-4">
          <p className="text-sm text-slate-300">
            Hold to break down a tree for wood. Keep holding — letting go just pauses it.
          </p>
          <div className="mt-3">
            <HoldButton
              durationMs={tool.treeMiningMs}
              disabled={remainingMs > 0}
              idleLabel="Hold to chop"
              holdingLabel="Chopping..."
              onComplete={completeTreeMining}
            />
          </div>
        </div>
      )}

      {active === "hunting" && (
        <div className="mt-4">
          <p className="text-sm text-slate-300">
            Head out for food. Once you&apos;ve set off there&apos;s no calling it back early.
          </p>
          <div className="mt-3">
            <LoadingBarButton
              durationMs={tool.huntingMs}
              disabled={remainingMs > 0}
              idleLabel="Go hunting"
              runningLabel="Out hunting..."
              onComplete={completeHunting}
            />
          </div>
        </div>
      )}

      {active === "mining" && (
        <div className="mt-4">
          <p className="text-sm text-slate-300">
            Hold to break rock. Yields Stone, Coal, Copper, and Iron — a better tool finds more of each.
          </p>
          {tool.miningMs === null ? (
            <p className="mt-3 rounded-lg border border-white/10 bg-white/5 px-3 py-2.5 text-xs text-white/50">
              Craft a Stone Tool in the Crafting card first — mining bare-handed doesn&apos;t get you anywhere.
            </p>
          ) : (
            <>
              <div className="mt-3">
                <HoldButton
                  durationMs={tool.miningMs}
                  disabled={remainingMs > 0}
                  idleLabel="Hold to mine"
                  holdingLabel="Mining..."
                  onComplete={handleMiningComplete}
                />
              </div>
              {lastYield && <p className="mt-2 text-xs text-[var(--outpost-accent)]">Found: {lastYield}</p>}
            </>
          )}
        </div>
      )}

      <CooldownNotice remainingMs={remainingMs} />
    </div>
  );
}
