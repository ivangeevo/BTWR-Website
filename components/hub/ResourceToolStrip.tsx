"use client";

import { useAchievements } from "./AchievementsProvider";
import { useEngineOptional } from "./engine/ui/EngineProvider";
import { InsightValue } from "./engine/ui/visuals/InsightCounter";
import { findToolTier, RESOURCE_IDS } from "./resources";
import VitalsBar from "./VitalsBar";

// A persistent readout of collected resources + the current tool tier, at
// the top of the Outpost's right-hand "store" column. Every collected
// material gets its own labelled row (two to a line), so none is ever cut
// off and each is readable even where an emoji doesn't render.
// (shrink-0: the column scrolls rather than squeezing a panel and clipping
// its last rows.) Also carries Health and Hunger (VitalsBar), so it's
// .outpost-lit: it stays readable above the gloom (GloomLayer.tsx).
export default function ResourceToolStrip() {
  const { resources, resourceMeta, tools, toolTiersList, survivalActive } = useAchievements();
  // Full survival adds Health and Hunger up top (VitalsBar), so the title says so.
  const title = survivalActive ? "Stats & Materials" : "Materials";
  const collected = RESOURCE_IDS.filter((id) => resources[id] > 0);
  const tool = findToolTier(toolTiersList, tools.tier);
  const engine = useEngineOptional();
  // From Beginning to Thrive on, the Engine's thoughts are a resource worth watching too.
  const showInsight = !!engine && engine.e.stage >= 6;

  return (
    <section className="outpost-panel outpost-lit shrink-0 rounded-xl p-3" aria-label={`${title} and tools`}>
      <div className="flex items-center justify-between gap-2">
        <h3 className="font-heading text-sm font-bold uppercase tracking-wider text-[var(--outpost-accent)]">
          {title}
        </h3>
        <div className="outpost-tool-badge outpost-tool-badge-inline" title={`Current tool: ${tool.name}`}>
          <span className="text-base leading-none" aria-hidden="true">
            {tool.icon}
          </span>
          <span className="text-[0.6rem] font-semibold uppercase tracking-wide text-white/80">{tool.name}</span>
        </div>
      </div>
      <VitalsBar />
      {collected.length === 0 && !showInsight ? (
        <p className="mt-1 text-xs leading-snug text-slate-400">
          Collect resources from Wood Gathering, Hunting, and Mining to see them here.
        </p>
      ) : (
        <ul className="outpost-materials mt-2">
          {collected.map((id) => (
            <li key={id} className="outpost-material" title={resourceMeta[id].name}>
              <span aria-hidden="true">{resourceMeta[id].icon}</span>
              <span className="outpost-material-name">{resourceMeta[id].name}</span>
              <span className="outpost-material-count">{resources[id]}</span>
            </li>
          ))}
          {showInsight && (
            <li className="outpost-material" title="Insight — the Engine's thoughts">
              <span aria-hidden="true">{"\u{1F4A1}"}</span>
              <span className="outpost-material-name">Insight</span>
              <span className="outpost-material-count">
                <InsightValue />
              </span>
            </li>
          )}
        </ul>
      )}
    </section>
  );
}
