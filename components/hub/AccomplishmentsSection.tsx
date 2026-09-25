"use client";

import { useEffect, useRef } from "react";
import AchievementGallery from "./AchievementGallery";
import { useAchievements } from "./AchievementsProvider";

// The Outpost's Achievements tab — the full gallery. It mounts when the tab
// is opened, so opening it is what counts as having seen new unlocks.
export default function AccomplishmentsSection() {
  const { markAchievementsSeen, recordTabVisit } = useAchievements();
  const markedRef = useRef(false);

  useEffect(() => {
    if (markedRef.current) return;
    markedRef.current = true;
    recordTabVisit("achievements");
    markAchievementsSeen();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div className="px-6 py-8 sm:py-10">
      <div className="mx-auto max-w-5xl">
        <h3 className="font-heading text-lg font-bold uppercase tracking-wider text-[var(--outpost-accent)]">
          Achievements
        </h3>
        <div className="mt-4">
          <AchievementGallery variant="flat" />
        </div>
      </div>
    </div>
  );
}
