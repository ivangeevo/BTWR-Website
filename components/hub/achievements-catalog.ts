import { ENGINE_ACHIEVEMENT_DEFS, type EngineAchievementId } from "./engine/achievements";

export type AchievementId =
  // Tier 1 (12) — the original, simple hangout-spot achievements.
  | "first-visit"
  | "mod-of-day-viewed"
  | "quiz-first-correct"
  | "quiz-perfect-round"
  | "quiz-streak-5"
  | "patch-notes-opened"
  | "patch-notes-mode-switched"
  | "visit-streak-2"
  | "theme-toggle-used"
  | "window-resized-once"
  | "quiz-attempted"
  | "outpost-lounging"
  // Still tier 1, still show up in the tier-1 gallery and still fire their
  // own toast when found — just no longer required to reach tier 2, since
  // a visitor genuinely might never stumble onto all of them (see the 4
  // achievements just above, added as easy, always-discoverable
  // replacements in TIER1_IDS below).
  | "secret-sequence"
  | "secret-logo-clicks"
  | "snow-pile-10min"
  | "snow-pile-50min"
  // The Campfire and Your First Iron Tool — small BTW-Beginner's-Guide-
  // inspired widgets, both tier 1.
  | "campfire-medium"
  | "campfire-overstoked"
  | "iron-tool-chosen"
  | "iron-tool-completionist"
  | "priorities-started"
  | "priorities-completionist"
  // Tier 2 (13) — "community-edition" is a flavor achievement that fires
  // once unlockedCount reaches the ladder's tier2 threshold (admin-
  // config.ts); the rest are the 12 new, harder achievements that live
  // alongside it once that tier's content is visible.
  | "community-edition"
  | "millstone-grind"
  | "perfect-alloy"
  | "no-compass-needed"
  | "bellows-crucible"
  | "broody-hen-7day"
  | "hand-cranked"
  | "hopper-chain"
  | "windmill-watcher"
  | "rope-grapple"
  | "hardcore-darkness"
  | "soul-urn"
  | "master-smith"
  // --- The 111-achievement expansion ("Ledger Entries" procedural tier
  // builds further on top of these — see ledger-entries.ts). All 111 are
  // tier 2: they only surface once Community Edition is unlocked, same as
  // the original 12. Ids are prefixed by category for readability. ---
  | "hb-full-tour" | "hb-pin-first" | "hb-pin-fickle" | "hb-skin-first-change"
  | "hb-skin-all" | "hb-lore-half" | "hb-lore-deep" | "hb-activity-25"
  | "hb-activity-100" | "hb-export-first" | "hb-import-first"
  | "ml-millstone-ii" | "ml-millstone-iii" | "ml-bellows-ii" | "ml-bellows-iii"
  | "ml-turntable-ii" | "ml-turntable-iii" | "ml-crank-ii" | "ml-crank-iii"
  | "ml-loom-streak" | "ml-loom-streak-ii" | "ml-reforge-i"
  | "sf-apprentice" | "sf-journeyman" | "sf-tradesman" | "sf-veteran" | "sf-legend"
  | "sf-prestige-ii" | "sf-prestige-iii" | "sf-perfect-ii" | "sf-perfect-iii"
  | "sf-streak-50" | "sf-lifetime-xp"
  | "hh-first-catch" | "hh-apiary" | "hh-broody" | "hh-full-harvest"
  | "hh-compost" | "hh-compost-ii" | "hh-old-growth" | "hh-hemp-fields"
  | "hh-lay-of-land" | "hh-three-piece" | "hh-full-coop"
  | "mm-night-watch" | "mm-first-light" | "mm-nocturnal" | "mm-blood-moon"
  | "mm-off-clock" | "mm-weekend-regular" | "mm-golden-hour" | "mm-dusk-regular"
  | "mm-moon-regular" | "mm-dawn-regular" | "mm-round-the-clock" | "mm-new-moon"
  | "nr-milestone-25" | "nr-milestone-50" | "nr-milestone-75" | "nr-milestone-100"
  | "nr-milestone-all" | "nr-secrets-half" | "nr-secrets-most" | "nr-category-quiz"
  | "nr-category-manual" | "nr-category-forge" | "nr-hundred-days"
  | "rw-open-5" | "rw-open-15" | "rw-open-30" | "rw-lore-15" | "rw-lore-20"
  | "rw-quiz-300" | "rw-activity-200" | "rw-mode-switch-100" | "rw-pin-5"
  | "rw-export-5" | "rw-import-5"
  | "bp-paper-trail" | "bp-skin-swap-5" | "bp-skin-swap-15" | "bp-unpinned"
  | "bp-tab-hopping" | "bp-resize-100" | "bp-toggle-150" | "bp-streak-75"
  | "bp-perfect-40" | "bp-activity-500" | "bp-prestige-5"
  | "he-chain-ii" | "he-chain-iii" | "he-explore-session" | "he-full-session"
  | "he-redstone-clock" | "he-overclocked" | "he-every-day" | "he-skin-session-swap"
  | "he-round-trip" | "he-chain-master" | "he-quiz-marathon"
  | "fr-wardrobe-certified" | "fr-all-flair" | "fr-all-categories" | "fr-master-every-trade"
  | "fr-nothing-hidden" | "fr-lifes-work" | "fr-half-year" | "fr-prestige-10"
  | "fr-complete-111" | "fr-founding-settler" | "fr-ledger-100"
  // Ponder — the Engine's first ten (see engine/achievements.ts for their rules).
  | "pd-first-sentence" | "pd-fluent" | "pd-first-choice"
  | "pd-automated" | "pd-oracle" | "pd-old-friend"
  | "pd-insight-1" | "pd-insight-10" | "pd-insight-50" | "pd-insight-200"
  // The Analytical Engine's own category (engine/achievements.ts).
  | EngineAchievementId;

// Groups achievements for the gallery. "secrets" is special-cased there:
// unlocked secrets show normally under this group, but locked ones are
// capped at 3 anonymous "???" slots regardless of how many actually
// remain — so the true count of hidden achievements is never revealed.
export type AchievementCategory =
  | "ponder"
  | "engine"
  | "onboarding"
  | "quiz"
  | "patch-notes"
  | "dedication"
  | "secrets"
  | "homestead-basics"
  | "manual-labor"
  | "soul-forge"
  | "husbandry-harvest"
  | "mob-moonphase"
  | "nether-reachievement"
  | "rtfm-wiki"
  | "bureaucracy"
  | "hopper-economy"
  | "frontier-record";

