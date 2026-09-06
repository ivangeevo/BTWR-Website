import Image from "next/image";
import Link from "next/link";
import { siteName } from "@/lib/site-config";

const navLinks = [
  { href: "/", label: "Home" },
  { href: "/roadmap", label: "Roadmap" },
  { href: "/mods", label: "Mods" },
  { href: "/community", label: "Community" },
];

export default function Header() {
  return (
    <header className="bg-chrome-light border-b border-chrome">
      <div className="mx-auto flex max-w-5xl items-center justify-between px-6 py-4">
        <Link href="/" className="flex items-center gap-3">
          <Image
            src="/logo.svg"
            alt={`${siteName} logo`}
            width={40}
            height={40}
            className="rounded"
          />
          <span className="text-lg font-bold text-chrome-dark">{siteName}</span>
        </Link>
        <nav className="flex gap-6">
          {navLinks.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className="text-sm font-medium text-chrome-dark hover:underline"
            >
              {link.label}
            </Link>
          ))}
        </nav>
      </div>
    </header>
  );
}
