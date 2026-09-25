"use client";

import { useEffect, useState } from "react";
import { ACHIEVEMENTS_BY_ID } from "./achievements-catalog";
import type { AdvFrame } from "./achievement-tree";
import { useAchievements, type ToastInstance } from "./AchievementsProvider";

const AUTO_DISMISS_MS = 25_000;
const LEAVE_ANIMATION_MS = 220;

// Minecraft's toast headers, by the achievement's tree frame (achievement-tree.ts).
const TOAST_HEADS: Record<AdvFrame, string> = {
  task: "Advancement Made!",
  goal: "Goal Reached!",
  challenge: "Challenge Complete!",
};

function Toast({
  toast,
  onRemove,
}: {
  toast: ToastInstance;
  onRemove: (instanceId: string) => void;
}) {
  const [leaving, setLeaving] = useState(false);
  const { achievementTree } = useAchievements();
  const achievement = ACHIEVEMENTS_BY_ID[toast.achievementId];

  useEffect(() => {
    const timer = setTimeout(() => setLeaving(true), AUTO_DISMISS_MS);
    return () => clearTimeout(timer);
  }, []);

  useEffect(() => {
    if (!leaving) return;
    const timer = setTimeout(() => onRemove(toast.instanceId), LEAVE_ANIMATION_MS);
    return () => clearTimeout(timer);
  }, [leaving, onRemove, toast.instanceId]);

  if (!achievement) return null;
  const frame = achievementTree[achievement.id]?.frame ?? "task";

  return (
    <div
      onClick={() => setLeaving(true)}
      className={`hub-toast adv-toast relative flex w-72 cursor-pointer items-center gap-3 px-3 py-2.5 pr-7 text-left text-white ${
        frame === "challenge" ? "adv-toast-challenge" : ""
      } ${leaving ? "leaving" : ""}`}
    >
      <button
        type="button"
        aria-label="Dismiss achievement"
        onClick={(e) => {
          e.stopPropagation();
          setLeaving(true);
        }}
        className="absolute right-1.5 top-1.5 rounded p-0.5 text-white/50 hover:text-white"
      >
        <span aria-hidden="true" className="block text-sm leading-none">
          ×
        </span>
      </button>
      <span className="adv-toast-icon" aria-hidden="true">
        <span>{achievement.icon}</span>
      </span>
      <span className="min-w-0">
        <span className="adv-toast-head block">{TOAST_HEADS[frame]}</span>
        <span className="adv-toast-title block truncate">{achievement.title}</span>
        <span className="block text-xs text-white/60">{achievement.description}</span>
      </span>
    </div>
  );
}

// Lives inside .outpost-frame (a `position: relative` pane), not the
// viewport — anchored to the pane's own bottom edge so it only ever shows
// over the Outpost itself, scrolls away with it, and never floats over the
// rest of the page. Rendered oldest-to-newest with the newest on top: the
// array itself is oldest-first (unlock() appends), so it's reversed here
// rather than changed at the source, since every other consumer of
// `toasts` (there are none yet, but the shape is shared) expects
// chronological order.
export default function AchievementToastStack() {
  const { toasts, dismissToast, dismissAllToasts } = useAchievements();

  if (toasts.length === 0) return null;

  const newestOnTop = [...toasts].reverse();

  return (
    <div
      role="status"
      aria-live="polite"
      className="pointer-events-none absolute inset-x-0 bottom-4 z-50 flex flex-col items-center gap-2 px-3"
    >
      {toasts.length > 1 && (
        <button
          type="button"
          onClick={dismissAllToasts}
          className="pointer-events-auto rounded-full border border-white/15 bg-black/40 px-3 py-1 text-[11px] font-semibold text-white/70 shadow hover:text-white"
        >
          Dismiss all ({toasts.length})
        </button>
      )}
      {newestOnTop.map((toast) => (
        <div key={toast.instanceId} className="pointer-events-auto">
          <Toast toast={toast} onRemove={dismissToast} />
        </div>
      ))}
    </div>
  );
}
