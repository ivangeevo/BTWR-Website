# Ponder → The Analytical Engine — Evolution Plan

Not started. Planning doc only — no code changed yet. Written after a design
conversation that settled the big questions below; implementation should follow
this document's sequencing rather than being one giant atomic change.

## Context

The Outpost currently opens with ~14 modules all visible on tier 1 simultaneously.
The goal: evolve the *existing* `Ponder` widget (already "the very first thing a
visitor finds," per its own file comments) into the Outpost's actual engine of
progression — a "think machine" that starts small, and by solving its word-tile
puzzles, generates the achievements that raise a visitor's tier and reveal the rest
of the Outpost. It should keep getting more capable as the visitor's tier rises, be
admin-tunable per tier (reusing/extending the mechanic-settings system built for
Campfire/Gathering/Prestige/Upgrades), and end up mechanically load-bearing for
Prestige by the endgame — while still carrying its own narrative thread throughout.

Alongside this, `Tier2Reveal.tsx` (today: a one-off, hardcoded-to-tier-1→2, full-
screen banner) is being retired in favor of a generic system that fires for *any*
tier transition — both a "Tier Unlocked" notification and a separate "here's what's
new" popup listing the specific module cards that just became visible. This isn't a
side quest: it's the actual on-screen mechanism through which the Engine's
"materializing" narrative gets shown.

**Deliberate scope boundary:** this plan does NOT rework `DEFAULT_MODULE_TIER` or
`defaultTiers()` for other modules. Out of the box, most modules still default to
tier 1 exactly as today. The "only widget visible at the start" experience is a
*capability* this plan enables (an admin can push everything else to higher tiers
and add more low-threshold tiers via the panel that already exists) — not something
this plan forces on every visitor by rewriting defaults. Worth revisiting later if
the default experience should actually change.

## Key design decisions (confirmed)

1. **Evolve `Ponder`, don't fork it.** Same component file, same `ponder` state
   slice, same achievement-id prefix (`pd-*`) — extended, not replaced. Its
   *displayed name* changes as it progresses (see below); its module id, file names,
   and existing achievement ids stay untouched so no save data breaks.
2. **Two progression axes coexist, deliberately.** `ponder-stage.ts` already has an
   explicit comment: *"Ponder's own progression — deliberately separate from the
   Outpost's tier1/tier2 system... Ponder grows the same way a new player does, not
   through its own achievement tiers."* That's a real, intentional design decision
   already in the codebase, and this plan doesn't reverse it — Ponder's 4-stage
   narrative arc (Day One → Day Two → Road to Mid-Game → The Wither & The End) keeps
   driving *which puzzle content* shows, unchanged. What's new is a **second,
   separate axis** — the Engine's *abilities* (insight rate, whether idle generation
   is unlocked, its Prestige bonus) — which DOES key off the Outpost's real
   admin-configurable tier system, via the mechanics extension below. Two axes, one
   widget: narrative stage (internal, unchanged) + ability tier (new, admin-tunable).
3. **Active-only at first; idle is a later, earned ability.** Tier 1 stays exactly
   what it is today — solve puzzles, get insight. Passive/idle generation (Engine
   "thinks while you're away," Campfire-decay-style elapsed-time math) only turns on
   once a later ability tier enables it. This is also the natural seed for the
   already-shelved `COOKIE_CLICKER_REWORK_PLAN.md` idle-generation idea — same
   elapsed-time-math technique, same "auto" concept, delivered narratively through
   this widget instead of a generic upgrade-shop item.
4. **Solving puzzles genuinely "materializes" things.** Every solve awards a new
   `insight` counter; insight crosses thresholds that unlock real achievements
   (new `NUMERIC_RULES` entries) exactly like every other achievement in the
   catalog — which is what the *existing* tier-threshold system already uses to
   reveal every other module. No second gating axis needed for visibility — the
   Engine just becomes a reliable, on-demand source of the achievements that the
   existing system already responds to.
