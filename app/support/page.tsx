import type { Metadata } from "next";
import Link from "next/link";
import Reveal from "@/components/Reveal";
import LinkCard from "@/components/LinkCard";
import HeartIcon from "@/components/icons/HeartIcon";
import KofiIcon from "@/components/icons/KofiIcon";
import RevolutIcon from "@/components/icons/RevolutIcon";
import {
  discordInviteUrl,
  githubRepoUrl,
  kofiUrl,
  revolutUrl,
} from "@/lib/site-config";

export const metadata: Metadata = {
  title: "Support BTWR",
  description:
    "BTW: Remastered and The Outpost are free, made in our spare time. If you've enjoyed them, here's how you can help keep them going.",
  alternates: { canonical: "/support" },
};

function ExternalLink({ href, children }: { href: string | null; children: React.ReactNode }) {
  if (!href) return <>{children}</>;
  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      className="font-semibold text-glow underline"
    >
      {children}
    </a>
  );
}

export default function SupportPage() {
  return (
    <div className="mx-auto max-w-3xl px-6 py-16">
      <div>
        <h1 className="flex items-center gap-3 font-heading text-3xl font-extrabold tracking-wide text-chrome-dark dark:text-chrome">
          <HeartIcon className="h-7 w-7 shrink-0 text-glow" />
          Support the project
        </h1>
        <p className="mt-4 text-slate-600 dark:text-slate-400">
          BTW: Remastered and The Outpost are made by a small team in our spare
          time: countless evenings of modding, testing, balancing and building.
          Everything here is free, and it always will be.
        </p>
        <p className="mt-3 text-slate-600 dark:text-slate-400">
          If you&apos;ve enjoyed the pack or lost an evening to The Outpost, and
          you&apos;d like to help us keep going, here are a few ways to do it.
          No pressure at all. We&apos;re just glad you&apos;re here.
        </p>
      </div>

      <Reveal className="mt-10">
        <h2 className="font-heading text-xl font-bold text-chrome-dark dark:text-chrome">
          Chip in
        </h2>
        <div className="mt-4 grid gap-4 sm:grid-cols-2">
          <LinkCard
            title="Ko-fi"
            description="A one-off tip, like buying us a coffee. Pay with PayPal or card."
            href={kofiUrl}
            icon={<KofiIcon className="h-full w-full" />}
          />
          <LinkCard
            title="Revolut"
            description="Send a tip straight to us through Revolut."
            href={revolutUrl}
            icon={<RevolutIcon className="h-full w-full" />}
          />
        </div>
      </Reveal>

      <Reveal className="mt-12">
        <h2 className="font-heading text-xl font-bold text-chrome-dark dark:text-chrome">
          Other ways to help
        </h2>
        <p className="mt-2 text-slate-600 dark:text-slate-400">
          Money isn&apos;t the only thing that keeps a project alive:
        </p>
        <ul className="mt-4 list-disc space-y-2 pl-6 text-slate-600 dark:text-slate-400">
          <li>
            Follow the pack on Modrinth. It helps other players find us.
          </li>
          <li>
            Report bugs and share ideas on{" "}
            <ExternalLink href={discordInviteUrl}>Discord</ExternalLink> or{" "}
            <ExternalLink href={githubRepoUrl}>GitHub</ExternalLink>.
          </li>
          <li>
            Tell a friend, or share a screenshot or video of your world.
          </li>
          <li>
            Contribute code, textures or translations on{" "}
            <ExternalLink href={githubRepoUrl}>GitHub</ExternalLink>.
          </li>
        </ul>
      </Reveal>

      <p className="mt-12 text-sm text-slate-600 dark:text-slate-400">
        Thank you. Just playing already means a lot.{" "}
        <Link href="/get-btwr" className="font-semibold text-glow underline">
          Get BTWR!
        </Link>
      </p>
    </div>
  );
}
