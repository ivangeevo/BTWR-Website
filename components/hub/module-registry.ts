// Every card/section the Outpost can show, as data — lets the admin panel
// (and AchievementsProvider's gating) reason about "what shows up" without
// hand-editing JSX. Each one is revealed by the Engine (the Ponder card)
// reaching a stage — see DEFAULT_MODULE_STAGE below.

// "prestige" and "upgrades" are no longer main-grid cards (see the Feature
// toggles upgradesEnabled/prestigeEnabled in admin-config.ts — they now
// surface elsewhere instead, see UpgradesPanel.tsx/PrestigeBadge.tsx)
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
  | "crafting"
  | "guess-the-mod"
  | "stage-tip"
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
  { id: "crafting", label: "Crafting", description: "Spend resources on better tools." },
  { id: "guess-the-mod", label: "Guess the Mod", description: "Quiz card." },
  {
    id: "stage-tip",
    label: "Tip",
    description: "Small tip box for whichever Engine stage the visitor is at — set its text per stage in the Stages tab.",
  },
  {
    id: "resource-tool-strip",
    label: "Resources & Tool",
    description: "Full-width readout of collected resources and the current tool.",
  },
  { id: "your-progress", label: "Progress tab", description: "The Outpost's Progress tab — Overview + Progression." },
  { id: "accomplishments", label: "Achievements tab", description: "The Outpost's Achievements tab — the full achievement gallery." },
  // Prestige and Upgrades are deliberately absent here — see the ModuleId
  // comment above. They're configured from the Features tab now, not here.
];

// Which Engine stage reveals each card (admin-overridable, Stages tab). The
// Engine is the Outpost's spine: Day One is Ponder alone, Day Two brings the
// day's reading, The Stump opens the camp (fire, gathering, crafting), and
// First Iron adds the quiz. The Progress and Achievements tabs are there
// from the start. prestige/upgrades are here only because this is a total
// Record over ModuleId; Prestige opens at Stage 8 and the Upgrades badge
// uses FeaturesConfig.upgradesStage.
export const DEFAULT_MODULE_STAGE: Record<ModuleId, number> = {
  ponder: 1,
  "stage-tip": 1,
  "daily-briefing": 2,
  "patch-notes": 2,
  campfire: 3,
  gathering: 3,
  crafting: 3,
  "resource-tool-strip": 3,
  "guess-the-mod": 4,
  "your-progress": 1,
  accomplishments: 1,
  prestige: 8,
  upgrades: 2,
};

// Default order for the card grid (see HubSection.tsx; the Engine, "ponder",
// has its own column there, so its place in this list is ignored) — a single flat
// list now that the grid is one modular 2-column layout instead of two
// independently-stacked columns, laid out row-major (index 0 and 1 share a
// row, 2 and 3 share the next, etc). This interleaving of the old left/right
// lists (ponder, patch-notes, daily-briefing, campfire, ...) exactly
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
  "campfire",
  "gathering",
  "crafting",
  "guess-the-mod",
];
