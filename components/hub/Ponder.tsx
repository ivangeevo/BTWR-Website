"use client";

import { useEffect, useRef, useState } from "react";
import { useAchievements } from "./AchievementsProvider";
import { CAMPFIRE_STAGES, currentCampfireStage } from "./campfire-stage";
import {
  engineLoreForRank,
  PONDER_HINTS,
  PONDER_STAGE1_PUZZLES,
  PONDER_STAGE2_FORKS,
  PONDER_STAGE3_TEMPLATES,
  PONDER_STAGE4_LINES,
  shuffleTiles,
  type PonderFork,
  type PonderLiveCtx,
} from "./ponder-content";
import {
  PONDER_STAGE_CAPTIONS,
  PONDER_STAGE_LABELS,
  PONDER_STAGE_TITLES,
  type PonderStage,
} from "./ponder-stage";
import { RESOURCE_IDS, type ResourceId } from "./resources";

const WRONG_RESET_MS = 500;
const CORRECT_ADVANCE_MS = 900;
const HINT_CHANCE = 0.25;

function pickOne<T>(pool: readonly T[]): T {
  return pool[Math.floor(Math.random() * pool.length)];
}

// The word-tile puzzle at Stage 1/3/4, and the fixed-stem half of a Stage 2
// fork before the player picks a branch — same shape either way.
function puzzleSolutionFor(stage: PonderStage, ctx: PonderLiveCtx): string[] {
  if (stage === 3) return pickOne(PONDER_STAGE3_TEMPLATES).build(ctx);
  if (stage === 4) return pickOne(PONDER_STAGE4_LINES).solution;
  return pickOne(PONDER_STAGE1_PUZZLES).solution;
}

