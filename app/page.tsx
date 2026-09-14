import Link from "next/link";
import CountUp from "@/components/CountUp";
import Reveal from "@/components/Reveal";
import Snowfall from "@/components/Snowfall";
import modsData from "@/data/mods.json";
import roadmapData from "@/data/roadmap.json";
import { siteDescription, siteName, siteTagline } from "@/lib/site-config";

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
      <div className="relative isolate flex min-h-[85vh] items-center justify-center overflow-hidden bg-chrome-dark px-6 text-center">
        <div
          className="absolute inset-0 -z-20 bg-cover bg-center"
          style={{ backgroundImage: "url(/hero1.webp)" }}
        />
        <div className="absolute inset-0 -z-10 bg-gradient-to-b from-chrome-dark/70 via-chrome-dark/50 to-chrome-dark/90" />
        <Snowfall />

        <div className="relative mx-auto max-w-3xl py-24">
          <h1 className="title-shimmer font-heading text-6xl font-extrabold tracking-wide sm:text-7xl">
            {siteName}
          </h1>
          <p className="mt-3 text-xl font-medium text-frost">{siteTagline}</p>
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
        </div>
      </div>

      <Reveal className="mx-auto max-w-4xl px-6 py-16">
        <div className="grid grid-cols-2 gap-6 text-center sm:grid-cols-4">
          <div>
            <p className="font-heading text-4xl font-bold text-chrome-dark">
              <CountUp target={totalMods} />
            </p>
            <p className="mt-1 text-sm text-slate-600">Mods included</p>
          </div>
          <div>
            <p className="font-heading text-4xl font-bold text-chrome-dark">
              <CountUp target={coreMods} />
            </p>
            <p className="mt-1 text-sm text-slate-600">Core mods</p>
          </div>
          <div>
            <p className="font-heading text-4xl font-bold text-chrome-dark">
              <CountUp target={miscMods} />
            </p>
            <p className="mt-1 text-sm text-slate-600">Misc mods</p>
          </div>
          <div>
            <p className="font-heading text-4xl font-bold text-chrome-dark">
              <CountUp target={roadmapPercent} suffix="%" />
            </p>
            <p className="mt-1 text-sm text-slate-600">Roadmap complete</p>
          </div>
        </div>
      </Reveal>

      <Reveal className="mx-auto max-w-5xl px-6 pb-24">
        <div className="grid gap-6 sm:grid-cols-3">
          <Link
            href="/roadmap"
            className="card-glow block rounded-xl border border-slate-200 p-6"
          >
            <h2 className="font-heading text-xl font-bold text-chrome-dark">
              Roadmap
            </h2>
            <p className="mt-2 text-sm text-slate-600">
              {roadmapPercent}% complete — see what&apos;s done, in progress,
              and planned.
            </p>
          </Link>
          <Link
            href="/mods"
            className="card-glow block rounded-xl border border-slate-200 p-6"
          >
            <h2 className="font-heading text-xl font-bold text-chrome-dark">
              Mods
            </h2>
            <p className="mt-2 text-sm text-slate-600">
              {totalMods} mods, {outdatedMods} with updates available.
            </p>
          </Link>
          <Link
            href="/community"
            className="card-glow block rounded-xl border border-slate-200 p-6"
          >
            <h2 className="font-heading text-xl font-bold text-chrome-dark">
              Community
            </h2>
            <p className="mt-2 text-sm text-slate-600">
              Discord, GitHub, and how to install the pack.
            </p>
          </Link>
        </div>
      </Reveal>
    </>
  );
}
