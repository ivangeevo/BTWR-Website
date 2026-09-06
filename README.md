# BTWR Website

Website for **BTWR (Better Than Wolves: Remastered)** — a Minecraft 1.21.1
modpack built from its creator's own mods. Community hub with a
roadmap/progress tracker, mods list, and download/install info.

## Stack

- Next.js (App Router, TypeScript, Tailwind CSS), built as a static export
- Hosted on GitHub Pages
- Roadmap data pulled from Notion at build time (see [NOTION_SETUP.md](./NOTION_SETUP.md))

## Development

```bash
npm install
npm run dev
```

Open http://localhost:3000.

## Build

```bash
npm run build
```

Outputs a static site to `out/`. Runs `scripts/fetch-roadmap.mjs` first
(via the `prebuild` script) to refresh `data/roadmap.json` from Notion, if
`NOTION_TOKEN` and `NOTION_DATABASE_ID` are set; otherwise it keeps the
existing placeholder data.

## Deploying

Pushing to `main` triggers `.github/workflows/deploy.yml`, which builds and
publishes to GitHub Pages. See the comment at the bottom of that file for
one-time repo setup (Pages source + secrets).

## Things to fill in before launch

- [ ] Replace `public/logo.svg` with the real BTWR logo
- [ ] Add the Discord invite link in `lib/site-config.ts`
- [ ] Add the GitHub repo link in `lib/site-config.ts`
- [ ] Replace placeholder entries in `data/mods.ts` with the real mod list
- [ ] Set up the Notion integration + database (see `NOTION_SETUP.md`)
- [ ] Add the real modpack download link on the Community page
