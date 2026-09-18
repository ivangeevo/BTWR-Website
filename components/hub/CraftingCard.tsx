"use client";

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
    <div className="outpost-crafting-grid" style={{ gridTemplateColumns: `repeat(${cols}, 1.4rem)` }}>
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
  level,
}: {
  grid: CraftingGrid;
  craftableIds: string[];
  level: number;
}) {
  const { tools, toolTiersList, resources, craftTool, craftCostFor, resourceMeta } = useAchievements();
  const unlocked = level >= grid.unlockLevel;
  const order = toolTiersList.map((t) => t.id);
  const currentIndex = order.indexOf(tools.tier);

  return (
    <div className="mt-4 rounded-lg border border-white/10 p-3">
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <GridSlots size={grid.size} />
          <div>
            <p className="text-sm font-semibold text-white">{grid.name}</p>
            <p className="text-xs text-white/40">{grid.size} grid</p>
          </div>
        </div>
        {!unlocked && (
          <span className="shrink-0 text-xs text-white/40">Unlocks at level {grid.unlockLevel}</span>
        )}
      </div>

      {unlocked && (
        <div className="mt-3 space-y-2">
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
                className={`flex items-center justify-between gap-3 rounded-md px-2.5 py-2 text-xs ${
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
                    className={`shrink-0 rounded-md border px-2.5 py-1 text-xs font-semibold transition-colors ${
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
      )}
    </div>
  );
}

export default function CraftingCard() {
  const { xpInfo, tools, toolTiersList } = useAchievements();
  // Admin-added tiers beyond Netherite have nowhere hand-authored to live,
  // so they default into the Soulforge grid (the pack's "advanced/late-game"
  // slot already).
  const customIds = toolTiersList.map((t) => t.id).filter((id) => !TOOL_ORDER.includes(id as (typeof TOOL_ORDER)[number]));

  return (
    <div className="outpost-panel rounded-xl p-5">
      <h3 className="font-heading text-sm font-bold uppercase tracking-wider text-[var(--outpost-accent)]">
        Crafting
      </h3>
      <p className="mt-2 text-sm text-slate-300">
        Spend collected resources to craft a better tool — current:{" "}
        {findToolTier(toolTiersList, tools.tier).name}.
      </p>
      {CRAFTING_GRIDS.map((grid) => (
        <GridSection
          key={grid.id}
          grid={grid}
          craftableIds={grid.id === "soulforge" ? [...grid.crafts, ...customIds] : grid.crafts}
          level={xpInfo.level}
        />
      ))}
    </div>
  );
}
