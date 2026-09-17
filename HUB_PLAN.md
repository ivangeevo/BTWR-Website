# Homepage "Outpost" Hub — Achievements, Mod-of-the-Day, Patch Notes, Quiz

## Context

The homepage currently goes straight from the hero into dry stat counters and
link cards — there's no reason for a fan to come back day-to-day. The user
wants a new section directly below the hero that acts as a small, personal
"hangout spot": a single grand pane (not four disconnected widgets) that
happens to contain four things — Minecraft-style advancement toasts, a
mod-of-the-day spotlight, auto-generated patch notes (with a mode switch),
and a "guess the mod" quiz — all tied together by one shared, per-visitor
progress system (localStorage-backed, since this is a static export with no
backend). A hidden easter egg (an arrow-key gesture — never called "Konami"
anywhere in code/UI/commits, to sidestep any trademark association — plus a
second, click-based secret) rewards the most engaged visitors.

This is the site's first feature needing real shared client state across
sibling components, so it's also the first use of React Context in this
codebase — scoped tightly to just this new pane, not the whole app.

## Section concept

Insert one new themed block in `app/page.tsx`, between the hero
(`app/page.tsx:32-69`) and the existing stats `Reveal` (`app/page.tsx:71-110`).
Title: **"The Outpost"**, subhead: *"Your basecamp for BTWR — spotlights,
secrets, and a quiz that remembers you."* (placeholder copy, easy to tweak
later, not blocking).

Layout: one dark `bg-chrome-dark` banner (visually continues the hero) with
the headline + a small HUD strip showing unlocked-achievement count (e.g.
"7/10", using the existing `CountUp` component) — the HUD renders nothing
until mounted rather than flashing "0/10" then jumping. Below the banner, an
asymmetric two-column body on `sm:` breakpoints and up (stacked on mobile):
left column = Mod-of-the-Day (compact) stacked above the Achievement Gallery;
right column = Patch Notes above Guess-the-Mod (both naturally taller). The
whole block is wrapped in the existing `<Reveal>` scroll-in wrapper, matching
the rest of the homepage.

## New files

```
lib/mods.ts                        # shared Mod + PackRelease types, buildModChangelogFeed()
components/hub/HubSection.tsx      # banner/HUD + Reveal + AchievementsProvider + 2-col layout
components/hub/AchievementsProvider.tsx  # Context: state load/save, unlock(), toasts, secret listeners
components/hub/achievements-catalog.ts   # static achievement defs (10 total, 2 marked secret)
components/hub/hub-storage.ts      # HubState type, STORAGE_KEY, defaultState(), load/save, pickModOfDay()
components/hub/AchievementToastStack.tsx # floating "Advancement Get!"-style toast stack
components/hub/AchievementGallery.tsx    # HUD badge + expandable list (reuses category-panel technique)
components/hub/ModOfTheDay.tsx     # spotlight card, mount-gated date-seeded pick
components/hub/PatchNotes.tsx      # Modpack/Mods mode toggle + expand/collapse
components/hub/GuessTheMod.tsx     # quiz UI/logic
```

`components/Header.tsx` gets one small additive edit (second easter egg, see
below) — the only file outside `components/hub/` + `app/page.tsx` that's
touched for the feature itself.

## Storage & Context design

Single localStorage key, versioned: **`btwr:hub:v1`** (separate namespace
from the existing bare `"theme"` key). Parse failure or missing key = fresh
default state, no migration logic needed pre-v1.

```ts
type AchievementId =
  | "first-visit" | "mod-of-day-viewed"
  | "quiz-first-correct" | "quiz-perfect-round" | "quiz-streak-5"
  | "patch-notes-opened" | "patch-notes-mode-switched"
  | "streak-3-day"
  | "secret-sequence" | "secret-logo-clicks";   // secret: true in catalog

type HubState = {
  version: 1;
  unlocked: Partial<Record<AchievementId, string>>; // id -> ISO unlock time
  quiz: { bestScore: number; bestStreak: number; currentStreak: number;
          totalAnswered: number; totalCorrect: number };
  modOfDay: { lastSeenDate: string | null };        // yyyy-mm-dd (UTC)
  patchNotes: { openedOnce: boolean; modeSwitchedOnce: boolean };
  visits: { firstVisitAt: string | null; lastVisitDate: string | null; streakDays: number };
};
```

