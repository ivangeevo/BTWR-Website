import { discordInviteUrl, githubRepoUrl, siteName } from "@/lib/site-config";

function FooterLink({
  href,
  label,
}: {
  href: string | null;
  label: string;
}) {
  if (!href) {
    return (
      <span
        className="text-sm text-chrome-dark/50 dark:text-chrome/50"
        title="Coming soon"
      >
        {label} (coming soon)
      </span>
    );
  }
  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      className="text-sm text-chrome-dark transition-colors hover:text-glow dark:text-chrome"
    >
      {label}
    </a>
  );
}

export default function Footer() {
  return (
    <footer className="border-t border-chrome bg-chrome-light dark:bg-slate-900">
      <div className="mx-auto flex max-w-5xl flex-col items-center gap-2 px-6 py-6 text-center">
        <div className="flex gap-6">
          <FooterLink href={discordInviteUrl} label="Discord" />
          <FooterLink href={githubRepoUrl} label="GitHub" />
        </div>
        <p className="text-xs text-chrome-dark/70 dark:text-chrome/70">
          &copy; {new Date().getFullYear()} {siteName}
        </p>
      </div>
    </footer>
  );
}
