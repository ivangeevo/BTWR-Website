"use client";

import { useEffect, useRef, useState } from "react";
import { allFound, STIR_WHISPERS, STIR_WORD, stirringFound } from "../../content/stirring";
import { useEngine } from "../EngineProvider";
import { useReducedMotion } from "../use-reduced-motion";

type Letter = (typeof STIR_WORD)[number];
type Pos = { x: number; y: number };

// Where each letter drifts before it's found, and after (it moves on once
// the lantern has caught it). Percent of the field.
const DARK_SPOT: Record<Letter, Pos> = {
  P: { x: 78, y: 70 },
  O: { x: 22, y: 28 },
  N: { x: 64, y: 22 },
  D: { x: 14, y: 74 },
  E: { x: 46, y: 56 },
  R: { x: 88, y: 34 },
};
const LIT_SPOT: Record<Letter, Pos> = {
  P: { x: 30, y: 62 },
  O: { x: 70, y: 40 },
  N: { x: 20, y: 40 },
  D: { x: 58, y: 72 },
  E: { x: 82, y: 58 },
  R: { x: 42, y: 26 },
};
// With all six found they hang still in a loose ring, in no helpful order.
const HANG_SPOT: Record<Letter, Pos> = {
  R: { x: 50, y: 20 },
  D: { x: 74, y: 34 },
  P: { x: 74, y: 64 },
  E: { x: 50, y: 78 },
  O: { x: 26, y: 64 },
  N: { x: 26, y: 34 },
};
// Spelled: side by side in the middle.
const WORD_SPOT: Record<Letter, Pos> = Object.fromEntries(
  STIR_WORD.map((l, i) => [l, { x: 50 + (i - 2.5) * 9, y: 48 }])
) as Record<Letter, Pos>;

// Each letter drifts at its own pace (seconds), so they never move as one.
const DRIFT_SEC: Record<Letter, number> = { P: 13, O: 17, N: 11, D: 19, E: 15, R: 12 };

const SNAP_MS = 650;
const WHISPER_MS = 5600;
// Every few broken chains it half-says its name, in the whispers' own voice.
const HINT_EVERY = 3;
const NAME_HINT = "…p·nd·r…";

