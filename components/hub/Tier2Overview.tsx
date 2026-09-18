"use client";

import { TIER2_IDS } from "./achievements-catalog";
import { useAchievements } from "./AchievementsProvider";
import { findToolTier, RESOURCE_IDS, type ResourceState, type ToolTier } from "./resources";
import { rankIconForLevel, rankTitleForLevel } from "./tier2";

// Sits on the left of the level badge row — what's been gathered so far
// from Tree Mining/Hunting/Mining. Zero-amount resources stay hidden so a
// fresh save doesn't show six "0" chips before you've collected anything.
function ResourceStrip({ resources }: { resources: ResourceState }) {
  const { resourceMeta } = useAchievements();
  const collected = RESOURCE_IDS.filter((id) => resources[id] > 0);
  if (collected.length === 0) return null;
  return (
    <div className="flex flex-wrap items-center gap-1.5" title="Resources collected">
      {collected.map((id) => (
        <span key={id} className="outpost-resource-chip">
          <span aria-hidden="true">{resourceMeta[id].icon}</span>
          {resources[id]}
        </span>
      ))}
    </div>
  );
}

// Sits on the right of the level badge row — the shared tool tier that
// speeds up Tree Mining/Hunting and unlocks better Mining yields, crafted
// in the Crafting card.
function ToolBadge({ tool }: { tool: ToolTier }) {
  return (
    <div className="outpost-tool-badge" title={`Current tool: ${tool.name}`}>
      <span className="text-lg leading-none" aria-hidden="true">
        {tool.icon}
      </span>
      <span className="text-[0.6rem] font-semibold uppercase tracking-wide text-white/80">{tool.name}</span>
    </div>
  );
}

function StatTile({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="rounded-lg border border-white/10 bg-white/5 p-3">
      <p className="font-heading text-xl font-bold text-white">{value}</p>
      <p className="mt-0.5 text-[0.65rem] font-semibold uppercase tracking-wider text-white/40">
        {label}
      </p>
    </div>
  );
}

function relativeTime(iso: string): string {
  const seconds = Math.max(0, Math.round((Date.now() - new Date(iso).getTime()) / 1000));
  if (seconds < 60) return "just now";
  const minutes = Math.round(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.round(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  return `${Math.round(hours / 24)}d ago`;
}

export default function Tier2Overview() {
  const { tier2, xpInfo, unlocked, quiz, visits, ledgerProgress, resources, tools, toolTiersList } =
    useAchievements();
  const tier2UnlockedCount = TIER2_IDS.filter((id) => unlocked.has(id)).length;
  const accuracy = quiz.totalAnswered > 0 ? Math.round((quiz.totalCorrect / quiz.totalAnswered) * 100) : 0;

  return (
    <div>
      <div className="flex flex-wrap items-center gap-3">
        <ResourceStrip resources={resources} />
        <div className="flex min-w-[12rem] flex-1 items-center gap-4">
          <div className="tier2-rank-ring">
            <span className="font-heading text-xl font-extrabold text-white">{xpInfo.level}</span>
            <span className="tier2-rank-icon" aria-hidden="true">
              {rankIconForLevel(xpInfo.level)}
            </span>
          </div>
          <div className="min-w-0 flex-1">
            <div className="flex items-baseline justify-between gap-2">
              <p className="font-heading text-lg font-bold text-white">
                {rankTitleForLevel(xpInfo.level)}
              </p>
              {tier2.prestigeCount > 0 && (
                <span className="shrink-0 text-xs font-semibold text-white/60">
                  ★ Prestige {tier2.prestigeCount}
                </span>
              )}
            </div>
            <div className="tier2-xp-track mt-2">
              <div className="tier2-xp-fill" style={{ width: `${xpInfo.percent}%` }} />
            </div>
            <p className="mt-1 text-xs text-white/40">
              {xpInfo.intoLevel} / {xpInfo.span} XP to level {xpInfo.level + 1}
            </p>
          </div>
        </div>
        <ToolBadge tool={findToolTier(toolTiersList, tools.tier)} />
      </div>

      <div className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-4">
        <StatTile label="Tier II unlocked" value={`${tier2UnlockedCount}/${TIER2_IDS.length}`} />
        <StatTile label="Quiz accuracy" value={`${accuracy}%`} />
        <StatTile label="Visit streak" value={`${visits.streakDays}d`} />
        <StatTile label="Ledger Entries" value={`${ledgerProgress.unlockedCount}/${ledgerProgress.total}`} />
      </div>

      {tier2.activityLog.length > 0 && (
        <div className="mt-6">
          <p className="text-xs font-semibold uppercase tracking-wider text-white/50">
            Recent Activity
          </p>
          <ul className="mt-2 space-y-1.5">
            {tier2.activityLog.slice(0, 6).map((entry, i) => (
              <li
                key={`${entry.ts}-${i}`}
                className="flex items-center justify-between gap-3 text-xs text-white/60"
              >
                <span className="truncate">{entry.text}</span>
                <span className="shrink-0 text-white/30">{relativeTime(entry.ts)}</span>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
