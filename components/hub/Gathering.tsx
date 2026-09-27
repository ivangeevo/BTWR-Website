"use client";

import { useEffect, useRef, useState } from "react";
import { CooldownNotice, LoadingBarButton, useCooldownRemaining } from "./activity-common";
import { useAchievements } from "./AchievementsProvider";
import { farmGrowth } from "./camp";
import { computeCyclePhase, daylightMsBetween, isTwilight, loadCycleStartedAt } from "./day-night-cycle";
import RelicPrompt from "./RelicPrompt";
import { findToolTier, HUNTING_STAGE, type ResourceId, type ResourceState } from "./resources";

type ActionId = "wood-gathering" | "hunting" | "mining" | "fishing" | "farm";

// Ordered simplest -> most involved: Wood Gathering needs nothing and is
// always available (the "start very simple" baseline), Hunting opens with
// the camp at The Stump and Mining with the first tool that can dig. Fishing
// and the Farm are the Upgrades shop's (upgrade-catalog.ts) and only show
// up once bought.
const ACTIONS: { id: ActionId; label: string; icon: string }[] = [
  { id: "wood-gathering", label: "Wood", icon: "\u{1FA93}" },
  { id: "hunting", label: "Hunting", icon: "\u{1F3F9}" },
  { id: "mining", label: "Mining", icon: "\u{26CF}\u{FE0F}" },
  { id: "fishing", label: "Fishing", icon: "\u{1F3A3}" },
  { id: "farm", label: "Farm", icon: "\u{1F33E}" },
];

// The fishing bite and the farm's daylight both read the cycle's clock.
const CLOCK_REFRESH_MS = 2_000;

// Whether the farm plot (camp.ts) has a ripe crop, on the cycle's clock.
function useFarmRipe(): boolean {
  const { camp, mechanics, upgrades, mounted } = useAchievements();
  const [nowMs, setNowMs] = useState(0);
  useEffect(() => {
    if (!mounted) return;
    setNowMs(Date.now());
    const id = window.setInterval(() => setNowMs(Date.now()), CLOCK_REFRESH_MS);
    return () => window.clearInterval(id);
  }, [mounted]);
  if (!upgrades.purchased.includes("farm") || !camp.farm.plantedAt || nowMs === 0) return false;
  const daylight = daylightMsBetween(loadCycleStartedAt(), new Date(camp.farm.plantedAt).getTime(), nowMs);
  return (farmGrowth(daylight, mechanics.upgrades.farmGrowDaylightMin) ?? 0) >= 1;
}

// Gathering's line in its folded Camp rail header (CampRail.tsx): what's
// running, else the shared rest timer, plus a ripe crop and a relic waiting
// to be named.
export function GatheringStatus({ busy }: { busy: string | null }) {
  const { activityCooldownUntil, relic } = useAchievements();
  const remainingMs = useCooldownRemaining(activityCooldownUntil);
  const ripe = useFarmRipe();
  const text = busy ?? (remainingMs > 0 ? `Resting ${Math.ceil(remainingMs / 1000)}s` : "Ready");
  return (
    <span>
      {text}
      {ripe && <span className="text-[var(--outpost-accent)]"> · crop ripe</span>}
      {relic && <span className="text-[var(--outpost-accent)]"> · {"\u{1F9FF}"} relic</span>}
    </span>
  );
}