export const CATEGORY_LABELS: Record<AchievementCategory, string> = {
  ponder: "Ponder",
  engine: "The Analytical Engine",
  onboarding: "Getting Started",
  quiz: "Guess the Mod",
  "patch-notes": "Patch Notes",
  dedication: "Dedication",
  secrets: "Secrets",
  "homestead-basics": "Homestead Basics",
  "manual-labor": "Manual Labor",
  "soul-forge": "Soul Forge & Hellfire Forge",
  "husbandry-harvest": "Husbandry & Harvest",
  "mob-moonphase": "Mob & Moonphase",
  "nether-reachievement": "Nether Reachievement",
  "rtfm-wiki": "RTFM",
  bureaucracy: "Bureaucracy & Paperwork",
  "hopper-economy": "Hopper Economy",
  "frontier-record": "Frontier Record",
};

// Display order for category sections in the gallery.
export const CATEGORY_ORDER: AchievementCategory[] = [
  "ponder",
  "engine",
  "onboarding",
  "quiz",
  "patch-notes",
  "dedication",
  "secrets",
  "homestead-basics",
  "manual-labor",
  "soul-forge",
  "husbandry-harvest",
  "mob-moonphase",
  "nether-reachievement",
  "rtfm-wiki",
  "bureaucracy",
  "hopper-economy",
  "frontier-record",
];

export type AchievementDef = {
  id: AchievementId;
  title: string;
  description: string;
  icon: string;
  secret?: boolean;
  tier: 1 | 2;
  category: AchievementCategory;
  /** XP granted on unlock. Tier-1 achievements grant none — XP is a tier-2 system. */
  xp?: number;
};

// The original, easy, non-secret onboarding set — no longer what gates
// tier 2. Tier 2 (and every later tier) is just a rung on the admin-
// configurable ladder in admin-config.ts's defaultTiers(): unlockedCount
// crossing that tier's threshold, full stop, the same rule for tier3-6 too.
// "community-edition" is a plain flavor achievement that happens to fire
// at that same moment (see its CUSTOM_RULES entry in
// AchievementsProvider.tsx) — it has no gating power of its own anymore.
// TIER1_IDS itself is still used for pre-tier-2 display purposes (e.g.
// OutpostControlPanel's visible-count, which must never hint at the bigger
// pool before tier 2 unlocks).
export const TIER1_IDS: AchievementId[] = [
  "first-visit",
  "mod-of-day-viewed",
  "quiz-first-correct",
  "quiz-perfect-round",
  "quiz-streak-5",
  "patch-notes-opened",
  "patch-notes-mode-switched",
  "visit-streak-2",
  "theme-toggle-used",
  "window-resized-once",
  "quiz-attempted",
  "outpost-lounging",
];

// The 12 "new" tier-2 achievements — excludes community-edition, which is
// the auto-granted marker for reaching tier 2, not one of the 12.
export const TIER2_NEW_IDS: AchievementId[] = [
  "millstone-grind",
  "perfect-alloy",
  "no-compass-needed",
  "bellows-crucible",
  "broody-hen-7day",
  "hand-cranked",
  "hopper-chain",
  "windmill-watcher",
  "rope-grapple",
  "hardcore-darkness",
  "soul-urn",
  "master-smith",
];

export const TIER2_IDS: AchievementId[] = ["community-edition", ...TIER2_NEW_IDS];

