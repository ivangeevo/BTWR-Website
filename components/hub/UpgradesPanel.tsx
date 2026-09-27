"use client";

import { useAchievements } from "./AchievementsProvider";
import { STAGES } from "./engine/stages";
import type { EngineStage } from "./engine/types";
import type { ResourceId } from "./resources";
import type { UpgradeDef } from "./upgrade-catalog";

// The Upgrades shop, as the last section of the Camp rail (CampRail.tsx),
// which supplies its panel, title and fold — see admin-config.ts's
// FeaturesConfig.upgradesEnabled/upgradesStage. Hidden entirely until the
// Engine reaches that stage; each upgrade inside shows its own stage until
// it's buyable.
export function useUpgradesShown(): boolean {
  const { features, engine } = useAchievements();
  return features.upgradesEnabled && engine.stage >= features.upgradesStage;
}

function buildCost(u: UpgradeDef): [ResourceId, number][] {
  return (Object.entries(u.build) as [ResourceId, number][]).filter(([, n]) => n > 0);
}

// The upgrades on offer (Torches and the like only matter with survival on),
// and which can be bought right now.
function useShop() {
  const { upgrades, upgradeCatalog, engine, resources, experience } = useAchievements();
  const catalog = upgradeCatalog.filter((u) => !u.survivalOnly || experience.mode === "survival");
  const canAfford = (u: UpgradeDef) =>
    upgrades.skillPoints >= u.cost && buildCost(u).every(([id, n]) => (resources[id] ?? 0) >= n);
  const buyable = catalog.filter(
    (u) => !upgrades.purchased.includes(u.id) && engine.stage >= u.stage && canAfford(u)
  ).length;
  return { catalog, canAfford, buyable };
}

// Upgrades' line in its folded Camp rail header: the Skill Point balance and
// what's worth unfolding for.
export function UpgradesStatus() {
  const { upgrades } = useAchievements();
  const { buyable } = useShop();
  return (
    <span>
      <span aria-hidden="true">{"\u{1F9E9}"}</span> {upgrades.skillPoints} SP
      {buyable > 0 && <span className="text-[var(--outpost-accent)]"> · {buyable} to buy</span>}
    </span>
  );
}

export default function UpgradesPanel() {
  const { upgrades, buyUpgrade, engine, resources, resourceMeta } = useAchievements();
  const { catalog, canAfford } = useShop();

  return (
    <div>
      <p className="text-xs leading-snug text-slate-400">
        Skill Points trickle in as you unlock achievements. Spend them, plus the resources to build it, on something
        new to do.
      </p>
      <div className="mt-2.5 space-y-2">
        {catalog.map((u) => {
          const owned = upgrades.purchased.includes(u.id);
          const stageMet = engine.stage >= u.stage;
          const stageName = STAGES[u.stage as EngineStage]?.chapter ?? `Stage ${u.stage}`;
          const affordable = canAfford(u);
          const build = buildCost(u);

          return (
            <div key={u.id} className="flex items-center justify-between gap-3 rounded-md border border-white/10 bg-white/5 p-2">
              <div className="flex min-w-0 items-center gap-2">
                <span aria-hidden="true">{stageMet ? u.icon : "\u{1F512}"}</span>
                <div className="min-w-0">
                  <p className="text-xs font-semibold text-white">{u.name}</p>
                  <p className="text-[0.65rem] text-white/40">{u.description}</p>
                  {!owned && build.length > 0 && (
                    <p className="mt-0.5 text-[0.65rem] text-white/60">
                      Build:{" "}
                      {build.map(([id, n]) => (
                        <span key={id} className={(resources[id] ?? 0) >= n ? "" : "text-white/30"}>
                          {resourceMeta[id].icon} {n}{" "}
                        </span>
                      ))}
                    </p>
                  )}
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
                  disabled={!affordable}
                  className={`shrink-0 rounded-md border px-2 py-1 text-[0.65rem] font-semibold transition-colors ${
                    affordable
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
    </div>
  );
}
