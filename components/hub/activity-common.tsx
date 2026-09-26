"use client";

import { useEffect, useRef, useState } from "react";

// Ticks down the shared activity cooldown (Wood Gathering / Hunting / Mining
// all set the same `activity.cooldownUntil`) so each card can show its own
// "resting" countdown without re-deriving the math three times.
export function useCooldownRemaining(cooldownUntil: string | null): number {
  const [remainingMs, setRemainingMs] = useState(0);

  useEffect(() => {
    if (!cooldownUntil) {
      setRemainingMs(0);
      return;
    }
    const target = new Date(cooldownUntil).getTime();
    const tick = () => setRemainingMs(Math.max(0, target - Date.now()));
    tick();
    const id = window.setInterval(tick, 250);
    return () => window.clearInterval(id);
  }, [cooldownUntil]);

  return remainingMs;
}

export function CooldownNotice({ remainingMs }: { remainingMs: number }) {
  if (remainingMs <= 0) return null;
  return (
    <p className="mt-1.5 text-[11px] text-white/40">
      Resting for {Math.ceil(remainingMs / 1000)}s before the next activity...
    </p>
  );
}

// Click-and-wait mechanic for every Gathering activity (Wood Gathering,
// Hunting, Mining) — no hold required, just runs the bar
// to completion once started (leaving is fine, it keeps going).
export function LoadingBarButton({
  durationMs,
  disabled,
  idleLabel,
  runningLabel,
  onComplete,
}: {
  durationMs: number;
  disabled: boolean;
  idleLabel: string;
  runningLabel: string;
  onComplete: () => void;
}) {
  const [progress, setProgress] = useState(0);
  const runningRef = useRef(false);
  const startedAtRef = useRef(0);
  const rafRef = useRef<number | null>(null);
  const onCompleteRef = useRef(onComplete);
  onCompleteRef.current = onComplete;

  function tick() {
    if (!runningRef.current) return;
    const elapsed = performance.now() - startedAtRef.current;
    const p = Math.min(1, elapsed / durationMs);
    setProgress(p);
    if (p >= 1) {
      runningRef.current = false;
      setProgress(0);
      onCompleteRef.current();
      return;
    }
    rafRef.current = requestAnimationFrame(tick);
  }

  function start() {
    if (disabled || runningRef.current) return;
    runningRef.current = true;
    startedAtRef.current = performance.now();
    rafRef.current = requestAnimationFrame(tick);
  }

  useEffect(() => {
    return () => {
      if (rafRef.current !== null) cancelAnimationFrame(rafRef.current);
    };
  }, []);

  const running = progress > 0;

  return (
    <button
      type="button"
      disabled={disabled || running}
      onClick={start}
      className="outpost-hold-button"
    >
      <span className="outpost-hold-button-fill" style={{ width: `${progress * 100}%` }} aria-hidden="true" />
      <span className="relative z-10">{running ? runningLabel : idleLabel}</span>
    </button>
  );
}
