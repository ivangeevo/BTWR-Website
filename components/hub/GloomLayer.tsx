"use client";

import Link from "next/link";
import { useAchievements } from "./AchievementsProvider";

// The gloom (survival.ts): on the evening before a New Moon night the whole
// of Basecamp slowly darkens, deepest through the night itself. There's no
// other warning — Tonight's Sky is where to see it coming. A lit Campfire
// lifts it (only at camp: out on the trek home there's no fire to sit by).
// Never during the day. The Campfire card and the Materials panel (with
// the Health and Hunger bars) sit above it (.outpost-lit); the site header
// and footer are outside the Outpost entirely.
//
// While the admin debug flag makes every night a gloom night, a notice says
// so — otherwise a forgotten flag just looks like far too many New Moons.
export default function GloomLayer() {
  const { gloomLevel, gloomForced } = useAchievements();
  return (
    <>
      <div
        aria-hidden="true"
        className="outpost-gloom pointer-events-none absolute inset-0"
        style={{ opacity: gloomLevel * 0.85 }}
      />
      {gloomForced && (
        <Link
          href="/outpost-admin"
          className="outpost-lit absolute bottom-2 left-1/2 -translate-x-1/2 rounded-full border border-rose-400/40 bg-black/80 px-3 py-1 text-[11px] font-semibold text-rose-200 hover:border-rose-300"
        >
          Debug: &ldquo;Every night is a gloom night&rdquo; is on. Turn it off in Engine Debug.
        </Link>
      )}
    </>
  );
}
