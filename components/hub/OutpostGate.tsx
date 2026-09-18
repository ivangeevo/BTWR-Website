"use client";

import { useEffect, useState } from "react";
import SectionDivider from "@/components/SectionDivider";
import type { Mod, PackRelease } from "@/lib/mods";
import HubSection from "./HubSection";
import { isOutpostEnabled } from "./hub-storage";

// The Outpost is off by default and stays off the homepage entirely — no
// section, no dividers, nothing — until turned on from the Community page's
// control panel. Default to hidden (matches server render) and only reveal
// after checking localStorage on mount, so there's no hydration mismatch.
export default function OutpostGate({
  mods,
  packReleases,
}: {
  mods: Mod[];
  packReleases: PackRelease[];
}) {
  const [enabled, setEnabled] = useState(false);

  useEffect(() => {
    setEnabled(isOutpostEnabled());
  }, []);

  if (!enabled) return null;

  return (
    <div className="outpost-materialize">
      <SectionDivider />
      <HubSection mods={mods} packReleases={packReleases} />
      <SectionDivider />
    </div>
  );
}
