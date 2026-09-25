"use client";

import Image from "next/image";
import { useEffect, useMemo, useRef, useState } from "react";
import type { Mod } from "@/lib/mods";
import { useAchievements } from "./AchievementsProvider";
import { useEngineOptional } from "./engine/ui/EngineProvider";
import { XP_PER_CORRECT_ANSWER } from "./tier2";

const ROUND_SIZE = 5;
const AUTO_ADVANCE_MS = 1200;

type Question = { correct: Mod; choices: Mod[] };

function shuffle<T>(items: T[]): T[] {
  const arr = [...items];
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

export default function GuessTheMod({
  mods,
  variant = "card",
}: {
  mods: Mod[];
  /** "card": self-contained panel (the card grid). "flat": no outer chrome. */
  variant?: "card" | "flat";
}) {
  const { quiz, updateQuiz, unlock, addXp, markQuizPlayedToday, recordModGuessCorrect, engineBuffs } =
    useAchievements();
  // The Engine's Detector Block (a powered attachment on its gear grid)
  // can strike one wrong answer per charge — see engine/buffs.ts.
  const engine = useEngineOptional();
  const [struck, setStruck] = useState<string[]>([]);
  const pool = useMemo(() => mods.filter((m) => m.iconUrl && !m.disabled), [mods]);
  const lastPickRef = useRef<string | null>(null);

  const [question, setQuestion] = useState<Question | null>(null);
  const [roundIndex, setRoundIndex] = useState(0);
  const [roundCorrect, setRoundCorrect] = useState(0);
  const [roundComplete, setRoundComplete] = useState(false);
  const [answered, setAnswered] = useState<{ choiceId: string; correct: boolean } | null>(null);

  function generateQuestion(): Question | null {
    if (pool.length < 4) return null;
    let correct = pool[Math.floor(Math.random() * pool.length)];
    if (pool.length > 1) {
      while (correct.projectId === lastPickRef.current) {
        correct = pool[Math.floor(Math.random() * pool.length)];
      }
    }
    lastPickRef.current = correct.projectId;
    const wrongs = shuffle(pool.filter((m) => m.projectId !== correct.projectId)).slice(0, 3);
    return { correct, choices: shuffle([correct, ...wrongs]) };
  }

  useEffect(() => setStruck([]), [question]);

  function strikeWithDetector() {
    if (!question || answered || !engine) return;
    const wrong = question.choices.filter((c) => c.projectId !== question.correct.projectId && !struck.includes(c.projectId));
    if (wrong.length <= 1) return;
    if (!engine.useDetector()) return;
    setStruck((prev) => [...prev, wrong[Math.floor(Math.random() * wrong.length)].projectId]);
  }

  function startRound() {
    setRoundIndex(0);
    setRoundCorrect(0);
    setRoundComplete(false);
    setAnswered(null);
    setQuestion(generateQuestion());
  }

  // Question generation is random, so it must happen client-side after
  // mount — computing it during SSR would bake a value into the static
  // export that disagrees with the client's own Math.random() on hydration.
  useEffect(() => {
    setQuestion(generateQuestion());
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (!answered) return;
    const timer = setTimeout(() => {
      const isLastQuestion = roundIndex + 1 >= ROUND_SIZE;
      if (isLastQuestion) {
        setRoundComplete(true);
        const isPerfect = roundCorrect === ROUND_SIZE;
        updateQuiz((prev) => ({
          ...prev,
          bestScore: Math.max(prev.bestScore, roundCorrect),
          perfectRounds: prev.perfectRounds + (isPerfect ? 1 : 0),
        }));
        if (isPerfect) {
          unlock("quiz-perfect-round");
          if (quiz.perfectRounds + 1 >= 3) unlock("perfect-alloy");
        }
      } else {
        setRoundIndex((i) => i + 1);
        setAnswered(null);
        setQuestion(generateQuestion());
      }
    }, AUTO_ADVANCE_MS);
    return () => clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [answered]);

  function selectChoice(mod: Mod) {
    if (!question || answered) return;
    const correct = mod.projectId === question.correct.projectId;
    setAnswered({ choiceId: mod.projectId, correct });
    markQuizPlayedToday();
    unlock("quiz-attempted");

    const nextStreak = correct ? quiz.currentStreak + 1 : 0;
    const nextTotalAnswered = quiz.totalAnswered + 1;
    updateQuiz((prev) => ({
      ...prev,
      currentStreak: nextStreak,
      bestStreak: Math.max(prev.bestStreak, nextStreak),
      totalAnswered: prev.totalAnswered + 1,
      totalCorrect: prev.totalCorrect + (correct ? 1 : 0),
    }));
    if (nextTotalAnswered >= 50) unlock("millstone-grind");

    if (correct) {
      setRoundCorrect((c) => c + 1);
      unlock("quiz-first-correct");
      if (nextStreak === 5) unlock("quiz-streak-5");
      if (nextStreak === 10) unlock("no-compass-needed");
      recordModGuessCorrect(mod.projectId);
      addXp(XP_PER_CORRECT_ANSWER);
    }
  }

  return (
    <div className={variant === "card" ? "outpost-panel outpost-card-md rounded-xl p-5" : ""}>
      <div className={`flex items-center ${variant === "card" ? "justify-between" : "justify-end"}`}>
        {variant === "card" && (
          <h3 className="font-heading text-sm font-bold uppercase tracking-wider text-[var(--outpost-accent)]">
            Guess the Mod
          </h3>
        )}
        {question && !roundComplete && (
          <span className="text-xs text-slate-500">
            {roundIndex + 1} / {ROUND_SIZE}
          </span>
        )}
      </div>

      {!question && (
        <div className="mt-4 flex flex-col items-center gap-3 py-4">
          <div className="h-20 w-20 animate-pulse rounded-lg bg-white/10" />
          <div className="h-4 w-32 animate-pulse rounded bg-white/10" />
        </div>
      )}

      {question && !roundComplete && (
        <>
          <div className="mt-4 flex justify-center">
            <div className="h-20 w-20 overflow-hidden rounded-lg bg-white/10">
              {question.correct.iconUrl && (
                <Image
                  src={question.correct.iconUrl}
                  alt=""
                  width={80}
                  height={80}
                  unoptimized
                  style={{
                    filter: answered ? "none" : "blur(6px)",
                    transform: answered ? "scale(1)" : "scale(1.4)",
                    transition: "filter 300ms ease, transform 300ms ease",
                  }}
                />
              )}
            </div>
          </div>

          <div className="mt-4 grid grid-cols-1 gap-2 sm:grid-cols-2">
            {question.choices.map((choice) => {
              const isCorrectChoice = choice.projectId === question.correct.projectId;
              const isPicked = answered?.choiceId === choice.projectId;
              const showState = Boolean(answered) && (isCorrectChoice || isPicked);
              const isStruck = struck.includes(choice.projectId) && !answered;
              return (
                <button
                  key={choice.projectId}
                  type="button"
                  disabled={Boolean(answered) || isStruck}
                  onClick={() => selectChoice(choice)}
                  className={`rounded-lg border px-3 py-2 text-left text-sm font-medium transition-colors ${
                    showState
                      ? isCorrectChoice
                        ? "border-emerald-500 bg-emerald-950/60 text-emerald-300"
                        : "border-red-500 bg-red-950/60 text-red-300"
                      : isStruck
                        ? "border-white/5 text-white/25 line-through"
                        : "border-white/15 text-slate-200 hover:border-[var(--outpost-accent)] hover:bg-white/5"
                  }`}
                >
                  {choice.name}
                </button>
              );
            })}
          </div>
          {engine && engineBuffs.detectorPowered && (
            <button
              type="button"
              onClick={strikeWithDetector}
              disabled={Boolean(answered) || engine.e.detector.charges < 1}
              className="mt-2 w-full rounded-md border border-white/15 px-2 py-1 text-xs text-slate-300 transition-colors hover:border-[var(--outpost-accent)] disabled:opacity-40"
              title="The Engine's Detector Block senses one wrong answer"
            >
              {"\u{1F4E1}"} Detector — strike a wrong answer ({engine.e.detector.charges}/{engineBuffs.detectorMaxCharges})
            </button>
          )}
        </>
      )}

      {roundComplete && (
        <div className="mt-4 flex flex-col items-center gap-3 py-2 text-center">
          <p className="font-heading text-2xl font-bold text-[var(--outpost-accent)]">
            {roundCorrect} / {ROUND_SIZE}
          </p>
          <p className="text-sm text-slate-400">
            Best round: {quiz.bestScore} / {ROUND_SIZE} &middot; Best streak: {quiz.bestStreak}
          </p>
          <button
            type="button"
            onClick={startRound}
            className="btn-glow btn-gradient rounded-lg px-4 py-2 text-sm font-semibold text-white"
          >
            Play again
          </button>
        </div>
      )}
    </div>
  );
}
