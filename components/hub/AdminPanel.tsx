"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import {
  ACHIEVEMENTS,
  CATEGORY_LABELS,
  CATEGORY_ORDER,
  type AchievementCategory,
  type AchievementId,
} from "./achievements-catalog";
import {
  defaultAdminConfig,
  loadAdminConfig,
  resolvedCraftCost,
  resolvedModuleTier,
  resolvedResourceMeta,
  resolvedToolTiers,
  saveAdminConfig,
  type AdminConfig,
  type CustomToolTier,
  type FeaturesConfig,
  type TierDef,
} from "./admin-config";
import { DEFAULT_MODULE_TIER, MODULES, type ModuleId } from "./module-registry";
import OutpostCorners from "./OutpostCorners";
import { RESOURCE_IDS, TOOL_ORDER, type ResourceId, type ToolTier } from "./resources";

type Tab = "tiers" | "resources" | "tools" | "features";
const TAB_LABELS: Record<Tab, string> = {
  tiers: "Tiers",
  resources: "Resources",
  tools: "Tools",
  features: "Features",
};

type TierSubTab = "list" | "modules" | "achievements" | "tips";
const TIER_SUB_TAB_LABELS: Record<TierSubTab, string> = {
  list: "Tier List",
  modules: "Modules",
  achievements: "Achievements",
  tips: "Tips",
};

type Update = (updater: (prev: AdminConfig) => AdminConfig) => void;

function sortedTiers(config: AdminConfig) {
  return [...config.tiers].sort((a, b) => a.threshold - b.threshold);
}

function TiersTab({ config, update }: { config: AdminConfig; update: Update }) {
  const tiers = sortedTiers(config);

  function rename(id: string, name: string) {
    update((prev) => ({ ...prev, tiers: prev.tiers.map((t) => (t.id === id ? { ...t, name } : t)) }));
  }
  function rethreshold(id: string, threshold: number) {
    update((prev) => ({ ...prev, tiers: prev.tiers.map((t) => (t.id === id ? { ...t, threshold } : t)) }));
  }
  function add() {
    update((prev) => {
      let n = prev.tiers.length + 1;
      let id = `tier${n}`;
      while (prev.tiers.some((t) => t.id === id)) {
        n += 1;
        id = `tier${n}`;
      }
      const maxThreshold = Math.max(0, ...prev.tiers.map((t) => t.threshold));
      return { ...prev, tiers: [...prev.tiers, { id, name: `Tier ${n}`, threshold: maxThreshold + 20 }] };
    });
  }
  function remove(id: string) {
    update((prev) => ({ ...prev, tiers: prev.tiers.filter((t) => t.id !== id) }));
  }

  return (
    <div>
      <p className="text-sm text-slate-400">
        A tier unlocks once you&apos;ve earned this many achievements (any category, counted together). Tier 1 and
        Tier 2 are built-in — Tier 2 also carries the reveal animation, skins, and XP/level system, so its threshold
        is editable but it can&apos;t be removed or renamed away. Anything past Tier 2 just gates which cards and
        achievements show up — no special ceremony.
      </p>
      <div className="mt-3 space-y-2">
        {tiers.map((t) => {
          const builtin = t.id === "tier1" || t.id === "tier2";
          return (
            <div
              key={t.id}
              className="flex flex-wrap items-center gap-2 rounded-lg border border-white/10 bg-white/5 p-3"
            >
              <input
                value={t.name}
                disabled={t.id === "tier1"}
                onChange={(e) => rename(t.id, e.target.value)}
                className="min-w-0 flex-1 rounded-md border border-white/15 bg-transparent px-2 py-1 text-sm text-white disabled:opacity-40"
              />
              <label className="flex items-center gap-1.5 text-xs text-slate-400">
                Unlocks at
                <input
                  type="number"
                  min={0}
                  value={t.threshold}
                  disabled={t.id === "tier1"}
                  onChange={(e) => rethreshold(t.id, Math.max(0, Number(e.target.value) || 0))}
                  className="w-20 rounded-md border border-white/15 bg-transparent px-2 py-1 text-sm text-white disabled:opacity-40"
                />
                achievements
              </label>
              {builtin ? (
                <span className="ml-auto text-xs text-white/30">Built-in</span>
              ) : (
                <button
                  type="button"
                  onClick={() => remove(t.id)}
                  className="ml-auto text-xs font-semibold text-red-400 hover:text-red-300"
                >
                  Remove
                </button>
              )}
            </div>
          );
        })}
      </div>
      <button
        type="button"
        onClick={add}
        className="mt-3 rounded-lg border border-white/15 px-3 py-1.5 text-xs font-semibold text-slate-300 transition-colors hover:border-[var(--outpost-accent)] hover:text-[var(--outpost-accent)]"
      >
        + Add tier
      </button>
    </div>
  );
}

