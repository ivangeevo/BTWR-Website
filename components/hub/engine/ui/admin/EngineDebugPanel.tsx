"use client";

import { useEffect, useState } from "react";
import { loadState, saveState, type HubState } from "../../../hub-storage";
import { RESOURCE_IDS } from "../../../resources";
import { readEngineDebug, writeEngineDebug, type EngineDebug } from "../../bridge-storage";
import { BLUEPRINTS, KEY_FRAGMENTS } from "../../content/blueprints";
import { formatInsight } from "../../economy";
import { layoutFor, remapGrid } from "../../grid/layouts";
import { PART_ORDER } from "../../grid/parts";
import { STAGES } from "../../stages";
import { defaultEngineState } from "../../state";
import { ENGINE_STAGES, type EngineStage, type EngineState } from "../../types";

// Testing tools for a month-long arc. Writes the Outpost save directly, so
// close (or reload after) any open Outpost tab — a live Outpost would
// otherwise save its own copy over these edits.
export default function EngineDebugPanel() {
  const [state, setState] = useState<HubState | null>(null);
  const [debug, setDebug] = useState<EngineDebug>({});
  const [insightAmount, setInsightAmount] = useState(1000);
  const [hours, setHours] = useState(8);
  const [note, setNote] = useState<string | null>(null);

  useEffect(() => {
    setState(loadState());
    setDebug(readEngineDebug());
  }, []);

  if (!state) return <div className="h-40 animate-pulse rounded-xl bg-white/5" />;
  const e = state.engine;

  function apply(fn: (e: EngineState) => EngineState, msg: string) {
    const cur = loadState();
    const next = { ...cur, engine: fn(cur.engine) };
    saveState(next);
    setState(next);
    setNote(msg);
  }

  function applyHub(fn: (s: HubState) => HubState, msg: string) {
    const next = fn(loadState());
    saveState(next);
    setState(next);
    setNote(msg);
  }

  function jumpTo(stage: EngineStage) {
    apply((cur) => {
      const now = new Date().toISOString();
      // Everything a player would already have decoded before reaching this stage.
      const bps = BLUEPRINTS.filter((b) => b.stage < stage);
      const blueprints = [...new Set([...cur.blueprints, ...bps.map((b) => b.part).filter((p): p is NonNullable<typeof p> => !!p)])];
      const solved = [...new Set([...cur.ciphers.solved, ...bps.map((b) => b.id)])];
      const layout = layoutFor(stage);
      let grid = cur.grid;
      const inventory = { ...cur.inventory };
      if (layout) {
        const r = remapGrid(cur.grid.w ? cur.grid : { ...cur.grid, w: 0, h: 0, cells: [] }, stage);
        grid = { ...r.grid, clutch: false };
        for (const p of r.returned) inventory[p.type] = (inventory[p.type] ?? 0) + 1;
      }
      // Same starter kit a player gets on reaching Stage 4 (EngineProvider's advance).
      if (cur.stage < 4 && stage >= 4) {
        inventory.handCrank = (inventory.handCrank ?? 0) + 1;
        inventory.gearbox = (inventory.gearbox ?? 0) + 1;
        inventory.axle = (inventory.axle ?? 0) + 2;
      }
      return {
        ...cur,
        stage,
        stageEnteredAt: { ...cur.stageEnteredAt, [stage]: now },
        ceremoniesSeen: ENGINE_STAGES.filter((s) => s < stage),
        blueprints,
        ciphers: { ...cur.ciphers, solved, current: null },
        grid,
        inventory,
        solved: null,
      };
    }, `Jumped to Stage ${stage} (${STAGES[stage].chapter}). Its ceremony plays on next load.`);
  }

  const Btn = ({ onClick, children }: { onClick: () => void; children: React.ReactNode }) => (
    <button
      type="button"
      onClick={onClick}
      className="rounded-lg border border-white/15 px-2.5 py-1 text-xs font-semibold text-slate-300 transition-colors hover:border-[var(--outpost-accent)] hover:text-[var(--outpost-accent)]"
    >
      {children}
    </button>
  );

  function setDebugFlag(patch: EngineDebug) {
    const next = { ...debug, ...patch };
    writeEngineDebug(next);
    setDebug(next);
  }

  return (
    <div className="space-y-5">
      <p className="rounded-lg border border-amber-400/30 bg-amber-400/5 p-2.5 text-xs text-amber-200/80">
        These edit your Outpost save directly. Close any open Outpost tab first (or reload it afterwards) — a running
        Outpost would save over them.
      </p>

      <section>
        <h3 className="text-xs font-bold uppercase tracking-wider text-white/50">Current Engine</h3>
        <p className="mt-1 text-sm text-slate-300">
          Stage {e.stage} · {STAGES[e.stage].chapter} · Mark {e.mark} · {formatInsight(e.insight)} insight (lifetime{" "}
          {formatInsight(e.lifetimeInsight)}) · {e.solvedCount} solves · {e.blueprints.length} blueprints · grid {e.grid.w}×{e.grid.h}
          {e.grid.clutch ? " (engaged)" : ""}
        </p>
      </section>

      <section>
        <h3 className="text-xs font-bold uppercase tracking-wider text-white/50">Jump to stage</h3>
        <div className="mt-2 flex flex-wrap gap-1.5">
          {ENGINE_STAGES.map((s) => (
            <Btn key={s} onClick={() => jumpTo(s)}>
              {s}. {STAGES[s].chapter}
            </Btn>
          ))}
        </div>
      </section>

      <section>
        <h3 className="text-xs font-bold uppercase tracking-wider text-white/50">Grant</h3>
        <div className="mt-2 flex flex-wrap items-center gap-1.5">
          <input
            type="number"
            value={insightAmount}
            onChange={(ev) => setInsightAmount(Math.max(0, Number(ev.target.value) || 0))}
            className="w-32 rounded-md border border-white/15 bg-transparent px-2 py-1 text-xs text-white"
          />
          <Btn
            onClick={() =>
              apply((cur) => ({ ...cur, insight: cur.insight + insightAmount, lifetimeInsight: cur.lifetimeInsight + insightAmount }), `+${formatInsight(insightAmount)} insight.`)
            }
          >
            + insight
          </Btn>
          <Btn
            onClick={() =>
              applyHub((s) => {
                const resources = { ...s.resources };
                for (const id of RESOURCE_IDS) resources[id] = (resources[id] ?? 0) + 100;
                return { ...s, resources };
              }, "+100 of every resource.")
            }
          >
            +100 resources
          </Btn>
          <Btn
            onClick={() =>
              apply((cur) => {
                const inventory = { ...cur.inventory };
                for (const t of PART_ORDER) inventory[t] = (inventory[t] ?? 0) + 3;
                return { ...cur, inventory };
              }, "+3 of every grid part.")
            }
          >
            +3 of every part
          </Btn>
          <Btn
            onClick={() =>
              apply(
                (cur) => ({ ...cur, blueprints: [...new Set([...cur.blueprints, ...PART_ORDER])] }),
                "Every blueprint known (ciphers still unsolved)."
              )
            }
          >
            All blueprints
          </Btn>
          <Btn
            onClick={() =>
              apply((cur) => ({ ...cur, ciphers: { ...cur.ciphers, keyFragments: KEY_FRAGMENTS.map((f) => f.id) } }), "All three keyword fragments found.")
            }
          >
            All key fragments
          </Btn>
          <Btn
            onClick={() =>
              applyHub((s) => ({ ...s, upgrades: { ...s.upgrades, skillPoints: s.upgrades.skillPoints + 25 } }), "+25 Skill Points (for testing the Upgrades shop).")
            }
          >
            +25 SP
          </Btn>
        </div>
      </section>

      <section>
        <h3 className="text-xs font-bold uppercase tracking-wider text-white/50">Time</h3>
        <div className="mt-2 flex flex-wrap items-center gap-1.5">
          <input
            type="number"
            value={hours}
            onChange={(ev) => setHours(Math.max(0, Number(ev.target.value) || 0))}
            className="w-20 rounded-md border border-white/15 bg-transparent px-2 py-1 text-xs text-white"
          />
          <span className="text-xs text-slate-400">hours</span>
          <Btn
            onClick={() =>
              apply((cur) => {
                const shift = (iso: string) => new Date(new Date(iso).getTime() - hours * 3_600_000).toISOString();
                return { ...cur, lastActiveAt: shift(cur.lastActiveAt), settledAt: shift(cur.settledAt), lastInteractAt: shift(cur.lastInteractAt) };
              }, `Pretended you were away ${hours}h — open the Outpost to see "while you were away".`)
            }
          >
            Simulate away
          </Btn>
        </div>
      </section>

      <section>
        <h3 className="text-xs font-bold uppercase tracking-wider text-white/50">Sky & sparks</h3>
        <div className="mt-2 flex flex-wrap gap-1.5">
          <Btn onClick={() => setDebugFlag({ eurekaNow: true })}>Force a Eureka (next tick)</Btn>
          <Btn onClick={() => setDebugFlag({ forceNight: debug.forceNight ? undefined : true })}>
            Force night: {debug.forceNight ? "on" : "off"}
          </Btn>
          <Btn onClick={() => setDebugFlag({ forceFullMoon: debug.forceFullMoon ? undefined : true })}>
            Force full moon: {debug.forceFullMoon ? "on" : "off"}
          </Btn>
        </div>
      </section>

      <section>
        <h3 className="text-xs font-bold uppercase tracking-wider text-white/50">Reset</h3>
        <div className="mt-2 flex flex-wrap gap-1.5">
          <Btn onClick={() => apply(() => defaultEngineState(), "Engine reset to a fresh Day One (the rest of the Outpost untouched).")}>
            Reset the Engine only
          </Btn>
          <Btn onClick={() => apply((cur) => ({ ...cur, tutorialsSeen: [] }), "Tutorials will play again.")}>Replay all tutorials</Btn>
        </div>
      </section>

      {note && <p className="text-xs text-[var(--outpost-accent)]">{note}</p>}
    </div>
  );
}
