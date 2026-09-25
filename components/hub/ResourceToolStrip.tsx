"use client";

import { useAchievements } from "./AchievementsProvider";
import { useEngineOptional } from "./engine/ui/EngineProvider";
import InsightCounter from "./engine/ui/visuals/InsightCounter";
import { findToolTier, RESOURCE_IDS } from "./resources";

// A persistent readout of collected resources + the current tool tier, at
// the top of the Outpost's right-hand "store" column.
export default function ResourceToolStrip() {
  const { resources, resourceMeta, tools, toolTiersList } = useAchievements();
  const collected = RESOURCE_IDS.filter((id) => resources[id] > 0);
  const tool = findToolTier(toolTiersList, tools.tier);
  const engine = useEngineOptional();

  return (
    <div className="outpost-panel rounded-xl p-4">
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
        {/* From Beginning to Thrive on, the Engine's thoughts are a resource worth watching too. */}
        {engine && engine.e.stage >= 6 && (
          <span className="ml-auto">
            <InsightCounter compact />
          </span>
        )}
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
