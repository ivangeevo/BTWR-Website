import type { Metadata } from "next";
import { Rajdhani } from "next/font/google";
import Script from "next/script";
import "./globals.css";
import DayNightSky from "@/components/DayNightSky";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import { siteDescription, siteName, siteUrl } from "@/lib/site-config";

const rajdhani = Rajdhani({
  subsets: ["latin"],
  weight: ["500", "600", "700"],
  variable: "--font-heading",
  display: "swap",
});

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  title: {
    default: siteName,
    template: `%s | ${siteName}`,
  },
  description: siteDescription,
  alternates: {
    canonical: "/",
  },
  icons: {
    icon: "/logos/btwr-logo.png",
    apple: "/logos/btwr-logo.png",
  },
  openGraph: {
    title: siteName,
    description: siteDescription,
    url: siteUrl,
    siteName,
    images: [{ url: "/logos/btwr-logo.png", width: 96, height: 96 }],
    type: "website",
  },
  twitter: {
    card: "summary",
    title: siteName,
    description: siteDescription,
    images: ["/logos/btwr-logo.png"],
  },
};

// Sets data-theme before React hydrates, so the page never flashes the
// wrong theme on load. Runs as the first thing in <body>; suppressHydrationWarning
// on <html> silences the (expected) mismatch between server-rendered markup
// and the attribute this script sets synchronously on the client.
//
// Also decides theme from the Outpost's day/night cycle when it's active
// and the visitor hasn't allowed the theme button to override it — this
// duplicates the (tiny) math in components/hub/day-night-cycle.ts, since an
// inline pre-hydration script can't import a TS module; keep both in sync
// if that logic ever changes. Also sets data-daynight-active so
// DayNightSky's CSS can reserve its height before React even mounts,
// avoiding a layout shift when it pops in.
//
// Also duplicates the "Day/Night Cycle" Upgrades-shop gate (purchased ids
// live in hub.upgrades.purchased) — a visitor who hasn't bought that
// upgrade yet needs this to agree before hydration too, or the boot script
// would briefly assume the cycle's running when AchievementsProvider (which
// reads the same purchased list) is about to say otherwise.
const themeBootScript = `
(function () {
  try {
    var hubRaw = localStorage.getItem("btwr:hub:v1");
    var hub = hubRaw ? JSON.parse(hubRaw) : null;
    var purchased = (hub && hub.upgrades && hub.upgrades.purchased) || [];
    // Desktop-only Outpost — keep in sync with components/hub/device.ts.
    var phone = window.matchMedia("(hover: none) and (pointer: coarse)").matches
      || /Android|iPhone|iPad|iPod|Mobile|Silk|Kindle|BlackBerry|Opera Mini|IEMobile/i.test(navigator.userAgent);
    var cycleActive = !phone && !!(hub && hub.enabled && hub.settings && hub.settings.dayNightCycleEnabled)
      && purchased.indexOf("day-night-cycle") !== -1;
    var overrideAllowed = !!(hub && hub.settings && hub.settings.themeOverrideAllowed);
    document.documentElement.setAttribute("data-daynight-active", String(cycleActive));

    var theme;
    if (cycleActive && !overrideAllowed) {
      var cycleRaw = localStorage.getItem("btwr:hub:cycle:v1");
      var startedAt;
      if (cycleRaw && typeof JSON.parse(cycleRaw).startedAt === "number") {
        startedAt = JSON.parse(cycleRaw).startedAt;
      } else {
        startedAt = Date.now();
        localStorage.setItem("btwr:hub:cycle:v1", JSON.stringify({ startedAt: startedAt }));
      }
      var elapsed = Math.max(0, Date.now() - startedAt);
      var segmentMs = 186000; // PHASE_MS (180000) + TWILIGHT_MS (6000) — keep in sync with day-night-cycle.ts
      var isDay = Math.floor(elapsed / segmentMs) % 2 === 0;
      theme = isDay ? "light" : "dark";
    } else {
      var saved = localStorage.getItem("theme");
      theme = saved || (window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light");
    }
    document.documentElement.setAttribute("data-theme", theme);
  } catch (e) {}
})();
`;

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={rajdhani.variable} suppressHydrationWarning>
      <body className="flex min-h-screen flex-col">
        <script dangerouslySetInnerHTML={{ __html: themeBootScript }} />
        <DayNightSky />
        <Header />
        <main className="flex-1">{children}</main>
        <Footer />
        <Script
          src="https://static.cloudflareinsights.com/beacon.min.js"
          strategy="afterInteractive"
          data-cf-beacon='{"token": "0996000452d747de908248771da9392c"}'
        />
      </body>
    </html>
  );
}
