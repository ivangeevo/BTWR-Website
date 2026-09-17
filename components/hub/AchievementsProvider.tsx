"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
} from "react";
import type { AchievementId } from "./achievements-catalog";
import {
  applyVisit,
  defaultState,
  loadState,
  saveState,
  type HubState,
  type QuizStats,
} from "./hub-storage";

export type ToastInstance = { instanceId: string; achievementId: AchievementId };

type AchievementsContextValue = {
  mounted: boolean;
  unlocked: Set<AchievementId>;
  unlock: (id: AchievementId) => void;
  toasts: ToastInstance[];
  dismissToast: (instanceId: string) => void;
  quiz: QuizStats;
  updateQuiz: (updater: (prev: QuizStats) => QuizStats) => void;
};

const AchievementsContext = createContext<AchievementsContextValue | null>(null);

// A classic arrow-key input gesture, not referred to by its usual nickname
// anywhere in this codebase or its UI copy.
const SECRET_SEQUENCE = [
  "ArrowUp",
  "ArrowUp",
  "ArrowDown",
  "ArrowDown",
  "ArrowLeft",
  "ArrowRight",
  "ArrowLeft",
  "ArrowRight",
];

export function AchievementsProvider({ children }: { children: React.ReactNode }) {
  const [state, setState] = useState<HubState>(defaultState());
  const [mounted, setMounted] = useState(false);
  const [toasts, setToasts] = useState<ToastInstance[]>([]);
  const unlockedRef = useRef<Set<AchievementId>>(new Set());
  const keyBufferRef = useRef<string[]>([]);

  const unlock = useCallback((id: AchievementId) => {
    if (unlockedRef.current.has(id)) return;
    unlockedRef.current.add(id);
    const timestamp = new Date().toISOString();
    setState((prev) => {
      const next = { ...prev, unlocked: { ...prev.unlocked, [id]: timestamp } };
      saveState(next);
      return next;
    });
    setToasts((prev) => [
      ...prev,
      { instanceId: `${id}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`, achievementId: id },
    ]);
  }, []);

  const dismissToast = useCallback((instanceId: string) => {
    setToasts((prev) => prev.filter((t) => t.instanceId !== instanceId));
  }, []);

  const updateQuiz = useCallback((updater: (prev: QuizStats) => QuizStats) => {
    setState((prev) => {
      const next = { ...prev, quiz: updater(prev.quiz) };
      saveState(next);
      return next;
    });
  }, []);

  // Load persisted state once on mount, apply the day-streak, and fire the
  // visit-related achievements. Runs after first paint on purpose — see
  // HUB_PLAN.md's "mount-then-load" reasoning.
  useEffect(() => {
    const loaded = loadState();
    const visits = applyVisit(loaded.visits);
    const next = { ...loaded, visits };
    unlockedRef.current = new Set(Object.keys(next.unlocked) as AchievementId[]);
    saveState(next);
    setState(next);
    setMounted(true);

    unlock("first-visit");
    if (visits.streakDays >= 3) unlock("streak-3-day");
    // `unlock` is stable (see its own useCallback with an empty dep array).
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Easter egg 1: the arrow-key gesture. Only listens while this pane is
  // mounted, matching the rest of the hub's "everything lives in the pane"
  // scope.
  useEffect(() => {
    function onKeyDown(e: KeyboardEvent) {
      const target = e.target as HTMLElement | null;
      if (target && /^(input|textarea|select)$/i.test(target.tagName)) return;

      const buffer = [...keyBufferRef.current, e.key].slice(-SECRET_SEQUENCE.length);
      keyBufferRef.current = buffer;
      if (
        buffer.length === SECRET_SEQUENCE.length &&
        buffer.every((k, i) => k === SECRET_SEQUENCE[i])
      ) {
        keyBufferRef.current = [];
        unlock("secret-sequence");
      }
    }
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [unlock]);

  // Easter egg 2: clicking the header wolf logo. Header.tsx dispatches this
  // event itself once it sees enough rapid clicks — it never touches
  // localStorage directly, this provider is the single writer.
  useEffect(() => {
    function onSecretLogo() {
      unlock("secret-logo-clicks");
    }
    window.addEventListener("btwr-secret-logo", onSecretLogo);
    return () => window.removeEventListener("btwr-secret-logo", onSecretLogo);
  }, [unlock]);

  const value: AchievementsContextValue = {
    mounted,
    unlocked: unlockedRef.current,
    unlock,
    toasts,
    dismissToast,
    quiz: state.quiz,
    updateQuiz,
  };

  return (
    <AchievementsContext.Provider value={value}>{children}</AchievementsContext.Provider>
  );
}

export function useAchievements() {
  const ctx = useContext(AchievementsContext);
  if (!ctx) {
    throw new Error("useAchievements must be used within AchievementsProvider");
  }
  return ctx;
}