5. **Endgame: mechanically tied to Prestige, plus continuous lore.** A new Legacy
   perk (`legacy.ts`) that the Engine's top ability tier unlocks, boosting Legacy
   Points banked per prestige. Alongside that, an ongoing lore/logbook thread reusing
   `tier2.ts`'s exact "high-water-mark integer + pure progress→text function,
   regenerated on render, newest-first" pattern — just keyed to the Engine's own
   insight/solve progress instead of `tier2.xp` level.

## Naming

Proposal: **"The Analytical Engine"** — fits BTW's steampunk/mechanical-power
aesthetic, historically resonant (Babbage's unbuilt mechanical computer — literally
"a machine that thinks," pre-dating real computers), and reads as a natural in-
fiction *evolution* of "Ponder" rather than an unrelated rename.

Concretely: the widget's displayed `<h3>` title changes with its own **narrative
stage** (not ability tier) — Stage 1–2 still shows "Ponder," and the rename to "The
Analytical Engine" happens exactly at the Stage 3 transition ("The Road to
Mid-Game" — already captioned *"The world got automated. So, a little, did it"* —
the automation chapter is the natural moment for it to "wake up" and rename itself).
This needs zero new state: `PONDER_STAGE_LABELS`-style lookup already exists,
just add a parallel title lookup by stage.

## Concrete changes, by file

### `hub-storage.ts` — new state
```ts
export type PonderState = {
  solvedCount: number;
  choicesMade: number;
  journal: string[];
  /** Cumulative "insight" earned from solves (+ later, idle generation) — the
   * Engine's own resource, and what its achievement thresholds read. */
  insight: number;
  /** High-water mark for lore reveals, same trick as tier2.loreRevealedLevel —
   * derived content, never stored per-entry. Keyed to insight, not solvedCount,
   * so idle generation (once unlocked) also feeds the lore thread. */
  loreRevealedRank: number;
  /** Elapsed-time anchor for idle insight generation, once an ability tier
   * enables it — null until first enabled. Same pattern as campfire.lastTendedAt. */
  idleGenSince: string | null;
};
```
Extend `defaultState()`, `loadState()`'s merge, and `importState()`'s merge in
`AchievementsProvider.tsx` (three places, same as every other slice) — all additive,
no migration risk (missing fields default to `0`/`null` for existing saves).

### `achievements-catalog.ts` — new ids
A handful of new `pd-*` ids gated on `insight` thresholds (exact numbers are a
tuning pass, not a design decision — pick a curve once the counter exists, e.g.
1 / 10 / 50 / 200). Categorize under the existing `ponder` category. Follow the
existing pattern exactly (see `pd-first-sentence`/`pd-fluent` already there).

### `AchievementsProvider.tsx` — rule engine + insight award + idle tick
- Extend `recordPonderSolved` to also award insight, read from the resolved
  per-tier mechanic (see below) rather than a flat constant.
- Add `NUMERIC_RULES` entries: `{ id: "pd-insight-x", at: N, read: (c) => c.state.ponder.insight }`.
- Add an idle-generation effect (mirrors `DayNightSky`'s/`Campfire`'s elapsed-time
  polling): once the resolved mechanic's `idleInsightPerMin > 0` and
  `ponder.idleGenSince` is set, compute elapsed minutes on tick and add insight —
  same "derived from a stored timestamp, no ticking server" technique already used
  twice in this codebase (`campfire-stage.ts`, `day-night-cycle.ts`).
- Expose a new `currentTierId: string` on context (computed via `useMemo` from the
  existing `admin-config.ts` function of the *same name* — alias the import to
  avoid a naming collision with the context field, e.g.
  `import { currentTierId as resolveCurrentTierId } from "./admin-config"`).

