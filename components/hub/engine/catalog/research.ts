// The Engine's research tree — one-time insight purchases, Cookie-Clicker
// scale (~100). Two families:
// - Per-component doublers, generated: 9 components x 7 owned-count
//   thresholds, each doubling that component's output.
// - Hand-written specials: crank, bursts, Eureka, offline, power,
//   attachments, and a few "mind" upgrades.
// Research is part of the Engine's mind — it survives prestige.
import type { ComponentId, EngineStage } from "../types";
import { COMPONENTS } from "./components";

export type ResearchEffect =
  | { kind: "compMult"; component: ComponentId; mult: number }
  | { kind: "globalPct"; pct: number }
  | { kind: "clickPct"; pct: number }
  | { kind: "crankSpeed"; mult: number }
  | { kind: "puzzleBurst"; pct: number }
  | { kind: "cipherBurst"; pct: number }
  | { kind: "cipherGiven"; letters: number }
  | { kind: "eurekaInterval"; mult: number }
  | { kind: "eurekaLife"; sec: number }
  | { kind: "frenzyLength"; sec: number }
  | { kind: "offlineEff"; add: number }
  | { kind: "thaw" }
  | { kind: "sourcePct"; pct: number }
  | { kind: "gearboxCap"; add: number }
  | { kind: "sawPct"; pct: number }
  | { kind: "millPct"; pct: number }
  | { kind: "detectorCharges"; add: number }
  | { kind: "detectorRecharge"; mult: number }
  | { kind: "bellowsPct"; pct: number }
  | { kind: "lorePct"; pct: number }
  | { kind: "governSky" };

export type ResearchDef = {
  id: string;
  name: string;
  description: string;
  cost: number;
  stage: EngineStage;
  /** For component doublers: owned count required to buy (and half of it to reveal). */
  requires?: { component: ComponentId; owned: number };
  effect: ResearchEffect;
};

const DOUBLER_THRESHOLDS = [1, 5, 25, 50, 100, 150, 200];
const DOUBLER_COST_MULTS = [10, 50, 500, 5e4, 5e6, 5e8, 5e10];
const DOUBLER_ADJECTIVES = ["Oiled", "Reinforced", "Balanced", "Tempered", "Precision", "Masterwork", "Soulbound"];

const DOUBLERS: ResearchDef[] = COMPONENTS.flatMap((c) =>
  DOUBLER_THRESHOLDS.map((owned, i) => ({
    id: `r-${c.id}-${i + 1}`,
    name: `${DOUBLER_ADJECTIVES[i]} ${c.name}`,
    description: `${c.name}s think twice as fast.`,
    cost: c.baseCost * DOUBLER_COST_MULTS[i],
    stage: c.stage,
    requires: { component: c.id, owned },
    effect: { kind: "compMult" as const, component: c.id, mult: 2 },
  }))
);

