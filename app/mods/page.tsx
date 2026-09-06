import { mods } from "@/data/mods";

export default function ModsPage() {
  return (
    <div className="mx-auto max-w-3xl px-6 py-16">
      <h1 className="text-3xl font-extrabold text-chrome-dark">Mods List</h1>
      <p className="mt-2 rounded-md border border-amber-300 bg-amber-50 px-4 py-2 text-sm text-amber-800">
        Mod list coming soon — these are placeholder entries. Add the real
        mods in data/mods.ts.
      </p>

      <ul className="mt-8 space-y-4">
        {mods.map((mod) => (
          <li
            key={mod.name}
            className="rounded-lg border border-slate-200 px-4 py-3"
          >
            <h2 className="font-semibold text-slate-900">{mod.name}</h2>
            <p className="mt-1 text-sm text-slate-600">{mod.description}</p>
          </li>
        ))}
      </ul>
    </div>
  );
}
