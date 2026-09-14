import Reveal from "@/components/Reveal";
import roadmapData from "@/data/roadmap.json";
import { enableRoadmap } from "@/lib/site-config";

type RoadmapItem = {
  name: string;
  status: string;
  category?: string | null;
  description?: string | null;
};

const statusOrder = ["In Progress", "Not Started", "Done"];

const statusStyles: Record<string, string> = {
  "In Progress":
    "bg-amber-100 text-amber-800 border-amber-300 dark:bg-amber-950 dark:text-amber-300 dark:border-amber-800",
  "Not Started":
    "bg-slate-100 text-slate-700 border-slate-300 dark:bg-slate-800 dark:text-slate-300 dark:border-slate-600",
  Done: "bg-emerald-100 text-emerald-800 border-emerald-300 dark:bg-emerald-950 dark:text-emerald-300 dark:border-emerald-800",
};

export default function RoadmapPage() {
  if (!enableRoadmap) {
    return (
      <div className="mx-auto max-w-3xl px-6 py-24 text-center">
        <h1 className="font-heading text-3xl font-extrabold tracking-wide text-chrome-dark dark:text-chrome">
          Roadmap
        </h1>
        <p className="mt-4 text-slate-600 dark:text-slate-400">
          The roadmap page is still being put together. Check back soon.
        </p>
      </div>
    );
  }

  const items = roadmapData.items as RoadmapItem[];
  const groups = statusOrder
    .map((status) => ({
      status,
      items: items.filter((item) => item.status === status),
    }))
    .filter((group) => group.items.length > 0);

  const counts = statusOrder.map((status) => ({
    status,
    count: items.filter((item) => item.status === status).length,
  }));

  return (
    <div className="mx-auto max-w-3xl px-6 py-16">
      <div>
        <h1 className="font-heading text-3xl font-extrabold tracking-wide text-chrome-dark dark:text-chrome">
          Roadmap
        </h1>
        <p className="mt-2 text-slate-600 dark:text-slate-400">
          Progress tracked in Notion and synced here on every deploy.
        </p>
      </div>

      {roadmapData.source === "placeholder" && (
        <p className="mt-4 rounded-md border border-amber-300 bg-amber-50 px-4 py-2 text-sm text-amber-800 dark:border-amber-800 dark:bg-amber-950 dark:text-amber-300">
          This is placeholder roadmap data. See NOTION_SETUP.md to connect
          the real Notion database.
        </p>
      )}

      <div className="mt-8 flex flex-wrap gap-3">
        {counts.map(({ status, count }) => (
          <div
            key={status}
            className={`rounded-lg border px-4 py-2 text-sm font-medium ${statusStyles[status]}`}
          >
            {count} {status}
          </div>
        ))}
      </div>

      <div className="mt-8 space-y-8">
        {groups.map((group) => (
          <Reveal key={group.status}>
            <section>
              <h2 className="text-lg font-semibold text-slate-800 dark:text-slate-200">
                {group.status}
              </h2>
              <ul className="mt-3 space-y-3">
                {group.items.map((item) => (
                  <li
                    key={item.name}
                    className={`card-glow rounded-lg border px-4 py-3 ${statusStyles[item.status] ?? "border-slate-300 dark:border-slate-600"}`}
                  >
                    <div className="flex items-center justify-between gap-4">
                      <span className="font-medium">{item.name}</span>
                      {item.category && (
                        <span className="text-xs uppercase tracking-wide opacity-70">
                          {item.category}
                        </span>
                      )}
                    </div>
                    {item.description && (
                      <p className="mt-1 text-sm opacity-80">
                        {item.description}
                      </p>
                    )}
                  </li>
                ))}
              </ul>
            </section>
          </Reveal>
        ))}
      </div>
    </div>
  );
}
