"use client";

import { useState } from "react";
import { ASKS_BY_ID } from "../content/asks";
import { loreEntry } from "../content/lore";
import { TUTORIALS } from "../content/tutorials";
import { STAGES } from "../stages";
import { BELIEF_AXES, ENGINE_STAGES, type EngineStage } from "../types";
import { SPEC_LINES } from "../content/voice";
import { useEngine } from "./EngineProvider";

// Everything the Engine remembers: its journal, its own lore (one entry per
// rank of lifetime insight), what you told it, the Letter, and replays of
// every ceremony and tutorial.
export default function LogbookTab() {
  const { e, showCeremony, replayTutorial } = useEngine();
  const [section, setSection] = useState<"journal" | "lore" | "you" | "replay">("journal");
  const total = Math.max(1, BELIEF_AXES.reduce((a, b) => a + e.beliefs[b], 0));

  return (
    <div data-no-drag>
      <div className="flex flex-wrap gap-1">
        {(["journal", "lore", "you", "replay"] as const).map((s) => (
          <button
            key={s}
            type="button"
            onClick={() => setSection(s)}
            className={`rounded-md border px-2 py-0.5 text-[0.7rem] ${section === s ? "border-[var(--outpost-accent)] text-[var(--outpost-accent)]" : "border-white/15 text-slate-400"}`}
          >
            {s === "journal" ? `Journal (${e.journal.length})` : s === "lore" ? `Logbook (${e.loreRevealedRank})` : s === "you" ? "What you told it" : "Replay"}
          </button>
        ))}
      </div>

      {section === "journal" && (
        <ul className="mt-2 max-h-64 space-y-1 overflow-y-auto pr-1">
          {e.journal.length === 0 && <li className="text-xs text-slate-500">Nothing written yet.</li>}
          {e.journal.map((line, i) => (
            <li key={i} className="text-xs text-slate-300">
              {line}
            </li>
          ))}
        </ul>
      )}

      {section === "lore" && (
        <div className="mt-2 max-h-64 space-y-1.5 overflow-y-auto pr-1">
          {e.letter && (
            <div className="rounded-lg border border-[var(--outpost-accent-soft)] p-2 text-xs text-slate-200">
              <p className="mb-1 text-[0.6rem] font-bold uppercase tracking-wider text-[var(--outpost-accent)]">The Letter</p>
              {e.letter.map((l, i) => (
                <p key={i}>{l}</p>
              ))}
            </div>
          )}
          {e.loreRevealedRank === 0 && <p className="text-xs text-slate-500">The Engine hasn&apos;t written about itself yet.</p>}
          {Array.from({ length: e.loreRevealedRank }, (_, i) => e.loreRevealedRank - i).map((rank) => (
            <p key={rank} className="text-xs italic text-slate-400">
              {loreEntry(rank)}
            </p>
          ))}
        </div>
      )}

      {section === "you" && (
        <div className="mt-2 space-y-2">
          <div className="space-y-1">
            {BELIEF_AXES.map((axis) => (
              <div key={axis} className="flex items-center gap-2 text-[0.7rem]">
                <span className="w-20 text-slate-400">{SPEC_LINES[axis].name}</span>
                <div className="outpost-progress-track flex-1">
                  <div className="outpost-progress-fill" style={{ width: `${(e.beliefs[axis] / total) * 100}%` }} />
                </div>
                <span className="w-5 text-right font-mono text-white/50">{e.beliefs[axis]}</span>
              </div>
            ))}
          </div>
          <ul className="max-h-48 space-y-1 overflow-y-auto pr-1">
            {e.askOrder.map((qid) => {
              const ask = ASKS_BY_ID[qid];
              const opt = ask?.options.find((o) => o.id === e.askAnswers[qid]);
              if (!ask || !opt) return null;
              return (
                <li key={qid} className="text-[0.7rem] text-slate-400">
                  <span className="text-slate-500">{ask.question}</span> {opt.text}
                </li>
              );
            })}
          </ul>
        </div>
      )}

      {section === "replay" && (
        <div className="mt-2 space-y-2">
          <div className="flex flex-wrap gap-1">
            {ENGINE_STAGES.filter((s) => s <= e.stage).map((s: EngineStage) => (
              <button
                key={s}
                type="button"
                onClick={() => showCeremony({ kind: "stage", stage: s, replay: true })}
                className="rounded-md border border-white/15 px-2 py-0.5 text-[0.7rem] text-slate-300 hover:border-[var(--outpost-accent)]"
              >
                {STAGES[s].chapter}
              </button>
            ))}
            {e.mark > 1 && (
              <button
                type="button"
                onClick={() => showCeremony({ kind: "mark", mark: e.mark })}
                className="rounded-md border border-white/15 px-2 py-0.5 text-[0.7rem] text-slate-300 hover:border-[var(--outpost-accent)]"
              >
                Mark {e.mark}
              </button>
            )}
          </div>
          <div className="flex flex-wrap gap-1">
            {TUTORIALS.filter((t) => e.tutorialsSeen.includes(t.id)).map((t) => (
              <button
                key={t.id}
                type="button"
                onClick={() => replayTutorial(t.id)}
                className="rounded-md border border-white/10 px-2 py-0.5 text-[0.65rem] text-slate-400 hover:border-[var(--outpost-accent)]"
              >
                ↻ {t.title}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
