// Chooses the next thing for the Engine to say, weighted by stage — the
// "what's inside the card" half of simple-at-first, deeper-later.
import type { Mod } from "@/lib/mods";
import { modFactsFor } from "./content/mod-facts";
import { LIVE_TEMPLATES, type LiveCtx } from "./content/live";
import {
  BELIEF_LINES,
  BODY_LINES,
  END_LINES,
  PARAGRAPHS,
  STAGE1_LINES,
  STAGE2_FORKS,
  type ForkDef,
} from "./content/puzzles";
import type { BeliefAxis, EngineStage } from "./types";

export type Puzzle =
  | { kind: "tiles" | "modFact" | "live"; id: string; solution: string[] }
  | { kind: "fork"; id: string; fork: ForkDef }
  | { kind: "paragraph"; id: string; solution: string[] };

export type PickCtx = {
  stage: EngineStage;
  modsRead: Mod[];
  live: LiveCtx;
  belief: BeliefAxis | null;
  night: boolean;
  /** Recently shown ids, avoided when possible. */
  recent: string[];
};

type Bucket = { weight: number; items: Puzzle[] };

function avoidRecent(items: Puzzle[], recent: string[]): Puzzle[] {
  const fresh = items.filter((p) => !recent.includes(p.id));
  return fresh.length > 0 ? fresh : items;
}

export function pickPuzzle(ctx: PickCtx, rand: () => number): Puzzle {
  const s1: Puzzle[] = STAGE1_LINES.map((l) => ({ kind: "tiles", id: l.id, solution: l.solution }));
  const forks: Puzzle[] = STAGE2_FORKS.map((f) => ({ kind: "fork", id: f.id, fork: f }));
  const mods: Puzzle[] = ctx.modsRead.flatMap((m) => modFactsFor(m).map((f) => ({ kind: "modFact" as const, ...f })));
  const live: Puzzle[] = LIVE_TEMPLATES.filter((t) => t.minStage <= ctx.stage)
    .map((t) => {
      const solution = t.build(ctx.live);
      return solution ? ({ kind: "live", id: t.id, solution } as Puzzle) : null;
    })
    .filter((p): p is Puzzle => p !== null);
  const body: Puzzle[] = BODY_LINES.filter((l) => l.night === undefined || l.night === ctx.night).map((l) => ({
    kind: "tiles",
    id: l.id,
    solution: l.solution,
  }));
  const belief: Puzzle[] = ctx.belief
    ? BELIEF_LINES[ctx.belief].map((l) => ({ kind: "tiles", id: l.id, solution: l.solution }))
    : [];
  const end: Puzzle[] = END_LINES.map((l) => ({ kind: "tiles", id: l.id, solution: l.solution }));
  const paragraphs: Puzzle[] = PARAGRAPHS.map((p) => ({ kind: "paragraph", id: p.id, solution: p.sentences }));

  let buckets: Bucket[];
  switch (ctx.stage) {
    case 1:
      buckets = [{ weight: 1, items: s1 }];
      break;
    case 2:
      buckets = [
        { weight: 0.6, items: forks },
        { weight: 0.4, items: s1 },
      ];
      break;
    case 3:
      buckets = [
        { weight: 0.45, items: mods },
        { weight: 0.25, items: live },
        { weight: 0.3, items: forks },
      ];
      break;
    case 4:
    case 5:
    case 6:
      buckets = [
        { weight: 0.3, items: live },
        { weight: 0.3, items: mods },
        { weight: 0.4, items: body },
      ];
      break;
    case 7:
      buckets = [
        { weight: 0.35, items: belief },
        { weight: 0.2, items: live },
        { weight: 0.2, items: mods },
        { weight: 0.25, items: body },
      ];
      break;
    default:
      buckets = [
        { weight: 0.25, items: paragraphs },
        { weight: 0.35, items: end },
        { weight: 0.15, items: belief },
        { weight: 0.15, items: mods },
        { weight: 0.1, items: live },
      ];
  }
  const usable = buckets.filter((b) => b.items.length > 0);
  if (usable.length === 0) return s1[0];
  const total = usable.reduce((a, b) => a + b.weight, 0);
  let r = rand() * total;
  let chosen = usable[usable.length - 1];
  for (const b of usable) {
    if (r < b.weight) {
      chosen = b;
      break;
    }
    r -= b.weight;
  }
  const pool = avoidRecent(chosen.items, ctx.recent);
  return pool[Math.floor(rand() * pool.length) % pool.length];
}
