"use client";

import { useEffect, useState } from "react";
import { useAchievements } from "./AchievementsProvider";

const ROTATE_MS = 60_000;

// Thin bar, sitting above the Resources & Tool strip — shows whatever
// tip(s) the admin set for the visitor's current tier (Tiers tab in
// /outpost-admin). Renders nothing if that tier has no tips configured.
// Multiple entries rotate on a 1-minute timer; a single entry just sits.
export default function TierTip() {
  const { tierTips } = useAchievements();
  const [index, setIndex] = useState(0);

  useEffect(() => {
    setIndex(0);
    if (tierTips.length <= 1) return;
    const id = window.setInterval(() => {
      setIndex((i) => (i + 1) % tierTips.length);
    }, ROTATE_MS);
    return () => window.clearInterval(id);
  }, [tierTips]);

  if (tierTips.length === 0) return null;

  return (
    <div className="outpost-tip-box sm:col-span-2" title={tierTips[index]}>
      <span className="shrink-0 text-sm leading-none" aria-hidden="true">
        {"\u{1F4A1}"}
      </span>
      <p key={index} className="outpost-tip-text">
        {tierTips[index]}
      </p>
    </div>
  );
}
