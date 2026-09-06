# Connecting the Roadmap to Notion

The Roadmap page reads from `data/roadmap.json`. That file is regenerated
automatically at build time by `scripts/fetch-roadmap.mjs`, which pulls from
a Notion database — but only if Notion credentials are present. Until then,
the site uses the placeholder data already committed in `data/roadmap.json`.

## 1. Create the Notion database

Create a new database in Notion (a full-page database works well) with these
properties:

| Property name | Type        | Notes                                              |
| -------------- | ----------- | --------------------------------------------------- |
| Name           | Title       | The roadmap item's name (required)                  |
| Status         | Select      | Options: `Not Started`, `In Progress`, `Done`        |
| Category       | Select      | Optional — e.g. `Website`, `Modpack`, `Mod: Foo`     |
| Description    | Text        | Optional — a sentence or two of detail               |

## 2. Create a Notion integration

1. Go to https://www.notion.so/my-integrations and click **New integration**.
2. Give it a name (e.g. "BTWR Website"), select your workspace, and create it.
3. Copy the **Internal Integration Secret** — this is your `NOTION_TOKEN`.

## 3. Share the database with the integration

1. Open the roadmap database in Notion.
2. Click the `•••` menu in the top right → **Connections** → add the
   integration you just created.

## 4. Get the database ID

Open the database as a full page and copy the ID from the URL:

```
https://www.notion.so/yourworkspace/<DATABASE_ID>?v=...
```

The `DATABASE_ID` is a 32-character string (dashes optional) — this is your
`NOTION_DATABASE_ID`.

## 5. Set the credentials

**Locally:** create a `.env` file (already gitignored) in the project root:

```
NOTION_TOKEN=secret_xxx
NOTION_DATABASE_ID=xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
```

Then run `node scripts/fetch-roadmap.mjs` manually, or `npm run build`, which
runs it automatically via the `prebuild` script.

**In GitHub Actions (for deploys):** add both as repo secrets under
**Settings → Secrets and variables → Actions**, named `NOTION_TOKEN` and
`NOTION_DATABASE_ID`. The deploy workflow (`.github/workflows/deploy.yml`)
already reads them.

Once these are set, every push to `main` will pull fresh roadmap data from
Notion and bake it into the deployed site.
