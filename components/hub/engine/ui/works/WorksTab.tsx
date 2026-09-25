"use client";

import { useState } from "react";
import { useAchievements } from "../../../AchievementsProvider";
import { canBuyResearch, isResearchVisible, RESEARCH } from "../../catalog/research";
import { COMMISSIONS_BY_ID, commissionProgress } from "../../commissions";
import { dominantBelief } from "../../content/asks";
import { SPEC_LINES } from "../../content/voice";
import { bulkCost, DRUM_COSTS, DRUM_HOURS, formatInsight, maxAffordable } from "../../economy";
import { BELIEF_AXES, type BeliefAxis, type CommissionInstance } from "../../types";
import { useEngine } from "../EngineProvider";
import { useLive } from "../live-store";

type Qty = 1 | 10 | "max";

export default function WorksTab() {
  const { e } = useEngine();
  return (
    <div className="space-y-4">
      <ComponentShop />
      {e.stage >= 4 && <ResearchList />}
      {e.stage >= 6 && <LedgerDrum />}
      {e.stage >= 6 && <Specialization />}
      {e.stage >= 8 && <Commissions />}
    </div>
  );
}

function Section({ title, children, target }: { title: string; children: React.ReactNode; target?: string }) {
  return (
    <section data-engine-target={target}>
      <h4 className="text-[0.7rem] font-bold uppercase tracking-wider text-white/50">{title}</h4>
      <div className="mt-1.5">{children}</div>
    </section>
  );
}

function ComponentShop() {
  const { e, cfg, store, buyComponent } = useEngine();
  const insight = useLive(store, (s) => (s.at === 0 ? e.insight : s.insight));
  const [qty, setQty] = useState<Qty>(1);
  const visible = cfg.components.filter((c) => c.stage <= e.stage);
  const requiredPU = cfg.components.filter((c) => (e.components[c.id] ?? 0) > 0).reduce((a, c) => a + c.draw, 0);
  return (
    <Section title="Components" target="shop">
      <div className="mb-1.5 flex items-center justify-between gap-2 text-[0.7rem] text-slate-400">
        <span>
          Blocks that think for the Engine. They need <span className="text-white">{requiredPU}</span> power at the core to run flat out.
        </span>
        <div className="flex shrink-0 gap-1">
          {([1, 10, "max"] as Qty[]).map((q) => (
            <button
              key={String(q)}
              type="button"
              onClick={() => setQty(q)}
              className={`rounded border px-1.5 py-0.5 ${qty === q ? "border-[var(--outpost-accent)] text-[var(--outpost-accent)]" : "border-white/15"}`}
            >
              {q === "max" ? "Max" : `×${q}`}
            </button>
          ))}
        </div>
      </div>
      <div className="grid gap-1.5 sm:grid-cols-2">
        {visible.map((c) => {
          const owned = e.components[c.id] ?? 0;
          const n = qty === "max" ? Math.max(1, maxAffordable(c, owned, insight, e.mark, cfg)) : qty;
          const cost = bulkCost(c, owned, n, e.mark, cfg);
          const can = insight >= cost;
          return (
            <button
              key={c.id}
              type="button"
              onClick={() => buyComponent(c.id, n)}
              disabled={!can}
              title={c.blurb}
              className="flex items-center gap-2 rounded-lg border border-white/10 bg-white/5 px-2 py-1.5 text-left transition-colors hover:border-[var(--outpost-accent)] disabled:opacity-50 disabled:hover:border-white/10"
            >
              <span className="text-lg" aria-hidden="true">
                {c.icon}
              </span>
              <span className="min-w-0 flex-1">
                <span className="block truncate text-xs font-semibold text-white">
                  {c.name} <span className="font-normal text-white/40">×{owned}</span>
                </span>
                <span className="block text-[0.65rem] text-slate-400">
                  {formatInsight(c.rate)}/s each · draws {c.draw} PU
                </span>
              </span>
              <span className="shrink-0 text-right text-[0.7rem] font-semibold text-[var(--outpost-accent)]">
                {n > 1 ? `×${n} ` : ""}
                {formatInsight(cost)}
              </span>
            </button>
          );
        })}
      </div>
    </Section>
  );
}