const SPECIALS: ResearchDef[] = [
  // Crank
  { id: "r-crank-1", name: "Longer Crank Arm", description: "Each revolution also yields 1% of insight/sec.", cost: 500, stage: 4, effect: { kind: "clickPct", pct: 1 } },
  { id: "r-crank-pawl", name: "Ratchet Pawl", description: "The crank turns 20% faster.", cost: 2_000, stage: 4, effect: { kind: "crankSpeed", mult: 0.8 } },
  { id: "r-crank-2", name: "Weighted Handle", description: "+1% of insight/sec per revolution.", cost: 5_000, stage: 4, effect: { kind: "clickPct", pct: 1 } },
  { id: "r-crank-3", name: "Flywheel Crank", description: "+2% of insight/sec per revolution.", cost: 500_000, stage: 5, effect: { kind: "clickPct", pct: 2 } },
  { id: "r-crank-4", name: "Geared Crank", description: "+2% of insight/sec per revolution.", cost: 5e7, stage: 6, effect: { kind: "clickPct", pct: 2 } },
  { id: "r-crank-5", name: "Soulforged Crank", description: "+2% of insight/sec per revolution.", cost: 5e9, stage: 7, effect: { kind: "clickPct", pct: 2 } },
  { id: "r-crank-6", name: "The Hand That Turns", description: "+2% of insight/sec per revolution.", cost: 5e11, stage: 8, effect: { kind: "clickPct", pct: 2 } },
  // Bursts
  { id: "r-burst-1", name: "Second Draft", description: "Solved sentences are worth 50% more.", cost: 300, stage: 4, effect: { kind: "puzzleBurst", pct: 50 } },
  { id: "r-burst-2", name: "Marginalia", description: "Solved sentences are worth 50% more.", cost: 100_000, stage: 5, effect: { kind: "puzzleBurst", pct: 50 } },
  { id: "r-burst-3", name: "Footnotes", description: "Solved sentences are worth 50% more.", cost: 1e9, stage: 7, effect: { kind: "puzzleBurst", pct: 50 } },
  { id: "r-cipher-1", name: "Frequency Tables", description: "Decoded blueprints are worth 50% more.", cost: 5_000, stage: 4, effect: { kind: "cipherBurst", pct: 50 } },
  { id: "r-given-1", name: "Crib Sheet", description: "Ciphers start with one more letter given.", cost: 3_000, stage: 4, effect: { kind: "cipherGiven", letters: 1 } },
  { id: "r-given-2", name: "Codebreaker's Ledger", description: "Ciphers start with one more letter given.", cost: 1e7, stage: 6, effect: { kind: "cipherGiven", letters: 1 } },
  // Eureka
  { id: "r-eureka-1", name: "Loose Thoughts", description: "Eureka sparks come 10% more often.", cost: 10_000, stage: 4, effect: { kind: "eurekaInterval", mult: 0.9 } },
  { id: "r-eureka-2", name: "Idle Hands", description: "Eureka sparks come 10% more often.", cost: 1e6, stage: 5, effect: { kind: "eurekaInterval", mult: 0.9 } },
  { id: "r-eureka-3", name: "Restless Gears", description: "Eureka sparks come 10% more often.", cost: 1e9, stage: 7, effect: { kind: "eurekaInterval", mult: 0.9 } },
  { id: "r-eureka-life", name: "Slow Fuse", description: "Sparks linger 3 seconds longer.", cost: 500_000, stage: 5, effect: { kind: "eurekaLife", sec: 3 } },
  { id: "r-frenzy", name: "Runaway Train of Thought", description: "Frenzies last 10 seconds longer.", cost: 5e7, stage: 6, effect: { kind: "frenzyLength", sec: 10 } },
  // Offline
  { id: "r-offline-1", name: "Night Shift", description: "+10% insight earned while away.", cost: 1e6, stage: 6, effect: { kind: "offlineEff", add: 0.1 } },
  { id: "r-offline-2", name: "Unattended Gears", description: "+10% insight earned while away.", cost: 1e7, stage: 6, effect: { kind: "offlineEff", add: 0.1 } },
  { id: "r-offline-3", name: "Dreaming Machine", description: "+10% insight earned while away.", cost: 1e9, stage: 7, effect: { kind: "offlineEff", add: 0.1 } },
  { id: "r-offline-4", name: "It Never Sleeps", description: "+10% insight earned while away.", cost: 1e11, stage: 8, effect: { kind: "offlineEff", add: 0.1 } },
  { id: "r-thaw", name: "Paddle Scraper", description: "Water wheels keep turning through Winter Weather.", cost: 2e6, stage: 6, effect: { kind: "thaw" } },
  // Power
  { id: "r-source-1", name: "Canvas Sails", description: "Windmills and water wheels give 25% more power.", cost: 200_000, stage: 5, effect: { kind: "sourcePct", pct: 25 } },
  { id: "r-source-2", name: "Soulforged Bearings", description: "Windmills and water wheels give 25% more power.", cost: 5e9, stage: 7, effect: { kind: "sourcePct", pct: 25 } },
  { id: "r-gear-1", name: "Hardwood Teeth", description: "Gearboxes are rated for 2 more power.", cost: 100_000, stage: 5, effect: { kind: "gearboxCap", add: 2 } },
  { id: "r-gear-2", name: "Iron Teeth", description: "Gearboxes are rated for 2 more power.", cost: 5e7, stage: 6, effect: { kind: "gearboxCap", add: 2 } },
  { id: "r-gear-3", name: "Steel Teeth", description: "Gearboxes are rated for 2 more power.", cost: 1e10, stage: 7, effect: { kind: "gearboxCap", add: 2 } },
  // Attachments
  { id: "r-saw", name: "Sharpened Blade", description: "The Saw's bonus to Tree Mining is 50% stronger.", cost: 100_000, stage: 5, effect: { kind: "sawPct", pct: 50 } },
  { id: "r-mill", name: "Dressed Millstone", description: "The Millstone's bonuses are 50% stronger.", cost: 100_000, stage: 5, effect: { kind: "millPct", pct: 50 } },
  { id: "r-detector-1", name: "Second Sense", description: "The Detector Block holds one more charge.", cost: 1e7, stage: 6, effect: { kind: "detectorCharges", add: 1 } },
  { id: "r-detector-2", name: "Quick Study", description: "Detector charges refill twice as fast.", cost: 5e7, stage: 6, effect: { kind: "detectorRecharge", mult: 0.5 } },
  { id: "r-bellows", name: "Double-Chamber Bellows", description: "The Bellows keep the fire alive 50% longer still.", cost: 5e9, stage: 7, effect: { kind: "bellowsPct", pct: 50 } },
  // Mind
  { id: "r-global-1", name: "Punch-Card Memory", description: "+10% insight/sec.", cost: 1e6, stage: 5, effect: { kind: "globalPct", pct: 10 } },
  { id: "r-global-2", name: "Store Drum", description: "+15% insight/sec.", cost: 1e8, stage: 6, effect: { kind: "globalPct", pct: 15 } },
  { id: "r-global-3", name: "Mill Column", description: "+20% insight/sec.", cost: 1e10, stage: 7, effect: { kind: "globalPct", pct: 20 } },
  { id: "r-global-4", name: "Printing Apparatus", description: "+25% insight/sec.", cost: 1e12, stage: 8, effect: { kind: "globalPct", pct: 25 } },
  { id: "r-lore", name: "Reading Its Own Logbook", description: "+1% insight/sec per Logbook entry revealed.", cost: 5e6, stage: 6, effect: { kind: "lorePct", pct: 1 } },
  { id: "r-governor", name: "Celestial Governor", description: "The Engine may hold the sky still when you ask it to.", cost: 1e12, stage: 8, effect: { kind: "governSky" } },
];

