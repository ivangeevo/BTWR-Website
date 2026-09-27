"use client";

import { useEffect, useRef, useState } from "react";

// Ticks down to a stored "until" timestamp — Gathering's shared rest timer,
// a trek home — without each card re-deriving the math.
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

// Click-and-wait mechanic for every Gathering activity and the Campfire's
// cooking — no hold required, just runs the bar to completion once started
// (leaving is fine, it keeps going). To cancel a run partway, remount it
// (change its `key`), as the Campfire does when the fire leaves Medium.
// onRunningChange lets a folded Camp rail header show that a run is going.
export function LoadingBarButton({
  durationMs,
  disabled,
  idleLabel,
  runningLabel,
  onComplete,
  onRunningChange,
  className = "",
}: {
  durationMs: number;
  disabled: boolean;
  idleLabel: string;
  /** Static text, or built from the time left so the button can count down. */
  runningLabel: string | ((remainingMs: number) => string);
  onComplete: () => void;
  onRunningChange?: (running: boolean) => void;
  className?: string;
}) {
  const [progress, setProgress] = useState(0);
  const runningRef = useRef(false);
  const startedAtRef = useRef(0);
  const rafRef = useRef<number | null>(null);
  const onCompleteRef = useRef(onComplete);
  onCompleteRef.current = onComplete;
  const onRunningRef = useRef(onRunningChange);
  onRunningRef.current = onRunningChange;

  function tick() {
    if (!runningRef.current) return;
    const elapsed = performance.now() - startedAtRef.current;
    const p = Math.min(1, elapsed / durationMs);
    setProgress(p);
    if (p >= 1) {
      runningRef.current = false;
      setProgress(0);
      onRunningRef.current?.(false);
      onCompleteRef.current();
      return;
    }
    rafRef.current = requestAnimationFrame(tick);
  }

  function start() {
    if (disabled || runningRef.current) return;
    runningRef.current = true;
    startedAtRef.current = performance.now();
    onRunningRef.current?.(true);
    rafRef.current = requestAnimationFrame(tick);
  }

  useEffect(() => {
    return () => {
      if (rafRef.current !== null) cancelAnimationFrame(rafRef.current);
      // Unmounted mid-run (a cancelled cook, a switched Gathering tab).
      if (runningRef.current) onRunningRef.current?.(false);
    };
  }, []);

  const running = progress > 0;

  return (
    <button
      type="button"
      disabled={disabled || running}
      onClick={start}
      className={`outpost-hold-button ${className}`}
    >
      <span className="outpost-hold-button-fill" style={{ width: `${progress * 100}%` }} aria-hidden="true" />
      <span className="relative z-10">
        {!running
          ? idleLabel
          : typeof runningLabel === "function"
            ? runningLabel(durationMs * (1 - progress))
            : runningLabel}
      </span>
    </button>
  );
}
