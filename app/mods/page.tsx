import Image from "next/image";
import modsData from "@/data/mods.json";

type Mod = {
  projectId: string;
  slug: string;
  name: string;
  iconUrl: string | null;
  modrinthUrl: string;
  category: "core" | "misc" | "uncategorized";
  disabled: boolean;
  currentVersion: string;
  currentVersionDate: string | null;
  newestVersion: string;
  newestVersionDate: string | null;
  newestMatchesTarget: boolean;
  isOutdated: boolean;
};

function formatDate(iso: string | null) {
  if (!iso) return null;
  return new Date(iso).toLocaleDateString("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

function ModCard({ mod }: { mod: Mod }) {
  return (
    <li className="rounded-lg border border-slate-200 p-4">
      <div className="flex items-start gap-3">
        {mod.iconUrl ? (
          <Image
            src={mod.iconUrl}
            alt=""
            width={40}
            height={40}
            unoptimized
            className="rounded"
          />
        ) : (
          <div className="h-10 w-10 shrink-0 rounded bg-slate-100" />
        )}
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <a
              href={mod.modrinthUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="font-semibold text-chrome-dark hover:underline"
            >
              {mod.name}
            </a>
            {mod.disabled && (
              <span className="rounded-full bg-slate-200 px-2 py-0.5 text-xs font-medium text-slate-600">
                Disabled in pack
              </span>
            )}
            {mod.isOutdated && (
              <span className="rounded-full bg-amber-100 px-2 py-0.5 text-xs font-medium text-amber-800">
                Outdated
              </span>
            )}
          </div>
          <dl className="mt-2 grid grid-cols-2 gap-x-4 text-sm">
            <div>
              <dt className="text-slate-500">Current</dt>
              <dd className="text-slate-800">
                {mod.currentVersion}
                {formatDate(mod.currentVersionDate) && (
                  <span className="text-slate-400">
                    {" "}
                    ({formatDate(mod.currentVersionDate)})
                  </span>
                )}
              </dd>
            </div>
            <div>
              <dt className="text-slate-500">Newest</dt>
              <dd className="text-slate-800">
                {mod.newestVersion}
                {formatDate(mod.newestVersionDate) && (
                  <span className="text-slate-400">
                    {" "}
                    ({formatDate(mod.newestVersionDate)})
                  </span>
                )}
                {!mod.newestMatchesTarget && (
                  <span className="text-slate-400"> (different game version)</span>
                )}
              </dd>
            </div>
          </dl>
        </div>
      </div>
    </li>
  );
}

function ModSection({ title, mods }: { title: string; mods: Mod[] }) {
  if (mods.length === 0) return null;
  return (
    <section className="mt-10">
      <h2 className="text-xl font-bold text-slate-900">{title}</h2>
      <ul className="mt-4 space-y-3">
        {mods.map((mod) => (
          <ModCard key={mod.projectId} mod={mod} />
        ))}
      </ul>
    </section>
  );
}

export default function ModsPage() {
  const mods = modsData.mods as Mod[];
  const core = mods.filter((m) => m.category === "core");
  const misc = mods.filter((m) => m.category === "misc");
  const uncategorized = mods.filter((m) => m.category === "uncategorized");

  return (
    <div className="mx-auto max-w-3xl px-6 py-16">
      <h1 className="text-3xl font-extrabold text-chrome-dark">Mods List</h1>
      <p className="mt-2 text-slate-600">
        Pulled automatically from{" "}
        <a
          href="https://modrinth.com/modpack/btw-remastered/versions"
          target="_blank"
          rel="noopener noreferrer"
          className="text-chrome-dark underline"
        >
          BTWR&apos;s Modrinth listing
        </a>{" "}
        (pack version {modsData.packVersion}). &ldquo;Current&rdquo; is the
        version pinned in the pack; &ldquo;Newest&rdquo; is the latest
        available on Modrinth.
      </p>

      <ModSection title="Core Mods" mods={core} />
      <ModSection title="Miscellaneous" mods={misc} />
      <ModSection title="Needs Categorization" mods={uncategorized} />
    </div>
  );
}
