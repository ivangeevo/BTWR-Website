import type { Metadata } from "next";
import OutpostGate from "@/components/hub/OutpostGate";
import modsData from "@/data/mods.json";
import type { Mod, PackRelease } from "@/lib/mods";

export const metadata: Metadata = {
  title: "The Outpost",
  description: "A small idle game for BTW: Remastered players, saved in your browser.",
  robots: { index: false, follow: false },
};

export default function OutpostPage() {
  return (
    <OutpostGate
      mods={modsData.mods as Mod[]}
      packReleases={modsData.packReleases as PackRelease[]}
    />
  );
}
