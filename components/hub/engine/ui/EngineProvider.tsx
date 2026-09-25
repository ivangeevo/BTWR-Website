"use client";

// Ponder / The Analytical Engine's runtime. AchievementsProvider owns the
// engine slice's storage (engineRef + updateEngine, so no other save can
// clobber it); everything the Engine DOES lives here: the one-second clock
// (live numbers go to an external store, never React state), offline
// accrual on return, Eureka sparks, the grid's clutch, ciphers, stage gates,
// ceremonies, and draining events from pages outside the Outpost.
import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from "react";
import type { Mod } from "@/lib/mods";
import { useAchievements } from "../../AchievementsProvider";
import { CAMPFIRE_STAGES, currentCampfireStage } from "../../campfire-stage";
import { computeCyclePhase, isDayNightCycleActive, loadCycleStartedAt } from "../../day-night-cycle";
import { accrueDetector } from "../buffs";
import { COMPONENTS_BY_ID } from "../catalog/components";
import { canBuyResearch, researchEffects, RESEARCH_BY_ID, type ResearchEffects } from "../catalog/research";
import { cipherPlainText, puzzleFor, startCipher } from "../cipher-flow";
import { isSolved, keywordGuesses, revealOne } from "../ciphers";
import { commissionProgress, refreshCommissions } from "../commissions";
import { ASKS_BY_ID, dominantBelief } from "../content/asks";
import { BLUEPRINTS_BY_ID, KEY_FRAGMENTS } from "../content/blueprints";
import type { LiveCtx } from "../content/live";
import { LORE_FRAGMENT_RANK, loreRankForInsight } from "../content/lore";
import { JOURNAL_ASK_PREFIX } from "../content/puzzles";
import { eurekaLine, POP_LINES, revealLine, welcomeBackLine } from "../content/voice";
import { MODULES } from "../../module-registry";
import {
  bulkCost,
  cipherBurst,
  computeIps,
  corePUAt,
  crankRevValue,
  DRUM_COSTS,
  askReward,
  markDiscount,
  offlineAccrual,
  onlineGain,
  puzzleBurst,
  settle,
  stageFlat,
} from "../economy";
import { eurekaLifeMs, luckyAmount, nextEurekaDelayMs, rollEurekaKind } from "../eureka";
import { engageGrid } from "../grid/engage";
import { betterResult, DIFF_BY_ID, scoreChallenge, type DiffPart, type DiffScore } from "../grid/difference";
import { canPlaceOn, layoutFor, remapGrid } from "../grid/layouts";
import { PART_DEFS, STARTER_BLUEPRINTS } from "../grid/parts";
import {
  EVT_INBOX,
  EVT_MODS_READ,
  readEngineDebug,
  readInbox,
  readModsRead,
  removeInbox,
  setSkyHold,
  engineTabId,
  lockHeldElsewhere,
  writeEngineLock,
} from "../bridge-storage";
import { evaluateGate, stageTitle, type GateResult, type GateSite } from "../stages";
import { JOURNAL_MAX, publicSnapshot } from "../state";
import type {
  BeliefAxis,
  ComponentId,
  EngineEnv,
  EngineStage,
  EngineState,
  EurekaKind,
  GridPartType,
  PlacedPart,
  Rot,
} from "../types";
import { LiveStore } from "./live-store";

/** replay: shown again from the Logbook, so it doesn't re-announce the cards it revealed. */
export type CeremonyView = { kind: "stage"; stage: EngineStage; replay?: boolean } | { kind: "mark"; mark: number };
export type EngineToast = { id: string; text: string; tone: "info" | "good" | "warn" };

type EngineCtx = {
  e: EngineState;
  cfg: ReturnType<typeof useAchievements>["engineConfig"];
  fx: ResearchEffects;
  env: EngineEnv;
  store: LiveStore;
  mods: Mod[];
  title: string;
  gate: GateResult | null;
  knownParts: GridPartType[];
  liveCtx: () => LiveCtx;
  /** The inline full-width Workshop (Mind / Body / Works / Logbook). */
  workshopOpen: boolean;
  setWorkshopOpen: (open: boolean) => void;
  /** Whether the card spans both grid columns. */
  wide: boolean;
  /** Another browser tab is running the Engine; this one is hands-off. */
  passive: boolean;
  takeOver: () => void;
  ceremony: CeremonyView | null;
  showCeremony: (c: CeremonyView) => void;
  dismissCeremony: () => void;
  toasts: EngineToast[];
  toast: (text: string, tone?: EngineToast["tone"]) => void;
  // Mind
  solvePuzzle: (kind: "tiles" | "fork" | "modFact" | "live" | "paragraph", text: string, wasChoice: boolean) => number;
  answerAsk: (qid: string, oid: string) => void;
  finishLetter: (lines: string[]) => void;
  ensureCipher: () => void;
  cipherGuess: (cipherLetter: string, plain: string | null) => void;
  cipherDial: (index: number, value: number) => void;
  cipherKeyword: (word: string) => boolean;
  cipherHint: () => void;
  // Stage
  advance: () => boolean;
  // Clicker
  crankRev: () => number;
  feedCrank: () => boolean;
  buyComponent: (id: ComponentId, n: number) => boolean;
  buyResearch: (id: string) => boolean;
  upgradeDrum: () => boolean;
  // Body
  craftPart: (type: GridPartType) => boolean;
  partCost: (type: GridPartType) => Record<string, number>;
  placePart: (index: number, type: GridPartType) => boolean;
  rotatePart: (index: number) => void;
  removePart: (index: number) => void;
  engage: () => void;
  // Attachments & events
  catchEureka: () => void;
  useDetector: () => boolean;
  stokeCampfire: () => boolean;
  chooseSpec: (axis: BeliefAxis) => boolean;
  respecCost: () => number;
  claimCommission: (slot: number | "weekly") => boolean;
  deliverCommission: (slot: number | "weekly") => boolean;
  holdSky: () => boolean;
  submitDifference: (id: string, placed: DiffPart[]) => DiffScore | null;
  markTutorialSeen: (id: string) => void;
  replayTutorial: (id: string) => void;
  dismissAway: () => void;
};

const EngineContext = createContext<EngineCtx | null>(null);

const TICK_MS = 1000;
const CHECKPOINT_MS = 30_000;

function uid(): string {
  return `p${Date.now().toString(36)}${Math.random().toString(36).slice(2, 7)}`;
}

function iso(ms: number): string {
  return new Date(ms).toISOString();
}

function pushJournal(journal: string[], line: string): string[] {
  return [line, ...journal].slice(0, JOURNAL_MAX);
}

