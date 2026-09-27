"use client";

import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { pendingTutorial } from "../../content/tutorials";
import { useEngine } from "../EngineProvider";

const useIsoLayout = typeof window !== "undefined" ? useLayoutEffect : useEffect;

type Outline = { top: number; left: number; width: number; height: number; radius: string };

// Whether an element draws an edge of its own (a border or a background),
// rather than being an invisible wrapper around other things.
function drawsBox(el: HTMLElement): boolean {
  const cs = getComputedStyle(el);
  const border = parseFloat(cs.borderTopWidth) > 0 && cs.borderTopStyle !== "none";
  // Computed colours come back as rgb(...) or rgba(..., a); only a = 0 is see-through.
  const alpha = cs.backgroundColor.startsWith("rgba") ? parseFloat(cs.backgroundColor.split(",")[3]) : 1;
  const bg = cs.backgroundImage !== "none" || (cs.backgroundColor !== "transparent" && alpha > 0);
  return border || bg;
}

// The visible outline of a tutorial target, in viewport coordinates, with
// its own corner radius, so the ring traces its edge exactly. A target that
// draws a box (the answer field, a button) is outlined as it is; an
// invisible wrapper (the row of word tiles) is shrunk to what's inside it,
// since its own box can stretch well past the things you actually see.
function outlineOf(el: HTMLElement): Outline {
  const box = (r: DOMRect, radius: string) => ({ top: r.top, left: r.left, width: r.width, height: r.height, radius });
  if (drawsBox(el)) return box(el.getBoundingClientRect(), getComputedStyle(el).borderRadius);
  const kids = [...el.children].filter((c): c is HTMLElement => c instanceof HTMLElement).map((c) => ({ c, r: c.getBoundingClientRect() })).filter(({ r }) => r.width > 0 && r.height > 0);
  if (kids.length === 0) return box(el.getBoundingClientRect(), getComputedStyle(el).borderRadius);
  const top = Math.min(...kids.map((k) => k.r.top));
  const left = Math.min(...kids.map((k) => k.r.left));
  const right = Math.max(...kids.map((k) => k.r.right));
  const bottom = Math.max(...kids.map((k) => k.r.bottom));
  return { top, left, width: right - left, height: bottom - top, radius: getComputedStyle(kids[0].c).borderRadius };
}