// Shared by Modules and Achievements — a tier is the "category" you drop
// things into, rather than a per-item dropdown being the only place that
// relationship shows up, so it's actually visible at a glance which tier
// holds what without scanning every row.
function CollapsibleSection({
  title,
  count,
  children,
}: {
  title: string;
  count: number;
  children: React.ReactNode;
}) {
  const [open, setOpen] = useState(true);
  return (
    <div className="rounded-lg border border-white/10">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        className="flex w-full items-center justify-between gap-2 px-3 py-2.5 text-left"
      >
        <span className="flex items-center gap-2 text-sm font-semibold text-white">
          {title}
          <span className="rounded-full bg-white/10 px-1.5 py-0.5 text-[0.65rem] font-semibold text-white/50">
            {count}
          </span>
        </span>
        <svg
          className={`h-3.5 w-3.5 shrink-0 text-white/50 transition-transform duration-200 ${
            open ? "rotate-180" : ""
          }`}
          viewBox="0 0 20 20"
          fill="none"
          stroke="currentColor"
          strokeWidth={2}
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <path d="M5 7.5l5 5 5-5" />
        </svg>
      </button>
      {open && <div className="space-y-2 border-t border-white/10 p-3">{children}</div>}
    </div>
  );
}

function ModulesTab({ config, update }: { config: AdminConfig; update: Update }) {
  const tiers = sortedTiers(config);

  function setModuleTier(id: ModuleId, tierId: string) {
    update((prev) => ({ ...prev, moduleTier: { ...prev.moduleTier, [id]: tierId } }));
  }

  const byTier = new Map<string, typeof MODULES>();
  for (const m of MODULES) {
    const tierId = resolvedModuleTier(config, m.id, DEFAULT_MODULE_TIER[m.id]);
    if (!byTier.has(tierId)) byTier.set(tierId, []);
    byTier.get(tierId)!.push(m);
  }

  return (
    <div>
      <p className="text-sm text-slate-400">
        Which tier each card/section shows up at, grouped by tier — use a module&apos;s dropdown to move it to a
        different one.
      </p>
      <div className="mt-3 space-y-2">
        {tiers.map((t) => {
          const items = byTier.get(t.id) ?? [];
          return (
            <CollapsibleSection key={t.id} title={t.name} count={items.length}>
              {items.length === 0 ? (
                <p className="text-xs text-white/30">Nothing assigned here.</p>
              ) : (
                items.map((m) => (
                  <div
                    key={m.id}
                    className="flex items-center justify-between gap-3 rounded-md bg-white/5 px-2.5 py-2"
                  >
                    <div className="min-w-0">
                      <p className="text-sm font-semibold text-white">{m.label}</p>
                      <p className="text-xs text-slate-400">{m.description}</p>
                    </div>
                    <select
                      value={t.id}
                      onChange={(e) => setModuleTier(m.id, e.target.value)}
                      className="shrink-0 rounded-md border border-white/15 bg-[#241a12] px-2 py-1.5 text-xs font-semibold text-white"
                    >
                      {tiers.map((tt) => (
                        <option key={tt.id} value={tt.id}>
                          {tt.name}
                        </option>
                      ))}
                    </select>
                  </div>
                ))
              )}
            </CollapsibleSection>
          );
        })}
      </div>
    </div>
  );
}

