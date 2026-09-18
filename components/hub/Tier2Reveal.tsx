"use client";

import { useEffect, useRef, useState } from "react";
import { useAchievements } from "./AchievementsProvider";

const BANNER_MS = 3600;

// A one-off "wow" moment the instant tier 2 unlocks in a live session —
// never replayed for a returning visitor who already has it unlocked
// (prevRef starts at null, so the very first mounted render never counts
// as a "transition" even if tier2Unlocked is already true by then).
export default function Tier2Reveal() {
  const { mounted, tier2Unlocked } = useAchievements();
  const [showBanner, setShowBanner] = useState(false);
  const prevRef = useRef<boolean | null>(null);

  useEffect(() => {
    if (!mounted) return;
    const prev = prevRef.current;
    prevRef.current = tier2Unlocked;
    if (prev === false && tier2Unlocked) {
      setShowBanner(true);
      const timer = setTimeout(() => setShowBanner(false), BANNER_MS);
      return () => clearTimeout(timer);
    }
  }, [mounted, tier2Unlocked]);

  if (!showBanner) return null;

  return (
    <div className="tier2-reveal-overlay" aria-hidden="true">
      <div className="tier2-reveal-banner">
        <span className="tier2-reveal-tag">Tier II Unlocked</span>
        <h3 className="mt-4 font-heading text-3xl font-extrabold text-white sm:text-4xl">
          The Outpost: Community Edition
        </h3>
        <p className="mx-auto mt-2 max-w-sm text-white/60">
          You put the work in. There&apos;s more here now.
        </p>
      </div>
    </div>
  );
}
