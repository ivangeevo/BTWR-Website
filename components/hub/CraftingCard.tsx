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

function GridSlots({ size }: { size: string }) {
  const count = size === "2×2" ? 4 : size === "3×3" ? 9 : 16;
  const cols = size === "2×2" ? 2 : size === "3×3" ? 3 : 4;
  return (
    <div className="outpost-crafting-grid" style={{ gridTemplateColumns: `repeat(${cols}, 1.1rem)` }}>
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
    <div className="mt-2 rounded-lg border border-white/10 p-2">
      <div className="flex items-center gap-2">
        <GridSlots size={grid.size} />
        <div>
          <p className="text-xs font-semibold text-white">{grid.name}</p>
          <p className="text-[10px] text-white/40">{grid.size} grid</p>
        </div>
      </div>

      <div className="mt-1.5 space-y-1">
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
              className={`flex items-center justify-between gap-2 rounded-md px-2 py-1 text-[11px] ${
                status === "done" ? "bg-white/5 text-white/40" : "bg-white/5"
              }`}
            >
              <div className="flex items-center gap-2">
                <span aria-hidden="true">{tool.icon}</span>
                <span className="font-semibold text-white">{tool.name}</span>
                <span className="text-white/40">
                  {(Object.entries(cost) as [ResourceId, number][])
                    .map(([id, amount]) => `${resourceMeta[id].icon} ${amount}`)
                    .join("  ")}
                </span>
              </div>
              {status === "done" && <span className="shrink-0 text-white/40">Crafted</span>}
              {status === "locked" && <span className="shrink-0 text-white/40">Craft earlier tools first</span>}
              {status === "next" && (
                <button
                  type="button"
                  onClick={() => craftTool(tierId)}
                  disabled={!canAfford}
                  className={`shrink-0 rounded-md border px-2 py-0.5 text-[11px] font-semibold transition-colors ${
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

export default function CraftingCard() {
  const { xpInfo, tools, toolTiersList } = useAchievements();
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
      <p className="mt-1.5 text-sm text-slate-300">
        Spend collected resources to craft a better tool — current:{" "}
        {findToolTier(toolTiersList, tools.tier).name}.
      </p>

      {unlockedGrids.length === 0 ? (
        <p className="mt-2 text-[11px] text-white/40">Keep leveling up to unlock your first crafting grid.</p>
      ) : (
        <>
          {unlockedGrids.length > 1 && (
            <div className="mt-2 flex gap-1.5">
              {unlockedGrids.map((grid) => (
                <button
                  key={grid.id}
                  type="button"
                  onClick={() => setActiveGridId(grid.id)}
                  aria-pressed={activeGrid?.id === grid.id}
                  className={`rounded-md border px-2 py-0.5 text-[11px] font-semibold transition-colors ${
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
    </div>
  );
}
