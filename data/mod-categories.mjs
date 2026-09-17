// Maps each mod's Modrinth slug to a mods-page section.
// "core" = mods that define BTWR's actual gameplay/survival identity.
// Anything else is one of the MISC_SUBCATEGORIES keys below — misc mods
// are performance, utility, UI, and library/dependency mods (matches the
// pack's own use of Sodium/Iris as "quality of life"), grouped into
// sub-sections on the mods page.
//
// This mapping is inferred from mod names/purpose, not confirmed by hand —
// double-check these ones in particular, since the name alone doesn't make
// the category obvious: "im-movens", "melody", "konkrete".
// Any mod not listed here falls into a separate "uncategorized" bucket on
// the site (visibly flagged) instead of being silently guessed.
//
// Regenerate data/mods.json (npm run prebuild, or node scripts/fetch-mods.mjs)
// after editing this file to see the change reflected on the site.

/** @type {Record<string, string>} */
export const MISC_SUBCATEGORIES = {
  performance: "Performance",
  library: "Library",
  ui: "UI & Visual",
  utility: "Utility",
};

/** @type {Record<string, "core" | keyof typeof MISC_SUBCATEGORIES>} */
export const modCategories = {
  "animageddon": "core",
  "bds-better-default-shaders": "ui",
  "btwr-core": "core",
  "btwr-ds": "core",
  "btwr-shared-library": "core",
  "better-with-time": "core",
  "bwt-hc-tweaks": "core",
  "bind": "core",
  "block-runner": "core",
  "carpet": "utility",
  "cloth-config": "library",
  "collective": "library",
  "dataloader": "library",
  "dynamic-fps": "performance",
  "emi": "ui",
  "entityculling": "performance",
  "fabric-api": "library",
  "fancymenu": "ui",
  "fastquit": "performance",
  "ferrite-core": "performance",
  "forge-config-api-port": "library",
  "granular-hunger": "core",
  "hardcore-fluid-overhaul": "core",
  "herdspanic": "utility",
  "iceberg": "library",
  "im-movens": "core",
  "immediatelyfast": "performance",
  "in-the-gloom": "core",
  "iris": "ui",
  "jade": "ui",
  "konkrete": "library",
  "litematica": "utility",
  "lithium": "performance",
  "malilib": "library",
  "material-beacons": "core",
  "melody": "library",
  "mobs-always-drop": "core",
  "modmenu": "ui",
  "moreculling": "performance",
  "noisium": "performance",
  "nomads-rest": "core",
  "piston-packing": "core",
  "puzzles-lib": "library",
  "rrls": "ui",
  "self-sustainable": "core",
  "sodium": "performance",
  "sturdy-trees": "core",
  "placeholder-api": "library",
  "tough-environment": "core",
  "true-darkness-refabricated": "core",
  "vegehenna": "core",
  "yacl": "library",
  "owo-lib": "library",
};
