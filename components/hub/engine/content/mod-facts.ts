// Sentences the Engine builds about mods it has actually "read" on the Mods
// page — only from real fields in data/mods.json (lib/mods.ts's Mod), never
// invented descriptions. A mod's name is always a single tile.
import type { Mod } from "@/lib/mods";

const SUBCATEGORY_LABELS: Record<string, string> = {
  performance: "Performance",
  library: "Library",
  ui: "UI & Visual",
  utility: "Utility",
};

const MONTHS = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];

type Template = { id: string; build: (m: Mod) => string[] | null };

const TEMPLATES: Template[] = [
  { id: "core", build: (m) => (m.category === "core" ? [m.name, "is", "a", "Core", "mod."] : null) },
  {
    id: "sub",
    build: (m) =>
      m.category === "misc" && m.subcategory && SUBCATEGORY_LABELS[m.subcategory]
        ? [m.name, "lives", "under", SUBCATEGORY_LABELS[m.subcategory] + "."]
        : null,
  },
  { id: "version", build: (m) => (m.currentVersion ? [m.name, "runs", "version", m.currentVersion + "."] : null) },
  { id: "outdated", build: (m) => (m.isOutdated ? [m.name, "is", "behind", "its", "newest", "release."] : null) },
  { id: "current", build: (m) => (!m.isOutdated && !m.disabled ? [m.name, "is", "up", "to", "date."] : null) },
  { id: "disabled", build: (m) => (m.disabled ? [m.name, "sits", "out", "of", "the", "pack."] : null) },
  {
    id: "updated",
    build: (m) => {
      if (!m.currentVersionDate) return null;
      const d = new Date(m.currentVersionDate);
      if (Number.isNaN(d.getTime())) return null;
      return [m.name, "was", "updated", "in", `${MONTHS[d.getUTCMonth()]}`, `${d.getUTCFullYear()}.`];
    },
  },
];

export function modFactsFor(mod: Mod): { id: string; solution: string[] }[] {
  return TEMPLATES.map((t) => {
    const solution = t.build(mod);
    return solution ? { id: `mf-${t.id}-${mod.slug}`, solution } : null;
  }).filter((x): x is { id: string; solution: string[] } => x !== null);
}
