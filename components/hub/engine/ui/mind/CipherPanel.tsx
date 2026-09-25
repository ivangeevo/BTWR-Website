"use client";

import { useEffect, useMemo, useState } from "react";
import { cipherTitle, nextCipherTarget, puzzleFor } from "../../cipher-flow";
import { ALPHABET, decodeMap, renderAttempt } from "../../ciphers";
import { KEY_FRAGMENTS } from "../../content/blueprints";
import { formatInsight, stageFlat } from "../../economy";
import { useEngine } from "../EngineProvider";
import { useLive } from "../live-store";

// Decoding the Engine's lost blueprints. The board shows the scrambled page
// word by word; what you've worked out so far fills in underneath.
export default function CipherPanel() {
  const { e, fx, store, ensureCipher, cipherGuess, cipherDial, cipherKeyword, cipherHint } = useEngine();
  const ips = useLive(store, (s) => s.ips);
  const [selected, setSelected] = useState<string | null>(null);
  const [keyword, setKeyword] = useState("");
  const [keywordWrong, setKeywordWrong] = useState(false);

  const target = nextCipherTarget(e);
  useEffect(() => {
    if (target && e.ciphers.current?.id !== target.id) ensureCipher();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [target?.id, e.ciphers.current?.id, ensureCipher]);

  const cur = e.ciphers.current;
  const puzzle = useMemo(() => (cur ? puzzleFor(cur, e, fx) : null), [cur, e, fx]);

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
