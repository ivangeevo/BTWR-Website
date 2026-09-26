"use client";

import { useMemo, useState } from "react";
import { DIFF_CHALLENGES, DIFF_SIZE, diffGrid, diffTerrain, type DiffChallenge, type DiffPart } from "../../grid/difference";
import { occupancy } from "../../grid/layouts";
import { nextRot, PART_DEFS } from "../../grid/parts";
import { solveGrid } from "../../grid/solver";
import type { GridPartType } from "../../types";
import { useEngine } from "../EngineProvider";
import { popFixText, popReasonText } from "../../content/voice";
import { PartIcon } from "../visuals/PartArt";
import { PartGlyph, PartPreview } from "./BodyTab";
import { useGridDrag } from "./use-grid-drag";

const MEDAL_ICON = { gold: "\u{1F947}", silver: "\u{1F948}", bronze: "\u{1F949}" } as const;

// Stage 8's efficiency puzzles — virtual parts, fixed layouts, par medals.
export default function DifferenceEngine() {
  const { e, cfg } = useEngine();
  const [openId, setOpenId] = useState<string | null>(null);
  const golds = Object.values(e.difference).filter((d) => d.medal === "gold").length;
  const open = openId ? DIFF_CHALLENGES.find((c) => c.id === openId) ?? null : null;

  if (open) return <Board key={open.id} c={open} onBack={() => setOpenId(null)} />;

  return (
    <div data-no-drag>
      <p className="text-[0.7rem] text-slate-400">
        Twelve fixed layouts. Power every target with as few parts as you can — each gold is a permanent +
        {cfg.economy.goldBonusPct}% insight/sec ({golds}/12 gold).
      </p>
      <div className="mt-2 grid gap-1.5 sm:grid-cols-2">
        {DIFF_CHALLENGES.map((c, i) => {
          const best = e.difference[c.id];
          return (
            <button
              key={c.id}
              type="button"
              onClick={() => setOpenId(c.id)}
              className="flex items-center gap-2 rounded-lg border border-white/10 bg-white/5 px-2 py-1.5 text-left hover:border-[var(--outpost-accent)]"
            >
              <span className="w-5 text-center font-mono text-[0.7rem] text-white/40">{i + 1}</span>
              <span className="min-w-0 flex-1">
                <span className="block truncate text-xs font-semibold text-white">{c.name}</span>
                <span className="block text-[0.62rem] text-slate-400">
                  Par {c.par.gold}
                  {best ? ` · best ${best.parts}` : ""}
                </span>
              </span>
              <span aria-label={best ? best.medal : "no medal"}>{best ? MEDAL_ICON[best.medal] : "·"}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
}

function Board({ c, onBack }: { c: DiffChallenge; onBack: () => void }) {
  const { cfg, submitDifference } = useEngine();
  const [placed, setPlaced] = useState<DiffPart[]>([]);
  const [selected, setSelected] = useState<GridPartType | null>(null);
  const terrain = useMemo(() => diffTerrain(c), [c]);
  const grid = useMemo(() => diffGrid(c, placed), [c, placed]);
  const occ = useMemo(() => occupancy(grid.cells, DIFF_SIZE, DIFF_SIZE), [grid]);
  const preview = useMemo(
    () => solveGrid(grid, terrain, { crankActive: false, winter: !!c.winter, thawed: false, power: cfg.power }),
    [grid, terrain, c.winter, cfg.power]
  );
  const used: Partial<Record<GridPartType, number>> = {};
  for (const p of placed) used[p.type] = (used[p.type] ?? 0) + 1;
  const turning = new Set(preview.turning);
  const willPop = new Set(preview.pops.map((p) => p.uid));
  // What will pop, and why.
  const popText = new Map<string, string>();
  for (const pop of preview.pops) {
    const type = grid.cells.find((c) => c?.uid === pop.uid)?.type;
    if (type) popText.set(pop.uid, `${PART_DEFS[type].name} will pop: ${popReasonText(pop, cfg.power.maxChain)}.${popFixText(pop, type)}`);
  }

  /** Index into `placed` of the placed (not fixed) part at cell `i`, or -1. */
  function placedAt(i: number) {
    return placed.findIndex((p) => p.y * DIFF_SIZE + p.x === i);
  }

  // Only your own (placed) parts move; fixed ones stay put.
  const { drag, onPointerDown, consumeClick } = useGridDrag({
    w: DIFF_SIZE,
    h: DIFF_SIZE,
    hubAt: (i) => (placedAt(occ[i]) >= 0 ? occ[i] : -1),
    canDrop: (from, to) => terrain[to] === "ground" && (occ[to] < 0 || occ[to] === from),
    onDrop: (from, to) =>
      setPlaced((prev) =>
        prev.map((p) => (p.y * DIFF_SIZE + p.x === from ? { ...p, x: to % DIFF_SIZE, y: Math.floor(to / DIFF_SIZE) } : p))
      ),
  });
  const dragPart = drag ? grid.cells[drag.from] : null;

  function tap(i: number) {
    if (consumeClick()) return;
    const owner = occ[i];
    if (owner >= 0) {
      const k = placedAt(owner);
      if (k >= 0) setPlaced((prev) => prev.map((p, j) => (j === k ? { ...p, rot: nextRot(p.type, p.rot) } : p)));
      return;
    }
    if (!selected || terrain[i] !== "ground") return;
    if ((used[selected] ?? 0) >= (c.allowed[selected] ?? 0)) return;
    setPlaced((prev) => [...prev, { x: i % DIFF_SIZE, y: Math.floor(i / DIFF_SIZE), type: selected, rot: 1 }]);
  }

  return (
    <div data-no-drag>
      <div className="flex items-center justify-between gap-2">
        <button type="button" onClick={onBack} className="text-xs text-slate-400 hover:text-white">
          ← All challenges
        </button>
        <span className="text-[0.7rem] text-slate-400">
          Parts {placed.length} · gold ≤ {c.par.gold} · silver ≤ {c.par.silver}
        </span>
      </div>
      <p className="mt-1 text-xs font-semibold text-white">{c.name}</p>
      <p className="text-[0.7rem] italic text-slate-400">
        {c.blurb}
        {c.coreMinPU > 0 ? ` The core needs ${c.coreMinPU} power.` : ""}
        {c.winter ? " (Winter.)" : ""}
      </p>
      <div className="mt-2 flex flex-col gap-3 sm:flex-row">
        <div className="engine-grid" data-size={DIFF_SIZE} style={{ gridTemplateColumns: `repeat(${DIFF_SIZE}, var(--engine-cell))` }}>
          {terrain.map((t, i) => {
            const owner = occ[i];
            const part = owner >= 0 ? grid.cells[owner] : null;
            const isHub = owner === i;
            const fixed = part?.uid.startsWith("fixed-");
            const ghost = !!drag && owner === drag.from;
            const drop = !!dragPart && drag?.to === i;
            const cls = [
              "engine-cell",
              `engine-cell-${t}`,
              part ? "engine-cell-filled" : "",
              part && !isHub ? "engine-cell-span" : "",
              part && turning.has(part.uid) ? "engine-cell-turning" : "",
              part && willPop.has(part.uid) ? "engine-cell-danger" : "",
              fixed ? "engine-cell-fixed opacity-90 ring-1 ring-inset ring-white/20" : "",
              ghost ? "engine-cell-ghost" : "",
              drop ? (drag?.valid ? "engine-cell-drop" : "engine-cell-drop-bad") : "",
            ].join(" ");
            return (
              <button
                key={i}
                type="button"
                data-cell={i}
                className={cls}
                onPointerDown={(ev) => onPointerDown(ev, i)}
                onContextMenu={(ev) => {
                  ev.preventDefault();
                  const k = placedAt(owner);
                  if (k >= 0) setPlaced((prev) => prev.filter((_, j) => j !== k));
                }}
                onClick={() => tap(i)}
                title={part ? popText.get(part.uid) : undefined}
                aria-label={
                  part ? `${PART_DEFS[part.type].name}${fixed ? " (fixed)" : ""}${isHub ? "" : " (part of it)"}` : t === "core" ? "Core" : `Empty ${t}`
                }
              >
                {t === "core" ? (
                  <span className="text-lg text-[var(--outpost-accent)]">{"\u{25CE}"}</span>
                ) : t === "rock" ? (
                  <span className="text-lg text-white/30">{"\u{1FAA8}"}</span>
                ) : part && isHub ? (
                  <PartGlyph part={part} />
                ) : null}
                {drop && dragPart && <PartPreview part={dragPart} />}
                {part && isHub && (part.type === "axle" || part.type === "sfAxle") && preview.chainAt[part.uid] !== undefined && (
                  <span className="engine-cell-chain">{preview.chainAt[part.uid]}</span>
                )}
              </button>
            );
          })}
        </div>
        <div className="min-w-0 flex-1 space-y-1.5">
          {(Object.entries(c.allowed) as [GridPartType, number][]).map(([t, n]) => (
            <button
              key={t}
              type="button"
              onClick={() => setSelected(selected === t ? null : t)}
              className={`flex w-full items-center gap-2 rounded-lg border px-2 py-1 text-left text-xs ${
                selected === t ? "border-[var(--outpost-accent)] bg-[var(--outpost-accent-soft)]/20" : "border-white/10 bg-white/5"
              }`}
            >
              <PartIcon type={t} />
              <span className="flex-1 text-white">{PART_DEFS[t].name}</span>
              <span className="text-white/50">
                {n - (used[t] ?? 0)}/{n}
              </span>
            </button>
          ))}
          <div className="flex gap-2 pt-1">
            <button
              type="button"
              onClick={() => submitDifference(c.id, placed)}
              className="flex-1 rounded-md border border-[var(--outpost-accent)] px-2 py-1 text-xs font-semibold text-[var(--outpost-accent)] hover:bg-[var(--outpost-accent-soft)]"
            >
              Run it
            </button>
            <button type="button" onClick={() => setPlaced([])} className="rounded-md border border-white/15 px-2 py-1 text-xs text-slate-300">
              Clear
            </button>
          </div>
          <p className="text-[0.62rem] text-slate-500">Parts here are free and imaginary — only the count matters.</p>
          {[...new Set(popText.values())].map((line) => (
            <p key={line} className="text-[0.62rem] text-red-300/80">
              ! {line}
            </p>
          ))}
        </div>
      </div>
    </div>
  );
}
