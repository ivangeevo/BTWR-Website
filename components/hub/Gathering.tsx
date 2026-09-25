"use client";

import { useRef, useState } from "react";
import { CooldownNotice, LoadingBarButton, useCooldownRemaining } from "./activity-common";
import { useAchievements } from "./AchievementsProvider";
import { findToolTier, type ResourceId, type ResourceState } from "./resources";

type ActionId = "tree-mining" | "hunting" | "mining";

// Ordered simplest -> most involved: Wood Chopping needs nothing and is
// always available (the "start very simple" baseline), Hunting and Mining
// reveal as toggles once later tiers unlock, gradually turning this from a
// one-button card into the full three-way gathering hub. Mining also keeps
// its own separate "need a tool" gate below regardless of tier, same as
// before.
const ACTIONS: { id: ActionId; label: string; icon: string }[] = [
  { id: "tree-mining", label: "Wood Chopping", icon: "\u{1FA93}" },
  { id: "hunting", label: "Hunting", icon: "\u{1F3F9}" },
  { id: "mining", label: "Mining", icon: "\u{26CF}\u{FE0F}" },
];

// All three activities used to be separate cards; combined into one so the
// shared cooldown (only one can ever be "active" at a time anyway) reads as
// one coherent hub instead of three cards that happen to fight over the
// same timer. Wood Chopping is always available; Hunting and Mining each
// unlock as their own purchase in the Upgrades shop (upgrade-catalog.ts —
// ids "hunting"/"mining"), each keeping its own tier requirement there
// before it can even be bought.
export default function Gathering() {
  const {
    tools,
    toolTiersList,
    activityCooldownUntil,
    completeTreeMining,
    completeHunting,
    completeMining,
    resourceMeta,
    upgrades,
    engineBuffs,
  } = useAchievements();
  const [active, setActive] = useState<ActionId>("tree-mining");
  const remainingMs = useCooldownRemaining(activityCooldownUntil);
  const tool = findToolTier(toolTiersList, tools.tier);
  const [lastYield, setLastYield] = useState<string | null>(null);
  const clearTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  function isUnlocked(id: ActionId): boolean {
    return id === "tree-mining" || upgrades.purchased.includes(id);
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
    <div className="outpost-panel outpost-card-md rounded-xl p-4">
      <h3 className="font-heading text-sm font-bold uppercase tracking-wider text-[var(--outpost-accent)]">
        Gathering
      </h3>
      <p className="mt-1 text-xs leading-snug text-slate-400">Pick an activity — they share one rest timer.</p>

      <div className="mt-2.5 flex gap-1.5" role="tablist">
        {ACTIONS.map((a) => {
          const unlocked = isUnlocked(a.id);
          const isActive = active === a.id;
          return (
            <button
              key={a.id}
              type="button"
              role="tab"
              aria-selected={isActive}
              disabled={!unlocked}
              onClick={() => unlocked && setActive(a.id)}
              className={`flex flex-1 flex-col items-center rounded-md border px-1.5 py-1 text-[11px] font-semibold leading-tight transition-colors ${
                !unlocked
                  ? "cursor-not-allowed border-white/10 text-white/25"
                  : isActive
                    ? "border-[var(--outpost-accent)] bg-[var(--outpost-accent-soft)] text-[var(--outpost-accent)]"
                    : "border-white/15 text-white/60 hover:border-[var(--outpost-accent-soft)]"
              }`}
            >
              <span aria-hidden="true">{unlocked ? a.icon : "\u{1F512}"}</span>
              {a.label}
              {!unlocked && <span className="text-[9px] font-normal text-white/35">Buy in Upgrades</span>}
            </button>
          );
        })}
      </div>

      {active === "tree-mining" && (
        <div className="mt-2.5">
          <p className="text-xs text-slate-300">
            Chop down a tree for wood. Once you start swinging, it runs by itself.
          </p>
          {engineBuffs.sawPowered && (
            <p className="mt-1 text-[11px] text-[var(--outpost-accent)]">
              {"\u{1FA9A}"} The Engine&apos;s Saw is running: faster chops, +{engineBuffs.sawWood} {resourceMeta.wood.name}.
            </p>
          )}
          <div className="mt-2">
            <LoadingBarButton
              durationMs={Math.round(tool.treeMiningMs * engineBuffs.sawHoldMult)}
              disabled={remainingMs > 0}
              idleLabel="Chop wood"
              runningLabel="Chopping..."
              onComplete={completeTreeMining}
            />
          </div>
        </div>
      )}

      {active === "hunting" && (
        <div className="mt-2.5">
          <p className="text-xs text-slate-300">
            Head out for food. Once you&apos;ve set off there&apos;s no calling it back early.
          </p>
          {engineBuffs.millstonePowered && engineBuffs.millstoneFood > 0 && (
            <p className="mt-1 text-[11px] text-[var(--outpost-accent)]">
              {"\u{1FAA8}"} The Engine&apos;s Millstone is running: +{engineBuffs.millstoneFood} {resourceMeta.food.name} per trip.
            </p>
          )}
          <div className="mt-2">
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
        <div className="mt-2.5">
          <p className="text-xs text-slate-300">
            Break rock for Stone, Coal, Copper, and Iron — a better tool finds more of each.
          </p>
          {tool.miningMs === null ? (
            <p className="mt-2 rounded-lg border border-white/10 bg-white/5 px-2.5 py-1.5 text-[11px] text-white/50">
              Craft a Stone Tool in the Crafting card first — mining bare-handed doesn&apos;t get you anywhere.
            </p>
          ) : (
            <>
              <div className="mt-2">
                <LoadingBarButton
                  durationMs={tool.miningMs}
                  disabled={remainingMs > 0}
                  idleLabel="Mine"
                  runningLabel="Mining..."
                  onComplete={handleMiningComplete}
                />
              </div>
              {lastYield && <p className="mt-1.5 text-[11px] text-[var(--outpost-accent)]">Found: {lastYield}</p>}
            </>
          )}
        </div>
      )}

      <CooldownNotice remainingMs={remainingMs} />
    </div>
  );
}
