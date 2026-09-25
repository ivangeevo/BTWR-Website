"use client";

import { formatInsight } from "../../economy";
import { useEngine } from "../EngineProvider";
import { useLive } from "../live-store";

// The clicker's big number — reads the external live store, so it ticks
// every second without re-rendering anything else in the Outpost.
export default function InsightCounter({ compact = false }: { compact?: boolean }) {
  const { store, e } = useEngine();
  const insight = useLive(store, (s) => (s.at === 0 ? e.insight : s.insight));
  const ips = useLive(store, (s) => s.ips);
  if (compact) {
    return (
      <span className="outpost-resource-chip" title="Insight — the Engine's thoughts">
        {"\u{1F4A1}"} {formatInsight(insight)}
      </span>
    );
  }
  return (
    <div className="engine-counter" aria-live="off">
      <span className="engine-counter-value" data-engine-target="counter">
        {"\u{1F4A1}"} {formatInsight(insight)}
      </span>
      {e.stage >= 3 && <span className="engine-counter-rate">{formatInsight(ips)} / sec</span>}
    </div>
  );
}
