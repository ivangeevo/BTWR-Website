import Link from "next/link";
import FrostShimmer from "@/components/FrostShimmer";
import Reveal from "@/components/Reveal";
import { siteDescription, siteName, siteTagline } from "@/lib/site-config";

export default function Home() {
  return (
    <div className="relative overflow-hidden px-6 py-24 text-center">
      <div
        className="ambient-glow left-1/2 top-1/3 -z-10 h-72 w-72 -translate-x-1/2"
        aria-hidden="true"
      />
      <FrostShimmer />

      <div className="mx-auto max-w-3xl">
        <h1 className="font-heading text-5xl font-extrabold tracking-wide text-chrome-dark">
          {siteName}
        </h1>
        <p className="mt-2 text-xl text-slate-600">{siteTagline}</p>
        <p className="mx-auto mt-6 max-w-xl text-slate-700">
          {siteDescription}
        </p>

        <Reveal className="mt-10 flex flex-wrap justify-center gap-4">
          <Link
            href="/roadmap"
            className="btn-glow rounded-lg bg-chrome-dark px-5 py-3 font-medium text-white"
          >
            View Roadmap
          </Link>
          <Link
            href="/mods"
            className="btn-glow rounded-lg border border-chrome-dark px-5 py-3 font-medium text-chrome-dark hover:bg-chrome-light"
          >
            Mods List
          </Link>
          <Link
            href="/community"
            className="btn-glow rounded-lg border border-chrome-dark px-5 py-3 font-medium text-chrome-dark hover:bg-chrome-light"
          >
            Community &amp; Download
          </Link>
        </Reveal>
      </div>
    </div>
  );
}
