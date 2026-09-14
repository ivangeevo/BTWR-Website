import type { Metadata } from "next";
import { Rajdhani } from "next/font/google";
import Script from "next/script";
import "./globals.css";
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
const themeBootScript = `
(function () {
  try {
    var saved = localStorage.getItem("theme");
    var theme = saved || (window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light");
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
