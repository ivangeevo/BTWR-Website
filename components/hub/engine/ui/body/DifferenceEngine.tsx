"use client";

import { useMemo, useRef, useState } from "react";
import { DIFF_CHALLENGES, DIFF_SIZE, diffGrid, diffTerrain, type DiffChallenge, type DiffPart } from "../../grid/difference";
import { PART_DEFS } from "../../grid/parts";
import { solveGrid } from "../../grid/solver";
import type { GridPartType, Rot } from "../../types";
import { useEngine } from "../EngineProvider";
import { PartGlyph } from "./BodyTab";

const MEDAL_ICON = { gold: "\u{1F947}", silver: "\u{1F948}", bronze: "\u{1F949}" } as const;
const HOLD_MS = 500;

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
  const holdTimer = useRef<number | null>(null);
  const held = useRef(false);
  const terrain = useMemo(() => diffTerrain(c), [c]);
  const grid = useMemo(() => diffGrid(c, placed), [c, placed]);
  const preview = useMemo(
    () => solveGrid(grid, terrain, { crankActive: false, crankBoost: false, winter: !!c.winter, thawed: false, power: cfg.power }),
    [grid, terrain, c.winter, cfg.power]
  );
  const used: Partial<Record<GridPartType, number>> = {};
  for (const p of placed) used[p.type] = (used[p.type] ?? 0) + 1;
  const turning = new Set(preview.turning);
  const willPop = new Set(preview.pops.map((p) => p.uid));

  function at(x: number, y: number) {
    return placed.findIndex((p) => p.x === x && p.y === y);
  }

  function tap(x: number, y: number) {
    if (held.current) {
      held.current = false;
      return;
    }
    const i = at(x, y);
    if (i >= 0) {
      setPlaced((prev) => prev.map((p, j) => (j === i ? { ...p, rot: ((p.rot + 1) % 4) as Rot } : p)));
      return;
    }
    if (!selected || terrain[y * DIFF_SIZE + x] !== "ground" || c.fixed.some((f) => f.x === x && f.y === y)) return;
    if ((used[selected] ?? 0) >= (c.allowed[selected] ?? 0)) return;
    setPlaced((prev) => [...prev, { x, y, type: selected, rot: 1 }]);
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
        <div className="engine-grid" style={{ gridTemplateColumns: `repeat(${DIFF_SIZE}, var(--engine-cell))` }}>
          {terrain.map((t, i) => {
            const x = i % DIFF_SIZE;
            const y = Math.floor(i / DIFF_SIZE);
            const part = grid.cells[i];
            const fixed = part?.uid.startsWith("fixed-");
            return (
              <button
                key={i}
                type="button"
                className={`engine-cell engine-cell-${t} ${part && turning.has(part.uid) ? "engine-cell-turning" : ""} ${
                  part && willPop.has(part.uid) ? "engine-cell-danger" : ""
                } ${fixed ? "opacity-90 ring-1 ring-inset ring-white/20" : ""}`}
                onPointerDown={() => {
                  held.current = false;
                  if (at(x, y) < 0) return;
                  holdTimer.current = window.setTimeout(() => {
                    held.current = true;
                    setPlaced((prev) => prev.filter((p) => !(p.x === x && p.y === y)));
                  }, HOLD_MS);
                }}
                onPointerUp={() => holdTimer.current && window.clearTimeout(holdTimer.current)}
                onPointerLeave={() => holdTimer.current && window.clearTimeout(holdTimer.current)}
                onContextMenu={(ev) => {
                  ev.preventDefault();
                  setPlaced((prev) => prev.filter((p) => !(p.x === x && p.y === y)));
                }}
                onClick={() => tap(x, y)}
                aria-label={part ? `${PART_DEFS[part.type].name}${fixed ? " (fixed)" : ""}` : t === "core" ? "Core" : `Empty ${t}`}
              >
                {t === "core" ? (
                  <span className="text-lg text-[var(--outpost-accent)]">{"\u{25CE}"}</span>
                ) : t === "rock" ? (
                  <span className="text-lg text-white/30">{"\u{1FAA8}"}</span>
                ) : part ? (
                  <PartGlyph part={part} />
                ) : null}
                {part && (part.type === "axle" || part.type === "sfAxle") && preview.chainAt[part.uid] !== undefined && (
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
              <span aria-hidden="true">{PART_DEFS[t].icon}</span>
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
        </div>
      </div>
    </div>
  );
}
