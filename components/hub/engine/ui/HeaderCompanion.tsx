"use client";

import { useEffect, useRef, useState } from "react";
import { formatInsight } from "../economy";
import { pushInbox, readEnginePublic } from "../bridge-storage";
import type { EnginePublic } from "../types";

const POLL_MS = 2000;
const HOLD_MS = 3000;
const SPARK_LIFE_MS = 12_000;

// The Engine's small presence in the site header, from The Crucible on.
// Lives outside the Outpost's providers, so it only ever READS the Engine's
// public snapshot and reports back through the bridge inbox — the Outpost
// drains that the next time it's open.
// - Spins with the power reaching the Engine's core; hover for insight/sec.
// - Hold it for 3 seconds: the Engine answers (and a keyword piece turns up).
// - Away from the homepage, Eureka sparks show up here instead of on cards.
export default function HeaderCompanion() {
  const [pub, setPub] = useState<EnginePublic | null>(null);
  const [tip, setTip] = useState(false);
  const [holding, setHolding] = useState(false);
  const [spark, setSpark] = useState<number | null>(null);
  const [line, setLine] = useState<string | null>(null);
  const holdTimer = useRef<number | null>(null);

  useEffect(() => {
    const sync = () => setPub(readEnginePublic());
    sync();
    const id = window.setInterval(sync, POLL_MS);
    window.addEventListener("storage", sync);
    return () => {
      window.clearInterval(id);
      window.removeEventListener("storage", sync);
    };
  }, []);

  // Off-homepage Eurekas — the homepage's own Engine spawns its sparks on
  // Outpost cards (it marks <html data-engine-live> while mounted).
  useEffect(() => {
    if (!pub?.companion) return;
    let timer = 0;
    const schedule = () => {
      timer = window.setTimeout(() => {
        if (!document.documentElement.dataset.engineLive && document.visibilityState === "visible") {
          setSpark(Date.now() + SPARK_LIFE_MS);
        }
        schedule();
      }, (4 + Math.random() * 5) * 60_000);
    };
    schedule();
    return () => window.clearTimeout(timer);
  }, [pub?.companion]);

  useEffect(() => {
    if (spark === null) return;
    const id = window.setTimeout(() => setSpark(null), Math.max(0, spark - Date.now()));
    return () => window.clearTimeout(id);
  }, [spark]);

  if (!pub?.companion) return null;

  const seconds = pub.corePU <= 0 ? 14 : Math.max(1.2, 8 / Math.sqrt(pub.corePU));
  const elapsed = (Date.now() - new Date(pub.updatedAt).getTime()) / 1000;
  const estimate = pub.insight + pub.ips * Math.max(0, Math.min(elapsed, 3600));

  function say(text: string) {
    setLine(text);
    window.setTimeout(() => setLine(null), 3500);
  }

  function startHold() {
    setHolding(true);
    holdTimer.current = window.setTimeout(() => {
      setHolding(false);
      pushInbox({ type: "companionHold" });
      say(pub?.fragments.includes("frag-page") ? "I'm here. I'm always here." : "You held on. Here: “LFO”. You'll know where it goes.");
    }, HOLD_MS);
  }

  function endHold() {
    setHolding(false);
    if (holdTimer.current) window.clearTimeout(holdTimer.current);
    holdTimer.current = null;
  }

  return (
    <div className="relative">
      <button
        type="button"
        className={`engine-companion ${holding ? "engine-companion-hold" : ""}`}
        aria-label={`${pub.title}: ${formatInsight(pub.ips)} insight per second. Hold to talk to it.`}
        onMouseEnter={() => setTip(true)}
        onMouseLeave={() => {
          setTip(false);
          endHold();
        }}
        onFocus={() => setTip(true)}
        onBlur={() => setTip(false)}
        onPointerDown={startHold}
        onPointerUp={endHold}
        onPointerCancel={endHold}
        onClick={() => {
          if (spark !== null) {
            setSpark(null);
            pushInbox({ type: "eureka" });
            say("Eureka! I'll keep that one for when you're back at the Outpost.");
          }
        }}
      >
        <svg viewBox="-12 -12 24 24" width="18" height="18" aria-hidden="true" style={{ animationDuration: `${seconds}s` }}>
          {Array.from({ length: 8 }, (_, i) => (
            <rect key={i} x={-1.6} y={-11} width={3.2} height={4} rx={0.8} fill="currentColor" transform={`rotate(${i * 45})`} />
          ))}
          <circle r={7.5} fill="none" stroke="currentColor" strokeWidth={2.4} />
          <circle r={2.2} fill="currentColor" />
        </svg>
        {spark !== null && <span className="engine-spark" style={{ position: "absolute", top: "50%", left: "50%", height: "1.4rem", width: "1.4rem", fontSize: "0.7rem" }}>{"\u{1F4A1}"}</span>}
      </button>
      {(tip || line) && (
        <div className="engine-companion-tip" role="status">
          {line ?? (
            <>
              <span className="font-semibold">{pub.title}</span> · {formatInsight(estimate)} insight · {formatInsight(pub.ips)}/s
            </>
          )}
        </div>
      )}
    </div>
  );
}
