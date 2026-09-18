# Outpost Tier 2 — Plan (built)

Status: **implemented and verified.** All achievements, tier gating, XP
system, and the tier-2 visual overhaul described below are live in the
codebase. Kept as a reference for the design rationale — see the git history
for the actual implementation commit(s).

## Tier 1 (12 achievements, unchanged except)

- Move `streak-3-day` ("Regular") OUT of tier 1, into tier 2 (upgraded to a
  7-day version there — see below).
- Add one new easy tier-1 achievement to keep the count at 12:
  - **Making Yourself at Home** 🪑 — "Spent 30 seconds looking around the
    Outpost." (mount-timer based, trivially easy — the short bookend to
    Eternal Vigil's 50 minutes)

Reaching all 12 tier-1 achievements triggers the Tier 2 reveal. Tier 2's
existence is itself a secret — not mentioned/visible anywhere while still in
tier 1.

## Tier 2 — 13 achievements total (12 new + 1 moved), harder than tier 1

| Title | Icon | Unlock condition | Visibility |
|---|---|---|---|
| Millstone Grind | ⚙️ | Answer 50 quiz questions total (lifetime) | visible |
| Perfect Alloy | 🧪 | 3 perfect Guess-the-Mod rounds (not just 1) | visible |
| No Compass Needed | 🧭 | 10-correct streak in Guess the Mod (doubles tier 1's 5) | visible |
| Bellows & Crucible | 🔥 | Switch Patch Notes mode 5 times in one visit | visible |
| Broody Hen | 🐔 | Visit 7 days in a row (upgraded from moved `streak-3-day`) | visible |
| Hand-Cranked | 🔧 | Flip the theme toggle 15 times in one visit | secret |
| Hopper Chain | 📦 | Unlock 5 achievements in a single visit | secret |
| Windmill Watcher | 🌬️ | Resize the browser window 10 times | secret |
| Rope & Grapple | 🪝 | Scroll clear from top of homepage to bottom | secret |
| Hardcore Darkness | 🌑 | Find the Outpost between midnight–5AM, dark mode on | secret |
| Soul Urn | 🏺 | Unlock both tier-1 secrets (Old Cheat + logo egg) | secret |
| Master Smith | ⚒️ | Unlock every other tier-2 achievement (capstone) | secret |

Plus, auto-granted the instant tier 2 unlocks (not one of the 12 above):
- **Community Edition** 🛠️ — *"Put the work in."* (exact wording, per request
  — nod to BTW Community Edition)

Total site-wide: 12 (tier 1) + 13 (tier 2) = **25 achievements**, plus the
tier-2-unlock trigger itself (all 12 tier-1 done) = 26 tracked unlock events.

## Visual requirement

Tier 2 must look **significantly, visibly upgraded** — not the same HUD with
an XP bar bolted on. User's words: "Tier 2 needs to visually look upgraded.
Pump it." Exact visual direction (new color treatment, extra panel framing,
richer HUD chrome) is **not yet designed** — needs a dedicated design pass
before implementation, probably its own round of questions/options given how
much the base Outpost redesign already went through earlier this session.

Reveal moment (crossing the tier-1 finish line) should be a distinct
one-off "wow" transformation, not just a normal achievement toast — exact
choreography also not yet designed.

## XP system — decisions locked in

- **Open-ended / infinite** — no level cap, keeps climbing forever.
- **Weighted**: the 5 secret tier-2 achievements grant more XP than the 7
  visible ones (harder-to-find = bigger reward).
- **Fully contained inside the Outpost panel** — never surfaced in the
  header/nav or anywhere else on the site.

### Payoffs (confirmed set — all of these, layered across the level curve)

1. **Rank titles** — Level N + a title on the badge, upgrading every few
   levels. Since XP is infinite, this is what keeps climbing meaningful
   after other reward types taper off.
2. **Outpost visual skins** — specific level thresholds unlock alternate
   accent colors/HUD skins for the Outpost panel; player picks between
   unlocked ones.
3. **Bonus content** — specific level thresholds unlock extra stuff (exact
   content TBD — candidates: deeper patch-note history, a hidden
   lore/dev-commentary blurb).
