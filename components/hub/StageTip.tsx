"use client";

import { useEffect, useState } from "react";
import { useAchievements } from "./AchievementsProvider";

const ROTATE_MS = 60_000;

// Thin bar above the Engine, in the Outpost's left column — shows whatever
// tip(s) are set for the Engine's current stage (Stages tab in
// /outpost-admin). Renders nothing if that stage has no tips.
// Multiple entries rotate on a 1-minute timer; a single entry just sits.
export default function StageTip() {
  const { stageTips } = useAchievements();
  const [index, setIndex] = useState(0);

  useEffect(() => {
    setIndex(0);
    if (stageTips.length <= 1) return;
    const id = window.setInterval(() => {
      setIndex((i) => (i + 1) % stageTips.length);
    }, ROTATE_MS);
    return () => window.clearInterval(id);
  }, [stageTips]);

  if (stageTips.length === 0) return null;

  return (
    <div className="outpost-tip-box" title={stageTips[index]}>
      <span className="shrink-0 text-sm leading-none" aria-hidden="true">
        {"\u{1F4A1}"}
      </span>
      <p key={index} className="outpost-tip-text">
        {stageTips[index]}
      </p>
    </div>
  );
}
