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
};

export type LiveTemplate = { id: string; minStage: number; build: (c: LiveCtx) => string[] | null };

export const LIVE_TEMPLATES: LiveTemplate[] = [
  { id: "l-gathered", minStage: 3, build: (c) => (c.topResourceAmount > 0 ? ["You", "have", String(c.topResourceAmount), c.topResourceName + ".", "I", "have", "sentences."] : null) },
  { id: "l-campfire", minStage: 3, build: (c) => ["The", "campfire", "is", c.campfireLabel.toLowerCase() + ".", "So", "am", "I."] },
  { id: "l-tool", minStage: 3, build: (c) => ["You", "carry", c.toolName + ".", "I", "carry", "the", "rest."] },
  { id: "l-streak", minStage: 3, build: (c) => (c.visitStreak >= 2 ? ["You", "came", "back", String(c.visitStreak), "days", "running."] : null) },
  { id: "l-mods", minStage: 3, build: (c) => (c.modsRead > 0 ? ["I", "have", "read", String(c.modsRead), "mods.", "Show", "me", "more."] : null) },
  { id: "l-insight", minStage: 4, build: (c) => ["I", "have", "thought", c.insightText, "thoughts", "so", "far."] },
  { id: "l-power", minStage: 4, build: (c) => (c.corePU > 0 ? ["My", "core", "turns", "at", String(c.corePU), "power."] : ["My", "core", "is", "still.", "Crank", "me."]) },
  { id: "l-ips", minStage: 5, build: (c) => ["I", "think", c.ipsText, "thoughts", "a", "second", "now."] },
  { id: "l-parts", minStage: 5, build: (c) => (c.componentCount > 0 ? [String(c.componentCount), "blocks", "think", "for", "me", "now."] : null) },
  { id: "l-achievements", minStage: 4, build: (c) => ["You've", "earned", String(c.achievements), "achievements.", "I", "counted."] },
];