function ResearchList() {
  const { e, store, buyResearch } = useEngine();
  const insight = useLive(store, (s) => (s.at === 0 ? e.insight : s.insight));
  const [showOwned, setShowOwned] = useState(false);
  const visible = RESEARCH.filter((r) => !e.research.includes(r.id) && isResearchVisible(r, e.stage, e.components))
    .sort((a, b) => a.cost - b.cost)
    .slice(0, 12);
  const owned = RESEARCH.filter((r) => e.research.includes(r.id));
  return (
    <Section title={`Research (${owned.length}/${RESEARCH.length})`}>
      {visible.length === 0 ? (
        <p className="text-[0.7rem] text-slate-500">Nothing to research right now — more appears as you build.</p>
      ) : (
        <div className="grid gap-1.5 sm:grid-cols-2">
          {visible.map((r) => {
            const can = canBuyResearch(r, e.stage, e.components, e.research, insight);
            const locked = r.requires && (e.components[r.requires.component] ?? 0) < r.requires.owned;
            return (
              <button
                key={r.id}
                type="button"
                onClick={() => buyResearch(r.id)}
                disabled={!can}
                className="rounded-lg border border-white/10 bg-white/5 px-2 py-1.5 text-left transition-colors hover:border-[var(--outpost-accent)] disabled:opacity-50 disabled:hover:border-white/10"
              >
                <span className="flex items-baseline justify-between gap-2">
                  <span className="text-xs font-semibold text-white">{r.name}</span>
                  <span className="text-[0.7rem] font-semibold text-[var(--outpost-accent)]">{formatInsight(r.cost)}</span>
                </span>
                <span className="block text-[0.65rem] text-slate-400">
                  {r.description}
                  {locked && r.requires ? ` (needs ${r.requires.owned} owned)` : ""}
                </span>
              </button>
            );
          })}
        </div>
      )}
      {owned.length > 0 && (
        <button type="button" onClick={() => setShowOwned((v) => !v)} className="mt-1.5 text-[0.7rem] text-slate-400 hover:text-white">
          {showOwned ? "Hide" : "Show"} researched
        </button>
      )}
      {showOwned && (
        <ul className="mt-1 columns-2 text-[0.65rem] text-slate-500">
          {owned.map((r) => (
            <li key={r.id}>✓ {r.name}</li>
          ))}
        </ul>
      )}
    </Section>
  );
}

function LedgerDrum() {
  const { e, store, upgradeDrum } = useEngine();
  const insight = useLive(store, (s) => (s.at === 0 ? e.insight : s.insight));
  const next = DRUM_COSTS[e.ledgerDrumLevel + 1];
  const hours = DRUM_HOURS[e.ledgerDrumLevel];
  return (
    <Section title="Ledger Drum" target="drum">
      <div className="flex items-center justify-between gap-2 rounded-lg border border-white/10 bg-white/5 px-2 py-1.5">
        <span className="text-xs text-slate-300">
          Keeps <span className="font-semibold text-white">{hours}h</span> of thinking while you&apos;re away
          {e.specialization === "homesteader" ? " (×1.5, Homesteader)" : ""}.
        </span>
        {next !== undefined ? (
          <button
            type="button"
            onClick={upgradeDrum}
            disabled={insight < next}
            className="shrink-0 rounded-md border border-[var(--outpost-accent)] px-2 py-1 text-[0.7rem] font-semibold text-[var(--outpost-accent)] disabled:border-white/15 disabled:text-white/30"
          >
            {DRUM_HOURS[e.ledgerDrumLevel + 1]}h · {formatInsight(next)}
          </button>
        ) : (
          <span className="text-[0.7rem] text-white/40">Largest drum</span>
        )}
      </div>
    </Section>
  );
}