export const RESEARCH: ResearchDef[] = [...SPECIALS, ...DOUBLERS];
export const RESEARCH_BY_ID: Record<string, ResearchDef> = Object.fromEntries(RESEARCH.map((r) => [r.id, r]));

export type ResearchEffects = {
  compMult: Record<ComponentId, number>;
  globalPct: number;
  /** Fraction of insight/sec added to every crank revolution. */
  clickFrac: number;
  crankSpeedMult: number;
  puzzleBurstMult: number;
  cipherBurstMult: number;
  cipherGiven: number;
  eurekaIntervalMult: number;
  eurekaLifeSec: number;
  frenzyBonusSec: number;
  offlineEffBonus: number;
  thawed: boolean;
  sourceMult: number;
  gearboxCapBonus: number;
  sawMult: number;
  millMult: number;
  detectorChargeBonus: number;
  detectorRechargeMult: number;
  bellowsMult: number;
  lorePct: number;
  governsSky: boolean;
};

export function researchEffects(owned: readonly string[]): ResearchEffects {
  const fx: ResearchEffects = {
    compMult: Object.fromEntries(COMPONENTS.map((c) => [c.id, 1])) as Record<ComponentId, number>,
    globalPct: 0,
    clickFrac: 0,
    crankSpeedMult: 1,
    puzzleBurstMult: 1,
    cipherBurstMult: 1,
    cipherGiven: 0,
    eurekaIntervalMult: 1,
    eurekaLifeSec: 0,
    frenzyBonusSec: 0,
    offlineEffBonus: 0,
    thawed: false,
    sourceMult: 1,
    gearboxCapBonus: 0,
    sawMult: 1,
    millMult: 1,
    detectorChargeBonus: 0,
    detectorRechargeMult: 1,
    bellowsMult: 1,
    lorePct: 0,
    governsSky: false,
  };
  for (const id of owned) {
    const def = RESEARCH_BY_ID[id];
    if (!def) continue;
    const e = def.effect;
    switch (e.kind) {
      case "compMult":
        fx.compMult[e.component] *= e.mult;
        break;
      case "globalPct":
        fx.globalPct += e.pct / 100;
        break;
      case "clickPct":
        fx.clickFrac += e.pct / 100;
        break;
      case "crankSpeed":
        fx.crankSpeedMult *= e.mult;
        break;
      case "puzzleBurst":
        fx.puzzleBurstMult += e.pct / 100;
        break;
      case "cipherBurst":
        fx.cipherBurstMult += e.pct / 100;
        break;
      case "cipherGiven":
        fx.cipherGiven += e.letters;
        break;
      case "eurekaInterval":
        fx.eurekaIntervalMult *= e.mult;
        break;
      case "eurekaLife":
        fx.eurekaLifeSec += e.sec;
        break;
      case "frenzyLength":
        fx.frenzyBonusSec += e.sec;
        break;
      case "offlineEff":
        fx.offlineEffBonus += e.add;
        break;
      case "thaw":
        fx.thawed = true;
        break;
      case "sourcePct":
        fx.sourceMult += e.pct / 100;
        break;
      case "gearboxCap":
        fx.gearboxCapBonus += e.add;
        break;
      case "sawPct":
        fx.sawMult += e.pct / 100;
        break;
      case "millPct":
        fx.millMult += e.pct / 100;
        break;
      case "detectorCharges":
        fx.detectorChargeBonus += e.add;
        break;
      case "detectorRecharge":
        fx.detectorRechargeMult *= e.mult;
        break;
      case "bellowsPct":
        fx.bellowsMult += e.pct / 100;
        break;
      case "lorePct":
        fx.lorePct += e.pct / 100;
        break;
      case "governSky":
        fx.governsSky = true;
        break;
    }
  }
  return fx;
}

// Cookie-Clicker style reveal: an upgrade shows up once you're halfway to
// being able to buy it, so the list grows a few entries at a time.
export function isResearchVisible(
  def: ResearchDef,
  stage: EngineStage,
  components: Partial<Record<ComponentId, number>>
): boolean {
  if (stage < def.stage) return false;
  if (!def.requires) return true;
  const have = components[def.requires.component] ?? 0;
  return have >= Math.max(1, Math.ceil(def.requires.owned / 2));
}

export function canBuyResearch(
  def: ResearchDef,
  stage: EngineStage,
  components: Partial<Record<ComponentId, number>>,
  owned: readonly string[],
  insight: number
): boolean {
  if (owned.includes(def.id)) return false;
  if (stage < def.stage) return false;
  if (def.requires && (components[def.requires.component] ?? 0) < def.requires.owned) return false;
  return insight >= def.cost;
}
