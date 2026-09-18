"use client";

import { useEffect, useState } from "react";
import { FIELD_NOTES } from "./field-notes";
import { pickByDate } from "./hub-storage";

// Pure flavor, no achievement — same date-seeded pattern as Mod of the Day
// so every visitor sees the same note on a given day, mount-gated for the
// same SSR/"today" reasoning.
export default function BtwFieldNotes() {
  const [note, setNote] = useState<string | null>(null);

  useEffect(() => {
    setNote(pickByDate(FIELD_NOTES));
  }, []);

  return (
    <div className="outpost-panel rounded-xl p-5">
      <h3 className="font-heading text-sm font-bold uppercase tracking-wider text-[var(--outpost-accent)]">
        BTW Field Notes
      </h3>
      {note === null ? (
        <div className="mt-3 space-y-2">
          <div className="h-3 w-full animate-pulse rounded bg-white/10" />
          <div className="h-3 w-2/3 animate-pulse rounded bg-white/10" />
        </div>
      ) : (
        <p className="mt-3 text-sm text-slate-300">{note}</p>
      )}
    </div>
  );
}
