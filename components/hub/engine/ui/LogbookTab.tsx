"use client";

import { useState } from "react";
import { ASKS_BY_ID } from "../content/asks";
import { loreEntry } from "../content/lore";
import { STIR_WHISPERS, stirringFound, whisperSource } from "../content/stirring";
import { TUTORIALS } from "../content/tutorials";
import { STAGES } from "../stages";
import { BELIEF_AXES, ENGINE_STAGES, type EngineStage } from "../types";
import { SPEC_LINES } from "../content/voice";
import { useAchievements } from "../../AchievementsProvider";
import { loreSnippetForLevel } from "../../tier2";
import { useEngine } from "./EngineProvider";

type Section = "journal" | "lore" | "camp" | "you" | "before" | "replay";

// The Soul tab — the one record of the Outpost: its journal; its lore (the
// Engine's own, one entry per rank of lifetime insight, beside the
// Outpost's level-up lore from tier2.ts); the camp log (deaths, treks home,
// gloom nights, firsts — content/camp-voice.ts); what you told it; the
// whispers from before it had words (Stage 0, content/stirring.ts — each
// set beside its Letter line once the Letter is written); the Letter; and
// replays of every ceremony and tutorial.
export default function LogbookTab() {
  const { e, showCeremony, replayTutorial } = useEngine();
  const { tier2 } = useAchievements();
  const [section, setSection] = useState<Section>("journal");
  const total = Math.max(1, BELIEF_AXES.reduce((a, b) => a + e.beliefs[b], 0));
  const whispers = STIR_WHISPERS.slice(0, stirringFound(e).length);
  const levelLore = Array.from({ length: Math.max(0, tier2.loreRevealedLevel - 1) }, (_, i) => tier2.loreRevealedLevel - i);
  const loreCount = e.loreRevealedRank + levelLore.length;
  const sections: Section[] = ["journal", "lore", "camp", "you", ...(whispers.length > 0 ? (["before"] as const) : []), "replay"];

  return (
    <div data-no-drag>
      <div className="flex flex-wrap gap-1">
        {sections.map((s) => (
          <button
            key={s}
            type="button"
            onClick={() => setSection(s)}
            className={`rounded-md border px-2 py-0.5 text-[0.7rem] ${section === s ? "border-[var(--outpost-accent)] text-[var(--outpost-accent)]" : "border-white/15 text-slate-400"}`}
          >
            {s === "journal"
              ? `Journal (${e.journal.length})`
              : s === "lore"
                ? `Lore (${loreCount})`
                : s === "camp"
                  ? `Camp log (${e.campLog.length})`
                  : s === "before"
                  ? "Before words"
                  : s === "you"
                    ? "What you told it"
                    : "Replay"}
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
          {loreCount === 0 && <p className="text-xs text-slate-500">Nothing written about the Outpost yet.</p>}
          {Array.from({ length: e.loreRevealedRank }, (_, i) => e.loreRevealedRank - i).map((rank) => (
            <p key={rank} className="text-xs italic text-slate-400">
              {loreEntry(rank)}
            </p>
          ))}
          {/* The Outpost's own lore, a line per level (once the Progress tab's "Outpost Logbook"). */}
          {levelLore.length > 0 && (
            <>
              <p className="pt-1 text-[0.6rem] font-bold uppercase tracking-wider text-white/40">The Outpost, by level</p>
              {levelLore.map((lvl) => (
                <p key={`lv${lvl}`} className="text-xs text-slate-400">
                  <span className="mr-1.5 font-semibold text-white/40">Lv.{lvl}</span>
                  {loreSnippetForLevel(lvl)}
                </p>
              ))}
            </>
          )}
        </div>
      )}

      {section === "camp" && (
        <ul className="mt-2 max-h-64 space-y-1 overflow-y-auto pr-1">
          {e.campLog.length === 0 && <li className="text-xs text-slate-500">Nothing&apos;s happened out at camp yet. It will.</li>}
          {e.campLog.map((entry, i) => (
            <li key={`${entry.at}-${i}`} className="flex gap-2 text-xs text-slate-300">
              <span className="shrink-0 font-mono text-white/30">
                {new Date(entry.at).toLocaleDateString(undefined, { month: "short", day: "numeric" })}
              </span>
              <span>{entry.text}</span>
            </li>
          ))}
        </ul>
      )}

      {section === "before" && (
        <ul className="mt-2 max-h-64 space-y-1.5 overflow-y-auto pr-1">
          {whispers.map((w) => {
            const source = whisperSource(e, w);
            return (
              <li key={w.text} className="text-xs">
                <span className="font-serif italic text-slate-400">{w.text}</span>
                {source && <span className="ml-2 text-[var(--outpost-accent)]">{source}</span>}
              </li>
            );
          })}
        </ul>
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
          {/* Tutorials switched off (GuidedHighlight.tsx) can't replay until they're back on. */}
          {e.tutorialsOff ? (
            <p className="text-[0.65rem] text-slate-500">
              Tutorials are off. Turn them back on in the Outpost&rsquo;s settings menu to replay them.
            </p>
          ) : (
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
          )}
        </div>
      )}
    </div>
  );
}
