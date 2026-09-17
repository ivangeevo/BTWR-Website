"use client";

import Reveal from "@/components/Reveal";
import type { Mod, PackRelease } from "@/lib/mods";
import { ACHIEVEMENTS } from "./achievements-catalog";
import { AchievementsProvider, useAchievements } from "./AchievementsProvider";
import AchievementToastStack from "./AchievementToastStack";
import AchievementGallery from "./AchievementGallery";
import ModOfTheDay from "./ModOfTheDay";
import PatchNotes from "./PatchNotes";
import GuessTheMod from "./GuessTheMod";

function HubBanner() {
  const { unlocked, mounted } = useAchievements();
  return (
    <div className="bg-chrome-dark px-6 py-10 text-center text-white">
      <h2 className="font-heading text-3xl font-extrabold tracking-wide">The Outpost</h2>
      <p className="mx-auto mt-2 max-w-xl text-white/80">
        Your basecamp for BTWR — spotlights, secrets, and a quiz that remembers you.
      </p>
      {mounted && (
        <div className="mt-4 inline-flex items-center gap-2 rounded-full bg-white/10 px-4 py-1.5 text-sm font-semibold">
          <span>Achievements</span>
          {/* Plain live count, not <CountUp> — CountUp locks itself after
              its first scroll-into-view animation, but this number keeps
              changing all session long as achievements unlock. */}
          <span className="text-glow">
            {unlocked.size}/{ACHIEVEMENTS.length}
          </span>
        </div>
      )}
    </div>
  );
}

export default function HubSection({
  mods,
  packReleases,
}: {
  mods: Mod[];
  packReleases: PackRelease[];
}) {
  return (
    <AchievementsProvider>
      <AchievementToastStack />
      <Reveal>
        <section className="overflow-hidden">
          <HubBanner />
          <div className="mx-auto max-w-5xl px-6 py-10">
            <div className="grid gap-6 sm:grid-cols-2">
              <div className="space-y-6">
                <ModOfTheDay mods={mods} />
                <AchievementGallery />
              </div>
              <div className="space-y-6">
                <PatchNotes mods={mods} packReleases={packReleases} />
                <GuessTheMod mods={mods} />
              </div>
            </div>
          </div>
        </section>
      </Reveal>
    </AchievementsProvider>
  );
}