function AchievementsTab({ config, update }: { config: AdminConfig; update: Update }) {
  const [query, setQuery] = useState("");
  const tiers = sortedTiers(config);

  function setAchievementTier(id: AchievementId, tierId: string) {
    update((prev) => ({ ...prev, achievementTier: { ...prev.achievementTier, [id]: tierId } }));
  }

  function tierOf(a: (typeof ACHIEVEMENTS)[number]): string {
    return config.achievementTier[a.id] ?? (a.tier === 2 ? "tier2" : "tier1");
  }

  const q = query.trim().toLowerCase();
  const filtered = q
    ? ACHIEVEMENTS.filter((a) => a.title.toLowerCase().includes(q) || a.id.toLowerCase().includes(q))
    : ACHIEVEMENTS;

  const byTier = new Map<string, typeof ACHIEVEMENTS>();
  for (const a of filtered) {
    const tierId = tierOf(a);
    if (!byTier.has(tierId)) byTier.set(tierId, []);
    byTier.get(tierId)!.push(a);
  }

  return (
    <div>
      <p className="text-sm text-slate-400">
        Which tier each achievement is grouped and gated under — grouped by tier below, then by category.
      </p>
      <input
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        placeholder="Search achievements..."
        className="mt-3 w-full rounded-md border border-white/15 bg-transparent px-3 py-2 text-sm text-white placeholder:text-white/30"
      />
      <div className="mt-3 max-h-[32rem] space-y-2 overflow-y-auto pr-1">
        {tiers.map((t) => {
          const items = byTier.get(t.id) ?? [];
          if (q && items.length === 0) return null;

          const byCategory = new Map<AchievementCategory, typeof ACHIEVEMENTS>();
          for (const a of items) {
            if (!byCategory.has(a.category)) byCategory.set(a.category, []);
            byCategory.get(a.category)!.push(a);
          }

          return (
            <CollapsibleSection key={t.id} title={t.name} count={items.length}>
              {items.length === 0 ? (
                <p className="text-xs text-white/30">Nothing assigned here.</p>
              ) : (
                CATEGORY_ORDER.filter((c) => byCategory.has(c)).map((c) => (
                  <div key={c}>
                    <h5 className="mb-1.5 text-[0.65rem] font-bold uppercase tracking-wider text-white/40">
                      {CATEGORY_LABELS[c]}
                    </h5>
                    <div className="space-y-1.5">
                      {byCategory.get(c)!.map((a) => (
                        <div
                          key={a.id}
                          className="flex items-center justify-between gap-3 rounded-md bg-white/5 px-2.5 py-1.5 text-xs"
                        >
                          <div className="flex min-w-0 items-center gap-2">
                            <span aria-hidden="true">{a.secret ? "❓" : a.icon}</span>
                            {a.secret ? (
                              <span className="truncate text-slate-200">
                                ??? <span className="text-slate-500">({a.title})</span>
                              </span>
                            ) : (
                              <span className="truncate text-slate-200">{a.title}</span>
                            )}
                          </div>
                          <select
                            value={t.id}
                            onChange={(e) => setAchievementTier(a.id, e.target.value)}
                            className="shrink-0 rounded-md border border-white/15 bg-[#241a12] px-1.5 py-1 text-[0.65rem] font-semibold text-white"
                          >
                            {tiers.map((tt) => (
                              <option key={tt.id} value={tt.id}>
                                {tt.name}
                              </option>
                            ))}
                          </select>
                        </div>
                      ))}
                    </div>
                  </div>
                ))
              )}
            </CollapsibleSection>
          );
        })}
      </div>
    </div>
  );
}

function TipsTab({ config, update }: { config: AdminConfig; update: Update }) {
  const tiers = sortedTiers(config);

  function tipsFor(tierId: string): string[] {
    return config.tierTips[tierId] ?? [];
  }

  function addTip(tierId: string) {
    update((prev) => ({
      ...prev,
      tierTips: { ...prev.tierTips, [tierId]: [...(prev.tierTips[tierId] ?? []), ""] },
    }));
  }

  function setTip(tierId: string, index: number, text: string) {
    update((prev) => {
      const next = [...(prev.tierTips[tierId] ?? [])];
      next[index] = text;
      return { ...prev, tierTips: { ...prev.tierTips, [tierId]: next } };
    });
  }

  function removeTip(tierId: string, index: number) {
    update((prev) => {
      const next = (prev.tierTips[tierId] ?? []).filter((_, i) => i !== index);
      return { ...prev, tierTips: { ...prev.tierTips, [tierId]: next } };
    });
  }

  return (
    <div>
      <p className="text-sm text-slate-400">
        Shown in the small Tier Tip box on the live Outpost, for whichever tier a visitor has currently reached.
        Add more than one entry and they rotate every minute.
      </p>
      <div className="mt-3 space-y-2">
        {tiers.map((t) => {
          const tips = tipsFor(t.id);
          return (
            <CollapsibleSection key={t.id} title={t.name} count={tips.length}>
              {tips.length === 0 ? (
                <p className="text-xs text-white/30">No tips set — the Tier Tip box stays hidden for this tier.</p>
              ) : (
                tips.map((tip, i) => (
                  <div key={i} className="flex items-start gap-2">
                    <textarea
                      value={tip}
                      onChange={(e) => setTip(t.id, i, e.target.value)}
                      rows={2}
                      placeholder="What should the visitor do next?"
                      className="min-w-0 flex-1 resize-none rounded-md border border-white/15 bg-transparent px-2 py-1.5 text-xs text-white placeholder:text-white/30"
                    />
                    <button
                      type="button"
                      onClick={() => removeTip(t.id, i)}
                      className="shrink-0 text-xs font-semibold text-red-400 hover:text-red-300"
                    >
                      Remove
                    </button>
                  </div>
                ))
              )}
              <button
                type="button"
                onClick={() => addTip(t.id)}
                className="mt-1 rounded-md border border-white/15 px-2.5 py-1 text-xs font-semibold text-slate-300 transition-colors hover:border-[var(--outpost-accent)] hover:text-[var(--outpost-accent)]"
              >
                + Add tip
              </button>
            </CollapsibleSection>
          );
        })}
      </div>
    </div>
  );
}

