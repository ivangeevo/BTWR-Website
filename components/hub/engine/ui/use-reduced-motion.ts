"use client";

import { useEffect, useState } from "react";
import { useAchievements } from "../../AchievementsProvider";

// The OS setting OR the Outpost's own "reduced motion" toggle.
export function useReducedMotion(): boolean {
  const { settings } = useAchievements();
  const [os, setOs] = useState(false);
  useEffect(() => {
    const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
    setOs(mq.matches);
    const on = () => setOs(mq.matches);
    mq.addEventListener("change", on);
    return () => mq.removeEventListener("change", on);
  }, []);
  return os || settings.reducedMotion;
}
