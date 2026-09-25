"use client";

import { useEffect, useState } from "react";
import SectionDivider from "@/components/SectionDivider";
import type { Mod, PackRelease } from "@/lib/mods";
import HubSection from "./HubSection";
import { isPhoneDevice } from "./device";
import DesktopOnlyNotice from "./DesktopOnlyNotice";
import { isOutpostEnabled, loadState } from "./hub-storage";

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
  const [phoneNotice, setPhoneNotice] = useState(false);

  useEffect(() => {
    setEnabled(isOutpostEnabled());
    // Turned on in this browser, but this is a phone — say why it's missing.
    setPhoneNotice(isPhoneDevice() && loadState().enabled);
  }, []);

  if (phoneNotice) {
    return (
      <div className="mx-auto max-w-3xl px-6 py-8">
        <DesktopOnlyNotice />
      </div>
    );
  }

  if (!enabled) return null;

  return (
    <div className="outpost-materialize">
      <SectionDivider />
      <HubSection mods={mods} packReleases={packReleases} />
      <SectionDivider />
    </div>
  );
}
