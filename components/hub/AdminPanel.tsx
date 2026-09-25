"use client";

import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
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
  importAdminConfig,
  loadAdminConfig,
  resolvedCraftCost,
  resolvedMechanic,
  resolvedModuleTier,
  resolvedResourceMeta,
  resolvedToolTiers,
  resolvedUpgrades,
  saveAdminConfig,
  type AdminConfig,
  type CustomToolTier,
  type FeaturesConfig,
  type TierDef,
} from "./admin-config";
import { mechanicConfigFields } from "./mechanics";
import { DEFAULT_MODULE_TIER, MODULES, type ModuleId } from "./module-registry";
import OutpostCorners from "./OutpostCorners";
import { RESOURCE_IDS, TOOL_ORDER, type ResourceId, type ToolTier } from "./resources";
import type { UpgradeId } from "./upgrade-catalog";
import EngineAdminTab from "./engine/ui/admin/EngineAdminTab";
import EngineDebugPanel from "./engine/ui/admin/EngineDebugPanel";

// Same measure-then-position recipe as AchievementGallery.tsx's tile
// tooltip — see MechanicSettingsMenu below.
const useIsomorphicLayoutEffect =
  typeof window !== "undefined" ? useLayoutEffect : useEffect;

type Tab = "tiers" | "resources" | "tools" | "features" | "upgrades" | "engine" | "engine-debug";
const TAB_LABELS: Record<Tab, string> = {
  tiers: "Tiers",
  resources: "Resources",
  tools: "Tools",
  features: "Features",
  upgrades: "Upgrades",
  engine: "Engine",
  "engine-debug": "Engine Debug",
};

type TierSubTab = "list" | "modules" | "achievements" | "tips";
const TIER_SUB_TAB_LABELS: Record<TierSubTab, string> = {
  list: "Tier List",
  modules: "Modules",
  achievements: "Achievements",
  tips: "Tips",
};

type Update = (updater: (prev: AdminConfig) => AdminConfig) => void;

