"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useRef, useState } from "react";
import ThemeToggle from "@/components/ThemeToggle";
import { enableRoadmap, siteName } from "@/lib/site-config";

const navLinks = [
  { href: "/", label: "Home" },
  { href: "/roadmap", label: "Roadmap", hidden: !enableRoadmap },
  { href: "/mods", label: "Mods" },
  { href: "/community", label: "Community" },
].filter((link) => !link.hidden);

const getBtwrLink = { href: "/get-btwr", label: "Get BTWR!" };

export default function Header() {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const logoClicksRef = useRef<number[]>([]);

  // A small easter egg for the homepage hub: click the logo 5x quickly and
  // it notices. Doesn't touch storage itself — just tells whoever's
  // listening (see components/hub/AchievementsProvider.tsx).
  function handleLogoClick() {
    setOpen(false);
    const now = Date.now();
    const recent = [...logoClicksRef.current, now].filter((t) => now - t < 2000);
    logoClicksRef.current = recent;
    if (recent.length >= 5) {
      logoClicksRef.current = [];
      window.dispatchEvent(new Event("btwr-secret-logo"));
    }
  }

  return (
    <header className="border-b-[5px] border-chrome bg-chrome-light dark:bg-slate-900">
      <div className="mx-auto flex max-w-5xl items-center justify-between px-6 py-4">
        <div className="flex items-center gap-3">
          <ThemeToggle />
          <Link
            href="/"
            className="flex items-center gap-3"
            onClick={handleLogoClick}
          >
            <Image
              src="/logos/btwr-logo-square.png"
              alt={`${siteName} logo`}
              width={40}
              height={40}
              className="rounded-xl"
            />
            <span className="font-heading text-lg font-bold tracking-wide text-chrome-dark dark:text-chrome">
              {siteName}
            </span>
          </Link>
        </div>

        <nav className="hidden gap-6 sm:flex">
          {navLinks.map((link) => {
            const active = pathname === link.href;
            return (
              <Link
                key={link.href}
                href={link.href}
                className={`relative py-1 text-sm font-medium transition-colors ${
                  active
                    ? "text-glow"
                    : "text-chrome-dark hover:text-glow dark:text-chrome"
                }`}
              >
                {link.label}
                <span
                  className={`absolute -bottom-1 left-0 h-0.5 w-full origin-left scale-x-0 rounded-full bg-glow transition-transform duration-300 ${
                    active ? "scale-x-100" : ""
                  }`}
                />
              </Link>
            );
          })}
          <Link
            href={getBtwrLink.href}
            className="btn-glow btn-gradient rounded-md px-4 py-1.5 text-sm font-semibold text-white"
          >
            {getBtwrLink.label}
          </Link>
        </nav>

        <button
          type="button"
          onClick={() => setOpen((o) => !o)}
          className="flex h-9 w-9 items-center justify-center rounded-md sm:hidden"
          aria-label="Toggle menu"
          aria-expanded={open}
        >
          <div className="flex flex-col gap-1.5">
            <span
              className={`h-0.5 w-6 bg-chrome-dark transition-transform duration-200 dark:bg-chrome ${
                open ? "translate-y-2 rotate-45" : ""
              }`}
            />
            <span
              className={`h-0.5 w-6 bg-chrome-dark transition-opacity duration-200 dark:bg-chrome ${
                open ? "opacity-0" : ""
              }`}
            />
            <span
              className={`h-0.5 w-6 bg-chrome-dark transition-transform duration-200 dark:bg-chrome ${
                open ? "-translate-y-2 -rotate-45" : ""
              }`}
            />
          </div>
        </button>
      </div>

      {open && (
        <nav className="flex flex-col gap-1 border-t border-chrome bg-chrome-light px-6 py-4 dark:bg-slate-900 sm:hidden">
          {navLinks.map((link) => {
            const active = pathname === link.href;
            return (
              <Link
                key={link.href}
                href={link.href}
                onClick={() => setOpen(false)}
                className={`rounded-md px-3 py-2 text-sm font-medium ${
                  active
                    ? "bg-white text-glow dark:bg-slate-800"
                    : "text-chrome-dark dark:text-chrome"
                }`}
              >
                {link.label}
              </Link>
            );
          })}
          <Link
            href={getBtwrLink.href}
            onClick={() => setOpen(false)}
            className="btn-gradient mt-1 rounded-md px-3 py-2 text-center text-sm font-semibold text-white"
          >
            {getBtwrLink.label}
          </Link>
        </nav>
      )}
    </header>
  );
}