`AchievementsProvider` (`"use client"`, wraps only `HubSection`'s children —
confirmed via codebase search that zero `createContext` calls exist anywhere
today, so this is deliberately the first and only one, scoped to this pane):

- **Mount-then-load pattern** (not the pre-hydration inline-script trick
  `app/layout.tsx` uses for theme): initial render = `defaultState()`
  (nothing unlocked, no toasts) on both server and client, so no
  hydration-mismatch risk. A `useEffect` on mount reads+parses
  `localStorage`, computes the day-streak (compare `visits.lastVisitDate` to
  today-UTC: same day → no-op, exactly one day later → `streakDays++`, bigger
  gap → reset to 1), fires `unlock("first-visit")` and, if applicable,
  `unlock("streak-3-day")`, persists, and updates state. This is the right
  call here (unlike theme) because a badge count or toast appearing one
  frame after mount has no visible flash — default state is a legitimate
  first paint, not a wrong one.
- Exposes `{ unlocked: Set<AchievementId>, unlock(id), toasts,
  dismissToast(instanceId), quiz, updateQuiz(...), patchNotes,
  markPatchNotesOpened(), markPatchNotesModeSwitched() }`.
- `unlock(id)` is **idempotent**: no-op if already unlocked, otherwise
  stamps a timestamp, persists, and pushes a toast. Every consumer
  (`GuessTheMod`, `PatchNotes`, `ModOfTheDay`) calls `unlock()`
  unconditionally on every qualifying event — the provider is the single
  source of truth for de-dupe, so the four feature components stay fully
  decoupled from each other.
- Also owns both easter-egg listeners (kept here rather than separate files
  to keep the file count tight) — see below.

## Feature 1 — Advancement toasts (`AchievementToastStack.tsx`)

- Fixed stack, `fixed top-4 right-4 z-50 flex flex-col gap-2`, mirroring
  Minecraft's own top-right placement. Renders `provider.toasts`
  (`{instanceId, achievementId}`), looked up against `achievements-catalog.ts`
  for title/description/icon (emoji-based, no new asset pipeline).
- New CSS in `app/globals.css`: `.hub-toast` + `@keyframes hub-toast-in` /
  `hub-toast-out` (slide+fade), styled with the existing
  `--color-chrome-dark`/`--color-glow` tokens — a genuinely new visual motif,
  so new CSS is warranted rather than repurposing `.card-glow`.
- Auto-dismiss after ~5s (`setTimeout`) or on click. The animation is plain
  CSS, so the file's existing global `prefers-reduced-motion` block already
  neutralizes it — no manual JS check needed.
- `role="status" aria-live="polite"` on the stack container.

## Feature 2 — Mod-of-the-day (`ModOfTheDay.tsx`)

- `pickModOfDay(mods, dateStr)` in `hub-storage.ts`: simple string hash
  (FNV-1a) of the UTC date string (`new Date().toISOString().slice(0,10)`)
  modulo the count of non-disabled mods — same seed ⇒ same mod for every
  visitor that day, zero backend.
- Computed in a mount-gated `useEffect`/state, never during SSR render —
  avoids a real hydration-mismatch risk specific to this feature (the static
  export's prerendered HTML reflects whenever the daily/on-push CI build
  ran, which can disagree with a visitor's actual "today" right around
  midnight or during a stale-build window). Renders a lightweight skeleton
  card until mounted, then swaps in the real pick.
- Card: icon (`<Image unoptimized>`, same pattern as `app/mods/page.tsx`),
  name, category/subcategory badge, Modrinth link, one line of framing text
  from a small static per-category template pool (2-3 templates for
  `core` vs `misc`), chosen by the same date seed.
- Fires `unlock("mod-of-day-viewed")` on first successful render (novelty
  unlock, not re-gated per day).

## Feature 3 — Patch notes with mode switch (`PatchNotes.tsx`)

- Segmented control, **Modpack** (default) / **Mods**, `aria-pressed` on
  each button.
- **Modpack mode**: renders the new `data/mods.json` field `packReleases`
  (newest-first) — version, date, and real changelog text from Modrinth as
  `whitespace-pre-wrap` plain text (MVP — no markdown renderer dependency).
