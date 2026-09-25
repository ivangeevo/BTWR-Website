// The Engine's lost blueprints arrive scrambled; decoding one teaches it how
// to build the next part. Four cipher kinds, escalating:
// - "sub": letter substitution, most letters given (Stages 3–4).
// - "caesar": one shift, solved by turning a gear dial (Stage 5).
// - "caesar2": alternating two-dial shift (Stages 6–7).
// - "keyword": keyword-mixed alphabet — no letters given, but typing the
//   keyword (pieced together from fragments hidden around the site)
//   decodes it outright (Stage 7).
// Everything is seeded, so a cipher reloads exactly as it was left.
import { mulberry32, seededShuffle } from "./rng";
import type { CipherCurrent, CipherKind } from "./types";

export const ALPHABET = "ABCDEFGHIJKLMNOPQRSTUVWXYZ";

export type CipherPuzzle = {
  id: string;
  kind: CipherKind;
  plain: string;
  cipher: string;
  /** plain letter -> cipher letter. */
  encode: Record<string, string>;
  /** Plain letters shown from the start (sub/keyword). */
  given: string[];
  /** caesar: [shift]; caesar2: [shift for even letters, shift for odd letters]. */
  shifts: number[];
  /** caesar: one word shown already decoded. */
  crib: string | null;
  keyword: string | null;
};

function letters(s: string): string[] {
  return [...new Set(s.replace(/[^A-Z]/g, "").split(""))];
}

function shiftLetter(ch: string, k: number): string {
  const i = ALPHABET.indexOf(ch);
  if (i < 0) return ch;
  return ALPHABET[(((i + k) % 26) + 26) % 26];
}

// A derangement (no letter maps to itself), so a substitution never leaves
// any letter looking already-solved.
function derangement(rand: () => number): string[] {
  for (let tries = 0; tries < 100; tries++) {
    const perm = seededShuffle(ALPHABET.split(""), rand);
    if (perm.every((c, i) => c !== ALPHABET[i])) return perm;
  }
  return ALPHABET.split("").map((_, i) => ALPHABET[(i + 1) % 26]);
}

export function keywordAlphabet(keyword: string): string[] {
  const seen = new Set<string>();
  const out: string[] = [];
  for (const ch of (keyword.toUpperCase() + ALPHABET).replace(/[^A-Z]/g, "")) {
    if (!seen.has(ch)) {
      seen.add(ch);
      out.push(ch);
    }
  }
  return out;
}

export function buildCipher(
  id: string,
  kind: CipherKind,
  plainText: string,
  seed: number,
  opts: { givenRatio?: number; extraGiven?: number; keyword?: string } = {}
): CipherPuzzle {
  const plain = plainText.toUpperCase();
  const rand = mulberry32(seed);
  const encode: Record<string, string> = {};
  let shifts: number[] = [];
  let crib: string | null = null;
  let given: string[] = [];

  if (kind === "sub" || kind === "keyword") {
    const mixed = kind === "keyword" ? keywordAlphabet(opts.keyword ?? "ENGINE") : derangement(rand);
    ALPHABET.split("").forEach((ch, i) => (encode[ch] = mixed[i]));
    const distinct = letters(plain);
    const ratio = kind === "keyword" ? 0 : opts.givenRatio ?? 0.5;
    const n = Math.min(distinct.length - 1, Math.round(distinct.length * ratio) + (opts.extraGiven ?? 0));
    given = seededShuffle(distinct, rand).slice(0, Math.max(0, n));
  } else if (kind === "caesar") {
    shifts = [1 + Math.floor(rand() * 25)];
    const words = plain.split(" ").filter((w) => w.length >= 3);
    crib = words.length ? words[Math.floor(rand() * words.length)] : null;
  } else {
    const a = 1 + Math.floor(rand() * 25);
    let b = 1 + Math.floor(rand() * 25);
    if (b === a) b = (b % 25) + 1;
    shifts = [a, b];
  }

  let letterIndex = 0;
  const cipher = plain
    .split("")
    .map((ch) => {
      if (!/[A-Z]/.test(ch)) return ch;
      const i = letterIndex++;
      if (kind === "sub" || kind === "keyword") return encode[ch];
      if (kind === "caesar") return shiftLetter(ch, shifts[0]);
      return shiftLetter(ch, shifts[i % 2]);
    })
    .join("");

  return { id, kind, plain, cipher, encode, given, shifts, crib, keyword: kind === "keyword" ? (opts.keyword ?? "ENGINE").toUpperCase() : null };
}

/** The plain letter each cipher letter stands for (sub/keyword). */
export function decodeMap(p: CipherPuzzle): Record<string, string> {
  const out: Record<string, string> = {};
  for (const [plain, c] of Object.entries(p.encode)) out[c] = plain;
  return out;
}

/** What the player currently sees, "_" for unknown letters. */
export function renderAttempt(p: CipherPuzzle, cur: Pick<CipherCurrent, "guesses" | "dials">): string {
  if (p.kind === "sub" || p.kind === "keyword") {
    const truth = decodeMap(p);
    return p.cipher
      .split("")
      .map((c) => {
        if (!/[A-Z]/.test(c)) return c;
        const plain = truth[c];
        if (p.given.includes(plain)) return plain;
        return cur.guesses[c] ?? "_";
      })
      .join("");
  }
  let letterIndex = 0;
  return p.cipher
    .split("")
    .map((c) => {
      if (!/[A-Z]/.test(c)) return c;
      const i = letterIndex++;
      const d = p.kind === "caesar" ? cur.dials[0] ?? 0 : cur.dials[i % 2] ?? 0;
      return shiftLetter(c, -d);
    })
    .join("");
}

export function isSolved(p: CipherPuzzle, cur: Pick<CipherCurrent, "guesses" | "dials">): boolean {
  if (p.kind === "sub" || p.kind === "keyword") return renderAttempt(p, cur) === p.plain;
  if (p.kind === "caesar") return (((cur.dials[0] ?? 0) % 26) + 26) % 26 === p.shifts[0];
  return (
    (((cur.dials[0] ?? 0) % 26) + 26) % 26 === p.shifts[0] &&
    (((cur.dials[1] ?? 0) % 26) + 26) % 26 === p.shifts[1]
  );
}

/** Typing the right keyword decodes a keyword cipher outright. */
export function keywordGuesses(p: CipherPuzzle, keyword: string): Record<string, string> | null {
  if (p.kind !== "keyword" || !p.keyword) return null;
  if (keyword.trim().toUpperCase() !== p.keyword) return null;
  return decodeMap(p);
}

/** Reveals one not-yet-correct letter (Eureka "cipher letter", hints). */
export function revealOne(p: CipherPuzzle, cur: CipherCurrent): CipherCurrent {
  if (p.kind === "sub" || p.kind === "keyword") {
    const truth = decodeMap(p);
    const wrong = [...new Set(p.cipher.replace(/[^A-Z]/g, "").split(""))].filter(
      (c) => !p.given.includes(truth[c]) && cur.guesses[c] !== truth[c]
    );
    if (wrong.length === 0) return cur;
    const c = wrong.sort()[0];
    return { ...cur, guesses: { ...cur.guesses, [c]: truth[c] }, hintsUsed: cur.hintsUsed + 1 };
  }
  const dials = [...cur.dials];
  for (let i = 0; i < p.shifts.length; i++) {
    if ((((dials[i] ?? 0) % 26) + 26) % 26 !== p.shifts[i]) {
      dials[i] = p.shifts[i];
      return { ...cur, dials, hintsUsed: cur.hintsUsed + 1 };
    }
  }
  return cur;
}