### `mechanics.ts` + `admin-config.ts` — per-tier ability settings (new, additive)
The existing `mechanicOverrides` system is flat (one settings object per module).
Rather than changing that contract, add a **sibling, opt-in** system used only by
modules that need per-tier profiles:
```ts
// admin-config.ts — new sibling field, existing `mechanicOverrides` untouched
mechanicOverridesByTier: Partial<Record<string /* moduleId */,
  Partial<Record<string /* tierId */, Partial<Record<string /* field key */, number>>>>>>;

export function resolvedMechanicForTier<T extends object>(
  config: AdminConfig, moduleId: ModuleId, tierId: string
): T { /* same merge logic as resolvedMechanic, one level deeper */ }
```
```ts
// mechanics.ts — new class, registered in a NEW registry so existing flat-mode
// modules (Campfire/Gathering/Prestige/Upgrades) are completely unaffected
export class AnalyticalEngineMechanic {
  insightPerSolve = 1;
  idleInsightPerMin = 0;       // 0 = idle generation not yet unlocked at this tier
  static readonly configFields: MechanicConfigField[] = [ /* ... */ ];
}
export const PER_TIER_MODULE_MECHANICS: Partial<Record<ModuleId, MechanicClass>> = {
  ponder: AnalyticalEngineMechanic,
};
```
Suggested per-tier defaults (tunable later, not a hard requirement): tier1 —
`insightPerSolve: 1, idleInsightPerMin: 0` (active-only, per decision #3); a mid
tier — `insightPerSolve: 2, idleInsightPerMin: 1` (idle unlocked); the top
configured tier — higher still, plus this is where the Legacy perk unlock check
lives (see below).

### `AdminPanel.tsx` — `MechanicSettingsMenu` branches
When `moduleId` is present in `PER_TIER_MODULE_MECHANICS` (checked first), render a
small tier picker (reuse `config.tiers`, same list already used everywhere else in
this file) above the field list, and read/write
`mechanicOverridesByTier[moduleId][selectedTierId][fieldKey]` instead of the flat
path. Modules not in that registry keep using today's flat gear menu completely
unchanged — this is a branch, not a replacement.

### `legacy.ts` + `AchievementsProvider.tsx` — Prestige tie-in
New perk, e.g.:
```ts
{ id: "borrowed-insight", name: "Borrowed Insight", icon: "🧠",
  description: "Legacy Points banked per prestige scale with the Engine's total insight.",
  maxLevel: 5, costForLevel: (level) => level * 3 }
```
A new small helper (same shape as `effectiveCooldownMs`/`collectBonus`) applied at
the `prestigeOutpost` call site in `AchievementsProvider.tsx`, on top of the
existing `pointsForPrestige(toolIndex, prestigeMechanic.pointsPerTier)` call —
e.g. `+ insightPrestigeBonus(legacy.perks, state.ponder.insight)`. Gate the perk's
*visibility* (or its max level) on the Engine having reached its top ability tier,
so it reads as an earned capstone rather than a perk available from minute one.

### Lore/logbook — reuse `tier2.ts`'s exact pattern
New content (small pool of flavor strings, own file or appended to
`ponder-content.ts`), plus a pure function `engineLoreForRank(rank) → string`
identical in spirit to `loreSnippetForLevel`. `ponder.loreRevealedRank` is bumped to
`Math.max(prev, newRankFromInsight)` inside the insight-award path. Rendered as a
second collapsible block inside `Ponder.tsx` itself (next to the existing "Show
Ponder's Journal" toggle), gated on narrative stage ≥ 3 (post-rename) — newest
entry first, same list-regenerated-on-render trick, no per-entry persistence.

### Replace `Tier2Reveal.tsx` — general tier-transition reveal
New file (e.g. `TierRevealNotice.tsx`) replacing it entirely; remove the old
file and its `<Tier2Reveal />` usage in `HubSection.tsx`.
- **Detection:** `prevTierRef<string | null>` (starts `null`, same "never replay for
  a returning visitor already past it" guard as today) diffing the new
  `currentTierId` context value instead of a single boolean. Fires only on a
  forward transition (new tier's threshold > previous tier's threshold, guards
  against weirdness if an admin edits thresholds live mid-session).
- **"Tier Unlocked" notification:** a toned-down version of the existing
  `tier2-reveal-*` animation trio — this now fires potentially many times per
  playthrough (once per admin-defined tier), so drop the full-screen scrim and
  flicker (those are correctly reserved for the one genuinely rare tier-1→2
  moment elsewhere, if kept as a special case — see open question) in favor of
  something closer to the existing toast vocabulary (`.hub-toast-in`). Content:
  the tier's own `name` (already admin-editable) plus, as its subtitle, whatever
  the admin already wrote in `config.tierTips[tierId]` for that tier — this
  already exists (`TierTip.tsx`'s data source) and needs zero new admin UI.
- **"New cards" popup:** computed simply as `MODULES.filter(m => moduleTierId(m.id) === justCrossedTierId)`
  — a module only ever "newly" appears exactly when the tier it's assigned to is
  the one just crossed, so no complex before/after set-diffing is needed. Renders
  each newly-revealed module's `label` (from `module-registry.ts`) in a small
  animated card-style popup, reusing `outpost-materialize`'s entrance timing.
- Both pieces render unconditionally inside `OutpostFrame` (not `ModuleGate`d),
  same mounting point as the old `Tier2Reveal`.

### `ponder-content.ts` — Stage 1 difficulty fix
Current Stage 1 tile counts range 5–10 (average ~7.25); two entries hit double
digits. Target range: 3–7, evening out the ramp for a brand-new visitor's very
first interaction.
```
s1-pointy-stick  (10 tiles) → "A Pointy Stick is not a weapon."           (7 tiles)
s1-hole          ( 9 tiles) → "One hole in the ground. That's the plan." (7 tiles)
s1-shaft         ( 9 tiles) → "I have a Shaft. Not a log yet."           (7 tiles)
```
Plus 1–2 new very-short entries for a gentler on-ramp, e.g.
`["Day", "One.", "Barely."]` (3 tiles). Keep `s1-not-mob`/`s1-punch` (already 5
tiles) as the low end of the range.

## Recommended build order

1. Stage 1 puzzle fix (`ponder-content.ts`) — zero dependencies, ships alone.
2. `insight` counter + achievement ids + `NUMERIC_RULES` entries, awarded at a flat
   constant rate first (no per-tier mechanic yet) — proves the "solving puzzles
   raises unlockedCount" loop end-to-end before adding tuning complexity.
3. Per-tier mechanic system (`mechanics.ts`/`admin-config.ts`/`AdminPanel.tsx`) —
   swap the flat award-rate from step 2 for the resolved per-tier value.
4. Idle generation (once the mechanic can express `idleInsightPerMin > 0`).
5. Lore/logbook thread.
6. `TierRevealNotice` replacing `Tier2Reveal` — independently testable by just
   adding a custom low-threshold tier in the admin panel and watching it fire.
7. Legacy/Prestige tie-in — last, since it's the "capstone" and depends on the
   ability-tier plumbing from step 3 existing first.
8. Title-swap-on-stage-3 + rename to "The Analytical Engine."

## Open questions / judgment calls flagged, not silently decided

- **Does the tier-1→2 transition keep anything special**, or does it become just
  another instance of the new generic `TierRevealNotice` (losing its unique
  full-screen "wow" treatment)? Leaning toward: let it become a generic instance
  too, for consistency — but this is a real aesthetic downgrade for that one
  specific moment worth confirming before deleting `Tier2Reveal.tsx`'s CSS.
- **Exact insight thresholds/award rates** are placeholder-shaped above, not tuned —
  this is a numbers pass to do once the plumbing exists, not a blocking decision.
- **Where the Engine's own achievements should sit tier-wise** (all tier 1, since
  it's meant to be usable from the very start?) — assumed yes, not yet confirmed.

## Verification (once implemented)

- Fresh Outpost (reset via Community page control panel) → confirm the widget
  still shows as "Ponder," Stage 1 puzzles all feel shorter/easier.
- Solve several puzzles → confirm `ponder.insight` climbs in `localStorage`
  (`btwr:hub:v1`), and the new `pd-*` achievements unlock at their thresholds via
  the existing toast stack.
- In `/outpost-admin` → Modules tab, confirm Ponder's gear icon now shows a tier
  picker (per-tier mode) while Campfire/Gathering/Prestige/Upgrades' gear icons are
  unchanged (flat mode, no tier picker).
- Add a custom low-threshold tier in the Tier List tab, assign an existing module
  to it, cross that threshold live → confirm `TierRevealNotice` fires both the
  tier notification and the new-cards popup, using that tier's own name and
  `tierTips` text.
- Reach the Engine's top ability tier and prestige → confirm the new Legacy perk
  is purchasable and actually changes banked Legacy Points.
