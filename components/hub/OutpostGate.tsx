"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import type { Mod, PackRelease } from "@/lib/mods";
import HubSection from "./HubSection";
import { isPhoneDevice } from "./device";
import DesktopOnlyNotice from "./DesktopOnlyNotice";
import { isOutpostEnabled } from "./hub-storage";

type Gate = "checking" | "phone" | "off" | "on";

// The /outpost page. The Outpost is off by default — until it's switched on
// from the Community page's control panel this only says how to turn it on
// (and on a phone, that it's desktop-only). Starts as "checking" (matches
// the server render) and decides after reading localStorage on mount, so
// there's no hydration mismatch.
export default function OutpostGate({
  mods,
  packReleases,
}: {
  mods: Mod[];
  packReleases: PackRelease[];
}) {
  const [gate, setGate] = useState<Gate>("checking");

  useEffect(() => {
    setGate(isPhoneDevice() ? "phone" : isOutpostEnabled() ? "on" : "off");
  }, []);

  if (gate === "on") return <HubSection mods={mods} packReleases={packReleases} />;
  if (gate === "checking") return <div className="min-h-[60vh]" aria-busy="true" />;

  return (
    <div className="mx-auto max-w-xl px-6 py-20 text-center">
      <h1 className="font-heading text-3xl font-extrabold tracking-wide text-chrome-dark dark:text-chrome">
        The Outpost
      </h1>
      {gate === "phone" ? (
        <div className="mt-6 text-left">
          <DesktopOnlyNotice />
        </div>
      ) : (
        <>
          <p className="mt-3 text-slate-600 dark:text-slate-400">
            The Outpost is switched off in this browser. Turn it on from the Community page to start playing.
          </p>
          <Link
            href="/community"
            className="btn-glow mt-6 inline-block rounded-lg border border-slate-300 px-5 py-2.5 text-sm font-semibold text-chrome-dark dark:border-slate-600 dark:text-chrome"
          >
            Go to the Community page
          </Link>
        </>
      )}
    </div>
  );
}
