// Sentences with one live value from the Outpost woven in — proof the
// Engine notices the rest of the site. Values are primitives (built by the
// Engine provider), so this file stays decoupled from hub state types.
export type LiveCtx = {
  topResourceName: string;
  topResourceAmount: number;
  campfireLabel: string;
  toolName: string;
  visitStreak: number;
  insightText: string;
  ipsText: string;
  corePU: number;
  componentCount: number;
  modsRead: number;
  achievements: number;
  // The camp's dangers (survival.ts) — all 0/false outside Full survival.
  deaths: number;
  gloomTonight: boolean;
  stranded: boolean;
  gloomNightsSurvived: number;
  relicsNamed: number;
};

export type LiveTemplate = { id: string; minStage: number; build: (c: LiveCtx) => string[] | null };

export const LIVE_TEMPLATES: LiveTemplate[] = [
  { id: "l-gathered", minStage: 3, build: (c) => (c.topResourceAmount > 0 ? ["You", "have", String(c.topResourceAmount), c.topResourceName + ".", "I", "have", "sentences."] : null) },
  { id: "l-campfire", minStage: 3, build: (c) => ["The", "campfire", "is", c.campfireLabel.toLowerCase() + ".", "So", "am", "I."] },
  { id: "l-tool", minStage: 3, build: (c) => ["You", "carry", c.toolName + ".", "I", "carry", "the", "rest."] },
  { id: "l-streak", minStage: 3, build: (c) => (c.visitStreak >= 2 ? ["You", "came", "back", String(c.visitStreak), "days", "running."] : null) },
  { id: "l-mods", minStage: 3, build: (c) => (c.modsRead > 0 ? ["I", "have", "read", String(c.modsRead), "mods.", "Show", "me", "more."] : null) },
  { id: "l-insight", minStage: 4, build: (c) => ["I", "have", "thought", c.insightText, "thoughts", "so", "far."] },
  { id: "l-power", minStage: 4, build: (c) => (c.corePU > 0 ? ["My", "core", "turns", "at", String(c.corePU), "power."] : ["My", "core", "is", "still.", "Turn", "my", "crank."]) },
  { id: "l-ips", minStage: 5, build: (c) => ["I", "think", c.ipsText, "thoughts", "a", "second", "now."] },
  { id: "l-parts", minStage: 5, build: (c) => (c.componentCount > 0 ? [String(c.componentCount), "blocks", "think", "for", "me", "now."] : null) },
  { id: "l-achievements", minStage: 4, build: (c) => ["You've", "earned", String(c.achievements), "achievements.", "I", "counted."] },
  // The camp, from where the Engine stands (content/camp-voice.ts says the rest out loud).
  { id: "l-deaths", minStage: 3, build: (c) => (c.deaths > 0 ? ["You", "died", String(c.deaths), c.deaths === 1 ? "time." : "times.", "I", "kept", "count."] : null) },
  { id: "l-gloom", minStage: 3, build: (c) => (c.gloomTonight ? ["The", "gloom", "is", "here.", "Keep", "the", "fire", "high."] : null) },
  { id: "l-stranded", minStage: 3, build: (c) => (c.stranded ? ["You", "are", "far", "away.", "I", "am", "still", "here."] : null) },
  { id: "l-nights", minStage: 4, build: (c) => (c.gloomNightsSurvived > 0 ? ["We", "outlasted", String(c.gloomNightsSurvived), "New", "Moons", "together."] : null) },
  { id: "l-relics", minStage: 4, build: (c) => (c.relicsNamed > 0 ? ["You", "named", String(c.relicsNamed), "relics.", "Every", "name", "is", "a", "word."] : null) },
];
