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
          Community &amp; Download
        </h1>
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

      <Reveal className="mt-12">
        <section>
          <h2 className="text-xl font-bold text-slate-900 dark:text-slate-100">
            How to Install
          </h2>
          <ol className="mt-4 list-decimal space-y-2 pl-5 text-slate-700 dark:text-slate-300">
            <li>Install a Minecraft launcher that supports modpacks (e.g. Prism Launcher, CurseForge, or Modrinth App).</li>
            <li>Download the BTWR modpack file (link coming soon).</li>
            <li>Import the modpack file into your launcher, or extract it into a new instance folder.</li>
            <li>Make sure the instance is set to Minecraft 1.21.1 with the required mod loader.</li>
            <li>Launch the instance and enjoy!</li>
          </ol>
          <p className="mt-4 rounded-md border border-amber-300 bg-amber-50 px-4 py-2 text-sm text-amber-800 dark:border-amber-800 dark:bg-amber-950 dark:text-amber-300">
            Download link coming soon — update this page once the modpack file
            is published.
          </p>
        </section>
      </Reveal>
    </div>
  );
}
