// The Engine's save slice: defaults, a tolerant loader, what a prestige
// keeps vs. dismantles, and the small public snapshot other pages read.
import { stageTitle } from "./stages";
import type {
  BeliefAxis,
  EngineCounterKey,
  EngineCounters,
  EnginePublic,
  EngineStage,
  EngineState,
  SolveSummary,
} from "./types";

const COUNTER_KEYS: EngineCounterKey[] = [
  "cranks",
  "pops",
  "eurekasCaught",
  "eurekasMissed",
  "detectorUses",
  "stokes",
  "ciphersSolved",
  "partsCrafted",
  "soulforged",
  "offlineCapped",
  "skyHolds",
  "componentsBought",
  "commissionsDone",
  "sawChops",
  "millstoneMeals",
  "asksAnswered",
  "engages",
  "cleanEngages",
  "researchBought",
  "nightSolves",
  "welcomeBacks",
  "starFound",
  "companionHolds",
];

export function defaultCounters(): EngineCounters {
  return Object.fromEntries(COUNTER_KEYS.map((k) => [k, 0])) as EngineCounters;
}

export function emptySummary(): SolveSummary {
  return { corePU: 0, supplyPU: 0, powered: [], broken: [], warnings: [], sources: [] };
}

export const JOURNAL_MAX = 40;

export function defaultEngineState(now: string = new Date(0).toISOString()): EngineState {
  return {
    stage: 1,
    stageEnteredAt: { 1: now },
    ceremoniesSeen: [1],
    tutorialsSeen: [],
    solvedCount: 0,
    choicesMade: 0,
    solvesByKind: { tiles: 0, fork: 0, modFact: 0, live: 0, paragraph: 0 },
    journal: [],
    askAnswers: {},
    askOrder: [],
    beliefs: { hardcore: 0, homesteader: 0, soulforger: 0 },
    specialization: null,
    respecCount: 0,
    specsTried: [],
    blueprints: [],
    ciphers: { solved: [], keyFragments: [], current: null },
    loreRevealedRank: 0,
    research: [],
    modsRead: [],
    letter: null,
    insight: 0,
    lifetimeInsight: 0,
    settledAt: now,
    ledgerDrumLevel: 0,
    mark: 1,
    components: {},
    grid: { w: 0, h: 0, cells: [], clutch: false, rev: 0 },
    inventory: {},
    solved: null,
    hibachi: { litUntil: null },
    detector: { charges: 0, chargedAt: null },
    lastActiveAt: now,
    lastInteractAt: now,
    crankActiveUntil: null,
    crankBoostUntil: null,
    frenzy: null,
    eureka: { nextAt: null, active: null },
    welcomeBackPending: false,
    lastAway: null,
    commissions: { day: "", week: "", daily: [], weekly: null },
    difference: {},
    counters: defaultCounters(),
    firstPopRefunded: false,
    public: {
      stage: 1,
      title: "Ponder",
      ips: 0,
      corePU: 0,
      insight: 0,
      updatedAt: now,
      governsSky: false,
      keywordHunt: false,
      companion: false,
      fragments: [],
    },
  };
}

function isObj(v: unknown): v is Record<string, unknown> {
  return typeof v === "object" && v !== null && !Array.isArray(v);
}

function arr<T>(v: unknown, fallback: T[]): T[] {
  return Array.isArray(v) ? (v as T[]) : fallback;
}

function num(v: unknown, fallback: number): number {
  return typeof v === "number" && Number.isFinite(v) ? v : fallback;
}

