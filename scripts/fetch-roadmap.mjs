import { writeFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import path from "node:path";

const NOTION_TOKEN = process.env.NOTION_TOKEN;
const NOTION_DATABASE_ID = process.env.NOTION_DATABASE_ID;

const outputPath = path.join(
  path.dirname(fileURLToPath(import.meta.url)),
  "..",
  "data",
  "roadmap.json"
);

if (!NOTION_TOKEN || !NOTION_DATABASE_ID) {
  console.log(
    "[fetch-roadmap] NOTION_TOKEN or NOTION_DATABASE_ID not set — skipping fetch, keeping existing data/roadmap.json. See NOTION_SETUP.md."
  );
  process.exit(0);
}

const { Client } = await import("@notionhq/client");
const notion = new Client({ auth: NOTION_TOKEN });

function getTitle(property) {
  return property?.title?.[0]?.plain_text ?? "Untitled";
}

function getSelect(property) {
  return property?.select?.name ?? null;
}

function getRichText(property) {
  return property?.rich_text?.[0]?.plain_text ?? null;
}

const items = [];
let cursor = undefined;

do {
  const response = await notion.databases.query({
    database_id: NOTION_DATABASE_ID,
    start_cursor: cursor,
  });

  for (const page of response.results) {
    const props = page.properties;
    items.push({
      name: getTitle(props.Name),
      status: getSelect(props.Status) ?? "Not Started",
      category: getSelect(props.Category),
      description: getRichText(props.Description),
    });
  }

  cursor = response.has_more ? response.next_cursor : undefined;
} while (cursor);

const payload = {
  generatedAt: new Date().toISOString(),
  source: "notion",
  items,
};

await writeFile(outputPath, JSON.stringify(payload, null, 2) + "\n");
console.log(`[fetch-roadmap] Wrote ${items.length} item(s) to data/roadmap.json`);
