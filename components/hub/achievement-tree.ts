// The Achievements tab's Minecraft-style advancement trees: which
// achievement each one chains off (its parent), its frame, plus the pure
// fog-of-war and layout logic the tree view draws from. Display only —
// how and when achievements unlock is untouched (AchievementsProvider).
import { ACHIEVEMENTS, ACHIEVEMENTS_BY_ID, type AchievementCategory, type AchievementId } from "./achievements-catalog";

/** Minecraft's three advancement frames: plain task, milestone goal, spiky challenge. */
export type AdvFrame = "task" | "goal" | "challenge";

export type TreeNodeDef = { parent: AchievementId | null; frame: AdvFrame };
export type AchievementTree = Record<AchievementId, TreeNodeDef>;

// [id, parent, frame?] — parent null is a category root. Numeric series
// chain in order, a category's first step is its root, capstones end
// chains and secrets hang off what leads to them. A secret with no frame
// given is a challenge; everything else defaults to a task.
type Row = [AchievementId, AchievementId | null, AdvFrame?];

const ROWS: Row[] = [
  // Ponder
  ["pd-first-sentence", null],
  ["pd-fluent", "pd-first-sentence"],
  ["pd-automated", "pd-fluent", "goal"],
  ["pd-oracle", "pd-automated", "challenge"],
  ["pd-old-friend", "pd-oracle", "challenge"],
  ["pd-first-choice", "pd-first-sentence"],
  ["pd-insight-1", "pd-first-sentence"],
  ["pd-insight-10", "pd-insight-1"],
  ["pd-insight-50", "pd-insight-10"],
  ["pd-insight-200", "pd-insight-50", "goal"],

  // The Analytical Engine — follows its stages
  ["en-day-two", null],
  ["en-first-ask", "en-day-two"],
  ["en-believer", "en-first-ask", "goal"],
  ["en-true-believer", "en-believer"],
  ["en-stump", "en-day-two", "goal"],
  ["en-first-cipher", "en-stump"],
  ["en-caesar", "en-first-cipher"],
  ["en-first-hopper", "en-stump"],
  ["en-well-read", "en-stump"],
  ["en-librarian", "en-well-read", "goal"],
  ["en-first-iron", "en-stump", "goal"],
  ["en-crank-100", "en-first-iron"],
  ["en-first-pop", "en-first-iron"],
  ["en-clean-engage", "en-first-iron"],
  ["en-mid-game", "en-first-iron", "goal"],
  ["en-windmill", "en-mid-game"],
  ["en-sawmill", "en-mid-game"],
  ["en-thrive", "en-mid-game", "goal"],
  ["en-water-wheel", "en-thrive"],
  ["en-frozen", "en-water-wheel"],
  ["en-detector-10", "en-thrive"],
  ["en-full-drum", "en-thrive"],
  ["en-crucible", "en-thrive", "goal"],
  ["en-soulforged", "en-crucible"],
  ["en-starlight", "en-crucible"],
  ["en-eureka-50", "en-crucible"],
  ["en-companion", "en-crucible"],
  ["en-all-specs", "en-crucible"],
  ["en-wither-end", "en-crucible", "challenge"],
  ["en-letter", "en-wither-end", "challenge"],
  ["en-mark-ii", "en-wither-end", "goal"],
  ["en-mark-v", "en-mark-ii", "challenge"],
  ["en-commissions-7", "en-wither-end"],
  ["en-first-gold", "en-wither-end", "goal"],
  ["en-all-gold", "en-first-gold"],
  ["en-billion", "en-wither-end", "goal"],
  ["en-sky-held", "en-wither-end"],

  // Getting Started
  ["first-visit", null],
  ["outpost-lounging", "first-visit"],
  ["mod-of-day-viewed", "first-visit"],
  ["theme-toggle-used", "first-visit"],
  ["window-resized-once", "first-visit"],
  ["campfire-medium", "first-visit"],
  ["community-edition", "first-visit", "goal"],

  // Guess the Mod
  ["quiz-attempted", null],
  ["quiz-first-correct", "quiz-attempted"],
  ["quiz-streak-5", "quiz-first-correct"],
  ["no-compass-needed", "quiz-streak-5", "goal"],
  ["quiz-perfect-round", "quiz-first-correct"],
  ["perfect-alloy", "quiz-perfect-round", "goal"],
  ["millstone-grind", "quiz-attempted", "goal"],

  // Patch Notes
  ["patch-notes-opened", null],
  ["patch-notes-mode-switched", "patch-notes-opened"],
  ["bellows-crucible", "patch-notes-mode-switched", "goal"],

  // Dedication
  ["visit-streak-2", null],
  ["broody-hen-7day", "visit-streak-2", "goal"],

  // Secrets — each its own find, drawn only once earned
  ["secret-sequence", null],
  ["secret-logo-clicks", null],
  ["snow-pile-10min", null],
  ["snow-pile-50min", "snow-pile-10min"],
  ["campfire-overstoked", null],
  ["hand-cranked", null],
  ["windmill-watcher", null],
  ["rope-grapple", null],
  ["hardcore-darkness", null],
  ["hopper-chain", null],
  ["soul-urn", "hopper-chain"],
  ["master-smith", "soul-urn"],

  // Homestead Basics
  ["hb-activity-25", null],
  ["hb-activity-100", "hb-activity-25", "goal"],
  ["hb-skin-first-change", "hb-activity-25"],
  ["hb-skin-all", "hb-skin-first-change", "goal"],
  ["hb-lore-half", "hb-activity-25"],
  ["hb-lore-deep", "hb-lore-half", "goal"],
  ["hb-export-first", "hb-activity-25"],
  ["hb-import-first", "hb-export-first"],
  ["hb-pin-first", "hb-activity-25"],
  ["hb-pin-fickle", "hb-pin-first"],
  ["hb-full-tour", "hb-activity-25", "goal"],

  // Manual Labor — one chain per trade
  ["ml-millstone-ii", null],
  ["ml-millstone-iii", "ml-millstone-ii", "goal"],
  ["ml-loom-streak", null],
  ["ml-loom-streak-ii", "ml-loom-streak", "goal"],
  ["ml-bellows-ii", null],
  ["ml-bellows-iii", "ml-bellows-ii", "goal"],
  ["ml-turntable-ii", null],
  ["ml-turntable-iii", "ml-turntable-ii", "goal"],
  ["ml-crank-ii", null],
  ["ml-crank-iii", "ml-crank-ii", "goal"],
  ["ml-reforge-i", null, "goal"],

  // Soul Forge & Hellfire Forge
  ["sf-apprentice", null],
  ["sf-journeyman", "sf-apprentice"],
  ["sf-tradesman", "sf-journeyman"],
  ["sf-veteran", "sf-tradesman", "goal"],
  ["sf-legend", "sf-veteran", "challenge"],
  ["sf-lifetime-xp", "sf-journeyman"],
  ["sf-perfect-ii", "sf-apprentice"],
  ["sf-perfect-iii", "sf-perfect-ii", "goal"],
  ["sf-streak-50", "sf-apprentice", "challenge"],
  ["sf-prestige-ii", "sf-apprentice"],
  ["sf-prestige-iii", "sf-prestige-ii", "goal"],

  // Husbandry & Harvest
  ["hh-compost", null],
  ["hh-compost-ii", "hh-compost"],
  ["hh-old-growth", "hh-compost-ii", "challenge"],
  ["hh-full-coop", "hh-compost", "goal"],
  ["hh-first-catch", "hh-compost"],
  ["hh-apiary", "hh-first-catch"],
  ["hh-broody", "hh-apiary"],
  ["hh-full-harvest", "hh-broody", "challenge"],
  ["hh-three-piece", "hh-compost"],
  ["hh-lay-of-land", "hh-compost"],
  ["hh-hemp-fields", "hh-lay-of-land"],

  // Mob & Moonphase — one root per time of day
  ["mm-first-light", null],
  ["mm-dawn-regular", "mm-first-light", "goal"],
  ["mm-golden-hour", null],
  ["mm-dusk-regular", "mm-golden-hour", "goal"],
  ["mm-off-clock", null],
  ["mm-weekend-regular", "mm-off-clock", "goal"],
  ["mm-night-watch", null],
  ["mm-nocturnal", "mm-night-watch", "goal"],
  ["mm-round-the-clock", "mm-night-watch", "goal"],
  ["mm-blood-moon", "mm-night-watch"],
  ["mm-moon-regular", "mm-blood-moon"],
  ["mm-new-moon", "mm-night-watch"],

  // Nether Reachievement
  ["nr-milestone-25", null, "goal"],
  ["nr-milestone-50", "nr-milestone-25", "goal"],
  ["nr-milestone-75", "nr-milestone-50", "goal"],
  ["nr-milestone-100", "nr-milestone-75", "goal"],
  ["nr-milestone-all", "nr-milestone-100"],
  ["nr-secrets-half", "nr-milestone-25"],
  ["nr-secrets-most", "nr-secrets-half"],
  ["nr-hundred-days", "nr-milestone-25", "challenge"],
  ["nr-category-quiz", "nr-milestone-50", "goal"],
  ["nr-category-manual", "nr-milestone-50", "goal"],
  ["nr-category-forge", "nr-milestone-50", "goal"],

  // RTFM
  ["rw-open-5", null],
  ["rw-open-15", "rw-open-5"],
  ["rw-open-30", "rw-open-15", "goal"],
  ["rw-mode-switch-100", "rw-open-15", "challenge"],
  ["rw-lore-15", "rw-open-5"],
  ["rw-lore-20", "rw-lore-15", "goal"],
  ["rw-quiz-300", "rw-open-5", "goal"],
  ["rw-activity-200", "rw-open-5", "goal"],
  ["rw-pin-5", "rw-open-5"],
  ["rw-export-5", "rw-open-5"],
  ["rw-import-5", "rw-export-5"],

  // Bureaucracy & Paperwork
  ["bp-skin-swap-5", null],
  ["bp-skin-swap-15", "bp-skin-swap-5", "goal"],
  ["bp-paper-trail", null],
  ["bp-unpinned", "bp-paper-trail"],
  ["bp-tab-hopping", "bp-paper-trail"],
  ["bp-activity-500", "bp-paper-trail", "challenge"],
  ["bp-resize-100", null, "goal"],
  ["bp-toggle-150", null, "goal"],
  ["bp-streak-75", null, "challenge"],
  ["bp-perfect-40", null, "challenge"],
  ["bp-prestige-5", null, "challenge"],

  // Hopper Economy
  ["he-chain-ii", null],
  ["he-chain-iii", "he-chain-ii", "goal"],
  ["he-chain-master", "he-chain-iii"],
  ["he-explore-session", null],
  ["he-full-session", "he-explore-session", "goal"],
  ["he-quiz-marathon", null],
  ["he-redstone-clock", "he-quiz-marathon", "goal"],
  ["he-every-day", null],
  ["he-skin-session-swap", null],
  ["he-round-trip", "he-skin-session-swap"],
  ["he-overclocked", null, "goal"],

  // Frontier Record — the capstones
  ["fr-all-categories", null, "goal"],
  ["fr-wardrobe-certified", "fr-all-categories", "challenge"],
  ["fr-all-flair", "fr-all-categories", "challenge"],
  ["fr-master-every-trade", "fr-all-categories", "challenge"],
  ["fr-lifes-work", "fr-all-categories", "challenge"],
  ["fr-half-year", "fr-all-categories", "challenge"],
  ["fr-prestige-10", "fr-all-categories", "challenge"],
  ["fr-ledger-100", "fr-all-categories", "challenge"],
  ["fr-nothing-hidden", "fr-all-categories"],
  ["fr-complete-111", "fr-all-categories"],
  ["fr-founding-settler", "fr-complete-111"],
];

