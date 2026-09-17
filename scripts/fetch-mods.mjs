import { writeFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import path from "node:path";
import AdmZip from "adm-zip";
import { modCategories, MISC_SUBCATEGORIES } from "../data/mod-categories.mjs";

const MODRINTH_API = "https://api.modrinth.com/v2";
const PACK_SLUG = "btw-remastered";
const CONCURRENCY = 5;

const outputPath = path.join(
  path.dirname(fileURLToPath(import.meta.url)),
  "..",
  "data",
  "mods.json"
);

async function fetchJson(url) {
  const res = await fetch(url, {
    headers: { "User-Agent": "BTWR-Website/1.0 (build script)" },
  });
  if (!res.ok) {
    throw new Error(`${res.status} ${res.statusText} for ${url}`);
  }
  return res.json();
}

async function mapWithConcurrency(items, limit, fn) {
  const results = new Array(items.length);
  let next = 0;
  async function worker() {
    while (next < items.length) {
      const i = next++;
      results[i] = await fn(items[i], i);
    }
  }
  await Promise.all(Array.from({ length: limit }, worker));
  return results;
}

function newestByDate(versions) {
  return versions.reduce((best, v) =>
    !best || new Date(v.date_published) > new Date(best.date_published)
      ? v
      : best
  , null);
}

async function main() {
  const versions = await fetchJson(
    `${MODRINTH_API}/project/${PACK_SLUG}/version`
  );
  const packVersion = newestByDate(versions);
  if (!packVersion) throw new Error("No published pack versions found");

  // Real release history for the homepage's "Modpack" patch notes mode —
  // reuses the version list already fetched above, no extra API call.
  const packReleases = [...versions]
    .sort((a, b) => new Date(b.date_published) - new Date(a.date_published))
    .slice(0, 10)
    .map((v) => ({
      versionNumber: v.version_number,
      datePublished: v.date_published,
      changelog: v.changelog ?? null,
    }));

  const mrpackFile = packVersion.files.find((f) => f.primary) ?? packVersion.files[0];
  const mrpackRes = await fetch(mrpackFile.url);
  if (!mrpackRes.ok) {
    throw new Error(`Failed to download .mrpack: ${mrpackRes.status}`);
  }
  const mrpackBuffer = Buffer.from(await mrpackRes.arrayBuffer());
  const zip = new AdmZip(mrpackBuffer);
  const indexEntry = zip.getEntry("modrinth.index.json");
  if (!indexEntry) throw new Error("modrinth.index.json not found in .mrpack");
  const index = JSON.parse(zip.readAsText(indexEntry));

  const targetLoader = Object.keys(index.dependencies ?? {}).includes(
    "fabric-loader"
  )
    ? "fabric"
    : "forge";
  const targetGameVersion = index.dependencies?.minecraft ?? null;

  const entries = index.files.map((f) => {
    const url = f.downloads[0];
    const match = url.match(/\/data\/([^/]+)\/versions\/([^/]+)\//);
    if (!match) throw new Error(`Unrecognized download URL shape: ${url}`);
    return {
      projectId: match[1],
      pinnedVersionId: match[2],
      disabled: f.path.endsWith(".disabled"),
    };
  });

  const projectIds = [...new Set(entries.map((e) => e.projectId))];
  const pinnedVersionIds = [...new Set(entries.map((e) => e.pinnedVersionId))];

  const projects = await fetchJson(
    `${MODRINTH_API}/projects?ids=${encodeURIComponent(
      JSON.stringify(projectIds)
    )}`
  );
  const projectsById = Object.fromEntries(projects.map((p) => [p.id, p]));

  const pinnedVersions = await fetchJson(
    `${MODRINTH_API}/versions?ids=${encodeURIComponent(
      JSON.stringify(pinnedVersionIds)
    )}`
  );
  const pinnedVersionsById = Object.fromEntries(
    pinnedVersions.map((v) => [v.id, v])
  );

  const newestByProjectId = {};
  await mapWithConcurrency(projectIds, CONCURRENCY, async (projectId) => {
    const filterQuery =
      `loaders=${encodeURIComponent(JSON.stringify([targetLoader]))}` +
      (targetGameVersion
        ? `&game_versions=${encodeURIComponent(
            JSON.stringify([targetGameVersion])
          )}`
        : "");
    let matched = await fetchJson(
      `${MODRINTH_API}/project/${projectId}/version?${filterQuery}`
    );
    let matchesTarget = true;
    if (matched.length === 0) {
      matched = await fetchJson(`${MODRINTH_API}/project/${projectId}/version`);
      matchesTarget = false;
    }
    const newest = newestByDate(matched);
    newestByProjectId[projectId] = { newest, matchesTarget };
  });

  const mods = entries.map((entry) => {
    const project = projectsById[entry.projectId];
    const pinned = pinnedVersionsById[entry.pinnedVersionId];
    const { newest, matchesTarget } = newestByProjectId[entry.projectId];
    const mapped = modCategories[project.slug];
    const category = mapped === undefined ? "uncategorized" : mapped === "core" ? "core" : "misc";
    const subcategory =
      category === "misc" && MISC_SUBCATEGORIES[mapped] ? mapped : null;

    return {
      projectId: entry.projectId,
      slug: project.slug,
      name: project.title,
      iconUrl: project.icon_url ?? null,
      modrinthUrl: `https://modrinth.com/mod/${project.slug}`,
      category,
      subcategory,
      disabled: entry.disabled,
      currentVersion: pinned?.version_number ?? "unknown",
      currentVersionDate: pinned?.date_published ?? null,
      newestVersion: newest?.version_number ?? "unknown",
      newestVersionDate: newest?.date_published ?? null,
      newestMatchesTarget: matchesTarget,
      isOutdated: Boolean(
        pinned && newest && pinned.id !== newest.id
      ),
      changelog: pinned?.changelog ?? null,
    };
  });

  mods.sort((a, b) => a.name.localeCompare(b.name));

  const payload = {
    generatedAt: new Date().toISOString(),
    packVersion: packVersion.version_number,
    packReleases,
    mrpackUrl: mrpackFile.url,
    targetLoader,
    targetGameVersion,
    mods,
  };

  await writeFile(outputPath, JSON.stringify(payload, null, 2) + "\n");
  console.log(`[fetch-mods] Wrote ${mods.length} mod(s) to data/mods.json`);
}

main().catch((err) => {
  console.warn(
    `[fetch-mods] Failed to fetch mod data (${err.message}) — keeping existing data/mods.json.`
  );
});
