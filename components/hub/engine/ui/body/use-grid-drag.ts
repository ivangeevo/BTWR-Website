"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { PointerEvent as ReactPointerEvent } from "react";

// Left-click drag & drop for a gear grid. Press on any square of a part and
// move: the part lifts (the caller draws a ghost where it was) and snaps to
// the square under the pointer, keeping the square you grabbed it by under
// the pointer. Let go on a square it fits to move it; anywhere else (or
// Escape) snaps it back. A press that never moves stays a plain click.

const THRESHOLD_PX = 5;

export type GridDrag = {
  /** Hub cell of the part being dragged. */
  from: number;
  /** Where its hub would land, or null when that's off the board. */
  to: number | null;
  /** Whether it fits at `to`. */
  valid: boolean;
};

type Pending = { from: number; grabDx: number; grabDy: number; startX: number; startY: number; dragging: boolean };

export function useGridDrag(opts: {
  w: number;
  h: number;
  /** The hub cell of the part covering square `i` that may be dragged, or -1. */
  hubAt: (i: number) => number;
  canDrop: (from: number, to: number) => boolean;
  onDrop: (from: number, to: number) => void;
}) {
  const [drag, setDrag] = useState<GridDrag | null>(null);
  const optsRef = useRef(opts);
  optsRef.current = opts;
  const pending = useRef<Pending | null>(null);
  const latest = useRef<GridDrag | null>(null);
  const swallowClick = useRef(false);
  const detach = useRef<(() => void) | null>(null);

  const end = useCallback(() => {
    pending.current = null;
    latest.current = null;
    detach.current?.();
    detach.current = null;
    document.body.style.removeProperty("cursor");
    setDrag(null);
  }, []);

  useEffect(() => end, [end]);

  const onPointerDown = useCallback(
    (ev: ReactPointerEvent, i: number) => {
      if (ev.button !== 0) return;
      const { w, hubAt } = optsRef.current;
      const from = hubAt(i);
      if (from < 0) return;
      detach.current?.();
      pending.current = {
        from,
        grabDx: (i % w) - (from % w),
        grabDy: Math.floor(i / w) - Math.floor(from / w),
        startX: ev.clientX,
        startY: ev.clientY,
        dragging: false,
      };

      const move = (e: PointerEvent) => {
        const p = pending.current;
        if (!p) return;
        if (!p.dragging) {
          if (Math.hypot(e.clientX - p.startX, e.clientY - p.startY) < THRESHOLD_PX) return;
          p.dragging = true;
          document.body.style.cursor = "grabbing";
        }
        const { w: gw, h: gh, canDrop } = optsRef.current;
        const el = document.elementFromPoint(e.clientX, e.clientY)?.closest<HTMLElement>("[data-cell]");
        const cell = el ? Number(el.dataset.cell) : NaN;
        let to: number | null = null;
        if (Number.isFinite(cell)) {
          const x = (cell % gw) - p.grabDx;
          const y = Math.floor(cell / gw) - p.grabDy;
          if (x >= 0 && y >= 0 && x < gw && y < gh) to = y * gw + x;
        }
        const valid = to !== null && to !== p.from && canDrop(p.from, to);
        const prev = latest.current;
        if (prev && prev.to === to && prev.valid === valid) return;
        latest.current = { from: p.from, to, valid };
        setDrag(latest.current);
      };
      const up = () => {
        const p = pending.current;
        const cur = latest.current;
        if (p?.dragging) {
          // The click that follows this release isn't a tap.
          swallowClick.current = true;
          window.setTimeout(() => (swallowClick.current = false), 0);
        }
        end();
        if (p?.dragging && cur?.valid && cur.to !== null) optsRef.current.onDrop(cur.from, cur.to);
      };
      const key = (e: KeyboardEvent) => {
        if (e.key === "Escape" && pending.current?.dragging) end();
      };
      window.addEventListener("pointermove", move);
      window.addEventListener("pointerup", up);
      window.addEventListener("pointercancel", end);
      window.addEventListener("keydown", key);
      detach.current = () => {
        window.removeEventListener("pointermove", move);
        window.removeEventListener("pointerup", up);
        window.removeEventListener("pointercancel", end);
        window.removeEventListener("keydown", key);
      };
    },
    [end]
  );

  /** True (once) when the click being handled is the tail of a drag, not a tap. */
  const consumeClick = useCallback(() => {
    if (!swallowClick.current) return false;
    swallowClick.current = false;
    return true;
  }, []);

  return { drag, onPointerDown, consumeClick };
}
