// Shared types for Ponder / The Analytical Engine (see the rework plan and
// state.ts for defaults). Pure data shapes only — no React, no storage — so
// every engine/*.ts module and its tests can import from here freely.

export type EngineStage = 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8;
export const ENGINE_STAGES: EngineStage[] = [1, 2, 3, 4, 5, 6, 7, 8];

export type BeliefAxis = "hardcore" | "homesteader" | "soulforger";
export const BELIEF_AXES: BeliefAxis[] = ["hardcore", "homesteader", "soulforger"];

/** 0 = North, 1 = East, 2 = South, 3 = West. */
export type Dir = 0 | 1 | 2 | 3;
export type Rot = 0 | 1 | 2 | 3;

export type GridPartType =
  | "axle"
  | "gearbox"
  | "handCrank"
  | "windmill"
  | "waterWheel"
  | "saw"
  | "millstone"
  | "detector"
  | "bellows"
  | "hibachi"
  | "sfAxle"
  | "sfGearbox";

export type PlacedPart = { uid: string; type: GridPartType; rot: Rot; broken?: boolean };

export type Terrain = "ground" | "water" | "core" | "rock";

export type EngineGrid = {
  w: number;
  h: number;
  cells: (PlacedPart | null)[];
  /** True once the player engaged the clutch — any edit disengages it. */
  clutch: boolean;
  /** Bumped on every edit, so cached solves can tell they're stale. */
  rev: number;
};

export type SolveWarningCode =
  | "obstructed"
  | "frozen"
  | "wrongFace"
  | "notWater"
  | "brownout"
  | "crankNeedsGearbox"
  | "backfedUnpowered";

export type PopReason = "chain" | "opposed" | "twoSources" | "overload";

export type SolveSummary = {
  /** Power left over for the Engine's core (and so its components). */
  corePU: number;
  /** Total power the working sources produced. */
  supplyPU: number;
  /** uids of attachments/consumers that received their full draw. */
  powered: string[];
  /** uids broken by this solve (or already broken going in). */
  broken: string[];
  warnings: { uid: string; code: SolveWarningCode }[];
  /** Working sources in this solve, for the gate checklist + visuals. */
  sources: { uid: string; type: GridPartType; pu: number }[];
};

export type ComponentId =
  | "hopper"
  | "dispenser"
  | "turntable"
  | "pulley"
  | "buddy"
  | "lens"
  | "kiln"
  | "soulUrn"
  | "enchanter";

export type CipherKind = "sub" | "caesar" | "caesar2" | "keyword";

export type CipherCurrent = {
  id: string;
  kind: CipherKind;
  seed: number;
  /** cipher letter -> the player's guessed plain letter (sub/keyword). */
  guesses: Record<string, string>;
  /** Dial positions for caesar (one) / caesar2 (two). */
  dials: number[];
  hintsUsed: number;
  startedAt: string;
};

export type EurekaKind = "frenzy" | "lucky" | "part" | "letter";

export type EngineCounterKey =
  | "cranks"
  | "pops"
  | "eurekasCaught"
  | "eurekasMissed"
  | "detectorUses"
  | "stokes"
  | "ciphersSolved"
  | "partsCrafted"
  | "soulforged"
  | "offlineCapped"
  | "skyHolds"
  | "componentsBought"
  | "commissionsDone"
  | "sawChops"
  | "millstoneMeals"
  | "asksAnswered"
  | "engages"
  | "cleanEngages"
  | "researchBought"
  | "nightSolves"
  | "welcomeBacks"
  | "starFound"
  | "companionHolds";

export type EngineCounters = Record<EngineCounterKey, number>;

export type CommissionKind = "counter" | "deliver" | "modsRead";

export type CommissionInstance = {
  tplId: string;
  kind: CommissionKind;
  /** For kind "counter": which counter is watched. */
  counter?: EngineCounterKey | "solvedCount";
  /** For kind "deliver": which resource to hand over. */
  resource?: string;
  target: number;
  /** Counter value when the commission was seeded — progress is the delta. */
  baseline: number;
  /** Reward, as seconds of the current insight/sec (floored by a stage flat amount). */
  rewardSec: number;
  rewardPart?: GridPartType;
  done: boolean;
  claimed: boolean;
};