function defaultFrame(id: AchievementId, given?: AdvFrame): AdvFrame {
  if (given) return given;
  return ACHIEVEMENTS_BY_ID[id]?.secret ? "challenge" : "task";
}

/** The authored tree. Any achievement missing from ROWS becomes its own root. */
export const DEFAULT_ACHIEVEMENT_TREE: AchievementTree = (() => {
  const tree = {} as AchievementTree;
  for (const a of ACHIEVEMENTS) tree[a.id] = { parent: null, frame: defaultFrame(a.id) };
  for (const [id, parent, frame] of ROWS) {
    if (!(id in tree)) continue;
    tree[id] = { parent, frame: defaultFrame(id, frame) };
  }
  return tree;
})();

/** True if `candidate` is `id` itself or sits anywhere below it in `tree`. */
export function isSelfOrDescendant(tree: AchievementTree, id: AchievementId, candidate: AchievementId): boolean {
  let cur: AchievementId | null = candidate;
  const seen = new Set<AchievementId>();
  while (cur && !seen.has(cur)) {
    if (cur === id) return true;
    seen.add(cur);
    cur = tree[cur]?.parent ?? null;
  }
  return false;
}

export type TreeOverrides = {
  parent?: Partial<Record<AchievementId, AchievementId | "root">>;
  frame?: Partial<Record<AchievementId, AdvFrame>>;
};

