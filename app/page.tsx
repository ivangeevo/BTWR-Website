import Link from "next/link";
import { siteDescription, siteName, siteTagline } from "@/lib/site-config";

export default function Home() {
  return (
    <div className="mx-auto max-w-3xl px-6 py-16 text-center">
      <h1 className="text-4xl font-extrabold text-chrome-dark">{siteName}</h1>
      <p className="mt-2 text-xl text-slate-600">{siteTagline}</p>
      <p className="mx-auto mt-6 max-w-xl text-slate-700">{siteDescription}</p>

      <div className="mt-10 flex flex-wrap justify-center gap-4">
        <Link
          href="/roadmap"
          className="rounded-lg bg-chrome-dark px-5 py-3 font-medium text-white hover:bg-chrome-dark/90"
        >
          View Roadmap
        </Link>
        <Link
          href="/mods"
          className="rounded-lg border border-chrome-dark px-5 py-3 font-medium text-chrome-dark hover:bg-chrome-light"
        >
          Mods List
        </Link>
        <Link
          href="/community"
          className="rounded-lg border border-chrome-dark px-5 py-3 font-medium text-chrome-dark hover:bg-chrome-light"
        >
          Community &amp; Download
        </Link>
      </div>
    </div>
  );
}
