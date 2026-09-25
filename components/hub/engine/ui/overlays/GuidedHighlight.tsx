"use client";

import { useEffect, useLayoutEffect, useState } from "react";
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
export default function GuidedHighlight({ root }: { root: React.RefObject<HTMLElement> }) {
  const { e, ceremony, markTutorialSeen, workshopOpen } = useEngine();
  const tut = ceremony ? null : pendingTutorial(e);
  const [step, setStep] = useState(0);
  const [rect, setRect] = useState<Outline | null>(null);
  // Holds off while a just-decoded cipher page is playing out (CipherPanel),
  // so the next lesson doesn't land on top of the moment it unlocked.
  const [waiting, setWaiting] = useState(false);

  useEffect(() => setStep(0), [tut?.id]);

  const target = tut?.steps[step]?.target;
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
  }, [target, root, workshopOpen, e.stage]);

  if (!tut || waiting) return null;
  const s = tut.steps[step];
  const last = step >= tut.steps.length - 1;

  return (
    <>
      {rect && (
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
          <button type="button" onClick={() => markTutorialSeen(tut.id)} className="text-[0.7rem] text-slate-400 hover:text-white">
            Skip
          </button>
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
    </>
  );
}
