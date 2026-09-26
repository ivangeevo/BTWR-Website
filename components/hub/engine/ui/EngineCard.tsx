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
import EngineSvg from "./visuals/EngineSvg";
import InsightCounter from "./visuals/InsightCounter";
import WorksTab from "./works/WorksTab";

type Tab = "mind" | "body" | "works" | "logbook";
const TAB_LABELS: Record<Tab, string> = { mind: "Mind", body: "Body", works: "Works", logbook: "Logbook" };
const TAB_ORDER: Tab[] = ["mind", "logbook", "works", "body"];
const TAB_STAGE: Record<Tab, number> = { mind: 1, logbook: 2, works: 3, body: 4 };

// Which tabs have been opened at least once (a per-browser nicety: a tab
// that's just appeared carries a dot until it's first opened).
const SEEN_KEY = "btwr:hub:engine-tabs:v1";
function readSeen(): Tab[] {
  try {
    const v = JSON.parse(window.localStorage.getItem(SEEN_KEY) ?? "[]");
    return Array.isArray(v) ? v.filter((t): t is Tab => TAB_ORDER.includes(t)) : [];
  } catch {
    return [];
  }
}
function writeSeen(tabs: Tab[]) {
  try {
    window.localStorage.setItem(SEEN_KEY, JSON.stringify(tabs));
  } catch {
    // Only the "new" dots depend on this.
  }
}

