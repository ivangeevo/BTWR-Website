"use client";

import { useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import {
  CATEGORY_LABELS,
  CATEGORY_ORDER,
  type AchievementCategory,
  type AchievementDef,
  type AchievementId,
} from "./achievements-catalog";
import {
  layoutTree,
  TREE_CELL,
  visibleNodes,
  type AchievementTree,
  type AdvFrame,
  type LaidOutNode,
} from "./achievement-tree";
import { useAchievements } from "./AchievementsProvider";
import { useReducedMotion } from "./engine/ui/use-reduced-motion";

// The Achievements tab, drawn like Minecraft's advancement screen: one icon
// tab per category, and a dark draggable canvas holding that category's
// tree (achievement-tree.ts) — framed icons joined by elbow lines, root on
// the left, with fog of war hiding everything more than a step past what's
// been earned. The previous flat grid lives on the backup/achievements-grid
// branch.

const useIsomorphicLayoutEffect = typeof window !== "undefined" ? useLayoutEffect : useEffect;

// The canvas's height comes from CSS (.adv-canvas — taller on the Outpost's
// one-screen layout); this is only the first-paint guess before it's measured.
const CANVAS_H = 440;
// A grid square and a half, so each node's centre lands in the middle of a square.
const PAD = TREE_CELL * 1.5;
const NODE = 40;
const CARD_W = 240;
const CARD_MARGIN = 8;
const DRAG_SLOP_PX = 4;
const VIEW_KEY = "btwr:hub:advancements:v1";

type Pan = { x: number; y: number };
type SavedView = { tab: AchievementCategory; pans: Partial<Record<AchievementCategory, Pan>> };

function readView(): SavedView | null {
  try {
    const raw = window.localStorage.getItem(VIEW_KEY);
    const v = raw ? (JSON.parse(raw) as Partial<SavedView>) : null;
    if (!v || !CATEGORY_ORDER.includes(v.tab as AchievementCategory)) return null;
    return { tab: v.tab as AchievementCategory, pans: v.pans ?? {} };
  } catch {
    return null;
  }
}

function writeView(v: SavedView) {
  try {
    window.localStorage.setItem(VIEW_KEY, JSON.stringify(v));
  } catch {
    // Remembering the view is a nicety.
  }
}

// A category's tab icon: its first root that isn't a secret (a secret's
// icon would give it away before it's found).
function tabIcon(tree: AchievementTree, list: readonly AchievementDef[], category: AchievementCategory): string {
  const root = list.find((a) => a.category === category && tree[a.id].parent === null && !a.secret);
  return root?.icon ?? "\u{2754}";
}

function frameLabel(frame: AdvFrame): string {
  return frame === "challenge" ? "Challenge" : frame === "goal" ? "Goal" : "Advancement";
}

function formatEarned(iso: string | undefined): string | null {
  if (!iso) return null;
  const d = new Date(iso);
  return Number.isNaN(d.getTime()) ? null : d.toLocaleDateString(undefined, { year: "numeric", month: "short", day: "numeric" });
}

// Minecraft-style hover/focus card, portaled so the canvas's clipping
// can't cut it off. Opens to the node's right, flipping left near the edge.
function NodeCard({ node, frame, earnedAt, anchor }: {
  node: LaidOutNode;
  frame: AdvFrame;
  earnedAt: string | undefined;
  anchor: DOMRect;
}) {
  const { achievementsById } = useAchievements();
  const a = achievementsById[node.id];
  if (!a) return null;
  const earned = !!earnedAt;
  const hidden = node.masked;
  const right = anchor.right + CARD_MARGIN + CARD_W <= window.innerWidth;
  const left = right ? anchor.right + CARD_MARGIN : Math.max(CARD_MARGIN, anchor.left - CARD_MARGIN - CARD_W);
  const date = formatEarned(earnedAt);
  return createPortal(
    <div
      role="tooltip"
      className={`adv-card adv-card-${earned ? (frame === "challenge" ? "challenge" : "earned") : "locked"}`}
      style={{ left, top: Math.max(CARD_MARGIN, anchor.top - 2), width: CARD_W }}
    >
      <div className="adv-card-title">{hidden ? "???" : a.title}</div>
      <div className="adv-card-body">
        <p>{hidden ? "Something hidden leads here." : a.description}</p>
        <p className="adv-card-meta">
          {frameLabel(frame)} · {earned ? (date ? `Earned ${date}` : "Earned") : "Not yet"}
        </p>
      </div>
    </div>,
    document.body
  );
}

function AdvancementCanvas({ category, pan, onPan }: {
  category: AchievementCategory;
  pan: Pan | undefined;
  onPan: (p: Pan) => void;
}) {
  const { unlocked, unlockedAt, achievementTree, achievements, achievementsById } = useAchievements();
  const reduced = useReducedMotion();
  const viewportRef = useRef<HTMLDivElement>(null);
  const [vw, setVw] = useState(0);
  const [vh, setVh] = useState(CANVAS_H);
  const [hover, setHover] = useState<{ node: LaidOutNode; rect: DOMRect } | null>(null);
  const drag = useRef<{ startX: number; startY: number; from: Pan; moved: boolean } | null>(null);

  const layout = useMemo(
    () =>
      layoutTree(
        achievementTree,
        visibleNodes(achievementTree, category, unlocked, { list: achievements, byId: achievementsById })
      ),
    [achievementTree, category, unlocked, achievements, achievementsById]
  );
  const layerW = layout.width + PAD * 2;
  const layerH = layout.height + PAD * 2;

  useIsomorphicLayoutEffect(() => {
    const el = viewportRef.current;
    if (!el) return;
    const measure = () => {
      setVw(el.clientWidth);
      setVh(el.clientHeight || CANVAS_H);
    };
    measure();
    const ro = new ResizeObserver(measure);
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  // Keeps the tree inside the viewport; a tree smaller than it is centred.
  // Whole pixels, so grid lines and node edges stay crisp.
  function clamp(p: Pan): Pan {
    const x = layerW <= vw ? (vw - layerW) / 2 : Math.min(0, Math.max(vw - layerW, p.x));
    const y = layerH <= vh ? (vh - layerH) / 2 : Math.min(0, Math.max(vh - layerH, p.y));
    return { x: Math.round(x), y: Math.round(y) };
  }

  // Opens with the first root in view (left edge, vertically centred on it).
  function home(): Pan {
    const root = layout.nodes.find((n) => n.depth === 0);
    return clamp({ x: 0, y: vh / 2 - PAD - (root?.y ?? 0) });
  }

  const current = vw > 0 ? clamp(pan ?? home()) : { x: 0, y: 0 };

  function onPointerDown(e: React.PointerEvent<HTMLDivElement>) {
    if (e.button !== 0) return;
    drag.current = { startX: e.clientX, startY: e.clientY, from: current, moved: false };
    e.currentTarget.setPointerCapture(e.pointerId);
  }
  function onPointerMove(e: React.PointerEvent<HTMLDivElement>) {
    const d = drag.current;
    if (!d) return;
    const dx = e.clientX - d.startX;
    const dy = e.clientY - d.startY;
    if (!d.moved && Math.hypot(dx, dy) < DRAG_SLOP_PX) return;
    if (!d.moved) setHover(null);
    d.moved = true;
    onPan(clamp({ x: d.from.x + dx, y: d.from.y + dy }));
  }
  function onPointerUp() {
    drag.current = null;
  }

  // Keyboard focus pans a node into view.
  function reveal(n: LaidOutNode) {
    const cx = PAD + n.x + current.x;
    const cy = PAD + n.y + current.y;
    const m = NODE;
    let { x, y } = current;
    if (cx < m) x += m - cx;
    else if (cx > vw - m) x -= cx - (vw - m);
    if (cy < m) y += m - cy;
    else if (cy > vh - m) y -= cy - (vh - m);
    if (x !== current.x || y !== current.y) onPan(clamp({ x, y }));
  }

  const byId = new Map(layout.nodes.map((n) => [n.id, n]));
  const half = NODE / 2;

  return (
    <div
      ref={viewportRef}
      className={`adv-canvas adv-tint-${category}`}
      // The grid pans with the tree, so every node stays inside its square.
      style={{ backgroundPosition: `0 0, ${current.x}px ${current.y}px, ${current.x}px ${current.y}px` }}
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={onPointerUp}
      onPointerCancel={onPointerUp}
      data-no-drag
    >
      {layout.nodes.length === 0 ? (
        <p className="adv-empty">Nothing found here yet. Keep exploring.</p>
      ) : (
        <div
          className="adv-layer"
          style={{ width: layerW, height: layerH, transform: `translate3d(${current.x}px, ${current.y}px, 0)` }}
        >
          <svg className="adv-lines" width={layerW} height={layerH} aria-hidden="true">
            {layout.edges.map(({ from, to }) => {
              const a = byId.get(from)!;
              const b = byId.get(to)!;
              const x1 = PAD + a.x + half;
              const x2 = PAD + b.x - half;
              const mid = (x1 + x2) / 2;
              const d = `M ${x1} ${PAD + a.y} H ${mid} V ${PAD + b.y} H ${x2}`;
              const lit = unlocked.has(to);
              return (
                <g key={`${from}-${to}`}>
                  <path d={d} className="adv-line-outline" />
                  <path d={d} className={lit ? "adv-line adv-line-lit" : "adv-line"} />
                </g>
              );
            })}
          </svg>
          {layout.nodes.map((n) => {
            const a = achievementsById[n.id]!;
            const frame = achievementTree[n.id].frame;
            const earned = unlocked.has(n.id);
            return (
              <button
                key={n.id}
                type="button"
                className={`adv-node adv-frame-${frame} ${earned ? "adv-earned" : n.masked ? "adv-masked" : "adv-locked"} ${
                  reduced ? "" : "adv-animate"
                }`}
                style={{ left: PAD + n.x - half, top: PAD + n.y - half, width: NODE, height: NODE }}
                aria-label={`${n.masked ? "Hidden" : a.title}: ${earned ? "earned" : "not yet earned"}`}
                onPointerEnter={(e) => !drag.current?.moved && setHover({ node: n, rect: e.currentTarget.getBoundingClientRect() })}
                onPointerLeave={() => setHover(null)}
                onFocus={(e) => {
                  reveal(n);
                  const el = e.currentTarget;
                  requestAnimationFrame(() => setHover({ node: n, rect: el.getBoundingClientRect() }));
                }}
                onBlur={() => setHover(null)}
              >
                <span className="adv-node-inner" aria-hidden="true">
                  {n.masked ? "?" : a.icon}
                </span>
              </button>
            );
          })}
        </div>
      )}
      <button
        type="button"
        className="adv-recenter"
        onPointerDown={(e) => e.stopPropagation()}
        onClick={() => onPan(home())}
        title="Back to the start of this tree"
      >
        {"\u{21BA}"} Recenter
      </button>
      {hover && typeof document !== "undefined" && (
        <NodeCard
          node={hover.node}
          frame={achievementTree[hover.node.id].frame}
          earnedAt={unlockedAt[hover.node.id as AchievementId]}
          anchor={hover.rect}
        />
      )}
    </div>
  );
}

// Ledger Entries render as a compact progress readout, never as up-to-975
// individual DOM tiles — the point is a sense of scale ("214/975"), not a
// literal checklist. Shows whichever metrics are closest to their next rank.
function LedgerSection() {
  const { ledgerProgress } = useAchievements();
  const upNext = [...ledgerProgress.perMetric]
    .filter((m) => m.nextThreshold !== null)
    .sort((a, b) => b.value / (b.nextThreshold ?? 1) - a.value / (a.nextThreshold ?? 1))
    .slice(0, 4);

  return (
    <div>
      <div className="mb-2 flex items-center justify-between">
        <h4 className="font-pixel text-sm text-white/60">Ledger Entries</h4>
        <span className="rounded-full bg-white/10 px-2 py-0.5 text-xs font-semibold text-[var(--outpost-accent)]">
          {ledgerProgress.unlockedCount}/{ledgerProgress.total}
        </span>
      </div>
      <p className="mb-2 text-xs text-slate-400">
        Every counter in the Outpost gets filed here too, numbered and without end.
      </p>
      <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
        {upNext.map((m) => (
          <div key={m.key} className="rounded-lg border border-white/10 p-2 text-xs">
            <p className="truncate font-semibold text-slate-200">
              {m.icon} {m.noun} #{m.rank + 1}
            </p>
            <p className="truncate text-slate-400">
              {m.value} / {m.nextThreshold}
            </p>
          </div>
        ))}
      </div>
    </div>
  );
}

export default function AchievementGallery() {
  const { unlocked, mounted, achievementTree, achievements } = useAchievements();
  const [view, setView] = useState<SavedView>({ tab: CATEGORY_ORDER[0], pans: {} });
  const loaded = useRef(false);

  useEffect(() => {
    if (!mounted || loaded.current) return;
    loaded.current = true;
    const saved = readView();
    if (saved) setView(saved);
  }, [mounted]);

  // Saved a moment after the last change, not on every drag step.
  useEffect(() => {
    if (!loaded.current) return;
    const id = window.setTimeout(() => writeView(view), 250);
    return () => window.clearTimeout(id);
  }, [view]);

  function update(next: SavedView) {
    setView(next);
  }

  const totals = useMemo(() => {
    const out = {} as Record<AchievementCategory, { earned: number; total: number }>;
    for (const c of CATEGORY_ORDER) out[c] = { earned: 0, total: 0 };
    for (const a of achievements) {
      out[a.category].total++;
      if (unlocked.has(a.id)) out[a.category].earned++;
    }
    return out;
  }, [unlocked, achievements]);

  const tabs = CATEGORY_ORDER.filter((c) => totals[c].total > 0);
  const tab = tabs.includes(view.tab) ? view.tab : tabs[0];

  return (
    <div>
      <div className="flex items-center justify-end">
        <span className="rounded-full bg-white/10 px-2 py-0.5 text-xs font-semibold text-[var(--outpost-accent)]">
          {unlocked.size}/{achievements.length} unlocked
        </span>
      </div>

      <div className="mt-3 flex flex-wrap gap-1.5" role="tablist" aria-label="Achievement categories">
        {tabs.map((c) => {
          const active = c === tab;
          const t = totals[c];
          return (
            <button
              key={c}
              type="button"
              role="tab"
              aria-selected={active}
              title={CATEGORY_LABELS[c]}
              onClick={() => update({ ...view, tab: c })}
              className={`adv-tab ${active ? "adv-tab-active" : ""}`}
            >
              <span className="text-lg leading-none" aria-hidden="true">
                {tabIcon(achievementTree, achievements, c)}
              </span>
              <span className="adv-tab-count">{c === "secrets" ? `${t.earned} found` : `${t.earned}/${t.total}`}</span>
            </button>
          );
        })}
      </div>

      <div className="mt-3">
        <h4 className="font-pixel mb-2 text-base text-white">{CATEGORY_LABELS[tab]}</h4>
        {mounted ? (
          <AdvancementCanvas
            key={tab}
            category={tab}
            pan={view.pans[tab]}
            onPan={(p) => update({ ...view, tab, pans: { ...view.pans, [tab]: p } })}
          />
        ) : (
          <div className="adv-canvas" />
        )}
        <p className="mt-1.5 text-[0.7rem] text-slate-500">Drag to look around. Earn an advancement to see what comes next.</p>
      </div>

      <div className="mt-6">
        <LedgerSection />
      </div>
    </div>
  );
}
