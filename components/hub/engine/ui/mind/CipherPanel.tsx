"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { cipherPlainText, cipherTitle, nextCipherTarget, puzzleFor } from "../../cipher-flow";
import { ALPHABET, decodeMap, renderAttempt } from "../../ciphers";
import { BLUEPRINTS_BY_ID, KEY_FRAGMENTS } from "../../content/blueprints";
import { formatInsight, stageFlat } from "../../economy";
import { PART_DEFS } from "../../grid/parts";
import { useEngine } from "../EngineProvider";
import { useLive } from "../live-store";
import { useReducedMotion } from "../use-reduced-motion";

// The moment a page is decoded, the Engine moves straight on (the provider
// clears ciphers.current), so the panel keeps a snapshot of the page it was
// showing and plays it out: the sentence lights up letter by letter, left
// to right, the page glows with what it unlocked, holds for a few seconds,
// then fades — and only then does the next page (if any) take its place.
const LETTER_STEP_MS = 45;
const SWEEP_MAX_MS = 1600;
const LETTER_POP_MS = 520;
const HOLD_MS = 3200;
const LEAVE_MS = 450;

type Solved = { id: string; title: string; cipher: string; plain: string; unlocked: string };

function DecodedPage({ page, onDone }: { page: Solved; onDone: () => void }) {
  const reduced = useReducedMotion();
  const [leaving, setLeaving] = useState(false);
  const letters = page.plain.replace(/ /g, "").length;
  const step = reduced ? 0 : Math.min(LETTER_STEP_MS, SWEEP_MAX_MS / Math.max(1, letters));
  const sweepMs = reduced ? 0 : step * letters + LETTER_POP_MS;
  const doneRef = useRef(onDone);
  doneRef.current = onDone;

  useEffect(() => {
    const leave = window.setTimeout(() => setLeaving(true), sweepMs + HOLD_MS);
    const done = window.setTimeout(() => doneRef.current(), sweepMs + HOLD_MS + LEAVE_MS);
    return () => {
      window.clearTimeout(leave);
      window.clearTimeout(done);
    };
  }, [sweepMs]);

  // Letters are numbered in reading order across the whole sentence, so the
  // light runs left to right and on down through every wrapped line.
  let n = 0;
  const cipherWords = page.cipher.split(" ");
  const plainWords = page.plain.split(" ");
  return (
    <div
      data-engine-target="cipher"
      data-no-drag
      role="status"
      aria-label={`Decoded: ${page.plain}`}
      className={`cipher-decoded ${leaving ? "cipher-decoded-leaving" : ""}`}
      style={{ "--cipher-sweep": `${sweepMs}ms` } as React.CSSProperties}
    >
      <div className="flex items-baseline justify-between gap-2">
        <p className="text-xs font-bold uppercase tracking-wider text-[var(--outpost-accent)]">{page.title}</p>
        <span className="cipher-decoded-tag">Decoded</span>
      </div>
      <div className="cipher-decoded-board mt-2 flex flex-wrap gap-x-3 gap-y-2 rounded-lg border p-2 font-mono">
        {plainWords.map((word, wi) => (
          <div key={wi} className="flex gap-0.5">
            {word.split("").map((p, ci) => {
              const c = cipherWords[wi]?.[ci] ?? "";
              const delay = n++ * step;
              return (
                <span
                  key={ci}
                  className="cipher-decoded-cell flex w-[1.35rem] flex-col items-center rounded text-center leading-tight"
                  style={{ animationDelay: `${delay}ms` }}
                >
                  <span className="cipher-decoded-letter text-sm" style={{ animationDelay: `${delay}ms` }}>
                    {p}
                  </span>
                  <span className="cipher-decoded-sub text-[0.6rem]" style={{ animationDelay: `${delay}ms` }}>
                    {/[A-Z]/.test(c) ? c : ""}
                  </span>
                </span>
              );
            })}
          </div>
        ))}
      </div>
      <p className="cipher-decoded-unlock mt-2 text-xs text-white">{page.unlocked}</p>
    </div>
  );
}

