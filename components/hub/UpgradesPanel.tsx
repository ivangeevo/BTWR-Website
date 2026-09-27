"use client";

import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
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

// An upgrade's hover/focus card: what it does and what it takes to build.
// Portaled and fixed, since the rail section scrolls and would clip it.
// Opens to the row's left (the rail sits on the right), or under/over it
// when there's no room there (the stacked, narrow layout). The Outpost's
// accent variables don't reach document.body, so it keeps to neutrals.
const CARD_W = 224;
const CARD_MARGIN = 8;

function UpgradeCard({ u, id, anchor, owned, stageMet, stageName }: {
  u: UpgradeDef;
  id: string;
  anchor: DOMRect;
  owned: boolean;
  stageMet: boolean;
  stageName: string;
}) {
  const { resources, resourceMeta } = useAchievements();
  const cardRef = useRef<HTMLDivElement>(null);
  const [h, setH] = useState(0);
  useLayoutEffect(() => setH(cardRef.current?.offsetHeight ?? 0), []);
  const build = buildCost(u);

  let left: number;
  let top: number;
  if (anchor.left - CARD_MARGIN - CARD_W >= CARD_MARGIN) {
    left = anchor.left - CARD_MARGIN - CARD_W;
    top = Math.min(anchor.top, window.innerHeight - CARD_MARGIN - h);
  } else {
    left = Math.min(Math.max(CARD_MARGIN, anchor.left), window.innerWidth - CARD_MARGIN - CARD_W);
    const below = anchor.bottom + 4;
    top = below + h <= window.innerHeight - CARD_MARGIN ? below : anchor.top - 4 - h;
  }

  return createPortal(
    <div
      ref={cardRef}
      id={id}
      role="tooltip"
      className="pointer-events-none fixed z-[999] rounded-md border border-white/15 bg-[#1c140d] px-2.5 py-2 text-[0.65rem] leading-snug text-slate-200 shadow-lg"
      // Measured once before it shows, so it can be kept on screen.
      style={{ left, top: Math.max(CARD_MARGIN, top), width: CARD_W, visibility: h ? "visible" : "hidden" }}
    >
      <p className="text-xs font-semibold text-white">
        <span aria-hidden="true">{u.icon}</span> {u.name}
      </p>
      <p className="mt-1 text-white/60">{u.description}</p>
      {owned ? (
        <p className="mt-1.5 font-semibold text-white/80">Owned</p>
      ) : (
        <>
          <p className="mt-1.5 text-white/80">
            Cost: {u.cost} SP
            {build.length > 0 && (
              <>
                {" · Build: "}
                {build.map(([rid, n]) => (
                  <span key={rid} className={(resources[rid] ?? 0) >= n ? "" : "text-white/30"}>
                    {resourceMeta[rid].icon} {n}{" "}
                  </span>
                ))}
              </>
            )}
          </p>
          {!stageMet && <p className="mt-0.5 text-white/40">Reached at {stageName}, as the Engine grows.</p>}
        </>
      )}
    </div>,
    document.body
  );
}

export default function UpgradesPanel() {
  const { upgrades, buyUpgrade, engine } = useAchievements();
  const { catalog, canAfford } = useShop();
  const [hover, setHover] = useState<{ id: string; rect: DOMRect } | null>(null);

  // The card is placed from where the row was; scrolling would leave it behind.
  useEffect(() => {
    if (!hover) return;
    const close = () => setHover(null);
    window.addEventListener("scroll", close, true);
    window.addEventListener("resize", close);
    return () => {
      window.removeEventListener("scroll", close, true);
      window.removeEventListener("resize", close);
    };
  }, [hover]);

  const show = (id: string, el: HTMLElement) => setHover({ id, rect: el.getBoundingClientRect() });
  const hide = (id: string) => setHover((h) => (h?.id === id ? null : h));

  return (
    <div>
      <p className="text-xs leading-snug text-slate-400">
        Skill Points trickle in as you unlock achievements. Spend them, plus the resources to build it, on something
        new to do. Hover an upgrade to see what it does.
      </p>
      <div className="mt-2.5 space-y-1">
        {catalog.map((u) => {
          const owned = upgrades.purchased.includes(u.id);
          const stageMet = engine.stage >= u.stage;
          const stageName = STAGES[u.stage as EngineStage]?.chapter ?? `Stage ${u.stage}`;
          const affordable = canAfford(u);
          const hovered = hover?.id === u.id;
          const cardId = `upgrade-card-${u.id}`;

          return (
            <div
              key={u.id}
              onPointerEnter={(e) => e.pointerType === "mouse" && show(u.id, e.currentTarget)}
              onPointerLeave={(e) => e.pointerType === "mouse" && hide(u.id)}
              onFocus={(e) => show(u.id, e.currentTarget)}
              onBlur={() => hide(u.id)}
              // Touch has no hover: a tap on the row (not its button) toggles the card.
              onClick={(e) => {
                if ((e.target as HTMLElement).closest("button")) return;
                if (hovered) setHover(null);
                else show(u.id, e.currentTarget);
              }}
              className={`flex items-center justify-between gap-2 rounded-md border px-2 py-1 transition-colors ${
                hovered ? "border-white/20 bg-white/10" : "border-white/10 bg-white/5"
              }`}
            >
              <div className={`flex min-w-0 items-center gap-2 ${stageMet ? "" : "opacity-60"}`}>
                <span aria-hidden="true" className="text-sm">{stageMet ? u.icon : "\u{1F512}"}</span>
                <p className="truncate text-xs font-semibold text-white">{u.name}</p>
              </div>
              {owned ? (
                <span className="shrink-0 text-[0.65rem] font-semibold text-[var(--outpost-accent)]">Owned</span>
              ) : !stageMet ? (
                <span className="min-w-0 shrink truncate text-[0.65rem] text-white/30">{stageName}</span>
              ) : (
                <button
                  type="button"
                  onClick={() => buyUpgrade(u.id)}
                  disabled={!affordable}
                  aria-describedby={hovered ? cardId : undefined}
                  className={`shrink-0 rounded-md border px-2 py-0.5 text-[0.65rem] font-semibold transition-colors ${
                    affordable
                      ? "border-[var(--outpost-accent)] text-[var(--outpost-accent)] hover:bg-[var(--outpost-accent-soft)]"
                      : "border-white/15 text-white/30"
                  }`}
                >
                  {u.cost} SP
                </button>
              )}
              {hovered && (
                <UpgradeCard
                  u={u}
                  id={cardId}
                  anchor={hover.rect}
                  owned={owned}
                  stageMet={stageMet}
                  stageName={stageName}
                />
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
