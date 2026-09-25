"use client";

import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { formatInsight } from "../../economy";
import { useEngine } from "../EngineProvider";

// Engine-voice toasts (pops, Eurekas, decoded blueprints), stacked above the
// Outpost's own achievement toasts.
export function EngineToasts() {
  const { toasts } = useEngine();
  if (toasts.length === 0) return null;
  return (
    <div className="engine-toasts" aria-live="polite">
      {toasts.map((t) => (
        <div key={t.id} className={`hub-toast engine-toast engine-toast-${t.tone}`}>
          <span aria-hidden="true">{"\u{2699}\u{FE0F}"}</span> {t.text}
        </div>
      ))}
    </div>
  );
}

function duration(ms: number): string {
  const min = Math.round(ms / 60_000);
  if (min < 60) return `${min} min`;
  const h = Math.floor(min / 60);
  if (h < 48) return `${h} h ${min % 60} min`;
  return `${Math.floor(h / 24)} days`;
}

// "While you were away…" — shown once after coming back to thoughts the
// Engine had on its own.
export function WhileAwaySummary() {
  const { e, dismissAway } = useEngine();
  const away = e.lastAway;
  if (!away || away.gained <= 0) return null;
  const ms = new Date(away.to).getTime() - new Date(away.from).getTime();
  return (
    <div className="engine-away" role="status" data-no-drag>
      <p className="text-xs font-bold uppercase tracking-wider text-[var(--outpost-accent)]">While you were away</p>
      <p className="mt-1 text-sm text-white">
        The Engine kept thinking for {duration(ms)}: <span className="font-semibold">+{formatInsight(away.gained)} insight</span>.
      </p>
      {away.capped && (
        <p className="mt-0.5 text-[0.7rem] text-slate-400">Its Ledger Drum filled up before you came back — a bigger drum keeps more.</p>
      )}
      {away.neglect < 1 && (
        <p className="mt-0.5 text-[0.7rem] text-slate-400">The gears got dusty; it thought a little slower. Any interaction wakes it up.</p>
      )}
      <button type="button" onClick={dismissAway} className="mt-1.5 text-[0.7rem] font-semibold text-[var(--outpost-accent)] hover:underline">
        Thanks
      </button>
    </div>
  );
}

// Eureka sparks — a glowing button floated over whichever Outpost card the
// Engine picked. Portaled to <body> with fixed positioning so it can sit on
// any card without living inside it.
export function EurekaLayer() {
  const { e, catchEureka } = useEngine();
  const active = e.eureka.active;
  const [mounted, setMounted] = useState(false);
  const btnRef = useRef<HTMLButtonElement>(null);
  useEffect(() => setMounted(true), []);

  // Tracks the card every frame by writing the position straight to the
  // button — no React state, so the spark follows scrolling for free.
  useEffect(() => {
    if (!active || !mounted) return;
    let raf = 0;
    const seed = active.id.split("").reduce((a, c) => a + c.charCodeAt(0), 0);
    const fxr = 0.2 + (seed % 60) / 100;
    const fyr = 0.25 + ((seed >> 3) % 50) / 100;
    const place = () => {
      const btn = btnRef.current;
      const el = document.querySelector<HTMLElement>(`[data-module-id="${active.cardId}"]`);
      if (btn) {
        if (el) {
          const r = el.getBoundingClientRect();
          btn.style.top = `${r.top + r.height * fyr}px`;
          btn.style.left = `${r.left + r.width * fxr}px`;
          btn.style.visibility = "visible";
        } else {
          btn.style.visibility = "hidden";
        }
      }
      raf = requestAnimationFrame(place);
    };
    place();
    return () => cancelAnimationFrame(raf);
  }, [active, mounted]);

  if (!mounted || !active) return null;
  return createPortal(
    <button
      ref={btnRef}
      type="button"
      onClick={catchEureka}
      className="engine-spark"
      style={{ visibility: "hidden" }}
      aria-label="Eureka! Catch the spark"
      title="Eureka!"
    >
      <span aria-hidden="true">{"\u{1F4A1}"}</span>
    </button>,
    document.body
  );
}
