"use client";

import { useMemo, useState } from "react";
import { useAchievements } from "../../../AchievementsProvider";
import { canPlaceAt, canPlaceOn, layoutFor, occupancy, placementRot } from "../../grid/layouts";
import { footprint, isAxisPart, isAxle, isGearbox, PART_DEFS, PART_ORDER, partSpan, spanIsHorizontal } from "../../grid/parts";
import { solveGrid } from "../../grid/solver";
import { solveOptions } from "../../grid/engage";
import type { GridPartType, PlacedPart, Rot, SolveWarningCode } from "../../types";
import { useEngine } from "../EngineProvider";
import { useLive } from "../live-store";
import { popFixText, popReasonText } from "../../content/voice";
import CrankButton from "../visuals/CrankButton";
import { CellArt, hasCellArt, hasPartArt, PartArt, PartIcon, SfAxleArt } from "../visuals/PartArt";
import { useGridDrag } from "./use-grid-drag";

const WARNING_TEXT: Record<SolveWarningCode, string> = {
  obstructed: "It doesn't fit here — every square it spans must be on the board, clear, and on ground it can sit on.",
  frozen: "Frozen solid — water wheels can't turn in winter.",
  wrongFace: "Power is reaching the wrong side — turn it so its input faces the power.",
  notWater: "A water wheel only turns with one of its squares on water.",
  crankJammed: "This hand crank is right next to another power source — turn it and it gets overloaded and destroyed.",
  backfedUnpowered: "Power is entering this gearbox through an output face, not its yellow side.",
};

const DIRS = [0, 1, 2, 3] as const;

/** Rotation a freshly placed part prefers (see `placementRot`). */
const PLACE_ROT: Rot = 1;

// How a part connects, drawn on its cell: an axle is its shaft, edge to
// edge, with only its two thin ends lit; a windmill or water wheel is drawn
// across all the squares it spans, from its hub square; a gearbox shows its
// yellow input side and faint ticks on its three outputs; a machine shows
// its input face; the hand crank has no facing (it turns whatever is right
// next to it).
export function PartGlyph({ part, dim }: { part: PlacedPart; dim?: boolean }) {
  const def = PART_DEFS[part.type];
  const axis = part.rot % 2 === 0 ? "v" : "h";
  if (hasPartArt(part.type)) {
    return (
      <span className="relative flex h-full w-full" aria-hidden="true">
        <span
          className={`engine-part-art ${dim ? "opacity-40" : ""}`}
          data-vertical={!spanIsHorizontal(part.rot)}
          style={{ ["--engine-span" as string]: partSpan(part.type) }}
        >
          <PartArt type={part.type} />
        </span>
      </span>
    );
  }
  if (part.type === "sfAxle") {
    return (
      <span className={`relative flex h-full w-full ${dim ? "opacity-40" : ""}`} aria-hidden="true">
        <span className="engine-cell-axle" data-axis={axis}>
          <SfAxleArt />
        </span>
      </span>
    );
  }
  if (isAxle(part.type)) {
    return (
      <span className={`relative flex h-full w-full ${dim ? "opacity-40" : ""}`} aria-hidden="true">
        <span className="engine-shaft" data-axis={axis} />
      </span>
    );
  }
  return (
    <span className={`relative flex h-full w-full items-center justify-center ${dim ? "opacity-40" : ""}`}>
      {isAxisPart(part.type) ? (
        <span className="engine-shaft engine-shaft-thin" data-axis={axis} aria-hidden="true" />
      ) : isGearbox(part.type) ? (
        DIRS.map((d) => (
          <span key={d} className="engine-face" data-face={d} data-kind={d === part.rot ? "in" : "out"} aria-hidden="true" />
        ))
      ) : part.type === "handCrank" ? null : (
        <span className="engine-face" data-face={part.rot} aria-hidden="true" />
      )}
      {hasCellArt(part.type) ? (
        <span className="engine-cell-art">
          <CellArt type={part.type} />
        </span>
      ) : (
        <span className="relative text-lg leading-none">{def.icon}</span>
      )}
    </span>
  );
}

/** A part drawn over a square it isn't on yet: where a drag would drop it, or a tray part about to be placed. */
export function PartPreview({ part, faint }: { part: PlacedPart; faint?: boolean }) {
  return (
    <span className={`engine-drop-preview ${faint ? "opacity-50" : ""}`} aria-hidden="true">
      <PartGlyph part={part} />
    </span>
  );
}