- **Mods mode**: renders `buildModChangelogFeed(mods)` from `lib/mods.ts` —
  filters mods with non-null `changelog`, maps to
  `{mod, version, date, changelog}`, sorts by date desc, caps to the most
  recent **15** entries (53 mods is too much to dump unfiltered), each
  labeled "Latest version notes" (it's what's in that pinned version, not a
  diff since the prior pinned version — important not to over-promise).
- Expand/collapse **reuses the exact `app/mods/page.tsx` `ModSection`
  recipe**: `useIsomorphicLayoutEffect` fallback
  (`typeof window !== "undefined" ? useLayoutEffect : useEffect`),
  `contentRef.scrollHeight` measured into `naturalHeight`, `.category-panel`
  class driving the `max-height` transition, same peek/open/closed states.
  Re-measure must depend on `mode` too (not just item count), since
  switching modes changes content height while open.
- `unlock("patch-notes-opened")` on first expand-to-open;
  `unlock("patch-notes-mode-switched")` on first mode change.

## Feature 4 — Guess-the-mod quiz (`GuessTheMod.tsx`)

- Pool: `mods.filter(m => m.iconUrl && !m.disabled)`.
- Per round: pick a random correct mod (skip immediate repeat of the prior
  pick), sample 3 distinct wrong options, shuffle final 4 choices. All
  question generation happens in a mount-gated effect/state (never during
  SSR render) — skeleton shown until mounted.
- **Blur is pure CSS, no image pipeline**: `<Image unoptimized>` inside an
  `overflow-hidden` container with inline `filter: blur(6px); transform:
  scale(1.4)` (scaled up so blurred edges/transparency don't leak a shape
  hint). On answer, remove blur/scale to reveal the icon as feedback.
- Options are 4 real `<button>` elements showing mod **names only** (not
  icons, to avoid tipping the answer).
- A "round" = 5 questions (tracked in local, non-persisted component state).
  Persisted stats (`quiz.bestScore/bestStreak/currentStreak/totalAnswered/
  totalCorrect`) live in `HubState`, updated through a `updateQuiz()` context
  helper. Perfect round (5/5) → `unlock("quiz-perfect-round")`.
- `unlock("quiz-first-correct")` on any correct answer (idempotent → only
  meaningfully fires once). `unlock("quiz-streak-5")` checked at the moment
  `currentStreak` hits 5.
- Auto-advance next question after ~1.2s (`setTimeout`); feedback color swap
  via a plain Tailwind `transition-opacity` class — already covered by the
  global reduced-motion CSS block, no manual check needed (this is a
  `setTimeout` + CSS transition, not a rAF/interval-driven animation loop
  like `HeroSlideshow`/`CountUp`, which is the category that needs the
  manual `matchMedia` check).

## Feature 5 — Easter eggs (never named "Konami" anywhere)

**"An Old Cheat" — arrow-key gesture.** Handled inside
`AchievementsProvider`'s mount effect: a `keydown` listener keeps a rolling
buffer of the last N keys, compared against a `SECRET_SEQUENCE` constant
(named and commented generically — "a classic arrow-key input gesture",
never "Konami"). Full match → `unlock("secret-sequence")`, buffer resets.
Listener attaches/detaches with the provider's mount/unmount, so it's only
live while the Outpost pane is mounted.

**"It Followed You Home" — logo clicks.** The header wolf logo lives in
`components/Header.tsx`, outside the pane's Context subtree (Header is a
sibling of `HubSection`, both under `app/layout.tsx`). Add a small `onClick`
on the existing logo `Link`: track click timestamps in a ref, and once 5
clicks land within a 2s rolling window, `window.dispatchEvent(new
Event("btwr-secret-logo"))` — no localStorage access in `Header.tsx` itself,
avoiding any double-write race. `AchievementsProvider` adds a matching
`window.addEventListener("btwr-secret-logo", ...)` in its mount effect,
calling `unlock("secret-logo-clicks")`. The egg is only "live" while the
Outpost pane is mounted (i.e. on the homepage); clicking the logo elsewhere
just navigates normally as today.

Both are marked `secret: true` in `achievements-catalog.ts`, so
`AchievementGallery` renders them as a "???" silhouette entry until unlocked.

## Achievement catalog (10 total, 2 secret)

