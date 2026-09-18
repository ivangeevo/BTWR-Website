import DiscordIcon from "@/components/icons/DiscordIcon";
import GithubIcon from "@/components/icons/GithubIcon";
import { discordInviteUrl, githubRepoUrl, siteName } from "@/lib/site-config";

function FooterLink({
  href,
  label,
  icon,
}: {
  href: string | null;
  label: string;
  icon: React.ReactNode;
}) {
  if (!href) {
    return (
      <span
        className="flex items-center gap-1.5 text-sm text-chrome-dark/50 dark:text-chrome/50"
        title="Coming soon"
      >
        <span className="h-4 w-4 shrink-0">{icon}</span>
        {label} (coming soon)
      </span>
    );
  }
  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      className="flex items-center gap-1.5 text-sm text-chrome-dark transition-colors hover:text-glow dark:text-chrome"
    >
      <span className="h-4 w-4 shrink-0">{icon}</span>
      {label}
    </a>
  );
}

export default function Footer() {
  return (
    <footer className="border-t-[5px] border-chrome bg-chrome-light dark:bg-slate-900">
      <div className="mx-auto flex max-w-5xl flex-col items-center gap-2 px-6 py-6 text-center">
        <div className="flex gap-6">
          <FooterLink
            href={discordInviteUrl}
            label="Discord"
            icon={<DiscordIcon className="h-full w-full" />}
          />
          <FooterLink
            href={githubRepoUrl}
            label="GitHub"
            icon={<GithubIcon className="h-full w-full" />}
          />
        </div>
        <p className="text-xs text-chrome-dark/70 dark:text-chrome/70">
          &copy; {new Date().getFullYear()} {siteName}
        </p>
      </div>
    </footer>
  );
}
