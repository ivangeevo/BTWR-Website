"use client";

import { useEffect, useRef, useState } from "react";
import { stirringCaption } from "../content/stirring";
import type { EngineConfig } from "../config";
import { dustLevel, formatInsight } from "../economy";
import { STAGES } from "../stages";
import { useAchievements } from "../../AchievementsProvider";
import { useEngine } from "./EngineProvider";
import { useLive } from "./live-store";
import BodyTab from "./body/BodyTab";
import DifferenceEngine from "./body/DifferenceEngine";
import LogbookTab from "./LogbookTab";
import CipherPanel from "./mind/CipherPanel";
import MindPuzzle from "./mind/MindPuzzle";
import Stirring from "./mind/Stirring";
import CeremonyOverlay from "./overlays/CeremonyOverlay";
import { WhileAwaySummary } from "./overlays/EngineOverlays";
import GuidedHighlight from "./overlays/GuidedHighlight";
import { useReducedMotion } from "./use-reduced-motion";
import EngineSvg from "./visuals/EngineSvg";
import InsightCounter from "./visuals/InsightCounter";
import WorksTab from "./works/WorksTab";

// Body, Mind, Soul. Body holds what it's built from and spends on (the
// component shop, research, the Ledger Drum, its specialization and
// commissions, once the "Works" tab — and from First Iron the gear grid);
// Mind the sentences and ciphers; Soul all it remembers (once "Logbook").
type Tab = "body" | "mind" | "soul";
const TAB_LABELS: Record<Tab, string> = { body: "Body", mind: "Mind", soul: "Soul" };
const TAB_ORDER: Tab[] = ["body", "mind", "soul"];
const TAB_STAGE: Record<Tab, number> = { mind: 1, soul: 2, body: 3 };

// By day it builds, by night it thinks (economy.ts's clockMult).
function clockCaption(stage: number, night: boolean, cfg: EngineConfig): string {
  if (night) return `Night. I think better in the dark: +${cfg.economy.nightThinkPct}% from sentences and ciphers.`;
  if (stage < 4) return "Day. I'll think harder tonight.";
  return `Day. Good light for building: +${cfg.economy.dayBuildPct}% per crank turn.`;
}

// Which tabs have been opened at least once (a per-browser nicety: a tab
// that's just appeared carries a dot until it's first opened).
const SEEN_KEY = "btwr:hub:engine-tabs:v1";
// Tabs renamed or folded since: Logbook is Soul, Works is part of Body.
const RENAMED_TABS: Record<string, Tab> = { logbook: "soul", works: "body" };
function readSeen(): Tab[] {
  try {
    const v = JSON.parse(window.localStorage.getItem(SEEN_KEY) ?? "[]");
    if (!Array.isArray(v)) return [];
    const tabs = v.map((t) => (typeof t === "string" ? (RENAMED_TABS[t] ?? t) : t));
    return [...new Set(tabs.filter((t): t is Tab => TAB_ORDER.includes(t)))];
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
// caption, in the order Body → Mind → Soul, and appear as they unlock: Mind
// (the puzzle and the cipher pages — home) first, then Soul, then Body.
// The card fills Basecamp's Engine view (HubSection.tsx) and stays the same
// size on every tab, scrolling inside itself.
export default function EngineCard() {
  const eng = useEngine();
  const { engineBuffs } = useAchievements();
  const { e, cfg, env, title, store, holdSky, fx, passive, takeOver } = eng;
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
  const stageDef = STAGES[e.stage];
  // Stage 0 ("???"): only the dark field (Stirring.tsx) — no counter, tabs,
  // gate, tutorials or dust. It doesn't know what it is yet.
  const dark = e.stage === 0;
  // One clock with the camp (economy.ts's clockMult): from The Stump, when
  // the sky cycle arrives, the card says whether it's building or thinking.
  const clocked = e.stage >= 3;
  const frenzyOn = !!e.frenzy && new Date(e.frenzy.until).getTime() > Date.now();

  function setTab(t: Tab) {
    setTabState(t);
    if (!seen.includes(t)) {
      const next = [...seen, t];
      setSeen(next);
      writeSeen(next.filter((x) => x !== "mind"));
    }
  }

  return (
    // The header and tabs stay put; everything under them scrolls inside the
    // card, so the ceremony and tutorial overlays (absolute on the card) always
    // cover what's on screen.
    <div
      ref={rootRef}
      // Its lit core is a light at camp (engine/buffs.ts): the card stays
      // above the gloom (GloomLayer.tsx), like the Campfire.
      className={`outpost-panel engine-card relative flex flex-col rounded-xl p-5 lg:h-full ${engineBuffs.coreLit ? "outpost-lit" : ""}`}
      data-dust={dust}
      data-stage={e.stage}
    >
      <div className="flex shrink-0 flex-wrap items-center justify-between gap-2">
        <h3 className="font-heading text-sm font-bold uppercase tracking-wider text-[var(--outpost-accent)]">{title}</h3>
        <div className="flex items-center gap-1.5">
          {!dark && e.stage < 3 ? <InsightCounter compact /> : null}
          <span className="outpost-resource-chip">
            {clocked && (
              <span className="mr-1" aria-label={env.night ? "Night" : "Day"}>
                {env.night ? "\u{263E}" : "\u{2600}\u{FE0F}"}
              </span>
            )}
            {stageDef.chapter}
          </span>
        </div>
      </div>
      <p className="mt-1 shrink-0 text-xs leading-snug text-slate-400">{dark ? stirringCaption(e) : stageDef.caption}</p>
      {clocked && <p className="mt-0.5 shrink-0 text-[0.65rem] italic text-slate-500">{clockCaption(e.stage, env.night, cfg)}</p>}
      {!dark && dust > 0 && (
        <p className="mt-0.5 shrink-0 text-[0.65rem] italic text-slate-500">
          {dust >= 2 ? "Thick with dust. It's thinking slowly." : "A little dusty. It missed you."}
        </p>
      )}

      {tabs.length > 1 && (
        <div className="mt-2 flex shrink-0 flex-wrap gap-1 border-b border-white/10 pb-1.5" role="tablist" aria-label={title} data-no-drag>
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

      {dark ? (
        <div className="mt-3 flex flex-col lg:min-h-0 lg:flex-1 [&>*]:flex-1">
          <Stirring />
        </div>
      ) : (
        <div data-outpost-scroll className="outpost-card-inner-scroll -mx-5 -mb-5 px-5 pb-5">
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
              // A readable width: the view is wide, the puzzle doesn't need to be.
              <div className="mx-auto max-w-3xl space-y-4">
                <MindPuzzle />
                {e.stage >= 3 && <CipherPanel />}
              </div>
            )}
            {current === "soul" && <LogbookTab />}
            {current === "body" && (
              <>
                {/* The grid from First Iron; before that, only what Works used to hold. */}
                {e.stage >= 4 && (
                  <div className="mb-4 border-b border-white/10 pb-4">
                    <BodyTab />
                  </div>
                )}
                <WorksTab />
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
          {!dark && <GuidedHighlight root={rootRef} />}
        </>
      )}
    </div>
  );
}
