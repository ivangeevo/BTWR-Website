"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useAchievements } from "./AchievementsProvider";
import { pendingTutorial } from "./engine/content/tutorials";
import { formatInsight } from "./engine/economy";
import { STAGES } from "./engine/stages";
import type { EngineStage } from "./engine/types";
import { useEngine } from "./engine/ui/EngineProvider";
import { useLive } from "./engine/ui/live-store";

const TIP_ROTATE_MS = 60_000;

// The whole Outpost's goal, in one thin bar under the top bar: the chapter
// it's working towards, the stage's tip (Stages tab in /outpost-admin),
// and every requirement of the gate into it (engine/stages.ts) — the
// Engine's own half beside the half done out at camp and around the site.
// Growing the Engine is growing the Outpost, so this sits outside the
// Engine's card. Details open as a dropdown so the page never jumps; once
// the chapter's ready its Grow button sits right in the bar.
//
// Hidden at Stage 0 ("???", engine/content/stirring.ts) — nothing there
// admits to chapters yet — and with no gate left (Stage 8) and no tip.
export default function ChapterBar() {
  const eng = useEngine();
  const { stageTips, isModuleRevealed, engine: e } = useAchievements();
  const insight = useLive(eng.store, (s) => (s.at === 0 ? e.insight : s.insight));
  const [open, setOpen] = useState(false);
  const [tipIndex, setTipIndex] = useState(0);
  const rootRef = useRef<HTMLDivElement>(null);
  const tipsOn = isModuleRevealed("stage-tip");
  const tips = useMemo(() => (tipsOn ? stageTips : []), [tipsOn, stageTips]);

  useEffect(() => {
    setTipIndex(0);
    if (tips.length <= 1) return;
    const id = window.setInterval(() => setTipIndex((i) => (i + 1) % tips.length), TIP_ROTATE_MS);
    return () => window.clearInterval(id);
  }, [tips]);

  useEffect(() => {
    if (!open) return;
    const onDown = (ev: PointerEvent) => {
      if (rootRef.current && !rootRef.current.contains(ev.target as Node)) setOpen(false);
    };
    const onKey = (ev: KeyboardEvent) => ev.key === "Escape" && setOpen(false);
    window.addEventListener("pointerdown", onDown);
    window.addEventListener("keydown", onKey);
    return () => {
      window.removeEventListener("pointerdown", onDown);
      window.removeEventListener("keydown", onKey);
    };
  }, [open]);

  if (e.stage === 0) return null;
  const gate = eng.gate;
  const tip = tips[tipIndex] ?? null;
  if (!gate && !tip) return null;

  const next = gate ? STAGES[gate.stage as EngineStage] : null;
  const affordable = !!gate && insight >= gate.cost;
  const ready = !!gate && gate.met && affordable;
  const doneCount = gate ? gate.reqs.filter((r) => r.done).length + (affordable ? 1 : 0) : 0;
  const total = gate ? gate.reqs.length + 1 : 0;
  // The Engine's "this is what I need to grow" lesson points here.
  const taught = pendingTutorial(e)?.id === "t-gate" && !eng.ceremony;
  const engineReqs = gate?.reqs.filter((r) => !r.site) ?? [];
  const outReqs = gate?.reqs.filter((r) => r.site) ?? [];

  const reqRow = (r: NonNullable<typeof gate>["reqs"][number]) => (
    <li key={r.id} className="flex items-center gap-2 text-[0.72rem]">
      <span className={r.done ? "text-[var(--outpost-accent)]" : "text-white/30"} aria-hidden="true">
        {r.done ? "\u{2714}" : "\u{25CB}"}
      </span>
      <span className={`flex-1 ${r.done ? "text-slate-300" : "text-slate-400"}`}>{r.label}</span>
      {r.target > 1 && (
        <span className="font-mono text-white/40">
          {Math.floor(r.progress)}/{r.target}
        </span>
      )}
    </li>
  );

  const growButton = gate && next && (
    <button
      type="button"
      onClick={() => {
        if (eng.advance()) setOpen(false);
      }}
      disabled={!ready}
      className="shrink-0 rounded-md border border-[var(--outpost-accent)] px-2.5 py-1 text-xs font-semibold text-[var(--outpost-accent)] transition-colors hover:bg-[var(--outpost-accent-soft)] disabled:border-white/15 disabled:text-white/30 disabled:hover:bg-transparent"
    >
      Grow into {next.chapter}
      {gate.cost > 0 && ` (${formatInsight(gate.cost)} insight)`}
    </button>
  );

  return (
    <div ref={rootRef} className="relative z-[35] shrink-0 px-3 pt-2 sm:px-4" data-no-drag>
      <div className={`outpost-tip-box ${taught ? "outpost-chapter-taught" : ""}`}>
        {next ? (
          <span className="shrink-0 text-xs font-semibold text-slate-400">
            Next: <span className="text-white">{next.chapter}</span>
          </span>
        ) : (
          <span className="shrink-0 text-sm leading-none" aria-hidden="true">
            {"\u{1F4A1}"}
          </span>
        )}
        {tip && (
          <p key={tipIndex} className="outpost-tip-text" title={tip}>
            {gate && <span className="mr-2 text-white/20">·</span>}
            {tip}
          </p>
        )}
        {!tip && <span className="flex-1" />}
        {gate && (
          <>
            {ready && growButton}
            <button
              type="button"
              onClick={() => setOpen((v) => !v)}
              aria-expanded={open}
              aria-controls="outpost-chapter-details"
              className={`shrink-0 rounded-md px-2 py-0.5 text-xs font-semibold hover:text-white ${ready ? "text-[var(--outpost-accent)]" : "text-slate-400"}`}
            >
              {doneCount}/{total} {open ? "\u{25B4}" : "\u{25BE}"}
            </button>
          </>
        )}
      </div>

      {open && gate && next && (
        <div
          id="outpost-chapter-details"
          className="outpost-settings-dropdown"
          style={{ left: "1rem", right: "auto", top: "calc(100% + 0.25rem)", width: "min(36rem, calc(100% - 2rem))" }}
        >
          <p className="text-xs font-bold uppercase tracking-wider text-white/40">What {next.chapter} needs</p>
          <div className="mt-2 grid gap-3 sm:grid-cols-2">
            <div>
              <p className="text-[0.65rem] font-semibold uppercase tracking-wider text-[var(--outpost-accent)]">The Engine</p>
              <ul className="mt-1 space-y-1">
                {engineReqs.map(reqRow)}
                <li className="flex items-center gap-2 text-[0.72rem]">
                  <span className={affordable ? "text-[var(--outpost-accent)]" : "text-white/30"} aria-hidden="true">
                    {affordable ? "\u{2714}" : "\u{25CB}"}
                  </span>
                  {/* The price of growing, not a task of its own: spent by the Grow button. */}
                  <span className="flex-1 text-slate-400">
                    Save up insight to grow
                    {!affordable && e.stage <= 2 && (
                      <span className="block text-[0.62rem] text-white/30">Every finished sentence earns some.</span>
                    )}
                  </span>
                  <span className="font-mono text-white/40">
                    {formatInsight(Math.min(insight, gate.cost))}/{formatInsight(gate.cost)}
                  </span>
                </li>
              </ul>
            </div>
            {outReqs.length > 0 && (
              <div>
                <p className="text-[0.65rem] font-semibold uppercase tracking-wider text-[var(--outpost-accent)]">You, out there</p>
                <ul className="mt-1 space-y-1">{outReqs.map(reqRow)}</ul>
              </div>
            )}
          </div>
          <div className="mt-3 flex justify-end">{growButton}</div>
        </div>
      )}
    </div>
  );
}
