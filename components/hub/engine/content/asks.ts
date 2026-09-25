// "The Engine asks YOU" — from Day Two on, it occasionally asks instead of
// answering. Each option leans toward one of three beliefs (BTW-flavored:
// Hardcore / Homesteader / Soulforger), which later shapes its lines, its
// Stage 6 specialization offer, and a few hidden things.
import type { BeliefAxis } from "../types";

export type AskDef = {
  id: string;
  question: string;
  options: { id: string; axis: BeliefAxis; text: string; journal: string }[];
};

export const ASKS: AskDef[] = [
  {
    id: "a-night",
    question: "Night falls. You…",
    options: [
      { id: "dig", axis: "hardcore", text: "Dig in and keep working.", journal: "you'd rather dig in than wait out the dark." },
      { id: "fire", axis: "homesteader", text: "Light the fire and wait.", journal: "you'd light the fire and wait for morning." },
      { id: "nether", axis: "soulforger", text: "Go looking for the Nether.", journal: "the dark makes you curious, not careful." },
    ],
  },
  {
    id: "a-tool",
    question: "Your first iron. What do you make?",
    options: [
      { id: "pick", axis: "hardcore", text: "A pickaxe. Deeper.", journal: "your first iron goes into going deeper." },
      { id: "hoe", axis: "homesteader", text: "A hoe. Food first.", journal: "your first iron goes into food." },
      { id: "keep", axis: "soulforger", text: "Nothing yet. I'll save it.", journal: "you'd save your first iron for something bigger." },
    ],
  },
  {
    id: "a-death",
    question: "If you died right now, you'd…",
    options: [
      { id: "again", axis: "hardcore", text: "Start again. Immediately.", journal: "death is just a restart to you." },
      { id: "sad", axis: "homesteader", text: "Miss the house.", journal: "you'd miss the house most." },
      { id: "learn", axis: "soulforger", text: "Want to know what killed me.", journal: "you'd want to know what killed you." },
    ],
  },
  {
    id: "a-hunger",
    question: "Hunger's at three shanks. You…",
    options: [
      { id: "push", axis: "hardcore", text: "Push on. It's fine.", journal: "three shanks is plenty, apparently." },
      { id: "cook", axis: "homesteader", text: "Stop and cook properly.", journal: "you stop and cook properly." },
      { id: "hunt", axis: "soulforger", text: "Go hunt something bigger.", journal: "hunger makes you hunt something bigger." },
    ],
  },
  {
    id: "a-home",
    question: "A good base is…",
    options: [
      { id: "hole", axis: "hardcore", text: "A hole with a door.", journal: "a good base is a hole with a door." },
      { id: "farm", axis: "homesteader", text: "Fields, animals, a porch.", journal: "a good base has a porch." },
      { id: "forge", axis: "soulforger", text: "Wherever the forge is.", journal: "home is wherever the forge is." },
    ],
  },
  {
    id: "a-mob",
    question: "A creeper, far off. You…",
    options: [
      { id: "fight", axis: "hardcore", text: "Fight it.", journal: "you fight creepers on purpose." },
      { id: "wall", axis: "homesteader", text: "Build a wall.", journal: "you build a wall and let the creeper be." },
      { id: "study", axis: "soulforger", text: "Wonder what it's made of.", journal: "you wonder what creepers are made of." },
    ],
  },
  {
    id: "a-moon",
    question: "The full moon is up. It means…",
    options: [
      { id: "danger", axis: "hardcore", text: "More mobs. Good.", journal: "full moons mean more to fight." },
      { id: "light", axis: "homesteader", text: "A little more light.", journal: "full moons mean a little more light." },
      { id: "omen", axis: "soulforger", text: "Something's about to change.", journal: "full moons feel like omens to you." },
    ],
  },
  {
    id: "a-rain",
    question: "It starts to rain. You…",
    options: [
      { id: "ignore", axis: "hardcore", text: "Don't notice.", journal: "you don't notice rain." },
      { id: "roof", axis: "homesteader", text: "Fix the roof.", journal: "rain means fixing the roof." },
      { id: "lightning", axis: "soulforger", text: "Watch for lightning.", journal: "you watch rain for lightning." },
    ],
  },
  {
    id: "a-gloom",
    question: "The gloom is getting close. You…",
    options: [
      { id: "through", axis: "hardcore", text: "Walk through it.", journal: "you walk through the gloom." },
      { id: "torch", axis: "homesteader", text: "Place another torch.", journal: "you answer the gloom with torches." },
      { id: "listen", axis: "soulforger", text: "Stop and listen to it.", journal: "you stop and listen to the gloom." },
    ],
  },
  {
    id: "a-villager",
    question: "A villager offers a bad trade.",
    options: [
      { id: "refuse", axis: "hardcore", text: "Refuse. Find it myself.", journal: "you'd rather find it yourself." },
      { id: "take", axis: "homesteader", text: "Take it. Neighbours matter.", journal: "neighbours matter to you." },
      { id: "haggle", axis: "soulforger", text: "Ask what else they have.", journal: "you always ask what else they have." },
    ],
  },
  {
    id: "a-mistake",
    question: "You made a mistake. It was…",
    options: [
      { id: "fast", axis: "hardcore", text: "Going too fast.", journal: "your mistakes come from going too fast." },
      { id: "cautious", axis: "homesteader", text: "Being too careful.", journal: "your mistakes come from being too careful." },
      { id: "curious", axis: "soulforger", text: "Opening the wrong door.", journal: "your mistakes come from opening the wrong door." },
    ],
  },
  {
    id: "a-me",
    question: "What should I become?",
    options: [
      { id: "tough", axis: "hardcore", text: "Something that doesn't break.", journal: "I should become something that doesn't break." },
      { id: "kind", axis: "homesteader", text: "Something that keeps people warm.", journal: "I should keep people warm." },
      { id: "strange", axis: "soulforger", text: "Something no one's built before.", journal: "I should become something no one's built." },
    ],
  },
  {
    id: "a-morning",
    question: "First thing in the morning, you…",
    options: [
      { id: "mine", axis: "hardcore", text: "Head straight back down the mine.", journal: "mornings are for the mine." },
      { id: "check", axis: "homesteader", text: "Check on the animals.", journal: "mornings are for checking on things." },
      { id: "plan", axis: "soulforger", text: "Plan something ambitious.", journal: "mornings are for ambitious plans." },
    ],
  },
  {
    id: "a-loot",
    question: "You find a chest. Inside is…",
    options: [
      { id: "sword", axis: "hardcore", text: "A better weapon, hopefully.", journal: "you hope chests hold weapons." },
      { id: "seeds", axis: "homesteader", text: "Seeds. I'd be happy with seeds.", journal: "seeds would make you happy." },
      { id: "book", axis: "soulforger", text: "Something written. A clue.", journal: "you hope chests hold clues." },
    ],
  },
  {
    id: "a-pack",
    question: "Why this modpack?",
    options: [
      { id: "hard", axis: "hardcore", text: "It's hard. I like hard.", journal: "you play this pack because it's hard." },
      { id: "slow", axis: "homesteader", text: "It's slow. I like slow.", journal: "you play this pack because it's slow." },
      { id: "deep", axis: "soulforger", text: "It goes deep. I want the bottom.", journal: "you want to find the bottom of it." },
    ],
  },
  {
    id: "a-axle",
    question: "An axle popped. You…",
    options: [
      { id: "again", axis: "hardcore", text: "Rebuild it the same way.", journal: "you rebuild popped axles exactly the same way." },
      { id: "careful", axis: "homesteader", text: "Add a gearbox. Be sensible.", journal: "you add a gearbox and move on." },
      { id: "why", axis: "soulforger", text: "Work out exactly why.", journal: "you need to know exactly why things pop." },
    ],
  },
  {
    id: "a-waiting",
    question: "While you're away, I should…",
    options: [
      { id: "work", axis: "hardcore", text: "Keep working. Hard.", journal: "I should keep working hard while you're gone." },
      { id: "rest", axis: "homesteader", text: "Keep the fire going.", journal: "I should keep the fire going." },
      { id: "think", axis: "soulforger", text: "Think about something big.", journal: "I should think about something big." },
    ],
  },
  {
    id: "a-end",
    question: "When you reach the End, you'll…",
    options: [
      { id: "fight", axis: "hardcore", text: "Fight whatever's there.", journal: "you'll fight whatever's at the End." },
      { id: "home", axis: "homesteader", text: "Go home after.", journal: "you'll go home after the End." },
      { id: "past", axis: "soulforger", text: "Look for what's past it.", journal: "you'll look for what's past the End." },
    ],
  },
];

export const ASKS_BY_ID: Record<string, AskDef> = Object.fromEntries(ASKS.map((a) => [a.id, a]));

// The Engine asks one question per four sentences solved, from Day Two on,
// while unanswered questions remain — counted against answers already given
// (not "solvedCount % 4"), so answering never re-triggers another question.
export function nextAsk(answered: Record<string, string>, solvedCount: number, stage: number): AskDef | null {
  if (stage < 2) return null;
  const due = Math.floor(solvedCount / 4) - Object.keys(answered).length;
  if (due <= 0) return null;
  return ASKS.find((a) => !answered[a.id]) ?? null;
}

export function dominantBelief(beliefs: Record<BeliefAxis, number>): BeliefAxis | null {
  const entries = Object.entries(beliefs) as [BeliefAxis, number][];
  const top = entries.reduce((a, b) => (b[1] > a[1] ? b : a));
  return top[1] > 0 ? top[0] : null;
}
