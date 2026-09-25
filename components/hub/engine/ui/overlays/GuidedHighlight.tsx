"use client";

import { useEffect, useLayoutEffect, useState } from "react";
import { pendingTutorial } from "../../content/tutorials";
import { useEngine } from "../EngineProvider";

const useIsoLayout = typeof window !== "undefined" ? useLayoutEffect : useEffect;

// The Engine teaching a new mechanic in its own voice — a ring around the
// thing it's talking about and a speech bubble below it. One tutorial at a
// time, 1–3 steps each, skippable; the Logbook can replay any of them.
export default function GuidedHighlight({ root }: { root: React.RefObject<HTMLElement> }) {
  const { e, ceremony, markTutorialSeen, workshopOpen } = useEngine();
  const tut = ceremony ? null : pendingTutorial(e);
  const [step, setStep] = useState(0);
  const [rect, setRect] = useState<{ top: number; left: number; width: number; height: number } | null>(null);

  useEffect(() => setStep(0), [tut?.id]);

  const target = tut?.steps[step]?.target;
  useIsoLayout(() => {
    if (!target || !root.current) {
      setRect(null);
      return;
    }
    const measure = () => {
      const host = root.current;
      const el = host?.querySelector<HTMLElement>(`[data-engine-target="${target}"]`);
      if (!host || !el) {
        setRect(null);
        return;
      }
      const h = host.getBoundingClientRect();
      const r = el.getBoundingClientRect();
      setRect({ top: r.top - h.top, left: r.left - h.left, width: r.width, height: r.height });
    };
    measure();
    const id = window.setInterval(measure, 500);
    window.addEventListener("resize", measure);
    return () => {
      window.clearInterval(id);
      window.removeEventListener("resize", measure);
    };
  }, [target, root, workshopOpen, e.stage]);

  if (!tut) return null;
  const s = tut.steps[step];
  const last = step >= tut.steps.length - 1;

  return (
    <>
      {rect && (
        <div
          className="engine-guide-ring"
          style={{ top: rect.top - 4, left: rect.left - 4, width: rect.width + 8, height: rect.height + 8 }}
          aria-hidden="true"
        />
      )}
      <div
        className="engine-guide-bubble"
        style={rect ? { top: rect.top + rect.height + 10, left: 12, right: 12 } : { bottom: 12, left: 12, right: 12 }}
        role="status"
        data-no-drag
      >
        <p className="text-xs text-white">{s.line}</p>
        <div className="mt-1.5 flex items-center justify-between gap-2">
          <button type="button" onClick={() => markTutorialSeen(tut.id)} className="text-[0.7rem] text-slate-400 hover:text-white">
            Skip
          </button>
          <span className="text-[0.6rem] text-white/30">
            {step + 1}/{tut.steps.length}
          </span>
          <button
            type="button"
            onClick={() => (last ? markTutorialSeen(tut.id) : setStep(step + 1))}
            className="text-[0.7rem] font-semibold text-[var(--outpost-accent)] hover:underline"
          >
            {last ? "Got it" : "Next"}
          </button>
        </div>
      </div>
    </>
  );
}
