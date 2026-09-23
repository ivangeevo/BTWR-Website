# Outpost Cookie-Clicker Rework — Shelved Plan

Not started. This is a future-direction note, not a spec to implement immediately —
picked back up whenever there's appetite for a bigger Outpost pass.

## Premise

The Outpost already has most of Cookie Clicker's DNA: resources (wood/food/stone/
coal/copper/iron/cooked food), a tool-tier progression, a prestige loop with permanent
perks (Legacy, see `components/hub/legacy.ts`), and a Skill Points shop
(`components/hub/upgrade-catalog.ts` + `Upgrades.tsx`). What's actually missing is the
thing that makes an idle game feel like an idle game: **passive generation** and **a
long ladder of things to spend on**. Everything below builds on existing systems
rather than inventing new ones, specifically to keep this from becoming a rewrite.

## Concept tracks, cheapest/highest-impact first

### 1. Passive generation (the core piece)
Right now every resource requires a manual hold (Tree Mining / Hunting / Mining in
`Gathering.tsx`). Add an "auto-gatherer" purchase in the Upgrades shop that grants
wood/food per minute passively.

- Compute the same way Campfire decay (`campfire-stage.ts`) and the day/night cycle
  (`day-night-cycle.ts`) already do: elapsed-time math off a stored timestamp, checked
  on mount/interval — no server, no ticking backend needed.
- Free side effect: a "welcome back — here's what your gatherers made while you were
  away" moment, since the math is already elapsed-time-based rather than tick-based.
- Where it'd hook in: a new field on `HubState` (e.g. `autoGather: { ratePerMin: {...},
  lastCollectedAt }`), resolved similarly to how `mechanics.ts` resolves per-module
  numeric knobs — could even become its own `MechanicConfigField`-style admin setting
  (rate, cap) if it should be admin-tunable like Campfire/Gathering/Prestige/Upgrades
  already are.

### 2. Expand the Upgrades shop into an actual ladder
`upgrade-catalog.ts` currently holds exactly one item (`card-reorder`). This is pure
data work — no new systems required:
- More Skill-Point-cost entries: "+1 Tree Mining yield," "-10% activity cooldown,"
  "auto-gatherer tier 2," etc.
- An escalating cost curve (mirrors `legacy.ts`'s `costForLevel` pattern already used
  for Legacy perks) is the entire Cookie Clicker core loop in miniature.

### 3. Lean harder into Legacy/Prestige as the "ascension" loop
The reset-for-permanent-perks system already exists (`legacy.ts`, `Prestige.tsx`).
Cookie Clicker's addictiveness comes from prestige loops getting progressively
juicier on each reset — just add more perks, and let later ones cost/scale further.
Also pure data (new entries in `PERKS`), no new mechanic.

### 4. A visible "rate" readout
A small "+N wood/min" indicator (natural home: `ResourceToolStrip.tsx`) sells the
idle-game feel even before passive generation ships, since it visually promises
"this goes up even when you're not clicking." Cheap, mostly cosmetic, good first step
to build toward #1.

### 5. (Stretch — lowest priority) Golden-cookie-style random events
Periodic random bonus popups (2x resources for 60s, etc.). Skipped for now: needs a
new timer/animation/reward system from scratch, more work than #1–3 for less payoff.
Revisit only after 1–3 are in and the loop needs more texture.

## Recommended order if/when this gets picked up

1. #4 (rate readout) — cheapest, sets visual expectation.
2. #1 (passive generation) — the actual "idle" feeling, reuses existing elapsed-time
   patterns.
3. #2 (upgrade ladder) — gives Skill Points somewhere meaningful to go, makes #1
   scale.
4. #3 (deeper prestige) — once the moment-to-moment loop (#1+#2) is worth resetting.
5. #5 (golden-cookie events) — only if the loop still needs more texture after all of
   the above.

## Open questions for whenever this is picked back up

- Does auto-gather need its own currency, or does it just accelerate the existing
  wood/food resources? (Leaning: just accelerate existing resources — avoids a whole
  new economy.)
- Should auto-gather rate be admin-configurable via the existing mechanic-settings
  system (`mechanics.ts` + the Modules tab gear menu), same as Campfire/Gathering/
  Prestige/Upgrades already are? (Leaning: yes, for consistency — it's the same
  pattern the admin panel already teaches.)
- Cap on offline/away progress (e.g. Cookie Clicker caps offline earnings) — needed to
  avoid a visitor "banking" huge idle gains from a week-long-untouched tab.
