"use client";

import { useEffect, useRef, useState } from "react";
import { useAchievements } from "./AchievementsProvider";
import { formatHalves } from "./survival";

// Minecraft-style rows of icons, two points per icon: a full icon, a half
// (clipped to its left side), or an empty outline.
function IconRow({ value, max, icon, label }: { value: number; max: number; icon: string; label: string }) {
  const count = Math.ceil(max / 2);
  return (
    <div className="outpost-vital-row" role="img" aria-label={`${label}: ${formatHalves(value)} of ${count}`}>
      {Array.from({ length: count }, (_, i) => {
        const fill = Math.max(0, Math.min(2, value - i * 2));
        return (
          <span key={i} className="outpost-vital" data-fill={fill} aria-hidden="true">
            <span className="outpost-vital-empty">{icon}</span>
            <span className="outpost-vital-full">{icon}</span>
          </span>
        );
      })}
    </div>
  );
}

// Health and Hunger (survival.ts), at the top of the Materials panel. Only
// shown once survival is on. Shakes briefly on a hit, unless the visitor
// asked for reduced motion.
export default function VitalsBar() {
  const { survival, survivalActive, mechanics, settings } = useAchievements();
  const [hit, setHit] = useState(false);
  const prevHealthRef = useRef<number | null>(null);

  useEffect(() => {
    const prev = prevHealthRef.current;
    prevHealthRef.current = survival.health;
    if (prev === null || survival.health >= prev || settings.reducedMotion) return;
    setHit(true);
    const id = window.setTimeout(() => setHit(false), 400);
    return () => window.clearTimeout(id);
  }, [survival.health, settings.reducedMotion]);

  if (!survivalActive) return null;
  const { maxHealth, maxHunger } = mechanics.survival;
  const starving = survival.hunger <= 0;

  return (
    <div className={`outpost-vitals mt-2 ${hit ? "outpost-vitals-hit" : ""}`}>
      <IconRow value={survival.health} max={maxHealth} icon={"❤️"} label="Health" />
      <IconRow value={survival.hunger} max={maxHunger} icon={"\u{1F357}"} label="Hunger" />
      {starving && <p className="mt-0.5 text-[10px] text-rose-300">Starving. Eat something cooked.</p>}
    </div>
  );
}
