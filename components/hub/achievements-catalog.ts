export type AchievementId =
  | "first-visit"
  | "mod-of-day-viewed"
  | "quiz-first-correct"
  | "quiz-perfect-round"
  | "quiz-streak-5"
  | "patch-notes-opened"
  | "patch-notes-mode-switched"
  | "streak-3-day"
  | "secret-sequence"
  | "secret-logo-clicks";

export type AchievementDef = {
  id: AchievementId;
  title: string;
  description: string;
  icon: string;
  secret?: boolean;
};

export const ACHIEVEMENTS: AchievementDef[] = [
  {
    id: "first-visit",
    title: "Welcome to the Outpost",
    description: "Found the hub for the first time.",
    icon: "\u{1F3D5}️",
  },
  {
    id: "mod-of-day-viewed",
    title: "Spotlight's On",
    description: "Checked out the mod of the day.",
    icon: "✨",
  },
  {
    id: "quiz-first-correct",
    title: "Good Eye",
    description: "Correctly identified a mod.",
    icon: "\u{1F440}",
  },
  {
    id: "quiz-perfect-round",
    title: "Mod Whisperer",
    description: "Got a perfect round in Guess the Mod.",
    icon: "\u{1F3C6}",
  },
  {
    id: "quiz-streak-5",
    title: "On a Roll",
    description: "5 correct guesses in a row.",
    icon: "\u{1F525}",
  },
  {
    id: "patch-notes-opened",
    title: "Reading the Fine Print",
    description: "Opened the patch notes.",
    icon: "\u{1F4DC}",
  },
  {
    id: "patch-notes-mode-switched",
    title: "Behind the Curtain",
    description: "Switched between Modpack and Mods patch notes.",
    icon: "\u{1F504}",
  },
  {
    id: "streak-3-day",
    title: "Regular",
    description: "Visited 3 days in a row.",
    icon: "\u{1F4C5}",
  },
  {
    id: "secret-sequence",
    title: "An Old Cheat",
    description: "Found a secret input sequence.",
    icon: "\u{1F3AE}",
    secret: true,
  },
  {
    id: "secret-logo-clicks",
    title: "It Followed You Home",
    description: "Bothered the wolf on the logo one too many times.",
    icon: "\u{1F43A}",
    secret: true,
  },
];

export const ACHIEVEMENTS_BY_ID: Record<AchievementId, AchievementDef> = Object.fromEntries(
  ACHIEVEMENTS.map((a) => [a.id, a])
) as Record<AchievementId, AchievementDef>;
