"use client";

import { IRON_TOOLS, IRON_TOOLS_BY_ID, isIronToolId } from "./iron-tools";
import { useAchievements } from "./AchievementsProvider";

// "Which iron tool should I make first?" — no correct answer in BTW, so
// this is a re-pickable decision, not a one-shot quiz question.
export default function FirstIronTool() {
  const { firstIronTool, chooseIronTool } = useAchievements();
  const chosen = firstIronTool.choice && isIronToolId(firstIronTool.choice) ? IRON_TOOLS_BY_ID[firstIronTool.choice] : null;

  return (
    <div className="outpost-panel rounded-xl p-5">
      <h3 className="font-heading text-sm font-bold uppercase tracking-wider text-[var(--outpost-accent)]">
        Your First Iron Tool
      </h3>
      <p className="mt-2 text-sm text-slate-300">
        One of the most debated questions in BTW — there&apos;s no correct answer. What would you make first?
      </p>
      <div className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-4">
        {IRON_TOOLS.map((tool) => (
          <button
            key={tool.id}
            type="button"
            onClick={() => chooseIronTool(tool.id)}
            aria-pressed={chosen?.id === tool.id}
            title={tool.name}
            className={`flex flex-col items-center gap-1 rounded-lg border px-2 py-2 text-center text-xs font-medium transition-colors ${
              chosen?.id === tool.id
                ? "border-[var(--outpost-accent)] bg-white/5 text-white"
                : "border-white/10 text-slate-300 hover:border-[var(--outpost-accent-soft)]"
            }`}
          >
            <span className="text-lg leading-none" aria-hidden="true">
              {tool.icon}
            </span>
            <span className="truncate">{tool.name}</span>
          </button>
        ))}
      </div>
      {chosen && (
        <p className="mt-3 text-sm text-slate-300">
          <span className="font-semibold text-white">{chosen.name}:</span> {chosen.blurb}
        </p>
      )}
    </div>
  );
}
