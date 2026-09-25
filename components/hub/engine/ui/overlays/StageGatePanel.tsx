"use client";

import { useState } from "react";
import { formatInsight } from "../../economy";
import { STAGES } from "../../stages";
import type { EngineStage } from "../../types";
import { useEngine } from "../EngineProvider";
import { useLive } from "../live-store";

// What the Engine needs to grow into its next chapter — half of it is the
// Engine's own doing, half is the visitor's, elsewhere on the site.
export default function StageGatePanel() {
  const { e, gate, store, advance } = useEngine();
  const insight = useLive(store, (s) => (s.at === 0 ? e.insight : s.insight));
  const [open, setOpen] = useState(false);
  if (!gate) return null;
  const next = STAGES[gate.stage as EngineStage];
  const affordable = insight >= gate.cost;
  const doneCount = gate.reqs.filter((r) => r.done).length;
  const ready = gate.met && affordable;

  return (
    <div className="mt-3 border-t border-white/10 pt-2" data-engine-target="gate" data-no-drag>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        className="flex w-full items-center justify-between gap-2 text-left text-xs font-semibold text-slate-400 hover:text-white"
      >
        <span>
          Next: <span className="text-white">{next.chapter}</span>
        </span>
        <span className={ready ? "text-[var(--outpost-accent)]" : ""}>
          {doneCount}/{gate.reqs.length}
          {ready ? " — ready" : ""}
        </span>
      </button>
      {(open || ready) && (
        <div className="mt-2 space-y-1">
          {gate.reqs.map((r) => (
            <div key={r.id} className="flex items-center gap-2 text-[0.72rem]">
              <span className={r.done ? "text-[var(--outpost-accent)]" : "text-white/30"} aria-hidden="true">
                {r.done ? "\u{2714}" : "\u{25CB}"}
              </span>
              <span className={`flex-1 ${r.done ? "text-slate-300" : "text-slate-400"}`}>
                {r.label}
                {r.site && <span className="ml-1 text-[0.6rem] uppercase tracking-wider text-white/30">site</span>}
              </span>
              {r.target > 1 && (
                <span className="font-mono text-white/40">
                  {Math.floor(r.progress)}/{r.target}
                </span>
              )}
            </div>
          ))}
          <div className="flex items-center gap-2 pt-1 text-[0.72rem]">
            <span className={affordable ? "text-[var(--outpost-accent)]" : "text-white/30"} aria-hidden="true">
              {affordable ? "\u{2714}" : "\u{25CB}"}
            </span>
            <span className="flex-1 text-slate-400">Spend insight</span>
            <span className="font-mono text-white/40">{formatInsight(gate.cost)}</span>
          </div>
          <button
            type="button"
            onClick={advance}
            disabled={!ready}
            className="mt-1 w-full rounded-md border border-[var(--outpost-accent)] px-2 py-1.5 text-xs font-semibold text-[var(--outpost-accent)] transition-colors hover:bg-[var(--outpost-accent-soft)] disabled:border-white/15 disabled:text-white/30 disabled:hover:bg-transparent"
          >
            Grow into {next.chapter}
          </button>
        </div>
      )}
    </div>
  );
}
