"use client";

import { useEffect, useRef, useState } from "react";
import { useAchievements } from "./AchievementsProvider";
import { STAGES } from "./engine/stages";
import type { EngineStage } from "./engine/types";

// A header badge+dropdown — see admin-config.ts's FeaturesConfig
// .upgradesEnabled/upgradesStage. Hidden entirely until the Engine reaches
// that stage; each upgrade inside shows its own stage until it's buyable.
export default function UpgradesBadge() {
  const { upgrades, upgradeCatalog, buyUpgrade, engine, features } = useAchievements();
  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    function handlePointerDown(e: PointerEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) setOpen(false);
    }
    function handleKey(e: KeyboardEvent) {
      if (e.key === "Escape") setOpen(false);
    }
    window.addEventListener("pointerdown", handlePointerDown);
    window.addEventListener("keydown", handleKey);
    return () => {
      window.removeEventListener("pointerdown", handlePointerDown);
      window.removeEventListener("keydown", handleKey);
    };
  }, [open]);

  if (!features.upgradesEnabled || engine.stage < features.upgradesStage) return null;

  return (
    <div ref={containerRef} className="relative">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        aria-haspopup="true"
        aria-label="Upgrades"
        className="outpost-resource-chip transition-colors hover:border-[var(--outpost-accent)]"
      >
        <span aria-hidden="true">{"\u{1F9E9}"}</span> {upgrades.skillPoints} SP
      </button>

      {open && (
        <div className="outpost-settings-dropdown outpost-settings-dropdown-left" role="menu">
          <p className="text-xs font-bold uppercase tracking-wider text-white/40">Upgrades</p>
          <p className="mt-1.5 text-xs font-normal normal-case leading-snug text-white/50">
            Skill Points trickle in as you unlock achievements — spend them on permanent capabilities for the
            Outpost itself.
          </p>
          <div className="mt-2.5 space-y-2">
            {upgradeCatalog.map((u) => {
              const owned = upgrades.purchased.includes(u.id);
              const stageMet = engine.stage >= u.stage;
              const stageName = STAGES[u.stage as EngineStage]?.chapter ?? `Stage ${u.stage}`;
              const canAfford = upgrades.skillPoints >= u.cost;

              return (
                <div
                  key={u.id}
                  className="flex items-center justify-between gap-3 rounded-md border border-white/10 bg-white/5 p-2"
                >
                  <div className="flex min-w-0 items-center gap-2">
                    <span aria-hidden="true">{stageMet ? u.icon : "\u{1F512}"}</span>
                    <div className="min-w-0">
                      <p className="text-xs font-semibold text-white">{u.name}</p>
                      <p className="text-[0.65rem] normal-case text-white/40">{u.description}</p>
                    </div>
                  </div>
                  {owned ? (
                    <span className="shrink-0 text-[0.65rem] font-semibold text-[var(--outpost-accent)]">
                      Owned
                    </span>
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
      )}
    </div>
  );
}
