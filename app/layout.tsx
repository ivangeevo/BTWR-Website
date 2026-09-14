import type { Metadata } from "next";
import { Rajdhani } from "next/font/google";
import "./globals.css";
import CursorDust from "@/components/CursorDust";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import { siteName, siteTagline } from "@/lib/site-config";

const rajdhani = Rajdhani({
  subsets: ["latin"],
  weight: ["500", "600", "700"],
  variable: "--font-heading",
  display: "swap",
});

export const metadata: Metadata = {
  title: `${siteName} — ${siteTagline}`,
  description: siteTagline,
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={rajdhani.variable}>
      <body className="flex min-h-screen flex-col bg-white">
        <CursorDust />
        <Header />
        <main className="flex-1">{children}</main>
        <Footer />
      </body>
    </html>
  );
}