export default function BodyTab() {
  const { e, env, cfg, fx, store, knownParts, placePart, movePart, rotatePart, removePart, engage, craftPart, partCost, toast } =
    useEngine();
  const livePU = useLive(store, (s) => s.corePU);
  const { resources, resourceMeta, engineBuffs } = useAchievements();
  const [selected, setSelected] = useState<GridPartType | null>(null);
  const [hover, setHover] = useState<number | null>(null);
  const layout = layoutFor(e.stage);
  const { w, h } = e.grid;

  // A live preview solve (not saved), crank turning — so axle-run counts,
  // warnings and what will pop update as you build, before you engage.
  const preview = useMemo(() => {
    if (!layout) return null;
    return solveGrid(e.grid, layout.terrain, { ...solveOptions(e, env, cfg, fx), crankActive: true });
  }, [e, env, cfg, fx, layout]);

  // Which part covers each square (big sources span several).
  const occ = useMemo(() => occupancy(e.grid.cells, w, h), [e.grid.cells, w, h]);

  const { drag, onPointerDown, consumeClick } = useGridDrag({
    w,
    h,
    hubAt: (i) => occ[i] ?? -1,
    canDrop: (from, to) => {
      const part = e.grid.cells[from];
      return !!part && !!layout && canPlaceAt(e.grid.cells, layout.terrain, w, h, to, part.type, part.rot, from);
    },
    onDrop: (from, to) => {
      movePart(from, to);
    },
  });

  if (!layout) return <p className="text-xs text-slate-400">The Engine doesn&apos;t have a body yet.</p>;

  const warnByUid = new Map<string, SolveWarningCode[]>();
  const summary = e.solved?.idle;
  for (const warning of preview?.warnings ?? []) {
    if (!warnByUid.has(warning.uid)) warnByUid.set(warning.uid, []);
    warnByUid.get(warning.uid)!.push(warning.code);
  }
  const willPop = new Set(preview?.pops.map((p) => p.uid) ?? []);
  // What will pop, and why — shown on the part and under the grid.
  const typeByUid = new Map(e.grid.cells.filter(Boolean).map((c) => [c!.uid, c!.type]));
  const popText = new Map<string, string>();
  for (const pop of preview?.pops ?? []) {
    const type = typeByUid.get(pop.uid);
    if (!type) continue;
    popText.set(pop.uid, `${PART_DEFS[type].name} will pop: ${popReasonText(pop, cfg.power.maxChain)}.${popFixText(pop, type)}`);
  }
  const turning = new Set(e.grid.clutch ? preview?.turning ?? [] : []);

  // While dragging: a ghost where the part was, the part itself where it would land.
  const dragPart = drag ? e.grid.cells[drag.from] : null;
  const ghostSquares = new Set(dragPart && drag ? footprint(dragPart.type, dragPart.rot, drag.from, w, h) ?? [drag.from] : []);
  const dropSquares = new Set(dragPart && drag?.to != null ? footprint(dragPart.type, dragPart.rot, drag.to, w, h) ?? [] : []);
  let dropValid = !!drag?.valid;
  // Not dragging, a tray part picked: show where it would go under the pointer.
  let hoverPart: PlacedPart | null = null;
  if (!drag && selected && (e.inventory[selected] ?? 0) > 0 && hover !== null && occ[hover] < 0) {
    // The way it would actually face here (a windmill lies down where it can't stand).
    const rot = placementRot(e.grid.cells, layout.terrain, w, h, hover, selected) ?? PLACE_ROT;
    hoverPart = { uid: "preview", type: selected, rot };
    for (const j of footprint(selected, rot, hover, w, h) ?? []) dropSquares.add(j);
    dropValid = canPlaceAt(e.grid.cells, layout.terrain, w, h, hover, selected, rot);
  }

  /** Why `type` can't be placed with its hub at `i`, or null if it can. */
  function placeProblem(type: GridPartType, i: number): string | null {
    const def = PART_DEFS[type];
    if (placementRot(e.grid.cells, layout!.terrain, w, h, i, type) !== null) return null;
    // Neither way fits: explain the default one.
    const squares = footprint(type, PLACE_ROT, i, w, h);
    if (!squares) return `Not enough room — a ${def.name} spans ${partSpan(type)} squares.`;
    if (squares.some((j) => occ[j] >= 0)) return "Something's in the way.";
    if (!squares.every((j) => canPlaceOn(layout!.terrain[j], { type }))) return "That can't go on water.";
    return `It doesn't fit here either way — a ${def.name} spans ${partSpan(type)} squares.`;
  }

  function onCellClick(i: number) {
    if (consumeClick()) return;
    const owner = occ[i];
    if (owner >= 0) {
      if (!rotatePart(owner)) toast("No room to turn it here.", "warn");
      return;
    }
    if (layout!.terrain[i] === "core") {
      toast("That's my core — bring power to it with axles.", "info");
      return;
    }
    if (!selected) {
      toast("Pick a part from the tray first.", "info");
      return;
    }
    const problem = placeProblem(selected, i);
    if (problem) {
      toast(problem, "warn");
      return;
    }
    if (!placePart(i, selected)) {
      toast(`No ${PART_DEFS[selected].name} left — craft one.`, "warn");
      return;
    }
    // That was the last one: put it down and stop showing where another would go.
    if ((e.inventory[selected] ?? 0) <= 1) setSelected(null);
  }

  const tray = PART_ORDER.filter((t) => knownParts.includes(t));

  return (
    <div className="space-y-3" data-no-drag>
      <div className="flex flex-col gap-3 sm:flex-row">
        <div className="shrink-0">
          <div
            data-engine-target="grid"
            className="engine-grid"
            data-size={layout.w}
            style={{ gridTemplateColumns: `repeat(${layout.w}, var(--engine-cell))` }}
          >
            {layout.terrain.map((terrain, i) => {
              const owner = occ[i];
              const part = owner >= 0 ? e.grid.cells[owner] : null;
              const isHub = owner === i;
              const warns = part ? warnByUid.get(part.uid) : undefined;
              const chain = part && isHub ? preview?.chainAt[part.uid] : undefined;
              const cls = [
                "engine-cell",
                `engine-cell-${terrain}`,
                part ? "engine-cell-filled" : "",
                part && !isHub ? "engine-cell-span" : "",
                part?.broken ? "engine-cell-broken" : "",
                part && willPop.has(part.uid) && !part.broken ? "engine-cell-danger" : "",
                part && turning.has(part.uid) ? "engine-cell-turning" : "",
                terrain === "core" && e.grid.clutch && (preview?.coreByCell[i] ?? 0) > 0 ? "engine-cell-turning" : "",
                ghostSquares.has(i) ? "engine-cell-ghost" : "",
                dropSquares.has(i) ? (dropValid ? "engine-cell-drop" : "engine-cell-drop-bad") : "",
              ].join(" ");
              return (
                <button
                  key={i}
                  type="button"
                  data-cell={i}
                  className={cls}
                  onPointerDown={(ev) => onPointerDown(ev, i)}
                  onPointerEnter={() => setHover(i)}
                  onPointerLeave={() => setHover((cur) => (cur === i ? null : cur))}
                  onClick={() => onCellClick(i)}
                  onContextMenu={(ev) => {
                    ev.preventDefault();
                    if (owner >= 0) removePart(owner);
                  }}
                  aria-label={
                    part
                      ? `${PART_DEFS[part.type].name}${isHub ? "" : " (part of it)"}${part.broken ? " (popped)" : ""} — tap to turn, drag to move, right-click to remove`
                      : terrain === "core"
                        ? "The Engine's core — bring power to it"
                        : `Empty ${terrain} square`
                  }
                  title={
                    [part && !part.broken ? popText.get(part.uid) : undefined, ...(warns ?? []).map((wc) => WARNING_TEXT[wc])]
                      .filter(Boolean)
                      .join(" ") || undefined
                  }
                >
                  {part && isHub ? <PartGlyph part={part} dim={part.broken} /> : null}
                  {terrain === "core" && (
                    <span className="flex h-full w-full items-center justify-center text-lg text-[var(--outpost-accent)]" aria-hidden="true">
                      {"\u{25CE}"}
                    </span>
                  )}
                  {terrain === "core" && (preview?.coreByCell[i] ?? 0) > 0 && (
                    <span className="engine-cell-chain">{preview!.coreByCell[i]}</span>
                  )}
                  {dragPart && drag?.to === i && <PartPreview part={dragPart} />}
                  {hoverPart && hover === i && <PartPreview part={hoverPart} faint />}
                  {chain !== undefined && (part?.type === "axle" || part?.type === "sfAxle") && (
                    <span className={`engine-cell-chain ${chain > cfg.power.maxChain ? "text-red-400" : ""}`}>{chain}</span>
                  )}
                  {isHub && warns && warns.length > 0 && <span className="engine-cell-warn">!</span>}
                </button>
              );
            })}
          </div>
          <p className="mt-1 text-[0.62rem] text-slate-500">Tap to place · tap a part to turn · drag to move · right-click to remove</p>
        </div>

        <div className="min-w-0 flex-1 space-y-2">
          <div data-engine-target="part-tray" className="grid grid-cols-2 gap-1.5">
            {tray.map((t) => {
              const def = PART_DEFS[t];
              const have = e.inventory[t] ?? 0;
              const cost = partCost(t);
              const affordable = Object.entries(cost).every(([k, v]) => (resources[k as keyof typeof resources] ?? 0) >= v);
              const needsForge = def.soulforged && !engineBuffs.hibachiLit;
              // Parts it's built from (a windmill's own axle), out of the inventory.
              const uses = Object.entries(def.parts ?? {}) as [GridPartType, number][];
              const missing = uses.filter(([u, n]) => (e.inventory[u] ?? 0) < n).map(([u]) => PART_DEFS[u].name);
              return (
                <div
                  key={t}
                  className={`rounded-lg border px-1.5 py-1 ${selected === t ? "border-[var(--outpost-accent)] bg-[var(--outpost-accent-soft)]/20" : "border-white/10 bg-white/5"}`}
                >
                  <button type="button" onClick={() => setSelected(selected === t ? null : t)} className="flex w-full items-center gap-1.5 text-left" title={def.blurb}>
                    <PartIcon type={t} />
                    <span className="min-w-0 flex-1 truncate text-[0.72rem] font-semibold text-white">{def.name}</span>
                    <span className="text-[0.7rem] text-white/60">×{have}</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => craftPart(t)}
                    disabled={!affordable || needsForge || missing.length > 0}
                    className="mt-0.5 w-full rounded border border-white/10 px-1 py-0.5 text-left text-[0.6rem] text-slate-400 hover:border-[var(--outpost-accent)] disabled:opacity-40"
                    title={needsForge ? "Needs a lit Hibachi" : missing.length > 0 ? `Needs a spare ${missing.join(" & ")} in the tray` : "Craft one"}
                  >
                    Craft:{" "}
                    {Object.entries(cost)
                      .map(([k, v]) => `${v}${resourceMeta[k as keyof typeof resourceMeta]?.icon ?? k}`)
                      .join(" ")}
                    {uses.map(([u, n]) => ` ${n}×${PART_DEFS[u].name}`).join("")}
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

          {e.grid.cells.some((c) => c?.type === "handCrank") && <CrankButton />}

          <div className="rounded-lg border border-white/10 bg-black/20 px-2 py-1.5 text-[0.7rem] text-slate-300">
            {e.grid.clutch && summary ? (
              <>
                <p>
                  Power right now: <span className="font-semibold text-[var(--outpost-accent)]">{livePU} PU</span>
                </p>
                <p className="text-slate-400">
                  Steady power (crank still): <span className="font-semibold text-white">{summary.corePU} PU</span>
                </p>
                {summary.supplyPU > summary.corePU && (
                  <p className="text-amber-300/80">
                    Made {summary.supplyPU} PU — only {summary.corePU} reaches the core.
                  </p>
                )}
                {summary.powered.length > 0 && <p className="text-slate-400">Machines running: {summary.powered.length}</p>}
                {(engineBuffs.sawWood > 0 || engineBuffs.millStone > 0 || engineBuffs.bellowsOre > 0) && (
                  <p className="text-slate-400">
                    Outpost boosts:{" "}
                    {[
                      engineBuffs.sawWood > 0 ? `+${engineBuffs.sawWood} Wood per chop` : "",
                      engineBuffs.millStone > 0 ? `+${engineBuffs.millStone} Stone per mine` : "",
                      engineBuffs.bellowsOre > 0 ? `+${engineBuffs.bellowsOre} of each ore per mine` : "",
                    ]
                      .filter(Boolean)
                      .join(" · ")}
                  </p>
                )}
              </>
            ) : (
              <p className="text-slate-400">Clutch disengaged — build, then engage. Nothing turns until you do.</p>
            )}
            {[...new Set([...warnByUid.values()].flat())].map((w) => (
              <p key={w} className="mt-0.5 text-amber-300/80">
                ! {WARNING_TEXT[w]}
              </p>
            ))}
            {!e.grid.clutch &&
              [...new Set(popText.values())].map((line) => (
                <p key={line} className="mt-0.5 text-red-300/80">
                  ! {line}
                </p>
              ))}
          </div>
        </div>
      </div>
    </div>
  );
}
