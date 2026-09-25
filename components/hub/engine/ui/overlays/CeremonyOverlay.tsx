"use client";

import { useEffect, useState } from "react";
import { CEREMONIES, markCeremony } from "../../content/ceremonies";
import { STAGES } from "../../stages";
import { useEngine } from "../EngineProvider";
import { useReducedMotion } from "../use-reduced-motion";
import EngineSvg from "../visuals/EngineSvg";

// The Engine "waking up" into a new stage (or a new Mark): its lines type
// out one at a time, the new part materializes, and it lists what's new.
// Shown once per stage; replayable from the Logbook.
export default function CeremonyOverlay() {
  const { ceremony, dismissCeremony, e } = useEngine();
  const reduced = useReducedMotion();
  const [shown, setShown] = useState(0);

  const c = ceremony ? (ceremony.kind === "stage" ? CEREMONIES[ceremony.stage] : markCeremony(ceremony.mark)) : null;
  const allText = c ? c.lines.join("\n") : "";

  useEffect(() => {
    setShown(reduced ? Number.MAX_SAFE_INTEGER : 0);
  }, [ceremony, reduced]);

  useEffect(() => {
    if (!c || shown >= allText.length) return;
    const id = window.setTimeout(() => setShown((n) => n + 1), allText[shown] === "\n" ? 380 : 28);
    return () => window.clearTimeout(id);
  }, [c, shown, allText]);

  if (!ceremony || !c) return null;
  const typing = shown < allText.length;
  const heading = ceremony.kind === "stage" ? STAGES[ceremony.stage].chapter : `Mark ${ceremony.mark}`;

  return (
    <div className="engine-ceremony" role="dialog" aria-modal="false" aria-label={`The Engine: ${heading}`} data-no-drag>
      <div className="engine-ceremony-inner">
        <p className="text-[0.65rem] font-bold uppercase tracking-[0.25em] text-[var(--outpost-accent)]">{heading}</p>
        <div className="outpost-materialize mt-2 flex justify-center">
          <EngineSvg stage={ceremony.kind === "stage" ? ceremony.stage : e.stage} size={72} spinning={!reduced} />
        </div>
        <p className="mt-3 min-h-[3.5rem] whitespace-pre-line text-sm text-white">
          {allText.slice(0, shown)}
          {typing && <span className="engine-caret" aria-hidden="true" />}
        </p>
        {!typing && (
          <ul className="outpost-materialize mt-3 space-y-0.5 text-left text-xs text-slate-300">
            {c.unlocks.map((u) => (
              <li key={u}>
                <span className="text-[var(--outpost-accent)]">+</span> {u}
              </li>
            ))}
          </ul>
        )}
        <div className="mt-4 flex justify-center gap-2">
          {typing && (
            <button type="button" onClick={() => setShown(allText.length)} className="text-xs text-slate-400 hover:text-white">
              Skip
            </button>
          )}
          {!typing && (
            <button
              type="button"
              onClick={dismissCeremony}
              className="rounded-md border border-[var(--outpost-accent)] px-3 py-1 text-xs font-semibold text-[var(--outpost-accent)] hover:bg-[var(--outpost-accent-soft)]"
            >
              Continue
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
