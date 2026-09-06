import roadmapData from "@/data/roadmap.json";

type RoadmapItem = {
  name: string;
  status: string;
  category?: string | null;
  description?: string | null;
};

const statusOrder = ["In Progress", "Not Started", "Done"];

const statusStyles: Record<string, string> = {
  "In Progress": "bg-amber-100 text-amber-800 border-amber-300",
  "Not Started": "bg-slate-100 text-slate-700 border-slate-300",
  Done: "bg-emerald-100 text-emerald-800 border-emerald-300",
};

export default function RoadmapPage() {
  const items = roadmapData.items as RoadmapItem[];
  const groups = statusOrder
    .map((status) => ({
      status,
      items: items.filter((item) => item.status === status),
    }))
    .filter((group) => group.items.length > 0);

  return (
    <div className="mx-auto max-w-3xl px-6 py-16">
      <h1 className="text-3xl font-extrabold text-chrome-dark">Roadmap</h1>
      <p className="mt-2 text-slate-600">
        Progress tracked in Notion and synced here on every deploy.
      </p>
      {roadmapData.source === "placeholder" && (
        <p className="mt-4 rounded-md border border-amber-300 bg-amber-50 px-4 py-2 text-sm text-amber-800">
          This is placeholder roadmap data. See NOTION_SETUP.md to connect
          the real Notion database.
        </p>
      )}

      <div className="mt-8 space-y-8">
        {groups.map((group) => (
          <section key={group.status}>
            <h2 className="text-lg font-semibold text-slate-800">
              {group.status}
            </h2>
            <ul className="mt-3 space-y-3">
              {group.items.map((item) => (
                <li
                  key={item.name}
                  className={`rounded-lg border px-4 py-3 ${statusStyles[item.status] ?? "border-slate-300"}`}
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
        ))}
      </div>
    </div>
  );
}
