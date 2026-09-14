"use client";

import { useEffect, useRef } from "react";

// Gear cursor trail — small gear.png icons kick off and scatter as the
// cursor moves, spinning through 16 discrete frames the way BTW's
// gearbox blocks step through their active-spin texture. Rendered once
// in the root layout as a fixed full-viewport overlay, so it follows the
// cursor on every page, not just one section. Spawn-throttled and capped
// so it stays cheap regardless of how fast the mouse moves.
const SPAWN_INTERVAL_MS = 45;
const MAX_PARTICLES = 24;
const PARTICLE_LIFETIME_MS = 900;

export default function CursorDust() {
  const layerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const layer = layerRef.current;
    if (!layer) return;

    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      return;
    }

    let lastSpawn = 0;
    const active: HTMLSpanElement[] = [];

    function spawn(x: number, y: number) {
      const mote = document.createElement("span");
      mote.className = "gear-mote";

      const angle = Math.random() * Math.PI * 2;
      const distance = 14 + Math.random() * 22;
      const dx = Math.cos(angle) * distance;
      const dy = Math.sin(angle) * distance + 10;
      const size = 12 + Math.random() * 6;

      mote.style.left = `${x}px`;
      mote.style.top = `${y}px`;
      mote.style.width = `${size}px`;
      mote.style.height = `${size}px`;
      mote.style.setProperty("--dx", `${dx}px`);
      mote.style.setProperty("--dy", `${dy}px`);

      const icon = document.createElement("span");
      icon.className = "gear-mote-icon";
      mote.appendChild(icon);

      layer!.appendChild(mote);
      active.push(mote);

      if (active.length > MAX_PARTICLES) {
        active.shift()?.remove();
      }

      window.setTimeout(() => {
        mote.remove();
        const idx = active.indexOf(mote);
        if (idx !== -1) active.splice(idx, 1);
      }, PARTICLE_LIFETIME_MS);
    }

    function handleMove(e: MouseEvent) {
      const now = performance.now();
      if (now - lastSpawn < SPAWN_INTERVAL_MS) return;
      lastSpawn = now;
      spawn(e.clientX, e.clientY);
    }

    window.addEventListener("mousemove", handleMove);
    return () => {
      window.removeEventListener("mousemove", handleMove);
      active.forEach((mote) => mote.remove());
      active.length = 0;
    };
  }, []);

  return <div ref={layerRef} className="dust-layer" aria-hidden="true" />;
}
