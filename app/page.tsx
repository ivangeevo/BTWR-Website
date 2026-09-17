import Link from "next/link";
import CountUp from "@/components/CountUp";
import HeroSlideshow from "@/components/HeroSlideshow";
import Reveal from "@/components/Reveal";
import Snowfall from "@/components/Snowfall";
import HubSection from "@/components/hub/HubSection";
import modsData from "@/data/mods.json";
import roadmapData from "@/data/roadmap.json";
import type { Mod, PackRelease } from "@/lib/mods";
import {
  enableRoadmap,
  siteDescription,
  siteName,
} from "@/lib/site-config";

type RoadmapItem = { status: string };

export default function Home() {
  const mods = modsData.mods;
  const totalMods = mods.length;
  const coreMods = mods.filter((m) => m.category === "core").length;
  const miscMods = mods.filter((m) => m.category === "misc").length;
  const outdatedMods = mods.filter((m) => m.isOutdated).length;

  const roadmapItems = roadmapData.items as RoadmapItem[];
  const doneCount = roadmapItems.filter((i) => i.status === "Done").length;
  const roadmapPercent =
    roadmapItems.length > 0
      ? Math.round((doneCount / roadmapItems.length) * 100)
      : 0;

  return (
    <>
      <div className="relative isolate flex min-h-[76.5vh] items-center justify-center overflow-hidden bg-chrome-dark px-6 text-center">
        <HeroSlideshow />
        <div className="absolute inset-0 -z-10 bg-gradient-to-b from-chrome-dark/70 via-chrome-dark/50 to-chrome-dark/90" />
        <Snowfall />

        <div className="relative mx-auto max-w-3xl py-[5.4rem]">
          <h1 className="title-shimmer font-heading text-6xl font-extrabold tracking-wide sm:text-7xl">
            {siteName}
          </h1>
          <p className="mx-auto mt-6 max-w-xl text-white/90">
            {siteDescription}
          </p>

          <div className="mt-10 flex flex-wrap justify-center gap-4">
            <Link
              href="/mods"
              className="btn-glow rounded-lg bg-white px-6 py-3 font-semibold text-chrome-dark"
            >
              Explore the Modpack
            </Link>
            <Link
              href="/community"
              className="btn-glow rounded-lg border border-white/60 px-6 py-3 font-semibold text-white hover:bg-white/10"
            >
              Join the Community
            </Link>
          </div>

          <div className="mt-4 flex justify-center">
            <Link
              href="/get-btwr"
              className="btn-glow btn-gradient rounded-lg px-8 py-3 font-semibold text-white"
            >
              Get BTWR!
            </Link>
          </div>
        </div>
      </div>

      <HubSection
        mods={modsData.mods as Mod[]}
        packReleases={modsData.packReleases as PackRelease[]}
      />

      <Reveal className="mx-auto max-w-4xl px-6 py-16">
        <div
          className={`grid grid-cols-2 gap-6 text-center ${enableRoadmap ? "sm:grid-cols-4" : "sm:grid-cols-3"}`}
        >
          <div>
            <p className="font-heading text-4xl font-bold text-chrome-dark dark:text-chrome">
              <CountUp target={totalMods} />
            </p>
            <p className="mt-1 text-sm text-slate-600 dark:text-slate-400">
              Mods included
            </p>
          </div>
          <div>
            <p className="font-heading text-4xl font-bold text-chrome-dark dark:text-chrome">
              <CountUp target={coreMods} />
            </p>
            <p className="mt-1 text-sm text-slate-600 dark:text-slate-400">
              Core mods
            </p>
          </div>
          <div>
            <p className="font-heading text-4xl font-bold text-chrome-dark dark:text-chrome">
              <CountUp target={miscMods} />
            </p>
            <p className="mt-1 text-sm text-slate-600 dark:text-slate-400">
              Misc mods
            </p>
          </div>
          {enableRoadmap && (
            <div>
              <p className="font-heading text-4xl font-bold text-chrome-dark dark:text-chrome">
                <CountUp target={roadmapPercent} suffix="%" />
              </p>
              <p className="mt-1 text-sm text-slate-600 dark:text-slate-400">
                Roadmap complete
              </p>
            </div>
          )}
        </div>
      </Reveal>

      <Reveal className="mx-auto max-w-5xl px-6 pb-24">
        <div
          className={`grid gap-6 ${enableRoadmap ? "sm:grid-cols-2 lg:grid-cols-4" : "sm:grid-cols-3"}`}
        >
          {enableRoadmap && (
            <Link
              href="/roadmap"
              className="card-glow block rounded-xl border border-slate-200 p-6 dark:border-slate-700"
            >
              <h2 className="font-heading text-xl font-bold text-chrome-dark dark:text-chrome">
                Roadmap
              </h2>
              <p className="mt-2 text-sm text-slate-600 dark:text-slate-400">
                {roadmapPercent}% complete — see what&apos;s done, in
                progress, and planned.
              </p>
            </Link>
          )}
          <Link
            href="/mods"
            className="card-glow block rounded-xl border border-slate-200 p-6 dark:border-slate-700"
          >
            <h2 className="font-heading text-xl font-bold text-chrome-dark dark:text-chrome">
              Mods
            </h2>
            <p className="mt-2 text-sm text-slate-600 dark:text-slate-400">
              {totalMods} mods, {outdatedMods} with updates available.
            </p>
          </Link>
          <Link
            href="/community"
            className="card-glow block rounded-xl border border-slate-200 p-6 dark:border-slate-700"
          >
            <h2 className="font-heading text-xl font-bold text-chrome-dark dark:text-chrome">
              Community
            </h2>
            <p className="mt-2 text-sm text-slate-600 dark:text-slate-400">
              Discord, GitHub, and how to get involved.
            </p>
          </Link>
          <Link
            href="/get-btwr"
            className="card-glow block rounded-xl border border-slate-200 p-6 dark:border-slate-700"
          >
            <h2 className="font-heading text-xl font-bold text-chrome-dark dark:text-chrome">
              Get BTWR!
            </h2>
            <p className="mt-2 text-sm text-slate-600 dark:text-slate-400">
              Step-by-step instructions to install the modpack.
            </p>
          </Link>
        </div>
      </Reveal>
    </>
  );
}
