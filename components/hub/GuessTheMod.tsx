"use client";

import Image from "next/image";
import { useEffect, useMemo, useRef, useState } from "react";
import type { Mod } from "@/lib/mods";
import { useAchievements } from "./AchievementsProvider";

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

export default function GuessTheMod({ mods }: { mods: Mod[] }) {
  const { quiz, updateQuiz, unlock } = useAchievements();
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
        updateQuiz((prev) => ({ ...prev, bestScore: Math.max(prev.bestScore, roundCorrect) }));
        if (roundCorrect === ROUND_SIZE) unlock("quiz-perfect-round");
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

    const nextStreak = correct ? quiz.currentStreak + 1 : 0;
    updateQuiz((prev) => ({
      ...prev,
      currentStreak: nextStreak,
      bestStreak: Math.max(prev.bestStreak, nextStreak),
      totalAnswered: prev.totalAnswered + 1,
      totalCorrect: prev.totalCorrect + (correct ? 1 : 0),
    }));

    if (correct) {
      setRoundCorrect((c) => c + 1);
      unlock("quiz-first-correct");
      if (nextStreak === 5) unlock("quiz-streak-5");
    }
  }

  return (
    <div className="card-glow rounded-xl border border-slate-200 p-5 dark:border-slate-700">
      <div className="flex items-center justify-between">
        <h3 className="font-heading text-sm font-bold uppercase tracking-wider text-chrome-dark dark:text-chrome">
          Guess the Mod
        </h3>
        {question && !roundComplete && (
          <span className="text-xs text-slate-400 dark:text-slate-500">
            {roundIndex + 1} / {ROUND_SIZE}
          </span>
        )}
      </div>

      {!question && (
        <div className="mt-4 flex flex-col items-center gap-3 py-4">
          <div className="h-20 w-20 animate-pulse rounded-lg bg-slate-100 dark:bg-slate-800" />
          <div className="h-4 w-32 animate-pulse rounded bg-slate-100 dark:bg-slate-800" />
        </div>
      )}

      {question && !roundComplete && (
        <>
          <div className="mt-4 flex justify-center">
            <div className="h-20 w-20 overflow-hidden rounded-lg bg-slate-100 dark:bg-slate-800">
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
              return (
                <button
                  key={choice.projectId}
                  type="button"
                  disabled={Boolean(answered)}
                  onClick={() => selectChoice(choice)}
                  className={`rounded-lg border px-3 py-2 text-left text-sm font-medium transition-colors ${
                    showState
                      ? isCorrectChoice
                        ? "border-emerald-400 bg-emerald-50 text-emerald-800 dark:border-emerald-500 dark:bg-emerald-950 dark:text-emerald-300"
                        : "border-red-300 bg-red-50 text-red-700 dark:border-red-500 dark:bg-red-950 dark:text-red-300"
                      : "border-slate-200 hover:border-chrome hover:bg-chrome-light dark:border-slate-700 dark:hover:bg-slate-800"
                  }`}
                >
                  {choice.name}
                </button>
              );
            })}
          </div>
        </>
      )}

      {roundComplete && (
        <div className="mt-4 flex flex-col items-center gap-3 py-2 text-center">
          <p className="font-heading text-2xl font-bold text-chrome-dark dark:text-chrome">
            {roundCorrect} / {ROUND_SIZE}
          </p>
          <p className="text-sm text-slate-500 dark:text-slate-400">
            Best round: {quiz.bestScore} / {ROUND_SIZE} &middot; Best streak: {quiz.bestStreak}
          </p>
          <button
            type="button"
            onClick={startRound}
            className="btn-glow rounded-lg bg-chrome-dark px-4 py-2 text-sm font-semibold text-white dark:bg-chrome dark:text-chrome-dark"
          >
            Play again
          </button>
        </div>
      )}
    </div>
  );
}
