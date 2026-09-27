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
  | "campfire"
  | "gathering"
  | "patch-notes"
  | "crafting"
  | "stage-tip"
  | "resource-tool-strip"
  | "your-progress"
  | "accomplishments"
  | "prestige"
  | "upgrades"
  | "survival";

export type ModuleDef = { id: ModuleId; label: string; description: string };

export const MODULES: ModuleDef[] = [
  {
    id: "ponder",
    label: "Ponder",
    description:
      "The very first thing a visitor finds — a small self-assembling-sentence puzzle with its own Day One/Day Two/mid-game/endgame arc, drawn from the BTW Beginner's Guide.",
  },
  { id: "campfire", label: "The Campfire", description: "Tend-the-fire idle widget." },
  {
    id: "gathering",
    label: "Gathering",
    description:
      "Wood Gathering / Hunting / Mining (plus Fishing and Farming from the Upgrades shop) combined into one card with tab toggles — Wood Gathering is always available, Hunting opens at The Stump and Mining with Stone Tools. From First Iron its trips turn up relics to name for the Field Guide.",
  },
  { id: "patch-notes", label: "Patch Notes", description: "Modpack/mod changelog feed." },
  { id: "crafting", label: "Crafting", description: "Spend resources on better tools." },
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
// Engine is the Outpost's spine: Day One is Ponder alone, The Stump opens
// the camp (fire, gathering, crafting), and from First Iron its trips start
// turning up relics (relics.ts). The Progress and Achievements tabs are
// there from the start. prestige/upgrades are here only because this is a
// total Record over ModuleId; Prestige opens at Stage 8 and the Upgrades
// section uses FeaturesConfig.upgradesStage. Patch Notes is shelved (below),
// so its stage only matters once it's back.
export const DEFAULT_MODULE_STAGE: Record<ModuleId, number> = {
  // Stage 0 ("???") shows Ponder alone: every other card, and the Progress
  // and Achievements tabs, wait for Stage 1 or later.
  ponder: 0,
  "stage-tip": 1,
  "patch-notes": 2,
  campfire: 3,
  gathering: 3,
  crafting: 3,
  "resource-tool-strip": 3,
  "your-progress": 1,
  accomplishments: 1,
  prestige: 8,
  upgrades: 3,
  // Not a card either: Health/Hunger/Hardcore Spawn switch on at
  // FeaturesConfig.survivalStage (admin-config.ts). Here only so this stays
  // a total Record over ModuleId, same as prestige/upgrades above.
  survival: 3,
};

// Cards taken out of the Outpost for now, whatever the admin config says:
// always disabled (admin-config.ts's isModuleDisabled), left out of the
// admin panel's card list, their site requirements dropped from the Engine's
// gates (stages.ts's REQ_CARD) and their achievements hidden
// (achievements-catalog.ts's HIDDEN_ACHIEVEMENTS). The code stays: Patch
// Notes' design is kept for use elsewhere on the site.
export const SHELVED_MODULES: readonly ModuleId[] = ["patch-notes"];

export function isModuleShelved(id: ModuleId): boolean {
  return SHELVED_MODULES.includes(id);
}
