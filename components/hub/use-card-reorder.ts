"use client";

import { useCallback, useEffect, useLayoutEffect, useRef, useState } from "react";
import type { ModuleId } from "./module-registry";

// Drag-to-reorder for the Outpost's card grid (the "card-reorder" upgrade).
//
// A card is picked up only by its handle (the small four-arrow move icon in its top-right
// corner), instantly — no press-and-hold, and no way to start a drag from
// the card's own buttons, tiles or grids. While it's held:
// - the card itself follows the pointer every frame (transform set directly,
//   never through React state or a CSS transition, so it can't lag behind);
// - the other cards live-reflow around it: the grid renders a *preview*
//   order with the held card already in its new place, and every other card
//   FLIP-animates from where it visually was to its new cell (measured from
//   its on-screen rect, so a card that's mid-slide when the order changes
//   again carries on smoothly from where it is instead of jumping);
// - its own cell stays behind as a dashed placeholder showing where it'll land.
// Hit-testing uses each cell's final layout (not its animated position) and
// only reacts when the pointer enters a *different* cell, so a slide in
// progress can never make the order flicker back and forth. Dragging near
// the top/bottom of the window scrolls the page. Release commits the preview
// order and the card glides into its cell; Escape puts everything back.
// Arrow keys on a focused handle move a card one place, for keyboards.

/** Key of the trailing "move to the end" drop cell. */
export const END_KEY = "__end";

const LIFT_SCALE = 1.03;
const FLIP_MS = 220;
const SETTLE_MS = 200;
const EASE = "cubic-bezier(0.2, 0, 0, 1)";
const EDGE_PX = 80;
const MAX_SCROLL_PX = 18;
const DRAGGING_CLASS = "outpost-card-dragging";

type Rect = { left: number; top: number; right: number; bottom: number };

type Session = {
  id: ModuleId;
  pointerId: number;
  /** Where on the card it was grabbed, relative to its top-left. */
  grabX: number;
  grabY: number;
  /** Latest pointer position (viewport). */
  x: number;
  y: number;
  /** The card's current translate away from its cell. */
  tx: number;
  ty: number;
  /** Cell the pointer was last over — moves only fire on entering a new one. */
  hoverKey: string | null;
  /** The committed order when the drag began. */
  origin: ModuleId[];
};

type Settle = { id: ModuleId; tx: number; ty: number; cellLeft: number; cellTop: number };

export function arrayMove<T>(list: readonly T[], from: number, to: number): T[] {
  const next = [...list];
  const [item] = next.splice(from, 1);
  next.splice(to, 0, item);
  return next;
}

function translateOf(el: HTMLElement): { x: number; y: number } {
  const t = getComputedStyle(el).transform;
  if (!t || t === "none") return { x: 0, y: 0 };
  const m = new DOMMatrixReadOnly(t);
  return { x: m.m41, y: m.m42 };
}

function cancelAnimations(el: HTMLElement | undefined) {
  el?.getAnimations().forEach((a) => a.cancel());
}

export type CardReorder = ReturnType<typeof useCardReorder>;