// Deep-ish merge over defaults, so a save from an older build of the Engine
// (missing newer nested fields) never crashes a consumer.
export function normalizeEngineState(raw: unknown): EngineState {
  const base = defaultEngineState();
  if (!isObj(raw)) return base;
  const r = raw as Partial<EngineState> & Record<string, unknown>;
  const stage = Math.min(8, Math.max(1, Math.floor(num(r.stage, 1)))) as EngineStage;
  const grid = isObj(r.grid)
    ? {
        w: num(r.grid.w, 0),
        h: num(r.grid.h, 0),
        cells: arr(r.grid.cells, []),
        clutch: !!r.grid.clutch,
        rev: num(r.grid.rev, 0),
      }
    : base.grid;
  if (grid.cells.length !== grid.w * grid.h) {
    grid.cells = Array.from({ length: grid.w * grid.h }, (_, i) => grid.cells[i] ?? null);
  }
  const solved =
    isObj(r.solved) && isObj(r.solved.idle) && isObj(r.solved.cranked) && isObj(r.solved.boosted)
      ? (r.solved as EngineState["solved"])
      : null;
  return {
    ...base,
    ...r,
    stage,
    stageEnteredAt: { ...base.stageEnteredAt, ...(isObj(r.stageEnteredAt) ? r.stageEnteredAt : {}) },
    ceremoniesSeen: arr(r.ceremoniesSeen, base.ceremoniesSeen),
    tutorialsSeen: arr(r.tutorialsSeen, []),
    solvedCount: num(r.solvedCount, 0),
    choicesMade: num(r.choicesMade, 0),
    solvesByKind: { ...base.solvesByKind, ...(isObj(r.solvesByKind) ? r.solvesByKind : {}) },
    journal: arr<string>(r.journal, []).slice(0, JOURNAL_MAX),
    askAnswers: isObj(r.askAnswers) ? (r.askAnswers as Record<string, string>) : {},
    askOrder: arr(r.askOrder, []),
    beliefs: { ...base.beliefs, ...(isObj(r.beliefs) ? r.beliefs : {}) },
    specialization: (["hardcore", "homesteader", "soulforger"] as (BeliefAxis | null)[]).includes(
      r.specialization as BeliefAxis
    )
      ? (r.specialization as BeliefAxis)
      : null,
    specsTried: arr(r.specsTried, []),
    blueprints: arr(r.blueprints, []),
    ciphers: {
      solved: arr(isObj(r.ciphers) ? r.ciphers.solved : [], []),
      keyFragments: arr(isObj(r.ciphers) ? r.ciphers.keyFragments : [], []),
      current: isObj(r.ciphers) && isObj(r.ciphers.current) ? (r.ciphers.current as EngineState["ciphers"]["current"]) : null,
    },
    research: arr(r.research, []),
    modsRead: arr(r.modsRead, []),
    letter: Array.isArray(r.letter) ? (r.letter as string[]) : null,
    insight: num(r.insight, 0),
    lifetimeInsight: num(r.lifetimeInsight, 0),
    ledgerDrumLevel: num(r.ledgerDrumLevel, 0),
    mark: Math.max(1, num(r.mark, 1)),
    components: isObj(r.components) ? (r.components as EngineState["components"]) : {},
    grid,
    inventory: isObj(r.inventory) ? (r.inventory as EngineState["inventory"]) : {},
    solved,
    hibachi: { ...base.hibachi, ...(isObj(r.hibachi) ? r.hibachi : {}) },
    detector: { ...base.detector, ...(isObj(r.detector) ? r.detector : {}) },
    eureka: { ...base.eureka, ...(isObj(r.eureka) ? r.eureka : {}) },
    commissions: { ...base.commissions, ...(isObj(r.commissions) ? r.commissions : {}) },
    difference: isObj(r.difference) ? (r.difference as EngineState["difference"]) : {},
    counters: { ...base.counters, ...(isObj(r.counters) ? r.counters : {}) },
    public: { ...base.public, ...(isObj(r.public) ? r.public : {}) },
  };
}

// Prestige keeps the Engine's mind (stage, insight, research, journal,
// beliefs, blueprints, ciphers, counters, endgame records) and dismantles its
// body (components, grid, parts, cached solves, running timers). Each rebuild
// from Stage 4 onward is a new Mark. `e` should already be settled.
export function engineOnPrestige(e: EngineState, now: string): EngineState {
  const hadBody = e.stage >= 4;
  return {
    ...e,
    mark: hadBody ? e.mark + 1 : e.mark,
    components: {},
    grid: { ...e.grid, cells: e.grid.cells.map(() => null), clutch: false, rev: e.grid.rev + 1 },
    inventory: {},
    solved: null,
    hibachi: { litUntil: null },
    detector: { charges: 0, chargedAt: null },
    frenzy: null,
    crankActiveUntil: null,
    crankBoostUntil: null,
    eureka: { nextAt: null, active: null },
    settledAt: now,
  };
}

export function publicSnapshot(
  e: EngineState,
  live: { ips: number; corePU: number },
  flags: { governsSky: boolean; keywordHunt: boolean },
  now: string
): EnginePublic {
  return {
    stage: e.stage,
    title: stageTitle(e.stage, e.mark),
    ips: live.ips,
    corePU: live.corePU,
    insight: e.insight,
    updatedAt: now,
    governsSky: flags.governsSky,
    keywordHunt: flags.keywordHunt,
    companion: e.stage >= 7,
    fragments: e.ciphers.keyFragments,
  };
}