export const ACHIEVEMENTS: AchievementDef[] = [
  {
    id: "pd-first-sentence",
    title: "First Thought",
    description: "Completed your first sentence with Ponder.",
    icon: "\u{1F4AD}",
    tier: 1,
    category: "ponder",
  },
  {
    id: "pd-fluent",
    title: "Finding Its Words",
    description: "Completed 10 sentences with Ponder.",
    icon: "\u{1F4AD}",
    tier: 1,
    category: "ponder",
  },
  {
    id: "pd-first-choice",
    title: "A Mind of Its Own",
    description: "Let Ponder choose a path for the first time.",
    icon: "\u{1F500}",
    tier: 1,
    category: "ponder",
  },
  {
    id: "pd-automated",
    title: "Busted Wide Open",
    description: "Ponder reached The Stump, and found a blueprint in its own head.",
    icon: "\u{2699}\u{FE0F}",
    tier: 2,
    category: "ponder",
    xp: 100,
  },
  {
    id: "pd-oracle",
    title: "Still Here After The End",
    description: "The Engine reached its final chapter, The Wither & The End.",
    icon: "\u{1F31F}",
    tier: 2,
    category: "ponder",
    xp: 150,
  },
  {
    id: "pd-old-friend",
    title: "The One Thing That Remembers",
    description: "Rebuilt the Engine after a prestige, its journal already full.",
    icon: "\u{1F4D3}",
    tier: 2,
    category: "ponder",
    xp: 150,
  },
  {
    id: "pd-insight-1",
    title: "Spark of Insight",
    description: "Earned your first Insight with Ponder.",
    icon: "\u{2728}",
    tier: 1,
    category: "ponder",
  },
  {
    id: "pd-insight-10",
    title: "Adding It Up",
    description: "Earned 10 Insight with Ponder.",
    icon: "\u{1F9E9}",
    tier: 1,
    category: "ponder",
    xp: 50,
  },
  {
    id: "pd-insight-50",
    title: "A Working Theory",
    description: "Earned 50 Insight with Ponder.",
    icon: "\u{1F4D0}",
    tier: 1,
    category: "ponder",
    xp: 100,
  },
  {
    id: "pd-insight-200",
    title: "Load-Bearing Thought",
    description: "Earned 200 Insight with Ponder.",
    icon: "\u{1F9EE}",
    tier: 1,
    category: "ponder",
    xp: 200,
  },
  ...ENGINE_ACHIEVEMENT_DEFS,
  {
    id: "first-visit",
    title: "Welcome to the Outpost",
    description: "Found the hub for the first time.",
    icon: "\u{1F3D5}️",
    tier: 1,
    category: "onboarding",
  },
  {
    id: "mod-of-day-viewed",
    title: "Spotlight's On",
    description: "Checked out the mod of the day.",
    icon: "✨",
    tier: 1,
    category: "onboarding",
  },
  {
    id: "outpost-lounging",
    title: "Making Yourself at Home",
    description: "Spent 30 seconds looking around the Outpost.",
    icon: "\u{1FA91}",
    tier: 1,
    category: "onboarding",
  },
  {
    id: "quiz-first-correct",
    title: "Good Eye",
    description: "Correctly identified a mod.",
    icon: "\u{1F440}",
    tier: 1,
    category: "quiz",
  },
  {
    id: "quiz-perfect-round",
    title: "Mod Whisperer",
    description: "Got a perfect round in Guess the Mod.",
    icon: "\u{1F3C6}",
    tier: 1,
    category: "quiz",
  },
  {
    id: "quiz-streak-5",
    title: "On a Roll",
    description: "5 correct guesses in a row.",
    icon: "\u{1F525}",
    tier: 1,
    category: "quiz",
  },
  {
    id: "patch-notes-opened",
    title: "Reading the Fine Print",
    description: "Opened the patch notes.",
    icon: "\u{1F4DC}",
    tier: 1,
    category: "patch-notes",
  },
  {
    id: "patch-notes-mode-switched",
    title: "Behind the Curtain",
    description: "Switched between Modpack and Mods patch notes.",
    icon: "\u{1F504}",
    tier: 1,
    category: "patch-notes",
  },
  {
    id: "visit-streak-2",
    title: "Back Again",
    description: "Visited 2 days in a row.",
    icon: "\u{1F501}",
    tier: 1,
    category: "dedication",
  },
  {
    id: "theme-toggle-used",
    title: "Light or Dark, Your Call",
    description: "Flipped the theme switch.",
    icon: "\u{1F4A1}",
    tier: 1,
    category: "onboarding",
  },
  {
    id: "window-resized-once",
    title: "Room to Breathe",
    description: "Resized the window.",
    icon: "\u{1FA9F}",
    tier: 1,
    category: "onboarding",
  },
  {
    id: "quiz-attempted",
    title: "Took a Swing",
    description: "Made a guess in Guess the Mod.",
    icon: "\u{1F3AF}",
    tier: 1,
    category: "quiz",
  },
  {
    id: "secret-sequence",
    title: "An Old Cheat",
    description: "Found a secret input sequence.",
    icon: "\u{1F3AE}",
    secret: true,
    tier: 1,
    category: "secrets",
  },
  {
    id: "secret-logo-clicks",
    title: "It Followed You Home",
    description: "Bothered the wolf on the logo one too many times.",
    icon: "\u{1F43A}",
    secret: true,
    tier: 1,
    category: "secrets",
  },
  {
    id: "snow-pile-10min",
    title: "Snowed In",
    description: "Let the snow pile up on the homepage for 10 minutes.",
    icon: "\u{2744}\u{FE0F}",
    secret: true,
    tier: 1,
    category: "secrets",
  },
  {
    id: "snow-pile-50min",
    title: "Eternal Vigil",
    description: "Watched the snow pile up for 50 minutes straight.",
    icon: "\u{1F3D4}\u{FE0F}",
    secret: true,
    tier: 1,
    category: "secrets",
  },
  {
    id: "campfire-medium",
    title: "Cooking Weather",
    description: "Got the campfire up to a proper Medium flame.",
    icon: "\u{1F525}",
    tier: 1,
    category: "onboarding",
  },
  {
    id: "campfire-overstoked",
    title: "Burnt Offering",
    description: "Stoked the campfire all the way to High. Hope you weren't cooking anything.",
    icon: "\u{2600}\u{FE0F}",
    secret: true,
    tier: 1,
    category: "secrets",
  },
  {
    id: "iron-tool-chosen",
    title: "Which Would You Choose?",
    description: "Picked your first iron tool.",
    icon: "\u{26CF}\u{FE0F}",
    tier: 1,
    category: "onboarding",
  },
  {
    id: "iron-tool-completionist",
    title: "Every Option Considered",
    description: "Tried every first-iron-tool choice at least once.",
    icon: "\u{1F9F0}",
    secret: true,
    tier: 1,
    category: "secrets",
  },
  {
    id: "priorities-started",
    title: "Getting Organized",
    description: "Checked off your first early priority.",
    icon: "\u{1F4CB}",
    tier: 1,
    category: "onboarding",
  },
  {
    id: "priorities-completionist",
    title: "By the Book",
    description: "Checked off every early priority, straight from the guide.",
    icon: "\u{2705}",
    secret: true,
    tier: 1,
    category: "secrets",
  },

  // --- Tier 2 ---
  {
    id: "community-edition",
    title: "Community Edition",
    description: "Put the work in.",
    icon: "\u{1F6E0}️",
    tier: 2,
    category: "onboarding",
    xp: 300,
  },
  {
    id: "millstone-grind",
    title: "Millstone Grind",
    description: "Answered 50 quiz questions total.",
    icon: "\u{2699}️",
    tier: 2,
    category: "quiz",
    xp: 100,
  },
  {
    id: "perfect-alloy",
    title: "Perfect Alloy",
    description: "Pulled off 3 perfect Guess the Mod rounds.",
    icon: "\u{1F9EA}",
    tier: 2,
    category: "quiz",
    xp: 100,
  },
  {
    id: "no-compass-needed",
    title: "No Compass Needed",
    description: "Nailed a 10-guess streak in Guess the Mod.",
    icon: "\u{1F9ED}",
    tier: 2,
    category: "quiz",
    xp: 100,
  },
  {
    id: "bellows-crucible",
    title: "Bellows & Crucible",
    description: "Switched Patch Notes mode 5 times in one visit.",
    icon: "\u{1F525}",
    tier: 2,
    category: "patch-notes",
    xp: 100,
  },
  {
    id: "broody-hen-7day",
    title: "Broody Hen",
    description: "Visited 7 days in a row. Patience pays off.",
    icon: "\u{1F414}",
    tier: 2,
    category: "dedication",
    xp: 100,
  },
  {
    id: "hand-cranked",
    title: "Hand-Cranked",
    description: "Flipped the theme switch 15 times in one visit.",
    icon: "\u{1F527}",
    secret: true,
    tier: 2,
    category: "secrets",
    xp: 200,
  },
  {
    id: "hopper-chain",
    title: "Hopper Chain",
    description: "Unlocked 5 achievements in a single visit.",
    icon: "\u{1F4E6}",
    secret: true,
    tier: 2,
    category: "secrets",
    xp: 200,
  },
  {
    id: "windmill-watcher",
    title: "Windmill Watcher",
    description: "Resized the window 10 times.",
    icon: "\u{1F32C}️",
    secret: true,
    tier: 2,
    category: "secrets",
    xp: 200,
  },
  {
    id: "rope-grapple",
    title: "Rope & Grapple",
    description: "Scrolled clear from the top of the homepage to the bottom.",
    icon: "\u{1FA9D}",
    secret: true,
    tier: 2,
    category: "secrets",
    xp: 200,
  },
  {
    id: "hardcore-darkness",
    title: "Hardcore Darkness",
    description: "Found the Outpost between midnight and 5AM, lights off.",
    icon: "\u{1F311}",
    secret: true,
    tier: 2,
    category: "secrets",
    xp: 200,
  },
  {
    id: "soul-urn",
    title: "Soul Urn",
    description: "Captured every secret from the first tier.",
    icon: "\u{1F3FA}",
    secret: true,
    tier: 2,
    category: "secrets",
    xp: 200,
  },
  {
    id: "master-smith",
    title: "Master Smith",
    description: "Unlocked every other Tier II achievement.",
    icon: "\u{2692}️",
    secret: true,
    tier: 2,
    category: "secrets",
    xp: 200,
  },

  // --- The 111-achievement expansion ---
  // Homestead Basics
  { id: "hb-full-tour", title: "Full Tour of the Grounds", description: "Visited every section of the Tier II dashboard at least once.", icon: "\u{1F5FA}\u{FE0F}", tier: 2, category: "homestead-basics", xp: 100 },
  { id: "hb-pin-first", title: "Staked a Claim", description: "Pinned a default dashboard tab for the first time.", icon: "\u{1F4CC}", tier: 2, category: "homestead-basics", xp: 75 },
  { id: "hb-pin-fickle", title: "Can't Sit Still", description: "Changed your pinned tab 3 separate times.", icon: "\u{1F504}", tier: 2, category: "homestead-basics", xp: 100 },
  { id: "hb-skin-first-change", title: "New Coat of Paint", description: "Equipped a different Outpost skin for the first time.", icon: "\u{1F3A8}", tier: 2, category: "homestead-basics", xp: 75 },
  { id: "hb-skin-all", title: "Full Wardrobe", description: "Tried on every Outpost skin at least once.", icon: "\u{1F9E5}", tier: 2, category: "homestead-basics", xp: 200 },
  { id: "hb-lore-half", title: "Half the Story", description: "Revealed the Outpost Logbook up through level 10.", icon: "\u{1F4D6}", tier: 2, category: "homestead-basics", xp: 150 },
  { id: "hb-lore-deep", title: "The Whole Story", description: "Revealed the Outpost Logbook up through level 25.", icon: "\u{1F4DA}", tier: 2, category: "homestead-basics", xp: 250 },
  { id: "hb-activity-25", title: "Keeping the Ledger", description: "Logged 25 notable events in your activity log.", icon: "\u{1F5D2}\u{FE0F}", tier: 2, category: "homestead-basics", xp: 100 },
  { id: "hb-activity-100", title: "Meticulous Record-Keeping", description: "Logged 100 notable events in your activity log.", icon: "\u{1F5C3}\u{FE0F}", tier: 2, category: "homestead-basics", xp: 200 },
  { id: "hb-export-first", title: "Filed in Triplicate", description: "Exported your Outpost save for the first time.", icon: "\u{1F4E4}", tier: 2, category: "homestead-basics", xp: 75 },
  { id: "hb-import-first", title: "Audit Complete", description: "Imported an Outpost save for the first time.", icon: "\u{1F4E5}", tier: 2, category: "homestead-basics", xp: 75 },

  // Manual Labor
  { id: "ml-millstone-ii", title: "At the Millstone, Again", description: "Answered 100 quiz questions, lifetime.", icon: "\u{2699}\u{FE0F}", tier: 1, category: "manual-labor", xp: 150 },
  { id: "ml-millstone-iii", title: "Grinding Never Stops", description: "Answered 250 quiz questions, lifetime.", icon: "\u{2699}\u{FE0F}", tier: 2, category: "manual-labor", xp: 300 },
  { id: "ml-bellows-ii", title: "Working the Bellows, Harder", description: "Switched Patch Notes mode 20 times, lifetime.", icon: "\u{1F525}", tier: 2, category: "manual-labor", xp: 150 },
  { id: "ml-bellows-iii", title: "The Bellows Never Rest", description: "Switched Patch Notes mode 50 times, lifetime.", icon: "\u{1F525}", tier: 2, category: "manual-labor", xp: 300 },
  { id: "ml-turntable-ii", title: "Turning the Turntable, Again", description: "Resized the window 25 times, lifetime.", icon: "\u{1F32C}\u{FE0F}", tier: 1, category: "manual-labor", xp: 150 },
  { id: "ml-turntable-iii", title: "The Turntable Never Stops", description: "Resized the window 60 times, lifetime.", icon: "\u{1F32C}\u{FE0F}", tier: 2, category: "manual-labor", xp: 300 },
  { id: "ml-crank-ii", title: "Hand-Cranked, Harder", description: "Flipped the theme switch 40 times, lifetime.", icon: "\u{1F527}", tier: 1, category: "manual-labor", xp: 150 },
  { id: "ml-crank-iii", title: "Arm Like Iron", description: "Flipped the theme switch 80 times, lifetime.", icon: "\u{1F527}", tier: 2, category: "manual-labor", xp: 300 },
  { id: "ml-loom-streak", title: "Weaving a Pattern", description: "Hit a 15-guess streak in Guess the Mod.", icon: "\u{1F9F5}", tier: 1, category: "manual-labor", xp: 200 },
  { id: "ml-loom-streak-ii", title: "Unbroken Thread", description: "Hit a 25-guess streak in Guess the Mod.", icon: "\u{1F9F5}", tier: 2, category: "manual-labor", xp: 350 },
  { id: "ml-reforge-i", title: "First Reforging", description: "Prestiged for the first time.", icon: "\u{1F528}", tier: 2, category: "manual-labor", xp: 250 },

  // Soul Forge & Hellfire Forge
  { id: "sf-apprentice", title: "Apprentice of the Forge", description: "Reached Outpost level 5.", icon: "\u{1F525}", tier: 2, category: "soul-forge", xp: 100 },
  { id: "sf-journeyman", title: "Journeyman of the Forge", description: "Reached Outpost level 10.", icon: "\u{1F525}", tier: 2, category: "soul-forge", xp: 200 },
  { id: "sf-tradesman", title: "Tradesman of the Forge", description: "Reached Outpost level 15.", icon: "\u{1F525}", tier: 2, category: "soul-forge", xp: 300 },
  { id: "sf-veteran", title: "Veteran of the Forge", description: "Reached Outpost level 20.", icon: "\u{1F525}", tier: 2, category: "soul-forge", xp: 400 },
  { id: "sf-legend", title: "Legend of the Forge", description: "Reached Outpost level 30.", icon: "\u{1F451}", tier: 2, category: "soul-forge", xp: 600 },
  { id: "sf-prestige-ii", title: "Twice Reforged", description: "Prestiged twice.", icon: "\u{2692}\u{FE0F}", tier: 2, category: "soul-forge", xp: 400 },
  { id: "sf-prestige-iii", title: "Thrice Reforged", description: "Prestiged three times.", icon: "\u{2692}\u{FE0F}", tier: 2, category: "soul-forge", xp: 600 },
  { id: "sf-perfect-ii", title: "Ember Kept Alive", description: "10 perfect Guess the Mod rounds, lifetime.", icon: "\u{1F56F}\u{FE0F}", tier: 2, category: "soul-forge", xp: 250 },
  { id: "sf-perfect-iii", title: "Undying Flame", description: "25 perfect Guess the Mod rounds, lifetime.", icon: "\u{1F525}", tier: 2, category: "soul-forge", xp: 450 },
  { id: "sf-streak-50", title: "Molten Focus", description: "Hit a 50-guess streak in Guess the Mod.", icon: "\u{1F321}\u{FE0F}", tier: 2, category: "soul-forge", xp: 500 },
  { id: "sf-lifetime-xp", title: "Soul-Bound", description: "Earned 5,000 XP over your lifetime — prestige resets and all.", icon: "\u{1F52E}", secret: true, tier: 2, category: "soul-forge", xp: 500 },

  // Husbandry & Harvest
  { id: "hh-first-catch", title: "First Cutting", description: "Correctly guessed 5 distinct mods.", icon: "\u{1F33E}", tier: 1, category: "husbandry-harvest", xp: 100 },
  { id: "hh-apiary", title: "Tending the Apiary", description: "Correctly guessed 15 distinct mods.", icon: "\u{1F41D}", tier: 2, category: "husbandry-harvest", xp: 200 },
  { id: "hh-broody", title: "Gone Broody", description: "Correctly guessed 30 distinct mods.", icon: "\u{1F414}", tier: 2, category: "husbandry-harvest", xp: 350 },
  { id: "hh-full-harvest", title: "Full Harvest", description: "Correctly guessed 45 distinct mods.", icon: "\u{1F33B}", tier: 2, category: "husbandry-harvest", xp: 500 },
  { id: "hh-compost", title: "Well-Composted", description: "Visited the Outpost on 10 separate days.", icon: "\u{1FAB1}", tier: 2, category: "husbandry-harvest", xp: 150 },
  { id: "hh-compost-ii", title: "Deeply Composted", description: "Visited the Outpost on 30 separate days.", icon: "\u{1FAB1}", tier: 2, category: "husbandry-harvest", xp: 350 },
  { id: "hh-old-growth", title: "Old Growth", description: "Visited the Outpost on 60 separate days.", icon: "\u{1F333}", tier: 2, category: "husbandry-harvest", xp: 600 },
  { id: "hh-hemp-fields", title: "Hemp Fields", description: "Visited every Explore tab — Patch Notes and Quiz.", icon: "\u{1F33F}", tier: 2, category: "husbandry-harvest", xp: 100 },
  { id: "hh-lay-of-land", title: "Getting the Lay of the Land", description: "Visited 3 distinct dashboard tabs.", icon: "\u{1F6B6}", tier: 2, category: "husbandry-harvest", xp: 75 },
  { id: "hh-three-piece", title: "Three-Piece Suit", description: "Tried 3 distinct Outpost skins.", icon: "\u{1F97C}", tier: 2, category: "husbandry-harvest", xp: 150 },
  { id: "hh-full-coop", title: "Full Coop", description: "Kept a 14-day visit streak going.", icon: "\u{1F423}", tier: 2, category: "husbandry-harvest", xp: 250 },

  // Mob & Moonphase
  { id: "mm-night-watch", title: "Night Watch", description: "Visited the Outpost between midnight and 4AM.", icon: "\u{1F319}", tier: 1, category: "mob-moonphase", xp: 100 },
  { id: "mm-first-light", title: "Before First Light", description: "Visited the Outpost between 5AM and 7AM.", icon: "\u{1F304}", tier: 1, category: "mob-moonphase", xp: 100 },
  { id: "mm-nocturnal", title: "Nocturnal Habits", description: "5 visits between midnight and 4AM.", icon: "\u{1F989}", tier: 1, category: "mob-moonphase", xp: 250 },
  { id: "mm-blood-moon", title: "Blood Moon Rising", description: "Visited the Outpost during a real full moon.", icon: "\u{1F315}", secret: true, tier: 1, category: "mob-moonphase", xp: 300 },
  { id: "mm-off-clock", title: "Off the Clock", description: "Visited the Outpost on a weekend.", icon: "\u{1F6D6}\u{FE0F}", tier: 1, category: "mob-moonphase", xp: 75 },
  { id: "mm-weekend-regular", title: "Weekend Regular", description: "5 weekend visits.", icon: "\u{1F3D5}\u{FE0F}", tier: 1, category: "mob-moonphase", xp: 200 },
  { id: "mm-golden-hour", title: "Golden Hour", description: "Visited the Outpost between 6PM and 8PM.", icon: "\u{1F307}", tier: 1, category: "mob-moonphase", xp: 100 },
  { id: "mm-dusk-regular", title: "Long Shadows", description: "5 visits between 6PM and 8PM.", icon: "\u{1F306}", tier: 1, category: "mob-moonphase", xp: 200 },
  { id: "mm-moon-regular", title: "Tracking the Sky", description: "3 visits during a real full moon.", icon: "\u{1F317}", secret: true, tier: 1, category: "mob-moonphase", xp: 400 },
  { id: "mm-dawn-regular", title: "Rise and Grind", description: "5 visits between 5AM and 7AM.", icon: "\u{2600}\u{FE0F}", tier: 1, category: "mob-moonphase", xp: 200 },
  { id: "mm-round-the-clock", title: "Round the Clock", description: "Visited both before dawn and after midnight, on different days.", icon: "\u{1F570}\u{FE0F}", tier: 1, category: "mob-moonphase", xp: 250 },
  { id: "mm-new-moon", title: "New Moon, New Start", description: "Visited the Outpost during a real new moon.", icon: "\u{1F311}", secret: true, tier: 1, category: "mob-moonphase", xp: 300 },

  // Nether Reachievement
  { id: "nr-milestone-25", title: "Through the Veil", description: "Unlocked 25 achievements total.", icon: "\u{1F300}", tier: 1, category: "nether-reachievement", xp: 150 },
  { id: "nr-milestone-50", title: "Deeper In", description: "Unlocked 50 achievements total.", icon: "\u{1F300}", tier: 2, category: "nether-reachievement", xp: 300 },
  { id: "nr-milestone-75", title: "No Turning Back", description: "Unlocked 75 achievements total.", icon: "\u{1F525}", tier: 2, category: "nether-reachievement", xp: 450 },
  { id: "nr-milestone-100", title: "The Long Way Round", description: "Unlocked 100 achievements total.", icon: "\u{1F30B}", tier: 2, category: "nether-reachievement", xp: 600 },
  { id: "nr-milestone-all", title: "Reforged in Fire", description: "Unlocked every other hand-authored achievement in the Outpost.", icon: "\u{1F451}", secret: true, tier: 2, category: "nether-reachievement", xp: 1000 },
  { id: "nr-secrets-half", title: "Half in Shadow", description: "Unlocked at least half of every secret achievement in the Outpost.", icon: "\u{1F573}\u{FE0F}", secret: true, tier: 2, category: "nether-reachievement", xp: 350 },
  { id: "nr-secrets-most", title: "Deep Cave Dweller", description: "Unlocked at least 80% of every secret achievement in the Outpost.", icon: "\u{1F987}", secret: true, tier: 2, category: "nether-reachievement", xp: 600 },
  { id: "nr-category-quiz", title: "Quiz Historian", description: "Unlocked every achievement in the Guess the Mod category.", icon: "\u{1F4D3}", tier: 2, category: "nether-reachievement", xp: 400 },
  { id: "nr-category-manual", title: "Master of Manual Labor", description: "Unlocked every achievement in the Manual Labor category.", icon: "\u{1F6E0}\u{FE0F}", tier: 2, category: "nether-reachievement", xp: 400 },
  { id: "nr-category-forge", title: "Keeper of the Forge", description: "Unlocked every achievement in the Soul Forge & Hellfire Forge category.", icon: "\u{1F525}", tier: 2, category: "nether-reachievement", xp: 400 },
  { id: "nr-hundred-days", title: "A Hundred Days In", description: "Visited the Outpost on 100 separate days.", icon: "\u{1F4C5}", tier: 2, category: "nether-reachievement", xp: 700 },

  // RTFM
  { id: "rw-open-5", title: "Skimming the Manual", description: "Opened Patch Notes 5 times, lifetime.", icon: "\u{1F4D6}", tier: 1, category: "rtfm-wiki", xp: 100 },
  { id: "rw-open-15", title: "Read the Manual", description: "Opened Patch Notes 15 times, lifetime.", icon: "\u{1F4D7}", tier: 2, category: "rtfm-wiki", xp: 200 },
  { id: "rw-open-30", title: "Cover to Cover", description: "Opened Patch Notes 30 times, lifetime.", icon: "\u{1F4D8}", tier: 2, category: "rtfm-wiki", xp: 350 },
  { id: "rw-lore-15", title: "Footnote Hunter", description: "Revealed the Outpost Logbook up through level 15.", icon: "\u{1F50D}", tier: 2, category: "rtfm-wiki", xp: 200 },
  { id: "rw-lore-20", title: "Between the Lines", description: "Revealed the Outpost Logbook up through level 20.", icon: "\u{1F9D0}", tier: 2, category: "rtfm-wiki", xp: 300 },
  { id: "rw-quiz-300", title: "Well Read", description: "Answered 300 quiz questions, lifetime.", icon: "\u{1F4D5}", tier: 2, category: "rtfm-wiki", xp: 400 },
  { id: "rw-activity-200", title: "The Complete Ledger", description: "Logged 200 notable events in your activity log.", icon: "\u{1F5C2}\u{FE0F}", tier: 2, category: "rtfm-wiki", xp: 400 },
  { id: "rw-mode-switch-100", title: "Footnotes on Footnotes", description: "Switched Patch Notes mode 100 times, lifetime.", icon: "\u{1F4D1}", tier: 2, category: "rtfm-wiki", xp: 500 },
  { id: "rw-pin-5", title: "Dog-Eared Pages", description: "Changed your pinned tab 5 separate times.", icon: "\u{1F516}", tier: 2, category: "rtfm-wiki", xp: 200 },
  { id: "rw-export-5", title: "Filed and Re-Filed", description: "Exported your save 5 separate times.", icon: "\u{1F5C4}\u{FE0F}", tier: 2, category: "rtfm-wiki", xp: 200 },
  { id: "rw-import-5", title: "Cross-Referenced", description: "Imported a save 5 separate times.", icon: "\u{1F5C4}\u{FE0F}", tier: 2, category: "rtfm-wiki", xp: 200 },

  // Bureaucracy & Paperwork
  { id: "bp-paper-trail", title: "Paper Trail", description: "Exported and imported a save, at least once each.", icon: "\u{1F4CE}", tier: 2, category: "bureaucracy", xp: 150 },
  { id: "bp-skin-swap-5", title: "Requisition Form 27-B", description: "Changed your Outpost skin 5 separate times.", icon: "\u{1F4CB}", tier: 2, category: "bureaucracy", xp: 150 },
  { id: "bp-skin-swap-15", title: "In Triplicate", description: "Changed your Outpost skin 15 separate times.", icon: "\u{1F4CB}", tier: 2, category: "bureaucracy", xp: 300 },
  { id: "bp-unpinned", title: "Filed Under Miscellaneous", description: "Unpinned a tab after pinning it.", icon: "\u{1F5D1}\u{FE0F}", tier: 2, category: "bureaucracy", xp: 100 },
  { id: "bp-tab-hopping", title: "Inter-Departmental Memo", description: "Visited 5 distinct dashboard tabs in a single session.", icon: "\u{2709}\u{FE0F}", secret: true, tier: 2, category: "bureaucracy", xp: 250 },
  { id: "bp-resize-100", title: "Facilities Request", description: "Resized the window 100 times, lifetime.", icon: "\u{1F3E2}", tier: 2, category: "bureaucracy", xp: 450 },
  { id: "bp-toggle-150", title: "Energy Audit", description: "Flipped the theme switch 150 times, lifetime.", icon: "\u{1F4A1}", tier: 2, category: "bureaucracy", xp: 450 },
  { id: "bp-streak-75", title: "Performance Review", description: "Hit a 75-guess streak in Guess the Mod.", icon: "\u{1F4C8}", tier: 2, category: "bureaucracy", xp: 600 },
  { id: "bp-perfect-40", title: "Exceeds Expectations", description: "40 perfect Guess the Mod rounds, lifetime.", icon: "\u{2B50}", tier: 2, category: "bureaucracy", xp: 600 },
  { id: "bp-activity-500", title: "Archive Overflow", description: "Logged 500 notable events in your activity log.", icon: "\u{1F5C3}\u{FE0F}", tier: 2, category: "bureaucracy", xp: 700 },
  { id: "bp-prestige-5", title: "Reorganization Complete", description: "Prestiged 5 times.", icon: "\u{1F3DB}\u{FE0F}", tier: 2, category: "bureaucracy", xp: 700 },

  // Hopper Economy
  { id: "he-chain-ii", title: "Chain Reaction II", description: "10 achievements unlocked in a single session.", icon: "\u{1F4E6}", tier: 2, category: "hopper-economy", xp: 250 },
  { id: "he-chain-iii", title: "Chain Reaction III", description: "20 achievements unlocked in a single session.", icon: "\u{1F4E6}", tier: 2, category: "hopper-economy", xp: 500 },
  { id: "he-explore-session", title: "Full Circuit", description: "Visited both Explore tabs in a single session.", icon: "\u{1F501}", tier: 2, category: "hopper-economy", xp: 200 },
  { id: "he-full-session", title: "Every Sorting Run", description: "Visited all 5 dashboard tabs in a single session.", icon: "\u{1F500}", tier: 2, category: "hopper-economy", xp: 350 },
  { id: "he-redstone-clock", title: "Redstone Clock", description: "2 perfect Guess the Mod rounds in a single session.", icon: "\u{23F1}\u{FE0F}", tier: 2, category: "hopper-economy", xp: 300 },
  { id: "he-overclocked", title: "Overclocked", description: "Earned 500 XP in a single session.", icon: "\u{26A1}", tier: 2, category: "hopper-economy", xp: 400 },
  { id: "he-every-day", title: "Every Day of the Week", description: "Visited on both a weekend and a weekday.", icon: "\u{1F4C6}", tier: 1, category: "hopper-economy", xp: 200 },
  { id: "he-skin-session-swap", title: "Quick Change Artist", description: "Changed your skin twice within a single session.", icon: "\u{1F3AD}", tier: 2, category: "hopper-economy", xp: 200 },
  { id: "he-round-trip", title: "Round Trip", description: "Exported, then imported, within the same session.", icon: "\u{1F503}", tier: 2, category: "hopper-economy", xp: 250 },
  { id: "he-chain-master", title: "The Whole Assembly Line", description: "30 achievements unlocked in a single session.", icon: "\u{1F3ED}", secret: true, tier: 2, category: "hopper-economy", xp: 800 },
  { id: "he-quiz-marathon", title: "Quiz Marathon", description: "Answered 25 quiz questions in a single session.", icon: "\u{1F3C3}", tier: 2, category: "hopper-economy", xp: 250 },

  // Frontier Record
  { id: "fr-wardrobe-certified", title: "Full Wardrobe, Certified", description: "Tried every skin and changed skins 20+ times.", icon: "\u{1F3C5}", tier: 2, category: "frontier-record", xp: 400 },
  { id: "fr-all-flair", title: "Decorated", description: "Earned every flair badge.", icon: "\u{1F396}\u{FE0F}", tier: 2, category: "frontier-record", xp: 500 },
  { id: "fr-all-categories", title: "Every Corner Covered", description: "Unlocked at least one achievement in every category.", icon: "\u{1F5FA}\u{FE0F}", tier: 2, category: "frontier-record", xp: 500 },
  { id: "fr-master-every-trade", title: "Master of Every Trade", description: "Unlocked every achievement in both Manual Labor and Soul Forge & Hellfire Forge.", icon: "\u{1F3C6}", tier: 2, category: "frontier-record", xp: 700 },
  { id: "fr-nothing-hidden", title: "Nothing Left Hidden", description: "Unlocked every secret achievement in the Outpost.", icon: "\u{1F513}", secret: true, tier: 2, category: "frontier-record", xp: 800 },
  { id: "fr-lifes-work", title: "A Life's Work", description: "Earned 20,000 XP over your lifetime.", icon: "\u{1F451}", tier: 2, category: "frontier-record", xp: 1000 },
  { id: "fr-half-year", title: "Half a Year In", description: "Visited the Outpost on 180 separate days.", icon: "\u{1F5D3}\u{FE0F}", tier: 2, category: "frontier-record", xp: 1000 },
  { id: "fr-prestige-10", title: "Reforged Beyond Recognition", description: "Prestiged 10 times.", icon: "\u{2692}\u{FE0F}", tier: 2, category: "frontier-record", xp: 1000 },
  { id: "fr-complete-111", title: "Complete Homestead", description: "Unlocked every other achievement from this expansion.", icon: "\u{1F3E1}", secret: true, tier: 2, category: "frontier-record", xp: 1200 },
  { id: "fr-founding-settler", title: "The Founding Settler", description: "Unlocked literally everything hand-authored in the Outpost.", icon: "\u{1F31F}", secret: true, tier: 2, category: "frontier-record", xp: 1500 },
  { id: "fr-ledger-100", title: "Into the Ledger", description: "Unlocked 100 procedurally-generated Ledger Entries.", icon: "\u{1F4DC}", tier: 2, category: "frontier-record", xp: 500 },
];

