"use client";

import { useEffect, useRef, useState } from "react";
import { useAchievements } from "./AchievementsProvider";
import { MODULES, type ModuleId } from "./module-registry";

const NOTICE_MS = 5000;
const CARDS_MS = 6000;

// Generic replacement for the old Tier2Reveal (hardcoded to the tier1->2
// transition only, with its own full-screen scrim/flicker treatment) — fires
// a toned-down "Tier Unlocked" toast plus a "here's what's new" card popup
// for ANY forward tier transition, admin-defined tiers included, all reading
// as the same consistent ceremony. Never replays for a returning visitor
// already past a tier: prevRef starts null, so the first mounted render is
// never itself treated as a transition even if already unlocked by then —
// the same guard Tier2Reveal used to rely on. Only counts FORWARD crossings
// (new tier's threshold > the previous one's), guarding against weirdness if
// an admin edits thresholds live mid-session.
export default function TierRevealNotice() {
  const { mounted, currentTierId, tiers, tierTips, moduleTierId } = useAchievements();
  const [notice, setNotice] = useState<{ name: string; tip: string | null } | null>(null);
  const [newCards, setNewCards] = useState<{ id: ModuleId; label: string }[] | null>(null);
  const prevTierRef = useRef<string | null>(null);

  useEffect(() => {
    if (!mounted) return;
    const prev = prevTierRef.current;
    prevTierRef.current = currentTierId;
    if (prev === null || prev === currentTierId) return;

    const prevThreshold = tiers.find((t) => t.id === prev)?.threshold ?? -Infinity;
    const nextTier = tiers.find((t) => t.id === currentTierId);
    if (!nextTier || nextTier.threshold <= prevThreshold) return;

    setNotice({ name: nextTier.name, tip: tierTips[0] ?? null });
    const noticeTimer = setTimeout(() => setNotice(null), NOTICE_MS);

    // A module only ever "newly" appears exactly when the tier it's assigned
    // to is the one just crossed — no before/after set-diffing needed.
    const cards = MODULES.filter((m) => moduleTierId(m.id) === currentTierId).map((m) => ({
      id: m.id,
      label: m.label,
    }));
    let cardsTimer: ReturnType<typeof setTimeout> | undefined;
    if (cards.length > 0) {
      setNewCards(cards);
      cardsTimer = setTimeout(() => setNewCards(null), CARDS_MS);
    }

    return () => {
      clearTimeout(noticeTimer);
      if (cardsTimer) clearTimeout(cardsTimer);
    };
  }, [mounted, currentTierId, tiers, tierTips, moduleTierId]);

  if (!notice && !newCards) return null;

  return (
    <div
      role="status"
      aria-live="polite"
      className="pointer-events-none fixed left-4 top-4 z-50 flex flex-col gap-2"
    >
      {notice && (
        <div className="hub-toast tier-reveal-toast pointer-events-auto w-64 rounded-lg px-4 py-3 text-left">
          <span className="tier-reveal-toast-tag">Tier Unlocked</span>
          <p className="mt-1.5 font-heading text-sm font-bold text-white">{notice.name}</p>
          {notice.tip && <p className="mt-1 text-xs text-white/60">{notice.tip}</p>}
        </div>
      )}
      {newCards && (
        <div className="hub-toast tier-reveal-toast pointer-events-auto w-64 rounded-lg px-4 py-3 text-left">
          <span className="tier-reveal-toast-tag">New</span>
          <ul className="mt-1.5 space-y-1">
            {newCards.map((c) => (
              <li key={c.id} className="outpost-materialize text-xs font-semibold text-white">
                {c.label}
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
