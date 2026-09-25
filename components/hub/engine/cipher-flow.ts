// Which cipher the Engine is working on: the next blueprint it's allowed to
// recover at its stage, or — once every blueprint is decoded at Stage 8 —
// an endless practice cipher. Pure.
import type { ResearchEffects } from "./catalog/research";
import { buildCipher, type CipherPuzzle } from "./ciphers";
import { BLUEPRINTS, BLUEPRINTS_BY_ID, ENGINE_KEYWORD, PRACTICE_TEXTS } from "./content/blueprints";
import { hashString } from "./rng";
import type { CipherCurrent, CipherKind, EngineState } from "./types";

const PRACTICE_KINDS: CipherKind[] = ["sub", "caesar", "caesar2"];

export function nextCipherTarget(e: EngineState): { id: string; kind: CipherKind } | null {
  const bp = BLUEPRINTS.find((b) => b.stage <= e.stage && !e.ciphers.solved.includes(b.id));
  if (bp) return { id: bp.id, kind: bp.kind };
  if (e.stage < 8) return null;
  const n = e.ciphers.solved.filter((id) => id.startsWith("rep-")).length;
  return { id: `rep-${n}`, kind: PRACTICE_KINDS[n % PRACTICE_KINDS.length] };
}

export function cipherPlainText(id: string): string {
  if (BLUEPRINTS_BY_ID[id]) return BLUEPRINTS_BY_ID[id].text;
  const n = Number(id.replace("rep-", "")) || 0;
  return PRACTICE_TEXTS[n % PRACTICE_TEXTS.length];
}

export function cipherTitle(id: string): string {
  return BLUEPRINTS_BY_ID[id]?.title ?? "Practice page";
}

export function startCipher(e: EngineState, now: string): CipherCurrent | null {
  const target = nextCipherTarget(e);
  if (!target) return null;
  if (e.ciphers.current?.id === target.id) return e.ciphers.current;
  return {
    id: target.id,
    kind: target.kind,
    seed: hashString(`${target.id}:${e.mark}:${e.solvedCount}`),
    guesses: {},
    dials: [0, 0],
    hintsUsed: 0,
    startedAt: now,
  };
}

export function puzzleFor(cur: CipherCurrent, e: EngineState, fx: ResearchEffects): CipherPuzzle {
  const givenRatio = e.stage <= 3 ? 0.7 : 0.45;
  return buildCipher(cur.id, cur.kind, cipherPlainText(cur.id), cur.seed, {
    givenRatio,
    extraGiven: fx.cipherGiven,
    keyword: ENGINE_KEYWORD,
  });
}
