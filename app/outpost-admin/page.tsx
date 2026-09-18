import type { Metadata } from "next";
import AdminPanel from "@/components/hub/AdminPanel";

export const metadata: Metadata = {
  title: "Outpost Admin",
  description: "Personal, per-browser customization of the Outpost's tiers, modules, achievements, and tools.",
  robots: { index: false, follow: false },
};

export default function OutpostAdminPage() {
  return (
    <div className="mx-auto max-w-5xl px-3 py-12 sm:px-4">
      <AdminPanel />
    </div>
  );
}
