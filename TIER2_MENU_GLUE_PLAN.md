# Tier 2 side-menu layout fix — plan (not yet implemented)

## What's wrong right now

`Tier2LeftMenu.tsx` and `Tier2RightMenu.tsx` currently render their rail and
expand-panel in the wrong order relative to the main card grid (`HubBody`):

- **Left menu** (`components/hub/Tier2LeftMenu.tsx`): renders `[rail, panel]`,
  and is placed *before* `HubBody` in `OutpostBody`. Reading left→right on
  the page that's `rail | panel | HubBody` — so the rail sits at the
  window's outer-left edge, and the panel (when open) is the thing actually
  touching the main card grid.
- **Right menu** (`components/hub/Tier2RightMenu.tsx`): renders
  `[panel, rail]`, placed *after* `HubBody`. Reading left→right that's
  `HubBody | panel | rail` — panel touches the main grid, rail sits at the
  window's outer-right edge.

Both outer gaps (`OutpostBody`'s `gap-4` between the menu components and
`HubBody`, plus each menu's own `gap-3` between its rail and panel) are
uniform, so there's no visual "this rail belongs to the main pane" feel —
everything floats with even spacing.

## What it should look like instead

The **rail** (the small icon-button stack — Patch Notes/Quiz on the left,
the level chip + Overview/Progression on the right) should sit flush against
the main card grid's edge, glued with no gap, like it's a strip attached
directly to the pane. The **expand panel** should open on the *outer* side
of its rail — away from the main grid, toward its respective edge of the
window — not toward the center.

Concretely, left→right order needs to become:

```
[left panel, expands ← outward]  [left rail, glued]  [HubBody]  [right rail, glued]  [right panel, expands → outward]
```

## Implementation

1. **`Tier2LeftMenu.tsx`** — swap the JSX order inside the wrapping `<div>`
   from `{rail}{panel}` to `{panel}{rail}`. The rail stays the last child so
   it ends up adjacent to `HubBody` once this whole component is placed
   before it in `OutpostBody`.

2. **`Tier2RightMenu.tsx`** — swap from `{panel}{rail}` to `{rail}{panel}`.
   Rail becomes the first child, adjacent to `HubBody` (which precedes this
   component in `OutpostBody`); panel becomes the last child, outermost.

3. **Remove the glued gap.** In `OutpostBody` (`HubSection.tsx`), the outer
   `flex ... gap-4` currently spaces `Tier2LeftMenu`/`HubBody`/
   `Tier2RightMenu` evenly. That gap needs to collapse to `0` specifically
   between each rail and `HubBody`'s edge, while the gap *within* each menu
   (between its own rail and panel) can keep a small visible seam (`gap-2`
   or so) since those are still two distinct surfaces. Likely means moving
   the "glued" gap out of `OutpostBody`'s shared `gap-4` and into each
   menu's own internal layout instead — e.g. `OutpostBody` gap drops to `0`,
   and each menu component adds its own `gap-4`/`gap-6` *between panel and
   rail* (the part that should still look separated), with nothing between
   rail and `HubBody`.

4. **Give `HubBody` a border once tier 2 is unlocked**, so the main card
   pane reads as a distinct bordered section that the rails are glued onto
   the outside of — not just floating cards with no boundary. Something
   like a conditional class in `HubBody` (`HubSection.tsx`):
   `tier2Unlocked ? "rounded-xl border border-white/10 px-4 py-4" : ""`,
   tinted with `var(--outpost-accent-soft)` to match the current skin
   rather than a flat white border. Needs a visual pass to get padding
   right so the existing card grid doesn't feel cramped against its own new
   border.

5. **Re-check the expand animation.** `.tier2-panel`'s current
   `tier2-panel-in` keyframe is a simple vertical fade (`translateY`), which
   still works regardless of which side it's expanding toward — no change
   needed there. Worth a look at whether a subtle horizontal slide (panel
   sliding *outward* from the rail) would sell the "expands toward the
   window edge" motion better, but that's a nice-to-have, not required.

6. **Re-verify at the width extremes.** The frame's `max-w-[2000px]` was
   sized for the *previous* order (panel-then-rail on each side); confirm
   it's still enough once rails are glued and panels are the outermost
   elements — the total content width shouldn't actually change (same
   pieces, reordered), but worth a fresh screenshot check with both panels
   open simultaneously at ~2000px viewport.

## Verification checklist (when this gets built)

- `tsc --noEmit` and `eslint` clean.
- Both menus collapsed: rails visibly touch `HubBody`'s new border, no gap.
- Left panel open: expands to the *left* of its rail, away from `HubBody`.
- Right panel open: expands to the *right* of its rail, away from `HubBody`.
- Both panels open simultaneously at a wide viewport: no wrapping, frame
  widens cleanly, `HubBody` itself never moves or resizes.
- Narrow-viewport fallback (menus wrap below `HubBody`) still looks
  reasonable — recheck once the gap/border changes land, since that
  fallback was tuned against the old spacing.
- Tier-1-only view (`tier2Unlocked === false`) unaffected — no border, no
  rails, `HubBody` unchanged.
