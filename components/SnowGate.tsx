"use client";

import { useEffect, useState } from "react";
import { isSnowActive } from "./hub/snow-effect";
import Snowfall from "./Snowfall";
import SnowPile from "./SnowPile";

// Defaults to hidden (matching isSnowActive's own no-window fallback) since
// snow is now a purchasable Upgrades-shop unlock ("Winter Weather") rather
// than an always-on default — only shows once the client confirms the
// visitor's actually bought it. Absolutely-positioned within the hero (see
// Snowfall/SnowPile), so toggling this after mount causes no layout shift
// either way. Re-checks periodically rather than once so a purchase made
// mid-session (or in another tab) takes effect without a reload — same
// reasoning as DayNightSky's own polling, just far less frequent since
// nothing here animates a live clock.
const RECHECK_MS = 3000;

export default function SnowGate() {
  const [active, setActive] = useState(false);

  useEffect(() => {
    setActive(isSnowActive());
    const id = window.setInterval(() => setActive(isSnowActive()), RECHECK_MS);
    return () => window.clearInterval(id);
  }, []);

  if (!active) return null;

  return (
    <>
      <Snowfall />
      <SnowPile />
    </>
  );
}
