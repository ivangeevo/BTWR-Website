// The Engine's save slice: defaults, a tolerant loader, what a prestige
// keeps vs. dismantles, and the small public snapshot other pages read.
import { layoutFor, remapGrid } from "./grid/layouts";
import { stageTitle } from "./stages";
import type {
  BeliefAxis,
  CommissionInstance,
  EngineCounterKey,
  EngineCounters,
  EngineGrid,
  EnginePublic,
  EngineStage,
  EngineState,
  GridPartType,
  SolveSummary,
} from "./types";

// Commissions that no longer exist (cooking moved off the Engine; the
// Bellows no longer stoke the Campfire) — dropped from a saved day's list.
const RETIRED_COMMISSIONS = ["c-meal", "c-stoke"];

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
  "grinds",
  "millMines",
  "bellowsMines",
  "handYields",
  "mealsCooked",
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
  return { corePU: 0, supplyPU: 0, powered: [], grinding: 0, broken: [], warnings: [], sources: [] };
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

// Brings an older body up to date: the grid grew (5×5 / 6×6 / 7×7) and lost
// its fixed core, and every body starts from a hand crank + Millstone (both
// decoded at Stage 3). Anything that no longer fits goes back to the tray;
// a changed grid is disengaged so it's re-solved on the next engage.
const BODY_BLUEPRINTS: GridPartType[] = ["handCrank", "millstone"];

function migrateBody(
  stage: EngineStage,
  grid: EngineGrid,
  inventory: EngineState["inventory"],
  rawBlueprints: string[],
  rawSolvedCiphers: string[]
): { grid: EngineGrid; inventory: EngineState["inventory"]; blueprints: GridPartType[]; solvedCiphers: string[]; reset: boolean } {
  const blueprints = [...rawBlueprints] as GridPartType[];
  const solvedCiphers = [...rawSolvedCiphers];
  if (stage >= 4) {
    for (const t of BODY_BLUEPRINTS) {
      if (!blueprints.includes(t)) blueprints.push(t);
      if (!solvedCiphers.includes(`bp-${t}`)) solvedCiphers.push(`bp-${t}`);
    }
  }
  const inv = { ...inventory };
  let reset = false;
  let next: EngineGrid = grid;
  const layout = layoutFor(stage);
  // Re-lay the grid on every load: a new size, or a save from before big
  // sources spanned several squares, sends anything that no longer fits
  // back to the inventory.
  if (layout) {
    const r = remapGrid(grid, stage);
    if (grid.w !== layout.w || grid.h !== layout.h || r.returned.length > 0) {
      next = r.grid;
      for (const p of r.returned) inv[p.type] = (inv[p.type] ?? 0) + 1;
      reset = true;
    }
  }
  if (stage >= 4 && !next.cells.some((c) => c?.type === "handCrank") && !(inv.handCrank ?? 0)) inv.handCrank = 1;
  if (reset) next = { ...next, clutch: false, rev: next.rev + 1 };
  return { grid: next, inventory: inv, blueprints, solvedCiphers, reset };
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
  const cipherState: Record<string, unknown> = isObj(r.ciphers) ? r.ciphers : {};
  const migrated = migrateBody(
    stage,
    grid,
    isObj(r.inventory) ? (r.inventory as EngineState["inventory"]) : {},
    arr<string>(r.blueprints, []),
    arr<string>(cipherState.solved, [])
  );
  // A solve cached by an older build (no crank-turned summary, no Millstone
  // count, or from before power had to reach the core) is stale: disengage
  // so the next engage re-solves.
  const cached = isObj(r.solved) ? r.solved : null;
  const coreAware = (s: unknown) =>
    isObj(s) && Array.isArray(s.sources) && s.sources.every((x) => isObj(x) && typeof x.toCore === "boolean");
  const fresh =
    !!cached &&
    isObj(cached.idle) &&
    isObj(cached.cranked) &&
    typeof cached.idle.grinding === "number" &&
    coreAware(cached.idle) &&
    coreAware(cached.cranked) &&
    !migrated.reset;
  const solved: EngineState["solved"] = fresh
    ? { idle: cached.idle as SolveSummary, cranked: cached.cranked as SolveSummary, rev: num(cached.rev, 0) }
    : null;
  if (!fresh) migrated.grid = { ...migrated.grid, clutch: false };
  const current = isObj(cipherState.current) ? (cipherState.current as EngineState["ciphers"]["current"]) : null;
  const commissions = { ...base.commissions, ...(isObj(r.commissions) ? r.commissions : {}) };
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
    blueprints: migrated.blueprints,
    ciphers: {
      solved: migrated.solvedCiphers,
      keyFragments: arr(cipherState.keyFragments, []),
      current,
    },
    research: arr(r.research, []),
    modsRead: arr(r.modsRead, []),
    letter: Array.isArray(r.letter) ? (r.letter as string[]) : null,
    insight: num(r.insight, 0),
    lifetimeInsight: num(r.lifetimeInsight, 0),
    ledgerDrumLevel: num(r.ledgerDrumLevel, 0),
    mark: Math.max(1, num(r.mark, 1)),
    components: isObj(r.components) ? (r.components as EngineState["components"]) : {},
    grid: migrated.grid,
    inventory: migrated.inventory,
    solved,
    hibachi: { ...base.hibachi, ...(isObj(r.hibachi) ? r.hibachi : {}) },
    detector: { ...base.detector, ...(isObj(r.detector) ? r.detector : {}) },
    eureka: { ...base.eureka, ...(isObj(r.eureka) ? r.eureka : {}) },
    // The Millstone-meals commission is gone (the Millstone makes power now).
    commissions: { ...commissions, daily: arr<CommissionInstance>(commissions.daily, []).filter((c) => !RETIRED_COMMISSIONS.includes(c.tplId)) },
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
