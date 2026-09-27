"use client";

import { useEffect, useState } from "react";
import { useAchievements } from "./AchievementsProvider";
import Campfire, { CampfireStatus } from "./Campfire";
import CraftingCard, { CraftingStatus } from "./CraftingCard";
import Gathering, { GatheringStatus } from "./Gathering";
import ResourceToolStrip from "./ResourceToolStrip";
import TonightsSky, { useTonightsSkyShown } from "./TonightsSky";
import UpgradesPanel, { UpgradesStatus, useUpgradesShown } from "./UpgradesPanel";

// The Camp rail: Basecamp's always-on-screen column for survival work
// (HubSection.tsx). Stats & Materials sit at the top, always open, with
// Tonight's Sky fixed under them once it's bought (TonightsSky.tsx). Below,
// the Campfire, Gathering, Crafting and the Upgrades shop fold like an
// accordion — one open at a time, filling what height is left (and
// scrolling inside itself), so the rail itself never scrolls. A folded
// section's header still says what's going on in it (each card's *Status).
// Folded bodies stay mounted, just hidden, so a Chop or a Cook that's
// running carries on while another section is open.
//
// No stacking context on the rail itself (no transform, filter or z-index):
// the Campfire section, Stats and Tonight's Sky are lit above the gloom (.outpost-lit),
// which only works while nothing around them traps their z-index.

type SectionId = "campfire" | "gathering" | "crafting" | "upgrades";

const OPEN_KEY = "btwr:hub:camp-open:v1";
const SECTION_IDS: SectionId[] = ["campfire", "gathering", "crafting", "upgrades"];

// Which section is open, remembered per browser. A convenience only: with
// storage missing or blocked it starts on the Campfire.
function readOpen(): SectionId | null {
  try {
    const v = window.localStorage.getItem(OPEN_KEY);
    if (v === "none") return null;
    return SECTION_IDS.includes(v as SectionId) ? (v as SectionId) : "campfire";
  } catch {
    return "campfire";
  }
}

function writeOpen(id: SectionId | null) {
  try {
    window.localStorage.setItem(OPEN_KEY, id ?? "none");
  } catch {
    // Remembering the open section is a nicety.
  }
}

function Section({
  id,
  icon,
  title,
  status,
  open,
  onToggle,
  lit = false,
  statusWhenOpen = false,
  children,
}: {
  id: SectionId;
  icon: string;
  title: string;
  /** One line on what's going on inside, shown while folded. */
  status: React.ReactNode;
  open: boolean;
  onToggle: () => void;
  lit?: boolean;
  /** Keep the status up while open too, when the body doesn't repeat it. */
  statusWhenOpen?: boolean;
  children: React.ReactNode;
}) {
  const bodyId = `outpost-camp-${id}`;
  return (
    // data-module-id: a Eureka spark can land on the section, folded or not.
    <section
      data-module-id={id}
      aria-label={title}
      className={`outpost-panel outpost-camp-section rounded-xl ${open ? "outpost-camp-section-open" : ""} ${
        lit ? "outpost-lit" : ""
      }`}
    >
      <button
        type="button"
        onClick={onToggle}
        aria-expanded={open}
        aria-controls={bodyId}
        className="outpost-camp-header"
      >
        <span aria-hidden="true" className="text-base leading-none">
          {icon}
        </span>
        <h3 className="shrink-0 font-heading text-sm font-bold uppercase tracking-wider text-[var(--outpost-accent)]">
          {title}
        </h3>
        <span className="outpost-camp-status">{open && !statusWhenOpen ? null : status}</span>
        <span aria-hidden="true" className={`text-[0.6rem] text-white/50 transition-transform ${open ? "" : "-rotate-90"}`}>
          {"\u{25BC}"}
        </span>
      </button>
      <div id={bodyId} hidden={!open} data-outpost-scroll className="outpost-camp-body">
        {children}
      </div>
    </section>
  );
}

export function useCampRailShown(): boolean {
  const { isModuleRevealed } = useAchievements();
  const upgradesShown = useUpgradesShown();
  return (
    isModuleRevealed("resource-tool-strip") ||
    isModuleRevealed("campfire") ||
    isModuleRevealed("gathering") ||
    isModuleRevealed("crafting") ||
    upgradesShown
  );
}

export default function CampRail() {
  const { isModuleRevealed, gloomLevel } = useAchievements();
  const upgradesShown = useUpgradesShown();
  const skyShown = useTonightsSkyShown();
  const [open, setOpenState] = useState<SectionId | null>("campfire");
  // What's running inside, for the folded headers.
  const [cooking, setCooking] = useState(false);
  const [busy, setBusy] = useState<string | null>(null);

  useEffect(() => setOpenState(readOpen()), []);

  function setOpen(id: SectionId | null) {
    setOpenState(id);
    writeOpen(id);
  }

  // The gloom's falling with the fire out: bring the Campfire up.
  const gloomy = gloomLevel > 0;
  useEffect(() => {
    if (gloomy) setOpen("campfire");
  }, [gloomy]);

  const shown: Record<SectionId, boolean> = {
    campfire: isModuleRevealed("campfire"),
    gathering: isModuleRevealed("gathering"),
    crafting: isModuleRevealed("crafting"),
    upgrades: upgradesShown,
  };
  const toggle = (id: SectionId) => () => setOpen(open === id ? null : id);

  return (
    <aside aria-label="Camp" className="outpost-camp-rail">
      {isModuleRevealed("resource-tool-strip") && <ResourceToolStrip />}
      {skyShown && <TonightsSky />}
      {shown.campfire && (
        <Section
          id="campfire"
          icon={"\u{1F525}"}
          title="The Campfire"
          status={<CampfireStatus cooking={cooking} />}
          open={open === "campfire"}
          onToggle={toggle("campfire")}
          lit
        >
          <Campfire onCookingChange={setCooking} />
        </Section>
      )}
      {shown.gathering && (
        <Section
          id="gathering"
          icon={"\u{1FA93}"}
          title="Gathering"
          status={<GatheringStatus busy={busy} />}
          open={open === "gathering"}
          onToggle={toggle("gathering")}
        >
          <Gathering onBusyChange={setBusy} />
        </Section>
      )}
      {shown.crafting && (
        <Section
          id="crafting"
          icon={"\u{2692}\u{FE0F}"}
          title="Crafting"
          status={<CraftingStatus />}
          open={open === "crafting"}
          onToggle={toggle("crafting")}
        >
          <CraftingCard />
        </Section>
      )}
      {shown.upgrades && (
        <Section
          id="upgrades"
          icon={"\u{1F9E9}"}
          title="Upgrades"
          status={<UpgradesStatus />}
          open={open === "upgrades"}
          onToggle={toggle("upgrades")}
          statusWhenOpen
        >
          <UpgradesPanel />
        </Section>
      )}
    </aside>
  );
}