// Decoding the Engine's lost blueprints. The board shows the scrambled page
// word by word; what you've worked out so far fills in underneath.
export default function CipherPanel() {
  const { e, fx, store, ensureCipher, cipherGuess, cipherDial, cipherKeyword, cipherHint } = useEngine();
  const ips = useLive(store, (s) => s.ips);
  const [selected, setSelected] = useState<string | null>(null);
  const [keyword, setKeyword] = useState("");
  const [keywordWrong, setKeywordWrong] = useState(false);
  const [decoded, setDecoded] = useState<Solved | null>(null);
  const shownRef = useRef<Omit<Solved, "plain" | "unlocked"> | null>(null);

  const target = nextCipherTarget(e);
  useEffect(() => {
    if (target && e.ciphers.current?.id !== target.id) ensureCipher();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [target?.id, e.ciphers.current?.id, ensureCipher]);

  const cur = e.ciphers.current;
  const puzzle = useMemo(() => (cur ? puzzleFor(cur, e, fx) : null), [cur, e, fx]);

  // The page on screen just went from current to solved: play it out.
  useEffect(() => {
    const shown = shownRef.current;
    if (shown && shown.id !== cur?.id && e.ciphers.solved.includes(shown.id)) {
      const part = BLUEPRINTS_BY_ID[shown.id]?.part;
      setDecoded({
        ...shown,
        plain: cipherPlainText(shown.id),
        unlocked: part
          ? `Blueprint decoded: the ${PART_DEFS[part].name}. It's in the Body tab now.`
          : BLUEPRINTS_BY_ID[shown.id]
            ? "The last page, decoded."
            : "Practice page decoded.",
      });
      setSelected(null);
    }
    shownRef.current = cur && puzzle ? { id: cur.id, title: cipherTitle(cur.id), cipher: puzzle.cipher } : null;
    // puzzle follows cur; its cipher text never changes for the same page.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [cur?.id, e.ciphers.solved]);

  if (decoded) return <DecodedPage key={decoded.id} page={decoded} onDone={() => setDecoded(null)} />;

  if (!target) {
    return (
      <p className="text-xs text-slate-400">
        {e.stage < 3 ? "Nothing to decode yet." : "Every page it has, it has read. More will surface as it grows."}
      </p>
    );
  }
  if (!cur || !puzzle) return null;

  const attempt = renderAttempt(puzzle, cur);
  const hintCost = Math.max(stageFlat(e.stage) * 5, ips * 120);
  const truth = decodeMap(puzzle);
  const letterBoard = puzzle.kind === "sub" || puzzle.kind === "keyword";
  const usedPlain = new Set(Object.values(cur.guesses));
  for (const g of puzzle.given) usedPlain.add(g);

  const cipherWords = puzzle.cipher.split(" ");
  const attemptWords = attempt.split(" ");

  return (
    <div data-engine-target="cipher" data-no-drag>
      <div className="flex items-baseline justify-between gap-2">
        <p className="text-xs font-bold uppercase tracking-wider text-[var(--outpost-accent)]">{cipherTitle(cur.id)}</p>
        <span className="text-[0.65rem] text-white/40">
          {puzzle.kind === "sub" ? "Substitution" : puzzle.kind === "caesar" ? "One dial" : puzzle.kind === "caesar2" ? "Two dials" : "Keyword"}
        </span>
      </div>

      <div className="mt-2 flex flex-wrap gap-x-3 gap-y-2 rounded-lg border border-white/10 bg-black/20 p-2 font-mono">
        {cipherWords.map((word, wi) => (
          <div key={wi} className="flex gap-0.5">
            {word.split("").map((c, ci) => {
              const plain = attemptWords[wi]?.[ci] ?? "_";
              const isLetter = /[A-Z]/.test(c);
              const given = isLetter && puzzle.given.includes(truth[c]);
              const active = letterBoard && selected === c;
              return (
                <button
                  key={ci}
                  type="button"
                  disabled={!letterBoard || !isLetter || given}
                  onClick={() => setSelected(active ? null : c)}
                  className={`flex w-[1.35rem] flex-col items-center rounded text-center leading-tight ${
                    active ? "bg-[var(--outpost-accent-soft)]" : ""
                  } ${letterBoard && isLetter && !given ? "hover:bg-white/10" : ""}`}
                >
                  <span className={`text-sm ${given ? "text-slate-300" : plain === "_" ? "text-white/30" : "text-white"}`}>
                    {plain}
                  </span>
                  <span className="text-[0.6rem] text-[var(--outpost-accent)]/70">{isLetter ? c : ""}</span>
                </button>
              );
            })}
          </div>
        ))}
      </div>

      {puzzle.crib && puzzle.kind === "caesar" && (
        <p className="mt-1.5 text-[0.7rem] text-slate-400">
          One word is known: <span className="font-mono text-white">{puzzle.crib}</span>
        </p>
      )}

      {letterBoard ? (
        <>
          <p className="mt-2 text-[0.7rem] text-slate-400">
            {selected ? (
              <>
                <span className="font-mono text-[var(--outpost-accent)]">{selected}</span> stands for…
              </>
            ) : (
              "Tap a scrambled letter, then what you think it stands for."
            )}
          </p>
          <div className="mt-1 grid grid-cols-9 gap-1 sm:grid-cols-[repeat(13,minmax(0,1fr))]">
            {ALPHABET.split("").map((p) => (
              <button
                key={p}
                type="button"
                disabled={!selected}
                onClick={() => {
                  if (!selected) return;
                  cipherGuess(selected, p);
                  setSelected(null);
                }}
                className={`rounded border px-1 py-1 font-mono text-xs transition-colors disabled:opacity-40 ${
                  usedPlain.has(p) ? "border-white/5 text-white/30" : "border-white/15 text-white hover:border-[var(--outpost-accent)]"
                }`}
              >
                {p}
              </button>
            ))}
            {selected && (
              <button
                type="button"
                onClick={() => {
                  cipherGuess(selected, null);
                  setSelected(null);
                }}
                className="col-span-2 rounded border border-white/15 px-1 py-1 text-xs text-slate-300 hover:border-red-400"
              >
                Clear
              </button>
            )}
          </div>
        </>
      ) : (
        <div className="mt-2 flex flex-wrap items-center gap-4">
          {puzzle.shifts.map((_, i) => (
            <Dial key={i} label={puzzle.shifts.length > 1 ? (i === 0 ? "Odd letters" : "Even letters") : "Shift"} value={cur.dials[i] ?? 0} onChange={(v) => cipherDial(i, v)} />
          ))}
        </div>
      )}

      {puzzle.kind === "keyword" && (
        <div className="mt-3 rounded-lg border border-white/10 p-2">
          <p className="text-[0.7rem] text-slate-400">The key is a single word, in three pieces hidden around the site:</p>
          <ul className="mt-1 space-y-0.5">
            {KEY_FRAGMENTS.map((f) => {
              const found = e.ciphers.keyFragments.includes(f.id);
              return (
                <li key={f.id} className="text-[0.7rem]">
                  <span className={`font-mono ${found ? "text-[var(--outpost-accent)]" : "text-white/30"}`}>{found ? f.text : "???"}</span>
                  <span className="ml-2 text-slate-500">{found ? "found" : f.hint}</span>
                </li>
              );
            })}
          </ul>
          <form
            className="mt-2 flex gap-2"
            onSubmit={(ev) => {
              ev.preventDefault();
              const ok = cipherKeyword(keyword);
              setKeywordWrong(!ok);
              if (ok) setKeyword("");
            }}
          >
            <input
              value={keyword}
              onChange={(ev) => {
                setKeyword(ev.target.value);
                setKeywordWrong(false);
              }}
              placeholder="Type the keyword"
              className={`min-w-0 flex-1 rounded-md border bg-transparent px-2 py-1 font-mono text-xs uppercase text-white ${keywordWrong ? "border-red-500/60" : "border-white/15"}`}
            />
            <button type="submit" className="rounded-md border border-white/15 px-2 py-1 text-xs text-slate-200 hover:border-[var(--outpost-accent)]">
              Try
            </button>
          </form>
        </div>
      )}

      <button
        type="button"
        onClick={cipherHint}
        disabled={e.insight < hintCost}
        className="mt-2 text-[0.7rem] text-slate-400 hover:text-white disabled:opacity-40"
      >
        Ask for a letter ({formatInsight(hintCost)} insight)
      </button>
    </div>
  );
}

function Dial({ label, value, onChange }: { label: string; value: number; onChange: (v: number) => void }) {
  return (
    <div className="flex items-center gap-2">
      <button type="button" onClick={() => onChange(value - 1)} className="h-8 w-8 rounded-md border border-white/15 text-sm text-white hover:border-[var(--outpost-accent)]" aria-label={`${label} down`}>
        −
      </button>
      <div className="flex flex-col items-center">
        <svg viewBox="-20 -20 40 40" className="h-10 w-10" aria-hidden="true">
          <g style={{ transform: `rotate(${value * (360 / 26)}deg)`, transition: "transform 200ms ease" }}>
            {Array.from({ length: 13 }, (_, i) => (
              <rect key={i} x={-2} y={-19} width={4} height={6} rx={1} fill="var(--outpost-accent)" transform={`rotate(${(i * 360) / 13})`} />
            ))}
            <circle r={14} fill="rgba(0,0,0,0.35)" stroke="var(--outpost-accent)" strokeWidth={2} />
            <line x1={0} y1={0} x2={0} y2={-10} stroke="white" strokeWidth={2} strokeLinecap="round" />
          </g>
        </svg>
        <span className="font-mono text-xs text-white">{value}</span>
        <span className="text-[0.6rem] text-white/40">{label}</span>
      </div>
      <button type="button" onClick={() => onChange(value + 1)} className="h-8 w-8 rounded-md border border-white/15 text-sm text-white hover:border-[var(--outpost-accent)]" aria-label={`${label} up`}>
        +
      </button>
    </div>
  );
}
