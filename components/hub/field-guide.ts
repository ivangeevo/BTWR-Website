// The Field Guide: every pack mod a relic (relics.ts) can be, grouped the
// way the Mods page groups them. A mod is catalogued once a relic of it has
// been named right (HubState.tier2.modsGuessedCorrect). Finishing a group
// earns a small permanent perk out at camp, applied by the provider
// (AchievementsProvider.tsx) beside Legacy's own bonuses. Shown in the
// Progress tab (FieldGuide.tsx).
import type { Mod } from "@/lib/mods";
import { MISC_SUBCATEGORIES } from "@/data/mod-categories.mjs";
import { relicPool } from "./relics";

export type FieldGuideGroupId = "core" | "performance" | "library" | "ui" | "utility" | "other";

export type FieldGuidePerk = {
  /** What it does, for the Guide's section header. */
  text: string;
  woodBonus?: number;
  foodBonus?: number;
  stoneBonus?: number;
  /** Multiplies the gathering rest timer. */
  cooldownMult?: number;
  /** Added to the relic drop chance. */
  relicChanceBonus?: number;
};

export const FIELD_GUIDE_PERKS: Partial<Record<FieldGuideGroupId, FieldGuidePerk>> = {
  core: { text: "+1 Food per hunt", foodBonus: 1 },
  utility: { text: "+1 Wood per chop", woodBonus: 1 },
  library: { text: "+1 Stone whenever a dig finds Stone", stoneBonus: 1 },
  performance: { text: "Gathering rests 10% shorter", cooldownMult: 0.9 },
  ui: { text: "Relics turn up more often", relicChanceBonus: 0.05 },
};

export type FieldGuideGroup = { id: FieldGuideGroupId; label: string; mods: Mod[] };

const GROUP_ORDER: FieldGuideGroupId[] = ["core", "performance", "library", "ui", "utility", "other"];

function groupOf(mod: Mod): FieldGuideGroupId {
  if (mod.category === "core") return "core";
  if (mod.category === "misc" && mod.subcategory && mod.subcategory in MISC_SUBCATEGORIES) {
    return mod.subcategory as FieldGuideGroupId;
  }
  return "other";
}

function labelOf(id: FieldGuideGroupId): string {
  if (id === "core") return "Core";
  if (id === "other") return "Other";
  return (MISC_SUBCATEGORIES as Record<string, string>)[id] ?? id;
}

/** The Guide's sections, in the Mods page's order, empty ones left out. */
export function fieldGuideGroups(mods: readonly Mod[]): FieldGuideGroup[] {
  const pool = relicPool(mods);
  return GROUP_ORDER.map((id) => ({
    id,
    label: labelOf(id),
    mods: pool.filter((m) => groupOf(m) === id).sort((a, b) => a.name.localeCompare(b.name)),
  })).filter((g) => g.mods.length > 0);
}

export function completedGroups(mods: readonly Mod[], catalogued: readonly string[]): FieldGuideGroupId[] {
  const known = new Set(catalogued);
  return fieldGuideGroups(mods)
    .filter((g) => g.mods.every((m) => known.has(m.projectId)))
    .map((g) => g.id);
}

export type FieldGuideBonuses = {
  woodBonus: number;
  foodBonus: number;
  stoneBonus: number;
  cooldownMult: number;
  relicChanceBonus: number;
};

export const NO_FIELD_GUIDE_BONUSES: FieldGuideBonuses = {
  woodBonus: 0,
  foodBonus: 0,
  stoneBonus: 0,
  cooldownMult: 1,
  relicChanceBonus: 0,
};

/** Every finished group's perk, added up. */
export function fieldGuideBonuses(done: readonly FieldGuideGroupId[]): FieldGuideBonuses {
  const out = { ...NO_FIELD_GUIDE_BONUSES };
  for (const id of done) {
    const p = FIELD_GUIDE_PERKS[id];
    if (!p) continue;
    out.woodBonus += p.woodBonus ?? 0;
    out.foodBonus += p.foodBonus ?? 0;
    out.stoneBonus += p.stoneBonus ?? 0;
    out.cooldownMult *= p.cooldownMult ?? 1;
    out.relicChanceBonus += p.relicChanceBonus ?? 0;
  }
  return out;
}

/** How much of the Guide is filled in: catalogued mods that still exist, out of every mod a relic can be. */
export function fieldGuideProgress(mods: readonly Mod[], catalogued: readonly string[]): { have: number; total: number } {
  const pool = relicPool(mods);
  const known = new Set(catalogued);
  return { have: pool.filter((m) => known.has(m.projectId)).length, total: pool.length };
}