export const ACHIEVEMENTS_BY_ID: Record<AchievementId, AchievementDef> = Object.fromEntries(
  ACHIEVEMENTS.map((a) => [a.id, a])
) as Record<AchievementId, AchievementDef>;

// The 111-achievement expansion's ids, grouped by category — used by
// AchievementsProvider for the generic threshold checker and the
// category-completion / capstone meta-achievements below.
export const EXPANSION_HOMESTEAD_IDS: AchievementId[] = ["hb-full-tour", "hb-pin-first", "hb-pin-fickle", "hb-skin-first-change", "hb-skin-all", "hb-lore-half", "hb-lore-deep", "hb-activity-25", "hb-activity-100", "hb-export-first", "hb-import-first"];
export const EXPANSION_MANUAL_LABOR_IDS: AchievementId[] = ["ml-millstone-ii", "ml-millstone-iii", "ml-bellows-ii", "ml-bellows-iii", "ml-turntable-ii", "ml-turntable-iii", "ml-crank-ii", "ml-crank-iii", "ml-loom-streak", "ml-loom-streak-ii", "ml-reforge-i"];
export const EXPANSION_SOUL_FORGE_IDS: AchievementId[] = ["sf-apprentice", "sf-journeyman", "sf-tradesman", "sf-veteran", "sf-legend", "sf-prestige-ii", "sf-prestige-iii", "sf-perfect-ii", "sf-perfect-iii", "sf-streak-50", "sf-lifetime-xp"];
export const EXPANSION_HUSBANDRY_IDS: AchievementId[] = ["hh-first-catch", "hh-apiary", "hh-broody", "hh-full-harvest", "hh-compost", "hh-compost-ii", "hh-old-growth", "hh-hemp-fields", "hh-lay-of-land", "hh-three-piece", "hh-full-coop"];
export const EXPANSION_MOONPHASE_IDS: AchievementId[] = ["mm-night-watch", "mm-first-light", "mm-nocturnal", "mm-blood-moon", "mm-off-clock", "mm-weekend-regular", "mm-golden-hour", "mm-dusk-regular", "mm-moon-regular", "mm-dawn-regular", "mm-round-the-clock", "mm-new-moon"];
export const EXPANSION_NETHER_IDS: AchievementId[] = ["nr-milestone-25", "nr-milestone-50", "nr-milestone-75", "nr-milestone-100", "nr-milestone-all", "nr-secrets-half", "nr-secrets-most", "nr-category-quiz", "nr-category-manual", "nr-category-forge", "nr-hundred-days"];
export const EXPANSION_RTFM_IDS: AchievementId[] = ["rw-open-5", "rw-open-15", "rw-open-30", "rw-lore-15", "rw-lore-20", "rw-quiz-300", "rw-activity-200", "rw-mode-switch-100", "rw-pin-5", "rw-export-5", "rw-import-5"];
export const EXPANSION_BUREAUCRACY_IDS: AchievementId[] = ["bp-paper-trail", "bp-skin-swap-5", "bp-skin-swap-15", "bp-unpinned", "bp-tab-hopping", "bp-resize-100", "bp-toggle-150", "bp-streak-75", "bp-perfect-40", "bp-activity-500", "bp-prestige-5"];
export const EXPANSION_HOPPER_IDS: AchievementId[] = ["he-chain-ii", "he-chain-iii", "he-explore-session", "he-full-session", "he-redstone-clock", "he-overclocked", "he-every-day", "he-skin-session-swap", "he-round-trip", "he-chain-master", "he-quiz-marathon"];
export const EXPANSION_FRONTIER_IDS: AchievementId[] = ["fr-wardrobe-certified", "fr-all-flair", "fr-all-categories", "fr-master-every-trade", "fr-nothing-hidden", "fr-lifes-work", "fr-half-year", "fr-prestige-10", "fr-complete-111", "fr-founding-settler", "fr-ledger-100"];

export const EXPANSION_IDS: AchievementId[] = [
  ...EXPANSION_HOMESTEAD_IDS,
  ...EXPANSION_MANUAL_LABOR_IDS,
  ...EXPANSION_SOUL_FORGE_IDS,
  ...EXPANSION_HUSBANDRY_IDS,
  ...EXPANSION_MOONPHASE_IDS,
  ...EXPANSION_NETHER_IDS,
  ...EXPANSION_RTFM_IDS,
  ...EXPANSION_BUREAUCRACY_IDS,
  ...EXPANSION_HOPPER_IDS,
  ...EXPANSION_FRONTIER_IDS,
];

// Every hand-authored id in the whole catalog (original 25 + the 111
// expansion) — the "everything" capstones check against this.
// Derived from ACHIEVEMENTS directly (not unioned from the individual id
// lists) so it automatically includes every achievement that exists,
// including ones outside those three groupings (e.g. the Campfire and
// Your First Iron Tool) — the "everything" capstones should mean
// everything, not just the ids someone remembered to list here.
export const ALL_HAND_AUTHORED_IDS: AchievementId[] = ACHIEVEMENTS.map((a) => a.id);
