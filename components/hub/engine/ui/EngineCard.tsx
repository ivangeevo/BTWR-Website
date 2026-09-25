"use client";

import { useEffect, useRef, useState } from "react";
import { dustLevel, formatInsight } from "../economy";
import { STAGES } from "../stages";
import { useEngine } from "./EngineProvider";
import { useLive } from "./live-store";
import BodyTab from "./body/BodyTab";
import DifferenceEngine from "./body/DifferenceEngine";
import LogbookTab from "./LogbookTab";
import CipherPanel from "./mind/CipherPanel";
import MindPuzzle from "./mind/MindPuzzle";
import CeremonyOverlay from "./overlays/CeremonyOverlay";
import { WhileAwaySummary } from "./overlays/EngineOverlays";
import GuidedHighlight from "./overlays/GuidedHighlight";
import StageGatePanel from "./overlays/StageGatePanel";
import { useReducedMotion } from "./use-reduced-motion";
import CrankButton from "./visuals/CrankButton";
import EngineSvg from "./visuals/EngineSvg";
import InsightCounter from "./visuals/InsightCounter";
import WorksTab from "./works/WorksTab";

type Tab = "mind" | "body" | "works" | "logbook";
const TAB_LABELS: Record<Tab, string> = { mind: "Mind", body: "Body", works: "Works", logbook: "Logbook" };