4. **Collectible flair badges** — small BTW-tool-themed icon badges
   (millstone, hopper, crucible, etc.) earned at level milestones, shown as
   a collection strip next to the rank title. Distinct from achievements
   (event-based) — these are purely level-based.
5. **Personal stats logbook** — a dedicated expandable panel (reusing the
   achievement-gallery peek/open/closed recipe) unlocked at a level
   threshold, showing lifetime stats: total visits, quiz questions
   answered, longest streak, time spent.
6. **BTW lore snippets** — each level-up reveals a short flavor-text entry
   (mini world-building trivia / dev-commentary) that accumulates into a
   readable in-Outpost log over time.
7. **Prestige system** — after reaching a very high level, the player can
   "prestige": reset their level for a permanent veteran marker/badge and
   start climbing again. Gives infinite XP a long-term loop instead of
   diminishing-returns pure climbing.

**Explicitly declined**: quiz difficulty tiers (more choices / obscure-only
pool / timed mode) and progressive achievement reveals (gating which tier-2
achievements are visible by XP level) were both offered and NOT selected —
do not build these.

## Still needs deciding before implementation

- Concrete level curve: XP-per-achievement values (visible vs. secret
  weighting), XP-per-level formula for an infinite curve (e.g. linear vs.
  increasing cost per level).
- Exact milestone table: which specific levels unlock which skin / bonus
  content / logbook / prestige threshold.
- Tier 2's actual visual redesign (colors, layout, chrome) — needs its own
  design pass.
- Reveal-moment choreography (the "wow" transformation sequence).
- Skin options (how many, what they look like), bonus content specifics,
  lore snippet copy (how many entries, what they say), stats logbook exact
  fields, prestige badge design.

## Implementation notes for later (from earlier architecture discussion)

- New tracking needed for several tier-2 unlock conditions, following the
  same decoupled `window.dispatchEvent` pattern already used for the logo
  click and snow-pile eggs (component outside `AchievementsProvider`
  dispatches a custom event; the provider listens in its mount effect):
  - Theme toggle click count (`ThemeToggle.tsx`)
  - Window resize count
  - Scroll-to-bottom-of-homepage detection
  - Patch-notes mode-switch count ≥5 (tier 1 already has a `switchMode`
    handler in `PatchNotes.tsx` firing on first switch — extend to count)
  - Quiz total-answered ≥50, streak ≥10, perfect-rounds ≥3 (extend
    `QuizStats` in `hub-storage.ts` with a `perfectRounds` counter; streak
    fields already exist)
  - 7-day streak (extend `applyVisit()`'s existing `streakDays` logic —
    already tracked, just need a ≥7 check instead of ≥3)
  - Midnight–5AM + dark-mode check: `new Date().getHours()` + reading the
    theme (`data-theme` attribute) at Outpost mount time
  - Meta checks (Soul Urn, Hopper Chain, Master Smith): read from
    `unlocked` set size/contents, no new tracking needed
- `HubState` (`hub-storage.ts`) will need new fields: a `tier` field (or
  derive tier from `unlocked` count), an `xp` counter, and storage for
  whichever skin/prestige state gets chosen once those are designed.
- `achievements-catalog.ts` needs a `tier: 1 | 2` field added to
  `AchievementDef`, and the gallery (`AchievementGallery.tsx`) needs to
  hide tier-2 entries entirely until tier 2 unlocks (not just show them as
  "???" — they shouldn't be listed at all pre-reveal).

## Status

Built. Numbers actually used (differ slightly from earlier open questions,
decided during implementation):

- Level curve: cumulative XP for level L = `50 * (L-1)^2`.
- XP: visible tier-2 achievements 100 XP, secret ones 200 XP,
  Community Edition 300 XP. Repeatable: +5 XP per correct quiz answer,
  +10 XP per new daily visit (both only once tier 2 is unlocked).
- Rank ladder: Newcomer (1) → Apprentice (2) → Journeyman (4) →
  Tradesman (7) → Craftsman (11) → Veteran (16) → Outpost Legend (26).
- Skins unlock at levels 1 (Frost), 5 (Ember), 10 (Verdant), 15 (Void).
- Flair badges at levels 2, 5, 10, 15, 20. Stats logbook unlocks at level 4.
  Lore log reveals one snippet per level from level 2 onward. Prestige
  available at level 20.
