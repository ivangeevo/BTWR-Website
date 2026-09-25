"use client";

import { useEffect, useRef, useState } from "react";
import { useAchievements } from "../../../AchievementsProvider";
import { crankBoostAt, crankRevMs, formatInsight } from "../../economy";
import { useEngine } from "../EngineProvider";

type Floater = { id: number; text: string };

// The hand crank — hold to turn. Every full revolution is one "click" of
// the clicker (1 insight + a share of insight/sec from research) and keeps
// the grid crank-powered for a few seconds. Feeding it a Cooked Food turns
// it twice as fast for a while (BTW's hand crank costs hunger).
export default function CrankButton() {
  const { e, cfg, fx, crankRev, feedCrank, toast } = useEngine();
  const { resources } = useAchievements();
  const [holding, setHolding] = useState(false);
  const [progress, setProgress] = useState(0);
  const [floaters, setFloaters] = useState<Floater[]>([]);
  const rafRef = useRef<number | null>(null);
  const startRef = useRef(0);
  const nextId = useRef(0);
  const eRef = useRef(e);
  eRef.current = e;

  useEffect(() => {
    if (!holding) {
      setProgress(0);
      return;
    }
    startRef.current = performance.now();
    function frame(t: number) {
      const period = crankRevMs(eRef.current, cfg, fx, Date.now());
      const p = (t - startRef.current) / period;
      if (p >= 1) {
        startRef.current = t;
        const gained = crankRev();
        const id = nextId.current++;
        setFloaters((prev) => [...prev.slice(-5), { id, text: `+${formatInsight(gained)}` }]);
        window.setTimeout(() => setFloaters((prev) => prev.filter((f) => f.id !== id)), 900);
        setProgress(0);
      } else {
        setProgress(p);
      }
      rafRef.current = requestAnimationFrame(frame);
    }
    rafRef.current = requestAnimationFrame(frame);
    return () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
    };
  }, [holding, cfg, fx, crankRev]);

  const boosted = crankBoostAt(e, Date.now());
  const stop = () => setHolding(false);

  // From Stage 4 the crank is a part on the grid: turning it only powers the
  // core once it is wired (crank → gearbox input → core) and the clutch is in.
  const crankPU = e.grid.clutch ? ((boosted ? e.solved?.boosted.corePU : e.solved?.cranked.corePU) ?? 0) : 0;
  const wiringHint =
    e.stage < 4
      ? null
      : !e.grid.clutch
        ? "The clutch is disengaged, so turning this doesn't reach my core. Engage it in the Body tab."
        : crankPU <= 0
          ? "The crank isn't wired to my core. Body tab: point it into a gearbox's input face, gearbox touching the ◎."
          : null;

  return (
    <div data-no-drag>
      <div className="flex items-center gap-2">
        <div className="relative flex-1">
          <button
            type="button"
            data-engine-target="crank"
            className="outpost-hold-button"
            onPointerDown={(ev) => {
              ev.currentTarget.setPointerCapture(ev.pointerId);
              setHolding(true);
            }}
            onPointerUp={stop}
            onPointerCancel={stop}
            onPointerLeave={stop}
            onKeyDown={(ev) => {
              if (ev.key === " " || ev.key === "Enter") {
                ev.preventDefault();
                setHolding(true);
              }
            }}
            onKeyUp={stop}
            onBlur={stop}
            aria-label="Hold to turn the hand crank"
          >
            <span className="outpost-hold-button-fill" style={{ width: `${progress * 100}%` }} />
            <span className="relative">
              <span className={`engine-crank-icon ${holding ? "engine-spin" : ""}`} aria-hidden="true">
                {"\u{2699}\u{FE0F}"}
              </span>{" "}
              {holding ? "Turning…" : "Hold to crank"}
              {boosted && <span className="ml-1 text-[0.7rem] text-[var(--outpost-accent)]">(fed)</span>}
            </span>
          </button>
          <div className="pointer-events-none absolute inset-x-0 -top-1 flex justify-center">
            {floaters.map((f) => (
              <span key={f.id} className="engine-floater">
                {f.text}
              </span>
            ))}
          </div>
        </div>
        <button
          type="button"
          onClick={() => {
            if (!feedCrank()) toast("Nothing cooked to feed it. The campfire cooks at Medium.", "warn");
          }}
          disabled={(resources.cookedFood ?? 0) < 1}
          title="Spend 1 Cooked Food: the crank turns twice as fast for 2 minutes"
          className="shrink-0 rounded-md border border-white/15 px-2 py-2 text-xs text-slate-300 transition-colors hover:border-[var(--outpost-accent)] disabled:opacity-40"
        >
          {"\u{1F372}"} Feed
        </button>
      </div>
      {wiringHint ? (
        <p className="mt-1 text-[0.65rem] text-amber-300/80">{wiringHint}</p>
      ) : e.stage >= 4 ? (
        <p className="mt-1 text-[0.65rem] text-slate-500">
          While turning: <span className="text-white">+{crankPU} PU</span> at the core.
        </p>
      ) : null}
    </div>
  );
}
