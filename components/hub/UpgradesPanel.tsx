"use client";

import { useAchievements } from "./AchievementsProvider";
import { STAGES } from "./engine/stages";
import type { EngineStage } from "./engine/types";

// The Upgrades shop, as a panel in the Outpost's right-hand "store" column —
// see admin-config.ts's FeaturesConfig.upgradesEnabled/upgradesStage.
// Hidden entirely until the Engine reaches that stage; each upgrade inside
// shows its own stage until it's buyable.
export function useUpgradesShown(): boolean {
  const { features, engine } = useAchievements();
  return features.upgradesEnabled && engine.stage >= features.upgradesStage;
}

export default function UpgradesPanel() {
  const { upgrades, upgradeCatalog, buyUpgrade, engine } = useAchievements();
  const shown = useUpgradesShown();
  if (!shown) return null;

  return (
    <section className="outpost-panel rounded-xl p-4" aria-label="Upgrades">
      <div className="flex items-center justify-between gap-2">
        <h3 className="font-heading text-sm font-bold uppercase tracking-wider text-[var(--outpost-accent)]">
          Upgrades
        </h3>
        <span className="outpost-resource-chip" title="Skill Points">
          <span aria-hidden="true">{"\u{1F9E9}"}</span> {upgrades.skillPoints} SP
        </span>
      </div>
      <p className="mt-1 text-xs leading-snug text-white/50">
        Skill Points trickle in as you unlock achievements. Spend them on permanent capabilities for the Outpost
        itself.
      </p>
      <div className="mt-2.5 space-y-2">
        {upgradeCatalog.map((u) => {
          const owned = upgrades.purchased.includes(u.id);
          const stageMet = engine.stage >= u.stage;
          const stageName = STAGES[u.stage as EngineStage]?.chapter ?? `Stage ${u.stage}`;
          const canAfford = upgrades.skillPoints >= u.cost;

          return (
            <div key={u.id} className="flex items-center justify-between gap-3 rounded-md border border-white/10 bg-white/5 p-2">
              <div className="flex min-w-0 items-center gap-2">
                <span aria-hidden="true">{stageMet ? u.icon : "\u{1F512}"}</span>
                <div className="min-w-0">
                  <p className="text-xs font-semibold text-white">{u.name}</p>
                  <p className="text-[0.65rem] text-white/40">{u.description}</p>
                </div>
              </div>
              {owned ? (
                <span className="shrink-0 text-[0.65rem] font-semibold text-[var(--outpost-accent)]">Owned</span>
              ) : !stageMet ? (
                <span className="shrink-0 text-[0.65rem] text-white/30" title="Reached as the Engine grows">
                  {stageName}
                </span>
              ) : (
                <button
                  type="button"
                  onClick={() => buyUpgrade(u.id)}
                  disabled={!canAfford}
                  className={`shrink-0 rounded-md border px-2 py-1 text-[0.65rem] font-semibold transition-colors ${
                    canAfford
                      ? "border-[var(--outpost-accent)] text-[var(--outpost-accent)] hover:bg-[var(--outpost-accent-soft)]"
                      : "border-white/15 text-white/30"
                  }`}
                >
                  {u.cost} SP
                </button>
              )}
            </div>
          );
        })}
      </div>
    </section>
  );
}
