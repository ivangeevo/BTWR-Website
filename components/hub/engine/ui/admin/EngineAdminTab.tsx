"use client";

import { useState } from "react";
import type { AdminConfig } from "../../../admin-config";
import { COMPONENTS } from "../../catalog/components";
import {
  engineGroupDefaults,
  engineGroupFields,
  ENGINE_GROUP_LABELS,
  resolveEngineConfig,
  type EngineMechanicGroup,
} from "../../config";
import type { ComponentId } from "../../types";

type Update = (updater: (prev: AdminConfig) => AdminConfig) => void;

const GROUPS = Object.keys(ENGINE_GROUP_LABELS) as EngineMechanicGroup[];

// Every number behind Ponder / The Analytical Engine — the same class-
// defaults-plus-overrides pattern as the Modules tab's gear menus
// (engine/config.ts), just with a lot more knobs. Content (sentences,
// ciphers, dialogue) stays in code.
export default function EngineAdminTab({ config, update }: { config: AdminConfig; update: Update }) {
  const [group, setGroup] = useState<EngineMechanicGroup>("gates");
  const resolved = resolveEngineConfig(config.engine);
  const values = resolved[group] as unknown as Record<string, number>;
  const defaults = engineGroupDefaults(group);
  const overrides = config.engine.mechanic?.[group] ?? {};

  function setField(key: string, value: number) {
    update((prev) => ({
      ...prev,
      engine: {
        ...prev.engine,
        mechanic: { ...prev.engine.mechanic, [group]: { ...prev.engine.mechanic?.[group], [key]: value } },
      },
    }));
  }

  function resetGroup() {
    update((prev) => {
      const mechanic = { ...prev.engine.mechanic };
      delete mechanic[group];
      return { ...prev, engine: { ...prev.engine, mechanic } };
    });
  }

  function setComponent(id: ComponentId, key: "baseCost" | "rate" | "draw", value: number) {
    update((prev) => ({
      ...prev,
      engine: {
        ...prev.engine,
        components: { ...prev.engine.components, [id]: { ...prev.engine.components?.[id], [key]: value } },
      },
    }));
  }

  return (
    <div>
      <p className="text-sm text-slate-400">
        Tune Ponder / The Analytical Engine. Stage gates, power, attachment strength, Eureka sparks, offline and
        neglect, and every component&apos;s cost and output. Blank means the default; changes apply next time you open
        the Outpost.
      </p>
      <div className="mt-3 flex flex-wrap gap-1.5">
        {GROUPS.map((g) => (
          <button
            key={g}
            type="button"
            onClick={() => setGroup(g)}
            className={`rounded-md border px-2.5 py-1 text-xs font-semibold ${
              group === g ? "border-[var(--outpost-accent)] text-[var(--outpost-accent)]" : "border-white/15 text-slate-400 hover:text-white"
            }`}
          >
            {ENGINE_GROUP_LABELS[g]}
          </button>
        ))}
      </div>

      <div className="mt-3 grid gap-2 sm:grid-cols-2">
        {engineGroupFields(group).map((f) => {
          const overridden = overrides[f.key] !== undefined && overrides[f.key] !== defaults[f.key];
          return (
            <label key={f.key} className="block rounded-lg border border-white/10 bg-white/5 p-2.5">
              <div className="flex items-baseline justify-between gap-2">
                <span className="text-xs font-semibold text-white">{f.label}</span>
                <span className={`text-[0.65rem] ${overridden ? "text-[var(--outpost-accent)]" : "text-white/40"}`}>
                  default {defaults[f.key]}
                  {f.suffix ? ` ${f.suffix}` : ""}
                </span>
              </div>
              {f.description && <p className="mt-0.5 text-[0.65rem] text-white/40">{f.description}</p>}
              <input
                type="number"
                min={f.min}
                max={f.max}
                step={f.step}
                value={values[f.key]}
                onChange={(e) => setField(f.key, Math.min(f.max, Math.max(f.min, Number(e.target.value) || 0)))}
                className="mt-1 w-full rounded-md border border-white/15 bg-transparent px-2 py-1 text-xs text-white"
              />
            </label>
          );
        })}
      </div>
      <button
        type="button"
        onClick={resetGroup}
        className="mt-2 rounded-lg border border-white/15 px-3 py-1 text-xs text-slate-300 hover:border-[var(--outpost-accent)]"
      >
        Reset {ENGINE_GROUP_LABELS[group]} to defaults
      </button>

      <h3 className="mt-6 text-xs font-bold uppercase tracking-wider text-white/50">Components</h3>
      <div className="mt-2 overflow-x-auto">
        <table className="w-full min-w-[32rem] text-left text-xs">
          <thead className="text-white/40">
            <tr>
              <th className="py-1 pr-2 font-semibold">Component</th>
              <th className="py-1 pr-2 font-semibold">Base cost</th>
              <th className="py-1 pr-2 font-semibold">Insight/sec each</th>
              <th className="py-1 pr-2 font-semibold">Power draw</th>
              <th className="py-1 font-semibold">Stage</th>
            </tr>
          </thead>
          <tbody>
            {COMPONENTS.map((c) => {
              const r = resolved.components.find((x) => x.id === c.id)!;
              return (
                <tr key={c.id} className="border-t border-white/5">
                  <td className="py-1 pr-2 text-white">
                    {c.icon} {c.name}
                  </td>
                  {(["baseCost", "rate", "draw"] as const).map((k) => (
                    <td key={k} className="py-1 pr-2">
                      <input
                        type="number"
                        min={0}
                        step={k === "rate" ? 0.1 : 1}
                        value={r[k]}
                        onChange={(e) => setComponent(c.id, k, Math.max(0, Number(e.target.value) || 0))}
                        className="w-28 rounded-md border border-white/15 bg-transparent px-2 py-0.5 text-xs text-white"
                      />
                    </td>
                  ))}
                  <td className="py-1 text-white/50">{c.stage}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
