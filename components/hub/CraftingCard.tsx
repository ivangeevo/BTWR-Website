"use client";

import { useEffect, useState } from "react";
import { useAchievements } from "./AchievementsProvider";
import {
  CRAFTING_GRIDS,
  findToolTier,
  TOOL_ORDER,
  type CraftingGrid,
  type ResourceId,
  type ToolTier,
} from "./resources";
import { FarFromCamp } from "./StrandedPanel";

// One fixed-size square block whatever the grid (2×2, 3×3 or 4×4) — its
// squares divide it evenly, so they're always square and a bigger grid
// never makes the card taller (see .outpost-crafting-grid).
function GridSlots({ size }: { size: string }) {
  const count = size === "2×2" ? 4 : size === "3×3" ? 9 : 16;
  const cols = size === "2×2" ? 2 : size === "3×3" ? 3 : 4;
  return (
    <div className="outpost-crafting-grid" style={{ "--cols": cols } as React.CSSProperties}>
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} className="outpost-crafting-slot" aria-hidden="true">
          {"⚒️"}
        </div>
      ))}
    </div>
  );
}

function GridSection({
  grid,
  craftableIds,
}: {
  grid: CraftingGrid;
  craftableIds: string[];
}) {
  const { tools, toolTiersList, resources, craftTool, craftCostFor, resourceMeta } = useAchievements();
  const order = toolTiersList.map((t) => t.id);
  const currentIndex = order.indexOf(tools.tier);

  return (
    <div className="mt-1.5 rounded-lg border border-white/10 p-1.5">
      <div className="flex items-center gap-2">
        <GridSlots size={grid.size} />
        <div>
          <p className="text-xs font-semibold text-white">{grid.name}</p>
          <p className="text-[9px] text-white/40">{grid.size} grid</p>
        </div>
      </div>

      <div className="mt-1.5 space-y-0.5">
        {grid.id === "player" && <CampfireRow />}
        {craftableIds.map((tierId) => {
          const targetIndex = order.indexOf(tierId);
          const tool: ToolTier = findToolTier(toolTiersList, tierId);
          const cost = craftCostFor(tierId);
          const status: "done" | "next" | "locked" =
            targetIndex <= currentIndex ? "done" : targetIndex === currentIndex + 1 ? "next" : "locked";
          const canAfford = (Object.entries(cost) as [ResourceId, number][]).every(
            ([id, amount]) => (resources[id] ?? 0) >= amount
          );

          return (
            <div
              key={tierId}
              className={`flex items-center justify-between gap-2 rounded-md px-1.5 py-0.5 text-[10px] ${
                status === "done" ? "bg-white/5 text-white/40" : "bg-white/5"
              }`}
            >
              <div className="flex min-w-0 items-center gap-1.5">
                <span aria-hidden="true">{tool.icon}</span>
                <span className="font-semibold text-white">{tool.name}</span>
                <span className="text-white/40">
                  {(Object.entries(cost) as [ResourceId, number][])
                    .map(([id, amount]) => `${resourceMeta[id].icon} ${amount}`)
                    .join(" ")}
                </span>
              </div>
              {status === "done" && <span className="shrink-0 text-white/40">Crafted</span>}
              {status === "locked" && (
                <span className="shrink-0 text-white/40" title="Craft the tools above it first">
                  Locked
                </span>
              )}
              {status === "next" && (
                <button
                  type="button"
                  onClick={() => craftTool(tierId)}
                  disabled={!canAfford}
                  className={`shrink-0 rounded-md border px-1.5 py-px text-[10px] font-semibold transition-colors ${
                    canAfford
                      ? "border-[var(--outpost-accent)] text-[var(--outpost-accent)] hover:bg-[var(--outpost-accent-soft)]"
                      : "border-white/15 text-white/30"
                  }`}
                >
                  Craft
                </button>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

// The Campfire itself — the first thing on the 2×2 grid, before any tool.
// Crafting it reveals the fire in the Campfire card, already lit.
function CampfireRow() {
  const { campfire, resources, resourceMeta, mechanics, craftCampfire } = useAchievements();
  const cost = mechanics.campfire.craftWoodCost;
  const canAfford = resources.wood >= cost;

  return (
    <div
      className={`flex items-center justify-between gap-2 rounded-md bg-white/5 px-1.5 py-0.5 text-[10px] ${
        campfire.built ? "text-white/40" : ""
      }`}
    >
      <div className="flex min-w-0 items-center gap-1.5">
        <span aria-hidden="true">{"\u{1F525}"}</span>
        <span className="font-semibold text-white">Campfire</span>
        {!campfire.built && (
          <span className="text-white/40">
            {resourceMeta.wood.icon} {cost}
          </span>
        )}
      </div>
      {campfire.built ? (
        <span className="shrink-0 text-white/40">Crafted</span>
      ) : (
        <button
          type="button"
          onClick={() => craftCampfire()}
          disabled={!canAfford}
          className={`shrink-0 rounded-md border px-1.5 py-px text-[10px] font-semibold transition-colors ${
            canAfford
              ? "border-[var(--outpost-accent)] text-[var(--outpost-accent)] hover:bg-[var(--outpost-accent-soft)]"
              : "border-white/15 text-white/30"
          }`}
        >
          Craft
        </button>
      )}
    </div>
  );
}

// Hardcore Spawn's one-off craft (survival.ts): halves every later trek home.
function CompassRow() {
  const { survival, resources, resourceMeta, mechanics, craftCompass } = useAchievements();
  const { compassIron, compassCopper } = mechanics.survival;
  const cost: [ResourceId, number][] = (
    [
      ["iron", compassIron],
      ["copper", compassCopper],
    ] as [ResourceId, number][]
  ).filter(([, n]) => n > 0);
  const canAfford = cost.every(([id, n]) => (resources[id] ?? 0) >= n);

  return (
    <div className="mt-1.5 flex items-center justify-between gap-2 rounded-md bg-white/5 px-1.5 py-0.5 text-[10px]">
      <div className="flex min-w-0 items-center gap-1.5">
        <span aria-hidden="true">{"\u{1F9ED}"}</span>
        <span className="font-semibold text-white">Compass</span>
        <span className="text-white/40">
          {survival.compass
            ? "Halves the walk home"
            : cost.map(([id, n]) => `${resourceMeta[id].icon} ${n}`).join(" ")}
        </span>
      </div>
      {survival.compass ? (
        <span className="shrink-0 text-white/40">Crafted</span>
      ) : (
        <button
          type="button"
          onClick={() => craftCompass()}
          disabled={!canAfford}
          title="Halves the trek back to camp after a respawn"
          className={`shrink-0 rounded-md border px-1.5 py-px text-[10px] font-semibold transition-colors ${
            canAfford
              ? "border-[var(--outpost-accent)] text-[var(--outpost-accent)] hover:bg-[var(--outpost-accent-soft)]"
              : "border-white/15 text-white/30"
          }`}
        >
          Craft
        </button>
      )}
    </div>
  );
}

export default function CraftingCard() {
  const { xpInfo, tools, toolTiersList, survivalActive, stranded } = useAchievements();
  // Admin-added tiers beyond Netherite have nowhere hand-authored to live,
  // so they default into the Soulforge grid (the pack's "advanced/late-game"
  // slot already).
  const customIds = toolTiersList.map((t) => t.id).filter((id) => !TOOL_ORDER.includes(id as (typeof TOOL_ORDER)[number]));
  const unlockedGrids = CRAFTING_GRIDS.filter((grid) => xpInfo.level >= grid.unlockLevel);
  const [activeGridId, setActiveGridId] = useState<string | null>(null);

  // Keep the active tab pointed at an unlocked grid — falls back to the
  // last (most advanced) one whenever the current selection is missing or
  // just got locked out from under it (e.g. a fresh admin reset).
  useEffect(() => {
    if (unlockedGrids.length === 0) return;
    if (!activeGridId || !unlockedGrids.some((g) => g.id === activeGridId)) {
      setActiveGridId(unlockedGrids[unlockedGrids.length - 1].id);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [unlockedGrids.map((g) => g.id).join(",")]);

  const activeGrid = unlockedGrids.find((g) => g.id === activeGridId) ?? unlockedGrids[unlockedGrids.length - 1];

  return (
    <div className="outpost-panel outpost-card-md rounded-xl p-4">
      <h3 className="font-heading text-sm font-bold uppercase tracking-wider text-[var(--outpost-accent)]">
        Crafting
      </h3>
      <p className="mt-1 text-xs leading-snug text-slate-400">
        Spend collected resources to craft a better tool — current:{" "}
        {findToolTier(toolTiersList, tools.tier).name}.
      </p>

      {unlockedGrids.length === 0 ? (
        <p className="mt-1.5 text-[10px] text-white/40">Keep leveling up to unlock your first crafting grid.</p>
      ) : (
        <>
          {unlockedGrids.length > 1 && (
            <div className="mt-1.5 flex gap-1">
              {unlockedGrids.map((grid) => (
                <button
                  key={grid.id}
                  type="button"
                  onClick={() => setActiveGridId(grid.id)}
                  aria-pressed={activeGrid?.id === grid.id}
                  className={`rounded-md border px-1.5 py-px text-[10px] font-semibold transition-colors ${
                    activeGrid?.id === grid.id
                      ? "border-[var(--outpost-accent)] text-[var(--outpost-accent)] bg-[var(--outpost-accent-soft)]"
                      : "border-white/15 text-white/40 hover:text-white/70"
                  }`}
                >
                  {grid.name}
                </button>
              ))}
            </div>
          )}

          {activeGrid && (
            <GridSection
              key={activeGrid.id}
              grid={activeGrid}
              craftableIds={activeGrid.id === "soulforge" ? [...activeGrid.crafts, ...customIds] : activeGrid.crafts}
            />
          )}
        </>
      )}
      {survivalActive && <CompassRow />}
      {stranded && <FarFromCamp />}
    </div>
  );
}