// The authored tree with admin edits applied. A parent edit is ignored if
// the parent doesn't exist, sits in a different category (each tab is one
// category's canvas) or would create a loop.
export function resolveTree(overrides: TreeOverrides = {}): AchievementTree {
  const tree: AchievementTree = { ...DEFAULT_ACHIEVEMENT_TREE };
  for (const [id, frame] of Object.entries(overrides.frame ?? {}) as [AchievementId, AdvFrame][]) {
    if (tree[id] && (frame === "task" || frame === "goal" || frame === "challenge")) tree[id] = { ...tree[id], frame };
  }
  for (const [id, parent] of Object.entries(overrides.parent ?? {}) as [AchievementId, AchievementId | "root"][]) {
    if (!tree[id]) continue;
    if (parent === "root") {
      tree[id] = { ...tree[id], parent: null };
      continue;
    }
    const p = ACHIEVEMENTS_BY_ID[parent];
    if (!p || p.category !== ACHIEVEMENTS_BY_ID[id].category) continue;
    if (isSelfOrDescendant(tree, id, parent)) continue;
    tree[id] = { ...tree[id], parent };
  }
  return tree;
}

export type TreeNodeView = {
  id: AchievementId;
  /** Unearned secret that's only drawn because something below it was earned. */
  masked: boolean;
};

