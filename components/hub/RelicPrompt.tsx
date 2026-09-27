"use client";

import Image from "next/image";
import { useEffect, useState } from "react";
import type { Mod } from "@/lib/mods";
import { useAchievements } from "./AchievementsProvider";
import { useEngineOptional } from "./engine/ui/EngineProvider";
import { strikeable, type RelicSource } from "./relics";
import type { ResourceId, ResourceState } from "./resources";

// The waiting relic (relics.ts), at the top of the Gathering section: its
// icon, four names, and the Engine's Detector Block to strike a wrong one.
// Naming it never waits on the rest timer and never blocks a trip; the
// answer stays up for a moment (with what it really was) after the relic
// itself is gone.

const RESULT_MS = 6000;

const FOUND: Record<RelicSource, string> = {
  wood: "Caught in the roots of a tree you felled.",
  hunting: "Half-buried where the hunt ended.",
  mining: "Wedged in the rock face.",
};

type Shown = { correct: boolean; mod: Mod | undefined; gain: Partial<ResourceState> };

function RelicIcon({ mod, blurred }: { mod: Mod | undefined; blurred: boolean }) {
  return (
    <div className="h-12 w-12 shrink-0 overflow-hidden rounded-lg bg-white/10">
      {mod?.iconUrl && (
        <Image
          src={mod.iconUrl}
          alt=""
          width={48}
          height={48}
          unoptimized
          style={{
            filter: blurred ? "blur(3px) sepia(0.6)" : "none",
            transition: "filter 300ms ease",
          }}
        />
      )}
    </div>
  );
}

export default function RelicPrompt() {
  const { relic, identifyRelic, strikeRelic, mods, resourceMeta, engineBuffs } = useAchievements();
  const engine = useEngineOptional();
  const [shown, setShown] = useState<Shown | null>(null);

  useEffect(() => {
    if (!shown) return;
    const id = window.setTimeout(() => setShown(null), RESULT_MS);
    return () => window.clearTimeout(id);
  }, [shown]);

  const byId = (id: string) => mods.find((m) => m.projectId === id);
  const formatGain = (gain: Partial<ResourceState>) =>
    (Object.entries(gain) as [ResourceId, number][]).map(([id, n]) => `${resourceMeta[id].icon} ${n}`).join("  ");

  if (shown && !relic) {
    return (
      <div
        className={`mt-2.5 flex items-center gap-2.5 rounded-md border p-2 ${
          shown.correct ? "border-emerald-500/60 bg-emerald-950/40" : "border-red-500/50 bg-red-950/30"
        }`}
        role="status"
      >
        <RelicIcon mod={shown.mod} blurred={false} />
        <div className="min-w-0 text-xs">
          <p className={`font-semibold ${shown.correct ? "text-emerald-300" : "text-red-300"}`}>
            {shown.correct ? "Named it: " : "It crumbled. It was "}
            {shown.mod?.name ?? "an unknown mod"}
          </p>
          <p className="mt-0.5 text-white/60">
            {shown.correct ? "Catalogued in the Field Guide. " : ""}+{formatGain(shown.gain)}
          </p>
        </div>
      </div>
    );
  }

  if (!relic) return null;

  const mod = byId(relic.modId);
  const canStrike = !!engine && engineBuffs.detectorPowered && strikeable(relic).length > 0;

  function pick(choiceId: string) {
    const result = identifyRelic(choiceId);
    if (result) setShown({ correct: result.correct, mod: byId(result.modId), gain: result.gain });
  }

  function detect() {
    if (!engine || strikeable(relic!).length === 0) return;
    if (engine.useDetector()) strikeRelic();
  }

  return (
    <section
      aria-label="Unidentified relic"
      className="mt-2.5 rounded-md border border-[var(--outpost-accent)] bg-white/5 p-2"
    >
      <div className="flex items-center gap-2.5">
        <RelicIcon mod={mod} blurred />
        <div className="min-w-0">
          <p className="text-xs font-semibold text-[var(--outpost-accent)]">{"\u{1F9FF}"} An unidentified relic</p>
          <p className="text-[11px] leading-snug text-white/50">{FOUND[relic.source]} Which mod is it from?</p>
        </div>
      </div>
      <div className="mt-2 grid grid-cols-2 gap-1.5">
        {relic.choices.map((id) => {
          const struck = relic.struck.includes(id);
          return (
            <button
              key={id}
              type="button"
              disabled={struck}
              onClick={() => pick(id)}
              className={`truncate rounded-md border px-2 py-1 text-left text-[11px] font-medium transition-colors ${
                struck
                  ? "border-white/5 text-white/25 line-through"
                  : "border-white/15 text-slate-200 hover:border-[var(--outpost-accent)] hover:bg-white/5"
              }`}
              title={byId(id)?.name}
            >
              {byId(id)?.name ?? "?"}
            </button>
          );
        })}
      </div>
      {engine && engineBuffs.detectorPowered && (
        <button
          type="button"
          onClick={detect}
          disabled={!canStrike || engine.e.detector.charges < 1}
          className="mt-1.5 w-full rounded-md border border-white/15 px-2 py-1 text-[11px] text-slate-300 transition-colors hover:border-[var(--outpost-accent)] disabled:opacity-40"
          title="The Engine's Detector Block senses one wrong name"
        >
          {"\u{1F4E1}"} Detector: strike a wrong name ({engine.e.detector.charges}/{engineBuffs.detectorMaxCharges})
        </button>
      )}
    </section>
  );
}