// Modules, Achievements, and Tips are all fundamentally "what's assigned to
// each tier", so they live as sub-tabs under Tiers rather than as siblings
// of it — Tools is the one genuinely separate concept (gated by level, not
// tier membership) and stays its own top-level tab.
function TiersSection({ config, update }: { config: AdminConfig; update: Update }) {
  const [subTab, setSubTab] = useState<TierSubTab>("list");

  return (
    <div>
      <div className="flex flex-wrap gap-1.5">
        {(Object.keys(TIER_SUB_TAB_LABELS) as TierSubTab[]).map((t) => (
          <button
            key={t}
            type="button"
            onClick={() => setSubTab(t)}
            className={`rounded-md px-2.5 py-1 text-xs font-semibold transition-colors ${
              subTab === t ? "bg-[var(--outpost-accent-soft)] text-white" : "text-slate-400 hover:text-white"
            }`}
          >
            {TIER_SUB_TAB_LABELS[t]}
          </button>
        ))}
      </div>
      <div className="mt-4">
        {subTab === "list" && <TiersTab config={config} update={update} />}
        {subTab === "modules" && <ModulesTab config={config} update={update} />}
        {subTab === "achievements" && <AchievementsTab config={config} update={update} />}
        {subTab === "tips" && <TipsTab config={config} update={update} />}
      </div>
    </div>
  );
}

