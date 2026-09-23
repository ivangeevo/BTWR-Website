// Every card/section the Outpost can show, as data — lets the admin panel
// (and AchievementsProvider's gating) reason about "what shows up" without
// hand-editing JSX. Two modules are deliberately left OUT of this registry:
// the tier-1-only Achievement Gallery preview (hidden once tier 2 unlocks,
// the inverse of every other module's "shows once its tier unlocks" rule)
// and TierRevealNotice (its own generic tier-transition detection, not a
// module gate) — both stay hardcoded in HubSection.tsx exactly as before.

// "prestige" and "upgrades" are no longer main-grid cards (see the Feature
// toggles upgradesEnabled/prestigeEnabled in admin-config.ts — they now
// surface as header badges instead, see UpgradesBadge.tsx/PrestigeBadge.tsx)
// but stay valid ModuleId members purely so mechanics.ts's MODULE_MECHANICS
// registry (their tunable Skill-Points-per-achievement / Legacy-Points-per-
// tier settings) can keep using the same ModuleId-keyed lookup as every
// other mechanic, without a second, parallel key type just for these two.
export type ModuleId =
  | "ponder"
  | "daily-briefing"
  | "campfire"
  | "gathering"
  | "patch-notes"
  | "first-iron-tool"
  | "priorities"
  | "crafting"
  | "guess-the-mod"
  | "tier-tip"
  | "resource-tool-strip"
  | "your-progress"
  | "accomplishments"
  | "prestige"
  | "upgrades";

export type ModuleDef = { id: ModuleId; label: string; description: string };

export const MODULES: ModuleDef[] = [
  {
    id: "ponder",
    label: "Ponder",
    description:
      "The very first thing a visitor finds — a small self-assembling-sentence puzzle with its own Day One/Day Two/mid-game/endgame arc, drawn from the BTW Beginner's Guide.",
  },
  {
    id: "daily-briefing",
    label: "Today at the Outpost",
    description:
      "Three small date-seeded flavor reads combined into one card — the daily mod spotlight, tonight's moon phase, and a beginner field note.",
  },
  { id: "campfire", label: "The Campfire", description: "Tend-the-fire idle widget." },
  {
    id: "gathering",
    label: "Gathering",
    description:
      "Tree Mining / Hunting / Mining combined into one card with tab toggles — Tree Mining is always available, Hunting and Mining reveal as later tiers unlock.",
  },
  { id: "patch-notes", label: "Patch Notes", description: "Modpack/mod changelog feed." },
  { id: "first-iron-tool", label: "Your First Iron Tool", description: "Tool-choice flavor card." },
  {
    id: "priorities",
    label: "Priorities",
    description:
      "The Beginner's Guide's own \"Priorities for the next few days\" checklist — sugarcane and clay through your first Chisel and Crafting Table.",
  },
  { id: "crafting", label: "Crafting", description: "Spend resources on better tools." },
  { id: "guess-the-mod", label: "Guess the Mod", description: "Quiz card." },
  {
    id: "tier-tip",
    label: "Tier Tip",
    description: "Small square tip box for whatever tier the visitor is currently at — set its text per tier in the Tiers tab.",
  },
  {
    id: "resource-tool-strip",
    label: "Resources & Tool",
    description: "Full-width readout of collected resources and the current tool tier.",
  },
  { id: "your-progress", label: "Your Progress", description: "Full-width Overview + Progression section." },
  { id: "accomplishments", label: "Accomplishments", description: "Full-width achievement gallery section." },
  // Prestige and Upgrades are deliberately absent here — see the ModuleId
  // comment above. They're configured from the Features tab now, not here.
];

// Reproduces exactly today's hardcoded placement — admin overrides layer on
// top of this, so a fresh visitor with no saved admin config sees the site
// completely unchanged. prestige/upgrades keep an (unused) entry only
// because this is a total Record over ModuleId, not a Partial one — neither
// is read anywhere anymore; their real tier gating lives in
// FeaturesConfig.upgradesTierId and the existing canPrestige logic instead.
export const DEFAULT_MODULE_TIER: Record<ModuleId, string> = {
  ponder: "tier1",
  "daily-briefing": "tier1",
  campfire: "tier1",
  gathering: "tier1",
  "patch-notes": "tier1",
  "first-iron-tool": "tier1",
  priorities: "tier1",
  crafting: "tier1",
  "guess-the-mod": "tier1",
  "tier-tip": "tier1",
  "resource-tool-strip": "tier1",
  "your-progress": "tier2",
  accomplishments: "tier2",
  prestige: "tier1",
  upgrades: "tier1",
};

// Default order for the main card grid (see HubSection.tsx) — a single flat
// list now that the grid is one modular 2-column layout instead of two
// independently-stacked columns, laid out row-major (index 0 and 1 share a
// row, 2 and 3 share the next, etc). This interleaving of the old left/right
// lists (ponder, patch-notes, daily-briefing, first-iron-tool, ...) exactly
// reproduces the row pairings the old two-column layout already had, since
// every card is the same height — so a visitor who hasn't bought the
// card-reorder upgrade (or hasn't dragged anything yet) sees no change.
// Drag order is stored flat in HubState.upgrades.cardOrder, falling back to
// this. The tier-1-only Achievement Gallery preview isn't included — it
// stays pinned at the end of the grid regardless of reordering, same
// special-case as ModuleGate's own file comment describes.
export const DEFAULT_CARD_ORDER: ModuleId[] = [
  "ponder",
  "patch-notes",
  "daily-briefing",
  "first-iron-tool",
  "campfire",
  "priorities",
  "gathering",
  "crafting",
  "guess-the-mod",
];