// All the activities used to be separate cards; combined into one so the
// shared cooldown (only one can ever be "active" at a time anyway) reads as
// one coherent hub instead of cards that happen to fight over the same
// timer. Planting and watching the farm don't touch the timer; harvesting
// does. Lives in the Camp rail (CampRail.tsx), which supplies its panel and
// title; onBusyChange tells its folded header what's running. A relic a
// trip turned up (relics.ts) waits at the top until it's named.
export default function Gathering({ onBusyChange }: { onBusyChange?: (busy: string | null) => void }) {
  const {
    tools,
    toolTiersList,
    activityCooldownUntil,
    completeWoodGathering,
    completeHunting,
    completeMining,
    completeFishing,
    plantFarm,
    harvestFarm,
    camp,
    mechanics,
    resourceMeta,
    upgrades,
    engine,
    engineBuffs,
    mounted,
  } = useAchievements();
  const [active, setActive] = useState<ActionId>("wood-gathering");
  const remainingMs = useCooldownRemaining(activityCooldownUntil);
  const tool = findToolTier(toolTiersList, tools.tier);
  const [lastYield, setLastYield] = useState<string | null>(null);
  const clearTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [nowMs, setNowMs] = useState(0);
  const { fishingMs, farmGrowDaylightMin } = mechanics.upgrades;

  useEffect(() => {
    if (!mounted) return;
    setNowMs(Date.now());
    const id = window.setInterval(() => setNowMs(Date.now()), CLOCK_REFRESH_MS);
    return () => window.clearInterval(id);
  }, [mounted]);

  const owns = (id: string) => upgrades.purchased.includes(id);
  const huntingOpen = engine.stage >= HUNTING_STAGE;
  const miningOpen = tool.miningMs !== null;
  const shownActions = ACTIONS.filter((a) => (a.id === "fishing" || a.id === "farm" ? owns(a.id) : true));

  function lockHint(id: ActionId): string | null {
    if (id === "hunting" && !huntingOpen) return "At The Stump";
    if (id === "mining" && !miningOpen) return "Needs Stone Tools";
    return null;
  }

  const anchor = nowMs > 0 ? loadCycleStartedAt() : 0;
  const phase = nowMs > 0 ? computeCyclePhase(anchor, nowMs) : null;
  const biting = phase !== null && isTwilight(phase);
  const plantedAtMs = camp.farm.plantedAt ? new Date(camp.farm.plantedAt).getTime() : null;
  const growth =
    plantedAtMs !== null && nowMs > 0
      ? farmGrowth(daylightMsBetween(anchor, plantedAtMs, nowMs), farmGrowDaylightMin)
      : null;
  const ripe = growth !== null && growth >= 1;

  function formatYield(gain: Partial<ResourceState>): string {
    return (Object.entries(gain) as [ResourceId, number][])
      .map(([id, amount]) => `${resourceMeta[id].icon} ${amount}`)
      .join("  ");
  }

  function flashYield(text: string | null) {
    if (clearTimerRef.current) clearTimeout(clearTimerRef.current);
    setLastYield(text);
    clearTimerRef.current = setTimeout(() => setLastYield(null), 6000);
  }

  function handleMiningComplete() {
    const gain = completeMining();
    flashYield(Object.keys(gain).length > 0 ? formatYield(gain) : null);
  }

  function handleFishingComplete() {
    const food = completeFishing();
    flashYield(food > 0 ? formatYield({ food }) : null);
  }

  const busyAs = (label: string) => (running: boolean) => onBusyChange?.(running ? label : null);

  return (
    <div>
      <p className="text-xs leading-snug text-slate-400">Pick an activity — they share one rest timer.</p>
      <RelicPrompt />

      <div className="mt-2.5 flex gap-1" role="tablist">
        {shownActions.map((a) => {
          const hint = lockHint(a.id);
          const unlocked = hint === null;
          const isActive = active === a.id;
          return (
            <button
              key={a.id}
              type="button"
              role="tab"
              aria-selected={isActive}
              disabled={!unlocked}
              onClick={() => unlocked && setActive(a.id)}
              className={`relative flex min-w-0 flex-1 flex-col items-center rounded-md border px-1 py-1 text-[11px] font-semibold leading-tight transition-colors ${
                !unlocked
                  ? "cursor-not-allowed border-white/10 text-white/25"
                  : isActive
                    ? "border-[var(--outpost-accent)] bg-[var(--outpost-accent-soft)] text-[var(--outpost-accent)]"
                    : "border-white/15 text-white/60 hover:border-[var(--outpost-accent-soft)]"
              }`}
            >
              <span aria-hidden="true">{unlocked ? a.icon : "\u{1F512}"}</span>
              {a.label}
              {hint && <span className="text-[9px] font-normal text-white/35">{hint}</span>}
              {a.id === "farm" && ripe && !isActive && (
                <span
                  className="absolute right-1 top-1 h-1.5 w-1.5 rounded-full bg-[var(--outpost-accent)]"
                  aria-label="Ready to harvest"
                />
              )}
            </button>
          );
        })}
      </div>

      {active === "wood-gathering" && (
        <div className="mt-2.5">
          <p className="text-xs text-slate-300">
            Gather wood by chopping down trees. Once you start swinging, it runs by itself.
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
              onComplete={completeWoodGathering}
              onRunningChange={busyAs("Chopping…")}
            />
          </div>
        </div>
      )}

      {active === "hunting" && huntingOpen && (
        <div className="mt-2.5">
          <p className="text-xs text-slate-300">
            Head out for food. Once you&apos;ve set off there&apos;s no calling it back early.
          </p>
          <div className="mt-2">
            <LoadingBarButton
              durationMs={tool.huntingMs}
              disabled={remainingMs > 0}
              idleLabel="Go hunting"
              runningLabel="Out hunting..."
              onComplete={completeHunting}
              onRunningChange={busyAs("Out hunting…")}
            />
          </div>
        </div>
      )}

      {active === "mining" && tool.miningMs !== null && (
        <div className="mt-2.5">
          <p className="text-xs text-slate-300">
            Break rock for Stone, Coal, Copper, and Iron — a better tool finds more of each.
          </p>
          {engineBuffs.millPowered && (
            <p className="mt-1 text-[11px] text-[var(--outpost-accent)]">
              {"\u{1FAA8}"} The Engine&apos;s Millstone is running: +{engineBuffs.millStone} {resourceMeta.stone.name} per run.
            </p>
          )}
          {engineBuffs.bellowsPowered && (
            <p className="mt-1 text-[11px] text-[var(--outpost-accent)]">
              {"\u{1F4A8}"} The Engine&apos;s Bellows are running: +{engineBuffs.bellowsOre} to each ore found.
            </p>
          )}
          <div className="mt-2">
            <LoadingBarButton
              durationMs={tool.miningMs}
              disabled={remainingMs > 0}
              idleLabel="Mine"
              runningLabel="Mining..."
              onComplete={handleMiningComplete}
              onRunningChange={busyAs("Mining…")}
            />
          </div>
          {lastYield && <p className="mt-1.5 text-[11px] text-[var(--outpost-accent)]">Found: {lastYield}</p>}
        </div>
      )}

      {active === "fishing" && owns("fishing") && (
        <div className="mt-2.5">
          <p className="text-xs text-slate-300">
            Slow, but safe: fishing never makes you hungry and nothing bites back. Best at dawn and dusk.
          </p>
          {biting && (
            <p className="mt-1 text-[11px] text-[var(--outpost-accent)]">{"\u{1F41F}"} The fish are biting.</p>
          )}
          <div className="mt-2">
            <LoadingBarButton
              durationMs={fishingMs}
              disabled={remainingMs > 0}
              idleLabel="Cast a line"
              runningLabel="Fishing..."
              onComplete={handleFishingComplete}
              onRunningChange={busyAs("Fishing…")}
            />
          </div>
          {lastYield && <p className="mt-1.5 text-[11px] text-[var(--outpost-accent)]">Caught: {lastYield}</p>}
        </div>
      )}

      {active === "farm" && owns("farm") && (
        <div className="mt-2.5">
          <p className="text-xs text-slate-300">
            Crops grow while you&apos;re away, but only in daylight. Harvest them for {resourceMeta.food.name}.
          </p>
          {growth === null ? (
            <button
              type="button"
              onClick={plantFarm}
              className="mt-2 rounded-lg px-3 py-1 text-xs font-semibold btn-glow btn-gradient text-white"
            >
              Plant a crop
            </button>
          ) : (
            <>
              <div
                className="mt-2 h-1.5 overflow-hidden rounded-full bg-white/10"
                role="progressbar"
                aria-label="Crop growth"
                aria-valuemin={0}
                aria-valuemax={100}
                aria-valuenow={Math.round(growth * 100)}
              >
                <div className="h-full bg-[var(--outpost-accent)]" style={{ width: `${growth * 100}%` }} />
              </div>
              <p className="mt-1 text-[11px] text-white/50">
                {ripe
                  ? "Ripe and ready."
                  : `${Math.round(growth * 100)}% grown${phase && !phase.isDay ? " · resting until dawn" : ""}`}
              </p>
              <button
                type="button"
                onClick={harvestFarm}
                disabled={!ripe || remainingMs > 0}
                className={`mt-1.5 rounded-md border px-2 py-1 text-[11px] font-semibold transition-colors ${
                  ripe && remainingMs <= 0
                    ? "border-[var(--outpost-accent)] text-[var(--outpost-accent)] hover:bg-[var(--outpost-accent-soft)]"
                    : "border-white/15 text-white/30"
                }`}
              >
                Harvest
              </button>
            </>
          )}
        </div>
      )}

      <CooldownNotice remainingMs={remainingMs} />
    </div>
  );
}
