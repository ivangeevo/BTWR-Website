// Every card/section the Outpost can show, as data — lets the admin panel
// (and AchievementsProvider's gating) reason about "what shows up" without
// hand-editing JSX. Two modules are deliberately left OUT of this registry:
// the tier-1-only Achievement Gallery preview (hidden once tier 2 unlocks,
// the inverse of every other module's "shows once its tier unlocks" rule)
// and Tier2Reveal (a one-off animation tied specifically to the tier1->2
// transition, not generic to arbitrary tiers) — both stay hardcoded in
// HubSection.tsx exactly as before.

export type ModuleId =
  | "mod-of-day"
  | "tonights-sky"
  | "campfire"
  | "gathering"
  | "patch-notes"
  | "btw-field-notes"
  | "first-iron-tool"
  | "crafting"
  | "guess-the-mod"
  | "tier-tip"
  | "resource-tool-strip"
  | "your-progress"
  | "accomplishments"
  | "prestige";

export type ModuleDef = { id: ModuleId; label: string; description: string };

export const MODULES: ModuleDef[] = [
  { id: "mod-of-day", label: "Mod of the Day", description: "Daily spotlighted mod." },
  { id: "tonights-sky", label: "Tonight's Sky", description: "Moon phase flavor card." },
  { id: "campfire", label: "The Campfire", description: "Tend-the-fire idle widget." },
  {
    id: "gathering",
    label: "Gathering",
    description:
      "Tree Mining / Hunting / Mining combined into one card with tab toggles — Tree Mining is always available, Hunting and Mining reveal as later tiers unlock.",
  },
  { id: "patch-notes", label: "Patch Notes", description: "Modpack/mod changelog feed." },
  { id: "btw-field-notes", label: "BTW Field Notes", description: "Daily beginner tip card." },
  { id: "first-iron-tool", label: "Your First Iron Tool", description: "Tool-choice flavor card." },
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
  {
    id: "prestige",
    label: "Prestige",
    description: "Shows a locked teaser until the top tier is reached, then lets the visitor reset the resource/tool loop for permanent perks.",
  },
];

// Reproduces exactly today's hardcoded placement — admin overrides layer on
// top of this, so a fresh visitor with no saved admin config sees the site
// completely unchanged.
export const DEFAULT_MODULE_TIER: Record<ModuleId, string> = {
  "mod-of-day": "tier1",
  "tonights-sky": "tier1",
  campfire: "tier1",
  gathering: "tier1",
  "patch-notes": "tier1",
  "btw-field-notes": "tier1",
  "first-iron-tool": "tier1",
  crafting: "tier1",
  "guess-the-mod": "tier1",
  "tier-tip": "tier1",
  "resource-tool-strip": "tier1",
  "your-progress": "tier2",
  accomplishments: "tier2",
  prestige: "tier1",
};
