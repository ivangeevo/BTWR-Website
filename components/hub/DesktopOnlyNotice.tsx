// Shown instead of the Outpost on phones and tablets — the Outpost (its gear
// grid, holds, drag-and-drop, the Engine's workshop) is built for a desktop
// browser. See device.ts for what counts as a phone.
export default function DesktopOnlyNotice({ compact = false }: { compact?: boolean }) {
  return (
    <div
      className={`rounded-xl border border-amber-500/30 bg-amber-500/5 text-amber-900 dark:text-amber-200 ${compact ? "px-3 py-2" : "px-4 py-3"}`}
      role="note"
    >
      <p className={`font-semibold ${compact ? "text-xs" : "text-sm"}`}>The Outpost is only available on desktop.</p>
      <p className={`mt-0.5 opacity-80 ${compact ? "text-[0.7rem]" : "text-xs"}`}>
        Open this site in a desktop browser to turn it on and play.
      </p>
    </div>
  );
}