// The Engine teaching a new mechanic in its own voice — a ring around the
// thing it's talking about and a speech bubble below it. One tutorial at a
// time, 1–3 steps each, skippable; the Logbook can replay any of them.
// "Disable tutorials" switches them all off (after a confirm).
export default function GuidedHighlight({ root }: { root: React.RefObject<HTMLElement> }) {
  const { e, ceremony, markTutorialSeen, setTutorialsOff } = useEngine();
  const tut = ceremony ? null : pendingTutorial(e);
  const [step, setStep] = useState(0);
  // "Disable tutorials" asks first; turning them back on lives in OutpostSettings.tsx.
  const [confirmOff, setConfirmOff] = useState(false);
  const cancelRef = useRef<HTMLButtonElement>(null);
  useEffect(() => {
    if (confirmOff) cancelRef.current?.focus();
  }, [confirmOff]);
  const [rect, setRect] = useState<Outline | null>(null);
  // Holds off while a just-decoded cipher page is playing out (CipherPanel),
  // so the next lesson doesn't land on top of the moment it unlocked.
  const [waiting, setWaiting] = useState(false);
  // A ring on a tab looks just like the tab's own "selected" outline, so it
  // steps aside once that tab is the open one — the bubble stays put.
  const [ringOn, setRingOn] = useState(true);

  // Back to step 0 when the tutorial changes, during render rather than in an
  // effect: an effect would let one render index the new (possibly shorter)
  // tutorial with the old step, and crash on steps[step] being undefined.
  const [stepFor, setStepFor] = useState(tut?.id);
  if (stepFor !== tut?.id) {
    setStepFor(tut?.id);
    setStep(0);
  }

  const target = tut?.steps[step]?.target;
  const hasNext = !!tut && step < tut.steps.length - 1;

  // Clicking the tab a step points at is the step done: on to the next one.
  // (On the document, since root.current can still be unattached here — see below.)
  useEffect(() => {
    if (!target || !hasNext) return;
    const onClick = (ev: MouseEvent) => {
      const hit = (ev.target as Element | null)?.closest(`[data-engine-target="${target}"]`);
      if (hit && root.current?.contains(hit) && hit.getAttribute("role") === "tab") setStep((s) => s + 1);
    };
    document.addEventListener("click", onClick);
    return () => document.removeEventListener("click", onClick);
  }, [root, target, hasNext]);

  useIsoLayout(() => {
    // No bailing out on a missing root.current: this is a child of the card
    // that owns the ref, and on first mount its layout effects run before
    // that ref is attached — the interval below picks the card up once it is.
    if (!target) {
      setRect(null);
      return;
    }
    const measure = () => {
      const host = root.current;
      setWaiting(!!host?.querySelector(".cipher-decoded"));
      const el = host?.querySelector<HTMLElement>(`[data-engine-target="${target}"]`);
      if (!host || !el) {
        setRect(null);
        return;
      }
      // Relative to the card's padding box, which is what the ring's
      // absolute position is measured from (hence clientTop/clientLeft).
      setRingOn(!(el.getAttribute("role") === "tab" && el.getAttribute("aria-selected") === "true"));
      const h = host.getBoundingClientRect();
      const o = outlineOf(el);
      setRect({ ...o, top: o.top - h.top - host.clientTop, left: o.left - h.left - host.clientLeft });
    };
    measure();
    const id = window.setInterval(measure, 500);
    window.addEventListener("resize", measure);
    // Straight away when the card's contents change, too (a decoded page appearing).
    const mo = root.current ? new MutationObserver(measure) : null;
    if (root.current) mo?.observe(root.current, { childList: true, subtree: true });
    return () => {
      window.clearInterval(id);
      window.removeEventListener("resize", measure);
      mo?.disconnect();
    };
  }, [target, root, e.stage]);

  const s = tut?.steps[step];
  if (!tut || !s || waiting) return null;
  const last = step >= tut.steps.length - 1;

  return (
    <>
      {rect && ringOn && (
        <div
          className="engine-guide-ring"
          style={{ top: rect.top, left: rect.left, width: rect.width, height: rect.height, borderRadius: rect.radius }}
          aria-hidden="true"
        />
      )}
      <div
        className="engine-guide-bubble"
        style={rect ? { top: rect.top + rect.height + 10, left: 12, right: 12 } : { bottom: 12, left: 12, right: 12 }}
        role="status"
        data-no-drag
      >
        <p className="text-xs text-white">{s.line}</p>
        <div className="mt-1.5 flex items-center justify-between gap-2">
          <div className="flex items-center gap-3">
            <button type="button" onClick={() => markTutorialSeen(tut.id)} className="text-[0.7rem] text-slate-400 hover:text-white">
              Skip
            </button>
            <button
              type="button"
              onClick={() => setConfirmOff(true)}
              className="text-[0.7rem] text-rose-400 hover:text-rose-300 hover:underline"
            >
              Disable tutorials
            </button>
          </div>
          <span className="text-[0.6rem] text-white/30">
            {step + 1}/{tut.steps.length}
          </span>
          <button
            type="button"
            onClick={() => (last ? markTutorialSeen(tut.id) : setStep(step + 1))}
            className="text-[0.7rem] font-semibold text-[var(--outpost-accent)] hover:underline"
          >
            {last ? "Got it" : "Next"}
          </button>
        </div>
      </div>
      {confirmOff && (
        <div
          className="absolute inset-0 z-[22] flex items-center justify-center bg-black/60 p-4"
          role="alertdialog"
          aria-modal="true"
          aria-labelledby="engine-tutorials-off-title"
          aria-describedby="engine-tutorials-off-desc"
          data-no-drag
          onKeyDown={(ev) => ev.key === "Escape" && setConfirmOff(false)}
        >
          <div className="outpost-materialize w-full max-w-xs rounded-lg border border-rose-400/40 bg-[rgba(24,17,11,0.98)] p-3 shadow-xl">
            <p id="engine-tutorials-off-title" className="text-sm font-semibold text-white">
              Disable tutorials?
            </p>
            <p id="engine-tutorials-off-desc" className="mt-1 text-xs text-slate-300">
              The Engine won&rsquo;t pop up to explain new things anymore. You can turn them back on any time in
              the Outpost&rsquo;s settings menu ({"⚙️"}).
            </p>
            <div className="mt-3 flex justify-end gap-2">
              <button
                ref={cancelRef}
                type="button"
                onClick={() => setConfirmOff(false)}
                className="rounded-md border border-white/15 px-2.5 py-1 text-xs text-slate-300 hover:border-white/40 hover:text-white"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => {
                  setConfirmOff(false);
                  setTutorialsOff(true);
                }}
                className="rounded-md border border-rose-400/60 bg-rose-500/15 px-2.5 py-1 text-xs font-semibold text-rose-300 hover:bg-rose-500/25"
              >
                Disable
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
