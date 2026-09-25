"use client";

import { useMemo, useRef, useState } from "react";
import { useAchievements } from "../../../AchievementsProvider";
import { canPlaceOn, layoutFor } from "../../grid/layouts";
import { PART_DEFS, PART_ORDER } from "../../grid/parts";
import { solveGrid } from "../../grid/solver";
import { solveOptions } from "../../grid/engage";
import type { GridPartType, PlacedPart, SolveWarningCode, Terrain } from "../../types";
import { useEngine } from "../EngineProvider";
import { useLive } from "../live-store";
import CrankButton from "../visuals/CrankButton";

const HOLD_MS = 500;

const WARNING_TEXT: Record<SolveWarningCode, string> = {
  obstructed: "A windmill needs every square around it clear, except along its axle.",
  frozen: "Frozen solid — Winter Weather stops water wheels (research Paddle Scraper).",
  wrongFace: "Power is reaching the wrong side — turn it so its input faces the power.",
  notWater: "Water wheels only turn on water squares.",
  brownout: "Not enough power left over to run this.",
  crankNeedsGearbox: "The hand crank must point straight into a gearbox's input face.",
  backfedUnpowered: "Power is entering this gearbox through an output face.",
};

const ARROWS = ["\u{2191}", "\u{2192}", "\u{2193}", "\u{2190}"];

// Which way a part "faces", drawn as a bar on that side of its cell: an
// axle's axis, a gearbox's input face, a crank's output, an attachment's
// input face.
export function PartGlyph({ part, dim }: { part: PlacedPart; dim?: boolean }) {
  const def = PART_DEFS[part.type];
  const axisTypes: GridPartType[] = ["axle", "sfAxle", "windmill", "waterWheel"];
  const isAxis = axisTypes.includes(part.type);
  return (
    <span className={`relative flex h-full w-full items-center justify-center ${dim ? "opacity-40" : ""}`}>
      {isAxis ? (
        <span
          className={`absolute bg-[var(--outpost-accent)]/60 ${part.rot % 2 === 0 ? "left-1/2 top-0.5 bottom-0.5 w-1 -translate-x-1/2" : "top-1/2 left-0.5 right-0.5 h-1 -translate-y-1/2"}`}
          aria-hidden="true"
        />
      ) : (
        <span className="engine-face" data-face={part.rot} aria-hidden="true" />
      )}
      <span className="relative text-lg leading-none">{def.icon}</span>
      {!isAxis && (
        <span className="absolute bottom-0 right-0.5 text-[0.55rem] text-white/60" aria-hidden="true">
          {part.type === "handCrank" ? ARROWS[part.rot] : ""}
        </span>
      )}
    </span>
  );
}

