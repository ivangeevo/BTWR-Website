import type { Metadata } from "next";
import Link from "next/link";
import Reveal from "@/components/Reveal";
import DiscordIcon from "@/components/icons/DiscordIcon";
import GithubIcon from "@/components/icons/GithubIcon";
import LinkCard from "@/components/LinkCard";
import OutpostControlPanel from "@/components/hub/OutpostControlPanel";
import { discordInviteUrl, githubRepoUrl } from "@/lib/site-config";

export const metadata: Metadata = {
  title: "Community",
  description:
    "Chat with other BTW: Remastered players, follow updates, and get involved on Discord and GitHub.",
  alternates: { canonical: "/community" },
};

export default function CommunityPage() {
  return (
    <div className="mx-auto max-w-3xl px-6 py-16">
      <div>
        <h1 className="font-heading text-3xl font-extrabold tracking-wide text-chrome-dark dark:text-chrome">
          Community
        </h1>
        <p className="mt-2 text-slate-600 dark:text-slate-400">
          Chat with other players, follow updates, and get involved.
        </p>
      </div>

      <div className="mt-10">
        <Reveal className="mt-4 grid gap-4 sm:grid-cols-2">
          <LinkCard
            title="Discord"
            description="Chat with the community, get support, and follow updates."
            href={discordInviteUrl}
            icon={<DiscordIcon className="h-full w-full" />}
          />
          <LinkCard
            title="GitHub"
            description="Source code, issue tracker, and contribution guide."
            href={githubRepoUrl}
            icon={<GithubIcon className="h-full w-full" />}
          />

        <h2 className="font-heading text-xl font-bold text-chrome-dark dark:text-chrome">
        Gadgets &amp; extensions
        </h2>
        
        <OutpostControlPanel />
        </Reveal>
      </div>

      <p className="mt-12 text-sm text-slate-600 dark:text-slate-400">
        Looking to install the modpack?{" "}
        <Link
          href="/get-btwr"
          className="font-semibold text-glow underline"
        >
          Get BTWR!
        </Link>
      </p>
    </div>
  );
}