// Stage 0 (content/stirring.ts): a dark field, a lantern that follows the
// mouse (or keyboard focus), and six letters only the lantern shows. With
// all six found, linking them in order spells its name and it wakes: the
// dark lifts, and the card fades up into Day One (the card's own
// background transitions, see .engine-card in globals.css).
export default function Stirring() {
  const { e, stirFind, stirWake } = useEngine();
  const reduced = useReducedMotion();
  const fieldRef = useRef<HTMLDivElement>(null);
  const [lantern, setLantern] = useState<{ x: number; y: number } | null>(null);
  const [chain, setChain] = useState<Letter[]>([]);
  const [snap, setSnap] = useState(false);
  const [spelled, setSpelled] = useState(false);
  const [whisper, setWhisper] = useState<{ text: string; key: number } | null>(null);
  const [hum, setHum] = useState<Letter | null>(null);
  const [snaps, setSnaps] = useState(0);
  const timers = useRef<number[]>([]);

  useEffect(() => {
    const list = timers.current;
    return () => list.forEach((t) => window.clearTimeout(t));
  }, []);

  function later(fn: () => void, ms: number) {
    timers.current.push(window.setTimeout(fn, ms));
  }

  const found = stirringFound(e);
  const still = allFound(e);

  function moveLantern(clientX: number, clientY: number) {
    const r = fieldRef.current?.getBoundingClientRect();
    if (r) setLantern({ x: clientX - r.left, y: clientY - r.top });
  }

  function whisperOut(text: string) {
    const key = Date.now();
    setWhisper({ text, key });
    later(() => setWhisper((cur) => (cur?.key === key ? null : cur)), WHISPER_MS);
  }

  function humOn(l: Letter) {
    setHum(l);
    later(() => setHum((h) => (h === l ? null : h)), 900);
  }

  function find(l: Letter) {
    if (found.includes(l)) return;
    const w = STIR_WHISPERS[found.length];
    stirFind(l);
    humOn(l);
    if (w) whisperOut(w.text);
  }

  function link(l: Letter) {
    if (spelled || snap || chain.includes(l)) return;
    if (l !== STIR_WORD[chain.length]) {
      setSnap(true);
      setChain([]);
      later(() => setSnap(false), SNAP_MS);
      const n = snaps + 1;
      setSnaps(n);
      if (n % HINT_EVERY === 0) whisperOut(NAME_HINT);
      return;
    }
    humOn(l);
    const next = [...chain, l];
    setChain(next);
    if (next.length === STIR_WORD.length) {
      setSpelled(true);
      later(() => stirWake(), reduced ? 700 : 2800);
    }
  }

  const spotOf = (l: Letter): Pos => (spelled ? WORD_SPOT[l] : still ? HANG_SPOT[l] : found.includes(l) ? LIT_SPOT[l] : DARK_SPOT[l]);
  const fieldStyle = {
    "--lx": lantern ? `${lantern.x}px` : "-999px",
    "--ly": lantern ? `${lantern.y}px` : "-999px",
  } as React.CSSProperties;

  const letterStyle = (l: Letter): React.CSSProperties =>
    ({
      left: `${spotOf(l).x}%`,
      top: `${spotOf(l).y}%`,
      "--drift": `${DRIFT_SEC[l]}s`,
      "--drift-delay": `-${DRIFT_SEC[l] / 3}s`,
    }) as React.CSSProperties;

  return (
    <div
      ref={fieldRef}
      className={`engine-stir-field ${still ? "is-still" : ""} ${snap ? "is-snap" : ""} ${spelled ? "is-dawn" : ""} ${reduced ? "is-reduced" : ""}`}
      style={fieldStyle}
      onPointerMove={(ev) => moveLantern(ev.clientX, ev.clientY)}
      onPointerLeave={() => setLantern(null)}
      data-no-drag
    >
      {/* The lantern is the only pointer here (the cursor is hidden), so it stays until the name is spelled. */}
      {!spelled && <div className="engine-stir-lantern" aria-hidden="true" />}

      {/* Unfound letters: only visible through the lantern (a mask on this layer). */}
      {!still && (
        <div className="engine-stir-dark">
          {STIR_WORD.filter((l) => !found.includes(l)).map((l) => (
            <button
              key={l}
              type="button"
              className="engine-stir-letter"
              style={letterStyle(l)}
              aria-label="a faint shape"
              onClick={() => find(l)}
              onFocus={(ev) => {
                const b = ev.currentTarget.getBoundingClientRect();
                moveLantern(b.left + b.width / 2, b.top + b.height / 2);
              }}
            >
              {l}
            </button>
          ))}
        </div>
      )}

      {/* The thread of light between linked letters. */}
      {still && chain.length > 1 && !spelled && (
        <svg className="engine-stir-thread" viewBox="0 0 100 100" preserveAspectRatio="none" aria-hidden="true">
          {chain.slice(1).map((l, i) => {
            const a = HANG_SPOT[chain[i]];
            const b = HANG_SPOT[l];
            return <line key={l} x1={a.x} y1={a.y} x2={b.x} y2={b.y} vectorEffect="non-scaling-stroke" />;
          })}
        </svg>
      )}

      {/* Found letters: faintly lit wherever the lantern is. */}
      {STIR_WORD.filter((l) => found.includes(l)).map((l) => (
        <button
          key={l}
          type="button"
          className={`engine-stir-letter is-lit ${still ? "is-hung" : ""} ${chain.includes(l) || spelled ? "is-linked" : ""} ${hum === l ? "is-humming" : ""}`}
          style={letterStyle(l)}
          aria-label={`a letter: ${l}`}
          aria-pressed={still ? chain.includes(l) : undefined}
          disabled={!still || spelled}
          onClick={() => link(l)}
        >
          {l}
        </button>
      ))}

      {whisper && (
        <p key={whisper.key} className="engine-stir-whisper" role="status">
          {whisper.text}
        </p>
      )}
    </div>
  );
}