function Specialization() {
  const { e, chooseSpec, respecCost } = useEngine();
  const lean = dominantBelief(e.beliefs);
  const cost = respecCost();
  return (
    <Section title="What the Engine becomes" target="spec">
      <p className="mb-1.5 text-[0.7rem] text-slate-400">
        {lean
          ? `From what you told it, it leans ${SPEC_LINES[lean].name}. It's still your call.`
          : "Answer a few more of its questions — it wants to know you first."}
      </p>
      <div className="grid gap-1.5 sm:grid-cols-3">
        {BELIEF_AXES.map((axis: BeliefAxis) => {
          const s = SPEC_LINES[axis];
          const active = e.specialization === axis;
          return (
            <button
              key={axis}
              type="button"
              disabled={active}
              onClick={() => chooseSpec(axis)}
              className={`rounded-lg border px-2 py-1.5 text-left transition-colors ${
                active ? "border-[var(--outpost-accent)] bg-[var(--outpost-accent-soft)]/20" : "border-white/10 bg-white/5 hover:border-[var(--outpost-accent)]"
              }`}
            >
              <span className="flex items-center justify-between text-xs font-semibold text-white">
                {s.name}
                {lean === axis && !active && <span className="text-[0.6rem] text-[var(--outpost-accent)]">leaning</span>}
                {active && <span className="text-[0.6rem] text-[var(--outpost-accent)]">chosen</span>}
              </span>
              <span className="mt-0.5 block text-[0.65rem] italic text-slate-400">{s.line}</span>
              <ul className="mt-1 space-y-0.5 text-[0.62rem] text-slate-300">
                {s.perks.map((p) => (
                  <li key={p}>· {p}</li>
                ))}
              </ul>
            </button>
          );
        })}
      </div>
      {e.specialization && cost > 0 && (
        <p className="mt-1 text-[0.65rem] text-slate-500">Changing its mind costs {formatInsight(cost)} insight.</p>
      )}
    </Section>
  );
}

function CommissionRow({ c, slot }: { c: CommissionInstance; slot: number | "weekly" }) {
  const { e, claimCommission, deliverCommission } = useEngine();
  const { resources, resourceMeta } = useAchievements();
  const tpl = COMMISSIONS_BY_ID[c.tplId];
  const progress = commissionProgress(e, c);
  const complete = progress >= c.target;
  const canDeliver =
    c.kind === "deliver" && !c.done && !!c.resource && (resources[c.resource as keyof typeof resources] ?? 0) >= c.target;
  return (
    <div className={`flex items-center gap-2 rounded-lg border px-2 py-1.5 ${c.claimed ? "border-white/5 opacity-50" : "border-white/10 bg-white/5"}`}>
      <span className="min-w-0 flex-1">
        <span className="block text-xs text-white">
          {slot === "weekly" && <span className="mr-1 text-[0.6rem] font-bold uppercase text-[var(--outpost-accent)]">Weekly</span>}
          {tpl?.label(c.target) ?? c.tplId}
          {c.resource && resourceMeta[c.resource as keyof typeof resourceMeta] ? ` ${resourceMeta[c.resource as keyof typeof resourceMeta].icon}` : ""}
        </span>
        {c.kind !== "deliver" && (
          <span className="block text-[0.65rem] text-slate-400">
            {Math.floor(progress)}/{c.target}
          </span>
        )}
      </span>
      {c.claimed ? (
        <span className="text-[0.7rem] text-white/40">Done</span>
      ) : c.kind === "deliver" && !c.done ? (
        <button
          type="button"
          onClick={() => deliverCommission(slot)}
          disabled={!canDeliver}
          className="rounded-md border border-white/15 px-2 py-1 text-[0.7rem] text-slate-200 hover:border-[var(--outpost-accent)] disabled:opacity-40"
        >
          Deliver
        </button>
      ) : (
        <button
          type="button"
          onClick={() => claimCommission(slot)}
          disabled={!complete}
          className="rounded-md border border-[var(--outpost-accent)] px-2 py-1 text-[0.7rem] font-semibold text-[var(--outpost-accent)] disabled:border-white/15 disabled:text-white/30"
        >
          Claim
        </button>
      )}
    </div>
  );
}

function Commissions() {
  const { e } = useEngine();
  const { daily, weekly } = e.commissions;
  return (
    <Section title="Commissions">
      <p className="mb-1.5 text-[0.7rem] text-slate-400">Small things the Engine would like. New ones every day, and one each week.</p>
      <div className="space-y-1.5">
        {daily.map((c, i) => (
          <CommissionRow key={`${c.tplId}-${i}`} c={c} slot={i} />
        ))}
        {weekly && <CommissionRow c={weekly} slot="weekly" />}
      </div>
    </Section>
  );
}