// Ponder → The Contraption → The Analytical Engine. At Day One this is just a
// word puzzle; every stage adds one more thing, and from The Stump on the
// card opens into a full-width Workshop holding the deeper systems.
export default function EngineCard() {
  const eng = useEngine();
  const { e, cfg, title, store, workshopOpen, setWorkshopOpen, holdSky, fx } = eng;
  const reduced = useReducedMotion();
  const corePU = useLive(store, (s) => s.corePU);
  const rootRef = useRef<HTMLDivElement>(null);
  const [tab, setTab] = useState<Tab>("mind");
  const [dust, setDust] = useState(0);

  useEffect(() => {
    const update = () => setDust(dustLevel(e, cfg, Date.now()));
    update();
    const id = window.setInterval(update, 60_000);
    return () => window.clearInterval(id);
  }, [e, cfg]);

  const tabs: Tab[] = (["mind", "logbook", "works", "body"] as Tab[]).filter((t) =>
    t === "mind" ? true : t === "logbook" ? e.stage >= 2 : t === "works" ? e.stage >= 3 : e.stage >= 4
  );
  const canOpen = e.stage >= 2;
  const crankReady = e.stage >= 3 && e.blueprints.includes("handCrank");
  const sizeClass = workshopOpen ? "" : e.stage >= 4 ? "outpost-card-lg" : "outpost-card-md";
  const stageDef = STAGES[e.stage];

  function open(t: Tab) {
    setTab(t);
    setWorkshopOpen(true);
  }

  return (
    <div ref={rootRef} className={`outpost-panel engine-card relative rounded-xl p-5 ${sizeClass}`} data-dust={dust} data-stage={e.stage}>
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h3 className="font-heading text-sm font-bold uppercase tracking-wider text-[var(--outpost-accent)]">{title}</h3>
        <div className="flex items-center gap-1.5">
          {e.stage < 3 ? <InsightCounter compact /> : null}
          <span className="outpost-resource-chip">{stageDef.chapter}</span>
        </div>
      </div>
      <p className="mt-1 text-xs text-slate-400">{stageDef.caption}</p>
      {dust > 0 && (
        <p className="mt-0.5 text-[0.65rem] italic text-slate-500">
          {dust >= 2 ? "Thick with dust. It's thinking slowly." : "A little dusty. It missed you."}
        </p>
      )}

      <WhileAwaySummary />

      {e.stage >= 3 && (
        <div className="mt-2 flex items-center gap-3">
          <EngineSvg stage={e.stage} size={e.stage >= 4 ? 64 : 52} spinning={!reduced && (corePU > 0 || e.stage < 4)} corePU={corePU} dust={dust} />
          <div className="min-w-0 flex-1">
            <InsightCounter />
            {e.stage >= 4 && (
              <p className="text-[0.65rem] text-slate-400">
                Core: <span className="text-white">{corePU} PU</span>
                {!e.grid.clutch && " · clutch disengaged"}
              </p>
            )}
          </div>
        </div>
      )}

      {!workshopOpen && (
        <>
          <MindPuzzle compact />
          {crankReady && (
            <div className="mt-3">
              <CrankButton />
            </div>
          )}
          {e.stage >= 3 && !e.ciphers.solved.includes("bp-handCrank") && (
            <button
              type="button"
              onClick={() => open("mind")}
              className="mt-2 w-full rounded-md border border-dashed border-[var(--outpost-accent-soft)] px-2 py-1.5 text-left text-xs text-[var(--outpost-accent)] hover:bg-[var(--outpost-accent-soft)]/20"
              data-engine-target="tab-mind"
            >
              {"\u{1F4DC}"} There&apos;s a scrambled page in its head. Help it read it →
            </button>
          )}
        </>
      )}

      {workshopOpen && (
        <div className="mt-3" data-no-drag>
          <div className="flex flex-wrap gap-1 border-b border-white/10 pb-1.5" role="tablist">
            {tabs.map((t) => (
              <button
                key={t}
                type="button"
                role="tab"
                aria-selected={tab === t}
                data-engine-target={`tab-${t}`}
                onClick={() => setTab(t)}
                className={`rounded-md px-2.5 py-1 text-xs font-semibold transition-colors ${
                  tab === t ? "bg-[var(--outpost-accent-soft)] text-white" : "text-slate-400 hover:text-white"
                }`}
              >
                {TAB_LABELS[t]}
              </button>
            ))}
          </div>
          <div className="mt-3">
            {tab === "mind" && (
              <div className="space-y-4">
                <MindPuzzle />
                {crankReady && <CrankButton />}
                {e.stage >= 3 && <CipherPanel />}
              </div>
            )}
            {tab === "logbook" && <LogbookTab />}
            {tab === "works" && <WorksTab />}
            {tab === "body" && (
              <>
                <BodyTab />
                {e.stage >= 8 && (
                  <section className="mt-4 border-t border-white/10 pt-3">
                    <h4 className="text-[0.7rem] font-bold uppercase tracking-wider text-white/50">The Difference Engine</h4>
                    <div className="mt-1.5">
                      <DifferenceEngine />
                    </div>
                  </section>
                )}
              </>
            )}
          </div>
        </div>
      )}

      <StageGatePanel />

      <div className="mt-2 flex flex-wrap items-center gap-2">
        {canOpen && (
          <button
            type="button"
            onClick={() => (workshopOpen ? setWorkshopOpen(false) : open(tab))}
            className="rounded-md border border-white/15 px-2.5 py-1 text-xs font-semibold text-slate-300 transition-colors hover:border-[var(--outpost-accent)] hover:text-white"
            data-no-drag
          >
            {workshopOpen ? "Close the Workshop" : e.stage >= 4 ? "Open the Engine" : "Open the Journal"}
          </button>
        )}
        {!workshopOpen && e.stage >= 3 && (
          <button
            type="button"
            onClick={() => open("works")}
            className="text-xs text-slate-400 hover:text-white"
            data-engine-target="tab-works"
            data-no-drag
          >
            Works →
          </button>
        )}
        {!workshopOpen && e.stage >= 4 && (
          <button
            type="button"
            onClick={() => open("body")}
            className="text-xs text-slate-400 hover:text-white"
            data-engine-target="tab-body"
            data-no-drag
          >
            Body →
          </button>
        )}
        {e.stage >= 8 && fx.governsSky && (
          <button type="button" onClick={holdSky} className="ml-auto text-xs text-[var(--outpost-accent)] hover:underline" data-no-drag>
            Hold the sky
          </button>
        )}
        {e.frenzy && new Date(e.frenzy.until).getTime() > Date.now() && (
          <span className="ml-auto text-[0.7rem] font-semibold text-[var(--outpost-accent)]">
            Eureka frenzy ×{formatInsight(e.frenzy.mult)}
          </span>
        )}
      </div>

      <CeremonyOverlay />
      <GuidedHighlight root={rootRef} />
    </div>
  );
}