// Ponder's the very first thing a visitor finds (see DEFAULT_CARD_ORDER) — a
// small word-tile puzzle that tries to complete a sentence about itself. Its
// own Day One/Day Two/mid-game/endgame arc (ponder-stage.ts) is drawn from
// the real BTW Beginner's Guide, not the Outpost's own achievement tiers.
export default function Ponder() {
  const {
    mounted,
    ponderStage,
    ponder,
    recordPonderSolved,
    resources,
    resourceMeta,
    tools,
    toolTiersList,
    visits,
    campfire,
    mechanics,
  } = useAchievements();

  const [ready, setReady] = useState(false);
  const [fork, setFork] = useState<PonderFork | null>(null);
  const [choosing, setChoosing] = useState<PonderFork | null>(null);
  const [solution, setSolution] = useState<string[]>([]);
  const [bank, setBank] = useState<string[]>([]);
  const [placed, setPlaced] = useState<string[]>([]);
  const [feedback, setFeedback] = useState<"idle" | "correct" | "wrong">("idle");
  const [shakeKey, setShakeKey] = useState(0);
  const [hint, setHint] = useState<string | null>(null);
  const [announcement, setAnnouncement] = useState("");
  const [showJournal, setShowJournal] = useState(false);
  const [showLore, setShowLore] = useState(false);

  const stageRef = useRef<PonderStage>(ponderStage);
  stageRef.current = ponderStage;
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  function buildLiveCtx(): PonderLiveCtx {
    let topId: ResourceId = RESOURCE_IDS[0];
    let topAmount = -1;
    for (const id of RESOURCE_IDS) {
      if (resources[id] > topAmount) {
        topAmount = resources[id];
        topId = id;
      }
    }
    const toolName = toolTiersList.find((t) => t.id === tools.tier)?.name ?? "Bare Hands";
    return {
      topResourceName: resourceMeta[topId].name,
      topResourceAmount: Math.max(0, topAmount),
      campfireLabel: CAMPFIRE_STAGES[currentCampfireStage(campfire, mechanics.campfire.decayMinutes)],
      toolTierName: toolName,
      visitStreak: visits.streakDays,
    };
  }

  function loadPuzzle(stage: PonderStage) {
    setHint(null);
    setFeedback("idle");
    if (stage === 2) {
      const f = pickOne(PONDER_STAGE2_FORKS);
      setFork(f);
      setChoosing(null);
      setSolution(f.stem);
      setBank(shuffleTiles(f.stem));
      setPlaced([]);
      return;
    }
    const sol = puzzleSolutionFor(stage, buildLiveCtx());
    setFork(null);
    setChoosing(null);
    setSolution(sol);
    setBank(shuffleTiles(sol));
    setPlaced([]);
  }

  useEffect(() => {
    if (!mounted || ready) return;
    loadPuzzle(stageRef.current);
    setReady(true);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mounted, ready]);

  useEffect(() => () => {
    if (timerRef.current) clearTimeout(timerRef.current);
  }, []);

  function finishSentence(text: string, wasChoice: boolean) {
    setFeedback("correct");
    setAnnouncement(text);
    recordPonderSolved(text, wasChoice);
    if (stageRef.current === 4 && Math.random() < HINT_CHANCE) {
      setHint(pickOne(PONDER_HINTS));
    }
    timerRef.current = setTimeout(() => loadPuzzle(stageRef.current), CORRECT_ADVANCE_MS);
  }

  function handleWrong() {
    setFeedback("wrong");
    setShakeKey((k) => k + 1);
    timerRef.current = setTimeout(() => {
      setBank(shuffleTiles(solution));
      setPlaced([]);
      setFeedback("idle");
    }, WRONG_RESET_MS);
  }

  function placeTile(index: number) {
    if (feedback !== "idle") return;
    const word = bank[index];
    const nextPlaced = [...placed, word];
    setBank(bank.filter((_, i) => i !== index));
    setPlaced(nextPlaced);
    if (nextPlaced.length !== solution.length) return;
    const correct = nextPlaced.every((w, i) => w === solution[i]);
    if (!correct) {
      handleWrong();
      return;
    }
    if (fork) {
      // Stem placed correctly — hand off to the branch choice instead of
      // finishing the sentence yet.
      setChoosing(fork);
      setFork(null);
      return;
    }
    finishSentence(nextPlaced.join(" "), false);
  }

  function undoTile(index: number) {
    if (feedback !== "idle") return;
    const word = placed[index];
    setPlaced(placed.filter((_, i) => i !== index));
    setBank([...bank, word]);
  }

  function chooseBranch(branchIndex: 0 | 1) {
    if (!choosing) return;
    const branch = choosing.branches[branchIndex];
    const fullText = [...placed, ...branch.solution].join(" ");
    setChoosing(null);
    finishSentence(fullText, true);
  }

  if (!ready) {
    return (
      <div className="outpost-panel outpost-card-md rounded-xl p-5">
        <h3 className="font-heading text-sm font-bold uppercase tracking-wider text-[var(--outpost-accent)]">
          {PONDER_STAGE_TITLES[ponderStage]}
        </h3>
        <div className="mt-3 space-y-2">
          <div className="h-3 w-full animate-pulse rounded bg-white/10" />
          <div className="h-3 w-2/3 animate-pulse rounded bg-white/10" />
        </div>
      </div>
    );
  }

  const journal = ponder.journal;

  return (
    <div className="outpost-panel outpost-card-md rounded-xl p-5">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h3 className="font-heading text-sm font-bold uppercase tracking-wider text-[var(--outpost-accent)]">
          {PONDER_STAGE_TITLES[ponderStage]}
        </h3>
        <div className="flex items-center gap-1.5">
          <span className="outpost-resource-chip">{"\u{1F4A1}"} {ponder.insight}</span>
          <span className="outpost-resource-chip">{PONDER_STAGE_LABELS[ponderStage]}</span>
        </div>
      </div>
      <p className="mt-1 text-xs text-slate-400">{PONDER_STAGE_CAPTIONS[ponderStage]}</p>

      <div
        key={feedback === "wrong" ? shakeKey : "stable"}
        className={`mt-3 flex min-h-[2.25rem] flex-wrap items-center gap-1.5 rounded-lg border p-2 transition-colors ${
          feedback === "wrong"
            ? "ponder-shake border-red-500/50 bg-red-950/20"
            : feedback === "correct"
              ? "border-[var(--outpost-accent)] bg-[var(--outpost-accent-soft)]"
              : "border-white/10 bg-white/5"
        }`}
      >
        {placed.length === 0 ? (
          <span className="text-xs text-white/30">Tap the words below.</span>
        ) : (
          placed.map((word, i) => (
            <button
              key={`${word}-${i}`}
              type="button"
              onClick={() => undoTile(i)}
              disabled={feedback !== "idle"}
              className="rounded-md border border-[var(--outpost-accent-soft)] bg-[var(--outpost-accent-soft)] px-2 py-1 text-sm text-white disabled:opacity-80"
            >
              {word}
            </button>
          ))
        )}
      </div>

      {choosing ? (
        <div className="mt-2 flex flex-col gap-1.5">
          {choosing.branches.map((branch, i) => (
            <button
              key={branch.id}
              type="button"
              onClick={() => chooseBranch(i as 0 | 1)}
              className="rounded-md border border-white/15 px-2.5 py-1.5 text-left text-sm text-slate-200 transition-colors hover:border-[var(--outpost-accent)] hover:text-white"
            >
              {branch.solution.join(" ")}
            </button>
          ))}
        </div>
      ) : (
        <div className="mt-2 flex flex-wrap gap-1.5">
          {bank.map((word, i) => (
            <button
              key={`${word}-${i}`}
              type="button"
              onClick={() => placeTile(i)}
              disabled={feedback !== "idle"}
              className="rounded-md border border-white/15 bg-white/5 px-2 py-1 text-sm text-slate-200 transition-colors hover:border-[var(--outpost-accent-soft)] hover:text-white disabled:opacity-50"
            >
              {word}
            </button>
          ))}
        </div>
      )}

      {hint && <p className="mt-2 text-xs italic text-[var(--outpost-accent)]">{hint}</p>}

      <span className="sr-only" aria-live="polite">
        {announcement}
      </span>

      {ponderStage >= 2 && journal.length > 0 && (
        <div className="mt-3 border-t border-white/10 pt-2">
          <button
            type="button"
            onClick={() => setShowJournal((v) => !v)}
            className="text-xs font-semibold text-slate-400 hover:text-white"
          >
            {showJournal ? "Hide" : "Show"} Ponder&apos;s Journal ({journal.length})
          </button>
          {showJournal && (
            <ul className="mt-2 space-y-1">
              {journal.map((line, i) => (
                <li key={i} className="text-xs text-slate-400">
                  {line}
                </li>
              ))}
            </ul>
          )}
        </div>
      )}

      {ponderStage >= 3 && ponder.loreRevealedRank > 0 && (
        <div className="mt-3 border-t border-white/10 pt-2">
          <button
            type="button"
            onClick={() => setShowLore((v) => !v)}
            className="text-xs font-semibold text-slate-400 hover:text-white"
          >
            {showLore ? "Hide" : "Show"} the Engine&apos;s Logbook ({ponder.loreRevealedRank})
          </button>
          {showLore && (
            <ul className="mt-2 space-y-1">
              {Array.from({ length: ponder.loreRevealedRank }, (_, i) => ponder.loreRevealedRank - i).map(
                (rank) => (
                  <li key={rank} className="text-xs text-slate-400">
                    {engineLoreForRank(rank)}
                  </li>
                )
              )}
            </ul>
          )}
        </div>
      )}
    </div>
  );
}