| id | title | unlocked by |
|---|---|---|
| `first-visit` | Welcome to the Outpost | Loading the Outpost pane for the first time |
| `mod-of-day-viewed` | Spotlight's On | Viewing the mod of the day |
| `quiz-first-correct` | Good Eye | First correct quiz guess |
| `quiz-perfect-round` | Mod Whisperer | A perfect 5/5 quiz round |
| `quiz-streak-5` | On a Roll | 5 correct guesses in a row |
| `patch-notes-opened` | Reading the Fine Print | Opening patch notes |
| `patch-notes-mode-switched` | Behind the Curtain | Switching Modpack ↔ Mods mode |
| `streak-3-day` | Regular | Visiting 3 days in a row |
| `secret-sequence` (secret) | An Old Cheat | The arrow-key gesture |
| `secret-logo-clicks` (secret) | It Followed You Home | Clicking the header logo 5× quickly |

## `scripts/fetch-mods.mjs` changes

1. Per-mod mapped object (currently `scripts/fetch-mods.mjs:134-151`) — add:
   ```js
   changelog: pinned?.changelog ?? null,
   ```
   No new API call: `pinnedVersions` already comes from the existing bulk
   `${MODRINTH_API}/versions?ids=[...]` fetch (lines 95-99), whose response
   objects already include `changelog`, currently just unread.

2. Right after `packVersion` is validated (lines 53-54), derive
   `packReleases` from the already-fetched pack `versions` array (lines
   50-52 — no new fetch):
   ```js
   const packReleases = [...versions]
     .sort((a, b) => new Date(b.date_published) - new Date(a.date_published))
     .slice(0, 10)
     .map((v) => ({
       versionNumber: v.version_number,
       datePublished: v.date_published,
       changelog: v.changelog ?? null,
     }));
   ```

3. Add `packReleases,` to `payload` (lines 156-163), alongside the existing
   `packVersion: packVersion.version_number,`.

4. No dependency changes; the new logic stays inside the existing `try`
   path, so `main().catch(...)`'s current all-or-nothing fallback behavior
   (lines 169-173) is unaffected.

5. **After implementation**, run `node scripts/fetch-mods.mjs` once locally
   (network-dependent, hits the live Modrinth API) to regenerate
   `data/mods.json` with the new fields — same one-time-regen precedent as
   the earlier `data/mod-categories.mjs` change in this project's history.
   No CI/workflow change needed: `npm run build`'s `prebuild` step already
   re-runs this script on every push and the existing daily cron.

## Shared type extraction — `lib/mods.ts`

`Mod` is currently hand-declared only in `app/mods/page.tsx:9-24`. Since the
schema is growing (`changelog`) and a second consumer
(`components/hub/*`) now needs it, extract it: `lib/mods.ts` exports `Mod`
(extended with `changelog: string | null`), `PackRelease`
(`{versionNumber, datePublished, changelog}`), and
`buildModChangelogFeed(mods: Mod[])`. Update `app/mods/page.tsx` to import
`Mod` from `lib/mods.ts` instead of redeclaring it (small, low-risk cleanup
now that a second consumer exists).

## Verification

1. `npx eslint <changed files>` — must pass.
2. `npx tsc --noEmit` — full project type-check.
3. `node scripts/fetch-mods.mjs` — regenerate `data/mods.json` with
   `changelog`/`packReleases` (requires outbound network).
4. `npx next build` — full static export; confirms no server-only API
   usage, no localStorage access during render, no hydration-mismatch
   warnings from the mount-then-load components.
5. Headless-browser smoke check (same approach used earlier this session):
   serve `out/` and drive a short Playwright script against the homepage —
   confirm the Outpost pane renders between hero and stats, mod-of-the-day
   shows a real mod name, patch-notes mode switch changes content, a quiz
   answer + reload round-trips through localStorage, the arrow-key sequence
   and 5× logo-click both fire their toasts, and nothing breaks under
   `page.emulateMedia({ reducedMotion: "reduce" })`.
6. A11y spot-check: toast stack `role="status" aria-live="polite"`; quiz
   options are real buttons; patch-notes toggle uses `aria-pressed`.

## Tunable defaults chosen (not blocking, easy to revisit)

- Quiz round size: 5 questions.
- Mods-mode patch notes feed cap: 15 entries.
- Modpack-mode release history cap: 10 releases.
- Toast auto-dismiss: ~5s.
- Secret logo-click threshold: 5 clicks within 2s.
