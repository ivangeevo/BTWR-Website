import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Mods",
  description:
    "Browse every mod in the BTW: Remastered modpack, including core mods, misc additions, and outdated ones.",
  alternates: { canonical: "/mods" },
};

export default function ModsLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return children;
}
