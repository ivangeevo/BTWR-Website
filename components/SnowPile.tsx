"use client";

import { useEffect, useRef, useState } from "react";

// Scaled way down in dev so the effect (and its two hidden achievements)
// are actually testable without sitting on the homepage for an hour.
const DEV = process.env.NODE_ENV === "development";
const START_MS = DEV ? 10_000 : 3.1 * 60_000; // piles start forming
const STAGE2_MS = DEV ? 32_000 : 10 * 60_000; // "Snowed In"
const STAGE3_MS = DEV ? 162_000 : 50 * 60_000; // "Eternal Vigil"

// Fixed, not random — a truly random layout would differ between the
// server-rendered HTML and the client's first render on this statically
// exported site, causing a hydration mismatch (see components/Snowfall.tsx
// for the same reasoning). These values are hand-picked to look uneven.
const PILES = [
  { left: "1%", width: "9%", height: 20, delay: 0, opacity: 0.92 },
  { left: "9%", width: "13%", height: 15, delay: 90, opacity: 0.85 },
  { left: "20%", width: "8%", height: 24, delay: 180, opacity: 0.95 },
  { left: "29%", width: "15%", height: 13, delay: 40, opacity: 0.88 },
  { left: "46%", width: "10%", height: 23, delay: 220, opacity: 0.9 },
  { left: "58%", width: "12%", height: 17, delay: 110, opacity: 0.86 },
  { left: "71%", width: "9%", height: 25, delay: 60, opacity: 0.94 },
  { left: "81%", width: "14%", height: 14, delay: 170, opacity: 0.87 },
  { left: "93%", width: "7%", height: 19, delay: 100, opacity: 0.9 },
];

// 0 = nothing yet, 1 = piling started, 2 = 10min mark, 3 = 50min mark.
export default function SnowPile() {
  const [stage, setStage] = useState(0);
  const startedAtRef = useRef<number>(0);
  const dispatchedRef = useRef({ ten: false, fifty: false });

  useEffect(() => {
    startedAtRef.current = Date.now();
    const id = window.setInterval(() => {
      const elapsed = Date.now() - startedAtRef.current;
      if (elapsed >= STAGE3_MS) {
        setStage(3);
        if (!dispatchedRef.current.fifty) {
          dispatchedRef.current.fifty = true;
          window.dispatchEvent(new Event("btwr-secret-snow-50"));
        }
        window.clearInterval(id);
      } else if (elapsed >= STAGE2_MS) {
        setStage(2);
        if (!dispatchedRef.current.ten) {
          dispatchedRef.current.ten = true;
          window.dispatchEvent(new Event("btwr-secret-snow-10"));
        }
      } else if (elapsed >= START_MS) {
        setStage(1);
      }
    }, 1000);
    return () => window.clearInterval(id);
  }, []);

  if (stage === 0) return null;

  const scale = stage >= 3 ? 2.2 : stage >= 2 ? 1.6 : 1;

  return (
    <div
      className="pointer-events-none absolute inset-x-0 bottom-0 -z-10"
      aria-hidden="true"
    >
      {PILES.map((pile, i) => (
        <div
          key={i}
          className="absolute bottom-0 rounded-t-full bg-frost transition-[height] duration-[1400ms] ease-out"
          style={{
            left: pile.left,
            width: pile.width,
            height: pile.height * scale,
            opacity: pile.opacity,
            transitionDelay: `${pile.delay}ms`,
          }}
        />
      ))}
    </div>
  );
}