function ResourcesTab({ config, update }: { config: AdminConfig; update: Update }) {
  const meta = resolvedResourceMeta(config);
  const toolTiers = resolvedToolTiers(config).filter((t) => t.id !== "none");

  function setResourceEdit(id: ResourceId, patch: { name?: string; icon?: string }) {
    update((prev) => ({
      ...prev,
      resourceEdits: { ...prev.resourceEdits, [id]: { ...prev.resourceEdits[id], ...patch } },
    }));
  }

  function setCollectAmount(key: "wood" | "food", amount: number) {
    update((prev) => ({ ...prev, collectAmounts: { ...prev.collectAmounts, [key]: Math.max(0, amount) } }));
  }

  function setCraftCost(tierId: string, resourceId: ResourceId, amount: number) {
    update((prev) => {
      const nextCost = { ...resolvedCraftCost(prev, tierId) };
      if (amount > 0) nextCost[resourceId] = amount;
      else delete nextCost[resourceId];
      return { ...prev, craftCostEdits: { ...prev.craftCostEdits, [tierId]: nextCost } };
    });
  }

  return (
    <div className="space-y-5">
      <div>
        <p className="text-sm text-slate-400">Rename or re-icon each resource.</p>
        <div className="mt-3 grid grid-cols-1 gap-2 sm:grid-cols-2">
          {RESOURCE_IDS.map((id) => (
            <div key={id} className="flex items-center gap-2 rounded-lg border border-white/10 bg-white/5 p-2.5">
              <input
                value={meta[id].icon}
                onChange={(e) => setResourceEdit(id, { icon: e.target.value })}
                className="w-12 rounded-md border border-white/15 bg-transparent px-2 py-1 text-center text-sm text-white"
              />
              <input
                value={meta[id].name}
                onChange={(e) => setResourceEdit(id, { name: e.target.value })}
                className="min-w-0 flex-1 rounded-md border border-white/15 bg-transparent px-2 py-1 text-sm text-white"
              />
            </div>
          ))}
        </div>
      </div>

      <div>
        <p className="text-sm text-slate-400">How much Tree Mining and Hunting each collect per completion.</p>
        <div className="mt-3 flex flex-wrap gap-4">
          <label className="flex items-center gap-2 text-xs text-white/60">
            <span aria-hidden="true">{meta.wood.icon}</span> Tree Mining yields
            <input
              type="number"
              min={0}
              value={config.collectAmounts.wood}
              onChange={(e) => setCollectAmount("wood", Number(e.target.value) || 0)}
              className="w-16 rounded-md border border-white/15 bg-transparent px-2 py-1 text-white"
            />
            {meta.wood.name}
          </label>
          <label className="flex items-center gap-2 text-xs text-white/60">
            <span aria-hidden="true">{meta.food.icon}</span> Hunting yields
            <input
              type="number"
              min={0}
              value={config.collectAmounts.food}
              onChange={(e) => setCollectAmount("food", Number(e.target.value) || 0)}
              className="w-16 rounded-md border border-white/15 bg-transparent px-2 py-1 text-white"
            />
            {meta.food.name}
          </label>
        </div>
      </div>

      <div>
        <p className="text-sm text-slate-400">
          Craft cost for each tool tier — 0 means that resource isn&apos;t required.
        </p>
        <div className="mt-3 space-y-2">
          {toolTiers.map((t) => {
            const cost = resolvedCraftCost(config, t.id);
            return (
              <div key={t.id} className="rounded-lg border border-white/10 bg-white/5 p-3">
                <p className="mb-2 text-sm font-semibold text-white">
                  <span aria-hidden="true">{t.icon}</span> {t.name}
                </p>
                <div className="grid grid-cols-3 gap-2 sm:grid-cols-6">
                  {RESOURCE_IDS.map((id) => (
                    <label key={id} className="flex flex-col items-center gap-1 text-[0.65rem] text-white/40">
                      <span aria-hidden="true">{meta[id].icon}</span>
                      <input
                        type="number"
                        min={0}
                        value={cost[id] ?? 0}
                        onChange={(e) => setCraftCost(t.id, id, Math.max(0, Number(e.target.value) || 0))}
                        className="w-full rounded-md border border-white/15 bg-transparent px-1.5 py-1 text-center text-xs text-white"
                      />
                    </label>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

function editTool(update: Update, id: string, patch: Partial<ToolTier>) {
  update((prev) => ({ ...prev, toolTierEdits: { ...prev.toolTierEdits, [id]: { ...prev.toolTierEdits[id], ...patch } } }));
}

function ToolRow({ tool, isCustom, update }: { tool: ToolTier; isCustom: boolean; update: Update }) {
  function removeCustomTool() {
    update((prev) => ({ ...prev, customToolTiers: prev.customToolTiers.filter((t) => t.id !== tool.id) }));
  }

  return (
    <div className="rounded-lg border border-white/10 bg-white/5 p-3">
      <div className="flex flex-wrap items-center gap-2">
        <input
          value={tool.icon}
          onChange={(e) => editTool(update, tool.id, { icon: e.target.value })}
          className="w-12 rounded-md border border-white/15 bg-transparent px-2 py-1 text-center text-sm text-white"
        />
        <input
          value={tool.name}
          onChange={(e) => editTool(update, tool.id, { name: e.target.value })}
          className="min-w-0 flex-1 rounded-md border border-white/15 bg-transparent px-2 py-1 text-sm text-white"
        />
        {isCustom && (
          <button
            type="button"
            onClick={removeCustomTool}
            className="text-xs font-semibold text-red-400 hover:text-red-300"
          >
            Remove
          </button>
        )}
      </div>
      <div className="mt-2 grid grid-cols-3 gap-2 text-xs">
        <label className="flex flex-col gap-1 text-white/40">
          Tree Mining (ms)
          <input
            type="number"
            min={200}
            value={tool.treeMiningMs}
            onChange={(e) => editTool(update, tool.id, { treeMiningMs: Math.max(200, Number(e.target.value) || 200) })}
            className="rounded-md border border-white/15 bg-transparent px-2 py-1 text-white"
          />
        </label>
        <label className="flex flex-col gap-1 text-white/40">
          Hunting (ms)
          <input
            type="number"
            min={200}
            value={tool.huntingMs}
            onChange={(e) => editTool(update, tool.id, { huntingMs: Math.max(200, Number(e.target.value) || 200) })}
            className="rounded-md border border-white/15 bg-transparent px-2 py-1 text-white"
          />
        </label>
        <label className="flex flex-col gap-1 text-white/40">
          Mining (ms, blank = locked)
          <input
            type="number"
            min={0}
            value={tool.miningMs ?? ""}
            onChange={(e) =>
              editTool(update, tool.id, { miningMs: e.target.value === "" ? null : Math.max(0, Number(e.target.value)) })
            }
            className="rounded-md border border-white/15 bg-transparent px-2 py-1 text-white"
          />
        </label>
      </div>
    </div>
  );
}

function ToolsTab({ config, update }: { config: AdminConfig; update: Update }) {
  const resolved = resolvedToolTiers(config);
  const meta = resolvedResourceMeta(config);
  const [newTool, setNewTool] = useState({
    name: "",
    icon: "✨",
    treeMiningMs: 1200,
    huntingMs: 2000,
    miningMs: 1200,
    costResource: "iron" as ResourceId,
    costAmount: 30,
  });

  function addCustomTool() {
    const name = newTool.name.trim();
    if (!name) return;
    update((prev) => {
      const takenIds = [...TOOL_ORDER, ...prev.customToolTiers.map((t) => t.id)];
      let id = name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "") || "custom-tool";
      while (takenIds.includes(id)) id = `${id}-2`;
      const tool: CustomToolTier = {
        id,
        name,
        icon: newTool.icon || "✨",
        treeMiningMs: newTool.treeMiningMs,
        huntingMs: newTool.huntingMs,
        miningMs: newTool.miningMs,
        craftCost: { [newTool.costResource]: newTool.costAmount },
      };
      return { ...prev, customToolTiers: [...prev.customToolTiers, tool] };
    });
    setNewTool((p) => ({ ...p, name: "" }));
  }

  return (
    <div>
      <p className="text-sm text-slate-400">
        The shared tool tier that speeds up Tree Mining/Hunting and unlocks better Mining yields. Tiers you add here
        go beyond Netherite, craft in the Soulforge, and scale mining yields up automatically.
      </p>
      <div className="mt-3 space-y-2">
        {resolved.map((t) => (
          <ToolRow key={t.id} tool={t} isCustom={!TOOL_ORDER.includes(t.id as (typeof TOOL_ORDER)[number])} update={update} />
        ))}
      </div>

      <div className="mt-4 rounded-lg border border-dashed border-white/20 p-3">
        <p className="text-xs font-semibold uppercase tracking-wider text-white/50">Add a tool tier</p>
        <div className="mt-2 flex flex-wrap gap-2">
          <input
            placeholder="Icon"
            value={newTool.icon}
            onChange={(e) => setNewTool((p) => ({ ...p, icon: e.target.value }))}
            className="w-14 rounded-md border border-white/15 bg-transparent px-2 py-1 text-center text-sm text-white"
          />
          <input
            placeholder="Name"
            value={newTool.name}
            onChange={(e) => setNewTool((p) => ({ ...p, name: e.target.value }))}
            className="min-w-[8rem] flex-1 rounded-md border border-white/15 bg-transparent px-2 py-1 text-sm text-white"
          />
        </div>
        <div className="mt-2 grid grid-cols-3 gap-2 text-xs">
          <label className="flex flex-col gap-1 text-white/40">
            Tree Mining (ms)
            <input
              type="number"
              min={200}
              value={newTool.treeMiningMs}
              onChange={(e) => setNewTool((p) => ({ ...p, treeMiningMs: Number(e.target.value) || p.treeMiningMs }))}
              className="rounded-md border border-white/15 bg-transparent px-2 py-1 text-white"
            />
          </label>
          <label className="flex flex-col gap-1 text-white/40">
            Hunting (ms)
            <input
              type="number"
              min={200}
              value={newTool.huntingMs}
              onChange={(e) => setNewTool((p) => ({ ...p, huntingMs: Number(e.target.value) || p.huntingMs }))}
              className="rounded-md border border-white/15 bg-transparent px-2 py-1 text-white"
            />
          </label>
          <label className="flex flex-col gap-1 text-white/40">
            Mining (ms)
            <input
              type="number"
              min={200}
              value={newTool.miningMs}
              onChange={(e) => setNewTool((p) => ({ ...p, miningMs: Number(e.target.value) || p.miningMs }))}
              className="rounded-md border border-white/15 bg-transparent px-2 py-1 text-white"
            />
          </label>
        </div>
        <div className="mt-2 flex flex-wrap items-center gap-2 text-xs">
          <span className="text-white/40">Craft cost:</span>
          <select
            value={newTool.costResource}
            onChange={(e) => setNewTool((p) => ({ ...p, costResource: e.target.value as ResourceId }))}
            className="rounded-md border border-white/15 bg-[#241a12] px-2 py-1 text-white"
          >
            {RESOURCE_IDS.map((id) => (
              <option key={id} value={id}>
                {meta[id].name}
              </option>
            ))}
          </select>
          <input
            type="number"
            min={1}
            value={newTool.costAmount}
            onChange={(e) => setNewTool((p) => ({ ...p, costAmount: Math.max(1, Number(e.target.value) || 1) }))}
            className="w-20 rounded-md border border-white/15 bg-transparent px-2 py-1 text-white"
          />
        </div>
        <button
          type="button"
          onClick={addCustomTool}
          className="mt-3 rounded-lg border border-white/15 px-3 py-1.5 text-xs font-semibold text-slate-300 transition-colors hover:border-[var(--outpost-accent)] hover:text-[var(--outpost-accent)]"
        >
          + Add tool tier
        </button>
      </div>
    </div>
  );
}

// Shared by every row in the Features tab. The on/off switch is optional —
// omit `enabled`/`onToggle` for a feature that only ever has a tier
// requirement, no real "off" state (Hunting/Mining: Gathering itself is
// already hideable as a whole card via the Modules tab, and there's no
// separate concept of "Mining off but Tree Mining/Hunting still on" worth a
// dedicated switch). The tier dropdown disables along with the switch when
// there is one, since a tier requirement is meaningless for something off
// entirely.
function FeatureRow({
  title,
  description,
  enabled,
  onToggle,
  tierId,
  onTierChange,
  tiers,
}: {
  title: string;
  description: string;
  enabled?: boolean;
  onToggle?: (next: boolean) => void;
  tierId?: string;
  onTierChange?: (tierId: string) => void;
  tiers?: TierDef[];
}) {
  const hasSwitch = enabled !== undefined && onToggle !== undefined;
  return (
    <div className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-white/10 bg-white/5 p-3">
      <div className="min-w-0">
        <p className="text-sm font-semibold text-white">{title}</p>
        <p className="text-xs text-slate-400">{description}</p>
      </div>
      <div className="flex shrink-0 items-center gap-2">
        {tierId !== undefined && tiers && onTierChange && (
          <label className="flex items-center gap-1.5 text-xs text-white/50">
            Unlocks at
            <select
              value={tierId}
              disabled={hasSwitch && !enabled}
              onChange={(e) => onTierChange(e.target.value)}
              className="rounded-md border border-white/15 bg-[#241a12] px-2 py-1.5 text-xs font-semibold text-white disabled:opacity-40"
            >
              {tiers.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.name}
                </option>
              ))}
            </select>
          </label>
        )}
        {hasSwitch && (
          <button
            type="button"
            role="switch"
            aria-checked={enabled}
            aria-label={title}
            onClick={() => onToggle(!enabled)}
            className={`relative h-5 w-9 shrink-0 rounded-full border transition-colors duration-200 [forced-color-adjust:none] ${
              enabled ? "border-[var(--outpost-accent)] bg-[var(--outpost-accent)]" : "border-white/25 bg-white/10"
            }`}
          >
            <span
              className={`absolute left-0.5 top-0.5 h-3.5 w-3.5 rounded-full bg-white shadow transition-transform duration-200 [forced-color-adjust:none] ${
                enabled ? "translate-x-4" : "translate-x-0"
              }`}
            />
          </button>
        )}
      </div>
    </div>
  );
}

function FeaturesTab({ config, update }: { config: AdminConfig; update: Update }) {
  const tiers = sortedTiers(config);
  const features = config.features;

  function setFeature<K extends keyof FeaturesConfig>(key: K, value: FeaturesConfig[K]) {
    update((prev) => ({ ...prev, features: { ...prev.features, [key]: value } }));
  }

  return (
    <div className="space-y-3">
      <p className="text-sm text-slate-400">
        Whole mechanics, switched on/off — several can also be pushed behind a later tier instead of being available
        from the start. Everything here defaults to matching today&apos;s actual behavior.
      </p>

      <FeatureRow
        title="Day/Night Cycle"
        description="Sun/moon arcing across the top of every page, cycling the site's light/dark theme to match."
        enabled={features.dayNightCycleEnabled}
        onToggle={(v) => setFeature("dayNightCycleEnabled", v)}
        tierId={features.dayNightCycleTierId}
        onTierChange={(v) => setFeature("dayNightCycleTierId", v)}
        tiers={tiers}
      />
      <FeatureRow
        title="Stars"
        description="Twinkling stars in the night sky, part of the day/night cycle above."
        enabled={features.starsEnabled}
        onToggle={(v) => setFeature("starsEnabled", v)}
      />
      <FeatureRow
        title="Hunting"
        description="The Hunting toggle inside the Gathering card. Campfire cooking needs Food, so it unlocks at this same tier."
        tierId={features.huntingTierId}
        onTierChange={(v) => setFeature("huntingTierId", v)}
        tiers={tiers}
      />
      <FeatureRow
        title="Mining"
        description="The Mining toggle inside the Gathering card."
        tierId={features.miningTierId}
        onTierChange={(v) => setFeature("miningTierId", v)}
        tiers={tiers}
      />
    </div>
  );
}

const RESET_CONFIRM_WINDOW_MS = 4000;

function ResetControl({ onReset }: { onReset: () => void }) {
  const [confirming, setConfirming] = useState(false);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => () => { if (timerRef.current) clearTimeout(timerRef.current); }, []);

  function handleClick() {
    if (!confirming) {
      setConfirming(true);
      timerRef.current = setTimeout(() => setConfirming(false), RESET_CONFIRM_WINDOW_MS);
      return;
    }
    if (timerRef.current) clearTimeout(timerRef.current);
    setConfirming(false);
    onReset();
  }

  return (
    <div className="flex items-center justify-between gap-4">
      <div className="min-w-0">
        <p className="text-sm font-semibold text-white">Reset customization</p>
        <p className="mt-0.5 text-xs text-slate-400">
          Restores tiers, module placement, achievement tiers, resource names/costs, tools, and feature toggles to
          the defaults. Doesn&apos;t touch your actual progress (achievements, resources collected, XP).
        </p>
      </div>
      <button
        type="button"
        onClick={handleClick}
        className={`shrink-0 rounded-lg border px-3 py-1.5 text-xs font-semibold transition-colors ${
          confirming
            ? "border-red-500 bg-red-950/60 text-red-300"
            : "border-white/15 text-slate-300 hover:border-[var(--outpost-accent)] hover:text-[var(--outpost-accent)]"
        }`}
      >
        {confirming ? "Confirm reset?" : "Reset to defaults"}
      </button>
    </div>
  );
}

export default function AdminPanel() {
  const [config, setConfig] = useState<AdminConfig>(defaultAdminConfig());
  const [mounted, setMounted] = useState(false);
  const [tab, setTab] = useState<Tab>("tiers");

  useEffect(() => {
    setConfig(loadAdminConfig());
    setMounted(true);
  }, []);

  const update: Update = (updater) => {
    setConfig((prev) => {
      const next = updater(prev);
      saveAdminConfig(next);
      return next;
    });
  };

  function resetAll() {
    const next = defaultAdminConfig();
    saveAdminConfig(next);
    setConfig(next);
  }

  return (
    <div className="outpost-zone overflow-hidden rounded-xl">
      <div className="outpost-frame relative">
        <OutpostCorners />
        <div className="px-5 py-5 sm:px-6 sm:py-6">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <span className="outpost-status-tag">
                <span className="outpost-status-dot" aria-hidden="true" />
                Outpost Admin
              </span>
              <h1 className="mt-3 font-heading text-2xl font-extrabold text-white">Customize the Outpost</h1>
              <p className="mt-1 max-w-xl text-sm text-slate-400">
                Personal, saved only in this browser — decide which tier each card, achievement, and tool belongs to,
                and add your own tiers or tool ranks. Nothing here changes what anyone else sees; changes apply next
                time you open the Outpost.
              </p>
            </div>
            <Link
              href="/community"
              className="shrink-0 text-xs font-semibold text-white/50 transition-colors hover:text-[var(--outpost-accent)]"
            >
              {"←"} Back to Community
            </Link>
          </div>

          {!mounted ? (
            <div className="mt-6 h-64 animate-pulse rounded-xl bg-white/5" />
          ) : (
            <>
              <div className="mt-5 flex flex-wrap gap-2 border-b border-white/10 pb-3">
                {(Object.keys(TAB_LABELS) as Tab[]).map((t) => (
                  <button
                    key={t}
                    type="button"
                    onClick={() => setTab(t)}
                    className={`rounded-lg px-3 py-1.5 text-xs font-semibold transition-colors ${
                      tab === t
                        ? "bg-[var(--outpost-accent-soft)] text-white"
                        : "text-slate-400 hover:text-white"
                    }`}
                  >
                    {TAB_LABELS[t]}
                  </button>
                ))}
              </div>

              <div className="mt-5">
                {tab === "tiers" && <TiersSection config={config} update={update} />}
                {tab === "resources" && <ResourcesTab config={config} update={update} />}
                {tab === "tools" && <ToolsTab config={config} update={update} />}
                {tab === "features" && <FeaturesTab config={config} update={update} />}
              </div>

              <div className="mt-6 border-t border-white/10 pt-4">
                <ResetControl onReset={resetAll} />
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
