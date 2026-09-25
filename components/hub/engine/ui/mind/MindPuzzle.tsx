"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { dominantBelief, nextAsk, type AskDef } from "../../content/asks";
import { buildLetter, LETTER_AFTER_PARAGRAPHS } from "../../content/letter";
import type { ForkDef } from "../../content/puzzles";
import { formatInsight } from "../../economy";
import { pickPuzzle, type Puzzle } from "../../puzzle-picker";
import { useAchievements } from "../../../AchievementsProvider";
import { useEngine } from "../EngineProvider";

const WRONG_RESET_MS = 500;
const CORRECT_ADVANCE_MS = 900;

function shuffle(words: string[]): string[] {
  const arr = [...words];
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  if (arr.length > 1 && arr.every((w, i) => w === words[i])) [arr[0], arr[1]] = [arr[1], arr[0]];
  return arr;
}

type Current =
  | { mode: "puzzle"; puzzle: Puzzle; solution: string[]; fork: ForkDef | null }
  | { mode: "ask"; ask: AskDef }
  | { mode: "letter"; lines: string[]; solution: string[] };

// The word-tile heart of the Engine — the only thing on the card at Day
// One, still here at the End. Tap words into order; forks, the Engine's
// own questions, paragraphs and (once) the Letter all flow through here.
export default function MindPuzzle({ compact = false }: { compact?: boolean }) {
  const { e, mods, env, liveCtx, solvePuzzle, answerAsk, finishLetter } = useEngine();
  const { mounted, visits, tier2 } = useAchievements();
  const [cur, setCur] = useState<Current | null>(null);
  const [bank, setBank] = useState<string[]>([]);
  const [placed, setPlaced] = useState<string[]>([]);
  const [choosing, setChoosing] = useState<ForkDef | null>(null);
  const [feedback, setFeedback] = useState<"idle" | "correct" | "wrong">("idle");
  const [shakeKey, setShakeKey] = useState(0);
  const [lastReward, setLastReward] = useState<number | null>(null);
  const recentRef = useRef<string[]>([]);
  const timerRef = useRef<number | null>(null);
  const eRef = useRef(e);
  eRef.current = e;

  const modsRead = useMemo(() => mods.filter((m) => e.modsRead.includes(m.slug)), [mods, e.modsRead]);

  const load = useCallback(() => {
    const s = eRef.current;
    setFeedback("idle");
    setChoosing(null);
    setPlaced([]);
    // The Letter, once — Stage 8, after a few paragraphs.
    if (s.stage >= 8 && !s.letter && s.solvesByKind.paragraph >= LETTER_AFTER_PARAGRAPHS) {
      const first = mods.find((m) => s.modsRead[0] === m.slug)?.name ?? null;
      const lines = buildLetter(s, { visitStreak: visits.streakDays, daysVisited: tier2.totalDaysVisited, firstModName: first });
      const solution = lines.slice(0, 4);
      setCur({ mode: "letter", lines, solution });
      setBank(shuffle(solution));
      return;
    }
    const ask = nextAsk(s.askAnswers, s.solvedCount, s.stage);
    if (ask) {
      setCur({ mode: "ask", ask });
      setBank([]);
      return;
    }
    const puzzle = pickPuzzle(
      { stage: s.stage, modsRead, live: liveCtx(), belief: dominantBelief(s.beliefs), night: env.night, recent: recentRef.current },
      Math.random
    );
    recentRef.current = [puzzle.id, ...recentRef.current].slice(0, 6);
    const solution = puzzle.kind === "fork" ? puzzle.fork.stem : puzzle.solution;
    setCur({ mode: "puzzle", puzzle, solution, fork: puzzle.kind === "fork" ? puzzle.fork : null });
    setBank(shuffle(solution));
  }, [mods, modsRead, liveCtx, env.night, visits.streakDays, tier2.totalDaysVisited]);

  useEffect(() => {
    if (mounted && !cur) load();
  }, [mounted, cur, load]);

  useEffect(
    () => () => {
      if (timerRef.current) window.clearTimeout(timerRef.current);
    },
    []
  );

  const solution = cur && cur.mode !== "ask" ? cur.solution : [];

  function done(reward: number) {
    setFeedback("correct");
    setLastReward(reward);
    timerRef.current = window.setTimeout(() => {
      setLastReward(null);
      load();
    }, CORRECT_ADVANCE_MS);
  }

  function place(i: number) {
    if (feedback !== "idle" || !cur || cur.mode === "ask") return;
    const next = [...placed, bank[i]];
    setBank(bank.filter((_, j) => j !== i));
    setPlaced(next);
    if (next.length !== solution.length) return;
    if (!next.every((w, j) => w === solution[j])) {
      setFeedback("wrong");
      setShakeKey((k) => k + 1);
      timerRef.current = window.setTimeout(() => {
        setBank(shuffle(solution));
        setPlaced([]);
        setFeedback("idle");
      }, WRONG_RESET_MS);
      return;
    }
    if (cur.mode === "letter") {
      finishLetter(cur.lines);
      setFeedback("correct");
      return;
    }
    if (cur.fork) {
      setChoosing(cur.fork);
      return;
    }
    const kind = cur.puzzle.kind === "fork" ? "fork" : cur.puzzle.kind;
    done(solvePuzzle(kind, next.join(" "), false));
  }

  function unplace(i: number) {
    if (feedback !== "idle") return;
    setBank([...bank, placed[i]]);
    setPlaced(placed.filter((_, j) => j !== i));
  }

  function choose(branch: 0 | 1) {
    if (!choosing) return;
    const text = [...placed, ...choosing.branches[branch].solution].join(" ");
    setChoosing(null);
    done(solvePuzzle("fork", text, true));
  }

  if (!cur) {
    return (
      <div className="mt-3 space-y-2">
        <div className="h-3 w-full animate-pulse rounded bg-white/10" />
        <div className="h-3 w-2/3 animate-pulse rounded bg-white/10" />
      </div>
    );
  }

  if (cur.mode === "ask") {
    return (
      <div className="mt-3" data-no-drag>
        <p className="text-sm font-semibold text-white">{cur.ask.question}</p>
        <div className="mt-2 flex flex-col gap-1.5">
          {cur.ask.options.map((o) => (
            <button
              key={o.id}
              type="button"
              onClick={() => {
                answerAsk(cur.ask.id, o.id);
                setCur(null);
              }}
              className="rounded-md border border-white/15 px-2.5 py-1.5 text-left text-sm text-slate-200 transition-colors hover:border-[var(--outpost-accent)] hover:text-white"
            >
              {o.text}
            </button>
          ))}
        </div>
        <p className="mt-1.5 text-[0.7rem] italic text-slate-500">It asked you, for once.</p>
      </div>
    );
  }

  if (cur.mode === "letter" && e.letter) {
    return (
      <div className="mt-3 space-y-1.5 rounded-lg border border-[var(--outpost-accent-soft)] bg-[var(--outpost-accent-soft)]/10 p-3 text-sm text-slate-200">
        {e.letter.map((l, i) => (
          <p key={i} className="engine-typed" style={{ animationDelay: `${i * 220}ms` }}>
            {l}
          </p>
        ))}
        <button
          type="button"
          onClick={() => setCur(null)}
          className="mt-2 text-xs font-semibold text-[var(--outpost-accent)] hover:underline"
        >
          Keep writing →
        </button>
      </div>
    );
  }

  const paragraph = cur.mode === "letter" || (cur.mode === "puzzle" && cur.puzzle.kind === "paragraph");

  return (
    <div data-no-drag>
      {cur.mode === "letter" && <p className="mt-2 text-xs italic text-[var(--outpost-accent)]">It&apos;s writing you something. Help it with the start.</p>}
      <div
        key={feedback === "wrong" ? shakeKey : "stable"}
        data-engine-target="tile-answer"
        className={`mt-3 flex min-h-[2.25rem] flex-wrap items-center gap-1.5 rounded-lg border p-2 transition-colors ${
          feedback === "wrong"
            ? "ponder-shake border-red-500/50 bg-red-950/20"
            : feedback === "correct"
              ? "border-[var(--outpost-accent)] bg-[var(--outpost-accent-soft)]"
              : "border-white/10 bg-white/5"
        } ${paragraph ? "flex-col items-stretch" : ""}`}
      >
        {placed.length === 0 ? (
          <span className="text-xs text-white/30">{paragraph ? "Tap the sentences in order." : "Tap the words below."}</span>
        ) : (
          placed.map((w, i) => (
            <button
              key={`${w}-${i}`}
              type="button"
              onClick={() => unplace(i)}
              disabled={feedback !== "idle"}
              className="rounded-md border border-[var(--outpost-accent-soft)] bg-[var(--outpost-accent-soft)] px-2 py-1 text-left text-sm text-white disabled:opacity-80"
            >
              {w}
            </button>
          ))
        )}
        {lastReward !== null && (
          <span className="engine-floater-inline ml-auto text-xs font-semibold text-[var(--outpost-accent)]">
            +{formatInsight(lastReward)}
          </span>
        )}
      </div>
      {choosing ? (
        <div className="mt-2 flex flex-col gap-1.5">
          {choosing.branches.map((b, i) => (
            <button
              key={b.id}
              type="button"
              onClick={() => choose(i as 0 | 1)}
              className="rounded-md border border-white/15 px-2.5 py-1.5 text-left text-sm text-slate-200 transition-colors hover:border-[var(--outpost-accent)] hover:text-white"
            >
              …{b.solution.join(" ")}
            </button>
          ))}
        </div>
      ) : (
        <div data-engine-target="tile-bank" className={`mt-2 flex flex-wrap gap-1.5 ${paragraph ? "flex-col" : ""}`}>
          {bank.map((w, i) => (
            <button
              key={`${w}-${i}`}
              type="button"
              onClick={() => place(i)}
              disabled={feedback !== "idle"}
              className="rounded-md border border-white/15 bg-white/5 px-2 py-1 text-left text-sm text-slate-200 transition-colors hover:border-[var(--outpost-accent-soft)] hover:text-white disabled:opacity-50"
            >
              {w}
            </button>
          ))}
        </div>
      )}
      {!compact && e.stage >= 3 && cur.mode === "puzzle" && cur.puzzle.kind === "modFact" && (
        <p className="mt-1.5 text-[0.7rem] italic text-slate-500">About a mod you showed it.</p>
      )}
    </div>
  );
}
