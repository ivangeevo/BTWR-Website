// A tiny external store for the Engine's ticking numbers — insight climbing
// every second must never be React state in the Outpost's providers (every
// commit re-renders the whole Outpost). Components read it through
// useEngineLive(selector), backed by useSyncExternalStore.
import { useSyncExternalStore } from "react";

export type LiveSnapshot = { insight: number; ips: number; corePU: number; at: number };

export class LiveStore {
  private snap: LiveSnapshot = { insight: 0, ips: 0, corePU: 0, at: 0 };
  private listeners = new Set<() => void>();

  subscribe = (fn: () => void) => {
    this.listeners.add(fn);
    return () => {
      this.listeners.delete(fn);
    };
  };

  get = () => this.snap;

  set(next: LiveSnapshot) {
    if (
      next.insight === this.snap.insight &&
      next.ips === this.snap.ips &&
      next.corePU === this.snap.corePU
    ) {
      return;
    }
    this.snap = next;
    for (const fn of this.listeners) fn();
  }
}

const SERVER_SNAPSHOT: LiveSnapshot = { insight: 0, ips: 0, corePU: 0, at: 0 };

export function useLive<T>(store: LiveStore, select: (s: LiveSnapshot) => T): T {
  return useSyncExternalStore(
    store.subscribe,
    () => select(store.get()),
    () => select(SERVER_SNAPSHOT)
  );
}
