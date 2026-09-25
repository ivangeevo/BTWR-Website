"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { isPhoneDevice } from "./device";
import DesktopOnlyNotice from "./DesktopOnlyNotice";
import { formatInsight } from "./engine/economy";
import { queueSecret, readEnginePublic, readOutpostEnabled, readOutpostSwitch } from "./engine/bridge-storage";
import type { EnginePublic } from "./engine/types";
import OutpostCorners from "./OutpostCorners";

// Where the Outpost used to sit on the homepage: now just a small doorway to
// its own page (/outpost), with a glimpse of how the Engine is doing. Hidden
// until the Outpost is switched on; on a phone that switched it on, it says
// why there's nothing to open. It also keeps the "Rope & Grapple" secret
// (scroll the homepage from top to bottom) alive now that the Outpost has
// moved off this page: the find is queued for the Outpost to unlock.
const SCROLL_BOTTOM_PX = 4;

export default function OutpostTeaser() {
  const [view, setView] = useState<"hidden" | "phone" | "on">("hidden");
  const [pub, setPub] = useState<EnginePublic | null>(null);

  useEffect(() => {
    if (readOutpostEnabled()) {
      setView("on");
      setPub(readEnginePublic());
    } else if (isPhoneDevice() && readOutpostSwitch()) {
      setView("phone");
    }
  }, []);

  useEffect(() => {
    if (view !== "on") return;
    function onScroll() {
      const root = document.documentElement;
      if (window.innerHeight + window.scrollY >= root.scrollHeight - SCROLL_BOTTOM_PX) {
        queueSecret("rope-grapple");
        window.removeEventListener("scroll", onScroll);
      }
    }
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, [view]);

  if (view === "hidden") return null;
  if (view === "phone") {
    return (
      <div className="mx-auto max-w-3xl px-6 pt-12">
        <DesktopOnlyNotice />
      </div>
    );
  }

  return (
    <div className="outpost-materialize mx-auto max-w-3xl px-6 pt-12">
      <div className="outpost-zone overflow-hidden rounded-xl">
        <div className="outpost-frame relative">
          <OutpostCorners />
          <div className="flex flex-wrap items-center justify-between gap-4 px-5 py-4">
            <div className="min-w-0">
              <span className="outpost-status-tag">
                <span className="outpost-status-dot outpost-status-dot-online" aria-hidden="true" />
                Outpost Online
              </span>
              <p className="mt-2 font-heading text-xl font-extrabold tracking-wide text-white">The Outpost</p>
              <p className="mt-0.5 text-sm text-slate-400">
                {pub ? (
                  <>
                    {pub.title} · {formatInsight(pub.insight)} insight
                    {pub.ips > 0 ? ` · ${formatInsight(pub.ips)}/s` : ""}
                  </>
                ) : (
                  "Something in the workshop is waiting to think."
                )}
              </p>
            </div>
            <Link
              href="/outpost"
              className="btn-glow shrink-0 rounded-lg border border-[var(--outpost-accent)] px-5 py-2.5 text-sm font-semibold text-[var(--outpost-accent)] hover:bg-[var(--outpost-accent-soft)]"
            >
              Enter the Outpost {"→"}
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
