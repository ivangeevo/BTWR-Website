import Link from "next/link";
import Reveal from "@/components/Reveal";
import { discordInviteUrl, githubRepoUrl } from "@/lib/site-config";

function LinkCard({
  title,
  description,
  href,
}: {
  title: string;
  description: string;
  href: string | null;
}) {
  if (!href) {
    return (
      <div className="rounded-lg border border-dashed border-slate-300 bg-slate-50 px-5 py-4 opacity-70 dark:border-slate-600 dark:bg-slate-800/50">
        <h3 className="font-semibold text-slate-700 dark:text-slate-300">
          {title}
        </h3>
        <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
          {description}
        </p>
        <p className="mt-2 text-xs font-medium uppercase tracking-wide text-amber-700 dark:text-amber-400">
          Coming soon — link not added yet
        </p>
      </div>
    );
  }
  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      className="card-glow block rounded-lg border border-chrome-dark px-5 py-4 hover:bg-chrome-light dark:border-chrome dark:hover:bg-slate-800"
    >
      <h3 className="font-semibold text-chrome-dark dark:text-chrome">
        {title}
      </h3>
      <p className="mt-1 text-sm text-slate-600 dark:text-slate-400">
        {description}
      </p>
    </a>
  );
}

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

      <Reveal className="mt-8 grid gap-4 sm:grid-cols-2">
        <LinkCard
          title="Discord"
          description="Chat with the community, get support, and follow updates."
          href={discordInviteUrl}
        />
        <LinkCard
          title="GitHub"
          description="Source code, issue tracker, and contribution guide."
          href={githubRepoUrl}
        />
      </Reveal>

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
