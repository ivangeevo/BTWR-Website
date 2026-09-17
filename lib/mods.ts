export type Mod = {
  projectId: string;
  slug: string;
  name: string;
  iconUrl: string | null;
  modrinthUrl: string;
  category: "core" | "misc" | "uncategorized";
  subcategory: string | null;
  disabled: boolean;
  currentVersion: string;
  currentVersionDate: string | null;
  newestVersion: string;
  newestVersionDate: string | null;
  newestMatchesTarget: boolean;
  isOutdated: boolean;
  changelog: string | null;
};

export type PackRelease = {
  versionNumber: string;
  datePublished: string;
  changelog: string | null;
};

export type ModChangelogEntry = {
  mod: Mod;
  version: string;
  date: string;
  changelog: string;
};

// Feeds the "Mods" mode of the homepage patch notes panel: the most
// recent version-note entries across all mods, newest first. This is what
// changed in each mod's currently-pinned version, not a diff since the
// mod's *previous* pinned version.
export function buildModChangelogFeed(mods: Mod[], limit = 15): ModChangelogEntry[] {
  return mods
    .filter((mod): mod is Mod & { changelog: string; currentVersionDate: string } =>
      Boolean(mod.changelog && mod.currentVersionDate)
    )
    .map((mod) => ({
      mod,
      version: mod.currentVersion,
      date: mod.currentVersionDate,
      changelog: mod.changelog,
    }))
    .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
    .slice(0, limit);
}
