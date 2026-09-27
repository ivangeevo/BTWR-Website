# Upgrades shop — follow-up plan

Not started. This picks up what the Upgrades rework (branch
`feature/homepage-rework-outpost`) left out. That rework turned the shop into
four capabilities: Tame a Wolf, Fishing, Torches, Farm Plot. The catalog is in
`components/hub/upgrade-catalog.ts` and the logic in `components/hub/camp.ts`.

Two parts:

1. Four achievements for the new capabilities. They are small and fully
   specified below.
2. A backlog of more capabilities. These are design sketches, not specs.

The rule for every new upgrade stays the same: it adds **a new thing to do**
that touches at least two existing systems. It is never a plain number bump,
because Legacy perks and Engine Research already cover those. Each one costs
Skill Points plus a resource build cost.

---

## Part 1: Achievements for the new capabilities

Each achievement is worth +1 SP (Skill Points per achievement), which feeds
straight back into the shop.

| Id | Title (draft) | Earned when | Frame |
|---|---|---|---|
| `hh-wolf` | Better Than Wolves | Bought Tame a Wolf | task (root) |
| `hh-dusk-catch` | Biting at Dusk | Caught a fish at dawn or dusk | task (root) |
| `hh-first-harvest` | First Harvest | Harvested the farm plot once | task (root) |
| `hh-torchlight` | By Torchlight | A torch kept the gloom off on a New Moon night | challenge, secret |

### Where they go
- **Category:** the existing **Husbandry & Harvest** (`husbandry-harvest`). It fits
  the wolf, fishing and the farm, so no new category is needed.
- **`components/hub/achievements-catalog.ts`:**
  - add the ids to the `AchievementId` union (next to the other `hh-*`);
  - add a def each to the Husbandry block (around line 530).
- **`components/hub/achievement-tree.ts`:** add a `ROWS` entry each. They can be
  their own roots (`parent: null`), like Mob & Moonphase does.
  `achievement-tree.test.ts` fails if any achievement has no row.
- **Don't** add them to `EXPANSION_HUSBANDRY_IDS`. That list feeds
  `EXPANSION_IDS`, which the "complete all 111" capstone (`fr-complete-111`)
  checks. Adding them would quietly move that goal, and Casual players could
  never finish it, because Torches is survival-only.

### Triggers
- **`hh-wolf`:** a numeric rule in the provider's `NUMERIC_RULES`:
  `read: (c) => (c.state.upgrades.purchased.includes("wolf") ? 1 : 0)`.
  - Read the purchase, not the feeding state: `camp` resets on prestige, but
    the purchase stays.
- **`hh-dusk-catch`:** call `unlock("hh-dusk-catch")` inside `completeFishing`
  when `twilight` is true.
- **`hh-first-harvest`:** call `unlock("hh-first-harvest")` inside `harvestFarm`
  after a successful harvest.
- **`hh-torchlight`:** start with the simple version: `unlock()` where the
  survival tick lights a torch against the gloom (the
  `commitCamp("Lit a torch against the gloom")` call).
  - Stricter version, only if it's worth it: remember that night's segment, and
    unlock at dawn if the visitor didn't die in between. It needs a small
    counter on `survival` (e.g. `gloomNightsByTorch`) so it survives a reload
    mid-night.

### Verify
- `npm test`: the tree tests cover the new rows.
- In `/outpost`, using the Engine Debug panel:
  - +25 SP, buy the wolf, and check the toast;
  - jump to dusk and fish;
  - plant, then wait out the growth. Lower "Farm: growing time" in the admin
    Upgrades mechanic menu to make this quick;
  - "gloom-night" jump with the fire out and a torch in stock.

---

## Part 2: Backlog capabilities

Sketches only. Numbers are starting points for tuning. Anything new and
tunable goes on `UpgradesMechanic` (`components/hub/mechanics.ts`), so it shows
up in the admin panel automatically.

### 🟫 Tanning: builds on the Wolf
- **Idea:** BTW's own tanning chain. Hunts sometimes drop a **Hide**. A fed wolf
  leaves **Dung** once per in-game day. Hide + Dung tan into **Leather**, which
  crafts **Leather Armor** that lowers activity damage.
- **Stage / cost:** stage 5, around 6 SP plus a small build cost, e.g. Wood and
  Stone for a tanning vat.
- **Hooks:** the wolf, hunting, crafting, survival damage.
- **Cost of building it:**
  - It needs new resource ids (`hide`, `dung`, `leather`). That touches
    `RESOURCE_IDS`/`RESOURCE_META`, the resource strip, the admin Resources tab
    and the save defaults.
  - This is the biggest item here.
- **Open questions:**
  - Should armor be survival-only (hidden in Casual) like Torches?
  - Or should it also do something in Casual?
  - Should it wear out, or stay permanent?

### 🧱 Brick Oven
- **Idea:** cooks 3 Food per cook and works on any lit fire, not just Medium.
  It frees the player from managing the fire just to cook.
- **Stage / cost:** stage 5, around 6 SP + 12 Stone + 4 Coal.
- **Hooks:** Campfire, Stone, and the stage-7 "cook meals" gate.
- **Where:** a toggle or second button in the Campfire card's Cooking section.
- **Open question:** does it replace campfire cooking, or sit next to it?
  Replacing it drops the Medium-fire rule, which the campfire's captions talk
  about.

### 🗺️ Expeditions
- **Idea:** a long daytime trip (5–15 real minutes). It blocks other Gathering
  while it runs and pays out a bundle: bulk ore, sometimes an Engine component.
  - In survival, still being out at dusk makes it risky: a hit chance, or an
    early return with half the loot.
- **Stage / cost:** stage 5–6, around 8 SP + Iron.
- **Hooks:** the day/night cycle, gathering, the Engine (component rewards),
  survival.
- **Note:** it has to keep running with the tab closed. Store `startedAt` and
  settle it on the next load, like the farm does, not as a client-side
  loading bar.

### 🧺 Wicker Baskets (work queue)
- **Idea:** queue up to 3 Gathering runs back to back. Each one starts by
  itself when the rest timer ends. This fits stage 5's caption: "the world got
  automated".
- **Stage / cost:** stage 6, around 6 SP + Wood.
- **Hooks:** gathering, the shared cooldown, survival hunger (each queued run
  still costs hunger).
- **Note:**
  - `LoadingBarButton` is page-bound, so the queue only runs while the tab is
    open. Say so in the UI.
  - The alternative is to settle queued runs on load, which is more work but
    fits an idle game better.

### 🏮 Soulforged Lantern
- **Idea:** an endgame light that never goes out. The gloom can no longer reach
  camp. It's a victory lap that retires a mechanic.
- **Stage / cost:** stage 8, a high SP cost plus Iron/Coal, or a soulforged
  part from the Engine.
- **Hooks:** survival gloom, the Engine's soulforge.
- **Note:** it makes Torches pointless late in the game. That's intended, but
  the torch row could say "the Lantern has this covered".

### Suggested order
1. Part 1 achievements.
2. Brick Oven (small, self-contained).
3. Wicker Baskets.
4. Expeditions.
5. Tanning (new resources).
6. Soulforged Lantern (endgame; can wait for the rest of stage 8 content).
