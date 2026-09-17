"use client";

import { useEffect, useState } from "react";
import { ACHIEVEMENTS_BY_ID } from "./achievements-catalog";
import { useAchievements, type ToastInstance } from "./AchievementsProvider";

const AUTO_DISMISS_MS = 5000;
const LEAVE_ANIMATION_MS = 220;

function Toast({
  toast,
  onRemove,
}: {
  toast: ToastInstance;
  onRemove: (instanceId: string) => void;
}) {
  const [leaving, setLeaving] = useState(false);
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

  return (
    <button
      type="button"
      onClick={() => setLeaving(true)}
      className={`hub-toast flex w-72 items-start gap-3 rounded-lg px-4 py-3 text-left text-white shadow-lg ${
        leaving ? "leaving" : ""
      }`}
    >
      <span className="text-2xl leading-none">{achievement.icon}</span>
      <span className="min-w-0">
        <span className="block text-[10px] font-bold uppercase tracking-wider text-glow">
          Achievement Get!
        </span>
        <span className="block truncate font-heading text-sm font-bold">
          {achievement.title}
        </span>
        <span className="block text-xs text-white/70">{achievement.description}</span>
      </span>
    </button>
  );
}

export default function AchievementToastStack() {
  const { toasts, dismissToast } = useAchievements();

  if (toasts.length === 0) return null;

  return (
    <div
      role="status"
      aria-live="polite"
      className="pointer-events-none fixed top-4 right-4 z-50 flex flex-col gap-2"
    >
      {toasts.map((toast) => (
        <div key={toast.instanceId} className="pointer-events-auto">
          <Toast toast={toast} onRemove={dismissToast} />
        </div>
      ))}
    </div>
  );
}
