"use client";

import { useEffect, useState } from "react";
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

// Whether the panel is folded, remembered per browser. A per-viewer
// convenience only: storage can be missing or blocked, and then it simply
// starts open.
const FOLDED_KEY = "btwr:hub:upgrades-folded:v1";

function readFolded(): boolean {
  try {
    return window.localStorage.getItem(FOLDED_KEY) === "1";
  } catch {
    return false;
  }
}

function writeFolded(folded: boolean) {
  try {
    if (folded) window.localStorage.setItem(FOLDED_KEY, "1");
    else window.localStorage.removeItem(FOLDED_KEY);
  } catch {
    // Remembering the fold is a nicety.
  }
}

export default function UpgradesPanel() {
  const { upgrades, upgradeCatalog, buyUpgrade, engine } = useAchievements();
  const shown = useUpgradesShown();
  const [folded, setFolded] = useState(false);
  useEffect(() => setFolded(readFolded()), []);
  if (!shown) return null;

  const toggle = () => {
    setFolded(!folded);
    writeFolded(!folded);
  };
  // What's worth unfolding for: upgrades that can be bought right now.
  const buyable = upgradeCatalog.filter(
    (u) => !upgrades.purchased.includes(u.id) && engine.stage >= u.stage && upgrades.skillPoints >= u.cost,
  ).length;

  return (
    <section className="outpost-panel shrink-0 rounded-xl p-4" aria-label="Upgrades">
      <div className="flex items-center justify-between gap-2">
        <button
          type="button"
          onClick={toggle}
          aria-expanded={!folded}
          aria-controls="outpost-upgrades-list"
          className="flex min-w-0 items-center gap-1.5 text-left"
        >
          <span
            aria-hidden="true"
            className={`text-[0.6rem] text-white/50 transition-transform ${folded ? "-rotate-90" : ""}`}
          >
            {"\u{25BC}"}
          </span>
          <h3 className="font-heading text-sm font-bold uppercase tracking-wider text-[var(--outpost-accent)]">
            Upgrades
          </h3>
          {folded && buyable > 0 && (
            <span className="rounded-full bg-[var(--outpost-accent-soft)] px-1.5 text-[0.6rem] font-semibold text-[var(--outpost-accent)]">
              {buyable} to buy
            </span>
          )}
        </button>
        <span className="outpost-resource-chip" title="Skill Points">
          <span aria-hidden="true">{"\u{1F9E9}"}</span> {upgrades.skillPoints} SP
        </span>
      </div>
      <div id="outpost-upgrades-list" hidden={folded}>
        <p className="mt-1 text-xs leading-snug text-slate-400">
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
      </div>
    </section>
  );
}
