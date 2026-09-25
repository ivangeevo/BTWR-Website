// Eureka sparks — the Engine's golden cookies. A spark appears on some
// visible Outpost card every few minutes; clicking it inside its short life
// pays out. Night and the full moon make them more frequent (bonus flavour
// only — never required for anything).
import type { ResearchEffects } from "./catalog/research";
import type { EngineConfig } from "./config";
import type { EngineEnv, EurekaKind } from "./types";

export function nextEurekaDelayMs(cfg: EngineConfig, fx: ResearchEffects, env: EngineEnv, rand: () => number): number {
  const e = cfg.eureka;
  const lo = Math.min(e.minMinutes, e.maxMinutes);
  const hi = Math.max(e.minMinutes, e.maxMinutes);
  let minutes = lo + rand() * (hi - lo);
  minutes *= fx.eurekaIntervalMult;
  if (env.night) minutes *= e.nightFactor;
  if (env.fullMoon) minutes *= e.fullMoonFactor;
  return Math.max(15_000, minutes * 60_000);
}

export function rollEurekaKind(rand: () => number, canGivePart: boolean, hasCipher: boolean): EurekaKind {
  const r = rand();
  if (r < 0.5) return "frenzy";
  if (r < 0.8) return "lucky";
  if (r < 0.9) return canGivePart ? "part" : "lucky";
  return hasCipher ? "letter" : "lucky";
}

export function eurekaLifeMs(cfg: EngineConfig, fx: ResearchEffects): number {
  return (cfg.eureka.lifeSec + fx.eurekaLifeSec) * 1000;
}

export function luckyAmount(insight: number, ips: number, cfg: EngineConfig, env: EngineEnv): number {
  const raw = Math.min(insight * (cfg.eureka.luckyPct / 100), ips * cfg.eureka.luckyCapSec) + 13;
  return env.fullMoon ? raw * cfg.eureka.fullMoonRewardMult : raw;
}
