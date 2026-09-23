---
description: Add the hold-to-reveal hint ring + tooltip pattern to a UI element
---

Add the "hint ring" interaction to the element described in $ARGUMENTS: a small
circular progress ring that fills while hovering/holding, then reveals a
tooltip with more detail. This is an existing, reusable pattern already used
in two places — copy its structure rather than inventing a new one:

- **Reference implementation (portaled, for elements inside clipped/scrolling
  containers):** `AchievementTile` in
  [components/hub/AchievementGallery.tsx](components/hub/AchievementGallery.tsx)
  — hover/touch-hold state machine, `createPortal` to `document.body`,
  viewport-relative positioning that flips above/below to stay on-screen.
- **Reference implementation (simple, absolute-positioned within a
  non-clipping parent):** `AchievementLabel` in
  [components/hub/AdminPanel.tsx](components/hub/AdminPanel.tsx) — same ring
  and tooltip markup, no portal needed.
- **Shared CSS** (don't redefine): `.admin-hint-ring`, `.admin-hint-ring-fill`,
  `.admin-hint-tooltip`, and the `admin-hint-ring-fill` keyframe animation in
  [app/globals.css](app/globals.css) (search `admin-hint`).

Pattern to replicate:
1. `hovering` / `ready` state — `ready` flips true after a hold timer (see
   `ACHIEVEMENT_HINT_HOLD_MS`, ~1000ms) so a passing hover doesn't trigger it.
2. While `hovering && !ready`: render the SVG ring (two `<circle>`s — a faint
   background track + an animated fill using `admin-hint-ring-fill`) so the
   fill animation itself reads as a countdown to reveal.
3. Once `ready`: render the tooltip with the fuller text/description. If the
   element sits inside a container with `overflow: hidden` (a card, a
   collapsible panel), portal the tooltip to `document.body` and position it
   with `getBoundingClientRect()` in viewport coordinates, like
   `AchievementTile` does — otherwise the tooltip clips at the container edge.
4. Support touch: `onTouchStart` triggers the same hold-timer entry point,
   `onTouchEnd`/`onTouchCancel` dismiss.

Pick whichever reference (portaled vs. simple) matches the target element's
container — if unsure whether the target sits in a clipping/scrolling
ancestor, check before choosing.
