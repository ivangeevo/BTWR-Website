"use client";

import { useEffect, useRef } from "react";
import AchievementGallery from "./AchievementGallery";
import { useAchievements } from "./AchievementsProvider";

// Full-width, sitting right where the old Tier 2 dashboard used to live —
// the achievement gallery is too content-heavy for a narrow side panel, so
// it gets its own generous section instead of a menu tab. Reframed as
// "Accomplishments" now that it's a section in its own right, not a tab
// among several.
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
    <div className="border-t border-white/10 px-6 py-8 sm:py-10">
      <div className="mx-auto max-w-5xl">
        <h3 className="font-heading text-lg font-bold uppercase tracking-wider text-[var(--outpost-accent)]">
          Accomplishments
        </h3>
        <div className="mt-4">
          <AchievementGallery variant="flat" />
        </div>
      </div>
    </div>
  );
}