export function useCardReorder({
  order,
  commit,
  reducedMotion,
}: {
  order: ModuleId[];
  commit: (from: number, to: number) => void;
  reducedMotion: boolean;
}) {
  const cells = useRef(new Map<string, HTMLElement>());
  const cards = useRef(new Map<string, HTMLElement>());
  const refCallbacks = useRef(new Map<string, (el: HTMLElement | null) => void>());
  const [preview, setPreviewState] = useState<ModuleId[] | null>(null);
  const [draggingId, setDraggingId] = useState<ModuleId | null>(null);
  const [settlingId, setSettlingId] = useState<ModuleId | null>(null);
  const session = useRef<Session | null>(null);
  const previewRef = useRef<ModuleId[] | null>(null);
  const before = useRef<Map<string, DOMRect> | null>(null);
  const layout = useRef(new Map<string, Rect>());
  const settle = useRef<Settle | null>(null);
  const focusAfter = useRef<ModuleId | null>(null);
  const raf = useRef<number | null>(null);
  const detach = useRef<(() => void) | null>(null);
  const orderRef = useRef(order);
  orderRef.current = order;
  const motionRef = useRef(reducedMotion);
  motionRef.current = reducedMotion;

  const displayOrder = preview ?? order;

  // Stable ref callbacks per key, so React doesn't detach/reattach every render.
  const refFor = useCallback((map: "cell" | "card", key: string) => {
    const cacheKey = `${map}:${key}`;
    let fn = refCallbacks.current.get(cacheKey);
    if (!fn) {
      const target = map === "cell" ? cells.current : cards.current;
      fn = (el: HTMLElement | null) => {
        if (el) target.set(key, el);
        else target.delete(key);
      };
      refCallbacks.current.set(cacheKey, fn);
    }
    return fn;
  }, []);
  const cellRef = useCallback((key: string) => refFor("cell", key), [refFor]);
  const cardRef = useCallback((id: ModuleId) => refFor("card", id), [refFor]);

  // Every cell's on-screen rect, right before an order change — the "First" of FLIP.
  function snapshot() {
    const m = new Map<string, DOMRect>();
    for (const [key, el] of cells.current) m.set(key, el.getBoundingClientRect());
    before.current = m;
  }

  // Each cell's final resting rect in page coordinates (its on-screen rect
  // minus any slide still animating), for hit-testing.
  function measure() {
    const next = new Map<string, Rect>();
    for (const [key, el] of cells.current) {
      const r = el.getBoundingClientRect();
      if (r.width === 0 || r.height === 0) continue;
      const t = translateOf(el);
      const left = r.left - t.x + window.scrollX;
      const top = r.top - t.y + window.scrollY;
      next.set(key, { left, top, right: left + r.width, bottom: top + r.height });
    }
    layout.current = next;
  }

  function placeDragged() {
    const s = session.current;
    if (!s) return;
    const cell = cells.current.get(s.id);
    const card = cards.current.get(s.id);
    if (!cell || !card) return;
    const r = cell.getBoundingClientRect();
    s.tx = s.x - s.grabX - r.left;
    s.ty = s.y - s.grabY - r.top;
    card.style.transform = `translate3d(${s.tx}px, ${s.ty}px, 0) scale(${LIFT_SCALE})`;
  }

  function setPreview(next: ModuleId[]) {
    snapshot();
    previewRef.current = next;
    setPreviewState(next);
  }

  function hitTest() {
    const s = session.current;
    if (!s) return;
    const px = s.x + window.scrollX;
    const py = s.y + window.scrollY;
    let hit: string | null = null;
    for (const [key, r] of layout.current) {
      if (key === s.id) continue;
      if (px >= r.left && px <= r.right && py >= r.top && py <= r.bottom) {
        hit = key;
        break;
      }
    }
    if (hit === s.hoverKey) return;
    s.hoverKey = hit;
    if (!hit) return;
    const cur = previewRef.current ?? orderRef.current;
    const from = cur.indexOf(s.id);
    const to = hit === END_KEY ? cur.length - 1 : cur.indexOf(hit as ModuleId);
    if (from < 0 || to < 0 || from === to) return;
    setPreview(arrayMove(cur, from, to));
  }

  function frame() {
    const s = session.current;
    if (!s) return;
    const h = window.innerHeight;
    let v = 0;
    if (s.y < EDGE_PX) v = -MAX_SCROLL_PX * Math.min(1, (EDGE_PX - s.y) / EDGE_PX);
    else if (s.y > h - EDGE_PX) v = MAX_SCROLL_PX * Math.min(1, (s.y - (h - EDGE_PX)) / EDGE_PX);
    if (v !== 0) window.scrollBy(0, Math.round(v));
    placeDragged();
    hitTest();
    raf.current = requestAnimationFrame(frame);
  }

  function begin(id: ModuleId, e: React.PointerEvent<HTMLElement>) {
    if (session.current) return;
    if (e.pointerType === "mouse" && e.button !== 0) return;
    const card = cards.current.get(id);
    const cell = cells.current.get(id);
    if (!card || !cell) return;
    e.preventDefault();
    cancelAnimations(cell);
    cancelAnimations(card);
    const r = card.getBoundingClientRect();
    const grabX = e.clientX - r.left;
    const grabY = e.clientY - r.top;
    session.current = {
      id,
      pointerId: e.pointerId,
      grabX,
      grabY,
      x: e.clientX,
      y: e.clientY,
      tx: 0,
      ty: 0,
      hoverKey: null,
      origin: orderRef.current,
    };
    // Scale around the grab point, so the spot under the cursor stays under it.
    card.style.transformOrigin = `${grabX}px ${grabY}px`;
    previewRef.current = [...orderRef.current];
    setPreviewState(previewRef.current);
    setDraggingId(id);
    setSettlingId(null);
    const root = document.documentElement;
    root.classList.add(DRAGGING_CLASS);
    // Capture on <html>, never on the handle: reordering moves the card's
    // DOM node, and moving a node silently drops any pointer capture it holds.
    const pointerId = e.pointerId;
    try {
      root.setPointerCapture(pointerId);
    } catch {
      // Window listeners below still track the pointer.
    }
    const onMove = (ev: PointerEvent) => {
      const s = session.current;
      if (!s || ev.pointerId !== pointerId) return;
      s.x = ev.clientX;
      s.y = ev.clientY;
    };
    const onUp = (ev: PointerEvent) => {
      if (ev.pointerId === pointerId) endRef.current(true);
    };
    const onCancel = (ev: PointerEvent) => {
      if (ev.pointerId === pointerId) endRef.current(false);
    };
    const onKey = (ev: KeyboardEvent) => {
      if (ev.key === "Escape") {
        ev.preventDefault();
        endRef.current(false);
      }
    };
    const onBlur = () => endRef.current(true);
    const onResize = () => measureRef.current();
    window.addEventListener("pointermove", onMove);
    window.addEventListener("pointerup", onUp);
    window.addEventListener("pointercancel", onCancel);
    window.addEventListener("keydown", onKey);
    window.addEventListener("blur", onBlur);
    window.addEventListener("resize", onResize);
    detach.current = () => {
      window.removeEventListener("pointermove", onMove);
      window.removeEventListener("pointerup", onUp);
      window.removeEventListener("pointercancel", onCancel);
      window.removeEventListener("keydown", onKey);
      window.removeEventListener("blur", onBlur);
      window.removeEventListener("resize", onResize);
      try {
        if (root.hasPointerCapture(pointerId)) root.releasePointerCapture(pointerId);
      } catch {
        // ignore
      }
      root.classList.remove(DRAGGING_CLASS);
    };
    if (raf.current !== null) cancelAnimationFrame(raf.current);
    raf.current = requestAnimationFrame(frame);
  }

  /** Drop (keep = true) or cancel back to where it started. */
  function end(keep: boolean) {
    const s = session.current;
    if (!s) return;
    session.current = null;
    if (raf.current !== null) cancelAnimationFrame(raf.current);
    raf.current = null;
    detach.current?.();
    detach.current = null;
    const cell = cells.current.get(s.id);
    const card = cards.current.get(s.id);
    if (cell && card) {
      const r = cell.getBoundingClientRect();
      settle.current = { id: s.id, tx: s.tx, ty: s.ty, cellLeft: r.left, cellTop: r.top };
      card.style.transform = "";
    }
    snapshot();
    const cur = previewRef.current ?? s.origin;
    previewRef.current = null;
    if (keep) {
      const from = s.origin.indexOf(s.id);
      const to = cur.indexOf(s.id);
      if (from >= 0 && to >= 0 && from !== to) commit(from, to);
    }
    setPreviewState(null);
    setDraggingId(null);
    setSettlingId(s.id);
  }

  function keyMove(id: ModuleId, e: React.KeyboardEvent<HTMLElement>) {
    const dir = e.key === "ArrowUp" || e.key === "ArrowLeft" ? -1 : e.key === "ArrowDown" || e.key === "ArrowRight" ? 1 : 0;
    if (dir === 0 || session.current) return;
    e.preventDefault();
    const list = orderRef.current;
    const visible = list.filter((k) => cells.current.has(k));
    const target = visible[visible.indexOf(id) + dir];
    if (!target) return;
    snapshot();
    focusAfter.current = id;
    commit(list.indexOf(id), list.indexOf(target));
  }

  // The "Last, Invert, Play" of FLIP, after every order change.
  useLayoutEffect(() => {
    const prev = before.current;
    before.current = null;
    const reduced = motionRef.current;
    const st = settle.current;
    settle.current = null;
    // The held (or just-dropped) card moves by its own transform, not a slide.
    const skip = session.current?.id ?? st?.id;
    if (prev) {
      for (const [key, el] of cells.current) {
        if (key === skip) continue;
        const old = prev.get(key);
        if (!old) continue;
        cancelAnimations(el);
        if (reduced) continue;
        const now = el.getBoundingClientRect();
        const dx = old.left - now.left;
        const dy = old.top - now.top;
        if (Math.abs(dx) < 0.5 && Math.abs(dy) < 0.5) continue;
        el.animate([{ transform: `translate(${dx}px, ${dy}px)` }, { transform: "translate(0, 0)" }], {
          duration: FLIP_MS,
          easing: EASE,
        });
      }
    }
    if (st) {
      const cell = cells.current.get(st.id);
      const card = cards.current.get(st.id);
      const done = () => {
        if (card) card.style.transformOrigin = "";
        setSettlingId((cur) => (cur === st.id ? null : cur));
      };
      if (cell && card && !reduced) {
        const r = cell.getBoundingClientRect();
        const fx = st.tx + st.cellLeft - r.left;
        const fy = st.ty + st.cellTop - r.top;
        const a = card.animate(
          [{ transform: `translate3d(${fx}px, ${fy}px, 0) scale(${LIFT_SCALE})` }, { transform: "none" }],
          { duration: SETTLE_MS, easing: EASE }
        );
        a.onfinish = done;
        a.oncancel = done;
      } else {
        done();
      }
    }
    if (session.current) {
      measure();
      placeDragged();
    }
    const f = focusAfter.current;
    if (f) {
      focusAfter.current = null;
      const handle = document.querySelector<HTMLElement>(`[data-card-handle="${f}"]`);
      if (handle && document.activeElement !== handle) handle.focus({ preventScroll: true });
    }
  }, [displayOrder]);

  // Window listeners reach the latest end/measure (defined fresh each render).
  const endRef = useRef(end);
  endRef.current = end;
  const measureRef = useRef(measure);
  measureRef.current = measure;

  useEffect(
    () => () => {
      if (raf.current !== null) cancelAnimationFrame(raf.current);
      detach.current?.();
    },
    []
  );

  const handleProps = (id: ModuleId) => ({
    "data-card-handle": id,
    onPointerDown: (e: React.PointerEvent<HTMLElement>) => begin(id, e),
    onKeyDown: (e: React.KeyboardEvent<HTMLElement>) => keyMove(id, e),
  });

  return { displayOrder, draggingId, settlingId, cellRef, cardRef, handleProps };
}
