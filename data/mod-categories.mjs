// Maps each mod's Modrinth slug to a mods-page section: "core" or "misc".
// "core" = mods that define BTWR's actual gameplay/survival identity.
// "misc" = performance, utility, UI, and library/dependency mods (matches
//          the pack's own use of Sodium/Iris as "quality of life").
//
// This mapping is inferred from mod names/purpose, not confirmed by hand —
// double-check these ones in particular, since the name alone doesn't make
// the category obvious: "block-runner", "im-movens", "melody", "konkrete".
// Any mod not listed here falls into a separate "uncategorized" bucket on
// the site (visibly flagged) instead of being silently guessed.
//
// Regenerate data/mods.json (npm run prebuild, or node scripts/fetch-mods.mjs)
// after editing this file to see the change reflected on the site.

/** @type {Record<string, "core" | "misc">} */
export const modCategories = {
  "animageddon": "core",
  "bds-better-default-shaders": "misc",
  "btwr-core": "core",
  "btwr-ds": "core",
  "btwr-shared-library": "core",
  "better-with-time": "core",
  "bwt-hc-tweaks": "core",
  "bind": "core",
  "block-runner": "misc",
  "carpet": "misc",
  "cloth-config": "misc",
  "collective": "misc",
  "dataloader": "misc",
  "dynamic-fps": "misc",
  "emi": "misc",
  "entityculling": "misc",
  "fabric-api": "misc",
  "fancymenu": "misc",
  "fastquit": "misc",
  "ferrite-core": "misc",
  "forge-config-api-port": "misc",
  "granular-hunger": "core",
  "hardcore-fluid-overhaul": "core",
  "herdspanic": "misc",
  "iceberg": "misc",
  "im-movens": "core",
  "immediatelyfast": "misc",
  "in-the-gloom": "core",
  "iris": "misc",
  "jade": "misc",
  "konkrete": "misc",
  "litematica": "misc",
  "lithium": "misc",
  "malilib": "misc",
  "material-beacons": "core",
  "melody": "misc",
  "mobs-always-drop": "core",
  "modmenu": "misc",
  "moreculling": "misc",
  "noisium": "misc",
  "nomads-rest": "core",
  "piston-packing": "core",
  "puzzles-lib": "misc",
  "rrls": "misc",
  "self-sustainable": "core",
  "sodium": "misc",
  "sturdy-trees": "core",
  "placeholder-api": "misc",
  "tough-environment": "core",
  "true-darkness-refabricated": "core",
  "vegehenna": "core",
  "yacl": "misc",
  "owo-lib": "misc",
};