// Ponder → The Contraption → The Analytical Engine. At Day One this is just a
// word puzzle; every stage adds one more thing. Its tabs sit under the
// caption and appear as they unlock: Mind (the puzzle and the cipher
// pages — home), then Logbook, Works and Body (the gear grid and its crank). Any tab but Mind
// widens the card over the Outpost's middle column (the "Workshop"); going
// back to Mind shrinks it again.
export default function EngineCard() {
  const eng = useEngine();
  const { e, cfg, title, store, workshopOpen, setWorkshopOpen, holdSky, fx, passive, takeOver } = eng;
  const reduced = useReducedMotion();
  const corePU = useLive(store, (s) => s.corePU);
  const rootRef = useRef<HTMLDivElement>(null);
  const [tab, setTabState] = useState<Tab>("mind");
  const [seen, setSeen] = useState<Tab[]>(["mind"]);
  const [dust, setDust] = useState(0);

  useEffect(() => setSeen(["mind", ...readSeen()]), []);

  useEffect(() => {
    const update = () => setDust(dustLevel(e, cfg, Date.now()));
    update();
    const id = window.setInterval(update, 60_000);
    return () => window.clearInterval(id);
  }, [e, cfg]);

  const tabs = TAB_ORDER.filter((t) => e.stage >= TAB_STAGE[t]);
  // A tab can vanish (prestige takes the Engine back a stage): fall back to Mind.
  const current: Tab = tabs.includes(tab) ? tab : "mind";
  const sizeClass = workshopOpen ? "" : e.stage >= 4 ? "outpost-card-lg" : "outpost-card-md";
  const stageDef = STAGES[e.stage];
  const frenzyOn = !!e.frenzy && new Date(e.frenzy.until).getTime() > Date.now();

  // The card is wide on every tab but Mind.
  useEffect(() => {
    setWorkshopOpen(current !== "mind");
  }, [current, setWorkshopOpen]);

  function setTab(t: Tab) {
    setTabState(t);
    if (!seen.includes(t)) {
      const next = [...seen, t];
      setSeen(next);
      writeSeen(next.filter((x) => x !== "mind"));
    }
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
      <p className="mt-1 text-xs leading-snug text-slate-400">{stageDef.caption}</p>
      {dust > 0 && (
        <p className="mt-0.5 text-[0.65rem] italic text-slate-500">
          {dust >= 2 ? "Thick with dust. It's thinking slowly." : "A little dusty. It missed you."}
        </p>
      )}

      {tabs.length > 1 && (
        <div className="mt-2 flex flex-wrap gap-1 border-b border-white/10 pb-1.5" role="tablist" aria-label={title} data-no-drag>
          {tabs.map((t) => (
            <button
              key={t}
              type="button"
              role="tab"
              aria-selected={current === t}
              data-engine-target={`tab-${t}`}
              onClick={() => setTab(t)}
              className={`relative rounded-md px-2.5 py-1 text-xs font-semibold transition-colors ${
                current === t ? "bg-[var(--outpost-accent-soft)] text-white" : "text-slate-400 hover:text-white"
              }`}
            >
              {TAB_LABELS[t]}
              {!seen.includes(t) && current !== t && (
                <span className="absolute right-0.5 top-0.5 h-1.5 w-1.5 rounded-full bg-[var(--outpost-accent)]" aria-label="new" />
              )}
            </button>
          ))}
        </div>
      )}

      <WhileAwaySummary />

      {e.stage >= 3 && (
        <div className="relative mt-2 flex items-center gap-3">
          <EngineSvg stage={e.stage} size={e.stage >= 4 ? 64 : 52} spinning={!reduced && (corePU > 0 || e.stage < 4)} corePU={corePU} dust={dust} />
          <div className="min-w-0 flex-1">
            {/* Only the counter keeps clear of the frenzy badge in the corner; the Core line runs under it. */}
            <div className={frenzyOn ? "pr-24" : undefined}>
              <InsightCounter />
            </div>
            {e.stage >= 4 && (
              <p className="text-[0.65rem] text-slate-400">
                Power: <span className="text-white">{corePU} PU</span>
                {!e.grid.clutch && " · clutch disengaged"}
              </p>
            )}
          </div>
          {frenzyOn && (
            <span className="absolute right-0 top-0 whitespace-nowrap text-[0.7rem] font-semibold text-[var(--outpost-accent)]">
              Eureka frenzy ×{formatInsight(e.frenzy!.mult)}
            </span>
          )}
        </div>
      )}

      <div className="mt-3" data-no-drag>
        {current === "mind" && (
          <div className="space-y-4">
            <MindPuzzle />
            {e.stage >= 3 && <CipherPanel />}
          </div>
        )}
        {current === "logbook" && <LogbookTab />}
        {current === "works" && <WorksTab />}
        {current === "body" && (
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

      <StageGatePanel />

      {/* A frenzy shows at the top right of the insight row above; only a
          stage too early for that row (Eurekas can be set that early) puts it here. */}
      {((e.stage >= 8 && fx.governsSky) || (frenzyOn && e.stage < 3)) && (
        <div className="mt-2 flex flex-wrap items-center gap-2">
          {e.stage >= 8 && fx.governsSky && (
            <button type="button" onClick={holdSky} className="text-xs text-[var(--outpost-accent)] hover:underline" data-no-drag>
              Hold the sky
            </button>
          )}
          {frenzyOn && e.stage < 3 && (
            <span className="ml-auto text-[0.7rem] font-semibold text-[var(--outpost-accent)]">
              Eureka frenzy ×{formatInsight(e.frenzy!.mult)}
            </span>
          )}
        </div>
      )}

      {passive ? (
        <div className="engine-ceremony" role="status" data-no-drag>
          <div className="engine-ceremony-inner">
            <p className="text-sm text-white">The Engine is already running in another tab.</p>
            <p className="mt-1 text-xs text-slate-400">Only one place can run it at a time, so nothing here gets lost.</p>
            <button
              type="button"
              onClick={takeOver}
              className="mt-3 rounded-md border border-[var(--outpost-accent)] px-3 py-1 text-xs font-semibold text-[var(--outpost-accent)] hover:bg-[var(--outpost-accent-soft)]"
            >
              Run it here instead
            </button>
          </div>
        </div>
      ) : (
        <>
          <CeremonyOverlay />
          <GuidedHighlight root={rootRef} />
        </>
      )}
    </div>
  );
}