export function EngineProvider({ mods, children }: { mods: Mod[]; children: React.ReactNode }) {
  const a = useAchievements();
  const { mounted, engine: e, engineConfig: cfg, getEngine, updateEngine, spendResources } = a;
  const fx = useMemo(() => researchEffects(e.research), [e.research]);
  const storeRef = useRef<LiveStore>(new LiveStore());
  const [ceremony, setCeremony] = useState<CeremonyView | null>(null);
  const [toasts, setToasts] = useState<EngineToast[]>([]);
  const [envTick, setEnvTick] = useState(0);
  const [workshopOpen, setWorkshopOpen] = useState(false);
  // Another tab is running the Engine — this one stays hands-off (no clock,
  // no offline accrual) until the visitor chooses to run it here instead.
  const tabIdRef = useRef("");
  if (typeof window !== "undefined" && !tabIdRef.current) tabIdRef.current = engineTabId();
  const passiveRef = useRef(false);
  const [passive, setPassive] = useState(false);
  const takeOver = useCallback(() => {
    writeEngineLock(tabIdRef.current);
    window.location.reload();
  }, []);

  // Always-current copies for the clock and handlers, so callbacks stay stable.
  const cfgRef = useRef(cfg);
  cfgRef.current = cfg;
  const aRef = useRef(a);
  aRef.current = a;
  const modsRef = useRef(mods);
  modsRef.current = mods;

  const winter = a.upgrades.purchased.includes("snow");
  // Night/full moon only matter as bonus flavour — read off the site's sky
  // cycle (if the visitor owns it) plus any admin debug override.
  const env = useMemo<EngineEnv>(() => {
    const debug = readEngineDebug();
    let night = false;
    let fullMoon = false;
    if (typeof window !== "undefined" && isDayNightCycleActive()) {
      const phase = computeCyclePhase(loadCycleStartedAt());
      night = !phase.isDay;
      fullMoon = phase.moonPhaseIndex === 4;
    }
    return { winter, night: debug.forceNight ?? night, fullMoon: debug.forceFullMoon ?? fullMoon };
    // envTick re-reads the sky every checkpoint.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [winter, envTick]);
  const envRef = useRef(env);
  envRef.current = env;

  const toast = useCallback((text: string, tone: EngineToast["tone"] = "info") => {
    const id = uid();
    setToasts((prev) => [...prev.slice(-3), { id, text, tone }]);
    window.setTimeout(() => setToasts((prev) => prev.filter((t) => t.id !== id)), 5200);
  }, []);

  const fxOf = (s: EngineState) => researchEffects(s.research);

  // Every mutation: settle up to now first (so the old rate is banked), apply
  // the change, and mark the visitor as present (neglect clock + welcome-back).
  const act = useCallback(
    (fn: (s: EngineState, now: number) => EngineState, mode: "now" | "soon" = "now") => {
      updateEngine((prev) => {
        const now = Date.now();
        const c = cfgRef.current;
        let s = settle(prev, c, fxOf(prev), now);
        if (s.welcomeBackPending) {
          const ips = computeIps(s, c, fxOf(s), now).ips;
          const gift = Math.max(stageFlat(s.stage) * 5, ips * c.offline.welcomeBackSec) * (s.specialization === "hardcore" ? 2 : 1);
          s = {
            ...s,
            insight: s.insight + gift,
            lifetimeInsight: s.lifetimeInsight + gift,
            welcomeBackPending: false,
            counters: { ...s.counters, welcomeBacks: s.counters.welcomeBacks + 1 },
          };
          window.setTimeout(() => toast(welcomeBackLine(s.stage, s.specialization === "hardcore"), "good"), 0);
        }
        s = fn(s, now);
        // Keep the snapshot other pages read (Mods page, header gear, sky)
        // current right away, not just at the next 30s checkpoint.
        const f = fxOf(s);
        const pub = publicSnapshot(
          s,
          { ips: computeIps(s, c, f, now).ips, corePU: corePUAt(s, c, now) },
          { governsSky: f.governsSky && s.stage >= 8, keywordHunt: s.ciphers.current?.kind === "keyword" },
          iso(now)
        );
        return { ...s, lastInteractAt: iso(now), public: pub };
      }, mode);
    },
    [updateEngine, toast]
  );

  const grant = (s: EngineState, amount: number): EngineState => {
    const lifetimeInsight = s.lifetimeInsight + amount;
    return {
      ...s,
      insight: s.insight + amount,
      lifetimeInsight,
      loreRevealedRank: Math.max(s.loreRevealedRank, loreRankForInsight(lifetimeInsight)),
    };
  };

  const ipsNow = (s: EngineState, now: number) => computeIps(s, cfgRef.current, fxOf(s), now).ips;

  // --- Re-solve the grid when the world changes under it (winter, thaw, spec, research) ---
  const resolveKey = `${winter}|${fx.thawed}|${fx.sourceMult}|${fx.gearboxCapBonus}|${e.specialization}|${e.stage}`;
  useEffect(() => {
    if (!mounted) return;
    const s = getEngine();
    if (!s.grid.clutch || s.stage < 4) return;
    const r = engageGrid(s, envRef.current, cfgRef.current, fxOf(s), { refundFirstPop: false });
    if (!r) return;
    act((cur) => ({
      ...cur,
      grid: r.grid,
      solved: r.solved,
      counters: { ...cur.counters, pops: cur.counters.pops + r.pops.length },
    }));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [resolveKey, mounted]);

  // --- Mount: offline accrual, grid layout, mods read, commissions, first ceremony ---
  const didInitRef = useRef(false);
  useEffect(() => {
    if (!mounted || didInitRef.current) return;
    didInitRef.current = true;
    if (lockHeldElsewhere(tabIdRef.current)) {
      passiveRef.current = true;
      setPassive(true);
      return;
    }
    writeEngineLock(tabIdRef.current);
    const now = Date.now();
    const c = cfgRef.current;
    updateEngine((prev) => {
      let s = prev;
      // A brand-new Engine's clocks start at the epoch — anchor them to now,
      // or a first-time visitor would meet an Engine "neglected since 1970".
      if (new Date(s.settledAt).getTime() === 0) {
        const n = iso(now);
        s = { ...s, settledAt: n, lastActiveAt: n, lastInteractAt: n, stageEnteredAt: { ...s.stageEnteredAt, 1: n } };
      }
      // Offline: online rules up to the last heartbeat, capped offline rules after.
      const lastActive = new Date(s.lastActiveAt).getTime();
      const settledAt = new Date(s.settledAt).getTime();
      if (now - lastActive > c.offline.awayThresholdSec * 1000 && s.stage >= 3) {
        s = settle(s, c, fxOf(s), Math.max(settledAt, lastActive));
        const away = offlineAccrual(s, c, fxOf(s), Math.max(settledAt, lastActive), now);
        s = grant(s, away.gained);
        s = {
          ...s,
          settledAt: iso(now),
          lastAway:
            away.gained > 0 ? { from: iso(lastActive), to: iso(now), gained: away.gained, capped: away.capped, neglect: away.neglect } : s.lastAway,
          counters: { ...s.counters, offlineCapped: s.counters.offlineCapped + (away.capped && away.gained > 0 ? 1 : 0) },
        };
      } else {
        s = settle(s, c, fxOf(s), now);
      }
      const sinceInteract = (now - new Date(s.lastInteractAt).getTime()) / 3_600_000;
      const neglectHours = s.specialization === "hardcore" ? c.offline.hardcoreHours1 : c.offline.neglectHours1;
      if (s.solvedCount > 0 && sinceInteract >= neglectHours) s = { ...s, welcomeBackPending: true };
      // Grid matches the stage's layout.
      const layout = layoutFor(s.stage);
      if (layout && (s.grid.w !== layout.w || s.grid.h !== layout.h)) {
        const { grid, returned } = remapGrid(s.grid, s.stage);
        const inventory = { ...s.inventory };
        for (const p of returned) inventory[p.type] = (inventory[p.type] ?? 0) + 1;
        s = { ...s, grid: { ...grid, clutch: false }, inventory, solved: null };
      }
      // Mods read on the Mods page since last time.
      const read = readModsRead();
      if (read.some((slug) => !s.modsRead.includes(slug))) {
        s = { ...s, modsRead: [...new Set([...s.modsRead, ...read])] };
      }
      if (s.stage >= 8) s = { ...s, commissions: refreshCommissions(s, new Date(now), modsRef.current.length) };
      return { ...s, lastActiveAt: iso(now) };
    });
    const s = getEngine();
    if (!s.ceremoniesSeen.includes(s.stage) && s.stage > 1) setCeremony({ kind: "stage", stage: s.stage });
    else if (s.mark > 1 && !s.ceremoniesSeen.includes(100 + s.mark)) setCeremony({ kind: "mark", mark: s.mark });
    document.documentElement.dataset.engineLive = "1";
    return () => {
      delete document.documentElement.dataset.engineLive;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mounted]);

  // --- The Engine narrates the cards each new stage reveals ---
  // Runs as a stage's ceremony closes (not on a Logbook replay): a line in
  // the Engine's voice and a brief glow on each card that stage revealed.
  const narrateReveals = (stage: number) => {
    const newCards = MODULES.filter((m) => m.id !== "ponder" && a.isModuleEnabled(m.id) && a.moduleStage(m.id) === stage);
    newCards.forEach((m, i) => {
      const line = revealLine(m.id);
      window.setTimeout(() => {
        if (line) toast(line, "info");
        const el = document.querySelector<HTMLElement>(`[data-module-id="${m.id}"]`);
        if (el) {
          el.classList.add("engine-reveal-glow");
          window.setTimeout(() => el.classList.remove("engine-reveal-glow"), 2600);
        }
      }, 600 + i * 1400);
    });
  };
  const narrateRef = useRef(narrateReveals);
  narrateRef.current = narrateReveals;

  // --- Drain events from outside the Outpost (Mods page, header gear, sky) ---
  const drainRef = useRef<() => void>(() => {});
  drainRef.current = () => {
    const events = readInbox();
    const read = readModsRead();
    const s0 = getEngine();
    const newMods = read.filter((slug) => !s0.modsRead.includes(slug));
    if (events.length === 0 && newMods.length === 0) return;
    removeInbox(events.map((ev) => ev.id));
    act((s, now) => {
      let out: EngineState = newMods.length ? { ...s, modsRead: [...new Set([...s.modsRead, ...newMods])] } : s;
      for (const ev of events) {
        if (ev.type === "eureka") {
          out = grant(out, Math.max(stageFlat(out.stage) * 10, ipsNow(out, now) * 600));
          out = { ...out, counters: { ...out.counters, eurekasCaught: out.counters.eurekasCaught + 1 } };
        } else if (ev.type === "keyFragment" && out.stage >= 7) {
          const frag = String(ev.data?.frag ?? "");
          if (KEY_FRAGMENTS.some((f) => f.id === frag) && !out.ciphers.keyFragments.includes(frag)) {
            out = { ...out, ciphers: { ...out.ciphers, keyFragments: [...out.ciphers.keyFragments, frag] } };
          }
          if (ev.data?.via === "star") out = { ...out, counters: { ...out.counters, starFound: out.counters.starFound + 1 } };
        } else if (ev.type === "companionHold") {
          out = { ...out, counters: { ...out.counters, companionHolds: out.counters.companionHolds + 1 } };
          if (out.stage >= 7 && !out.ciphers.keyFragments.includes("frag-page")) {
            out = { ...out, ciphers: { ...out.ciphers, keyFragments: [...out.ciphers.keyFragments, "frag-page"] } };
          }
        } else if (ev.type === "skyHold") {
          out = { ...out, counters: { ...out.counters, skyHolds: out.counters.skyHolds + 1 } };
        }
      }
      return out;
    });
  };
  useEffect(() => {
    if (!mounted) return;
    const run = () => drainRef.current();
    run();
    window.addEventListener(EVT_INBOX, run);
    window.addEventListener(EVT_MODS_READ, run);
    window.addEventListener("storage", run);
    return () => {
      window.removeEventListener(EVT_INBOX, run);
      window.removeEventListener(EVT_MODS_READ, run);
      window.removeEventListener("storage", run);
    };
  }, [mounted]);

  // --- The clock ---
  useEffect(() => {
    if (!mounted) return;
    let lastCheckpoint = Date.now();
    let lastLock = 0;
    let hiddenAt: number | null = null;

    function tick() {
      const now = Date.now();
      if (passiveRef.current) return;
      if (lockHeldElsewhere(tabIdRef.current, now)) {
        passiveRef.current = true;
        setPassive(true);
        return;
      }
      if (now - lastLock >= 5000) {
        writeEngineLock(tabIdRef.current);
        lastLock = now;
      }
      const s = getEngine();
      const c = cfgRef.current;
      const f = fxOf(s);
      const settledAt = new Date(s.settledAt).getTime();
      const insight = s.insight + onlineGain(s, c, f, settledAt, now);
      storeRef.current.set({
        insight,
        ips: computeIps(s, c, f, now).ips,
        corePU: corePUAt(s, c, now),
        at: now,
      });

      // Eureka sparks (Stage 4+).
      if (s.stage >= c.eureka.startStage) {
        const active = s.eureka.active;
        if (active && new Date(active.expiresAt).getTime() <= now) {
          updateEngine((cur) => ({
            ...cur,
            eureka: { nextAt: iso(now + nextEurekaDelayMs(c, fxOf(cur), envRef.current, Math.random)), active: null },
            counters: { ...cur.counters, eurekasMissed: cur.counters.eurekasMissed + 1 },
          }));
        } else if (!active) {
          const debug = readEngineDebug();
          const nextAt = s.eureka.nextAt ? new Date(s.eureka.nextAt).getTime() : null;
          if (nextAt === null) {
            updateEngine((cur) => ({
              ...cur,
              eureka: { ...cur.eureka, nextAt: iso(now + nextEurekaDelayMs(c, fxOf(cur), envRef.current, Math.random)) },
            }), "soon");
          } else if (now >= nextAt || debug.eurekaNow) {
            spawnEureka(now);
          }
        }
      }

      if (now - lastCheckpoint >= CHECKPOINT_MS) {
        lastCheckpoint = now;
        setEnvTick((n) => n + 1);
        checkpoint(now);
      }
    }

    function spawnEureka(now: number) {
      const s = getEngine();
      const cards = [...document.querySelectorAll<HTMLElement>("[data-module-id]")].filter((el) => {
        const r = el.getBoundingClientRect();
        return r.width > 0 && r.bottom > 0 && r.top < window.innerHeight;
      });
      if (cards.length === 0) {
        updateEngine((cur) => ({ ...cur, eureka: { ...cur.eureka, nextAt: iso(now + 30_000) } }), "soon");
        return;
      }
      const card = cards[Math.floor(Math.random() * cards.length)];
      const partsKnown = [...STARTER_BLUEPRINTS, ...s.blueprints].filter((t) => !PART_DEFS[t].soulforged);
      const kind: EurekaKind = rollEurekaKind(Math.random, partsKnown.length > 0, !!s.ciphers.current);
      const life = eurekaLifeMs(cfgRef.current, fxOf(s));
      updateEngine((cur) => ({
        ...cur,
        eureka: { nextAt: null, active: { id: uid(), kind, cardId: card.dataset.moduleId ?? "ponder", expiresAt: iso(now + life) } },
      }));
      if (readEngineDebug().eurekaNow) {
        // one-shot debug trigger
        try {
          const d = readEngineDebug();
          window.localStorage.setItem("btwr:hub:debug:v1", JSON.stringify({ ...d, eurekaNow: false }));
        } catch {
          // ignore
        }
      }
    }

    function checkpoint(now: number) {
      const ach = aRef.current;
      updateEngine((prev) => {
        const c = cfgRef.current;
        let s = settle(prev, c, fxOf(prev), now);
        s = { ...s, loreRevealedRank: Math.max(s.loreRevealedRank, loreRankForInsight(s.lifetimeInsight)) };
        const f = fxOf(s);
        s = { ...s, detector: accrueDetector(s, c, f, ach.engineBuffs, now) };
        // Fragment routes that don't need a page event.
        if (s.stage >= 7) {
          const frags = new Set(s.ciphers.keyFragments);
          const coreSlugs = modsRef.current.filter((m) => m.category === "core").map((m) => m.slug);
          if (coreSlugs.length > 0 && coreSlugs.every((slug) => s.modsRead.includes(slug))) frags.add("frag-star");
          if (s.loreRevealedRank >= LORE_FRAGMENT_RANK) frags.add("frag-ledger");
          if (frags.size !== s.ciphers.keyFragments.length) s = { ...s, ciphers: { ...s.ciphers, keyFragments: [...frags] } };
        }
        if (s.stage >= 8) s = { ...s, commissions: refreshCommissions(s, new Date(now), modsRef.current.length) };
        const pub = publicSnapshot(
          s,
          { ips: computeIps(s, c, f, now).ips, corePU: corePUAt(s, c, now) },
          { governsSky: f.governsSky && s.stage >= 8, keywordHunt: s.ciphers.current?.kind === "keyword" },
          iso(now)
        );
        return { ...s, lastActiveAt: iso(now), public: pub };
      }, "soon");
    }

    function onVisibility() {
      if (document.visibilityState === "hidden") {
        hiddenAt = Date.now();
        return;
      }
      // Back from a background tab: long gaps count as "away" (timers are throttled there anyway).
      const back = Date.now();
      if (hiddenAt && back - hiddenAt > cfgRef.current.offline.awayThresholdSec * 1000) {
        const from = hiddenAt;
        updateEngine((prev) => {
          const c = cfgRef.current;
          let s = settle(prev, c, fxOf(prev), from);
          const away = offlineAccrual(s, c, fxOf(s), from, back);
          s = grant(s, away.gained);
          return {
            ...s,
            settledAt: iso(back),
            lastActiveAt: iso(back),
            lastAway: away.gained > 0 ? { from: iso(from), to: iso(back), gained: away.gained, capped: away.capped, neglect: away.neglect } : s.lastAway,
          };
        });
      }
      hiddenAt = null;
    }

    tick();
    const id = window.setInterval(() => {
      if (document.visibilityState === "visible") tick();
    }, TICK_MS);
    document.addEventListener("visibilitychange", onVisibility);
    return () => {
      window.clearInterval(id);
      document.removeEventListener("visibilitychange", onVisibility);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mounted]);

  // ------------------------------------------------------------------ Mind

  const solvePuzzle = useCallback(
    (kind: "tiles" | "fork" | "modFact" | "live" | "paragraph", text: string, wasChoice: boolean): number => {
      let reward = 0;
      act((s, now) => {
        reward = puzzleBurst(s, ipsNow(s, now), cfgRef.current, fxOf(s));
        const out = grant(s, reward);
        return {
          ...out,
          solvedCount: s.solvedCount + 1,
          choicesMade: s.choicesMade + (wasChoice ? 1 : 0),
          solvesByKind: { ...s.solvesByKind, [kind]: s.solvesByKind[kind] + 1 },
          journal: kind === "live" ? s.journal : pushJournal(s.journal, text),
          counters: { ...s.counters, nightSolves: s.counters.nightSolves + (envRef.current.night ? 1 : 0) },
        };
      });
      return reward;
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [act]
  );

  const answerAsk = useCallback(
    (qid: string, oid: string) => {
      const ask = ASKS_BY_ID[qid];
      const opt = ask?.options.find((o) => o.id === oid);
      if (!ask || !opt) return;
      act((s) => {
        if (s.askAnswers[qid]) return s;
        const out = grant(s, askReward(s, cfgRef.current));
        return {
          ...out,
          askAnswers: { ...s.askAnswers, [qid]: oid },
          askOrder: [...s.askOrder, qid],
          beliefs: { ...s.beliefs, [opt.axis]: s.beliefs[opt.axis] + 1 },
          journal: pushJournal(s.journal, `${JOURNAL_ASK_PREFIX} ${opt.journal}`),
          counters: { ...s.counters, asksAnswered: s.counters.asksAnswered + 1 },
        };
      });
    },
    [act]
  );

  const finishLetter = useCallback(
    (lines: string[]) => {
      act((s) => (s.letter ? s : grant({ ...s, letter: lines }, stageFlat(s.stage) * 100)));
      toast("It wrote you a letter. It's in the Logbook now.", "good");
    },
    [act, toast]
  );

  const ensureCipher = useCallback(() => {
    const s = getEngine();
    const cur = startCipher(s, iso(Date.now()));
    if (cur && cur !== s.ciphers.current) updateEngine((prev) => ({ ...prev, ciphers: { ...prev.ciphers, current: cur } }));
  }, [getEngine, updateEngine]);

  const finishCipherIfSolved = (s: EngineState, now: number): EngineState => {
    const cur = s.ciphers.current;
    if (!cur) return s;
    const p = puzzleFor(cur, s, fxOf(s));
    if (!isSolved(p, cur)) return s;
    const bp = BLUEPRINTS_BY_ID[cur.id];
    const reward = cipherBurst(s, ipsNow(s, now), cfgRef.current, fxOf(s));
    let out = grant(s, reward);
    out = {
      ...out,
      ciphers: { ...out.ciphers, solved: [...out.ciphers.solved, cur.id], current: null },
      blueprints: bp?.part && !out.blueprints.includes(bp.part) ? [...out.blueprints, bp.part] : out.blueprints,
      counters: { ...out.counters, ciphersSolved: out.counters.ciphersSolved + 1 },
      journal: pushJournal(out.journal, cipherPlainText(cur.id).charAt(0) + cipherPlainText(cur.id).slice(1).toLowerCase() + "."),
    };
    window.setTimeout(
      () => toast(bp?.part ? `Blueprint decoded: ${PART_DEFS[bp.part].name}.` : bp ? "The last page, decoded." : "Practice page decoded.", "good"),
      0
    );
    return out;
  };

  const cipherGuess = useCallback(
    (cipherLetter: string, plain: string | null) => {
      act((s, now) => {
        const cur = s.ciphers.current;
        if (!cur) return s;
        const guesses = { ...cur.guesses };
        if (plain) {
          for (const [k, v] of Object.entries(guesses)) if (v === plain) delete guesses[k];
          guesses[cipherLetter] = plain;
        } else {
          delete guesses[cipherLetter];
        }
        return finishCipherIfSolved({ ...s, ciphers: { ...s.ciphers, current: { ...cur, guesses } } }, now);
      });
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [act]
  );

  const cipherDial = useCallback(
    (index: number, value: number) => {
      act((s, now) => {
        const cur = s.ciphers.current;
        if (!cur) return s;
        const dials = [...cur.dials];
        dials[index] = ((value % 26) + 26) % 26;
        return finishCipherIfSolved({ ...s, ciphers: { ...s.ciphers, current: { ...cur, dials } } }, now);
      }, "soon");
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [act]
  );

  const cipherKeyword = useCallback(
    (word: string): boolean => {
      const s = getEngine();
      const cur = s.ciphers.current;
      if (!cur || cur.kind !== "keyword") return false;
      const g = keywordGuesses(puzzleFor(cur, s, fxOf(s)), word);
      if (!g) return false;
      act((st, now) => {
        const c2 = st.ciphers.current;
        if (!c2) return st;
        return finishCipherIfSolved({ ...st, ciphers: { ...st.ciphers, current: { ...c2, guesses: g } } }, now);
      });
      return true;
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [act, getEngine]
  );

  const cipherHint = useCallback(() => {
    act((s, now) => {
      const cur = s.ciphers.current;
      if (!cur) return s;
      const cost = Math.max(stageFlat(s.stage) * 5, ipsNow(s, now) * 120);
      if (s.insight < cost) return s;
      const next = revealOne(puzzleFor(cur, s, fxOf(s)), cur);
      return finishCipherIfSolved({ ...s, insight: s.insight - cost, ciphers: { ...s.ciphers, current: next } }, now);
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [act]);

  // ------------------------------------------------------------------ Stage

  const site: GateSite = useMemo(() => {
    const order = a.toolTiersList.map((t) => t.id);
    return {
      daysVisited: a.tier2.totalDaysVisited,
      unlockedCount: a.unlocked.size,
      achieved: (id: string) => a.unlocked.has(id as Parameters<typeof a.unlock>[0]),
      mealsCooked: e.counters.mealsCooked,
      cardEnabled: (id: string) => a.isModuleEnabled(id as Parameters<typeof a.isModuleEnabled>[0]),
      toolIndex: Math.max(0, order.indexOf(a.tools.tier)),
      toolIndexOf: (id: string) => order.indexOf(id),
      toolNameOf: (id: string) => a.toolTiersList.find((t) => t.id === id)?.name ?? id,
      iron: a.resources.iron,
      quizCorrect: a.quiz.totalCorrect,
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [a.toolTiersList, a.tier2.totalDaysVisited, a.unlocked, a.unlocked.size, e.counters.mealsCooked, a.isModuleEnabled, a.tools.tier, a.resources.iron, a.quiz.totalCorrect]);

  const gate = useMemo(
    () => (e.stage < 8 ? evaluateGate((e.stage + 1) as EngineStage, e, cfg.gates, site) : null),
    [e, cfg.gates, site]
  );

  const advance = useCallback((): boolean => {
    const s = getEngine();
    if (s.stage >= 8) return false;
    const g = evaluateGate((s.stage + 1) as EngineStage, s, cfgRef.current.gates, site);
    if (!g.met) return false;
    const settled = settle(s, cfgRef.current, fxOf(s), Date.now());
    if (settled.insight < g.cost) return false;
    const next = (s.stage + 1) as EngineStage;
    act((cur, now) => {
      let out: EngineState = {
        ...cur,
        insight: cur.insight - g.cost,
        stage: next,
        stageEnteredAt: { ...cur.stageEnteredAt, [next]: iso(now) },
        ceremoniesSeen: cur.ceremoniesSeen.includes(next) ? cur.ceremoniesSeen : [...cur.ceremoniesSeen, next],
      };
      const layout = layoutFor(next);
      if (layout) {
        const { grid, returned } = remapGrid(cur.grid.w ? cur.grid : { ...cur.grid, w: 0, h: 0, cells: [] }, next);
        const inventory = { ...out.inventory };
        for (const p of returned) inventory[p.type] = (inventory[p.type] ?? 0) + 1;
        // The Engine's first body comes with a starter kit.
        if (next === 4) {
          inventory.handCrank = (inventory.handCrank ?? 0) + 1;
          inventory.gearbox = (inventory.gearbox ?? 0) + 1;
          inventory.axle = (inventory.axle ?? 0) + 2;
        }
        out = { ...out, grid: { ...grid, clutch: false }, inventory, solved: null };
      }
      if (next === 8) out = { ...out, commissions: refreshCommissions(out, new Date(now), modsRef.current.length) };
      return out;
    });
    setCeremony({ kind: "stage", stage: next });
    return true;
  }, [act, getEngine, site]);

  // ------------------------------------------------------------------ Clicker

  const crankRev = useCallback((): number => {
    let value = 0;
    act((s, now) => {
      value = crankRevValue(ipsNow(s, now), fxOf(s));
      const out = grant(s, value);
      return {
        ...out,
        crankActiveUntil: iso(now + cfgRef.current.economy.crankActiveSec * 1000),
        counters: { ...out.counters, cranks: out.counters.cranks + 1 },
      };
    }, "soon");
    return value;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [act]);

  const feedCrank = useCallback((): boolean => {
    if (!spendResources({ cookedFood: 1 }, "Fed the Engine's hand crank")) return false;
    act((s, now) => {
      const until = Math.max(now, s.crankBoostUntil ? new Date(s.crankBoostUntil).getTime() : 0);
      return { ...s, crankBoostUntil: iso(until + cfgRef.current.economy.crankBoostSec * 1000) };
    });
    return true;
  }, [act, spendResources]);

  const buyComponent = useCallback(
    (id: ComponentId, n: number): boolean => {
      const s = getEngine();
      const def = cfgRef.current.components.find((c) => c.id === id) ?? COMPONENTS_BY_ID[id];
      if (s.stage < def.stage || n <= 0) return false;
      const owned = s.components[id] ?? 0;
      const cost = bulkCost(def, owned, n, s.mark, cfgRef.current);
      if (settle(s, cfgRef.current, fxOf(s), Date.now()).insight < cost) return false;
      act((cur) => ({
        ...cur,
        insight: cur.insight - cost,
        components: { ...cur.components, [id]: (cur.components[id] ?? 0) + n },
        counters: { ...cur.counters, componentsBought: cur.counters.componentsBought + n },
      }));
      return true;
    },
    [act, getEngine]
  );

  const buyResearch = useCallback(
    (id: string): boolean => {
      const s = getEngine();
      const def = RESEARCH_BY_ID[id];
      if (!def) return false;
      const settled = settle(s, cfgRef.current, fxOf(s), Date.now());
      if (!canBuyResearch(def, s.stage, s.components, s.research, settled.insight)) return false;
      act((cur) => ({
        ...cur,
        insight: cur.insight - def.cost,
        research: [...cur.research, id],
        counters: { ...cur.counters, researchBought: cur.counters.researchBought + 1 },
      }));
      return true;
    },
    [act, getEngine]
  );

  const upgradeDrum = useCallback((): boolean => {
    const s = getEngine();
    const cost = DRUM_COSTS[s.ledgerDrumLevel + 1];
    if (cost === undefined) return false;
    if (settle(s, cfgRef.current, fxOf(s), Date.now()).insight < cost) return false;
    act((cur) => ({ ...cur, insight: cur.insight - cost, ledgerDrumLevel: cur.ledgerDrumLevel + 1 }));
    return true;
  }, [act, getEngine]);

  // ------------------------------------------------------------------ Body

  const knownParts = useMemo(
    () => [...new Set([...STARTER_BLUEPRINTS, ...e.blueprints])].filter((t) => PART_DEFS[t].stage <= Math.max(e.stage, 4)),
    [e.blueprints, e.stage]
  );

  const partCost = useCallback(
    (type: GridPartType): Record<string, number> => {
      const s = getEngine();
      const def = PART_DEFS[type];
      const mult = markDiscount(s.mark, cfgRef.current) * (def.soulforged && s.specialization === "soulforger" ? 0.7 : 1);
      return Object.fromEntries(Object.entries(def.cost).map(([k, v]) => [k, Math.max(1, Math.ceil(v * mult))]));
    },
    [getEngine]
  );

  const craftPart = useCallback(
    (type: GridPartType): boolean => {
      const s = getEngine();
      const def = PART_DEFS[type];
      const known = STARTER_BLUEPRINTS.includes(type) || s.blueprints.includes(type);
      if (!known || s.stage < 4) return false;
      if (def.soulforged && !aRef.current.engineBuffs.hibachiLit) return false;
      if (!spendResources(partCost(type), `The Engine crafted a ${def.name}`)) return false;
      act((cur) => ({
        ...cur,
        inventory: { ...cur.inventory, [type]: (cur.inventory[type] ?? 0) + 1 },
        counters: {
          ...cur.counters,
          partsCrafted: cur.counters.partsCrafted + 1,
          soulforged: cur.counters.soulforged + (def.soulforged ? 1 : 0),
        },
      }));
      return true;
    },
    [act, getEngine, partCost, spendResources]
  );

  const editGrid = useCallback(
    (fn: (s: EngineState, layout: NonNullable<ReturnType<typeof layoutFor>>) => EngineState | null) => {
      act((s) => {
        const layout = layoutFor(s.stage);
        if (!layout) return s;
        const out = fn(s, layout);
        if (!out) return s;
        return { ...out, grid: { ...out.grid, clutch: false, rev: out.grid.rev + 1 }, solved: null };
      });
    },
    [act]
  );

  const placePart = useCallback(
    (index: number, type: GridPartType): boolean => {
      const s = getEngine();
      const layout = layoutFor(s.stage);
      if (!layout || s.grid.cells[index] || (s.inventory[type] ?? 0) < 1) return false;
      if (!canPlaceOn(layout.terrain[index], { type })) return false;
      editGrid((cur) => {
        if (cur.grid.cells[index] || (cur.inventory[type] ?? 0) < 1) return null;
        const cells = [...cur.grid.cells];
        cells[index] = { uid: uid(), type, rot: 1 as Rot };
        return { ...cur, grid: { ...cur.grid, cells }, inventory: { ...cur.inventory, [type]: (cur.inventory[type] ?? 0) - 1 } };
      });
      return true;
    },
    [editGrid, getEngine]
  );

  const rotatePart = useCallback(
    (index: number) => {
      editGrid((cur) => {
        const part = cur.grid.cells[index];
        if (!part) return null;
        const cells = [...cur.grid.cells];
        cells[index] = { ...part, rot: ((part.rot + 1) % 4) as Rot };
        return { ...cur, grid: { ...cur.grid, cells } };
      });
    },
    [editGrid]
  );

  const removePart = useCallback(
    (index: number) => {
      editGrid((cur) => {
        const part = cur.grid.cells[index] as PlacedPart | null;
        if (!part) return null;
        const cells = [...cur.grid.cells];
        cells[index] = null;
        // A popped part is scrap — only whole parts go back in the tray.
        const inventory = part.broken ? cur.inventory : { ...cur.inventory, [part.type]: (cur.inventory[part.type] ?? 0) + 1 };
        return { ...cur, grid: { ...cur.grid, cells }, inventory };
      });
    },
    [editGrid]
  );

  const engage = useCallback(() => {
    const s = getEngine();
    const r = engageGrid(s, envRef.current, cfgRef.current, fxOf(s), { refundFirstPop: !s.firstPopRefunded });
    if (!r) return;
    act((cur) => {
      const inventory = { ...cur.inventory };
      for (const t of r.refunded) inventory[t] = (inventory[t] ?? 0) + 1;
      const clean = r.pops.length === 0 && r.solved.cranked.corePU > 0;
      return {
        ...cur,
        grid: r.grid,
        solved: r.solved,
        inventory,
        firstPopRefunded: cur.firstPopRefunded || r.refunded.length > 0,
        counters: {
          ...cur.counters,
          engages: cur.counters.engages + 1,
          cleanEngages: cur.counters.cleanEngages + (clean ? 1 : 0),
          pops: cur.counters.pops + r.pops.length,
        },
      };
    });
    if (r.pops.length > 0) {
      toast(POP_LINES[r.pops[0].reason] + (r.refunded.length ? " (I kept the pieces this once.)" : ""), "warn");
    } else if (r.solved.idle.corePU > 0 || r.solved.cranked.corePU > 0) {
      toast("Clutch engaged. I can feel that.", "good");
    } else {
      toast("Clutch engaged — but no power reaches my core yet.", "info");
    }
  }, [act, getEngine, toast]);

  // ------------------------------------------------------------------ Events

  const catchEureka = useCallback(() => {
    const s = getEngine();
    const active = s.eureka.active;
    if (!active || new Date(active.expiresAt).getTime() < Date.now()) return;
    const kind = active.kind;
    act((cur, now) => {
      const c = cfgRef.current;
      const f = fxOf(cur);
      const ev = envRef.current;
      let out: EngineState = {
        ...cur,
        eureka: { nextAt: iso(now + nextEurekaDelayMs(c, f, ev, Math.random)), active: null },
        counters: { ...cur.counters, eurekasCaught: cur.counters.eurekasCaught + 1 },
      };
      if (kind === "frenzy") {
        out = { ...out, frenzy: { until: iso(now + (c.eureka.frenzySec + f.frenzyBonusSec) * 1000), mult: c.eureka.frenzyMult } };
      } else if (kind === "lucky") {
        const hard = out.specialization === "hardcore" ? 1.25 : 1;
        out = grant(out, luckyAmount(out.insight, ipsNow(out, now), c, ev) * hard);
      } else if (kind === "part") {
        const pool = [...STARTER_BLUEPRINTS, ...out.blueprints].filter((t) => !PART_DEFS[t].soulforged);
        const t = pool[Math.floor(Math.random() * pool.length)];
        if (t) out = { ...out, inventory: { ...out.inventory, [t]: (out.inventory[t] ?? 0) + 1 } };
      } else if (kind === "letter" && out.ciphers.current) {
        out = finishCipherIfSolved(
          { ...out, ciphers: { ...out.ciphers, current: revealOne(puzzleFor(out.ciphers.current, out, f), out.ciphers.current) } },
          now
        );
      }
      if (ev.fullMoon && out.stage >= 7 && !out.ciphers.keyFragments.includes("frag-ledger")) {
        out = { ...out, ciphers: { ...out.ciphers, keyFragments: [...out.ciphers.keyFragments, "frag-ledger"] } };
      }
      return out;
    });
    toast(eurekaLine(kind), "good");
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [act, getEngine, toast]);

  const useDetector = useCallback((): boolean => {
    const s = getEngine();
    if (!aRef.current.engineBuffs.detectorPowered || s.detector.charges < 1) return false;
    act((cur) => ({
      ...cur,
      detector: { ...cur.detector, charges: cur.detector.charges - 1, chargedAt: cur.detector.chargedAt ?? iso(Date.now()) },
      counters: { ...cur.counters, detectorUses: cur.counters.detectorUses + 1 },
    }));
    return true;
  }, [act, getEngine]);

  const stokeCampfire = useCallback((): boolean => {
    if (!aRef.current.engineBuffs.bellowsPowered) return false;
    aRef.current.tendCampfire();
    act((cur) => ({ ...cur, counters: { ...cur.counters, stokes: cur.counters.stokes + 1 } }));
    return true;
  }, [act]);

  const respecCost = useCallback((): number => {
    const s = getEngine();
    if (!s.specialization) return 0;
    const ips = ipsNow(s, Date.now());
    return Math.max(stageFlat(s.stage) * 20, ips * cfgRef.current.economy.respecCostSec) * (1 + s.respecCount);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [getEngine]);

  const chooseSpec = useCallback(
    (axis: BeliefAxis): boolean => {
      const s = getEngine();
      if (s.stage < 6 || s.specialization === axis) return false;
      const cost = respecCost();
      if (settle(s, cfgRef.current, fxOf(s), Date.now()).insight < cost) return false;
      act((cur) => ({
        ...cur,
        insight: cur.insight - cost,
        specialization: axis,
        respecCount: cur.specialization ? cur.respecCount + 1 : cur.respecCount,
        specsTried: cur.specsTried.includes(axis) ? cur.specsTried : [...cur.specsTried, axis],
      }));
      return true;
    },
    [act, getEngine, respecCost]
  );

  const commissionAt = (s: EngineState, slot: number | "weekly") =>
    slot === "weekly" ? s.commissions.weekly : s.commissions.daily[slot] ?? null;

  const setCommission = (s: EngineState, slot: number | "weekly", patch: Partial<NonNullable<ReturnType<typeof commissionAt>>>): EngineState => {
    if (slot === "weekly") {
      return s.commissions.weekly ? { ...s, commissions: { ...s.commissions, weekly: { ...s.commissions.weekly, ...patch } } } : s;
    }
    const daily = s.commissions.daily.map((c, i) => (i === slot ? { ...c, ...patch } : c));
    return { ...s, commissions: { ...s.commissions, daily } };
  };

  const claimCommission = useCallback(
    (slot: number | "weekly"): boolean => {
      const s = getEngine();
      const c = commissionAt(s, slot);
      if (!c || c.claimed || commissionProgress(s, c) < c.target) return false;
      act((cur, now) => {
        const reward = Math.max(stageFlat(cur.stage) * 50, ipsNow(cur, now) * c.rewardSec);
        let out = grant(setCommission(cur, slot, { claimed: true, done: true }), reward);
        if (c.rewardPart) out = { ...out, inventory: { ...out.inventory, [c.rewardPart]: (out.inventory[c.rewardPart] ?? 0) + 1 } };
        out = { ...out, counters: { ...out.counters, commissionsDone: out.counters.commissionsDone + 1 } };
        if (out.stage >= 7 && !out.ciphers.keyFragments.includes("frag-ledger")) {
          out = { ...out, ciphers: { ...out.ciphers, keyFragments: [...out.ciphers.keyFragments, "frag-ledger"] } };
        }
        return out;
      });
      toast("Commission complete. Thank you.", "good");
      return true;
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [act, getEngine, toast]
  );

  const deliverCommission = useCallback(
    (slot: number | "weekly"): boolean => {
      const s = getEngine();
      const c = commissionAt(s, slot);
      if (!c || c.kind !== "deliver" || c.done || !c.resource) return false;
      if (!spendResources({ [c.resource]: c.target }, `Delivered ${c.target} ${c.resource} to the Engine`)) return false;
      act((cur) => setCommission(cur, slot, { done: true }));
      return true;
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [act, getEngine, spendResources]
  );

  const submitDifference = useCallback(
    (id: string, placed: DiffPart[]): DiffScore | null => {
      const c = DIFF_BY_ID[id];
      if (!c) return null;
      const score = scoreChallenge(c, placed, cfgRef.current.power);
      if (score.success && score.medal) {
        const result = { parts: score.parts, pops: score.pops, medal: score.medal };
        act((cur) => ({ ...cur, difference: { ...cur.difference, [id]: betterResult(cur.difference[id], result) } }));
        toast(
          score.medal === "gold"
            ? `Gold on "${c.name}". Perfect tolerances.`
            : `${score.medal === "silver" ? "Silver" : "Bronze"} on "${c.name}" — ${score.parts} parts (gold is ${c.par.gold}).`,
          "good"
        );
      } else {
        toast(score.pops > 0 ? "Something popped, and not everything's powered." : "Not every target is powered yet.", "warn");
      }
      return score;
    },
    [act, toast]
  );

  const holdSky = useCallback((): boolean => {
    const s = getEngine();
    if (s.stage < 8 || !fxOf(s).governsSky) return false;
    setSkyHold(Date.now() + 180_000);
    act((cur) => ({ ...cur, counters: { ...cur.counters, skyHolds: cur.counters.skyHolds + 1 } }));
    toast("I'll hold the sky for a while.", "good");
    return true;
  }, [act, getEngine, toast]);

  const markTutorialSeen = useCallback(
    (id: string) => updateEngine((s) => (s.tutorialsSeen.includes(id) ? s : { ...s, tutorialsSeen: [...s.tutorialsSeen, id] })),
    [updateEngine]
  );
  const replayTutorial = useCallback(
    (id: string) => updateEngine((s) => ({ ...s, tutorialsSeen: s.tutorialsSeen.filter((t) => t !== id) })),
    [updateEngine]
  );
  const dismissAway = useCallback(() => updateEngine((s) => ({ ...s, lastAway: null })), [updateEngine]);
  const dismissCeremony = useCallback(() => {
    setCeremony((c) => {
      if (c?.kind === "mark") {
        updateEngine((s) => (s.ceremoniesSeen.includes(100 + c.mark) ? s : { ...s, ceremoniesSeen: [...s.ceremoniesSeen, 100 + c.mark] }));
      } else if (c?.kind === "stage") {
        updateEngine((s) => (s.ceremoniesSeen.includes(c.stage) ? s : { ...s, ceremoniesSeen: [...s.ceremoniesSeen, c.stage] }));
        if (!c.replay) {
          const stage = c.stage;
          window.setTimeout(() => narrateRef.current(stage), 0);
        }
      }
      return null;
    });
  }, [updateEngine]);

  const liveCtx = useCallback((): LiveCtx => {
    const ach = aRef.current;
    let topId = "wood";
    let topAmount = -1;
    for (const [id, amount] of Object.entries(ach.resources)) {
      if (amount > topAmount) {
        topAmount = amount;
        topId = id;
      }
    }
    const live = storeRef.current.get();
    const s = getEngine();
    return {
      topResourceName: ach.resourceMeta[topId as keyof typeof ach.resourceMeta]?.name ?? topId,
      topResourceAmount: Math.max(0, Math.floor(topAmount)),
      campfireLabel: CAMPFIRE_STAGES[currentCampfireStage(ach.campfire, ach.mechanics.campfire.decayMinutes)],
      toolName: ach.toolTiersList.find((t) => t.id === ach.tools.tier)?.name ?? "Bare Hands",
      visitStreak: ach.visits.streakDays,
      insightText: Math.floor(live.insight).toLocaleString(),
      ipsText: live.ips >= 10 ? Math.floor(live.ips).toLocaleString() : live.ips.toFixed(1),
      corePU: live.corePU,
      componentCount: Object.values(s.components).reduce<number>((acc, n) => acc + (n ?? 0), 0),
      modsRead: s.modsRead.length,
      achievements: ach.unlocked.size,
    };
  }, [getEngine]);

  const value: EngineCtx = {
    e,
    cfg,
    fx,
    env,
    store: storeRef.current,
    mods,
    title: stageTitle(e.stage, e.mark),
    gate,
    knownParts,
    liveCtx,
    workshopOpen,
    setWorkshopOpen,
    wide: workshopOpen || e.stage >= 4,
    passive,
    takeOver,
    ceremony,
    showCeremony: setCeremony,
    dismissCeremony,
    toasts,
    toast,
    solvePuzzle,
    answerAsk,
    finishLetter,
    ensureCipher,
    cipherGuess,
    cipherDial,
    cipherKeyword,
    cipherHint,
    advance,
    crankRev,
    feedCrank,
    buyComponent,
    buyResearch,
    upgradeDrum,
    craftPart,
    partCost,
    placePart,
    rotatePart,
    removePart,
    engage,
    catchEureka,
    useDetector,
    stokeCampfire,
    chooseSpec,
    respecCost,
    claimCommission,
    deliverCommission,
    holdSky,
    submitDifference,
    markTutorialSeen,
    replayTutorial,
    dismissAway,
  };

  return <EngineContext.Provider value={value}>{children}</EngineContext.Provider>;
}

export function useEngine(): EngineCtx {
  const ctx = useContext(EngineContext);
  if (!ctx) throw new Error("useEngine must be used within EngineProvider");
  return ctx;
}

/** For cards that may render outside the Outpost (e.g. Guess the Mod's flat variant). */
export function useEngineOptional(): EngineCtx | null {
  return useContext(EngineContext);
}

export { dominantBelief };
