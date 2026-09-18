"use client";

import { useAchievements } from "./AchievementsProvider";
import { findToolTier, RESOURCE_IDS } from "./resources";

// A persistent readout of collected resources + the current tool tier —
// sits above Tree Mining/Hunting/Mining/Crafting in the main card grid,
// tier-1 by default (those four cards are all tier-1 too, so this can't be
// tucked away in the tier-2-only Your Progress panel the way it first was).
export default function ResourceToolStrip() {
  const { resources, resourceMeta, tools, toolTiersList } = useAchievements();
  const collected = RESOURCE_IDS.filter((id) => resources[id] > 0);
  const tool = findToolTier(toolTiersList, tools.tier);

  return (
    <div className="outpost-panel rounded-xl p-4 sm:col-span-2">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-1.5">
          {collected.length === 0 ? (
            <p className="text-xs text-slate-400">
              Collect resources from Tree Mining, Hunting, and Mining to see them here.
            </p>
          ) : (
            collected.map((id) => (
              <span key={id} className="outpost-resource-chip">
                <span aria-hidden="true">{resourceMeta[id].icon}</span>
                {resources[id]}
              </span>
            ))
          )}
        </div>
        <div className="outpost-tool-badge" title={`Current tool: ${tool.name}`}>
          <span className="text-lg leading-none" aria-hidden="true">
            {tool.icon}
          </span>
          <span className="text-[0.6rem] font-semibold uppercase tracking-wide text-white/80">{tool.name}</span>
        </div>
      </div>
    </div>
  );
}