// Every tab that lists tiers (here, Modules, Achievements, Tips, Features)
// shows them in creation order rather than sorting by "unlocks at" —
// otherwise editing a threshold on the Tier List tab reshuffles rows/groups
// everywhere else too, and the built-in "Tier N" names stop matching their
// positions. The live Outpost itself still sorts by threshold where it
// actually matters for progression (see admin-config.ts's resolvedTiers).
function TiersTab({ config, update }: { config: AdminConfig; update: Update }) {
  const tiers = config.tiers;

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

const MECHANIC_MENU_WIDTH_PX = 272; // matches .outpost-settings-dropdown's own 17rem
const MECHANIC_MENU_MARGIN_PX = 8;

// A module's mechanic class (mechanics.ts) is the single source of truth
// for what's tunable — this menu just reads a class's own `configFields`
// and renders a number input per one, so a module with no registered
// mechanic (most of them — flavor cards, quizzes, static sections) shows no
// gear at all rather than an empty popover.
function MechanicSettingsMenu({ moduleId, config, update }: { moduleId: ModuleId; config: AdminConfig; update: Update }) {
  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);
  const fields = mechanicConfigFields(moduleId);
  // The button's own rect at the moment the panel opens — recomputed into a
  // panel position below rather than used directly, since which side it
  // opens on can flip after mount (see the layout effect below).
  const [anchorRect, setAnchorRect] = useState<{ left: number; top: number; bottom: number } | null>(null);
  const [placeAbove, setPlaceAbove] = useState(false);

  useEffect(() => {
    if (!open) return;
    function handlePointerDown(e: PointerEvent) {
      const target = e.target as Node;
      const insideButton = containerRef.current?.contains(target);
      const insidePanel = panelRef.current?.contains(target);
      if (!insideButton && !insidePanel) setOpen(false);
    }
    function handleKey(e: KeyboardEvent) {
      if (e.key === "Escape") setOpen(false);
    }
    window.addEventListener("pointerdown", handlePointerDown);
    window.addEventListener("keydown", handleKey);
    return () => {
      window.removeEventListener("pointerdown", handlePointerDown);
      window.removeEventListener("keydown", handleKey);
    };
  }, [open]);

  // A fixed-position panel doesn't track the page scrolling under it, so
  // dismiss rather than let it drift out of alignment with its button —
  // same reasoning as AchievementGallery's tile tooltip.
  useEffect(() => {
    if (!open) return;
    function dismiss() {
      setOpen(false);
    }
    window.addEventListener("scroll", dismiss, true);
    window.addEventListener("resize", dismiss);
    return () => {
      window.removeEventListener("scroll", dismiss, true);
      window.removeEventListener("resize", dismiss);
    };
  }, [open]);

  useIsomorphicLayoutEffect(() => {
    if (!open) return;
    const rect = containerRef.current?.getBoundingClientRect();
    if (rect) setAnchorRect({ left: rect.left, top: rect.top, bottom: rect.bottom });
  }, [open]);

  // Opens below the button by default (the natural reading direction) and
  // only flips above once actually measured not to fit under the current
  // scroll position — e.g. a row near the bottom of the admin panel with
  // the browser window short. Runs before paint so the flip itself never
  // flashes the wrong placement first. Same recipe as AchievementGallery's
  // tile tooltip.
  useIsomorphicLayoutEffect(() => {
    if (!open || !anchorRect || placeAbove) return;
    const height = panelRef.current?.getBoundingClientRect().height ?? 0;
    if (anchorRect.bottom + MECHANIC_MENU_MARGIN_PX + height > window.innerHeight) {
      setPlaceAbove(true);
    }
  }, [open, anchorRect, placeAbove]);

  function toggleOpen() {
    if (!open) {
      setAnchorRect(null);
      setPlaceAbove(false);
    }
    setOpen((v) => !v);
  }

  if (fields.length === 0) return null;

  const resolved = resolvedMechanic<Record<string, number>>(config, moduleId);

  function setField(key: string, value: number) {
    update((prev) => ({
      ...prev,
      mechanicOverrides: {
        ...prev.mechanicOverrides,
        [moduleId]: { ...prev.mechanicOverrides[moduleId], [key]: value },
      },
    }));
  }

  return (
    <div ref={containerRef} className="relative shrink-0">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        aria-haspopup="true"
        aria-label="Mechanic settings"
        className={`flex h-7 w-7 items-center justify-center rounded-md border text-xs transition-colors ${
          open
            ? "border-[var(--outpost-accent)] text-[var(--outpost-accent)]"
            : "border-white/15 text-white/50 hover:border-[var(--outpost-accent)] hover:text-[var(--outpost-accent)]"
        }`}
      >
        <span aria-hidden="true">{"⚙️"}</span>
      </button>

      {open && (
        <div className="outpost-settings-dropdown" role="menu">
          <p className="text-xs font-bold uppercase tracking-wider text-white/40">Mechanic Settings</p>
          <div className="mt-2.5 space-y-3">
            {fields.map((f) => (
              <label key={f.key} className="block">
                <div className="flex items-baseline justify-between gap-2">
                  <span className="text-xs font-semibold text-white">{f.label}</span>
                  <span className="text-[0.65rem] text-white/40">
                    {resolved[f.key]}
                    {f.suffix ? ` ${f.suffix}` : ""}
                  </span>
                </div>
                {f.description && <p className="mt-0.5 text-[0.65rem] font-normal normal-case text-white/40">{f.description}</p>}
                <input
                  type="number"
                  min={f.min}
                  max={f.max}
                  step={f.step}
                  value={resolved[f.key]}
                  onChange={(e) =>
                    setField(f.key, Math.min(f.max, Math.max(f.min, Number(e.target.value) || 0)))
                  }
                  className="mt-1 w-full rounded-md border border-white/15 bg-transparent px-2 py-1 text-xs text-white"
                />
              </label>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function ModulesTab({ config, update }: { config: AdminConfig; update: Update }) {
  // Creation order, not threshold order — see TiersTab's comment. Grouping
  // by tier here would otherwise reshuffle every time a threshold is edited
  // on the Tier List tab, even though nothing on this tab changed.
  const tiers = config.tiers;

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
                    <div className="flex shrink-0 items-center gap-1.5">
                      <MechanicSettingsMenu moduleId={m.id} config={config} update={update} />
                      <div className="relative shrink-0">
                        <select
                          value={t.id}
                          onChange={(e) => setModuleTier(m.id, e.target.value)}
                          className="appearance-none rounded-md border border-white/15 bg-[#241a12] py-1.5 pl-2 pr-6 text-xs font-semibold text-white"
                        >
                          {tiers.map((tt) => (
                            <option key={tt.id} value={tt.id}>
                              {tt.name}
                            </option>
                          ))}
                        </select>
                        <svg
                          aria-hidden="true"
                          className="pointer-events-none absolute right-2 top-1/2 h-3 w-3 -translate-y-1/2 text-white/50"
                          viewBox="0 0 20 20"
                          fill="none"
                          stroke="currentColor"
                          strokeWidth={2}
                          strokeLinecap="round"
                          strokeLinejoin="round"
                        >
                          <path d="M5 7.5l5 5 5-5" />
                        </svg>
                      </div>
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

const ACHIEVEMENT_HINT_HOLD_MS = 1000;
const ACHIEVEMENT_HINT_RING_CIRCUMFERENCE = 2 * Math.PI * 6;

// Hovering an achievement's icon/title shows a small ring that fills over
// one second — a preview of the wait rather than a dead pause — then swaps
// to the achievement's full description as a tooltip, for rows whose title
// alone (especially secret ones, shown as "???") doesn't say much.
function AchievementLabel({ achievement }: { achievement: (typeof ACHIEVEMENTS)[number] }) {
  const [hovering, setHovering] = useState(false);
  const [ready, setReady] = useState(false);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => () => { if (timerRef.current) clearTimeout(timerRef.current); }, []);

  function handleEnter() {
    setHovering(true);
    timerRef.current = setTimeout(() => setReady(true), ACHIEVEMENT_HINT_HOLD_MS);
  }
  function handleLeave() {
    if (timerRef.current) clearTimeout(timerRef.current);
    setHovering(false);
    setReady(false);
  }

  // Touch devices have no hover — a tap-and-hold does the same job.
  // preventDefault keeps the hold from also firing a text-selection/callout
  // or, since this isn't a link/button, a synthetic click on release.
  function handleTouchStart(e: React.TouchEvent) {
    e.preventDefault();
    handleEnter();
  }

  return (
    <div
      className="relative flex min-w-0 items-center gap-2"
      onMouseEnter={handleEnter}
      onMouseLeave={handleLeave}
      onTouchStart={handleTouchStart}
      onTouchEnd={handleLeave}
      onTouchCancel={handleLeave}
    >
      <span aria-hidden="true">{achievement.secret ? "❓" : achievement.icon}</span>
      {achievement.secret ? (
        <span className="truncate text-slate-200">
          ??? <span className="text-slate-500">({achievement.title})</span>
        </span>
      ) : (
        <span className="truncate text-slate-200">{achievement.title}</span>
      )}
      {hovering && !ready && (
        <svg className="admin-hint-ring h-3 w-3 shrink-0" viewBox="0 0 16 16" aria-hidden="true">
          <circle cx="8" cy="8" r="6" fill="none" stroke="currentColor" strokeWidth="2" className="text-white/15" />
          <circle
            cx="8"
            cy="8"
            r="6"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeDasharray={ACHIEVEMENT_HINT_RING_CIRCUMFERENCE}
            className="admin-hint-ring-fill text-[var(--outpost-accent)]"
          />
        </svg>
      )}
      {ready && (
        <div
          role="tooltip"
          className="admin-hint-tooltip pointer-events-none absolute left-0 top-full z-20 mt-1.5 w-56 rounded-md border border-white/15 bg-[#1c140d] px-2.5 py-1.5 text-[0.65rem] font-normal normal-case leading-snug text-slate-200 shadow-lg"
        >
          {achievement.description}
        </div>
      )}
    </div>
  );
}

function AchievementsTab({ config, update }: { config: AdminConfig; update: Update }) {
  const [query, setQuery] = useState("");
  // Creation order, not threshold order — see TiersTab's comment.
  const tiers = config.tiers;

  function setAchievementTier(id: AchievementId, tierId: string) {
    update((prev) => ({ ...prev, achievementTier: { ...prev.achievementTier, [id]: tierId } }));
  }

  function setAchievementDefault(id: AchievementId, isDefault: boolean) {
    update((prev) => {
      const achievementDefault = { ...prev.achievementDefault };
      if (isDefault) achievementDefault[id] = true;
      else delete achievementDefault[id];
      return { ...prev, achievementDefault };
    });
  }

  function tierOf(a: (typeof ACHIEVEMENTS)[number]): string {
    return config.achievementTier[a.id] ?? (a.tier === 2 ? "tier2" : "tier1");
  }

  // Shared by the Default group and every category group below — the pin
  // toggle is the one control specific to this row (the tier select is
  // otherwise identical to ModulesTab's).
  function AchievementRow({ a, tierId }: { a: (typeof ACHIEVEMENTS)[number]; tierId: string }) {
    const isDefault = config.achievementDefault[a.id] === true;
    return (
      <div className="flex items-center justify-between gap-2 rounded-md bg-white/5 px-2.5 py-1.5 text-xs">
        <AchievementLabel achievement={a} />
        <div className="flex shrink-0 items-center gap-1.5">
          <button
            type="button"
            onClick={() => setAchievementDefault(a.id, !isDefault)}
            aria-pressed={isDefault}
            title={
              isDefault
                ? "Default — shown first in its tier, ahead of every category. Click to unpin."
                : "Pin to the Default group — shown first in its tier, ahead of every category."
            }
            className={`rounded-md border px-1.5 py-1 text-[0.65rem] transition-colors ${
              isDefault
                ? "border-[var(--outpost-accent)] bg-[var(--outpost-accent-soft)] text-[var(--outpost-accent)]"
                : "border-white/15 text-white/25 hover:text-white/60"
            }`}
          >
            <span aria-hidden="true">{"\u{1F4CC}"}</span>
          </button>
          <select
            value={tierId}
            onChange={(e) => setAchievementTier(a.id, e.target.value)}
            className="rounded-md border border-white/15 bg-[#241a12] px-1.5 py-1 text-[0.65rem] font-semibold text-white"
          >
            {tiers.map((tt) => (
              <option key={tt.id} value={tt.id}>
                {tt.name}
              </option>
            ))}
          </select>
        </div>
      </div>
    );
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
        Which tier each achievement is grouped and gated under — grouped by tier below, then by category. Pin the
        odds and ends that don&apos;t belong to any one category (resizing the window, an old cheat code) to{" "}
        <span aria-hidden="true">{"\u{1F4CC}"}</span> Default, and they&apos;ll show first in their tier instead.
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

          const pinned = items.filter((a) => config.achievementDefault[a.id] === true);
          const rest = items.filter((a) => config.achievementDefault[a.id] !== true);

          const byCategory = new Map<AchievementCategory, typeof ACHIEVEMENTS>();
          for (const a of rest) {
            if (!byCategory.has(a.category)) byCategory.set(a.category, []);
            byCategory.get(a.category)!.push(a);
          }

          return (
            <CollapsibleSection key={t.id} title={t.name} count={items.length}>
              {items.length === 0 ? (
                <p className="text-xs text-white/30">Nothing assigned here.</p>
              ) : (
                <>
                  {pinned.length > 0 && (
                    <div>
                      <h5 className="mb-1.5 flex items-center gap-1 text-[0.65rem] font-bold uppercase tracking-wider text-white/40">
                        <span aria-hidden="true">{"\u{1F4CC}"}</span> Default
                      </h5>
                      <div className="space-y-1.5">
                        {pinned.map((a) => (
                          <AchievementRow key={a.id} a={a} tierId={t.id} />
                        ))}
                      </div>
                    </div>
                  )}
                  {CATEGORY_ORDER.filter((c) => byCategory.has(c)).map((c) => (
                    <div key={c}>
                      <h5 className="mb-1.5 text-[0.65rem] font-bold uppercase tracking-wider text-white/40">
                        {CATEGORY_LABELS[c]}
                      </h5>
                      <div className="space-y-1.5">
                        {byCategory.get(c)!.map((a) => (
                          <AchievementRow key={a.id} a={a} tierId={t.id} />
                        ))}
                      </div>
                    </div>
                  ))}
                </>
              )}
            </CollapsibleSection>
          );
        })}
      </div>
    </div>
  );
}

function TipsTab({ config, update }: { config: AdminConfig; update: Update }) {
  // Creation order, not threshold order — see TiersTab's comment.
  const tiers = config.tiers;

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
  extra,
}: {
  title: string;
  description: string;
  enabled?: boolean;
  onToggle?: (next: boolean) => void;
  tierId?: string;
  onTierChange?: (tierId: string) => void;
  tiers?: TierDef[];
  /** Extra control slotted in before the tier picker/switch — e.g. a
   * MechanicSettingsMenu gear for a feature that also has tunable numeric
   * settings (Upgrades/Prestige, moved here from the Modules tab). */
  extra?: React.ReactNode;
}) {
  const hasSwitch = enabled !== undefined && onToggle !== undefined;
  return (
    <div className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-white/10 bg-white/5 p-3">
      <div className="min-w-0">
        <p className="text-sm font-semibold text-white">{title}</p>
        <p className="text-xs text-slate-400">{description}</p>
      </div>
      <div className="flex shrink-0 items-center gap-2">
        {extra}
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
  // Creation order, not threshold order — see TiersTab's comment.
  const tiers = config.tiers;
  const features = config.features;

  function setFeature<K extends keyof FeaturesConfig>(key: K, value: FeaturesConfig[K]) {
    update((prev) => ({ ...prev, features: { ...prev.features, [key]: value } }));
  }

  return (
    <div className="space-y-3">
      <p className="text-sm text-slate-400">
        Whole mechanics, switched on/off — several can also be pushed behind a later tier instead of being available
        from the start. Everything here defaults to matching today&apos;s actual behavior. Day/Night Cycle, Stars,
        Hunting, Mining, and Snow live in the Upgrades tab now — each is its own shop entry with its own cost and
        tier there instead of an admin toggle here.
      </p>

      <FeatureRow
        title="Upgrades"
        description="A Skill Points shop for small permanent capability unlocks — a badge in the Outpost header (top-left, next to Prestige) instead of a card. Individual upgrades still keep their own tier in upgrade-catalog.ts."
        enabled={features.upgradesEnabled}
        onToggle={(v) => setFeature("upgradesEnabled", v)}
        tierId={features.upgradesTierId}
        onTierChange={(v) => setFeature("upgradesTierId", v)}
        tiers={tiers}
        extra={<MechanicSettingsMenu moduleId="upgrades" config={config} update={update} />}
      />
      <FeatureRow
        title="Prestige"
        description="Resets the resource/tool loop for permanent Legacy perks — a badge in the Outpost header instead of a card. Reveals once the Outpost's own top configured tier (Tier List tab) is reached, same as before; there's no separate tier picker here."
        enabled={features.prestigeEnabled}
        onToggle={(v) => setFeature("prestigeEnabled", v)}
        extra={<MechanicSettingsMenu moduleId="prestige" config={config} update={update} />}
      />
    </div>
  );
}

// The Skill Points shop's catalog (upgrade-catalog.ts) — one entry per
// purchasable upgrade, grouped by the tier it becomes buyable at (same
// grouped-by-tier layout as ModulesTab, for the same reason: an admin
// changing a tier's threshold on the Tier List tab shouldn't reshuffle this
// list's groups, only which tier each already-assigned entry belongs to).
// Name/icon/description stay fixed in the catalog itself; cost and tier are
// the two things worth tuning per-browser without touching code.
function UpgradesTab({ config, update }: { config: AdminConfig; update: Update }) {
  const tiers = config.tiers;

  function setUpgradeEdit(id: UpgradeId, patch: { cost?: number; tierId?: string }) {
    update((prev) => ({
      ...prev,
      upgradeEdits: { ...prev.upgradeEdits, [id]: { ...prev.upgradeEdits[id], ...patch } },
    }));
  }

  const resolved = resolvedUpgrades(config);
  const byTier = new Map<string, typeof resolved>();
  for (const u of resolved) {
    if (!byTier.has(u.tierId)) byTier.set(u.tierId, []);
    byTier.get(u.tierId)!.push(u);
  }

  return (
    <div>
      <p className="text-sm text-slate-400">
        Every purchasable upgrade in the header&apos;s Upgrades shop, grouped by the tier it becomes buyable at — set
        each one&apos;s Skill Point cost and move it to a different tier.
      </p>
      <div className="mt-3 space-y-2">
        {tiers.map((t) => {
          const items = byTier.get(t.id) ?? [];
          return (
            <CollapsibleSection key={t.id} title={t.name} count={items.length}>
              {items.length === 0 ? (
                <p className="text-xs text-white/30">Nothing assigned here.</p>
              ) : (
                items.map((u) => (
                  <div
                    key={u.id}
                    className="flex flex-wrap items-center justify-between gap-3 rounded-md bg-white/5 px-2.5 py-2"
                  >
                    <div className="flex min-w-0 items-center gap-2">
                      <span aria-hidden="true">{u.icon}</span>
                      <div className="min-w-0">
                        <p className="text-sm font-semibold text-white">{u.name}</p>
                        <p className="text-xs text-slate-400">{u.description}</p>
                      </div>
                    </div>
                    <div className="flex shrink-0 items-center gap-2">
                      <label className="flex items-center gap-1.5 text-xs text-white/50">
                        <input
                          type="number"
                          min={0}
                          value={u.cost}
                          onChange={(e) =>
                            setUpgradeEdit(u.id, { cost: Math.max(0, Number(e.target.value) || 0) })
                          }
                          className="w-16 rounded-md border border-white/15 bg-transparent px-2 py-1 text-xs font-semibold text-white"
                        />
                        SP
                      </label>
                      <div className="relative shrink-0">
                        <select
                          value={t.id}
                          onChange={(e) => setUpgradeEdit(u.id, { tierId: e.target.value })}
                          className="appearance-none rounded-md border border-white/15 bg-[#241a12] py-1.5 pl-2 pr-6 text-xs font-semibold text-white"
                        >
                          {tiers.map((tt) => (
                            <option key={tt.id} value={tt.id}>
                              {tt.name}
                            </option>
                          ))}
                        </select>
                        <svg
                          aria-hidden="true"
                          className="pointer-events-none absolute right-2 top-1/2 h-3 w-3 -translate-y-1/2 text-white/50"
                          viewBox="0 0 20 20"
                          fill="none"
                          stroke="currentColor"
                          strokeWidth={2}
                          strokeLinecap="round"
                          strokeLinejoin="round"
                        >
                          <path d="M5 7.5l5 5 5-5" />
                        </svg>
                      </div>
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

function ExportImportControl({ config, update }: { config: AdminConfig; update: Update }) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [importError, setImportError] = useState<string | null>(null);

  function handleExport() {
    const blob = new Blob([JSON.stringify(config, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "btwr-outpost-admin-settings.json";
    a.click();
    URL.revokeObjectURL(url);
  }

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    setImportError(null);
    const reader = new FileReader();
    reader.onload = () => {
      const imported = importAdminConfig(reader.result as string);
      if (!imported) {
        setImportError("That file doesn't look like Outpost admin settings.");
        return;
      }
      update(() => imported);
    };
    reader.onerror = () => setImportError("Couldn't read that file.");
    reader.readAsText(file);
  }

  return (
    <div className="flex items-center justify-between gap-4">
      <div className="min-w-0">
        <p className="text-sm font-semibold text-white">Export / import settings</p>
        <p className="mt-0.5 text-xs text-slate-400">
          Save this customization (tiers, module placement, resources, tools, features) to a file, or load one you
          saved earlier. Doesn&apos;t touch your actual progress.
        </p>
        {importError && <p className="mt-1 text-xs text-red-400">{importError}</p>}
      </div>
      <div className="flex shrink-0 gap-2">
        <button
          type="button"
          onClick={handleExport}
          className="rounded-lg border border-white/15 px-3 py-1.5 text-xs font-semibold text-slate-300 transition-colors hover:border-[var(--outpost-accent)] hover:text-[var(--outpost-accent)]"
        >
          Export
        </button>
        <button
          type="button"
          onClick={() => fileInputRef.current?.click()}
          className="rounded-lg border border-white/15 px-3 py-1.5 text-xs font-semibold text-slate-300 transition-colors hover:border-[var(--outpost-accent)] hover:text-[var(--outpost-accent)]"
        >
          Import
        </button>
        <input
          ref={fileInputRef}
          type="file"
          accept="application/json"
          className="hidden"
          onChange={handleFileChange}
        />
      </div>
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
              href="/#outpost"
              className="shrink-0 text-xs font-semibold text-white/50 transition-colors hover:text-[var(--outpost-accent)]"
            >
              {"←"} Back to The Outpost
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
                {tab === "upgrades" && <UpgradesTab config={config} update={update} />}
                {tab === "engine" && <EngineAdminTab config={config} update={update} />}
                {tab === "engine-debug" && <EngineDebugPanel />}
              </div>

              <div className="mt-6 space-y-4 border-t border-white/10 pt-4">
                <ExportImportControl config={config} update={update} />
                <div className="border-t border-white/10 pt-4">
                  <ResetControl onReset={resetAll} />
                </div>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