export type DifferenceResult = { parts: number; pops: number; medal: "bronze" | "silver" | "gold" };

export type EnginePublic = {
  stage: EngineStage;
  title: string;
  ips: number;
  corePU: number;
  insight: number;
  updatedAt: string;
  /** Stage 8 + Celestial Governor research — the Engine may hold the sky against the theme lock. */
  governsSky: boolean;
  /** A keyword cipher is active, so off-Outpost fragment spots should reveal themselves. */
  keywordHunt: boolean;
  /** The header companion gear is unlocked. */
  companion: boolean;
  /** Keyword fragments already found, so off-Outpost spots can hide themselves again. */
  fragments: string[];
};

export type EngineState = {
  // ---------- MIND (survives prestige) ----------
  stage: EngineStage;
  stageEnteredAt: Partial<Record<EngineStage, string>>;
  ceremoniesSeen: number[];
  tutorialsSeen: string[];
  solvedCount: number;
  choicesMade: number;
  solvesByKind: { tiles: number; fork: number; modFact: number; live: number; paragraph: number };
  journal: string[];
  askAnswers: Record<string, string>;
  /** Question ids in the order answered — for the "same axis N in a row" secret. */
  askOrder: string[];
  beliefs: Record<BeliefAxis, number>;
  specialization: BeliefAxis | null;
  respecCount: number;
  specsTried: BeliefAxis[];
  blueprints: GridPartType[];
  ciphers: {
    solved: string[];
    keyFragments: string[];
    current: CipherCurrent | null;
  };
  loreRevealedRank: number;
  research: string[];
  modsRead: string[];
  /** The Letter (Stage 8's ending), once written. */
  letter: string[] | null;

  // ---------- ECONOMY (kept) ----------
  insight: number;
  lifetimeInsight: number;
  settledAt: string;
  ledgerDrumLevel: number;
  /** 1 = the original build; +1 per prestige rebuild. */
  mark: number;

  // ---------- BODY (reset on prestige) ----------
  components: Partial<Record<ComponentId, number>>;
  grid: EngineGrid;
  inventory: Partial<Record<GridPartType, number>>;
  /** Cached at engage time: steady power only, while cranking, while cranking fed. */
  solved: { idle: SolveSummary; cranked: SolveSummary; boosted: SolveSummary; rev: number } | null;
  hibachi: { litUntil: string | null };
  detector: { charges: number; chargedAt: string | null };

  // ---------- TIMERS ----------
  lastActiveAt: string;
  lastInteractAt: string;
  crankActiveUntil: string | null;
  crankBoostUntil: string | null;
  frenzy: { until: string; mult: number } | null;
  eureka: {
    nextAt: string | null;
    active: { id: string; kind: EurekaKind; cardId: string; expiresAt: string } | null;
  };
  welcomeBackPending: boolean;
  lastAway: { from: string; to: string; gained: number; capped: boolean; neglect: number } | null;

  // ---------- ENDGAME ----------
  commissions: {
    day: string;
    week: string;
    daily: CommissionInstance[];
    weekly: CommissionInstance | null;
  };
  difference: Record<string, DifferenceResult>;

  // ---------- COUNTERS ----------
  counters: EngineCounters;
  firstPopRefunded: boolean;

  // ---------- PUBLIC SNAPSHOT (read by off-Outpost pages) ----------
  public: EnginePublic;
};

/** Environment facts the pure logic needs but can't read itself. */
export type EngineEnv = {
  /** Winter Weather upgrade owned (freezes water wheels unless thawed). */
  winter: boolean;
  /** Site sky cycle active and currently night (bonus flavour only). */
  night: boolean;
  /** Site sky cycle active and at full moon (phase index 4). */
  fullMoon: boolean;
};