// Minecraft-style fog of war, per category. Shown: roots, earned nodes and
// the next (non-secret) step after each earned node, plus every ancestor
// of an earned node so its chain always reaches back to the root. Secret
// achievements never show until earned — except as a masked "???" link in
// a chain that leads to something already earned.
export function visibleNodes(
  tree: AchievementTree,
  category: AchievementCategory,
  unlocked: ReadonlySet<string>
): TreeNodeView[] {
  const ids = ACHIEVEMENTS.filter((a) => a.category === category).map((a) => a.id);
  const secret = (id: AchievementId) => !!ACHIEVEMENTS_BY_ID[id]?.secret;
  const shown = new Set<AchievementId>();
  for (const id of ids) {
    const parent = tree[id].parent;
    const earned = unlocked.has(id);
    if (earned) shown.add(id);
    else if (secret(id)) continue;
    else if (parent === null || unlocked.has(parent)) shown.add(id);
  }
  for (const id of ids) {
    if (!unlocked.has(id)) continue;
    let p = tree[id].parent;
    while (p && !shown.has(p)) {
      shown.add(p);
      p = tree[p].parent;
    }
  }
  return ids
    .filter((id) => shown.has(id))
    .map((id) => ({ id, masked: secret(id) && !unlocked.has(id) }));
}

// Everything sits on the canvas's background grid: each node centred in its
// own grid square (TREE_CELL), rows one square apart, columns two.
export const TREE_CELL = 64;
export const TREE_COL_W = TREE_CELL * 2;
export const TREE_ROW_H = TREE_CELL;
export const TREE_ROOT_GAP = TREE_CELL;

export type LaidOutNode = TreeNodeView & { x: number; y: number; depth: number };
export type TreeLayout = {
  nodes: LaidOutNode[];
  edges: { from: AchievementId; to: AchievementId }[];
  width: number;
  height: number;
};

// Left-to-right tidy tree over just the visible nodes: depth sets the
// column, leaves take successive rows, and each parent sits on the grid row
// nearest the midpoint of its first and last child, so it stays on the grid. Several roots stack top to bottom. x/y are
// node centres in px, measured from the layout's own top-left.
export function layoutTree(tree: AchievementTree, visible: TreeNodeView[]): TreeLayout {
  const inView = new Map(visible.map((v) => [v.id, v]));
  const order = new Map(visible.map((v, i) => [v.id, i]));
  const children = new Map<AchievementId, AchievementId[]>();
  const roots: AchievementId[] = [];
  for (const v of visible) {
    const parent = tree[v.id].parent;
    if (parent && inView.has(parent)) {
      if (!children.has(parent)) children.set(parent, []);
      children.get(parent)!.push(v.id);
    } else {
      roots.push(v.id);
    }
  }
  for (const list of children.values()) list.sort((a, b) => order.get(a)! - order.get(b)!);

  const nodes: LaidOutNode[] = [];
  const edges: TreeLayout["edges"] = [];
  let nextRowY = 0;
  let maxDepth = 0;

  function place(id: AchievementId, depth: number): number {
    maxDepth = Math.max(maxDepth, depth);
    const kids = children.get(id) ?? [];
    let y: number;
    if (kids.length === 0) {
      y = nextRowY;
      nextRowY += TREE_ROW_H;
    } else {
      const ys = kids.map((k) => {
        edges.push({ from: id, to: k });
        return place(k, depth + 1);
      });
      y = Math.round((ys[0] + ys[ys.length - 1]) / 2 / TREE_ROW_H) * TREE_ROW_H;
    }
    nodes.push({ ...inView.get(id)!, x: depth * TREE_COL_W, y, depth });
    return y;
  }

  roots.forEach((r, i) => {
    if (i > 0) nextRowY += TREE_ROOT_GAP;
    place(r, 0);
  });

  nodes.sort((a, b) => order.get(a.id)! - order.get(b.id)!);
  return {
    nodes,
    edges,
    width: maxDepth * TREE_COL_W,
    height: Math.max(0, nextRowY - TREE_ROW_H),
  };
}
