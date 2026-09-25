import { describe, expect, it } from "vitest";
import { ALPHABET, buildCipher, decodeMap, isSolved, keywordAlphabet, keywordGuesses, renderAttempt, revealOne } from "./ciphers";
import type { CipherCurrent } from "./types";

const TEXT = "A CRANK TURNS A GEARBOX AND A GEARBOX TURNS THE WORLD";

function cur(over: Partial<CipherCurrent> = {}): CipherCurrent {
  return { id: "x", kind: "sub", seed: 1, guesses: {}, dials: [0, 0], hintsUsed: 0, startedAt: "", ...over };
}

describe("substitution", () => {
  it("is deterministic per seed and a derangement", () => {
    const a = buildCipher("bp", "sub", TEXT, 42, { givenRatio: 0.5 });
    const b = buildCipher("bp", "sub", TEXT, 42, { givenRatio: 0.5 });
    expect(a).toEqual(b);
    const values = Object.values(a.encode);
    expect(new Set(values).size).toBe(26);
    for (const ch of ALPHABET) expect(a.encode[ch]).not.toBe(ch);
    expect(buildCipher("bp", "sub", TEXT, 43).cipher).not.toBe(a.cipher);
  });

  it("gives roughly the requested share of distinct letters, never all", () => {
    const p = buildCipher("bp", "sub", TEXT, 7, { givenRatio: 0.7 });
    const distinct = new Set(TEXT.replace(/[^A-Z]/g, "")).size;
    expect(p.given.length).toBe(Math.min(distinct - 1, Math.round(distinct * 0.7)));
    expect(p.given.length).toBeLessThan(distinct);
  });

  it("solves when every letter is guessed right, and revealOne converges", () => {
    const p = buildCipher("bp", "sub", TEXT, 9, { givenRatio: 0.3 });
    let c = cur();
    expect(isSolved(p, c)).toBe(false);
    for (let i = 0; i < 30 && !isSolved(p, c); i++) c = revealOne(p, c);
    expect(isSolved(p, c)).toBe(true);
    expect(renderAttempt(p, c)).toBe(TEXT);
    expect(c.guesses).toEqual(expect.objectContaining({}));
    const truth = decodeMap(p);
    for (const [k, v] of Object.entries(c.guesses)) expect(truth[k]).toBe(v);
  });
});

describe("caesar dials", () => {
  it("round-trips with the right dial", () => {
    const p = buildCipher("bp", "caesar", TEXT, 5);
    expect(p.shifts[0]).toBeGreaterThanOrEqual(1);
    expect(p.shifts[0]).toBeLessThanOrEqual(25);
    expect(isSolved(p, cur({ dials: [p.shifts[0]] }))).toBe(true);
    expect(renderAttempt(p, cur({ dials: [p.shifts[0]] }))).toBe(TEXT);
    expect(isSolved(p, cur({ dials: [p.shifts[0] + 26] }))).toBe(true);
    expect(isSolved(p, cur({ dials: [p.shifts[0] + 1] }))).toBe(false);
    expect(p.crib && TEXT.includes(p.crib)).toBeTruthy();
  });

  it("two-gear cipher needs both dials", () => {
    const p = buildCipher("bp", "caesar2", TEXT, 11);
    expect(p.shifts).toHaveLength(2);
    expect(p.shifts[0]).not.toBe(p.shifts[1]);
    expect(isSolved(p, cur({ dials: [p.shifts[0], 0] }))).toBe(false);
    expect(renderAttempt(p, cur({ dials: p.shifts }))).toBe(TEXT);
    let c = cur();
    c = revealOne(p, c);
    c = revealOne(p, c);
    expect(isSolved(p, c)).toBe(true);
  });
});

describe("keyword", () => {
  it("mixes the alphabet behind the keyword and decodes when typed", () => {
    expect(keywordAlphabet("SOULFORGE").slice(0, 7).join("")).toBe("SOULFRG");
    const p = buildCipher("bp", "keyword", TEXT, 3, { keyword: "SOULFORGE" });
    expect(p.given).toEqual([]);
    expect(keywordGuesses(p, "wrong")).toBeNull();
    const g = keywordGuesses(p, " soulforge ");
    expect(g).not.toBeNull();
    expect(isSolved(p, cur({ guesses: g! }))).toBe(true);
  });
});