export default function BodyTab() {
  const { e, env, cfg, fx, store, knownParts, placePart, rotatePart, removePart, engage, craftPart, partCost, toast } = useEngine();
  const livePU = useLive(store, (s) => s.corePU);
  const { resources, resourceMeta, engineBuffs } = useAchievements();
  const [selected, setSelected] = useState<GridPartType | null>(null);
  const holdTimer = useRef<number | null>(null);
  const held = useRef(false);
  const layout = layoutFor(e.stage);

  // A live preview solve (not saved) — so axle-run counts and what's
  // reaching the core update as you build, before you engage the clutch.
  const preview = useMemo(() => {
    if (!layout) return null;
    return solveGrid(e.grid, layout.terrain, { ...solveOptions(e, env, cfg, fx), crankActive: true, crankBoost: true });
  }, [e, env, cfg, fx, layout]);

  if (!layout) return <p className="text-xs text-slate-400">The Engine doesn&apos;t have a body yet.</p>;

  const warnByUid = new Map<string, SolveWarningCode[]>();
  const summary = e.solved?.idle;
  for (const w of preview?.warnings ?? []) {
    if (!warnByUid.has(w.uid)) warnByUid.set(w.uid, []);
    warnByUid.get(w.uid)!.push(w.code);
  }
  const willPop = new Set(preview?.pops.map((p) => p.uid) ?? []);
  const turning = new Set(e.grid.clutch ? preview?.turning ?? [] : []);

  function onCellDown(i: number) {
    held.current = false;
    if (!e.grid.cells[i]) return;
    holdTimer.current = window.setTimeout(() => {
      held.current = true;
      removePart(i);
    }, HOLD_MS);
  }
  function onCellUp() {
    if (holdTimer.current) window.clearTimeout(holdTimer.current);
    holdTimer.current = null;
  }
  function onCellClick(i: number, terrain: Terrain) {
    if (held.current) {
      held.current = false;
      return;
    }
    const part = e.grid.cells[i];
    if (part) {
      rotatePart(i);
      return;
    }
    if (!selected) {
      toast("Pick a part from the tray first.", "info");
      return;
    }
    if (!canPlaceOn(terrain, { type: selected })) {
      toast(PART_DEFS[selected].water ? "That only goes on water." : terrain === "core" ? "That's my core." : "That can't go on water.", "warn");
      return;
    }
    if (!placePart(i, selected)) toast(`No ${PART_DEFS[selected].name} left — craft one.`, "warn");
  }

  const tray = PART_ORDER.filter((t) => knownParts.includes(t));

  return (
    <div className="space-y-3" data-no-drag>
      <div className="flex flex-col gap-3 sm:flex-row">
        <div className="shrink-0">
          <div
            data-engine-target="grid"
            className="engine-grid"
            style={{ gridTemplateColumns: `repeat(${layout.w}, var(--engine-cell))` }}
          >
            {layout.terrain.map((terrain, i) => {
              const part = e.grid.cells[i];
              const warns = part ? warnByUid.get(part.uid) : undefined;
              const chain = part ? preview?.chainAt[part.uid] : undefined;
              return (
                <button
                  key={i}
                  type="button"
                  className={`engine-cell engine-cell-${terrain} ${part?.broken ? "engine-cell-broken" : ""} ${
                    part && willPop.has(part.uid) && !part.broken ? "engine-cell-danger" : ""
                  } ${part && turning.has(part.uid) ? "engine-cell-turning" : ""}`}
                  onPointerDown={() => onCellDown(i)}
                  onPointerUp={onCellUp}
                  onPointerLeave={onCellUp}
                  onClick={() => onCellClick(i, terrain)}
                  onContextMenu={(ev) => {
                    ev.preventDefault();
                    if (part) removePart(i);
                  }}
                  aria-label={
                    terrain === "core"
                      ? "The Engine's core"
                      : part
                        ? `${PART_DEFS[part.type].name}${part.broken ? " (popped)" : ""} — tap to turn, hold to remove`
                        : `Empty ${terrain} square`
                  }
                  title={warns?.map((w) => WARNING_TEXT[w]).join(" ") || undefined}
                >
                  {terrain === "core" ? (
                    <span className="text-lg text-[var(--outpost-accent)]" aria-hidden="true">
                      {"\u{25CE}"}
                    </span>
                  ) : part ? (
                    <PartGlyph part={part} dim={part.broken} />
                  ) : null}
                  {chain !== undefined && (part?.type === "axle" || part?.type === "sfAxle") && (
                    <span className={`engine-cell-chain ${chain > cfg.power.maxChain ? "text-red-400" : ""}`}>{chain}</span>
                  )}
                  {warns && warns.length > 0 && <span className="engine-cell-warn">!</span>}
                </button>
              );
            })}
          </div>
          <p className="mt-1 text-[0.62rem] text-slate-500">Tap to place · tap a part to turn · hold to remove</p>
        </div>

        <div className="min-w-0 flex-1 space-y-2">
          <div data-engine-target="part-tray" className="grid grid-cols-2 gap-1.5">
            {tray.map((t) => {
              const def = PART_DEFS[t];
              const have = e.inventory[t] ?? 0;
              const cost = partCost(t);
              const affordable = Object.entries(cost).every(([k, v]) => (resources[k as keyof typeof resources] ?? 0) >= v);
              const needsForge = def.soulforged && !engineBuffs.hibachiLit;
              return (
                <div
                  key={t}
                  className={`rounded-lg border px-1.5 py-1 ${selected === t ? "border-[var(--outpost-accent)] bg-[var(--outpost-accent-soft)]/20" : "border-white/10 bg-white/5"}`}
                >
                  <button type="button" onClick={() => setSelected(selected === t ? null : t)} className="flex w-full items-center gap-1.5 text-left" title={def.blurb}>
                    <span aria-hidden="true">{def.icon}</span>
                    <span className="min-w-0 flex-1 truncate text-[0.72rem] font-semibold text-white">{def.name}</span>
                    <span className="text-[0.7rem] text-white/60">×{have}</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => craftPart(t)}
                    disabled={!affordable || needsForge}
                    className="mt-0.5 w-full rounded border border-white/10 px-1 py-0.5 text-left text-[0.6rem] text-slate-400 hover:border-[var(--outpost-accent)] disabled:opacity-40"
                    title={needsForge ? "Needs a lit Hibachi" : "Craft one"}
                  >
                    Craft:{" "}
                    {Object.entries(cost)
                      .map(([k, v]) => `${v}${resourceMeta[k as keyof typeof resourceMeta]?.icon ?? k}`)
                      .join(" ")}
                    {needsForge ? " · forge" : ""}
                  </button>
                </div>
              );
            })}
          </div>

          <button
            type="button"
            data-engine-target="clutch"
            onClick={engage}
            className={`w-full rounded-md border px-2 py-1.5 text-xs font-semibold transition-colors ${
              e.grid.clutch
                ? "border-white/15 text-slate-300 hover:border-[var(--outpost-accent)]"
                : "border-[var(--outpost-accent)] text-[var(--outpost-accent)] hover:bg-[var(--outpost-accent-soft)]"
            }`}
          >
            {e.grid.clutch ? "Clutch engaged — re-engage" : "Engage the clutch"}
          </button>

          {e.blueprints.includes("handCrank") && <CrankButton />}

          <div className="rounded-lg border border-white/10 bg-black/20 px-2 py-1.5 text-[0.7rem] text-slate-300">
            {e.grid.clutch && summary ? (
              <>
                <p>
                  Reaching the core right now: <span className="font-semibold text-[var(--outpost-accent)]">{livePU} PU</span>
                </p>
                <p className="text-slate-400">
                  Steady power to core: <span className="font-semibold text-white">{summary.corePU} PU</span>
                  {e.solved && e.solved.cranked.corePU !== summary.corePU && (
                    <> · while cranking: <span className="font-semibold text-white">{e.solved.cranked.corePU} PU</span></>
                  )}
                </p>
                {summary.powered.length > 0 && <p className="text-slate-400">Attachments running: {summary.powered.length}</p>}
              </>
            ) : (
              <p className="text-slate-400">Clutch disengaged — build, then engage. Nothing turns until you do.</p>
            )}
            {[...new Set([...warnByUid.values()].flat())].map((w) => (
              <p key={w} className="mt-0.5 text-amber-300/80">
                ! {WARNING_TEXT[w]}
              </p>
            ))}
            {willPop.size > 0 && !e.grid.clutch && (
              <p className="mt-0.5 text-red-300/80">Something here will pop when the clutch engages.</p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
